import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { RealWeighingService } from '../../services/real-weighing.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { MessageService } from '../../../../shared/services/message.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ToastModule } from 'primeng/toast';
import {
  ExitPhotoData,
  WeightData,
  EntrySearchData,
  DoubleTrailerExitState,
} from '../../types/weighing.types';
import { extractErrorMessage } from '../../../../shared/utils/error.utils';
import { PesoRealtimeService, PesoData, ConnectionStatus } from '../../services/peso-realtime.service';
import { AnprService, AnprEvent } from '../../services/anpr.service';
import { PdfGeneratorService, WeighingReceiptData } from '../../services/pdf-generator.service';
import { CargoCameraService } from '../../services/cargo-camera.service';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-weighing-exit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    BreadcrumbComponent,
    ToastModule,
  ],
  templateUrl: './weighing-exit-form.component.html',
  styleUrls: ['./weighing-exit-form.component.scss'],
})
export class WeighingExitFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private weighingService = inject(RealWeighingService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private pesoRealtimeService = inject(PesoRealtimeService);
  private anprService = inject(AnprService);
  private pdfGeneratorService = inject(PdfGeneratorService);
  private cargoCameraService = inject(CargoCameraService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  unitType = '';
  unitTypeTitle = '';
  operationTitle = 'Registro de Salida';

  exitForm!: FormGroup;
  weightData: WeightData = {
    currentWeight: 0,
    isStable: false,
    isConnected: true,
    weightHistory: [],
  };

  photoData: ExitPhotoData = {
    trailerPlate: '',
    trailerPlate2: '',
    cargoState: '',
    containerPlate: '',
    remolque1Plate: '',
    remolque2Plate: '',
    cargoRemolque1: '',
    cargoRemolque2: '',
  };

  // Datos de placas detectadas por OCR
  detectedPlates: Record<string, string> = {
    trailerPlate: '',
    trailerPlate2: '',
    containerPlate: '',
    remolque1Plate: '',
    remolque2Plate: '',
  };

  // Validaciones de placas
  plateValidations: Record<string, { isValid: boolean; errorMessage: string }> =
    {
      trailerPlate: { isValid: true, errorMessage: '' },
      trailerPlate2: { isValid: true, errorMessage: '' },
      containerPlate: { isValid: true, errorMessage: '' },
      remolque1Plate: { isValid: true, errorMessage: '' },
      remolque2Plate: { isValid: true, errorMessage: '' },
    };

  // Datos de la entrada encontrada
  entryData: EntrySearchData | null = null;
  isEntryFound = false;
  entryFolio = ''; // Folio de la entrada para usar en la salida
  isSearching = false;
  isLoading = false;
  isExitRegistered = false;

  // Control de edición manual de placas
  manualEditEnabled: Record<string, boolean> = {
    trailerPlate: false,
    trailerPlate2: false,
    containerPlate: false,
    remolque1Plate: false,
    remolque2Plate: false,
  };

  // Estado para doble remolque
  doubleTrailerState: DoubleTrailerExitState = {
    currentStep: 'trailer',
    trailerPlaca: '',
    remolque1: {
      numero: 1,
      placa: '',
      pesoTara: 0,
      fotoCargaCapturada: false,
    },
    remolque2: {
      numero: 2,
      placa: '',
      pesoTara: 0,
      fotoCargaCapturada: false,
    },
    isComplete: false,
    pesoBrutoTotal: 0,
    pesoNetoCalculado: 0,
  };

  // Tipo de captura de peso actual
  currentWeightCaptureType: string | null = null;

  // SignalR subscriptions
  private pesoRealtimeSubscription?: Subscription;
  private connectionStatusSubscription?: Subscription;
  connectionStatus: ConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0
  };

  // Configuración de báscula
  currentBasculaId: number | null = null;

  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initializeForm();
    this.startRealtimeWeightUpdates();
    this.getUnitTypeFromRoute();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    
    if (this.pesoRealtimeSubscription) {
      this.pesoRealtimeSubscription.unsubscribe();
    }
    
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initializeForm(): void {
    this.exitForm = this.fb.group({
      trailerPlate: ['', []], // Removido Validators.required para permitir contenedor sin placa
      trailerPlate2: [''],
      exitWeight: [0, [Validators.required, Validators.min(0)]],
      netWeight: [0, [Validators.required, Validators.min(0)]],
      // Campos para doble remolque
      remolque1Plate: [''],
      remolque2Plate: [''],
      pesoTaraRemolque1: [0, [Validators.required, Validators.min(0)]],
      pesoTaraRemolque2: [0, [Validators.required, Validators.min(0)]],
    });

    // Suscribirse a cambios en los pesos tara para calcular peso neto
    this.subscriptions.add(
      this.exitForm.get('pesoTaraRemolque1')?.valueChanges.subscribe(() => {
        this.calculateNetWeight();
      })
    );

    this.subscriptions.add(
      this.exitForm.get('pesoTaraRemolque2')?.valueChanges.subscribe(() => {
        this.calculateNetWeight();
      })
    );
  }

  /**
   * Inicia las actualizaciones de peso en tiempo real usando SignalR
   */
  private startRealtimeWeightUpdates(): void {
    // Suscribirse al servicio de peso en tiempo real
    this.pesoRealtimeSubscription = this.pesoRealtimeService
      .getPesoObservable()
      .subscribe((pesoData: PesoData | null) => {
        if (pesoData) {
          // Filtrar por báscula si está configurado
          if (this.currentBasculaId && pesoData.id !== this.currentBasculaId) {
            return; // Ignorar datos de otras básculas
          }

          // Actualizar datos de peso
          this.weightData.currentWeight = pesoData.peso;
          this.weightData.isStable = this.isWeightStable(pesoData.peso);
          this.weightData.isConnected = this.connectionStatus.isConnected;

          // Actualizar historial
          if (this.weightData.weightHistory.length >= 10) {
            this.weightData.weightHistory.shift();
          }
          this.weightData.weightHistory.push(pesoData.peso);

          // Marcar para detección de cambios
          this.cdr.markForCheck();
        }
      });

    // Suscribirse al estado de conexión
    this.connectionStatusSubscription = this.pesoRealtimeService
      .getConnectionStatus()
      .subscribe((status: ConnectionStatus) => {
        this.connectionStatus = status;
        this.weightData.isConnected = status.isConnected;
        this.cdr.markForCheck();
      });
  }

  /**
   * Determina si el peso está estable basado en el historial
   */
  private isWeightStable(currentWeight: number): boolean {
    if (this.weightData.weightHistory.length < 3) {
      return false;
    }

    // Verificar que las últimas 3 lecturas estén dentro de un rango de 5kg
    const recentWeights = this.weightData.weightHistory.slice(-3);
    const maxWeight = Math.max(...recentWeights);
    const minWeight = Math.min(...recentWeights);
    
    return (maxWeight - minWeight) <= 5;
  }

  /**
   * Reconecta el servicio SignalR
   */
  async onReconnectWeightService(): Promise<void> {
    try {
      await this.pesoRealtimeService.reconnect();
      this.showToast('success', 'Placa no coincide', `La placa detectada ");
        } else {
          // Placa coincide - marcar válida
          this.plateValidations[fieldName] = {
            isValid: true,
            errorMessage: ''
          };

          this.showToast('success', 'Placa verificada', `Placa ${anprEvent.licensePlate} del ${plateTypeLabel} verificada correctamente`);
        }
      } else {
        // No hay datos de entrada aún, solo mostrar éxito
        this.showToast('success', 'Placa capturada', `Placa ${anprEvent.licensePlate} del ${plateTypeLabel} detectada con ${anprEvent.confidenceLevel}% de confianza`);
      }

    } catch (error: any) {
      console.error('❌ Error capturando placa con ANPR:', error);

      const errorMessage = error.name === 'TimeoutError'
        ? 'Tiempo de espera agotado (30s). No se detectó ninguna placa.'
        : 'Error al capturar placa desde la cámara ANPR';

      this.showToast('error', 'Error de captura', `Error al capturar foto de ${fieldName} desde la cámara`);
    }
  }

  /**
   * Habilita la edición manual de una placa
   * Al habilitar edición manual, se deshabilita la validación de error
   */
  onEnableManualEdit(fieldName: string): void {
    this.manualEditEnabled[fieldName] = true;

    // Al habilitar edición manual, consideramos que el usuario está corrigiendo
    // Por lo tanto, deshabilitamos la validación de error
    this.plateValidations[fieldName] = {
      isValid: true,
      errorMessage: ''
    };

    this.showToast('info', 'Edición manual habilitada', `Puede editar manualmente la placa. La validación automática ha sido deshabilitada.`);
  }

  /**
   * Maneja la edición manual de una placa
   */
  onPlateManualEdit(fieldName: string): void {
    if (this.entryData) {
      this.validatePlate(fieldName, this.getExpectedPlate(fieldName));
    }
  }

  /**
   * Obtiene la placa esperada para un campo específico
   */
  private getExpectedPlate(fieldName: string): string | undefined {
    if (!this.entryData) return undefined;

    const plateMap: Record<string, string | undefined> = {
      trailerPlate: this.entryData.placaTrailer,
      remolque1Plate: this.entryData.placaRemolque1,
      remolque2Plate: this.entryData.placaRemolque2,
      trailerPlate2: this.entryData.placaRemolque,
      containerPlate: this.entryData.placaTrailerContenedor,
    };

    return plateMap[fieldName];
  }

  /**
   * Captura peso para remolque 1
   */
  onCaptureWeightRemolque1(): void {
    if (this.canCaptureWeight()) {
      this.currentWeightCaptureType = 'Remolque 1';
      this.weightData.capturedWeight = this.weightData.currentWeight;
      this.weightData.capturedAt = new Date();

      this.exitForm
        .get('pesoTaraRemolque1')
        ?.setValue(this.weightData.currentWeight);
      this.doubleTrailerState.remolque1.pesoTara =
        this.weightData.currentWeight;

      this.showToast('success', 'Error al registrar salida', 'Formulario limpiado');
  }

  /**
   * Regresa a la página anterior
   */
  onGoBack(): void {
    this.router.navigate(['/weighing/operation-selection']);
  }

  /**
   * Maneja clic en consultas
   */
  onQueries(): void {
    // Implementar navegación a consultas
    this.router.navigate(['/weighing-query']);
  }

  /**
   * Maneja clic en logout
   */
  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Obtiene la descripción del cálculo del peso neto según el tipo de unidad
   */
  getNetWeightCalculationDescription(): string {
    if (this.unitType === 'provider') {
      return 'Peso bruto menos peso tara (Material descargado)';
    } else {
      return 'Peso tara menos peso bruto (Material cargado)';
    }
  }

  /**
   * Obtiene la descripción del cálculo del peso neto para doble remolque
   */
  getDoubleTrailerNetWeightCalculationDescription(): string {
    if (this.unitType === 'provider') {
      return 'Peso bruto menos suma de pesos tara (Material descargado)';
    } else {
      return 'Suma de pesos tara menos peso bruto (Material cargado)';
    }
  }

  /**
   * Sistema de notificaciones nativo
   */
  private showToast(
    severity: 'success' | 'error' | 'warn' | 'info',
    summary: string,
    detail: string
  ): void {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${severity}`;

    const icons = {
      success: '✓',
      error: '✕',
      warn: '!',
      info: 'i',
    };

    toast.innerHTML = `
      <div class="toast__body">
        <div class="toast__icon">${icons[severity]}</div>
        <div>
          <div class="toast__title">${summary}</div>
          <div class="toast__msg">${detail}</div>
        </div>
        <button class="toast__close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove después de 5 segundos
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'toast-out 0.18s cubic-bezier(0.22, 0.61, 0.36, 1) both';
        setTimeout(() => {
          toast.remove();
        }, 180);
      }
    }, 5000);
  }
}
