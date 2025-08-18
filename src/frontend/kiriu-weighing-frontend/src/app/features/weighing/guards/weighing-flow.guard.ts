import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WeighingFlowService } from '../services/weighing-flow.service';

export const weighingFlowGuard: CanActivateFn = (route, state) => {
  const weighingFlowService = inject(WeighingFlowService);
  const router = inject(Router);

  // Obtener parámetros de la ruta
  const unitType = route.paramMap.get('unitType');
  const operationType = route.paramMap.get('operationType');

  // Validar el flujo actual
  const currentState = weighingFlowService.currentState;
  const flowValidation = weighingFlowService.validateFlow();

  // Si estamos en la selección de operación
  if (state.url.includes('/operation-selection/')) {
    if (!unitType || !['client', 'provider'].includes(unitType)) {
      console.warn('Tipo de unidad inválido, redirigiendo al dashboard');
      router.navigate(['/dashboard']);
      return false;
    }

    // Actualizar el estado del flujo
    weighingFlowService.setUnitType(unitType as 'client' | 'provider');
    return true;
  }

  // Si estamos en el formulario de pesaje
  if (state.url.includes('/weighing/')) {
    if (
      !unitType ||
      !operationType ||
      !['client', 'provider'].includes(unitType) ||
      !['entry', 'exit'].includes(operationType)
    ) {
      console.warn('Parámetros de ruta inválidos, redirigiendo al dashboard');
      router.navigate(['/dashboard']);
      return false;
    }

    // Validar que el flujo sea correcto
    if (!flowValidation.isValid) {
      console.warn(
        'Flujo inválido, redirigiendo al dashboard:',
        flowValidation.missingSteps
      );
      router.navigate(['/dashboard']);
      return false;
    }

    // Actualizar el estado del flujo
    weighingFlowService.setUnitType(unitType as 'client' | 'provider');
    weighingFlowService.setOperationType(operationType as 'entry' | 'exit');
    return true;
  }

  return true;
};
