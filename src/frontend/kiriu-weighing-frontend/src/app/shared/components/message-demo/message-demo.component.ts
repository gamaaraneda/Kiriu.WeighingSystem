import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrimeNGModule } from '../../../prime-ng.config';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-message-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, PrimeNGModule],
  templateUrl: './message-demo.component.html',
  styleUrls: ['./message-demo.component.scss'],
})
export class MessageDemoComponent {
  // Datos del formulario de ejemplo
  plateNumber: string = '';
  operationType: 'entry' | 'exit' = 'entry';
  customMessage: string = '';
  customTitle: string = '';
  messageDuration: number = 5000;

  constructor(private messageService: MessageService) {}

  // Métodos para mostrar mensajes de éxito
  showEntrySuccess(): void {
    this.messageService.showEntrySuccess(this.plateNumber);
  }

  showExitSuccess(): void {
    this.messageService.showExitSuccess(this.plateNumber);
  }

  showCustomSuccess(): void {
    this.messageService.showSuccess({
      title: this.customTitle || 'Éxito Personalizado',
      message: this.customMessage || 'Operación completada exitosamente.',
      duration: this.messageDuration,
      closable: true,
    });
  }

  // Métodos para mostrar mensajes de error
  showEntryError(): void {
    this.messageService.showEntryError(this.plateNumber, this.customMessage);
  }

  showExitError(): void {
    this.messageService.showExitError(this.plateNumber, this.customMessage);
  }

  showCustomError(): void {
    this.messageService.showError({
      title: this.customTitle || 'Error Personalizado',
      message: this.customMessage || 'Ha ocurrido un error en la operación.',
      duration: this.messageDuration,
      closable: true,
    });
  }

  // Métodos para mostrar otros tipos de mensajes
  showWarning(): void {
    this.messageService.showWarning({
      title: this.customTitle || 'Advertencia',
      message: this.customMessage || 'Esta es una advertencia importante.',
      duration: this.messageDuration,
    });
  }

  showInfo(): void {
    this.messageService.showInfo({
      title: this.customTitle || 'Información',
      message: this.customMessage || 'Esta es una información útil.',
      duration: this.messageDuration,
    });
  }

  // Métodos para mostrar toasts
  showSuccessToast(): void {
    this.messageService.showSuccessToast({
      title: this.customTitle || 'Toast de Éxito',
      message: this.customMessage || 'Operación completada exitosamente.',
      duration: this.messageDuration,
      position: 'top-right',
    });
  }

  showErrorToast(): void {
    this.messageService.showErrorToast({
      title: this.customTitle || 'Toast de Error',
      message: this.customMessage || 'Ha ocurrido un error en la operación.',
      duration: this.messageDuration,
      position: 'top-right',
    });
  }

  // Simulación de operaciones del sistema de pesaje
  simulateEntryOperation(): void {
    if (!this.plateNumber.trim()) {
      this.messageService.showError({
        title: 'Error de Validación',
        message: 'Por favor ingrese un número de placa.',
        duration: 3000,
      });
      return;
    }

    // Simular operación asíncrona
    this.messageService.showInfo({
      title: 'Procesando',
      message: `Registrando entrada para la placa ${this.plateNumber}...`,
      duration: 2000,
    });

    setTimeout(() => {
      // Simular éxito (90% de probabilidad)
      if (Math.random() > 0.1) {
        this.messageService.showEntrySuccess(this.plateNumber);
      } else {
        this.messageService.showEntryError(
          this.plateNumber,
          'Error de conexión con el servidor.'
        );
      }
    }, 2000);
  }

  simulateExitOperation(): void {
    if (!this.plateNumber.trim()) {
      this.messageService.showError({
        title: 'Error de Validación',
        message: 'Por favor ingrese un número de placa.',
        duration: 3000,
      });
      return;
    }

    // Simular operación asíncrona
    this.messageService.showInfo({
      title: 'Procesando',
      message: `Registrando salida para la placa ${this.plateNumber}...`,
      duration: 2000,
    });

    setTimeout(() => {
      // Simular éxito (95% de probabilidad)
      if (Math.random() > 0.05) {
        this.messageService.showExitSuccess(this.plateNumber);
      } else {
        this.messageService.showExitError(
          this.plateNumber,
          'Error al calcular el peso final.'
        );
      }
    }, 2000);
  }

  // Limpiar formulario
  clearForm(): void {
    this.plateNumber = '';
    this.customMessage = '';
    this.customTitle = '';
    this.messageDuration = 5000;
    this.operationType = 'entry';
  }

  // Ejemplos de mensajes predefinidos
  showPredefinedMessages(): void {
    // Mensaje de éxito
    setTimeout(() => {
      this.messageService.showSuccess({
        title: 'Sistema Iniciado',
        message: 'El sistema de pesaje está funcionando correctamente.',
        duration: 4000,
      });
    }, 500);

    // Mensaje de información
    setTimeout(() => {
      this.messageService.showInfo({
        title: 'Conectando',
        message: 'Conectando con la báscula...',
        duration: 3000,
      });
    }, 1500);

    // Mensaje de advertencia
    setTimeout(() => {
      this.messageService.showWarning({
        title: 'Mantenimiento',
        message: 'Se recomienda calibrar la báscula cada 30 días.',
        duration: 5000,
      });
    }, 2500);
  }
}
