import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Solo interceptar peticiones que requieren autenticación
  if (
    req.url.includes('/api/') &&
    !req.url.includes('/Auth/login') &&
    !req.url.includes('/Auth/refresh-token')
  ) {
    // Verificar si el token necesita renovación
    if (authService.needsTokenRefresh() && authService.isAuthenticated()) {
      console.log(
        '🔄 TokenRefreshInterceptor: Token necesita renovación, renovando antes de la petición...'
      );

      return authService.forceTokenRefresh().pipe(
        switchMap(() => {
          // Después de renovar, continuar con la petición original
          console.log(
            '✅ TokenRefreshInterceptor: Token renovado, continuando con petición original'
          );
          return next(req);
        }),
        catchError((error) => {
          console.error(
            '❌ TokenRefreshInterceptor: Error al renovar token:',
            error
          );
          // Si falla el refresh, la petición original también fallará
          return throwError(() => error);
        })
      );
    }
  }

  // Si no necesita refresh, continuar normalmente
  return next(req);
};
