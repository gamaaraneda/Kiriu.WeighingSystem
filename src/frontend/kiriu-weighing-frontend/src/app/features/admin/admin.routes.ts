import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

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
    canActivate: [authGuard],
    data: { title: 'Panel de Administración' },
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./pages/usuarios/usuarios.component').then(
        (m) => m.UsuariosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Gestión de Usuarios' },
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./pages/roles/roles.component').then((m) => m.RolesComponent),
    canActivate: [authGuard],
    data: { title: 'Gestión de Roles' },
  },
  {
    path: 'permisos',
    loadComponent: () =>
      import('./pages/permisos/permisos.component').then(
        (m) => m.PermisosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Gestión de Permisos' },
  },
  {
    path: 'modulos',
    loadComponent: () =>
      import('./pages/modulos/modulos.component').then(
        (m) => m.ModulosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Gestión de Módulos' },
  },
  {
    path: 'roles-permisos',
    loadComponent: () =>
      import('./pages/roles-permisos/roles-permisos.component').then(
        (m) => m.RolesPermisosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Asignación de Permisos' },
  },
];
