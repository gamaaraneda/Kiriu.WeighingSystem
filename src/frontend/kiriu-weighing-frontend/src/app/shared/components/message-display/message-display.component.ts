import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimeNGModule } from '../../../prime-ng.config';
import { MessageService } from '../../services/message.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-message-display',
  standalone: true,
  imports: [CommonModule, PrimeNGModule],
  templateUrl: './message-display.component.html',
  styleUrls: ['./message-display.component.scss']
})
export class MessageDisplayComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  
  // Propiedad para mostrar/ocultar controles de desarrollo
  showControls = false; // Cambiar a true para mostrar controles de desarrollo

  constructor(public messageService: MessageService) {}

  ngOnInit(): void {
    // El componente está listo para mostrar mensajes
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Limpia todos los mensajes
   */
  clearAllMessages(): void {
    this.messageService.clear();
  }

  /**
   * Limpia solo los mensajes de éxito
   */
  clearSuccessMessages(): void {
    this.messageService.clearBySeverity('success');
  }

  /**
   * Limpia solo los mensajes de error
   */
  clearErrorMessages(): void {
    this.messageService.clearBySeverity('error');
  }

  /**
   * Limpia solo los mensajes de advertencia
   */
  clearWarningMessages(): void {
    this.messageService.clearBySeverity('warn');
  }

  /**
   * Limpia solo los mensajes de información
   */
  clearInfoMessages(): void {
    this.messageService.clearBySeverity('info');
  }
}
