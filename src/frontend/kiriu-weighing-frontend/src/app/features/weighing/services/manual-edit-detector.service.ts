import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

export interface ManualEditEvent {
  fieldName: string;
  oldValue: any;
  newValue: any;
  isManualEdit: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ManualEditDetectorService {
  private manualEditSubject = new Subject<ManualEditEvent>();
  private originalValues: { [key: string]: any } = {};
  private userInitiatedChange = false;
  private manuallyChangedFields: { [formId: string]: Set<string> } = {};
  
  // Campos de placa que se deben monitorear
  private plateFields = [
    'trailerPlate',
    'trailerPlate2',
    'trailerPlateContenedor',
    'remolquePlateContenedor',
    'placaRemolque1',
    'placaRemolque2',
    'remolque1Plate',
    'remolque2Plate'
  ];

  public manualEdit$ = this.manualEditSubject.asObservable();

  /**
   * Configura el detector para un formulario específico
   * @param form El FormGroup a monitorear
   * @param formId Identificador único del formulario
   */
  setupFormMonitoring(form: FormGroup, formId: string): void {
    // Guardar valores originales
    this.originalValues[formId] = { ...form.value };
    
    // Inicializar conjunto de campos editados manualmente para este formulario
    this.manuallyChangedFields[formId] = new Set<string>();

    // Monitorear cambios en campos de placa
    this.plateFields.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        control.valueChanges.subscribe(newValue => {
          this.handleFieldChange(fieldName, this.originalValues[formId][fieldName], newValue, formId);
        });
      }
    });
  }

  /**
   * Indica que el siguiente cambio es iniciado por el usuario (manual)
   */
  markNextChangeAsManual(): void {
    this.userInitiatedChange = true;
  }

  /**
   * Indica que el siguiente cambio es automático (por OCR o sistema)
   */
  markNextChangeAsAutomatic(): void {
    this.userInitiatedChange = false;
  }

  /**
   * Obtiene si hay cambios manuales detectados en un formulario
   */
  hasManualChanges(formId: string): boolean {
    return this.getManuallyChangedFields(formId).length > 0;
  }

  /**
   * Obtiene la lista de campos que fueron editados manualmente
   */
  getManuallyChangedFields(formId: string): string[] {
    const fieldsSet = this.manuallyChangedFields[formId];
    return fieldsSet ? Array.from(fieldsSet) : [];
  }

  /**
   * Resetea el estado de detección para un formulario
   */
  resetFormState(formId: string): void {
    delete this.originalValues[formId];
    delete this.manuallyChangedFields[formId];
    this.userInitiatedChange = false;
  }

  private handleFieldChange(fieldName: string, oldValue: any, newValue: any, formId: string): void {
    // Solo procesar si es un campo de placa y el valor cambió realmente
    if (this.plateFields.includes(fieldName) && oldValue !== newValue) {
      const isManualEdit = this.userInitiatedChange;
      
      const editEvent: ManualEditEvent = {
        fieldName,
        oldValue,
        newValue,
        isManualEdit,
        timestamp: new Date()
      };

      this.manualEditSubject.next(editEvent);

      // Si es una edición manual, agregar el campo al conjunto de campos editados manualmente
      if (isManualEdit && this.manuallyChangedFields[formId]) {
        this.manuallyChangedFields[formId].add(fieldName);
      }

      // Resetear la bandera después de procesar el cambio
      this.userInitiatedChange = false;

      console.log(`🔍 Campo ${fieldName} cambió:`, {
        oldValue,
        newValue,
        isManualEdit,
        formId,
        totalManuallyChangedFields: this.manuallyChangedFields[formId]?.size || 0
      });
    }
  }

  /**
   * Obtiene estadísticas de edición para un formulario
   */
  getEditStats(formId: string): {
    totalChanges: number;
    manualChanges: number;
    automaticChanges: number;
    lastEditTime?: Date;
  } {
    const manualChanges = this.manuallyChangedFields[formId]?.size || 0;
    
    return {
      totalChanges: manualChanges, // En esta implementación simplificada, solo contamos cambios manuales
      manualChanges: manualChanges,
      automaticChanges: 0, // Por simplicidad, no rastreamos cambios automáticos por separado
      lastEditTime: undefined // Se podría agregar rastreo de tiempo si es necesario
    };
  }
}