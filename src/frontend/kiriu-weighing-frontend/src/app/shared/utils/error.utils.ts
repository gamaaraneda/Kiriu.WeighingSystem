/**
 * Utilidades para manejo de errores del backend
 */

export interface ApiError {
  success: boolean;
  message: string;
  errors?: string[] | null;
}

/**
 * Extrae el mensaje de error más apropiado desde una respuesta de error
 * Maneja tanto errores HTTP tradicionales como ApiResponse del backend
 */
export function extractErrorMessage(error: any): string {
  // 1. Si el error ya es un Error con mensaje, usarlo (probablemente del interceptor)
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // 2. Si el error tiene formato ApiResponse en error.error
  if (error.error && typeof error.error === 'object') {
    const apiError = error.error as ApiError;
    
    if ('success' in apiError && 'message' in apiError && apiError.success === false) {
      return buildErrorMessage(apiError);
    }
  }

  // 3. Si el error tiene mensaje directo
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  // 4. Manejar errores HTTP comunes
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Solicitud inválida. Verifique los datos enviados.';
      case 401:
        return 'No autorizado. Debe iniciar sesión.';
      case 403:
        return 'Acceso denegado. No tiene permisos para esta operación.';
      case 404:
        return 'Recurso no encontrado.';
      case 409:
        return 'Conflicto. El recurso ya existe o está en uso.';
      case 422:
        return 'Datos inválidos. Verifique la información enviada.';
      case 500:
        return 'Error interno del servidor. Intente nuevamente más tarde.';
      case 502:
        return 'Error de comunicación con el servidor.';
      case 503:
        return 'Servicio no disponible temporalmente.';
      default:
        return `Error del servidor (${error.status}). Intente nuevamente.`;
    }
  }

  // 5. Error genérico
  return 'Ha ocurrido un error inesperado. Intente nuevamente.';
}

/**
 * Construye el mensaje de error desde una ApiResponse
 * Prioridad: errors > message > mensaje por defecto
 */
function buildErrorMessage(apiResponse: ApiError): string {
  // 1. Si hay errores específicos, usarlos (mayor prioridad)
  if (apiResponse.errors && Array.isArray(apiResponse.errors) && apiResponse.errors.length > 0) {
    // Filtrar errores no vacíos y unirlos
    const validErrors = apiResponse.errors.filter(error => error && error.trim().length > 0);
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

/**
 * Determina si un error es de validación (400, 422)
 */
export function isValidationError(error: any): boolean {
  return error.status === 400 || error.status === 422;
}

/**
 * Determina si un error es de autorización (401, 403)
 */
export function isAuthError(error: any): boolean {
  return error.status === 401 || error.status === 403;
}

/**
 * Determina si un error es de servidor (5xx)
 */
export function isServerError(error: any): boolean {
  return error.status >= 500 && error.status < 600;
}