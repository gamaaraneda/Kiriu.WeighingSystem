import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { WeighingFlowService } from '../../../weighing/services/weighing-flow.service';
import { HeaderComponent } from '../../../../layout/header/header.component';

export interface UnitType {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconClass: string;
  buttonText: string;
  buttonClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private weighingFlowService = inject(WeighingFlowService);

  unitTypes: UnitType[] = [
    {
      id: 'client',
      title: 'Cliente',
      subtitle: 'Unidad que entra vacía',
      description:
        'Registra vehículos que llegan vacíos para cargar material o productos',
      icon: '📦',
      iconClass: 'icon-client',
      buttonText: 'Seleccionar Cliente',
      buttonClass: 'btn',
    },
    {
      id: 'provider',
      title: 'Proveedor',
      subtitle: 'Unidad que entra cargada',
      description:
        'Registra vehículos que llegan con material o productos para descargar',
      icon: '🚛',
      iconClass: 'icon-provider',
      buttonText: 'Seleccionar Proveedor',
      buttonClass: 'btn btn-success',
    },
  ];

  ngOnInit(): void {
    // Resetear el flujo cuando se llega al dashboard
    this.weighingFlowService.resetFlow();
  }

  /**
   * Maneja la selección de un tipo de unidad
   * @param unitType - Tipo de unidad seleccionado
   */
  onUnitTypeSelected(unitType: UnitType): void {
    console.log('Tipo de unidad seleccionado:', unitType);

    // Actualizar el estado del flujo
    this.weighingFlowService.setUnitType(unitType.id as 'client' | 'provider');

    // Navegar a la pantalla de selección de operación
    this.router.navigate(['/operation-selection', unitType.id]);
  }

  /**
   * Maneja el logout del usuario
   */
  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout exitoso');
        // La redirección se maneja automáticamente en clearSession()
      },
      error: (error) => {
        console.error('Error en logout:', error);
        // Aún así navegar al login si hay error
        this.router.navigate(['/login']);
      },
    });
  }

  /**
   * Maneja la navegación a consultas
   */
  onQueries(): void {
    console.log('Navegando a consultas...');
    this.router.navigate(['/weighing-query']);
  }

  /**
   * Maneja la navegación a administración
   */
  onAdmin(): void {
    console.log('Navegando a administración...');
    this.router.navigate(['/admin']);
  }

  /**
   * Verifica si el usuario puede acceder a administración
   */
  canAccessAdmin(): boolean {
    // Por ahora retornamos true, pero aquí se debería verificar permisos
    // return this.authService.hasPermission('ADMIN_ACCESS');
    return true;
  }
}
