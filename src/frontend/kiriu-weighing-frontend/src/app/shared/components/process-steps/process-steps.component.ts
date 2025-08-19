import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProcessStep {
  id: string;
  label: string;
  isCompleted: boolean;
  isRequired: boolean;
  icon?: string;
}

export interface ProcessFlow {
  id: string;
  title: string;
  steps: ProcessStep[];
}

@Component({
  selector: 'app-process-steps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-steps.component.html',
  styleUrls: ['./process-steps.component.scss'],
})
export class ProcessStepsComponent implements OnInit, OnChanges {
  @Input() flowType: 'container-only' | 'single-trailer' | 'double-trailer' =
    'single-trailer';
  @Input() currentStep?: string;
  @Input() showProgress = true;
  @Input() stepStatuses: { [key: string]: boolean } = {};

  processFlow: ProcessFlow | null = null;

  ngOnInit(): void {
    this.initializeProcessFlow();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flowType'] && !changes['flowType'].firstChange) {
      this.initializeProcessFlow();
    }

    if (changes['stepStatuses'] && this.processFlow) {
      this.updateStepsFromStatuses();
    }
  }

  private initializeProcessFlow(): void {
    switch (this.flowType) {
      case 'container-only':
        this.processFlow = {
          id: 'container-only',
          title: 'Flujo: Solo Contenedor',
          steps: [
            {
              id: 'product',
              label: 'Producto/Material',
              isCompleted: false,
              isRequired: true,
              icon: '📦',
            },
            {
              id: 'client',
              label: 'Nombre del Cliente',
              isCompleted: false,
              isRequired: true,
              icon: '👤',
            },
            {
              id: 'cargo-photo',
              label: 'Foto de la Carga',
              isCompleted: false,
              isRequired: true,
              icon: '📷',
            },
            {
              id: 'weight',
              label: 'Peso Bruto',
              isCompleted: false,
              isRequired: true,
              icon: '⚖️',
            },
          ],
        };
        break;

      case 'single-trailer':
        this.processFlow = {
          id: 'single-trailer',
          title: 'Flujo: Remolque Único',
          steps: [
            {
              id: 'trailer-plate',
              label: 'Placa del Tráiler',
              isCompleted: false,
              isRequired: true,
              icon: '🚛',
            },
            {
              id: 'trailer2-plate',
              label: 'Placa del Remolque',
              isCompleted: false,
              isRequired: true,
              icon: '🚚',
            },
            {
              id: 'product',
              label: 'Producto/Material',
              isCompleted: false,
              isRequired: true,
              icon: '📦',
            },
            {
              id: 'client',
              label: 'Nombre del Cliente',
              isCompleted: false,
              isRequired: true,
              icon: '👤',
            },
            {
              id: 'cargo-photo',
              label: 'Foto de la Carga',
              isCompleted: false,
              isRequired: true,
              icon: '📷',
            },
            {
              id: 'weight',
              label: 'Peso',
              isCompleted: false,
              isRequired: true,
              icon: '⚖️',
            },
          ],
        };
        break;

      case 'double-trailer':
        this.processFlow = {
          id: 'double-trailer',
          title: 'Flujo: Doble Remolque',
          steps: [
            {
              id: 'product',
              label: 'Producto/Material',
              isCompleted: false,
              isRequired: true,
              icon: '📦',
            },
            {
              id: 'client',
              label: 'Cliente',
              isCompleted: false,
              isRequired: true,
              icon: '👤',
            },
            {
              id: 'trailer-plate',
              label: 'Placa del Tráiler',
              isCompleted: false,
              isRequired: true,
              icon: '🚛',
            },
            {
              id: 'remolque1-plate',
              label: 'Placa del Remolque 1',
              isCompleted: false,
              isRequired: true,
              icon: '🚚',
            },
            {
              id: 'remolque1-cargo',
              label: 'Foto de Carga Remolque 1',
              isCompleted: false,
              isRequired: true,
              icon: '📷',
            },
            {
              id: 'remolque2-plate',
              label: 'Placa del Remolque 2',
              isCompleted: false,
              isRequired: true,
              icon: '🚚',
            },
            {
              id: 'remolque2-cargo',
              label: 'Foto de Carga Remolque 2',
              isCompleted: false,
              isRequired: true,
              icon: '📷',
            },
            {
              id: 'weight',
              label: 'Peso Total',
              isCompleted: false,
              isRequired: true,
              icon: '⚖️',
            },
          ],
        };
        break;
    }

    // Aplicar estados actuales si están disponibles
    if (this.stepStatuses && Object.keys(this.stepStatuses).length > 0) {
      this.updateStepsFromStatuses();
    }
  }

  private updateStepsFromStatuses(): void {
    if (!this.processFlow || !this.stepStatuses) return;

    this.processFlow.steps.forEach((step) => {
      if (this.stepStatuses.hasOwnProperty(step.id)) {
        step.isCompleted = this.stepStatuses[step.id];
      }
    });
  }

  updateStepStatus(stepId: string, isCompleted: boolean): void {
    if (this.processFlow) {
      const step = this.processFlow.steps.find((s) => s.id === stepId);
      if (step) {
        step.isCompleted = isCompleted;
      }
    }
  }

  getCompletedStepsCount(): number {
    if (!this.processFlow) return 0;
    return this.processFlow.steps.filter((step) => step.isCompleted).length;
  }

  getTotalStepsCount(): number {
    if (!this.processFlow) return 0;
    return this.processFlow.steps.length;
  }

  getProgressPercentage(): number {
    if (this.getTotalStepsCount() === 0) return 0;
    return (this.getCompletedStepsCount() / this.getTotalStepsCount()) * 100;
  }

  getNextPendingStep(): ProcessStep | null {
    if (!this.processFlow) return null;
    return this.processFlow.steps.find((step) => !step.isCompleted) || null;
  }

  trackByStepId(index: number, step: ProcessStep): string {
    return step.id;
  }
}
