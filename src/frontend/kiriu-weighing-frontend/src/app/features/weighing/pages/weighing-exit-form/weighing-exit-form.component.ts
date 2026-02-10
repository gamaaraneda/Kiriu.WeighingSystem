import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  catchError,
} from 'rxjs/operators';
import { HeaderComponent } from '../../../../layout/header/header.component';
import {
  RealWeighingService,
  PendingExitSearchResult,
  PendingDoubleTrailerExitSearchResult,
  PartialDoubleTrailerExitResponse,
  CreatePartialDoubleTrailerExitRequest,
  ContinueDoubleTrailerExitRequest,
} from '../../services/real-weighing.service';
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
import {
  PesoRealtimeService,
  PesoData,
  ConnectionStatus,
} from '../../services/peso-realtime.service';
import { AnprService, AnprEvent } from '../../services/anpr.service';
import {
  PdfGeneratorService,
  WeighingReceiptData,
} from '../../services/pdf-generator.service';
import { CargoCameraService } from '../../services/cargo-camera.service';
import { TrailerCameraService } from '../../services/trailer-camera.service';
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
  private trailerCameraService = inject(TrailerCameraService);
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

  // PhotoId de remolque1 (doble remolque) - usado para excluir al buscar remolque2
  private remolque1PhotoId: string | null = null;

  // Datos de la entrada encontrada
  entryData: EntrySearchData | null = null;
  isEntryFound = false;
  entryFolio = ''; // Folio de la entrada para usar en la salida
  isSearching = false;
  isLoading = false;
  isExitRegistered = false;
  loadingWeight = false;

  // Control para captura consolidada de fotos
  isCapturingAllPhotos = false;
  photosCaptureProgress = { current: 0, total: 0, fieldName: '' };

  // Control para orden invertido de placas
  invertedPlateOrder = false;

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
    reconnectAttempts: 0,
  };

  // Configuración de báscula
  currentBasculaId: number | null = null;

  // Autocompletado de búsqueda de entradas (incluye salidas parciales pendientes de remolque 2)
  entrySuggestions: (PendingExitSearchResult & {
    pendingType?: 'continue_remolque2';
  })[] = [];
  showEntrySuggestions = false;
  entrySearchSubscription: Subscription | undefined;

  /** Modo continuar salida doble remolque (solo remolque 2) */
  currentOperationFolio: string | null = null;
  partialExitData: PartialDoubleTrailerExitResponse | null = null;

  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initializeForm();
    this.startRealtimeWeightUpdates();
    this.getUnitTypeFromRoute();

    this.route.queryParams.subscribe((params) => {
      const mode = params['mode'];
      const folio = params['folio'];
      if (mode === 'continue-double-trailer-exit' && folio) {
        this.loadPartialExitOperationForContinue(folio);
      } else {
        this.setupEntrySearch();
      }
    });
  }

  /**
   * Carga operación con salida parcial para continuar con remolque 2
   */
  private loadPartialExitOperationForContinue(folio: string): void {
    this.isLoading = true;
    this.isSearching = true;
    this.weighingService.getPendingDoubleTrailerExitByFolio(folio).subscribe({
      next: (op) => {
        this.isSearching = false;
        this.partialExitData = op;
        this.currentOperationFolio = op.folio;
        this.entryFolio = op.folio;
        this.isEntryFound = true;
        this.entryData = {
          id: op.id,
          createdAt: new Date(op.fechaSalidaR1),
          tipoUnidad: 'doble-remolque',
          clientProviderName: op.clientProviderName,
          product: op.product,
          entryWeight: op.remolque1.pesoBrutoEntrada,
          status: op.status,
          placaTrailer: op.trailerPlaca,
          placaRemolque1: op.remolque1.placa,
          placaRemolque2: op.placaRemolque2 ?? '',
          fotos: { fotoCargaEntrada: '' },
        };
        this.unitType = 'client';
        this.unitTypeTitle = 'Cliente';
        this.operationTitle = 'Continuar salida doble remolque (Remolque 2)';
        this.exitForm.patchValue({
          trailerPlate: op.trailerPlaca,
          remolque1Plate: op.remolque1.placa,
          remolque2Plate: op.placaRemolque2 ?? '',
          pesoTaraRemolque1: op.remolque1.pesoTaraSalida,
        });
        this.photoData.remolque1Plate = '';
        this.photoData.cargoRemolque1 = '';
        // Modo continuar remolque 2: estado para que la próxima captura de peso sea remolque 2
        this.doubleTrailerState.currentStep = 'remolque2';
        this.doubleTrailerState.trailerPlaca = op.trailerPlaca;
        this.doubleTrailerState.remolque1.placa = op.remolque1.placa;
        this.doubleTrailerState.remolque1.pesoSalida =
          op.remolque1.pesoTaraSalida;
        this.doubleTrailerState.remolque1.pesoSalidaCapturado = true;
        this.doubleTrailerState.remolque2.placa = op.placaRemolque2 ?? '';
        // Sincronizar exitWeight y netWeight con los datos cargados (solo R1 por ahora)
        this.calculateNetWeight();
        this.isLoading = false;
        this.cdr.markForCheck();
        this.notificationService.showInfo(
          'Continuando salida',
          `Remolque 1 ya registrado (${op.remolque1.placa}). Capture peso y fotos del remolque 2.`,
        );
      },
      error: (err) => {
        this.isLoading = false;
        this.isSearching = false;
        console.error('Error al cargar operación con salida parcial:', err);
        this.notificationService.showError(
          'Error',
          'No se pudo cargar la operación. Verifique el folio.',
        );
        this.router.navigate(['/dashboard']);
      },
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.pesoRealtimeSubscription) {
      this.pesoRealtimeSubscription.unsubscribe();
    }

    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }

    if (this.entrySearchSubscription) {
      this.entrySearchSubscription.unsubscribe();
    }
  }

  private getDoubleTrailerExitWeight(): number {
    const pesoTaraRemolque1 =
      Number(this.exitForm.get('pesoTaraRemolque1')?.value) || 0;
    const pesoTaraRemolque2 =
      Number(this.exitForm.get('pesoTaraRemolque2')?.value) || 0;

    return pesoTaraRemolque1 + pesoTaraRemolque2;
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
      }),
    );

    this.subscriptions.add(
      this.exitForm.get('pesoTaraRemolque2')?.valueChanges.subscribe(() => {
        this.calculateNetWeight();
      }),
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

    return maxWeight - minWeight <= 5;
  }

  /**
   * Reconecta el servicio SignalR
   */
  async onReconnectWeightService(): Promise<void> {
    try {
      await this.pesoRealtimeService.reconnect();
      this.showToast(
        'success',
        'Reconexión exitosa',
        'Servicio de peso reconectado correctamente',
      );
    } catch (error: any) {
      console.error('❌ Error reconectando servicio de peso:', error);
      this.showToast(
        'error',
        'Error de reconexión',
        'No se pudo reconectar el servicio de peso',
      );
    }
  }

  /**
   * Obtiene el estado actual de la conexión SignalR
   */
  get isWeightServiceConnected(): boolean {
    return this.pesoRealtimeService.isConnected();
  }

  /**
   * Obtiene el peso actual directamente del servicio
   */
  get currentRealtimePeso(): PesoData | null {
    return this.pesoRealtimeService.getCurrentPeso();
  }

  /**
   * Valida que una placa coincida con la esperada
   */
  private validatePlate(fieldName: string, expectedPlate?: string): void {
    // Usar el valor del formulario (respeta edición manual)
    const currentPlate = this.exitForm.get(fieldName)?.value || '';

    if (!expectedPlate || !currentPlate) {
      this.plateValidations[fieldName] = {
        isValid: true,
        errorMessage: '',
      };
      return;
    }

    const matches = currentPlate.toLowerCase() === expectedPlate.toLowerCase();
    this.plateValidations[fieldName] = {
      isValid: matches,
      errorMessage: matches
        ? ''
        : `Placa ingresada no coincide con la esperada: ${expectedPlate}`,
    };

    if (!matches) {
      this.showToast(
        'warn',
        'Placa no coincide',
        `La placa ingresada (${currentPlate}) no coincide con la esperada (${expectedPlate})`,
      );
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
      errorMessage: '',
    };

    this.showToast(
      'info',
      'Edición manual habilitada',
      `Puede editar manualmente la placa. La validación automática ha sido deshabilitada.`,
    );
  }

  /**
   * Maneja el cambio del checkbox de orden invertido
   * Intercambia las fotos y textos de placas entre trailer y remolque
   */
  onInvertedPlateOrderChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.invertedPlateOrder = checked;

    if (checked) {
      this.swapPlatePhotos();
    } else {
      // Revertir intercambio (aplicar swap de nuevo)
      this.swapPlatePhotos();
    }
  }

  /**
   * Intercambia las fotos y textos de placas entre trailer y remolque
   * Respeta el flujo: simple (trailer ↔ remolque) o doble (trailer ↔ remolque1)
   */
  private swapPlatePhotos(): void {
    const isDoubleTrailer = this.entryData?.tipoUnidad === 'doble-remolque';

    if (isDoubleTrailer) {
      // Intercambiar trailer ↔ remolque1 (NO tocar remolque2)
      this.swapPhotoData('trailerPlate', 'remolque1Plate');
      this.swapFormValues('trailerPlate', 'remolque1Plate');
      this.swapDetectedPlates('trailerPlate', 'remolque1Plate');

      // Intercambiar en doubleTrailerState
      const tempPlaca = this.doubleTrailerState.trailerPlaca;
      this.doubleTrailerState.trailerPlaca =
        this.doubleTrailerState.remolque1.placa || '';
      this.doubleTrailerState.remolque1.placa = tempPlaca;

      // Re-validar después del intercambio con los nuevos valores
      this.validatePlate('trailerPlate', this.getExpectedPlate('trailerPlate'));
      this.validatePlate(
        'remolque1Plate',
        this.getExpectedPlate('remolque1Plate'),
      );

      this.showToast(
        'success',
        'Orden invertido',
        'Las fotos del tráiler y remolque 1 han sido intercambiadas',
      );
    } else {
      // Intercambiar trailer ↔ trailerPlate2 (remolque simple)
      this.swapPhotoData('trailerPlate', 'trailerPlate2');
      this.swapFormValues('trailerPlate', 'trailerPlate2');
      this.swapDetectedPlates('trailerPlate', 'trailerPlate2');

      // Re-validar después del intercambio con los nuevos valores
      this.validatePlate('trailerPlate', this.getExpectedPlate('trailerPlate'));
      this.validatePlate(
        'trailerPlate2',
        this.getExpectedPlate('trailerPlate2'),
      );

      this.showToast(
        'success',
        'Orden invertido',
        'Las fotos del tráiler y remolque han sido intercambiadas',
      );
    }
  }

  /**
   * Intercambia las URLs de las fotos entre dos campos
   */
  private swapPhotoData(field1: string, field2: string): void {
    const temp = (this.photoData as any)[field1];
    (this.photoData as any)[field1] = (this.photoData as any)[field2];
    (this.photoData as any)[field2] = temp;
  }

  /**
   * Intercambia los valores de texto de las placas en el formulario
   */
  private swapFormValues(field1: string, field2: string): void {
    const value1 = this.exitForm.get(field1)?.value;
    const value2 = this.exitForm.get(field2)?.value;

    this.exitForm.patchValue({
      [field1]: value2,
      [field2]: value1,
    });
  }

  /**
   * Intercambia las placas detectadas por OCR
   */
  private swapDetectedPlates(field1: string, field2: string): void {
    const temp = this.detectedPlates[field1];
    this.detectedPlates[field1] = this.detectedPlates[field2];
    this.detectedPlates[field2] = temp;
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

      this.showToast(
        'success',
        'Peso capturado',
        `Peso tara del Remolque 1 capturado: ${this.weightData.currentWeight} kg`,
      );
      this.calculateNetWeight();
    }
  }

  /**
   * Captura peso para remolque 2
   */
  onCaptureWeightRemolque2(): void {
    if (this.canCaptureWeightRemolque2()) {
      this.currentWeightCaptureType = 'Remolque 2';
      this.weightData.capturedWeight = this.weightData.currentWeight;
      this.weightData.capturedAt = new Date();

      this.exitForm
        .get('pesoTaraRemolque2')
        ?.setValue(this.weightData.currentWeight);
      this.doubleTrailerState.remolque2.pesoTara =
        this.weightData.currentWeight;

      this.showToast(
        'success',
        'Peso capturado',
        `Peso tara del Remolque 2 capturado: ${this.weightData.currentWeight} kg`,
      );
      this.calculateNetWeight();
    }
  }

  /**
   * Verifica si se puede capturar peso para remolque 2
   */
  canCaptureWeightRemolque2(): boolean {
    return this.weightData.isConnected && this.weightData.isStable;
  }

  /**
   * Verifica si se puede capturar peso
   */
  canCaptureWeight(): boolean {
    return this.weightData.isConnected && this.weightData.isStable;
  }

  /**
   * Calcula el peso neto basándose en el tipo de unidad y la lógica de negocio
   */
  private calculateNetWeight(): void {
    if (!this.entryData) return;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      // Para doble remolque: peso bruto - suma de pesos tara de ambos remolques
      const pesoTaraRemolque1 =
        Number(this.exitForm.get('pesoTaraRemolque1')?.value) || 0;
      const pesoTaraRemolque2 =
        Number(this.exitForm.get('pesoTaraRemolque2')?.value) || 0;
      const sumaTara = pesoTaraRemolque1 + pesoTaraRemolque2;
      this.doubleTrailerState.pesoBrutoTotal = sumaTara;

      // Sincronizar exitWeight con la suma de tara (requerido para form.valid y payload)
      this.exitForm.get('exitWeight')?.setValue(sumaTara);

      let pesoNeto: number;

      if (this.unitType === 'provider') {
        // Proveedor (Entrada con Carga, Salida Vacío)
        // Peso neto: Peso bruto - Peso tara = Material descargado
        pesoNeto = this.entryData.entryWeight - sumaTara;
      } else {
        // Cliente (Entrada Vacío, Salida con Carga)
        // Peso neto: Peso tara - Peso bruto = Material cargado
        pesoNeto = sumaTara - this.entryData.entryWeight;
      }

      this.doubleTrailerState.pesoNetoCalculado = pesoNeto;
      // Guardar en el form el valor absoluto para que Validators.min(0) no invalide el control
      this.exitForm.get('netWeight')?.setValue(Math.abs(pesoNeto));
    } else {
      // Para otros tipos: aplicar lógica según tipo de unidad
      const exitWeight = this.exitForm.get('exitWeight')?.value || 0;

      let pesoNeto: number;

      if (this.unitType === 'provider') {
        // Proveedor (Entrada con Carga, Salida Vacío)
        // Peso neto: Peso bruto - Peso tara = Material descargado
        pesoNeto = this.entryData.entryWeight - exitWeight;
      } else {
        // Cliente (Entrada Vacío, Salida con Carga)
        // Peso neto: Peso tara - Peso bruto = Material cargado
        pesoNeto = exitWeight - this.entryData.entryWeight;
      }

      // Valor absoluto para que Validators.min(0) no invalide el control
      this.exitForm.get('netWeight')?.setValue(Math.abs(pesoNeto));
    }
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
      },
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
    detail: string,
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
        toast.style.animation =
          'toast-out 0.18s cubic-bezier(0.22, 0.61, 0.36, 1) both';
        setTimeout(() => {
          toast.remove();
        }, 180);
      }
    }, 5000);
  }

  // ============= MÉTODOS AUXILIARES =============

  /**
   * Busca una entrada por placa del tráiler usando endpoints reales
   */
  onSearchEntry(): void {
    const plate = this.exitForm.get('trailerPlate')?.value;

    // Para contenedor, permitir búsqueda sin placa
    if (this.unitType === 'contenedor' && !plate) {
      this.showToast(
        'info',
        'Búsqueda de contenedor',
        'Para contenedor, la búsqueda se realizará por otros criterios',
      );
      // TODO: Implementar búsqueda alternativa para contenedor
      return;
    }

    // Para otros tipos, validar que se ingrese placa
    if (!plate) {
      this.showToast(
        'error',
        'Placa requerida',
        'Debe ingresar una placa para buscar',
      );
      return;
    }

    this.isSearching = true;

    // Paso 1: Validar si se puede registrar salida para esta placa
    this.weighingService.validateExit(plate).subscribe({
      next: (validation) => {
        if (validation.canExit && validation.entryOperation) {
          // Si es salida parcial (pendiente remolque 2), cargar por folio para continuar
          if (
            validation.entryOperation.status === 'SALIDA_PARCIAL_R1' &&
            validation.entryOperation.folio
          ) {
            this.loadPartialExitOperationForContinue(
              validation.entryOperation.folio,
            );
            return;
          }
          // Si no, obtener datos completos de la operación por placa
          this.loadOperationData(plate);
        } else {
          this.isSearching = false;
          this.showToast(
            'error',
            'Validación fallida',
            validation.message ||
              'No se puede registrar salida para esta placa',
          );
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error validating exit:', error);
        this.showToast(
          'error',
          'Error de validación',
          extractErrorMessage(error),
        );
      },
    });
  }

  /**
   * Carga los datos completos de la operación por placa
   */
  private loadOperationData(plate: string): void {
    this.weighingService.getOperationByPlate(plate).subscribe({
      next: (operation) => {
        this.isSearching = false;

        // Guardar el folio para usar en la salida
        this.entryFolio = operation.folio;

        // Convertir datos de la operación al formato esperado por el componente
        this.entryData = this.mapOperationToEntryData(operation);
        this.isEntryFound = true;

        // Poblar formulario con los datos encontrados
        this.populateFormWithEntryData();

        this.showToast(
          'success',
          'Entrada encontrada',
          `Entrada encontrada exitosamente. Folio: ${operation.folio}`,
        );
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error loading operation data:', error);
        this.showToast(
          'error',
          'Error de búsqueda',
          extractErrorMessage(error),
        );
      },
    });
  }

  /**
   * Mapea los datos de WeighingOperationDto al formato EntrySearchData esperado
   */
  private mapOperationToEntryData(operation: any): EntrySearchData {
    return {
      id: operation.folio, // Usar el folio en lugar del id para mostrarlo en la UI
      createdAt: new Date(operation.createdAt),
      tipoUnidad: this.mapTipoUnidad(
        operation.tipoUnidad,
        operation.placaRemolque1,
        operation.placaRemolque2,
      ),
      clientProviderName: operation.clientProviderName,
      product: operation.product,
      entryWeight: operation.entryWeight || 0,
      status: operation.status,
      placaTrailer: operation.trailerPlate,
      placaRemolque: operation.trailerPlate2,
      placaRemolque1: operation.placaRemolque1,
      placaRemolque2: operation.placaRemolque2,
      placaTrailerContenedor: operation.trailerPlateContenedor,
      placaRemolqueContenedor: operation.remolquePlateContenedor,
      createdBy: operation.createdBy,
      fotos: {
        fotoEntradaTrailer: '',
        fotoEntradaRemolque: '',
        fotoEntradaRemolque1: '',
        fotoEntradaRemolque2: '',
        fotoCargaEntrada: '',
      },
    };
  }

  /**
   * Mapea el tipo de unidad basándose en los datos de la operación
   */
  private mapTipoUnidad(
    tipoUnidad?: string,
    placaRemolque1?: string,
    placaRemolque2?: string,
  ): 'remolque' | 'contenedor' | 'doble-remolque' {
    // Si viene el campo tipoUnidad del backend, usarlo directamente
    if (tipoUnidad) {
      if (tipoUnidad === 'doble-remolque') {
        return 'doble-remolque';
      }
      if (tipoUnidad === 'contenedor') {
        return 'contenedor';
      }
      if (tipoUnidad === 'remolque') {
        return 'remolque';
      }
    }

    // Si hay placas de remolques, es doble remolque
    if (placaRemolque1 && placaRemolque2) {
      return 'doble-remolque';
    }

    // Determinar basándose en el tipo de unidad de la ruta
    if (this.unitType === 'contenedor') {
      return 'contenedor';
    }

    return 'remolque';
  }

  /**
   * Pobla el formulario con los datos de la entrada encontrada
   */
  private populateFormWithEntryData(): void {
    if (!this.entryData) return;

    // Prellenar campos según el tipo de unidad
    if (this.entryData.tipoUnidad === 'doble-remolque') {
      this.exitForm.patchValue({
        trailerPlate: this.entryData.placaTrailer || '',
        remolque1Plate: this.entryData.placaRemolque1 || '',
        remolque2Plate: this.entryData.placaRemolque2 || '',
      });

      // Actualizar estado de doble remolque
      this.doubleTrailerState.currentStep = 'remolque1'; // Iniciar en remolque1 para captura de peso
      this.doubleTrailerState.trailerPlaca = this.entryData.placaTrailer || '';
      this.doubleTrailerState.remolque1.placa =
        this.entryData.placaRemolque1 || '';
      this.doubleTrailerState.remolque2.placa =
        this.entryData.placaRemolque2 || '';
      this.doubleTrailerState.pesoBrutoTotal =
        this.getDoubleTrailerExitWeight();

      console.log(
        '🔄 [EXIT] Estado de doble remolque inicializado - currentStep:',
        this.doubleTrailerState.currentStep,
      );

      // Actualizar validaciones de placas
      this.updatePlateValidationsAfterLoad();
    } else {
      // Para otros tipos de unidad
      this.exitForm.patchValue({
        trailerPlate: this.entryData.placaTrailer || '',
        trailerPlate2: this.entryData.placaRemolque || '',
      });

      // Actualizar validaciones de placas
      this.updatePlateValidationsAfterLoad();
    }
  }

  /**
   * Actualiza las validaciones de placas basándose en los datos de entrada
   */
  private updatePlateValidationsAfterLoad(): void {
    if (!this.entryData) return;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      // Validar placa del tráiler
      this.validatePlateAfterLoad('trailerPlate', this.entryData.placaTrailer);
      this.validatePlateAfterLoad(
        'remolque1Plate',
        this.entryData.placaRemolque1,
      );
      this.validatePlateAfterLoad(
        'remolque2Plate',
        this.entryData.placaRemolque2,
      );
    } else if (this.entryData.tipoUnidad === 'contenedor') {
      // Para contenedor: no validar placas, solo marcar como válidas
      this.plateValidations['trailerPlate'] = {
        isValid: true,
        errorMessage: '',
      };
      this.plateValidations['trailerPlate2'] = {
        isValid: true,
        errorMessage: '',
      };
    } else {
      // Validar placas para otros tipos (remolque único)
      this.validatePlateAfterLoad('trailerPlate', this.entryData.placaTrailer);
      this.validatePlateAfterLoad(
        'trailerPlate2',
        this.entryData.placaRemolque,
      );
    }
  }

  /**
   * Valida una placa específica contra el valor de entrada
   */
  private validatePlateAfterLoad(
    fieldName: string,
    expectedPlate?: string,
  ): void {
    if (!expectedPlate) {
      this.plateValidations[fieldName] = {
        isValid: true,
        errorMessage: '',
      };
      return;
    }

    const currentValue = this.exitForm.get(fieldName)?.value;
    const isValid = currentValue === expectedPlate;

    this.plateValidations[fieldName] = {
      isValid,
      errorMessage: isValid
        ? ''
        : `La placa debe coincidir con ${expectedPlate}`,
    };
  }

  /**
   * Filtrar caracteres no permitidos en tiempo real para el campo de búsqueda
   * Solo permite letras, números y guion medio (-)
   * Limita a 50 caracteres
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números y guion medio
    const filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
    // Limitar a 50 caracteres
    const truncatedValue = filteredValue.substring(0, 50);

    if (value !== truncatedValue) {
      // Si hubo cambios, actualizar el valor del input y del formulario
      input.value = truncatedValue;
      this.exitForm.patchValue(
        { trailerPlate: truncatedValue },
        { emitEvent: false },
      );
    }
  }

  /**
   * Filtrar caracteres no permitidos en tiempo real para inputs de registro de placas
   * Solo permite letras, números y guion medio (-)
   * Limita a 20 caracteres
   */
  onPlateRegistrationInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Solo permitir letras, números y guion medio
    value = value.replace(/[^a-zA-Z0-9-]/g, '');

    // Limitar a 20 caracteres
    if (value.length > 20) {
      value = value.substring(0, 20);
    }

    // Actualizar el valor del input
    input.value = value;
  }

  /**
   * Obtiene el error de un campo del formulario
   */
  getFieldError(fieldName: string): string {
    const field = this.exitForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      if (field.errors?.['required']) return 'Este campo es obligatorio';
      if (field.errors?.['pattern']) return 'Formato inválido';
    }
    return '';
  }

  /**
   * Obtiene el nombre para mostrar del tipo de unidad
   */
  getUnitTypeDisplayName(unitType?: string): string {
    if (unitType) {
      const unitTypeMap: Record<string, string> = {
        provider: 'Proveedor',
        client: 'Cliente',
        internal: 'Interno',
      };
      return unitTypeMap[unitType] || unitType;
    }
    return this.unitTypeTitle;
  }

  /**
   * Captura foto con OCR para una placa específica
   */
  async onPhotoCaptureWithOCR(fieldName: string): Promise<void> {
    console.log('🎯 Capturando foto con ANPR para campo:', fieldName);

    // Mapear fieldName a cameraType
    const cameraTypeMap: Record<string, 'trailer' | 'remolque' | 'cargo'> = {
      trailerPlate: 'trailer',
      trailerPlate2: 'remolque',
      remolque1Plate: 'remolque',
      remolque2Plate: 'remolque',
      containerPlate: 'trailer',
    };

    const cameraType = cameraTypeMap[fieldName];
    if (!cameraType) {
      console.error('Tipo de cámara no encontrado para:', fieldName);
      return;
    }

    const plateTypeLabel =
      fieldName === 'trailerPlate'
        ? 'tráiler'
        : fieldName === 'trailerPlate2'
          ? 'remolque'
          : fieldName === 'remolque1Plate'
            ? 'remolque 1'
            : fieldName === 'remolque2Plate'
              ? 'remolque 2'
              : 'vehículo';

    // Declarar variables fuera del try para acceso en catch
    let orphanPhoto: any = null;

    try {
      // Paso 1: Intentar obtener foto huérfana de BD primero
      const isDoubleTrailer = this.entryData?.tipoUnidad === 'doble-remolque';
      // Buscar en BD para:
      // - Flujo de remolque único o contenedor: SIEMPRE buscar (trailerPlate, trailerPlate2, containerPlate)
      // - Flujo doble remolque: SOLO para trailerPlate, remolque1Plate y remolque2Plate
      const shouldSearchDB =
        !isDoubleTrailer ||
        (isDoubleTrailer &&
          (fieldName === 'trailerPlate' ||
            fieldName === 'remolque1Plate' ||
            fieldName === 'remolque2Plate'));

      if (shouldSearchDB) {
        console.log(
          `🔍 [WEIGHING-EXIT-FORM] Buscando foto en BD para photoType: ${fieldName}`,
        );

        // Mapear fieldName a photoType para BD (igual que entrada: varios orígenes)
        const photoTypeMap: Record<string, string> = {
          trailerPlate: 'trailerPlate',
          trailerPlate2: 'remolque1Plate', // Flujo remolque único - buscar en remolque1Plate
          containerPlate: 'trailerPlate', // Flujo solo contenedor - buscar en trailerPlate
          remolque1Plate: 'remolque1Plate', // Flujo doble remolque
          remolque2Plate: 'remolque2Plate', // Primero buscar por remolque2Plate
        };

        let searchPhotoType = photoTypeMap[fieldName];
        let excludePhotoId: string | undefined = undefined;

        if (fieldName === 'remolque2Plate' && this.remolque1PhotoId) {
          excludePhotoId = this.remolque1PhotoId; // Excluir la foto ya usada para remolque1
          console.log(
            `🔄 [WEIGHING-EXIT-FORM] Buscando remolque2, excluyendo foto de remolque1: ${excludePhotoId}`,
          );
        }

        orphanPhoto = await this.anprService
          .getLatestOrphanPhoto(searchPhotoType, excludePhotoId)
          .toPromise();

        // Fallback para remolque2Plate: también buscar en remolque1Plate (igual que en entrada)
        if (!orphanPhoto && fieldName === 'remolque2Plate') {
          console.log(
            `🔄 [WEIGHING-EXIT-FORM] No encontrado en remolque2Plate, buscando en remolque1Plate (fallback)...`,
          );
          orphanPhoto = await this.anprService
            .getLatestOrphanPhoto('remolque1Plate', excludePhotoId ?? undefined)
            .toPromise();
          if (orphanPhoto) {
            console.log(
              `✅ [WEIGHING-EXIT-FORM] Foto remolque 2 encontrada en remolque1Plate (fallback): ${orphanPhoto.photoUrl}`,
            );
          }
        }

        if (orphanPhoto) {
          console.log(
            `✅ [WEIGHING-EXIT-FORM] Foto huérfana encontrada en BD:`,
            orphanPhoto,
          );

          // Guardar la imagen URL
          this.photoData[fieldName as keyof ExitPhotoData] =
            orphanPhoto.photoUrl;

          // Guardar photoId si es remolque1
          if (fieldName === 'remolque1Plate') {
            this.remolque1PhotoId = orphanPhoto.photoId;
            console.log(
              `💾 [WEIGHING-EXIT-FORM] PhotoId de remolque1 guardado: ${this.remolque1PhotoId}`,
            );
          }

          // Actualizar placa en formulario y validar
          if (orphanPhoto.licensePlate) {
            this.exitForm.patchValue({ [fieldName]: orphanPhoto.licensePlate });
            console.log(
              `🔤 [WEIGHING-EXIT-FORM] Placa de ${plateTypeLabel} actualizada: ${orphanPhoto.licensePlate}`,
            );
            console.log(
              `🔍 [DEBUG] entryData existe:`,
              !!this.entryData,
              `fieldName:`,
              fieldName,
            );

            // Validar placa contra la entrada (si existe)
            if (this.entryData) {
              const expectedPlate = this.getExpectedPlate(fieldName);
              console.log(
                `🔍 [DEBUG] expectedPlate para ${fieldName}:`,
                expectedPlate,
              );
              const isMatch = orphanPhoto.licensePlate === expectedPlate;
              console.log(
                `🔍 [DEBUG] isMatch:`,
                isMatch,
                `(${orphanPhoto.licensePlate} === ${expectedPlate})`,
              );

              if (!isMatch && expectedPlate) {
                // Placa no coincide - marcar error
                this.plateValidations[fieldName] = {
                  isValid: false,
                  errorMessage: `Placa detectada (${orphanPhoto.licensePlate}) no coincide con la entrada (${expectedPlate})`,
                };
                console.log(
                  `⚠️ [WEIGHING-EXIT-FORM] Placa de BD no coincide: ${orphanPhoto.licensePlate} vs ${expectedPlate}`,
                );
                this.showToast(
                  'warn',
                  'Placa no coincide',
                  `La placa de BD "${orphanPhoto.licensePlate}" no coincide con la entrada "${expectedPlate}". Puede editar manualmente si es correcto.`,
                );
              } else {
                // Placa coincide - marcar válida
                this.plateValidations[fieldName] = {
                  isValid: true,
                  errorMessage: '',
                };
                console.log(
                  `✅ [WEIGHING-EXIT-FORM] Placa de BD validada correctamente: ${orphanPhoto.licensePlate}`,
                );
                this.showToast(
                  'success',
                  'Foto obtenida',
                  `Foto de ${plateTypeLabel} obtenida de base de datos`,
                );
              }
            } else {
              // No hay entrada, solo mostrar éxito
              this.showToast(
                'success',
                'Foto obtenida',
                `Foto de ${plateTypeLabel} obtenida de base de datos`,
              );
            }
          } else {
            // No hay placa en la foto
            this.showToast(
              'success',
              'Foto obtenida',
              `Foto de ${plateTypeLabel} obtenida de base de datos`,
            );
          }

          // EARLY RETURN: Si encontró foto en BD, no esperar SignalR
          console.log(
            `🚀 [WEIGHING-EXIT-FORM] Foto encontrada en BD, retornando inmediatamente sin esperar SignalR`,
          );
          return;
        } else {
          console.log(
            `ℹ️ [WEIGHING-EXIT-FORM] No se encontró foto huérfana en BD para ${searchPhotoType}`,
          );
        }
      }

      // Paso 2: Si NO se encontró foto en BD, capturar fallback INMEDIATO + escuchar SignalR en background
      console.log(
        `🚀 [WEIGHING-EXIT-FORM] No hay foto en BD, capturando fallback inmediato...`,
      );

      // 2.1: Capturar fallback INMEDIATAMENTE (no esperar 30s)
      let fallbackCaptured = false;
      try {
        this.showToast(
          'info',
          'Capturando foto',
          `Capturando foto desde cámara...`,
        );

        let fallbackPhotoUrl = '';

        // Determinar cuál cámara usar según el tipo de foto
        if (fieldName === 'trailerPlate' || fieldName === 'containerPlate') {
          const photoType =
            fieldName === 'containerPlate' ? 'trailerPlate' : fieldName;
          fallbackPhotoUrl =
            await this.trailerCameraService.captureAndSaveTrailerPhotoAsync(
              photoType,
            );
          this.photoData[fieldName as keyof ExitPhotoData] = fallbackPhotoUrl;
          this.exitForm.patchValue({ [fieldName]: 'unknown' });
          this.detectedPlates[fieldName] = 'unknown';
        } else if (
          fieldName === 'trailerPlate2' ||
          fieldName === 'remolque1Plate' ||
          fieldName === 'remolque2Plate'
        ) {
          const photoType =
            fieldName === 'trailerPlate2'
              ? 'trailerPlate2'
              : fieldName === 'remolque1Plate'
                ? 'remolque1Plate'
                : 'remolque2Plate';
          fallbackPhotoUrl =
            await this.trailerCameraService.captureAndSaveRemolquePhotoAsync(
              photoType,
            );
          this.photoData[fieldName as keyof ExitPhotoData] = fallbackPhotoUrl;
          this.exitForm.patchValue({ [fieldName]: 'unknown' });
          this.detectedPlates[fieldName] = 'unknown';
        }

        fallbackCaptured = true;
        console.log(
          `✅ [FALLBACK-EXIT] Foto capturada inmediatamente: ${fallbackPhotoUrl}`,
        );
        this.showToast(
          'success',
          'Foto capturada',
          `Foto capturada. Esperando ANPR en segundo plano...`,
        );

        // Validar placa "unknown" contra la entrada (si existe)
        if (this.entryData) {
          const expectedPlate = this.getExpectedPlate(fieldName);
          if (expectedPlate && expectedPlate !== 'unknown') {
            this.plateValidations[fieldName] = {
              isValid: false,
              errorMessage: `Placa establecida como "unknown" (ANPR no disponible). Placa de entrada: ${expectedPlate}`,
            };
            this.showToast(
              'warn',
              'Verificación manual requerida',
              `Foto capturada con placa "unknown". Verifique contra entrada "${expectedPlate}".`,
            );
          }
        }
      } catch (fallbackError) {
        console.error(
          '❌ [FALLBACK-EXIT] Error capturando fallback inmediato:',
          fallbackError,
        );
        this.showToast(
          'warn',
          'Advertencia',
          'No se pudo capturar foto de cámara. Esperando ANPR...',
        );
      }

      // 2.2: Escuchar SignalR en BACKGROUND (no bloquea, usuario puede continuar)
      console.log(
        `🔄 [BACKGROUND-EXIT] Iniciando escucha de SignalR en segundo plano (30s)...`,
      );

      // Iniciar captura ANPR en background (sin await - no bloquea)
      this.anprService
        .capturePlate(cameraType, 30000)
        .then((anprEvent: AnprEvent) => {
          // Si llega ANPR, REEMPLAZAR el fallback
          console.log(
            `✅ [BACKGROUND-EXIT] ANPR recibido después del fallback: ${anprEvent.licensePlate}`,
          );

          // Guardar la imagen URL (REEMPLAZA fallback)
          this.photoData[fieldName as keyof ExitPhotoData] = anprEvent.imageUrl;
          this.detectedPlates[fieldName] = anprEvent.licensePlate;
          this.exitForm.get(fieldName)?.setValue(anprEvent.licensePlate);

          // Guardar photoId si es remolque1
          if (isDoubleTrailer && fieldName === 'remolque1Plate') {
            setTimeout(async () => {
              const searchPhotoType = 'remolque1Plate';
              const recentPhoto = await this.anprService
                .getLatestOrphanPhoto(searchPhotoType)
                .toPromise();
              if (recentPhoto) {
                this.remolque1PhotoId = recentPhoto.photoId;
                console.log(
                  `💾 [BACKGROUND-EXIT] PhotoId de remolque1 guardado: ${this.remolque1PhotoId}`,
                );
              }
            }, 500);
          }

          // Validar placa contra la entrada (si existe)
          if (this.entryData) {
            const expectedPlate = this.getExpectedPlate(fieldName);
            const isMatch = anprEvent.licensePlate === expectedPlate;

            if (!isMatch && expectedPlate) {
              this.plateValidations[fieldName] = {
                isValid: false,
                errorMessage: `Placa detectada (${anprEvent.licensePlate}) no coincide con la entrada (${expectedPlate})`,
              };
              this.showToast(
                'warn',
                'Placa actualizada',
                `Placa "${anprEvent.licensePlate}" detectada por ANPR, pero no coincide con entrada "${expectedPlate}".`,
              );
            } else {
              this.plateValidations[fieldName] = {
                isValid: true,
                errorMessage: '',
              };
              this.showToast(
                'success',
                'Foto actualizada',
                `Placa ${anprEvent.licensePlate} detectada por ANPR con ${anprEvent.confidenceLevel}% de confianza`,
              );
            }
          } else {
            this.showToast(
              'success',
              'Foto actualizada',
              `Placa ${anprEvent.licensePlate} detectada por ANPR con ${anprEvent.confidenceLevel}% de confianza`,
            );
          }
        })
        .catch((error: any) => {
          // Si SignalR falla (timeout u otro error), ya tenemos el fallback
          console.log(
            `ℹ️ [BACKGROUND-EXIT] SignalR timeout/error, manteniendo foto fallback`,
          );
          // NO mostrar error porque ya tenemos fallback capturado
        });

      // RETORNAR INMEDIATAMENTE - Usuario puede continuar con el fallback
      console.log(
        `🚀 [WEIGHING-EXIT-FORM] Retornando inmediatamente con fallback, SignalR en background`,
      );
      return;
    } catch (error: any) {
      // Si falla la captura del fallback, mostrar error y continuar
      console.error('❌ Error en flujo de captura:', error);
      this.showToast(
        'error',
        'Error de captura',
        'No se pudo capturar foto desde la cámara',
      );
    }
  }

  /**
   * Obtiene la URL completa de una imagen
   */
  getFullImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (
      relativeUrl.startsWith('http://') ||
      relativeUrl.startsWith('https://')
    ) {
      return relativeUrl;
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${relativeUrl}`;
  }

  /**
   * Captura foto para campos que no requieren OCR
   */
  async onPhotoCapture(fieldName: string): Promise<void> {
    try {
      this.showToast(
        'info',
        'Capturando foto',
        `Capturando foto de ${fieldName} desde la cámara...`,
      );

      // Capturar foto real desde la cámara de carga
      const photoUrl =
        await this.cargoCameraService.captureAndSaveCargoPhotoAsync(fieldName);
      this.photoData[fieldName as keyof ExitPhotoData] = photoUrl;

      // Actualizar estado de doble remolque si es necesario
      if (fieldName === 'cargoRemolque1') {
        this.doubleTrailerState.remolque1.fotoCargaCapturada = true;
      } else if (fieldName === 'cargoRemolque2') {
        this.doubleTrailerState.remolque2.fotoCargaCapturada = true;
      }

      this.showToast(
        'success',
        'Foto capturada',
        `Foto de ${fieldName} capturada exitosamente`,
      );
    } catch (error) {
      console.error(`Error capturando foto de ${fieldName}:`, error);
      this.showToast(
        'error',
        'Error de captura',
        `Error al capturar foto de ${fieldName} desde la cámara`,
      );
    }
  }

  /**
   * Verifica si debe mostrar campos de trailer
   */
  shouldShowTrailerFields(): boolean {
    return !this.exitForm.get('containerOnly')?.value;
  }

  /**
   * Captura peso para flujos normales
   */
  onCaptureWeight(): void {
    if (this.canCaptureWeight()) {
      this.currentWeightCaptureType = 'Salida';
      this.weightData.capturedWeight = this.weightData.currentWeight;
      this.weightData.capturedAt = new Date();

      this.exitForm.get('exitWeight')?.setValue(this.weightData.currentWeight);
      this.calculateNetWeight();

      this.showToast(
        'success',
        'Peso capturado',
        `Peso de salida capturado: ${this.weightData.currentWeight} kg`,
      );
    }
  }

  /**
   * Solicita el peso actual desde el SerialGateway
   */
  requestCurrentWeight(): void {
    this.loadingWeight = true;

    this.pesoRealtimeService.getCurrentWeightFromGateway().subscribe({
      next: (pesoData) => {
        // Actualizar el peso actual con el valor obtenido
        this.weightData.currentWeight = pesoData.peso;
        this.weightData.isStable = true; // Asumimos que el peso solicitado es estable

        // Agregar al historial
        if (this.weightData.weightHistory.length >= 10) {
          this.weightData.weightHistory.shift();
        }
        this.weightData.weightHistory.push(pesoData.peso);

        this.loadingWeight = false;
        this.cdr.markForCheck();

        // CAPTURAR AUTOMÁTICAMENTE el peso (igual que el botón Capturar Peso)
        this.weightData.capturedWeight = pesoData.peso;
        this.weightData.capturedAt = new Date();
        this.currentWeightCaptureType = 'Salida';

        console.log(
          'Peso capturado automáticamente:',
          this.weightData.capturedWeight,
        );

        // Si es doble remolque, procesar el peso según el paso actual
        const isDoubleTrailer = this.entryData?.tipoUnidad === 'doble-remolque';
        if (isDoubleTrailer) {
          this.processDoubleTrailerWeight();
        } else {
          // Flujo normal (remolque único o contenedor)
          this.exitForm.get('exitWeight')?.setValue(pesoData.peso);
          this.calculateNetWeight();

          this.showToast(
            'success',
            'Peso capturado',
            `Peso de salida capturado: ${pesoData.peso.toFixed(2)} kg`,
          );
        }
      },
      error: (error) => {
        console.error('Error al solicitar peso desde SerialGateway:', error);
        this.loadingWeight = false;

        let errorMessage = 'Error al obtener peso de la báscula';
        if (error.status === 0) {
          errorMessage =
            'No se pudo conectar con el SerialGateway. Verifique que esté en ejecución.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error al solicitar peso', errorMessage);
      },
    });
  }

  /**
   * Procesa el peso capturado para el flujo de doble remolque
   */
  private processDoubleTrailerWeight(): void {
    if (!this.weightData.capturedWeight) return;

    console.log(
      '🔍 [EXIT] processDoubleTrailerWeight - currentStep:',
      this.doubleTrailerState.currentStep,
    );
    console.log(
      '🔍 [EXIT] doubleTrailerState completo:',
      this.doubleTrailerState,
    );

    switch (this.doubleTrailerState.currentStep) {
      case 'remolque1':
        // Capturar peso del remolque 1 en salida
        this.doubleTrailerState.remolque1.pesoSalida =
          this.weightData.capturedWeight;
        this.doubleTrailerState.remolque1.pesoSalidaCapturado = true;

        // Actualizar el campo del formulario para que se muestre en el HTML
        this.exitForm
          .get('pesoTaraRemolque1')
          ?.setValue(this.weightData.capturedWeight);

        console.log(
          '✅ [EXIT] Peso de salida del remolque 1 capturado:',
          this.weightData.capturedWeight,
        );

        this.showToast(
          'success',
          'Peso capturado',
          `Peso de salida del remolque 1: ${this.weightData.capturedWeight} kg. Ahora suba el segundo remolque.`,
        );

        // Avanzar al siguiente paso
        this.doubleTrailerState.currentStep = 'remolque2';
        break;

      case 'remolque2':
        // Capturar peso del remolque 2 en salida
        console.log(
          '✅ [EXIT] Capturando peso de salida del remolque 2:',
          this.weightData.capturedWeight,
        );
        this.doubleTrailerState.remolque2.pesoSalida =
          this.weightData.capturedWeight;
        this.doubleTrailerState.remolque2.pesoSalidaCapturado = true;

        // Actualizar el campo del formulario para que se muestre en el HTML
        this.exitForm
          .get('pesoTaraRemolque2')
          ?.setValue(this.weightData.capturedWeight);

        // Calcular peso total de salida
        this.doubleTrailerState.pesoSalidaTotal =
          (this.doubleTrailerState.remolque1.pesoSalida || 0) +
          (this.doubleTrailerState.remolque2.pesoSalida || 0);

        console.log(
          '✅ [EXIT] Peso total de salida calculado:',
          this.doubleTrailerState.pesoSalidaTotal,
        );

        // Asignar el peso total al formulario
        this.exitForm
          .get('exitWeight')
          ?.setValue(this.doubleTrailerState.pesoSalidaTotal);
        this.calculateNetWeight();

        this.showToast(
          'success',
          'Peso capturado',
          `Peso total de salida: ${this.doubleTrailerState.pesoSalidaTotal} kg`,
        );

        this.doubleTrailerState.currentStep = 'complete';
        this.doubleTrailerState.isComplete = true;
        break;

      default:
        console.warn(
          '⚠️ [EXIT] Paso no reconocido:',
          this.doubleTrailerState.currentStep,
        );
    }
  }

  /**
   * Limpia el formulario completamente y resetea toda la vista al estado inicial
   */
  onClear(): void {
    // Resetear formulario
    this.exitForm.reset();

    // Resetear datos de fotos
    this.photoData = {
      trailerPlate: '',
      trailerPlate2: '',
      cargoState: '',
      containerPlate: '',
      remolque1Plate: '',
      remolque2Plate: '',
      cargoRemolque1: '',
      cargoRemolque2: '',
    };

    // Resetear placas detectadas
    this.detectedPlates = {
      trailerPlate: '',
      trailerPlate2: '',
      containerPlate: '',
      remolque1Plate: '',
      remolque2Plate: '',
    };

    // Resetear validaciones de placas
    this.plateValidations = {
      trailerPlate: { isValid: true, errorMessage: '' },
      trailerPlate2: { isValid: true, errorMessage: '' },
      containerPlate: { isValid: true, errorMessage: '' },
      remolque1Plate: { isValid: true, errorMessage: '' },
      remolque2Plate: { isValid: true, errorMessage: '' },
    };

    // Resetear edición manual
    this.manualEditEnabled = {
      trailerPlate: false,
      trailerPlate2: false,
      containerPlate: false,
      remolque1Plate: false,
      remolque2Plate: false,
    };

    // Resetear estado de doble remolque
    this.doubleTrailerState = {
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

    // Resetear datos de entrada
    this.entryData = null;
    this.isEntryFound = false;
    this.entryFolio = '';
    this.isExitRegistered = false;
    this.remolque1PhotoId = null;

    // Resetear búsqueda y carga
    this.isSearching = false;
    this.isLoading = false;
    this.loadingWeight = false;
    this.currentWeightCaptureType = null;

    // Resetear sugerencias de búsqueda
    this.entrySuggestions = [];
    this.showEntrySuggestions = false;

    // Forzar detección de cambios
    this.cdr.detectChanges();

    this.showToast(
      'info',
      'Formulario limpiado',
      'La vista ha sido restablecida completamente',
    );
  }

  /**
   * Guarda el registro de salida
   */
  onSave(): void {
    if (!this.isFormValid) {
      this.showToast(
        'error',
        'Formulario inválido',
        'Por favor complete todos los campos requeridos',
      );
      return;
    }

    if (!this.entryData || !this.entryFolio) {
      this.showToast(
        'error',
        'Datos incompletos',
        'No hay datos de entrada válidos para procesar la salida. Debe buscar una entrada primero.',
      );
      return;
    }

    this.isLoading = true;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      // Modo continuar: solo remolque 2 pendiente → enviar continue
      if (this.currentOperationFolio) {
        this.submitContinueDoubleTrailerExit();
      } else {
        this.saveDoubleTrailerExit();
      }
    } else {
      this.saveNormalExit();
    }
  }

  /**
   * Guarda una salida normal (remolque único o contenedor)
   */
  private saveNormalExit(): void {
    if (!this.entryData) return;

    const exitWeight = this.exitForm.get('exitWeight')?.value || 0;
    const netWeight = this.exitForm.get('netWeight')?.value || 0;

    const exitRequest = {
      folio: this.entryFolio, // Usar el folio de la entrada encontrada
      pesoBruto: exitWeight,
      pesoTara: exitWeight,
      pesoNeto: Math.abs(netWeight),
      placaTrailer: this.entryData.placaTrailer || '',
      placaRemolque: this.entryData.placaRemolque,
      placaContenedor:
        this.entryData.tipoUnidad === 'contenedor'
          ? this.entryData.placaTrailerContenedor
          : undefined,
      placaTrailerContenedor: this.entryData.placaTrailerContenedor,
      placaRemolqueContenedor: this.entryData.placaRemolqueContenedor,
      fotos: {
        trailerPlate: this.photoData.trailerPlate,
        trailerPlate2: this.photoData.trailerPlate2,
        cargoState: this.photoData.cargoState || '',
        containerPlate: this.photoData.containerPlate,
      },
      estado: 'SALIDA_REGISTRADA',
      fechaSalida: new Date().toISOString(),
      tipoUnidad: this.entryData.tipoUnidad,
    };

    this.weighingService.createExitOperation(exitRequest).subscribe({
      next: async (response) => {
        this.isLoading = false;
        this.isExitRegistered = true;
        console.log('✅ Exit saved successfully:', response);

        this.showToast(
          'success',
          'Salida registrada',
          `Salida registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
        );

        // Generar PDF con los datos de la operación
        await this.generatePDF(response);

        // Navegar después de 3 segundos
        setTimeout(() => {
          this.onClear();
          this.router.navigate(['/dashboard']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('🔥 Error saving exit:', {
          error,
          errorMessage: error.message,
          errorStatus: error.status,
          isApiError: (error as any).isApiError,
          originalResponse: (error as any).originalResponse,
        });

        const finalMessage = extractErrorMessage(error);
        console.log('📢 Showing error toast:', finalMessage);

        this.showToast('error', 'Error al registrar salida', finalMessage);
      },
    });
  }

  /**
   * Guarda una salida con doble remolque
   */
  private saveDoubleTrailerExit(): void {
    if (!this.entryData) return;

    if (this.currentOperationFolio) {
      this.submitContinueDoubleTrailerExit();
      return;
    }

    const exitWeightTotal = this.getDoubleTrailerExitWeight();
    this.doubleTrailerState.pesoBrutoTotal = exitWeightTotal;

    const exitRequest = {
      folio: this.entryFolio, // Usar el folio de la entrada encontrada
      placaTrailer: this.entryData.placaTrailer || '',
      remolque1: {
        placa: this.entryData.placaRemolque1 || '',
        pesoTara: this.exitForm.get('pesoTaraRemolque1')?.value || 0,
        fotoCargaCapturada: !!this.photoData.cargoRemolque1,
      },
      remolque2: {
        placa: this.entryData.placaRemolque2 || '',
        pesoTara: this.exitForm.get('pesoTaraRemolque2')?.value || 0,
        fotoCargaCapturada: !!this.photoData.cargoRemolque2,
      },
      pesoBrutoTotal: exitWeightTotal,
      pesoNetoCalculado: Math.abs(this.exitForm.get('netWeight')?.value || 0),
      fechaSalida: new Date().toISOString(),
      fotos: {
        trailerPlate: this.photoData.trailerPlate || '',
        remolque1Plate: this.photoData.remolque1Plate || '',
        remolque2Plate: this.photoData.remolque2Plate || '',
        cargoRemolque1: this.photoData.cargoRemolque1 || '',
        cargoRemolque2: this.photoData.cargoRemolque2 || '',
      },
    };

    this.weighingService.createDoubleTrailerExit(exitRequest).subscribe({
      next: async (response) => {
        this.isLoading = false;
        this.isExitRegistered = true;

        this.showToast(
          'success',
          'Salida registrada',
          `Salida con doble remolque registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
        );

        // Generar PDF con los datos de la operación
        await this.generatePDF(response);

        // Navegar después de 3 segundos
        setTimeout(() => {
          this.onClear();
          this.router.navigate(['/dashboard']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('🔥 Error saving double trailer exit:', error);

        const finalMessage = extractErrorMessage(error);
        this.showToast('error', 'Error al registrar salida', finalMessage);
      },
    });
  }

  /**
   * Continuar salida de doble remolque con remolque 2 (modo continue)
   */
  private submitContinueDoubleTrailerExit(): void {
    if (!this.entryData || !this.currentOperationFolio) return;

    const pesoTaraR2 =
      Number(this.exitForm.get('pesoTaraRemolque2')?.value) || 0;
    if (pesoTaraR2 <= 0) {
      this.showToast(
        'error',
        'Datos incompletos',
        'Capture el peso de salida del remolque 2.',
      );
      this.isLoading = false;
      return;
    }

    const request: ContinueDoubleTrailerExitRequest = {
      folio: this.currentOperationFolio,
      remolque2: {
        placa: this.entryData.placaRemolque2 || '',
        pesoTara: pesoTaraR2,
        fotoCargaCapturada: !!this.photoData.cargoRemolque2,
      },
      fechaSalida: new Date().toISOString(),
      fotos: {
        remolque2Plate: this.photoData.remolque2Plate || '',
        cargoRemolque2: this.photoData.cargoRemolque2 || '',
      },
    };

    this.weighingService.continueDoubleTrailerExit(request).subscribe({
      next: async (response) => {
        this.isLoading = false;
        this.isExitRegistered = true;
        this.showToast(
          'success',
          'Salida registrada',
          `Salida con doble remolque completada. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
        );
        await this.generatePDF(response);
        setTimeout(() => {
          this.onClear();
          this.router.navigate(['/dashboard']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        const finalMessage = extractErrorMessage(error);
        this.showToast('error', 'Error al completar salida', finalMessage);
      },
    });
  }

  /**
   * Indica si se puede guardar solo la salida del remolque 1 (salida parcial)
   */
  canSavePartialRemolque1(): boolean {
    if (
      !this.entryData ||
      this.entryData.tipoUnidad !== 'doble-remolque' ||
      this.currentOperationFolio
    )
      return false;
    const pesoTaraR1 =
      Number(this.exitForm.get('pesoTaraRemolque1')?.value) || 0;
    return pesoTaraR1 > 0 && !!this.photoData.cargoRemolque1;
  }

  /**
   * Guarda solo la salida del remolque 1 (salida parcial) y permite continuar después
   */
  savePartialDoubleTrailerExit(): void {
    if (!this.canSavePartialRemolque1() || !this.entryData) return;

    this.isLoading = true;
    const request: CreatePartialDoubleTrailerExitRequest = {
      folio: this.entryFolio,
      placaTrailer: this.entryData.placaTrailer || '',
      remolque1: {
        placa: this.entryData.placaRemolque1 || '',
        pesoTara: Number(this.exitForm.get('pesoTaraRemolque1')?.value) || 0,
        fotoCargaCapturada: !!this.photoData.cargoRemolque1,
      },
      fechaSalida: new Date().toISOString(),
      fotos: {
        trailerPlate: this.photoData.trailerPlate || '',
        remolque1Plate: this.photoData.remolque1Plate || '',
        cargoRemolque1: this.photoData.cargoRemolque1 || '',
      },
    };

    this.weighingService.createPartialDoubleTrailerExit(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.notificationService.showSuccess(
          'Salida parcial registrada',
          `Remolque 1 registrado. Folio: ${response.folio}. Puede continuar con el remolque 2 después.`,
        );
        setTimeout(() => {
          this.onClear();
          this.router.navigate(['/dashboard']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        const finalMessage = extractErrorMessage(error);
        this.showToast(
          'error',
          'Error al registrar salida parcial',
          finalMessage,
        );
      },
    });
  }

  /**
   * Genera el PDF del ticket de salida
   */
  private async generatePDF(response: any): Promise<void> {
    if (!this.entryData) return;

    try {
      const receiptData: WeighingReceiptData = {
        folio: response.folio || this.entryFolio,
        fecha: response.fechaSalida || new Date().toISOString(),
        tipoUnidad: this.entryData.tipoUnidad,
        clienteProveedor: this.entryData.clientProviderName || '',
        tipo: 'client', // Por defecto, ya que EntrySearchData no tiene este campo
        producto: this.entryData.product || '',
        createdBy: this.entryData.createdBy,
        exitRegisteredBy:
          response.exitRegisteredBy || this.entryData.createdBy || '',

        // Datos de entrada - pasar strings directamente del backend
        fechaEntrada: this.entryData.createdAt || new Date().toISOString(),
        pesoBrutoEntrada: this.entryData.entryWeight || 0,
        placaTrailer: this.entryData.placaTrailer || '',
        placaRemolque:
          this.entryData.tipoUnidad === 'doble-remolque'
            ? this.entryData.placaRemolque1 || ''
            : this.entryData.placaRemolque || '',

        // Datos de salida - pasar strings directamente del backend
        fechaSalida: response.fechaSalida || new Date().toISOString(),
        pesoBrutoSalida: this.exitForm.get('exitWeight')?.value || 0,
        pesoTara: this.exitForm.get('exitWeight')?.value || 0,
        pesoNeto: response.pesoNeto || 0,
      };

      // Si es doble remolque, agregar datos de los remolques
      if (this.entryData.tipoUnidad === 'doble-remolque') {
        // Obtener datos de los remolques desde response.remolques
        const remolque1Data = response.remolques?.find((r: any) => r.numero === 1);
        const remolque2Data = response.remolques?.find((r: any) => r.numero === 2);

        // Usar los pesos reales de cada remolque desde el backend
        const pesoBrutoR1 = remolque1Data?.pesoBruto ?? 0;
        const pesoTaraR1 = remolque1Data?.pesoTara ?? 0;
        const pesoBrutoR2 = remolque2Data?.pesoBruto ?? 0;
        const pesoTaraR2 = remolque2Data?.pesoTara ?? 0;

        // Actualizar el peso bruto de entrada total con la suma de ambos remolques
        receiptData.pesoBrutoEntrada = pesoBrutoR1 + pesoBrutoR2;

        receiptData.remolque1 = {
          placa: this.entryData.placaRemolque1 || '',
          pesoBruto: pesoBrutoR1,
          pesoTara: pesoTaraR1,
          pesoNeto: Math.abs(Number(pesoBrutoR1) - Number(pesoTaraR1)),
          fechaEntrada: remolque1Data?.fechaRegistro || this.entryData.createdAt,
          usuarioEntrada: remolque1Data?.registradoPor || this.entryData.createdBy,
          fechaSalida: remolque1Data?.fechaSalida || response.fechaSalida,
          usuarioSalida: remolque1Data?.registradoPorSalida || response.exitRegisteredBy,
        };

        receiptData.remolque2 = {
          placa: this.entryData.placaRemolque2 || '',
          pesoBruto: pesoBrutoR2,
          pesoTara: pesoTaraR2,
          pesoNeto: Math.abs(Number(pesoBrutoR2) - Number(pesoTaraR2)),
          fechaEntrada: remolque2Data?.fechaRegistro || this.entryData.createdAt,
          usuarioEntrada: remolque2Data?.registradoPor || this.entryData.createdBy,
          fechaSalida: remolque2Data?.fechaSalida || response.fechaSalida,
          usuarioSalida: remolque2Data?.registradoPorSalida || response.exitRegisteredBy,
        };
      }

      await this.pdfGeneratorService.generateWeighingReceipt(receiptData);
      console.log('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      this.showToast(
        'warn',
        'Advertencia',
        'Salida registrada pero hubo un error al generar el PDF',
      );
    }
  }

  /**
   * Obtiene el tipo de unidad de la ruta
   */
  private getUnitTypeFromRoute(): void {
    this.route.paramMap.subscribe((params) => {
      this.unitType = params.get('unitType') || 'provider';
      const unitTypeTitles: Record<string, string> = {
        provider: 'Proveedor',
        client: 'Cliente',
        internal: 'Interno',
      };
      this.unitTypeTitle = unitTypeTitles[this.unitType] || 'Unidad';
    });
  }

  /**
   * Verifica si el formulario es válido.
   * En modo continuar (remolque 2): además exige peso de salida del remolque 2 > 0.
   */
  get isFormValid(): boolean {
    if (!this.exitForm.valid) return false;
    // Modo continuar salida doble remolque: requiere peso tara remolque 2 capturado
    if (
      this.currentOperationFolio &&
      this.entryData?.tipoUnidad === 'doble-remolque'
    ) {
      const pesoTaraR2 =
        Number(this.exitForm.get('pesoTaraRemolque2')?.value) || 0;
      return pesoTaraR2 > 0;
    }
    return true;
  }

  /**
   * Configurar búsqueda de entradas pendientes con autocompletado
   */
  private setupEntrySearch(): void {
    const trailerPlateControl = this.exitForm.get('trailerPlate');

    if (trailerPlateControl) {
      this.entrySearchSubscription = trailerPlateControl.valueChanges
        .pipe(
          debounceTime(400), // Esperar 400ms después del último keystroke
          distinctUntilChanged(), // Solo buscar si el valor cambió
          switchMap((searchTerm: string) => {
            console.log(
              '🔍 Buscando entradas pendientes con término:',
              searchTerm,
            );

            // Solo buscar si hay al menos 2 caracteres y no se ha encontrado una entrada
            if (
              !searchTerm ||
              searchTerm.trim().length < 2 ||
              this.isEntryFound
            ) {
              console.log(
                '❌ Valor muy corto o entrada ya encontrada, limpiando sugerencias',
              );
              this.entrySuggestions = [];
              this.showEntrySuggestions = false;
              this.cdr.detectChanges();
              return [];
            }

            // Buscar entradas pendientes de salida Y salidas parciales (pendientes de remolque 2)
            return forkJoin({
              pending: this.weighingService.searchPendingExits(
                searchTerm.trim(),
                10,
                this.unitType,
              ),
              partial: this.weighingService.searchPendingDoubleTrailerExits(
                searchTerm.trim(),
                10,
              ),
            }).pipe(
              map(({ pending, partial }) => {
                const partialAsSuggestions = partial.map(
                  (p: PendingDoubleTrailerExitSearchResult) =>
                    ({
                      id: p.id,
                      folio: p.folio,
                      trailerPlate: p.trailerPlaca,
                      product: p.product,
                      clientProviderName: p.clientProviderName,
                      entryWeight: p.pesoBrutoR1,
                      createdAt: p.fechaSalidaR1,
                      tipoUnidad: 'doble-remolque',
                      displayText: `${p.folio} | ${p.trailerPlaca} | Continuar remolque 2 | ${p.clientProviderName} | ${p.product}`,
                      pendingType: 'continue_remolque2' as const,
                    }) as PendingExitSearchResult & {
                      pendingType: 'continue_remolque2';
                    },
                );
                return [...pending, ...partialAsSuggestions];
              }),
              catchError(() => of([])),
            );
          }),
        )
        .subscribe({
          next: (
            results: (PendingExitSearchResult & {
              pendingType?: 'continue_remolque2';
            })[],
          ) => {
            console.log(
              '✅ Sugerencias (entradas + salidas parciales):',
              results,
            );
            this.entrySuggestions = results;
            this.showEntrySuggestions = results.length > 0;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('❌ Error buscando entradas pendientes:', error);
            this.entrySuggestions = [];
            this.showEntrySuggestions = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  /**
   * Seleccionar una entrada de las sugerencias
   */
  selectEntrySuggestion(
    entry: PendingExitSearchResult & { pendingType?: 'continue_remolque2' },
  ): void {
    console.log('🎯 Entrada seleccionada:', entry);

    // Actualizar el campo de placa sin disparar eventos
    this.exitForm.patchValue(
      { trailerPlate: entry.trailerPlate },
      { emitEvent: false },
    );

    // Ocultar sugerencias
    this.entrySuggestions = [];
    this.showEntrySuggestions = false;

    // Si es salida parcial pendiente de remolque 2, cargar por folio directamente
    if (entry.pendingType === 'continue_remolque2') {
      this.loadPartialExitOperationForContinue(entry.folio);
      this.cdr.detectChanges();
      return;
    }

    // Buscar la entrada completa usando el método existente
    this.onSearchEntry();

    this.cdr.detectChanges();
  }

  /**
   * Mostrar sugerencias al hacer focus
   */
  onEntrySearchFocus(): void {
    const plateValue = this.exitForm.get('trailerPlate')?.value;
    if (
      plateValue &&
      plateValue.trim().length >= 2 &&
      this.entrySuggestions.length > 0 &&
      !this.isEntryFound
    ) {
      this.showEntrySuggestions = true;
      this.cdr.detectChanges();
    }
  }

  /**
   * Cerrar sugerencias al hacer blur
   */
  onEntrySearchBlur(): void {
    // Delay para permitir click en sugerencias
    setTimeout(() => {
      this.showEntrySuggestions = false;
      this.cdr.detectChanges();
    }, 200);
  }

  /**
   * Captura todas las fotos del flujo de salida de manera consolidada
   * Para doble remolque: SOLO captura tráiler + remolque1 + carga remolque1 (Fase 1)
   * Para otros flujos: captura todas las fotos en paralelo
   * Este método NO modifica la funcionalidad existente
   */
  async onCaptureAllPhotos(): Promise<void> {
    // Validar que tenemos datos de entrada
    if (!this.entryData) {
      this.showToast(
        'error',
        'Datos faltantes',
        'Debe buscar una entrada primero antes de capturar fotos',
      );
      return;
    }

    const isDoubleTrailer = this.entryData.tipoUnidad === 'doble-remolque';
    const isContainerOnly = this.entryData.tipoUnidad === 'contenedor';

    this.isCapturingAllPhotos = true;

    console.log(
      '🎯 [WEIGHING-EXIT-FORM] Iniciando captura consolidada - tipoUnidad:',
      this.entryData.tipoUnidad,
    );

    try {
      // Solicitar peso antes de capturar fotos
      this.requestCurrentWeight();

      this.showToast(
        'info',
        'Captura consolidada iniciada',
        'Capturando fotos en paralelo. Por favor espere...',
      );

      let fotosExitosas = 0;
      let fotosFallidas = 0;
      let totalFotos = 0;

      if (isDoubleTrailer) {
        // ============= FLUJO DOBLE REMOLQUE - SOLO FASE 1 =============
        // Capturar: trailer, remolque1 y carga remolque1 EN PARALELO
        totalFotos = 3;
        this.photosCaptureProgress = {
          current: 0,
          total: totalFotos,
          fieldName: 'Remolque 1...',
        };
        this.cdr.detectChanges();

        const phase1Promises = [
          {
            promise: this.onPhotoCaptureWithOCR('trailerPlate'),
            name: 'Tráiler',
          },
          {
            promise: this.onPhotoCaptureWithOCR('remolque1Plate'),
            name: 'Remolque 1',
          },
          {
            promise: this.onPhotoCapture('cargoRemolque1'),
            name: 'Carga Remolque 1',
          },
        ];

        const phase1Results = await Promise.allSettled(
          phase1Promises.map((cp) => cp.promise),
        );

        phase1Results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            fotosExitosas++;
            console.log(
              `✅ [WEIGHING-EXIT-FORM] Foto ${phase1Promises[index].name} capturada exitosamente`,
            );
          } else {
            fotosFallidas++;
            console.error(
              `❌ [WEIGHING-EXIT-FORM] Error capturando ${phase1Promises[index].name}:`,
              result.reason,
            );
          }
        });
      } else {
        // ============= FLUJO REMOLQUE ÚNICO O CONTENEDOR - TODO PARALELO =============
        const capturePromises = [
          {
            promise: this.onPhotoCaptureWithOCR('trailerPlate'),
            name: 'Tráiler',
          },
          {
            promise: this.onPhotoCaptureWithOCR('trailerPlate2'),
            name: isContainerOnly ? 'Contenedor' : 'Remolque',
          },
          {
            promise: this.onPhotoCapture('cargoState'),
            name: 'Estado de Carga',
          },
        ];

        totalFotos = capturePromises.length;
        this.photosCaptureProgress = {
          current: 0,
          total: totalFotos,
          fieldName: 'En paralelo...',
        };
        this.cdr.detectChanges();

        const results = await Promise.allSettled(
          capturePromises.map((cp) => cp.promise),
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            fotosExitosas++;
            console.log(
              `✅ [WEIGHING-EXIT-FORM] Foto ${capturePromises[index].name} capturada exitosamente`,
            );
          } else {
            fotosFallidas++;
            console.error(
              `❌ [WEIGHING-EXIT-FORM] Error capturando ${capturePromises[index].name}:`,
              result.reason,
            );
          }
        });
      }

      // Mostrar resultado final
      if (fotosFallidas === 0) {
        this.showToast(
          'success',
          'Captura consolidada exitosa',
          `Se capturaron exitosamente ${fotosExitosas} de ${totalFotos} fotos en paralelo`,
        );
      } else {
        this.showToast(
          'warn',
          'Captura consolidada parcial',
          `Se capturaron ${fotosExitosas} de ${totalFotos} fotos. ${fotosFallidas} fotos fallaron.`,
        );
      }
    } catch (error: any) {
      console.error(
        '❌ [WEIGHING-EXIT-FORM] Error en captura consolidada:',
        error,
      );
      this.showToast(
        'error',
        'Error en captura consolidada',
        error.message || 'Error desconocido al capturar fotos',
      );
    } finally {
      this.isCapturingAllPhotos = false;
      this.photosCaptureProgress = { current: 0, total: 0, fieldName: '' };
      this.cdr.detectChanges();
    }
  }

  /**
   * Captura fotos del remolque 2 en flujo de doble remolque (Fase 2)
   * Captura: remolque2 + carga remolque2 EN PARALELO
   * Este método NO modifica la funcionalidad existente
   */
  async onCaptureRemolque2Photos(): Promise<void> {
    if (!this.entryData) {
      this.showToast(
        'error',
        'Datos faltantes',
        'Debe buscar una entrada primero',
      );
      return;
    }

    const isDoubleTrailer = this.entryData.tipoUnidad === 'doble-remolque';

    if (!isDoubleTrailer) {
      console.warn(
        '⚠️ [WEIGHING-EXIT-FORM] onCaptureRemolque2Photos solo aplica para doble remolque',
      );
      return;
    }

    this.isCapturingAllPhotos = true;

    console.log(
      '🎯 [WEIGHING-EXIT-FORM] Iniciando captura de fotos Remolque 2',
    );

    try {
      // Solicitar peso antes de capturar fotos
      this.requestCurrentWeight();

      this.showToast(
        'info',
        'Capturando Remolque 2',
        'Capturando fotos del remolque 2. Por favor espere...',
      );

      const totalFotos = 2;
      let fotosExitosas = 0;
      let fotosFallidas = 0;

      this.photosCaptureProgress = {
        current: 0,
        total: totalFotos,
        fieldName: 'Remolque 2...',
      };
      this.cdr.detectChanges();

      // Capturar remolque2 y carga remolque2 EN PARALELO
      const phase2Promises = [
        {
          promise: this.onPhotoCaptureWithOCR('remolque2Plate'),
          name: 'Remolque 2',
        },
        {
          promise: this.onPhotoCapture('cargoRemolque2'),
          name: 'Carga Remolque 2',
        },
      ];

      const phase2Results = await Promise.allSettled(
        phase2Promises.map((cp) => cp.promise),
      );

      phase2Results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          fotosExitosas++;
          console.log(
            `✅ [WEIGHING-EXIT-FORM] Foto ${phase2Promises[index].name} capturada exitosamente`,
          );
        } else {
          fotosFallidas++;
          console.error(
            `❌ [WEIGHING-EXIT-FORM] Error capturando ${phase2Promises[index].name}:`,
            result.reason,
          );
        }
      });

      // Mostrar resultado final
      if (fotosFallidas === 0) {
        this.showToast(
          'success',
          'Remolque 2 capturado',
          `Se capturaron exitosamente ${fotosExitosas} de ${totalFotos} fotos del remolque 2`,
        );
      } else {
        this.showToast(
          'warn',
          'Captura parcial Remolque 2',
          `Se capturaron ${fotosExitosas} de ${totalFotos} fotos. ${fotosFallidas} fotos fallaron.`,
        );
      }
    } catch (error: any) {
      console.error(
        '❌ [WEIGHING-EXIT-FORM] Error en captura de Remolque 2:',
        error,
      );
      this.showToast(
        'error',
        'Error en captura Remolque 2',
        error.message || 'Error desconocido al capturar fotos del remolque 2',
      );
    } finally {
      this.isCapturingAllPhotos = false;
      this.photosCaptureProgress = { current: 0, total: 0, fieldName: '' };
      this.cdr.detectChanges();
    }
  }
}
