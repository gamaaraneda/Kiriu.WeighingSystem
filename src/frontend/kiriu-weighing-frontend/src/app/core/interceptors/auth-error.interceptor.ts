import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';

/**
 * Interceptor para manejar errores de autenticación (401 Unauthorized).
 * 
 * Cuando el backend rechaza un token (sesión revocada, token expirado, etc.),
 * este interceptor:
 * 1. Limpia la sesión local
 * 2. Muestra un mensaje explicativo al usuario
 * 3. Redirige a la pantalla de login
 * 
 * Esto es especialmente útil cuando el usuario ha iniciado sesión en otro
 * dispositivo y su sesión actual ha sido invalidada.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);

  // Rutas que no requieren manejo de error 401 (son públicas)
  const publicRoutes = [
    '/Auth/login',
    '/Auth/refresh-token',
    '/health'
  ];

  // No interceptar rutas públicas
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
  if (isPublicRoute) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.log('🔒 AuthErrorInterceptor: Error 401 detectado', {
          url: req.url,
          error: error.error
        });

        // Determinar el mensaje apropiado basado en la respuesta del backend
        const message = getSessionInvalidatedMessage(error);
        
        // Limpiar la sesión local sin intentar logout en el backend
        // (la sesión ya fue invalidada por el backend)
        authService.clearSessionLocally();

        // Mostrar mensaje al usuario
        notificationService.showError(
          'Sesión Finalizada',
          message
        );

        // Redirigir al login
        router.navigate(['/login'], {
          queryParams: { 
            sessionExpired: true,
            reason: 'session_invalidated'
          }
        });

        // No propagar el error para evitar otros manejadores
        return throwError(() => new Error(message));
      }

      // Para otros errores, propagar normalmente
      return throwError(() => error);
    })
  );
};

/**
 * Extrae el mensaje apropiado para mostrar al usuario cuando la sesión es invalidada.
 * Intenta obtener el mensaje del backend, o usa uno por defecto.
 */
function getSessionInvalidatedMessage(error: HttpErrorResponse): string {
  // Intentar obtener el mensaje del backend
  if (error.error) {
    // Si es un objeto con message
    if (typeof error.error === 'object' && error.error.message) {
      const backendMessage = error.error.message as string;
      
      // Detectar mensajes específicos del backend
      if (backendMessage.toLowerCase().includes('sesión') || 
          backendMessage.toLowerCase().includes('session') ||
          backendMessage.toLowerCase().includes('invalidada') ||
          backendMessage.toLowerCase().includes('invalid')) {
        return 'Su sesión ha sido cerrada porque se inició sesión en otro dispositivo.';
      }
    }
    
    // Si es un string directamente
    if (typeof error.error === 'string') {
      if (error.error.toLowerCase().includes('sesión') || 
          error.error.toLowerCase().includes('session')) {
        return 'Su sesión ha sido cerrada porque se inició sesión en otro dispositivo.';
      }
    }
  }

  // Si el statusText da alguna pista
  if (error.statusText && error.statusText.toLowerCase().includes('unauthorized')) {
    return 'Su sesión ha expirado o ha sido cerrada. Por favor, inicie sesión nuevamente.';
  }

  // Mensaje por defecto para error 401
  return 'Su sesión ha finalizado. Por favor, inicie sesión nuevamente.';
}
