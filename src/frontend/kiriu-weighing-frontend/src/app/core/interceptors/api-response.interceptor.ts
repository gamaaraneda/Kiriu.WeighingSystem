import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';

interface ApiResponseBody {
  success: boolean;
  data: unknown;
  message: string;
  errors?: string[] | null;
  metadata?: Record<string, unknown>;
}

export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (event.type === 4) {
        // HttpResponse
        const body = event.body as ApiResponseBody;

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
            // Éxito: extraer solo los datos
            return event.clone({ body: body.data });
          } else {
            // Error del backend (aunque HTTP 200): lanzar error
            const errorMessage =
              body.errors && body.errors.length > 0
                ? body.errors.join(', ')
                : body.message || 'Error en la operación';

            throw new Error(errorMessage);
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
            const errorMessage =
              apiError.errors && apiError.errors.length > 0
                ? apiError.errors.join(', ')
                : apiError.message || 'Error en la operación';

            throw new Error(errorMessage);
          }
        }
      }

      // Error HTTP tradicional
      throw error;
    })
  );
};
