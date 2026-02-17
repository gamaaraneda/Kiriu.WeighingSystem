import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  WeighingFlowService,
  BreadcrumbItem,
} from '../../../features/weighing/services/weighing-flow.service';
import { Subscription } from 'rxjs';

/** Títulos de las rutas hijas de admin para el breadcrumb */
const ADMIN_SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Panel de Administración',
  usuarios: 'Gestión de Usuarios',
  roles: 'Gestión de Roles',
  permisos: 'Gestión de Permisos',
  modulos: 'Gestión de Módulos',
  'roles-permisos': 'Asignación de Permisos',
};

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  private weighingFlowService = inject(WeighingFlowService);
  private router = inject(Router);
  private subscription = new Subscription();

  breadcrumbItems: BreadcrumbItem[] = [];

  /** Últimos ítems del flujo de pesaje (para rutas no admin) */
  private weighingItems: BreadcrumbItem[] = [];

  ngOnInit(): void {
    // Suscribirse al breadcrumb del flujo de pesaje
    this.subscription.add(
      this.weighingFlowService.breadcrumb$.subscribe((items) => {
        this.weighingItems = items;
        this.applyBreadcrumbFromRoute();
      })
    );
    // Actualizar breadcrumb al navegar (p. ej. de pesaje a administración)
    this.subscription.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => this.applyBreadcrumbFromRoute())
    );
    // Aplicar una vez con la ruta actual
    this.applyBreadcrumbFromRoute();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Decide qué breadcrumb mostrar según la URL actual.
   * Solo usa el flujo de pesaje cuando estamos en rutas de registro (dashboard, operation-selection, weighing, weighing-exit).
   * En admin y consultas se muestra el breadcrumb del módulo correspondiente.
   */
  private applyBreadcrumbFromRoute(): void {
    const url = this.router.url;
    if (url.startsWith('/admin')) {
      this.breadcrumbItems = this.buildAdminBreadcrumb(url);
    } else if (url.startsWith('/weighing-query')) {
      this.breadcrumbItems = this.buildConsultasBreadcrumb();
    } else {
      this.breadcrumbItems = this.weighingItems;
    }
  }

  /**
   * Construye el breadcrumb para el módulo de Consultas.
   */
  private buildConsultasBreadcrumb(): BreadcrumbItem[] {
    return [
      {
        label: 'Inicio',
        route: ['/dashboard'],
        isClickable: true,
        isCurrent: false,
      },
      {
        label: 'Consultas',
        route: ['/weighing-query'],
        isClickable: false,
        isCurrent: true,
      },
    ];
  }

  /**
   * Construye el breadcrumb para el módulo de administración.
   */
  private buildAdminBreadcrumb(url: string): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      {
        label: 'Inicio',
        route: ['/dashboard'],
        isClickable: true,
        isCurrent: false,
      },
      {
        label: 'Administración',
        route: ['/admin'],
        isClickable: true,
        isCurrent: false,
      },
    ];
    const pathAfterAdmin = url.replace(/^\/admin\/?/, '').split('/')[0];
    if (pathAfterAdmin && pathAfterAdmin !== 'dashboard') {
      const label = ADMIN_SEGMENT_LABELS[pathAfterAdmin] ?? pathAfterAdmin;
      items.push({
        label,
        route: ['/admin', pathAfterAdmin],
        isClickable: false,
        isCurrent: true,
      });
    } else {
      items[items.length - 1].isCurrent = true;
    }
    return items;
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
    if (item.isClickable && item.route) {
      this.router.navigate(item.route);
    }
  }

  isLastItem(item: BreadcrumbItem): boolean {
    return (
      this.breadcrumbItems.indexOf(item) === this.breadcrumbItems.length - 1
    );
  }
}
