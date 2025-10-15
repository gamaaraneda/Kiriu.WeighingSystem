import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

/**
 * Guard que verifica si el usuario tiene los permisos necesarios para acceder a una ruta
 *
 * Uso en routes:
 * {
 *   path: 'admin',
 *   canActivate: [authGuard, permissionGuard],
 *   data: {
 *     requiredPermissions: ['USUARIOS.READ'],
 *     requireAll: false // opcional, por defecto false (lógica OR)
 *   }
 * }
 */
export const permissionGuard: CanActivateFn = (route, state) => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  // Obtener permisos requeridos de la configuración de la ruta
  const requiredPermissions = route.data['requiredPermissions'] as string[] | string | undefined;
  const requireAll = route.data['requireAll'] as boolean | undefined;

  // Si no se especifican permisos requeridos, permitir acceso
  if (!requiredPermissions) {
    console.warn('permissionGuard: No se especificaron permisos requeridos para la ruta', state.url);
    return true;
  }

  // Convertir a array si es un string
  const permissionsArray = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  // Verificar permisos
  const hasPermission = requireAll
    ? permissionsService.hasAllPermissions(permissionsArray)
    : permissionsService.hasAnyPermission(permissionsArray);

  if (hasPermission) {
    return true;
  } else {
    console.warn('permissionGuard: Acceso denegado. Permisos requeridos:', permissionsArray);

    // Redirigir a una página de acceso denegado o al dashboard
    router.navigate(['/access-denied'], {
      queryParams: {
        returnUrl: state.url,
        reason: 'insufficient-permissions'
      }
    });

    return false;
  }
};
