import { Injectable } from '@angular/core';
import { MessageService as PrimeMessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private primeMessageService: PrimeMessageService) {}

  /**
   * Muestra un toast de éxito
   * @param summary - Título del mensaje
   * @param detail - Detalle del mensaje
   */
  showSuccess(summary: string, detail: string): void {
    this.primeMessageService.add({
      severity: 'success',
      summary: summary,
      detail: detail,
      life: 5000,
      key: 'top-right'
    });
  }

  /**
   * Muestra un toast de error
   * @param summary - Título del mensaje
   * @param detail - Detalle del mensaje
   */
  showError(summary: string, detail: string): void {
    this.primeMessageService.add({
      severity: 'error',
      summary: summary,
      detail: detail,
      life: 5000,
      key: 'top-right'
    });
  }

  /**
   * Muestra un toast de información
   * @param summary - Título del mensaje
   * @param detail - Detalle del mensaje
   */
  showInfo(summary: string, detail: string): void {
    this.primeMessageService.add({
      severity: 'info',
      summary: summary,
      detail: detail,
      life: 5000,
      key: 'top-right'
    });
  }
}
