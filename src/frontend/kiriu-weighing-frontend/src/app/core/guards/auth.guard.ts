import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege las rutas que requieren autenticación
 * @returns true si el usuario está autenticado, false en caso contrario
 */
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isTokenValid()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Guard que redirige a usuarios autenticados desde la página de login
 * @returns true si el usuario NO está autenticado, false en caso contrario
 */
export const loginGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isTokenValid()) {
    router.navigate(['/dashboard']);
    return false;
  } else {
    return true;
  }
};
