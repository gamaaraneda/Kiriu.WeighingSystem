import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';
import { AnprService, AnprEvent } from '../../services/anpr.service';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

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
    if (this.disabled || this.isCapturing) {
      return;
    }

    this.isCapturing = true;
    this.capturedPlate = null;
    this.capturedImageUrl = null;
    this.confidenceLevel = 0;

    try {
      // Paso 1: SIEMPRE intentar obtener foto huérfana de BD primero (no requiere SignalR)
      const photoTypeMap: Record<string, string> = {
        'trailer': 'trailerPlate',
        'remolque': 'remolque1Plate',
        'cargo': 'cargo'
      };
      const photoType = photoTypeMap[this.cameraType] || 'trailerPlate';

      console.log(`🔍 [ANPR-CAPTURE] Iniciando búsqueda en BD...`);
      console.log(`🔍 [ANPR-CAPTURE] CameraType: ${this.cameraType}`);
      console.log(`🔍 [ANPR-CAPTURE] PhotoType mapeado: ${photoType}`);

      const orphanPhoto = await firstValueFrom(
        this.anprService.getLatestOrphanPhoto(photoType)
      );

      console.log(`🔍 [ANPR-CAPTURE] Resultado de BD:`, orphanPhoto);

      if (orphanPhoto) {
        // Foto encontrada en BD - mostrarla inmediatamente
        console.log(`✅ Foto encontrada en BD: ${orphanPhoto.photoUrl}`);
        this.capturedImageUrl = orphanPhoto.photoUrl;
        this.confidenceLevel = 0; // No tenemos nivel de confianza de BD

        this.messageService.add({
          severity: 'success',
          summary: 'Foto obtenida',
          detail: 'Foto obtenida de base de datos. Esperando nueva captura...',
          life: 3000
        });

        // Emitir evento con la foto de BD (sin placa, solo imagen)
        const dbEvent: AnprEvent = {
          licensePlate: '', // Sin placa de BD
          cameraType: this.cameraType,
          imageUrl: orphanPhoto.photoUrl,
          confidenceLevel: 0,
          direction: '',
          cameraName: '',
          capturedAt: orphanPhoto.createdAt
        };

        this.plateCaptured.emit(dbEvent);
      } else {
        console.log(`ℹ️ No hay fotos disponibles en BD para tipo: ${photoType}`);
      }

      // Paso 2: Solo continuar con SignalR si está conectado
      if (!this.isConnected) {
        console.log(`⚠️ SignalR no conectado - no se esperará nueva captura`);
        this.messageService.add({
          severity: 'warn',
          summary: 'SignalR desconectado',
          detail: orphanPhoto
            ? 'Foto obtenida de BD. SignalR no disponible para nueva captura.'
            : 'No hay fotos disponibles y SignalR no está conectado.',
          life: 5000
        });
        return;
      }

      // SignalR conectado - esperar nueva captura que reemplazará la de BD si existía
      this.messageService.add({
        severity: 'info',
        summary: 'Esperando lectura',
        detail: `Esperando lectura de placa de ${this.getCameraLabel()}...`,
        life: this.timeoutSeconds * 1000
      });

      console.log(`⏳ Esperando evento SignalR...`);
      const anprEvent = await this.anprService.capturePlate(
        this.cameraType,
        this.timeoutSeconds * 1000
      );

      // Captura exitosa de SignalR (reemplaza la de BD si existía)
      console.log(`✅ Evento SignalR recibido: ${anprEvent.licensePlate}`);
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
