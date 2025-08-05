import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event.type === 4) { // HttpResponse
        // El backend ya devuelve ApiResponse<T>, extraer solo los datos
        const body = event.body;
        if (body && typeof body === 'object' && 'success' in body) {
          // Es una ApiResponse, extraer la data
          return event.clone({ body: body.data });
        }
      }
      return event;
    }),
    catchError(error => {
      // Manejar errores del backend que también vienen en formato ApiResponse
      if (error.error && typeof error.error === 'object' && 'success' in error.error) {
        const apiError = error.error;
        throw new Error(apiError.message || 'Error en la operación');
      }
      throw error;
    })
  );
}; 