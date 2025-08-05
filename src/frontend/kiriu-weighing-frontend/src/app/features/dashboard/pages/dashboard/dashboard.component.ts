import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { CardSelectorComponent } from '../../../../shared/components/card-selector/card-selector.component';

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
  imports: [CommonModule, HeaderComponent, CardSelectorComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

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

  /**
   * Maneja la selección de un tipo de unidad
   * @param unitType - Tipo de unidad seleccionado
   */
  onUnitTypeSelected(unitType: UnitType): void {
    console.log('Tipo de unidad seleccionado:', unitType);
    // Aquí se puede navegar a la página correspondiente o mostrar un modal
    // Por ahora solo mostramos un mensaje en consola
    alert(`Has seleccionado: ${unitType.title}`);
  }

  /**
   * Maneja el logout del usuario
   */
  onLogout(): void {
    this.authService.logout();
  }

  /**
   * Maneja la navegación a consultas
   */
  onQueries(): void {
    console.log('Navegando a consultas...');
    // Aquí se navegaría a la página de consultas
    alert('Funcionalidad de consultas en desarrollo');
  }
}
