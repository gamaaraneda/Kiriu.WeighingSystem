import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';
import { AnprService, AnprEvent } from '../../services/anpr.service';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-anpr-capture',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ProgressSpinnerModule,
    ImageModule,
    TooltipModule
  ],
  templateUrl: './anpr-capture.component.html',
  styleUrls: ['./anpr-capture.component.scss']
})
export class AnprCaptureComponent implements OnInit, OnDestroy {
  @Input() cameraType: 'trailer' | 'remolque' | 'cargo' = 'trailer';
  @Input() label: string = 'Capturar Placa';
  @Input() icon: string = 'pi pi-camera';
  @Input() timeoutSeconds: number = 30;
  @Input() disabled: boolean = false;
  @Input() showPreview: boolean = true;

  @Output() plateCaptured = new EventEmitter<AnprEvent>();
  @Output() captureFailed = new EventEmitter<Error>();

  isCapturing: boolean = false;
  capturedPlate: string | null = null;
  capturedImageUrl: string | null = null;
  confidenceLevel: number = 0;
  isConnected: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private anprService: AnprService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Suscribirse al estado de conexión
    this.anprService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isConnected = status.isConnected;
      });
  }

  async onCapture(): Promise<void> {
    if (this.disabled || this.isCapturing || !this.isConnected) {
      return;
    }

    this.isCapturing = true;
    this.capturedPlate = null;
    this.capturedImageUrl = null;
    this.confidenceLevel = 0;

    try {
      // Mostrar mensaje de inicio
      this.messageService.add({
        severity: 'info',
        summary: 'Esperando lectura',
        detail: `Esperando lectura de placa de ${this.getCameraLabel()}...`,
        life: this.timeoutSeconds * 1000
      });

      // Iniciar captura con timeout
      const anprEvent = await this.anprService.capturePlate(
        this.cameraType,
        this.timeoutSeconds * 1000
      );

      // Captura exitosa
      this.capturedPlate = anprEvent.licensePlate;
      this.capturedImageUrl = anprEvent.imageUrl;
      this.confidenceLevel = anprEvent.confidenceLevel;

      this.messageService.add({
        severity: 'success',
        summary: 'Placa capturada',
        detail: `Placa ${anprEvent.licensePlate} detectada con ${anprEvent.confidenceLevel}% de confianza`,
        life: 3000
      });

      this.plateCaptured.emit(anprEvent);
    } catch (error: any) {
      // Error de timeout u otro error
      const errorMessage = error.name === 'TimeoutError'
        ? `Tiempo de espera agotado (${this.timeoutSeconds}s)`
        : 'Error al capturar placa';

      this.messageService.add({
        severity: 'error',
        summary: 'Error de captura',
        detail: errorMessage,
        life: 5000
      });

      this.captureFailed.emit(error);
    } finally {
      this.isCapturing = false;
    }
  }

  onCancel(): void {
    if (this.isCapturing) {
      this.anprService.cancelCapture();
      this.isCapturing = false;

      this.messageService.add({
        severity: 'warn',
        summary: 'Captura cancelada',
        detail: 'La captura de placa ha sido cancelada',
        life: 3000
      });
    }
  }

  clearCapture(): void {
    this.capturedPlate = null;
    this.capturedImageUrl = null;
    this.confidenceLevel = 0;
  }

  private getCameraLabel(): string {
    switch (this.cameraType) {
      case 'trailer':
        return 'tráiler';
      case 'remolque':
        return 'remolque';
      case 'cargo':
        return 'carga/contenedor';
      default:
        return 'vehículo';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
