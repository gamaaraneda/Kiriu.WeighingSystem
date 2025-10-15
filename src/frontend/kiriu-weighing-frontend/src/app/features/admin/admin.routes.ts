import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Panel de Administración',
      requiredPermissions: ['USUARIOS.READ']
    },
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./pages/usuarios/usuarios.component').then(
        (m) => m.UsuariosComponent
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Gestión de Usuarios',
      requiredPermissions: ['USUARIOS.READ']
    },
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./pages/roles/roles.component').then((m) => m.RolesComponent),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Gestión de Roles',
      requiredPermissions: ['USUARIOS.READ']
    },
  },
  {
    path: 'permisos',
    loadComponent: () =>
      import('./pages/permisos/permisos.component').then(
        (m) => m.PermisosComponent
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Gestión de Permisos',
      requiredPermissions: ['USUARIOS.READ']
    },
  },
  {
    path: 'modulos',
    loadComponent: () =>
      import('./pages/modulos/modulos.component').then(
        (m) => m.ModulosComponent
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Gestión de Módulos',
      requiredPermissions: ['USUARIOS.READ']
    },
  },
  {
    path: 'roles-permisos',
    loadComponent: () =>
      import('./pages/roles-permisos/roles-permisos.component').then(
        (m) => m.RolesPermisosComponent
      ),
    canActivate: [authGuard, permissionGuard],
    data: {
      title: 'Asignación de Permisos',
      requiredPermissions: ['USUARIOS.READ']
    },
  },
];
