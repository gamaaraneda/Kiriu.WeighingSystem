import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WeighingFlowState {
  unitType: 'client' | 'provider' | null;
  operationType: 'entry' | 'exit' | null;
  step: 'dashboard' | 'operation-selection' | 'weighing-form';
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BreadcrumbItem {
  label: string;
  route: string[];
  isClickable: boolean;
  isCurrent: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WeighingFlowService {
  private flowState = new BehaviorSubject<WeighingFlowState>({
    unitType: null,
    operationType: null,
    step: 'dashboard',
    canGoBack: false,
    canGoForward: false,
  });

  private breadcrumbItems = new BehaviorSubject<BreadcrumbItem[]>([]);

  constructor() {
    this.updateBreadcrumb();
  }

  // Getters para el estado actual
  get currentState(): WeighingFlowState {
    return this.flowState.value;
  }

  get currentState$(): Observable<WeighingFlowState> {
    return this.flowState.asObservable();
  }

  get breadcrumb$(): Observable<BreadcrumbItem[]> {
    return this.breadcrumbItems.asObservable();
  }

  // Métodos para actualizar el estado
  setUnitType(unitType: 'client' | 'provider'): void {
    const currentState = this.flowState.value;
    this.flowState.next({
      ...currentState,
      unitType,
      step: 'operation-selection',
      canGoBack: true,
      canGoForward: true,
    });
    this.updateBreadcrumb();
  }

  setOperationType(operationType: 'entry' | 'exit'): void {
    const currentState = this.flowState.value;
    this.flowState.next({
      ...currentState,
      operationType,
      step: 'weighing-form',
      canGoBack: true,
      canGoForward: false,
    });
    this.updateBreadcrumb();
  }

  goToStep(step: WeighingFlowState['step']): void {
    const currentState = this.flowState.value;
    let newState = { ...currentState };

    switch (step) {
      case 'dashboard':
        newState = {
          unitType: null,
          operationType: null,
          step: 'dashboard',
          canGoBack: false,
          canGoForward: true,
        };
        break;
      case 'operation-selection':
        newState = {
          ...currentState,
          operationType: null,
          step: 'operation-selection',
          canGoBack: true,
          canGoForward: true,
        };
        break;
      case 'weighing-form':
        // Mantener el estado actual
        break;
    }

    this.flowState.next(newState);
    this.updateBreadcrumb();
  }

  resetFlow(): void {
    this.flowState.next({
      unitType: null,
      operationType: null,
      step: 'dashboard',
      canGoBack: false,
      canGoForward: true,
    });
    this.updateBreadcrumb();
  }

  // Métodos para navegación
  canNavigateTo(step: WeighingFlowState['step']): boolean {
    const currentState = this.flowState.value;

    switch (step) {
      case 'dashboard':
        return true;
      case 'operation-selection':
        return currentState.unitType !== null;
      case 'weighing-form':
        return (
          currentState.unitType !== null && currentState.operationType !== null
        );
      default:
        return false;
    }
  }

  getNavigationRoute(step: WeighingFlowState['step']): string[] {
    const currentState = this.flowState.value;

    switch (step) {
      case 'dashboard':
        return ['/dashboard'];
      case 'operation-selection':
        return currentState.unitType
          ? ['/operation-selection', currentState.unitType]
          : ['/dashboard'];
      case 'weighing-form':
        return currentState.unitType && currentState.operationType
          ? ['/weighing', currentState.unitType, currentState.operationType]
          : ['/dashboard'];
      default:
        return ['/dashboard'];
    }
  }

  // Métodos para breadcrumb
  private updateBreadcrumb(): void {
    const currentState = this.flowState.value;
    const items: BreadcrumbItem[] = [];

    // Siempre mostrar "Inicio"
    items.push({
      label: 'Inicio',
      route: ['/dashboard'],
      isClickable: true,
      isCurrent: currentState.step === 'dashboard',
    });

    // Si hay tipo de unidad seleccionado
    if (currentState.unitType) {
      const unitLabel =
        currentState.unitType === 'client' ? 'Cliente' : 'Proveedor';
      items.push({
        label: unitLabel,
        route: ['/operation-selection', currentState.unitType],
        isClickable: currentState.step !== 'dashboard',
        isCurrent: currentState.step === 'operation-selection',
      });

      // Si hay operación seleccionada
      if (currentState.operationType) {
        const operationLabel =
          currentState.operationType === 'entry' ? 'Entrada' : 'Salida';
        items.push({
          label: operationLabel,
          route: [
            '/weighing',
            currentState.unitType,
            currentState.operationType,
          ],
          isClickable: false,
          isCurrent: currentState.step === 'weighing-form',
        });
      }
    }

    this.breadcrumbItems.next(items);
  }

  // Métodos para validación del flujo
  validateFlow(): { isValid: boolean; missingSteps: string[] } {
    const currentState = this.flowState.value;
    const missingSteps: string[] = [];

    if (!currentState.unitType) {
      missingSteps.push('Tipo de unidad no seleccionado');
    }

    if (currentState.step === 'weighing-form' && !currentState.operationType) {
      missingSteps.push('Tipo de operación no seleccionado');
    }

    return {
      isValid: missingSteps.length === 0,
      missingSteps,
    };
  }

  // Métodos para persistencia temporal (opcional)
  saveToSessionStorage(): void {
    const currentState = this.flowState.value;
    sessionStorage.setItem('weighingFlowState', JSON.stringify(currentState));
  }

  loadFromSessionStorage(): void {
    const savedState = sessionStorage.getItem('weighingFlowState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        this.flowState.next(parsedState);
        this.updateBreadcrumb();
      } catch (error) {
        console.error('Error loading flow state from session storage:', error);
        this.resetFlow();
      }
    }
  }

  // Métodos para debugging
  logCurrentState(): void {
    console.log('Current Weighing Flow State:', this.flowState.value);
    console.log('Current Breadcrumb:', this.breadcrumbItems.value);
  }
}
