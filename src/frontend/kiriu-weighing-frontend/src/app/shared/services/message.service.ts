import { Injectable } from '@angular/core';
import { MessageService as PrimeMessageService } from 'primeng/api';

export interface MessageOptions {
  title?: string;
  message: string;
  duration?: number;
  closable?: boolean;
}

export interface ToastOptions extends MessageOptions {
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private defaultDuration = 3000; // 3 segundos por defecto

  constructor(private primeMessageService: PrimeMessageService) {}

  /**
   * Muestra un mensaje de éxito usando PrimeNG Message
   */
  showSuccess(options: MessageOptions): void {
    this.primeMessageService.add({
      severity: 'success',
      summary: options.title || 'Éxito',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      closable: options.closable !== false
    });
  }

  /**
   * Muestra un mensaje de error usando PrimeNG Message
   */
  showError(options: MessageOptions): void {
    this.primeMessageService.add({
      severity: 'error',
      summary: options.title || 'Error',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      closable: options.closable !== false
    });
  }

  /**
   * Muestra un mensaje de advertencia usando PrimeNG Message
   */
  showWarning(options: MessageOptions): void {
    this.primeMessageService.add({
      severity: 'warn',
      summary: options.title || 'Advertencia',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      closable: options.closable !== false
    });
  }

  /**
   * Muestra un mensaje de información usando PrimeNG Message
   */
  showInfo(options: MessageOptions): void {
    this.primeMessageService.add({
      severity: 'info',
      summary: options.title || 'Información',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      closable: options.closable !== false
    });
  }

  /**
   * Muestra un toast de éxito usando PrimeNG Toast
   */
  showSuccessToast(options: ToastOptions): void {
    this.primeMessageService.add({
      severity: 'success',
      summary: options.title || 'Éxito',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      key: options.position || 'top-right'
    });
  }

  /**
   * Muestra un toast de error usando PrimeNG Toast
   */
  showErrorToast(options: ToastOptions): void {
    this.primeMessageService.add({
      severity: 'error',
      summary: options.title || 'Error',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      key: options.position || 'top-right'
    });
  }

  /**
   * Muestra un toast de advertencia usando PrimeNG Toast
   */
  showWarningToast(options: ToastOptions): void {
    this.primeMessageService.add({
      severity: 'warn',
      summary: options.title || 'Advertencia',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      key: options.position || 'top-right'
    });
  }

  /**
   * Muestra un toast de información usando PrimeNG Toast
   */
  showInfoToast(options: ToastOptions): void {
    this.primeMessageService.add({
      severity: 'info',
      summary: options.title || 'Información',
      detail: options.message,
      life: options.duration || this.defaultDuration,
      key: options.position || 'top-right'
    });
  }

  /**
   * Limpia todos los mensajes
   */
  clear(): void {
    this.primeMessageService.clear();
  }

  /**
   * Limpia mensajes de un tipo específico
   */
  clearBySeverity(severity: 'success' | 'error' | 'warn' | 'info'): void {
    this.primeMessageService.clear(severity);
  }

  // Métodos de conveniencia para el sistema de pesaje
  /**
   * Mensaje de éxito para entrada registrada
   */
  showEntrySuccess(plateNumber?: string): void {
    const message = plateNumber 
      ? `Entrada registrada correctamente para la placa ${plateNumber}.`
      : 'Entrada registrada correctamente.';
    
    this.showSuccess({
      title: 'Entrada Registrada',
      message: message
    });
  }

  /**
   * Mensaje de éxito para salida registrada
   */
  showExitSuccess(plateNumber?: string): void {
    const message = plateNumber 
      ? `Salida registrada con éxito para la placa ${plateNumber}.`
      : 'Salida registrada con éxito.';
    
    this.showSuccess({
      title: 'Salida Registrada',
      message: message
    });
  }

  /**
   * Mensaje de error para entrada fallida
   */
  showEntryError(plateNumber?: string, customMessage?: string): void {
    const message = customMessage || 
      (plateNumber 
        ? `Error al registrar la entrada para la placa ${plateNumber}. Intenta nuevamente.`
        : 'Error al registrar la entrada. Intenta nuevamente.');
    
    this.showError({
      title: 'Error en Entrada',
      message: message
    });
  }

  /**
   * Mensaje de error para salida fallida
   */
  showExitError(plateNumber?: string, customMessage?: string): void {
    const message = customMessage || 
      (plateNumber 
        ? `Error al registrar la salida para la placa ${plateNumber}. Intenta nuevamente.`
        : 'Error al registrar la salida. Intenta nuevamente.');
    
    this.showError({
      title: 'Error en Salida',
      message: message
    });
  }

  /**
   * Mensaje de advertencia para operaciones de pesaje
   */
  showWeighingWarning(message: string, title?: string): void {
    this.showWarning({
      title: title || 'Advertencia de Pesaje',
      message: message
    });
  }

  /**
   * Mensaje de información para operaciones de pesaje
   */
  showWeighingInfo(message: string, title?: string): void {
    this.showInfo({
      title: title || 'Información de Pesaje',
      message: message
    });
  }
}
