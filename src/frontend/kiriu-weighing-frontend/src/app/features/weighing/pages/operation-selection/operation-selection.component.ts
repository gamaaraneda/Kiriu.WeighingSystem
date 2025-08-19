import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { WeighingService } from '../../services/weighing.service';
import { WeighingFlowService } from '../../services/weighing-flow.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';

export interface OperationType {
  id: 'entry' | 'exit';
  title: string;
  description: string;
  icon: string;
  iconClass: string;
  buttonText: string;
  buttonClass: string;
  isEnabled: boolean;
}

@Component({
  selector: 'app-operation-selection',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BreadcrumbComponent],
  templateUrl: './operation-selection.component.html',
  styleUrls: ['./operation-selection.component.scss'],
})
export class OperationSelectionComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private weighingService = inject(WeighingService);
  private weighingFlowService = inject(WeighingFlowService);

  unitType = '';
  unitTypeTitle = '';

  operations: OperationType[] = [
    {
      id: 'entry',
      title: 'Registrar Entrada',
      description: '',
      icon: '⬇️',
      iconClass: 'icon-entry',
      buttonText: 'Seleccionar Entrada',
      buttonClass: 'btn btn-success',
      isEnabled: true,
    },
    {
      id: 'exit',
      title: 'Registrar Salida',
      description: '',
      icon: '⬆️',
      iconClass: 'icon-exit',
      buttonText: 'Seleccionar Salida',
      buttonClass: 'btn btn-primary',
      isEnabled: true,
    },
  ];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.unitType = params['unitType'];
      this.updateOperationDescriptions();
      this.validateExitOperation();

      // Validar que el flujo sea correcto
      this.validateFlow();
    });
  }

  private updateOperationDescriptions(): void {
    if (this.unitType === 'client') {
      this.unitTypeTitle = 'Cliente';
      this.operations[0].description =
        'Vehículo vacío que entra para cargar material';
      this.operations[1].description =
        'Vehículo cargado que sale después de cargar';
    } else if (this.unitType === 'provider') {
      this.unitTypeTitle = 'Proveedor';
      this.operations[0].description =
        'Vehículo cargado que entra para descargar material';
      this.operations[1].description =
        'Vehículo vacío que sale después de descargar';
    }
  }

  private validateExitOperation(): void {
    // TODO: Implementar validación de entrada previa para salidas
    // Por ahora, todas las operaciones están habilitadas
    // En el futuro se puede validar si hay entradas previas para este tipo de unidad
    this.operations[1].isEnabled = true;
  }

  onOperationSelected(operation: OperationType): void {
    if (!operation.isEnabled) {
      alert('Esta operación no está disponible en este momento');
      return;
    }

    console.log('Operación seleccionada:', operation);

    // Actualizar el estado del flujo
    this.weighingFlowService.setOperationType(operation.id);

    // Navegar al formulario correspondiente según la operación
    if (operation.id === 'exit') {
      this.router.navigate(['/weighing-exit', this.unitType]);
    } else {
      this.router.navigate(['/weighing', this.unitType, operation.id]);
    }
  }

  private validateFlow(): void {
    const flowValidation = this.weighingFlowService.validateFlow();
    if (!flowValidation.isValid) {
      console.warn('Flujo inválido:', flowValidation.missingSteps);
      // Redirigir al dashboard si el flujo no es válido
      this.router.navigate(['/dashboard']);
    }
  }

  onGoBack(): void {
    this.router.navigate(['/dashboard']);
  }

  onQueries(): void {
    console.log('Navegando a consultas...');
    // TODO: Implementar navegación a consultas
    alert('Funcionalidad de consultas en desarrollo');
  }

  onLogout(): void {
    // TODO: Implementar logout
    console.log('Logout...');
  }
}
