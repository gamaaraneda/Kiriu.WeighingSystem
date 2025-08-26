import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';

interface ApiResponseBody {
  success: boolean;
  data: unknown;
  message: string;
  errors?: string[] | null;
  metadata?: Record<string, unknown>;
}

/**
 * Construye el mensaje de error desde una ApiResponse
 * Prioridad: errors > message > mensaje por defecto
 */
function buildErrorMessage(apiResponse: ApiResponseBody): string {
  // 1. Si hay errores específicos, usarlos (mayor prioridad)
  if (
    apiResponse.errors &&
    Array.isArray(apiResponse.errors) &&
    apiResponse.errors.length > 0
  ) {
    // Filtrar errores no vacíos y unirlos
    const validErrors = apiResponse.errors.filter(
      (error) => error && error.trim().length > 0
    );
    if (validErrors.length > 0) {
      return validErrors.join(', ');
    }
  }

  // 2. Si hay mensaje específico, usarlo
  if (apiResponse.message && apiResponse.message.trim().length > 0) {
    return apiResponse.message;
  }

  // 3. Mensaje por defecto
  return 'Error en la operación';
}

export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('🔍 API Interceptor - Request:', req.url);

  return next(req).pipe(
    map((event) => {
      if (event.type === 4) {
        // HttpResponse
        const body = event.body as ApiResponseBody;
        console.log('🔍 API Interceptor - Response:', { url: req.url, body });

        // Verificar si es una respuesta del backend con estructura ApiResponse
        if (
          body &&
          typeof body === 'object' &&
          'success' in body &&
          'data' in body &&
          'message' in body
        ) {
          // Es una ApiResponse del backend
          if (body.success === true) {
            // Para endpoints de admin, devolver respuesta completa
            // Para otros endpoints, extraer solo los datos (comportamiento original)
            if (req.url.includes('/admin/')) {
              console.log('🔧 Admin endpoint - returning full response');
              return event.clone({ body: body });
            } else {
              console.log('🔧 Regular endpoint - extracting data only');
              return event.clone({ body: body.data });
            }
          } else {
            // Error del backend (aunque HTTP 200): lanzar error
            const errorMessage = buildErrorMessage(body);
            console.error('🚨 Backend returned success: false', {
              url: req.url,
              originalBody: body,
              originalMessage: body.message,
              originalErrors: body.errors,
              finalMessage: errorMessage,
            });

            // Crear un error personalizado que preserve información adicional
            const customError = new Error(errorMessage);
            (customError as any).isApiError = true;
            (customError as any).originalResponse = body;
            throw customError;
          }
        }
      }
      return event;
    }),
    catchError((error) => {
      // Si ya es un error del interceptor, propagarlo
      if (error instanceof Error) {
        throw error;
      }

      // Manejar errores HTTP del backend que también vienen en formato ApiResponse
      if (error.error && typeof error.error === 'object') {
        const apiError = error.error as ApiResponseBody;

        // Verificar si es una ApiResponse con success = false
        if ('success' in apiError && 'message' in apiError) {
          if (apiError.success === false) {
            const errorMessage = buildErrorMessage(apiError);
            console.error('HTTP Error with backend ApiResponse format', {
              status: error.status,
              originalMessage: apiError.message,
              originalErrors: apiError.errors,
              finalMessage: errorMessage,
            });
            throw new Error(errorMessage);
          }
        }
      }

      // Error HTTP tradicional
      throw error;
    })
  );
};
