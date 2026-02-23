import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si hay sesión autenticada válida
  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // Verificar si hay tokens residuales (aunque estén expirados)
  // Si existen, bloquear acceso a login y redirigir a dashboard
  // El sistema se encargará de validar/refrescar o hacer logout según corresponda
  const token = authService.getToken();
  if (token) {
    console.log('🔒 loginGuard: Token residual detectado (puede estar expirado), redirigiendo a dashboard');
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
