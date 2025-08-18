import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [loginGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'operation-selection/:unitType',
    loadComponent: () =>
      import(
        './features/weighing/pages/operation-selection/operation-selection.component'
      ).then((m) => m.OperationSelectionComponent),
    canActivate: [authGuard],
  },
  {
    path: 'weighing/:unitType/:operationType',
    loadComponent: () =>
      import(
        './features/weighing/pages/weighing-form/weighing-form.component'
      ).then((m) => m.WeighingFormComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/login' },
];
