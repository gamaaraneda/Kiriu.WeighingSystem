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
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { HeaderComponent } from '../../../../layout/header/header.component';
import {
  RealWeighingService,
  DoubleTrailerWeighingState,
  RemolqueData,
  CreateEntryRequest,
  CreateDoubleTrailerEntryRequest,
  CreatePartialDoubleTrailerEntryRequest,
  ContinueDoubleTrailerEntryRequest,
  CreateExitRequest,
  CreateDoubleTrailerExitRequest,
  CreatePartialDoubleTrailerExitRequest,
  ExitPhotoDataDto,
  WeightReading,
  UpdateWeighingOperationRequest,
} from '../../services/real-weighing.service';
import { WeighingFlowService } from '../../services/weighing-flow.service';
import {
  ManualEditDetectorService,
  ManualEditEvent,
} from '../../services/manual-edit-detector.service';
import {
  PesoRealtimeService,
  PesoData,
  ConnectionStatus,
} from '../../services/peso-realtime.service';
import { AnprService, AnprEvent } from '../../services/anpr.service';
import { CargoCameraService } from '../../services/cargo-camera.service';
import { TrailerCameraService } from '../../services/trailer-camera.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ProcessStepsComponent } from '../../../../shared/components/process-steps';
import { MessageService } from '../../../../shared/services/message.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ToastModule } from 'primeng/toast';
import { WeightData, PhotoData } from '../../types/weighing.types';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-weighing-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    BreadcrumbComponent,
    ProcessStepsComponent,
    ToastModule,
  ],
  templateUrl: './weighing-form.component.html',
  styleUrls: ['./weighing-form.component.scss'],
})
export class WeighingFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private weighingService = inject(RealWeighingService);
  private weighingFlowService = inject(WeighingFlowService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private manualEditDetector = inject(ManualEditDetectorService);
  private pesoRealtimeService = inject(PesoRealtimeService);
  private anprService = inject(AnprService);
  private cargoCameraService = inject(CargoCameraService);
  private trailerCameraService = inject(TrailerCameraService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  unitType = '';
  operationType = '';
  unitTypeTitle = '';
  operationTitle = '';

  weighingForm!: FormGroup;
  weightData: WeightData = {
    currentWeight: 0,
    isStable: false,
    isConnected: true,
    weightHistory: [],
  };

  photoData: PhotoData = {
    trailerPlate: '',
    trailerPlate2: '',
    cargo: '',
    remolque1Plate: '',
    remolque2Plate: '',
    cargoRemolque1: '',
    cargoRemolque2: '',
  };

  // Control de edición manual de placas
  manualEditEnabled = {
    trailerPlate: false,
    trailerPlate2: false,
    remolque1Plate: false,
    remolque2Plate: false,
  };

  // PhotoId de remolque1 (doble remolque) - usado para excluir al buscar remolque2
  private remolque1PhotoId: string | null = null;

  // Estado para doble remolque
  doubleTrailerState: DoubleTrailerWeighingState = {
    currentStep: 'trailer',
    trailerPlaca: '',
    remolque1: {
      numero: 1,
      placa: '',
      pesoBruto: 0,
      fotos: [],
      fotoCargaCapturada: false,
    },
    remolque2: {
      numero: 2,
      placa: '',
      pesoBruto: 0,
      fotos: [],
      fotoCargaCapturada: false,
    },
    pesoBrutoTotal: 0,
    isComplete: false,
  };

  // Control de visibilidad del panel tipo checklist
  showChecklistPanel = false;

  // Control para mostrar información de entrada previa en salidas
  showEntryInfo = false;

  // Propiedades para el panel de pasos del proceso
  showProcessSteps = true;
  processStepsComponent?: ProcessStepsComponent;
  stepStatuses: Record<string, boolean> = {};

  isLoading = false;
  loadingWeight = false;
  weightUpdateInterval: Subscription | undefined;
  manualEditSubscription: Subscription | undefined;
  pesoRealtimeSubscription: Subscription | undefined;
  connectionStatusSubscription: Subscription | undefined;
  hasManualEdits = false;
  currentOperationId: string | null = null;
  currentOperationFolio: string | null = null; // Para modo continue-double-trailer

  // Control para captura consolidada de fotos
  isCapturingAllPhotos = false;
  photosCaptureProgress = { current: 0, total: 0, fieldName: '' };

  // Control para orden invertido de placas
  invertedPlateOrder = false;

  // Estado de conexión con la báscula
  connectionStatus: ConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0,
  };

  // Báscula actual (para filtros por dispositivo)
  currentBasculaId: number | null = null;

  // Autocompletado de productos
  productSuggestions: string[] = [];
  showProductSuggestions = false;
  productSearchSubscription: Subscription | undefined;

  // Autocompletado de clientes/proveedores
  clientSuggestions: string[] = [];
  showClientSuggestions = false;
  clientSearchSubscription: Subscription | undefined;

  ngOnInit(): void {
    // Primero verificar si estamos en modo continue-double-trailer
    this.route.queryParams.subscribe((queryParams) => {
      const mode = queryParams['mode'];
      const folio = queryParams['folio'];

      if (mode === 'continue-double-trailer' && folio) {
        // Modo especial: continuar operación parcial con remolque 2
        this.loadPartialOperationForContinue(folio);
        return;
      }

      // Flujo normal: procesar parámetros de ruta estándar
      this.route.params.subscribe((params) => {
        this.unitType = params['unitType'];
        this.operationType = params['operationType'];
        this.updateTitles();
        this.initializeForm();
        this.startRealtimeWeightUpdates();
        this.loadExistingData();

        // Validar que el flujo sea correcto
        this.validateFlow();
      });

      // Actualizar el estado de los pasos del proceso después de la inicialización
      setTimeout(() => this.updateProcessStepsStatus(), 100);

      // Configurar detección de edición manual
      this.setupManualEditDetection();

      // Configurar búsqueda de productos con debounce
      this.setupProductSearch();

      // Configurar búsqueda de clientes/proveedores con debounce
      this.setupClientSearch();
    });
  }

  ngOnDestroy(): void {
    if (this.weightUpdateInterval) {
      this.weightUpdateInterval.unsubscribe();
    }

    if (this.manualEditSubscription) {
      this.manualEditSubscription.unsubscribe();
    }

    if (this.pesoRealtimeSubscription) {
      this.pesoRealtimeSubscription.unsubscribe();
    }

    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }

    if (this.productSearchSubscription) {
      this.productSearchSubscription.unsubscribe();
    }

    if (this.clientSearchSubscription) {
      this.clientSearchSubscription.unsubscribe();
    }

    // Limpiar estado del detector de edición manual
    this.manualEditDetector.resetFormState('weighing-form');
  }

  private updateTitles(): void {
    if (this.unitType === 'client') {
      this.unitTypeTitle = 'Cliente';
    } else if (this.unitType === 'provider') {
      this.unitTypeTitle = 'Proveedor';
    }

    if (this.operationType === 'entry') {
      this.operationTitle = 'Entrada';
    } else if (this.operationType === 'exit') {
      this.operationTitle = 'Salida';
    }
  }

  // Validador personalizado para placas
  private plateValidator(control: any) {
    if (!control.value) {
      return null; // Si está vacío, Validators.required lo manejará
    }
    const value = control.value;
    // Solo letras (mayúsculas y minúsculas), números y guion medio
    const pattern = /^[a-zA-Z0-9-]*$/;
    if (!pattern.test(value)) {
      return { invalidPlate: true };
    }
    // Máximo 20 caracteres
    if (value.length > 20) {
      return { maxLength: true };
    }
    return null;
  }

  // Filtrar caracteres no permitidos en tiempo real para placas
  onPlateInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números y guion medio
    const filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
    // Limitar a 20 caracteres
    const truncatedValue = filteredValue.substring(0, 20);

    if (value !== truncatedValue) {
      // Si hubo cambios, actualizar el valor del input y del formulario
      input.value = truncatedValue;
      this.weighingForm.patchValue(
        { [fieldName]: truncatedValue },
        { emitEvent: false },
      );
    }
  }

  // Filtrar caracteres no permitidos en tiempo real para campos alfanuméricos (producto, cliente)
  onAlphanumericInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    let filteredValue: string;
    if (fieldName === 'product') {
      // Para producto: permitir letras, números, espacios, ñ/Ñ y los caracteres especiales: - / # .
      filteredValue = value.replace(/[^a-zA-ZñÑ0-9\s\-\/#.]/g, '');
    } else if (fieldName === 'clientProviderName') {
      // Para nombre/razón social: permitir letras, números, espacios, ñ/Ñ y guion
      filteredValue = value.replace(/[^a-zA-ZñÑ0-9\s-]/g, '');
    } else {
      // Para otros campos: solo letras, números y espacios
      filteredValue = value.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    // Limitar a 50 caracteres
    const truncatedValue = filteredValue.substring(0, 50);

    if (value !== truncatedValue) {
      // Si hubo cambios, actualizar el valor del input y del formulario
      input.value = truncatedValue;
      this.weighingForm.patchValue(
        { [fieldName]: truncatedValue },
        { emitEvent: false },
      );
    }
  }

  private initializeForm(): void {
    this.weighingForm = this.fb.group({
      // Datos del vehículo
      trailerPlate: ['', [Validators.required, this.plateValidator.bind(this)]],
      trailerPlate2: [
        '',
        [Validators.required, this.plateValidator.bind(this)],
      ], // Obligatorio para remolque único
      remolque1Plate: ['', this.plateValidator.bind(this)],
      remolque2Plate: ['', this.plateValidator.bind(this)],
      containerOnly: [false],
      doubleTrailer: [false],
      product: ['', Validators.required],

      // Cliente/Proveedor
      clientProviderId: [''],
      clientProviderName: ['', Validators.required],
    });

    // Suscribirse a cambios en los checkboxes
    this.weighingForm
      .get('containerOnly')
      ?.valueChanges.subscribe((containerOnly: boolean) => {
        this.onContainerOnlyChange(containerOnly);
      });

    this.weighingForm
      .get('doubleTrailer')
      ?.valueChanges.subscribe((doubleTrailer: boolean) => {
        this.onDoubleTrailerChange(doubleTrailer);
      });

    // Suscribirse a cambios en campos clave para actualizar el estado de los pasos
    this.weighingForm.get('product')?.valueChanges.subscribe(() => {
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });

    this.weighingForm.get('clientProviderName')?.valueChanges.subscribe(() => {
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });

    this.weighingForm.get('trailerPlate')?.valueChanges.subscribe((value) => {
      // Sincronizar con doubleTrailerState si es doble remolque
      if (this.weighingForm.get('doubleTrailer')?.value && value) {
        this.doubleTrailerState.trailerPlaca = value;
        // Avanzar al paso de remolque1 si estamos en el paso trailer
        if (this.doubleTrailerState.currentStep === 'trailer') {
          this.doubleTrailerState.currentStep = 'remolque1';
          console.log('🔄 Paso cambiado a remolque1');
        }
      }
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });

    this.weighingForm.get('trailerPlate2')?.valueChanges.subscribe(() => {
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });

    // Suscribirse a cambios en placas de remolques para sincronizar con doubleTrailerState
    this.weighingForm.get('remolque1Plate')?.valueChanges.subscribe((value) => {
      if (this.weighingForm.get('doubleTrailer')?.value && value) {
        this.doubleTrailerState.remolque1.placa = value;
        console.log('🔄 Sincronizado remolque1.placa:', value);
      }
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });

    this.weighingForm.get('remolque2Plate')?.valueChanges.subscribe((value) => {
      if (this.weighingForm.get('doubleTrailer')?.value && value) {
        this.doubleTrailerState.remolque2.placa = value;
        console.log('🔄 Sincronizado remolque2.placa:', value);
      }
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });
  }

  /**
   * Configura la detección de edición manual para campos de placa
   */
  private setupManualEditDetection(): void {
    // Configurar el detector para este formulario
    this.manualEditDetector.setupFormMonitoring(
      this.weighingForm,
      'weighing-form',
    );

    // Suscribirse a eventos de edición manual
    this.manualEditSubscription = this.manualEditDetector.manualEdit$.subscribe(
      (editEvent: ManualEditEvent) => {
        console.log('🔍 Edición detectada:', editEvent);

        if (editEvent.isManualEdit) {
          this.hasManualEdits = true;

          // Si ya hay una operación registrada, actualizar en el backend
          if (this.currentOperationId) {
            this.updateOperationWithManualEdit(editEvent);
          }

          // Mostrar indicador visual de edición manual
          this.showToast(
            'info',
            'Edición manual detectada',
            `Campo ${editEvent.fieldName} fue editado manualmente`,
          );
        }
      },
    );
  }

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

        // Mostrar notificación de estado de conexión
        if (!status.isConnected && status.lastError) {
          this.showToast(
            'warn',
            'Conexión con báscula',
            'Se perdió la conexión con la báscula. Reintentando...',
          );
        } else if (status.isConnected && status.reconnectAttempts > 0) {
          this.showToast(
            'success',
            'Conexión restaurada',
            'La conexión con la báscula se ha restaurado',
          );
        }

        // Marcar para detección de cambios
        this.cdr.markForCheck();
      });
  }

  private isWeightStable(currentWeight: number): boolean {
    const history = this.weightData.weightHistory;
    if (history.length < 5) {
      return false; // Necesitamos al menos 5 lecturas
    }

    // Calcular la variación en las últimas 5 lecturas
    const lastFive = history.slice(-5);
    const max = Math.max(...lastFive);
    const min = Math.min(...lastFive);
    const variation = max - min;

    // Considerar estable si la variación es menor a 0.5 kg
    return variation <= 0.5;
  }

  private loadExistingData(): void {
    if (this.operationType === 'exit') {
      // Cargar datos de entrada previa usando el servicio
      this.loadPreviousEntryData();
    }
  }

  private loadPreviousEntryData(): void {
    // Para salidas, necesitamos obtener los datos de la entrada previa
    // cuando el usuario capture o ingrese una placa
    console.log('Preparando flujo de salida...');

    // Suscribirse a cambios en la placa para buscar entrada previa
    this.weighingForm
      .get('trailerPlate')
      ?.valueChanges.subscribe((plate: string) => {
        if (plate && plate.length >= 8) {
          // Longitud mínima para una placa válida
          this.searchAndLoadPreviousEntry(plate);
        }
      });
  }

  private searchAndLoadPreviousEntry(plate: string): void {
    // Primero validar si se puede hacer la salida
    this.weighingService.validateExit(plate).subscribe({
      next: (validation) => {
        if (validation.canExit) {
          // Si se puede hacer salida, obtener los datos completos de la operación
          this.loadFullOperationData(plate);
        } else {
          this.showToast(
            'warn',
            'Sin entrada previa',
            validation.message ||
              'No se encontró entrada previa para esta placa',
          );
        }
      },
      error: (error) => {
        console.error('Error al validar salida:', error);
        // Intentar obtener datos de operación aunque la validación falle
        this.loadFullOperationData(plate);
      },
    });
  }

  private loadFullOperationData(plate: string): void {
    this.weighingService.getOperationByPlate(plate).subscribe({
      next: (operation) => {
        // Cargar datos completos de la entrada previa
        this.loadEntryDataForExit(operation);

        this.showToast(
          'info',
          'Entrada encontrada',
          `Entrada previa encontrada. Folio: ${operation.folio}. Peso entrada: ${operation.entryWeight} kg`,
        );

        // Mostrar panel de información de entrada
        this.showEntryInfo = true;

        // Pre-cargar datos en el formulario si están disponibles
        this.preloadFormData(operation);
      },
      error: (error) => {
        console.error('Error al obtener operación por placa:', error);
        this.showToast(
          'error',
          'Error de búsqueda',
          'Error al buscar información de entrada previa',
        );
      },
    });
  }

  private preloadFormData(operation: any): void {
    // Pre-cargar información en el formulario basada en la entrada previa
    const updates: any = {};

    if (operation.product) {
      updates.product = operation.product;
    }

    if (operation.clientProviderName) {
      updates.clientProviderName = operation.clientProviderName;
    }

    // Detectar tipo de unidad basado en los datos de entrada
    if (operation.tipoUnidad) {
      if (operation.tipoUnidad === 'contenedor') {
        updates.containerOnly = true;
        updates.doubleTrailer = false;
      } else if (operation.tipoUnidad === 'doble-remolque') {
        updates.doubleTrailer = true;
        updates.containerOnly = false;
      } else {
        updates.containerOnly = false;
        updates.doubleTrailer = false;
      }
    }

    // Aplicar actualizaciones al formulario si hay datos
    if (Object.keys(updates).length > 0) {
      this.weighingForm.patchValue(updates);

      // Si es doble remolque, inicializar el estado
      if (updates.doubleTrailer) {
        this.initializeDoubleTrailerFlow();
      }
    }
  }

  private loadEntryDataForExit(entryOperation: any): void {
    // Actualizar la información del formulario con datos de entrada
    this.weightData.entryWeight =
      entryOperation.entryWeight || entryOperation.peso || 0;

    // Marcar que hay datos de entrada válidos
    this.weightData.hasValidEntry = true;

    // Guardar información adicional para referencia
    this.weightData.entryOperationId = entryOperation.id;
    this.weightData.entryFolio = entryOperation.folio;
    this.weightData.entryDate = entryOperation.createdAt;

    console.log('Datos de entrada cargados para salida:', {
      id: entryOperation.id,
      folio: entryOperation.folio,
      entryWeight: this.weightData.entryWeight,
      product: entryOperation.product,
      client: entryOperation.clientProviderName,
    });
  }

  onCaptureWeight(): void {
    if (this.weightData.isConnected) {
      // Si es doble remolque, validar requisitos antes de permitir capturar peso
      if (this.weighingForm.get('doubleTrailer')?.value) {
        if (this.doubleTrailerState.currentStep === 'remolque1') {
          // Validar solo campos obligatorios antes de permitir capturar peso
          // NOTA: Usar canCaptureWeight() en lugar de canProceedToRemolque2() para evitar validación circular
          if (!this.canCaptureWeight()) {
            // Mostrar notificación de error (solo campos obligatorios)
            this.notificationService.showError(
              'Información incompleta',
              'Debes capturar la placa del tráiler, la placa del remolque, producto y cliente antes de capturar el peso.',
            );

            // Activar el panel tipo checklist para mostrar qué falta
            this.showChecklistPanel = true;

            return; // No permitir capturar peso hasta completar requisitos
          }
        }
      }

      this.weightData.capturedWeight = this.weightData.currentWeight;
      this.weightData.capturedAt = new Date();
      console.log('Peso capturado:', this.weightData.capturedWeight);

      // Si es doble remolque, procesar el peso según el paso actual
      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.processDoubleTrailerWeight();
      }

      // Actualizar el estado de los pasos del proceso
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    }
  }

  /**
   * Solicita el peso actual desde el SerialGateway (bajo demanda)
   * Este método consulta directamente la báscula a través del SerialGateway
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
        console.log(
          'Peso capturado automáticamente:',
          this.weightData.capturedWeight,
        );

        // Si es doble remolque, procesar el peso según el paso actual
        if (this.weighingForm.get('doubleTrailer')?.value) {
          this.processDoubleTrailerWeight();
        }

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);

        this.showToast(
          'success',
          'Peso capturado',
          `Peso capturado: ${pesoData.peso.toFixed(2)} kg`,
        );
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

  private processDoubleTrailerWeight(): void {
    if (!this.weightData.capturedWeight) return;

    console.log(
      '🔍 processDoubleTrailerWeight - currentStep:',
      this.doubleTrailerState.currentStep,
    );
    console.log('🔍 doubleTrailerState completo:', this.doubleTrailerState);

    switch (this.doubleTrailerState.currentStep) {
      case 'remolque1':
        // Capturar peso del remolque 1
        this.doubleTrailerState.remolque1.pesoBruto =
          this.weightData.capturedWeight;
        this.doubleTrailerState.remolque1.pesoCapturado = true;

        console.log(
          '✅ Peso del remolque 1 capturado:',
          this.weightData.capturedWeight,
        );
        console.log('🔍 Estado después de captura:', {
          trailerPlaca: this.doubleTrailerState.trailerPlaca,
          remolque1Placa: this.doubleTrailerState.remolque1.placa,
          product: this.weighingForm.get('product')?.value,
          client: this.weighingForm.get('clientProviderName')?.value,
          pesoCapturado: this.doubleTrailerState.remolque1.pesoCapturado,
        });

        // Validar que se haya capturado toda la información del primer remolque
        if (this.canProceedToRemolque2WithWeight()) {
          this.showToast(
            'success',
            'Peso capturado',
            `Peso del remolque 1: ${this.weightData.capturedWeight} kg. Ahora suba el segundo remolque.`,
          );

          // No avanzar a remolque2 aquí: la sección Remolque 2 solo se muestra al continuar
          // (modo continue o acción explícita), para mantenerla oculta durante el registro del Remolque 1.

          // Actualizar el estado de los pasos del proceso
          setTimeout(() => this.updateProcessStepsStatus(), 0);
        } else {
          console.error(
            '❌ No se puede proceder al remolque 2 - validación falló',
          );
          // Mostrar error si faltan datos del primer remolque (solo campos obligatorios)
          this.notificationService.showError(
            'Información incompleta',
            'Debes capturar la placa del tráiler, la placa del remolque, producto y cliente antes de continuar.',
          );
          // No avanzar al siguiente paso hasta que se complete la información
          return;
        }
        break;
      case 'remolque2':
        // Capturar peso del remolque 2
        console.log(
          '✅ Capturando peso del remolque 2:',
          this.weightData.capturedWeight,
        );
        this.doubleTrailerState.remolque2.pesoBruto =
          this.weightData.capturedWeight;
        this.doubleTrailerState.remolque2.pesoCapturado = true;

        // Calcular peso total
        this.doubleTrailerState.pesoBrutoTotal =
          (this.doubleTrailerState.remolque1.pesoBruto || 0) +
          (this.doubleTrailerState.remolque2.pesoBruto || 0);

        console.log(
          '✅ Peso total calculado:',
          this.doubleTrailerState.pesoBrutoTotal,
        );
        console.log('✅ Marcando como completo...');

        this.doubleTrailerState.currentStep = 'complete';
        this.doubleTrailerState.isComplete = true;

        this.showToast(
          'success',
          'Peso total calculado',
          `Peso total: ${this.doubleTrailerState.pesoBrutoTotal} kg. Puede proceder a guardar.`,
        );

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
        break;
      default:
        console.warn(
          '⚠️ processDoubleTrailerWeight - paso no reconocido:',
          this.doubleTrailerState.currentStep,
        );
        break;
    }
  }

  getCurrentTime(): Date {
    return this.weightData.capturedAt || new Date();
  }

  onContainerOnlyChange(isChecked: boolean): void {
    if (isChecked) {
      // Si se selecciona "Solo contenedor", desmarcar "Doble remolque"
      this.weighingForm.patchValue({ doubleTrailer: false });
      this.resetDoubleTrailerState();

      // Placa del tráiler sigue siendo OBLIGATORIA en modo contenedor
      this.weighingForm
        .get('trailerPlate')
        ?.setValidators([Validators.required]);
      this.weighingForm.get('trailerPlate')?.updateValueAndValidity();

      // Placa del remolque es OPCIONAL en modo contenedor
      this.weighingForm.get('trailerPlate2')?.clearValidators();
      this.weighingForm.get('trailerPlate2')?.updateValueAndValidity();

      // Limpiar la placa del remolque (opcional en este flujo)
      this.weighingForm.patchValue({
        trailerPlate2: '',
      });

      // Limpiar solo la foto del remolque
      this.photoData.trailerPlate2 = '';
    } else {
      // Si se desmarca "Solo contenedor", restaurar validaciones normales
      this.weighingForm
        .get('trailerPlate')
        ?.setValidators([Validators.required]);
      this.weighingForm.get('trailerPlate')?.updateValueAndValidity();

      // Restaurar validación obligatoria para trailerPlate2 (remolque único)
      this.weighingForm
        .get('trailerPlate2')
        ?.setValidators([Validators.required]);
      this.weighingForm.get('trailerPlate2')?.updateValueAndValidity();
    }

    // Actualizar el estado de los pasos del proceso
    setTimeout(() => this.updateProcessStepsStatus(), 0);
  }

  onDoubleTrailerChange(isChecked: boolean): void {
    if (isChecked) {
      // Si se selecciona "Doble remolque", desmarcar "Solo contenedor"
      this.weighingForm.patchValue({ containerOnly: false });

      // En flujo doble remolque, trailerPlate2 NO se usa (se usan remolque1Plate y remolque2Plate)
      // Por lo tanto, limpiar validadores de trailerPlate2
      this.weighingForm.get('trailerPlate2')?.clearValidators();
      this.weighingForm.get('trailerPlate2')?.updateValueAndValidity();

      // Hacer obligatorios los campos de placas de remolques en doble remolque
      this.weighingForm
        .get('remolque1Plate')
        ?.setValidators([Validators.required]);
      this.weighingForm.get('remolque1Plate')?.updateValueAndValidity();

      this.weighingForm
        .get('remolque2Plate')
        ?.setValidators([Validators.required]);
      this.weighingForm.get('remolque2Plate')?.updateValueAndValidity();

      this.initializeDoubleTrailerFlow();
    } else {
      this.resetDoubleTrailerState();

      // Restaurar validación de trailerPlate2 al salir del modo doble remolque
      this.weighingForm
        .get('trailerPlate2')
        ?.setValidators([Validators.required]);
      this.weighingForm.get('trailerPlate2')?.updateValueAndValidity();

      // Limpiar validadores de remolque1 y remolque2 al salir del modo doble remolque
      this.weighingForm.get('remolque1Plate')?.clearValidators();
      this.weighingForm.get('remolque1Plate')?.updateValueAndValidity();

      this.weighingForm.get('remolque2Plate')?.clearValidators();
      this.weighingForm.get('remolque2Plate')?.updateValueAndValidity();
    }

    // Actualizar el estado de los pasos del proceso
    setTimeout(() => this.updateProcessStepsStatus(), 0);
  }

  // Métodos auxiliares para manejar eventos de checkbox
  onContainerOnlyChangeEvent(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onContainerOnlyChange(target.checked);
  }

  onDoubleTrailerChangeEvent(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onDoubleTrailerChange(target.checked);
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
   * También funciona en flujo Solo Contenedor (intercambia fotos y textos)
   */
  private swapPlatePhotos(): void {
    const isDoubleTrailer = this.weighingForm.get('doubleTrailer')?.value;

    if (isDoubleTrailer) {
      // Intercambiar trailer ↔ remolque1 (NO tocar remolque2)
      this.swapPhotoData('trailerPlate', 'remolque1Plate');
      this.swapFormValues('trailerPlate', 'remolque1Plate');

      // Intercambiar en doubleTrailerState
      const tempPlaca = this.doubleTrailerState.trailerPlaca;
      this.doubleTrailerState.trailerPlaca =
        this.doubleTrailerState.remolque1.placa || '';
      this.doubleTrailerState.remolque1.placa = tempPlaca;

      this.showToast(
        'success',
        'Orden invertido',
        'Las fotos del tráiler y remolque 1 han sido intercambiadas',
      );
    } else {
      // Intercambiar trailer ↔ trailerPlate2 (remolque simple o contenedor)
      this.swapPhotoData('trailerPlate', 'trailerPlate2');
      this.swapFormValues('trailerPlate', 'trailerPlate2');

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
    const value1 = this.weighingForm.get(field1)?.value;
    const value2 = this.weighingForm.get(field2)?.value;

    this.weighingForm.patchValue({
      [field1]: value2,
      [field2]: value1,
    });
  }

  /**
   * Valida que se haya capturado toda la información del primer remolque
   * ANTES de permitir avanzar al segundo remolque
   * Solo campos obligatorios: placas, producto, cliente y peso
   */
  canProceedToRemolque2(): boolean {
    // Validar que se haya capturado:
    // 1. Placa del tráiler
    // 2. Placa del remolque 1
    // 3. Material/producto
    // 4. Nombre del proveedor/cliente
    // 5. Peso del remolque 1
    // NOTA: Las fotos son OPCIONALES
    return !!(
      this.doubleTrailerState.trailerPlaca &&
      this.doubleTrailerState.remolque1.placa &&
      this.weighingForm.get('product')?.value &&
      this.weighingForm.get('clientProviderName')?.value &&
      this.doubleTrailerState.remolque1.pesoCapturado
    );
  }

  /**
   * Valida que se haya capturado toda la información del primer remolque
   * INCLUYENDO el peso, para poder proceder al remolque 2
   * NOTA: Ahora usa la misma lógica que canProceedToRemolque2
   */
  canProceedToRemolque2WithWeight(): boolean {
    return this.canProceedToRemolque2();
  }

  /**
   * Determina si se puede capturar peso en el momento actual
   * Solo valida campos obligatorios: placas, producto y cliente
   * Las fotos son opcionales
   */
  canCaptureWeight(): boolean {
    if (!this.weighingForm.get('doubleTrailer')?.value) return true;

    // Solo validar cuando estamos en el paso del remolque 1
    if (this.doubleTrailerState.currentStep === 'remolque1') {
      // Validar que se haya capturado:
      // 1. Placa del tráiler
      // 2. Placa del remolque 1
      // 3. Material/producto
      // 4. Nombre del proveedor/cliente
      // NOTA: Las fotos son OPCIONALES, NO se valida el peso aquí
      const canCapture = !!(
        this.doubleTrailerState.trailerPlaca &&
        this.doubleTrailerState.remolque1.placa &&
        this.weighingForm.get('product')?.value &&
        this.weighingForm.get('clientProviderName')?.value
      );

      // Log de debug para identificar el problema
      console.log('🔍 Debug canCaptureWeight:', {
        currentStep: this.doubleTrailerState.currentStep,
        trailerPlaca: !!this.doubleTrailerState.trailerPlaca,
        remolque1Placa: !!this.doubleTrailerState.remolque1.placa,
        product: !!this.weighingForm.get('product')?.value,
        clientProviderName:
          !!this.weighingForm.get('clientProviderName')?.value,
        canCapture: canCapture,
      });

      // Si se pueden capturar pesos, ocultar el panel tipo checklist
      if (canCapture && this.showChecklistPanel) {
        this.showChecklistPanel = false;
      }

      return canCapture;
    }

    // Log de debug para otros pasos
    console.log('🔍 Debug canCaptureWeight - Otro paso:', {
      currentStep: this.doubleTrailerState.currentStep,
      isDoubleTrailer: this.weighingForm.get('doubleTrailer')?.value,
    });

    return true; // Para otros pasos, permitir captura de peso
  }

  private initializeDoubleTrailerFlow(): void {
    this.doubleTrailerState = {
      currentStep: 'trailer',
      trailerPlaca: '',
      remolque1: {
        numero: 1,
        placa: '',
        pesoBruto: 0,
        fotos: [],
        fotoCargaCapturada: false,
        fotoPlacaCapturada: false,
      },
      remolque2: {
        numero: 2,
        placa: '',
        pesoBruto: 0,
        fotos: [],
        fotoCargaCapturada: false,
        fotoPlacaCapturada: false,
      },
      pesoBrutoTotal: 0,
      isComplete: false,
    };

    this.showToast(
      'info',
      'Flujo de doble remolque',
      'Seleccione la placa del tráiler y luego proceda con el primer remolque.',
    );
  }

  private resetDoubleTrailerState(): void {
    this.doubleTrailerState = {
      currentStep: 'trailer',
      trailerPlaca: '',
      remolque1: {
        numero: 1,
        placa: '',
        pesoBruto: 0,
        fotos: [],
        fotoCargaCapturada: false,
        fotoPlacaCapturada: false,
      },
      remolque2: {
        numero: 2,
        placa: '',
        pesoBruto: 0,
        fotos: [],
        fotoCargaCapturada: false,
        fotoPlacaCapturada: false,
      },
      pesoBrutoTotal: 0,
      isComplete: false,
    };
  }

  /**
   * Genera una placa aleatoria siguiendo el formato mexicano estándar
   * Formato: AAA-000-AA (3 letras - 3 números - 2 caracteres alfanuméricos)
   */
  private generateRandomPlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let plate = '';

    // Primera parte: 3 letras
    for (let i = 0; i < 3; i++) {
      plate += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    plate += '-';

    // Segunda parte: 3 números
    for (let i = 0; i < 3; i++) {
      plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    plate += '-';

    // Tercera parte: 2 caracteres alfanuméricos
    for (let i = 0; i < 2; i++) {
      plate += alphanumeric.charAt(
        Math.floor(Math.random() * alphanumeric.length),
      );
    }

    return plate;
  }

  async onPhotoCapture(photoType: keyof PhotoData): Promise<void> {
    console.log('Capturando foto con ANPR:', photoType);

    // Mapear photoType a cameraType de ANPR
    const cameraTypeMap: Record<string, 'trailer' | 'remolque' | 'cargo'> = {
      trailerPlate: 'trailer',
      trailerPlate2: 'remolque', // Placa del remolque en flujo de remolque único
      remolque1Plate: 'remolque',
      remolque2Plate: 'remolque',
      cargo: 'cargo',
      cargoRemolque1: 'cargo',
      cargoRemolque2: 'cargo',
    };

    const cameraType = cameraTypeMap[photoType];

    // Si es un tipo de placa, usar ANPR
    if (
      (photoType === 'trailerPlate' ||
        photoType === 'trailerPlate2' ||
        photoType === 'remolque1Plate' ||
        photoType === 'remolque2Plate') &&
      cameraType
    ) {
      // Declarar variables fuera del try para acceso en catch
      let orphanPhoto: any = null;

      try {
        const plateTypeLabel =
          photoType === 'trailerPlate'
            ? 'tráiler'
            : photoType === 'trailerPlate2'
              ? 'remolque'
              : photoType === 'remolque1Plate'
                ? 'remolque 1'
                : 'remolque 2';

        // Paso 1: Intentar obtener foto huérfana de BD primero
        const isDoubleTrailer = this.weighingForm.get('doubleTrailer')?.value;
        // Buscar en BD para: flujo simple, trailerPlate, remolque1Plate y remolque2Plate
        const shouldSearchDB =
          !isDoubleTrailer ||
          photoType === 'trailerPlate' ||
          photoType === 'remolque1Plate' ||
          photoType === 'remolque2Plate';

        if (shouldSearchDB) {
          console.log(
            `🔍 [WEIGHING-FORM] Buscando foto en BD para photoType: ${photoType}`,
          );

          // Si es remolque2Plate en doble remolque, buscar en remolque1Plate excluyendo la foto de remolque1
          // Esto es porque el backend siempre guarda fotos de cámara "remolque" como "remolque1Plate"
          let searchPhotoType = photoType;
          let excludePhotoId: string | undefined = undefined;

          if (
            isDoubleTrailer &&
            photoType === 'remolque2Plate' &&
            this.remolque1PhotoId
          ) {
            searchPhotoType = 'remolque1Plate'; // Buscar en remolque1Plate
            excludePhotoId = this.remolque1PhotoId; // Excluir la foto ya usada para remolque1
            console.log(
              `🔄 [WEIGHING-FORM] Buscando remolque2 en remolque1Plate, excluyendo foto de remolque1: ${excludePhotoId}`,
            );
          }

          orphanPhoto = await this.anprService
            .getLatestOrphanPhoto(searchPhotoType, excludePhotoId)
            .toPromise();

          // Fallback para trailerPlate2: también buscar en remolque1Plate
          // Esto es porque el backend guarda fotos de cámara "remolque" como "remolque1Plate"
          if (!orphanPhoto && photoType === 'trailerPlate2') {
            console.log(
              `🔄 [WEIGHING-FORM] No encontrado en trailerPlate2, buscando en remolque1Plate (fallback)...`,
            );
            orphanPhoto = await this.anprService
              .getLatestOrphanPhoto('remolque1Plate')
              .toPromise();

            if (orphanPhoto) {
              console.log(
                `✅ [WEIGHING-FORM] Foto encontrada en remolque1Plate (fallback): ${orphanPhoto.photoUrl}`,
              );
            }
          }

          // Fallback para remolque2Plate: también buscar en remolque1Plate (igual que trailer 1 / trailerPlate2)
          // Varios orígenes: remolque2Plate, remolque1Plate; en continue-double-trailer la de R1 suele estar vinculada
          if (!orphanPhoto && photoType === 'remolque2Plate') {
            console.log(
              `🔄 [WEIGHING-FORM] No encontrado en remolque2Plate, buscando en remolque1Plate (fallback)...`,
            );
            orphanPhoto = await this.anprService
              .getLatestOrphanPhoto('remolque1Plate')
              .toPromise();

            if (orphanPhoto) {
              console.log(
                `✅ [WEIGHING-FORM] Foto remolque 2 encontrada en remolque1Plate (fallback): ${orphanPhoto.photoUrl}`,
              );
            }
          }

          if (orphanPhoto) {
            if (!orphanPhoto.photoUrl.includes('remolque1Plate')) {
              console.log(
                `✅ [WEIGHING-FORM] Foto encontrada en BD: ${orphanPhoto.photoUrl}`,
              );
            }

            // Guardar la foto de BD según el tipo
            if (photoType === 'trailerPlate') {
              this.photoData.trailerPlate = orphanPhoto.photoUrl;
              // Si viene la placa en la foto, también actualizarla en el formulario
              if (orphanPhoto.licensePlate) {
                this.weighingForm.patchValue({
                  trailerPlate: orphanPhoto.licensePlate,
                });
                console.log(
                  `🔤 [WEIGHING-FORM] Placa actualizada en formulario: ${orphanPhoto.licensePlate}`,
                );
              }
              // Actualizar estado de doble remolque si aplica
              if (
                this.weighingForm.get('doubleTrailer')?.value &&
                orphanPhoto.licensePlate
              ) {
                this.doubleTrailerState.trailerPlaca = orphanPhoto.licensePlate;
                this.doubleTrailerState.currentStep = 'remolque1';
              }
            } else if (photoType === 'trailerPlate2') {
              this.photoData.trailerPlate2 = orphanPhoto.photoUrl;
              // Si viene la placa en la foto, también actualizarla en el formulario
              if (orphanPhoto.licensePlate) {
                this.weighingForm.patchValue({
                  trailerPlate2: orphanPhoto.licensePlate,
                });
                console.log(
                  `🔤 [WEIGHING-FORM] Placa actualizada en formulario: ${orphanPhoto.licensePlate}`,
                );
              }
            } else if (photoType === 'remolque1Plate') {
              // DOBLE REMOLQUE: Guardar foto de remolque 1
              this.photoData.remolque1Plate = orphanPhoto.photoUrl;
              // Guardar photoId para excluirlo al buscar remolque2
              this.remolque1PhotoId = orphanPhoto.photoId;
              console.log(
                `💾 [WEIGHING-FORM] PhotoId de remolque1 guardado: ${this.remolque1PhotoId}`,
              );
              // Actualizar placa en formulario
              if (orphanPhoto.licensePlate) {
                this.weighingForm.patchValue({
                  remolque1Plate: orphanPhoto.licensePlate,
                });
                console.log(
                  `🔤 [WEIGHING-FORM] Placa de remolque1 actualizada: ${orphanPhoto.licensePlate}`,
                );
              }
              // Actualizar estado de doble remolque
              if (
                this.weighingForm.get('doubleTrailer')?.value &&
                orphanPhoto.licensePlate
              ) {
                this.doubleTrailerState.remolque1.placa =
                  orphanPhoto.licensePlate;
              }
            } else if (photoType === 'remolque2Plate') {
              // DOBLE REMOLQUE: Guardar foto de remolque 2
              this.photoData.remolque2Plate = orphanPhoto.photoUrl;
              // Actualizar placa en formulario
              if (orphanPhoto.licensePlate) {
                this.weighingForm.patchValue({
                  remolque2Plate: orphanPhoto.licensePlate,
                });
                console.log(
                  `🔤 [WEIGHING-FORM] Placa de remolque2 actualizada: ${orphanPhoto.licensePlate}`,
                );
              }
              // Actualizar estado de doble remolque
              if (
                this.weighingForm.get('doubleTrailer')?.value &&
                orphanPhoto.licensePlate
              ) {
                this.doubleTrailerState.remolque2.placa =
                  orphanPhoto.licensePlate;
              }
            }

            this.showToast(
              'success',
              'Foto obtenida',
              `Foto de ${plateTypeLabel} obtenida de base de datos`,
            );

            // Actualizar el estado de los pasos del proceso
            setTimeout(() => this.updateProcessStepsStatus(), 0);

            // EARLY RETURN: Si encontró foto en BD, no esperar SignalR
            console.log(
              `🚀 [WEIGHING-FORM] Foto encontrada en BD, retornando inmediatamente sin esperar SignalR`,
            );
            return;
          } else {
            console.log(
              `ℹ️ [WEIGHING-FORM] No hay fotos en BD para photoType: ${photoType}`,
            );
          }
        } else {
          console.log(
            `⚠️ [WEIGHING-FORM] Doble remolque detectado - NO buscar en BD para ${photoType}, solo SignalR`,
          );
        }

        // Paso 2: Si NO se encontró foto en BD, capturar fallback INMEDIATO + escuchar SignalR en background
        console.log(
          `🚀 [WEIGHING-FORM] No hay foto en BD, capturando fallback inmediato...`,
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
          if (photoType === 'trailerPlate') {
            fallbackPhotoUrl =
              await this.trailerCameraService.captureAndSaveTrailerPhotoAsync(
                photoType,
              );
            this.photoData.trailerPlate = fallbackPhotoUrl;
            this.weighingForm.patchValue({ trailerPlate: 'unknown' });
            if (this.weighingForm.get('doubleTrailer')?.value) {
              this.doubleTrailerState.trailerPlaca = 'unknown';
              this.doubleTrailerState.currentStep = 'remolque1';
            }
          } else if (
            photoType === 'trailerPlate2' ||
            photoType === 'remolque1Plate' ||
            photoType === 'remolque2Plate'
          ) {
            fallbackPhotoUrl =
              await this.trailerCameraService.captureAndSaveRemolquePhotoAsync(
                photoType,
              );

            if (photoType === 'trailerPlate2') {
              this.photoData.trailerPlate2 = fallbackPhotoUrl;
              this.weighingForm.patchValue({ trailerPlate2: 'unknown' });
            } else if (photoType === 'remolque1Plate') {
              this.photoData.remolque1Plate = fallbackPhotoUrl;
              this.weighingForm.patchValue({ remolque1Plate: 'unknown' });
              if (this.weighingForm.get('doubleTrailer')?.value) {
                this.doubleTrailerState.remolque1.placa = 'unknown';
                // Agregar foto sin sobrescribir las existentes (ej: foto de carga ya capturada)
                if (!this.doubleTrailerState.remolque1.fotos) {
                  this.doubleTrailerState.remolque1.fotos = [];
                }
                if (!this.doubleTrailerState.remolque1.fotos.includes(fallbackPhotoUrl)) {
                  this.doubleTrailerState.remolque1.fotos = [
                    ...this.doubleTrailerState.remolque1.fotos,
                    fallbackPhotoUrl
                  ];
                }
                this.doubleTrailerState.remolque1.fotoPlacaCapturada = true;
              }
            } else if (photoType === 'remolque2Plate') {
              this.photoData.remolque2Plate = fallbackPhotoUrl;
              this.weighingForm.patchValue({ remolque2Plate: 'unknown' });
              if (this.weighingForm.get('doubleTrailer')?.value) {
                this.doubleTrailerState.remolque2.placa = 'unknown';
                // Agregar foto sin sobrescribir las existentes (ej: foto de carga ya capturada)
                if (!this.doubleTrailerState.remolque2.fotos) {
                  this.doubleTrailerState.remolque2.fotos = [];
                }
                if (!this.doubleTrailerState.remolque2.fotos.includes(fallbackPhotoUrl)) {
                  this.doubleTrailerState.remolque2.fotos = [
                    ...this.doubleTrailerState.remolque2.fotos,
                    fallbackPhotoUrl
                  ];
                }
                this.doubleTrailerState.remolque2.fotoPlacaCapturada = true;
              }
            }
          }

          fallbackCaptured = true;
          console.log(
            `✅ [FALLBACK] Foto capturada inmediatamente: ${fallbackPhotoUrl}`,
          );
          this.showToast(
            'success',
            'Foto capturada',
            `Foto capturada. Esperando ANPR en segundo plano...`,
          );

          // Marcar para detección de cambios después del fallback
          this.cdr.markForCheck();

          // Actualizar el estado de los pasos del proceso
          setTimeout(() => this.updateProcessStepsStatus(), 0);
        } catch (fallbackError) {
          console.error(
            '❌ [FALLBACK] Error capturando fallback inmediato:',
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
          `🔄 [BACKGROUND] Iniciando escucha de SignalR en segundo plano (30s)...`,
        );

        // Iniciar captura ANPR en background (sin await - no bloquea)
        this.anprService
          .capturePlate(cameraType, 30000)
          .then((anprEvent: AnprEvent) => {
            // Si llega ANPR, REEMPLAZAR el fallback (solo si usuario sigue en la pantalla)
            console.log(
              `✅ [BACKGROUND] ANPR recibido después del fallback: ${anprEvent.licensePlate}`,
            );

            // Guardar la imagen URL según el tipo de foto (REEMPLAZA fallback)
            if (photoType === 'trailerPlate') {
              this.photoData.trailerPlate = anprEvent.imageUrl;
              this.manualEditDetector.markNextChangeAsAutomatic();
              this.weighingForm.patchValue({
                trailerPlate: anprEvent.licensePlate,
              });

              if (this.weighingForm.get('doubleTrailer')?.value) {
                this.doubleTrailerState.trailerPlaca = anprEvent.licensePlate;
                this.doubleTrailerState.currentStep = 'remolque1';
              }
            } else if (photoType === 'trailerPlate2') {
              this.photoData.trailerPlate2 = anprEvent.imageUrl;
              this.manualEditDetector.markNextChangeAsAutomatic();
              this.weighingForm.patchValue({
                trailerPlate2: anprEvent.licensePlate,
              });
            } else if (photoType === 'remolque1Plate') {
              this.photoData.remolque1Plate = anprEvent.imageUrl;
              this.manualEditDetector.markNextChangeAsAutomatic();
              this.weighingForm.patchValue({
                remolque1Plate: anprEvent.licensePlate,
              });

              if (this.weighingForm.get('doubleTrailer')?.value) {
                this.doubleTrailerState.remolque1.placa =
                  anprEvent.licensePlate;

                console.log('📸 [ANPR R1] Foto ANPR recibida:', anprEvent.imageUrl);
                console.log('📸 [ANPR R1] Fotos ANTES de agregar:', JSON.stringify(this.doubleTrailerState.remolque1.fotos));

                // Agregar foto sin sobrescribir las existentes (ej: foto de carga ya capturada)
                if (!this.doubleTrailerState.remolque1.fotos) {
                  this.doubleTrailerState.remolque1.fotos = [];
                }
                // Solo agregar si no existe ya en el array
                if (!this.doubleTrailerState.remolque1.fotos.includes(anprEvent.imageUrl)) {
                  this.doubleTrailerState.remolque1.fotos = [
                    ...this.doubleTrailerState.remolque1.fotos,
                    anprEvent.imageUrl
                  ];
                  console.log('📸 [ANPR R1] Foto ANPR agregada. Fotos DESPUÉS:', JSON.stringify(this.doubleTrailerState.remolque1.fotos));
                } else {
                  console.log('📸 [ANPR R1] Foto ANPR ya existe, NO se agrega');
                }
                this.doubleTrailerState.remolque1.fotoPlacaCapturada = true;
              }
            } else if (photoType === 'remolque2Plate') {
              this.photoData.remolque2Plate = anprEvent.imageUrl;
              this.manualEditDetector.markNextChangeAsAutomatic();
              this.weighingForm.patchValue({
                remolque2Plate: anprEvent.licensePlate,
              });

              if (this.weighingForm.get('doubleTrailer')?.value) {
                this.doubleTrailerState.remolque2.placa =
                  anprEvent.licensePlate;
                // Agregar foto sin sobrescribir las existentes (ej: foto de carga ya capturada)
                if (!this.doubleTrailerState.remolque2.fotos) {
                  this.doubleTrailerState.remolque2.fotos = [];
                }
                // Solo agregar si no existe ya en el array
                if (!this.doubleTrailerState.remolque2.fotos.includes(anprEvent.imageUrl)) {
                  this.doubleTrailerState.remolque2.fotos = [
                    ...this.doubleTrailerState.remolque2.fotos,
                    anprEvent.imageUrl
                  ];
                }
                this.doubleTrailerState.remolque2.fotoPlacaCapturada = true;
              }
            }

            console.log(
              '✅ [BACKGROUND] Foto actualizada con ANPR:',
              anprEvent.licensePlate,
            );
            this.showToast(
              'success',
              'Foto actualizada',
              `Placa ${anprEvent.licensePlate} detectada por ANPR con ${anprEvent.confidenceLevel}% de confianza`,
            );

            // Marcar para detección de cambios
            this.cdr.markForCheck();

            // Actualizar el estado de los pasos del proceso
            setTimeout(() => this.updateProcessStepsStatus(), 0);
          })
          .catch((error: any) => {
            // Si SignalR falla (timeout u otro error), ya tenemos el fallback
            console.log(
              `ℹ️ [BACKGROUND] SignalR timeout/error, manteniendo foto fallback`,
            );
            // NO mostrar error porque ya tenemos fallback capturado
          });

        // RETORNAR INMEDIATAMENTE - Usuario puede continuar con el fallback
        console.log(
          `🚀 [WEIGHING-FORM] Retornando inmediatamente con fallback, SignalR en background`,
        );
        return;
      } catch (error: any) {
        // Si falla la captura del fallback, mostrar error y continuar
        console.error('❌ Error en flujo de captura:', error);
        this.messageService.showError({
          title: 'Error de captura',
          message: 'No se pudo capturar foto desde la cámara',
          duration: 5000,
        });
      }

      // Actualizar el estado de los pasos del proceso
      setTimeout(() => this.updateProcessStepsStatus(), 0);
      return;
    }

    // Para otros tipos de foto, mantener el comportamiento mock actual
    if (photoType === 'trailerPlate') {
      this.photoData.trailerPlate = 'Foto capturada';
      const randomPlate = this.generateRandomPlate();
      this.manualEditDetector.markNextChangeAsAutomatic();
      this.weighingForm.patchValue({ trailerPlate: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);

      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.doubleTrailerState.trailerPlaca = randomPlate;
        this.doubleTrailerState.currentStep = 'remolque1';
      }
    } else if (photoType === 'remolque1Plate') {
      this.photoData.remolque1Plate = 'Foto capturada';
      // Generar placa aleatoria en lugar de estática
      const randomPlate = this.generateRandomPlate();

      // Marcar el siguiente cambio como automático (OCR)
      this.manualEditDetector.markNextChangeAsAutomatic();
      this.weighingForm.patchValue({ remolque1Plate: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);

      // Si es doble remolque, actualizar el estado del remolque 1
      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.doubleTrailerState.remolque1.placa = randomPlate;
        // Agregar foto sin sobrescribir las existentes (ej: foto de carga ya capturada)
        if (!this.doubleTrailerState.remolque1.fotos) {
          this.doubleTrailerState.remolque1.fotos = [];
        }
        if (!this.doubleTrailerState.remolque1.fotos.includes('foto_remolque1.jpg')) {
          this.doubleTrailerState.remolque1.fotos = [
            ...this.doubleTrailerState.remolque1.fotos,
            'foto_remolque1.jpg'
          ];
        }
        // Marcar que se capturó la foto de la placa del remolque 1
        this.doubleTrailerState.remolque1.fotoPlacaCapturada = true;
        // NO marcar fotosCapturadas aquí, solo se marca cuando se captura la foto de carga
        // this.doubleTrailerState.remolque1.fotosCapturadas = true;

        // Asegurar que estemos en el paso correcto para capturar peso
        if (this.doubleTrailerState.currentStep === 'trailer') {
          this.doubleTrailerState.currentStep = 'remolque1';
        }
      }
    } else if (photoType === 'remolque2Plate') {
      this.photoData.remolque2Plate = 'Foto capturada';
      // Generar placa aleatoria en lugar de estática
      const randomPlate = this.generateRandomPlate();

      // Marcar el siguiente cambio como automático (OCR)
      this.manualEditDetector.markNextChangeAsAutomatic();
      this.weighingForm.patchValue({ remolque2Plate: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);

      // Si es doble remolque, actualizar el estado del remolque 2
      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.doubleTrailerState.remolque2.placa = randomPlate;
        // Agregar foto sin sobrescribir las existentes (ej: foto de carga ya capturada)
        if (!this.doubleTrailerState.remolque2.fotos) {
          this.doubleTrailerState.remolque2.fotos = [];
        }
        if (!this.doubleTrailerState.remolque2.fotos.includes('foto_remolque2.jpg')) {
          this.doubleTrailerState.remolque2.fotos = [
            ...this.doubleTrailerState.remolque2.fotos,
            'foto_remolque2.jpg'
          ];
        }
        // Marcar que se capturó la foto de la placa del remolque 2
        this.doubleTrailerState.remolque2.fotoPlacaCapturada = true;
        // NO marcar fotosCapturadas aquí, solo se marca cuando se captura la foto de carga
        // this.doubleTrailerState.remolque2.fotosCapturadas = true;
      }

      // Marcar para detección de cambios
      this.cdr.markForCheck();
    } else if (photoType === 'cargo') {
      // Capturar foto real desde la cámara de carga
      try {
        this.showToast(
          'info',
          'Capturando foto',
          'Capturando foto de carga desde la cámara...',
        );

        const photoUrl =
          await this.cargoCameraService.captureAndSaveCargoPhotoAsync(
            'cargoEntry',
          );
        this.photoData.cargo = photoUrl;

        // Si es doble remolque y estamos en el paso del remolque 1,
        // actualizar el estado para indicar que se capturó la foto de carga
        if (
          this.weighingForm.get('doubleTrailer')?.value &&
          this.doubleTrailerState.currentStep === 'remolque1'
        ) {
          // Marcar que se capturó la foto de carga del remolque 1
          if (!this.doubleTrailerState.remolque1.fotos) {
            this.doubleTrailerState.remolque1.fotos = [];
          }
          this.doubleTrailerState.remolque1.fotos = [
            ...this.doubleTrailerState.remolque1.fotos,
            photoUrl,
          ];
          // También marcar que se capturó la foto de carga del remolque 1
          this.doubleTrailerState.remolque1.fotoCargaCapturada = true;
        }

        this.showToast(
          'success',
          'Foto capturada',
          'Foto de carga capturada exitosamente',
        );

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
      } catch (error) {
        console.error('Error capturando foto de carga:', error);
        this.showToast(
          'error',
          'Error de captura',
          'Error al capturar foto de carga desde la cámara',
        );
      }
    } else if (photoType === 'cargoRemolque1') {
      // Capturar foto real desde la cámara de carga para remolque 1
      try {
        this.showToast(
          'info',
          'Capturando foto',
          'Capturando foto de carga del remolque 1 desde la cámara...',
        );

        const photoUrl =
          await this.cargoCameraService.captureAndSaveCargoPhotoAsync(
            'cargoRemolque1',
          );
        this.photoData.cargoRemolque1 = photoUrl;

        console.log('📸 [CARGO R1] Foto de carga capturada:', photoUrl);
        console.log('📸 [CARGO R1] Fotos ANTES de agregar:', JSON.stringify(this.doubleTrailerState.remolque1.fotos));

        // Actualizar el estado del remolque 1
        if (this.weighingForm.get('doubleTrailer')?.value) {
          if (!this.doubleTrailerState.remolque1.fotos) {
            this.doubleTrailerState.remolque1.fotos = [];
          }
          this.doubleTrailerState.remolque1.fotos = [
            ...this.doubleTrailerState.remolque1.fotos,
            photoUrl,
          ];
          this.doubleTrailerState.remolque1.fotoCargaCapturada = true;

          console.log('📸 [CARGO R1] Fotos DESPUÉS de agregar:', JSON.stringify(this.doubleTrailerState.remolque1.fotos));
        } else {
          console.warn('⚠️ [CARGO R1] NO es doble remolque o checkbox no marcado');
        }

        this.showToast(
          'success',
          'Foto capturada',
          'Foto de carga del remolque 1 capturada exitosamente',
        );

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
      } catch (error) {
        console.error('Error capturando foto de carga del remolque 1:', error);
        this.showToast(
          'error',
          'Error de captura',
          'Error al capturar foto de carga del remolque 1 desde la cámara',
        );
      }
    } else if (photoType === 'cargoRemolque2') {
      // Capturar foto real desde la cámara de carga para remolque 2
      try {
        this.showToast(
          'info',
          'Capturando foto',
          'Capturando foto de carga del remolque 2 desde la cámara...',
        );

        const photoUrl =
          await this.cargoCameraService.captureAndSaveCargoPhotoAsync(
            'cargoRemolque2',
          );
        this.photoData.cargoRemolque2 = photoUrl;

        // Si es doble remolque, actualizar el estado del remolque 2
        if (this.weighingForm.get('doubleTrailer')?.value) {
          if (!this.doubleTrailerState.remolque2.fotos) {
            this.doubleTrailerState.remolque2.fotos = [];
          }
          this.doubleTrailerState.remolque2.fotos = [
            ...this.doubleTrailerState.remolque2.fotos,
            photoUrl,
          ];
          this.doubleTrailerState.remolque2.fotoCargaCapturada = true;
        }

        this.showToast(
          'success',
          'Foto capturada',
          'Foto de carga del remolque 2 capturada exitosamente',
        );

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
      } catch (error) {
        console.error('Error capturando foto de carga del remolque 2:', error);
        this.showToast(
          'error',
          'Error de captura',
          'Error al capturar foto de carga desde la cámara',
        );
      }
    } else if (photoType === 'trailerPlate2') {
      this.photoData.trailerPlate2 = 'Foto capturada';
      // Generar placa aleatoria en lugar de estática
      const randomPlate = this.generateRandomPlate();

      // Marcar el siguiente cambio como automático (OCR)
      this.manualEditDetector.markNextChangeAsAutomatic();
      this.weighingForm.patchValue({ trailerPlate2: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);
    }

    // Actualizar el estado de los pasos del proceso
    setTimeout(() => this.updateProcessStepsStatus(), 0);
  }

  onEnableManualEdit(
    plateType:
      | 'trailerPlate'
      | 'trailerPlate2'
      | 'remolque1Plate'
      | 'remolque2Plate',
  ): void {
    // Habilitar edición manual del campo de placa
    this.manualEditEnabled[plateType] = true;

    // Marcar los siguientes cambios en este campo como manuales
    this.manualEditDetector.markNextChangeAsManual();

    console.log(`Edición manual habilitada para: ${plateType}`);

    // Enfocar el campo para que el usuario pueda editarlo inmediatamente
    setTimeout(() => {
      const fieldElement = document.querySelector(
        `input[formControlName="${plateType}"]`,
      ) as HTMLInputElement;
      if (fieldElement) {
        fieldElement.focus();
        fieldElement.select(); // Seleccionar todo el texto para facilitar la edición
      }
    }, 100);
  }

  onSave(): void {
    // En modo continue, permitir guardado sin validar weightData.capturedWeight
    const canSaveInContinueMode =
      this.currentOperationFolio &&
      this.weighingForm.get('doubleTrailer')?.value &&
      this.doubleTrailerState.remolque2.pesoCapturado;

    if (
      (this.weighingForm.valid && this.weightData.capturedWeight) ||
      canSaveInContinueMode
    ) {
      this.isLoading = true;

      // Usar getRawValue() para incluir campos deshabilitados (ej: trailerPlate2 en modo containerOnly)
      const formData = this.weighingForm.getRawValue();

      // Si hay ediciones manuales, incluir información del usuario
      if (this.hasManualEdits) {
        console.log(
          '⚠️ Formulario tiene ediciones manuales, se marcará como editado',
        );
      }

      if (this.operationType === 'entry') {
        if (formData.doubleTrailer) {
          // Flujo de doble remolque
          this.saveDoubleTrailerEntry(formData);
        } else {
          // Flujo normal
          this.saveNormalEntry(formData);
        }
      } else if (this.operationType === 'exit') {
        // Validar y registrar salida
        if (formData.doubleTrailer) {
          // Flujo de salida con doble remolque
          this.saveDoubleTrailerExit(formData);
        } else {
          // Flujo de salida normal
          this.saveNormalExit(formData);
        }
      }
    } else {
      console.log('❌ onSave bloqueado - Validaciones:', {
        formValid: this.weighingForm.valid,
        capturedWeight: this.weightData.capturedWeight,
        currentOperationFolio: this.currentOperationFolio,
        remolque2Peso: this.doubleTrailerState.remolque2.pesoCapturado,
      });
      this.markFormGroupTouched();
    }
  }

  private saveDoubleTrailerEntry(formData: Record<string, unknown>): void {
    // Si estamos en modo continue (completando remolque 2), usar endpoint específico
    if (this.currentOperationFolio) {
      this.submitContinueDoubleTrailer(formData);
      return;
    }

    if (!this.doubleTrailerState.isComplete) {
      this.showToast(
        'error',
        'Datos incompletos',
        'Debe completar el pesaje de ambos remolques antes de guardar.',
      );
      this.isLoading = false;
      return;
    }

    const entradaData: CreateDoubleTrailerEntryRequest = {
      unitType: this.unitType as 'client' | 'provider',
      tipoUnidad: 'doble-remolque',
      trailerPlaca: this.doubleTrailerState.trailerPlaca,
      trailerPlacaFoto: this.photoData.trailerPlate, // Foto ANPR del tráiler
      remolques: [
        {
          numero: this.doubleTrailerState.remolque1.numero || 1,
          placa: this.doubleTrailerState.remolque1.placa || '',
          pesoBruto: this.doubleTrailerState.remolque1.pesoBruto || 0,
          fotos: this.doubleTrailerState.remolque1.fotos || [],
          pesoCapturado:
            this.doubleTrailerState.remolque1.pesoCapturado || false,
          fotosCapturadas:
            this.doubleTrailerState.remolque1.fotosCapturadas || false,
          fotoCargaCapturada:
            this.doubleTrailerState.remolque1.fotoCargaCapturada || false,
          fotoPlacaCapturada:
            this.doubleTrailerState.remolque1.fotoPlacaCapturada || false,
        },
        {
          numero: this.doubleTrailerState.remolque2.numero || 2,
          placa: this.doubleTrailerState.remolque2.placa || '',
          pesoBruto: this.doubleTrailerState.remolque2.pesoBruto || 0,
          fotos: this.doubleTrailerState.remolque2.fotos || [],
          pesoCapturado:
            this.doubleTrailerState.remolque2.pesoCapturado || false,
          fotosCapturadas:
            this.doubleTrailerState.remolque2.fotosCapturadas || false,
          fotoCargaCapturada:
            this.doubleTrailerState.remolque2.fotoCargaCapturada || false,
          fotoPlacaCapturada:
            this.doubleTrailerState.remolque2.fotoPlacaCapturada || false,
        },
      ],
      pesoBrutoTotal: this.doubleTrailerState.pesoBrutoTotal,
      product: formData['product'] as string,
      clientProviderName: formData['clientProviderName'] as string,
      // Incluir información de edición manual
      tieneEdicionesManuale: this.hasManualEdits,
      usuarioEditor: this.hasManualEdits ? undefined : undefined, // Se asignará en el backend desde JWT
    };

    this.weighingService.createDoubleTrailerEntry(entradaData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Entrada con doble remolque registrada:', response);

        // Guardar el ID de la operación para futuras ediciones manuales
        this.currentOperationId = response.id;

        // El interceptor ya procesó la respuesta y extrajo solo los datos
        this.showToast(
          'success',
          'Entrada registrada',
          `Entrada con doble remolque registrada exitosamente. Folio: ${response.folio}`,
        );

        // Generar ticket para entrada con doble remolque
        this.generateTicket('double', response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar entrada con doble remolque:', error);

        let errorMessage = 'No se pudo completar la operación.';
        if (error.status === 409) {
          errorMessage =
            'La placa ya tiene una entrada registrada previamente.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error al registrar', errorMessage);
      },
    });
  }

  /**
   * Completar entrada de doble remolque con remolque 2 (modo continue)
   */
  private submitContinueDoubleTrailer(formData: Record<string, unknown>): void {
    if (!this.doubleTrailerState.remolque2.pesoCapturado) {
      this.showToast(
        'error',
        'Datos incompletos',
        'Debe capturar el peso del remolque 2 antes de guardar.',
      );
      this.isLoading = false;
      return;
    }

    const request: ContinueDoubleTrailerEntryRequest = {
      folio: this.currentOperationFolio!,
      remolque2: {
        numero: 2,
        placa: this.doubleTrailerState.remolque2.placa || '',
        pesoBruto: this.doubleTrailerState.remolque2.pesoBruto || 0,
        fotos: this.doubleTrailerState.remolque2.fotos || [],
        pesoCapturado: this.doubleTrailerState.remolque2.pesoCapturado || false,
        fotosCapturadas:
          this.doubleTrailerState.remolque2.fotosCapturadas || false,
        fotoCargaCapturada:
          this.doubleTrailerState.remolque2.fotoCargaCapturada || false,
        fotoPlacaCapturada:
          this.doubleTrailerState.remolque2.fotoPlacaCapturada || false,
      },
      tieneEdicionesManuale: this.hasManualEdits,
    };

    console.log('🔄 Continuando entrada de doble remolque:', request);

    this.weighingService.continueDoubleTrailerEntry(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('✅ Doble remolque completado:', response);

        // Guardar el ID de la operación
        this.currentOperationId = response.id;

        this.showToast(
          'success',
          'Operación completada',
          `Doble remolque completado exitosamente. Folio: ${response.folio}`,
        );

        // Generar ticket para entrada con doble remolque completada
        this.generateTicket('double', response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error al completar doble remolque:', error);

        let errorMessage = 'No se pudo completar la operación.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error al completar', errorMessage);
      },
    });
  }

  /**
   * Guardar entrada parcial de doble remolque (solo remolque 1)
   */
  savePartialDoubleTrailerEntry(): void {
    // Validar que todos los datos necesarios estén completos
    if (!this.canSavePartialRemolque1()) {
      this.showToast(
        'error',
        'Datos incompletos',
        'Complete todos los campos obligatorios del remolque 1 antes de guardar',
      );
      return;
    }

    this.isLoading = true;

    const formData = this.weighingForm.value;

    const request: CreatePartialDoubleTrailerEntryRequest = {
      unitType: this.unitType as 'client' | 'provider',
      tipoUnidad: 'doble-remolque',
      trailerPlaca: this.doubleTrailerState.trailerPlaca,
      trailerPlacaFoto: this.photoData.trailerPlate || undefined,
      remolque1: {
        numero: 1,
        placa: this.doubleTrailerState.remolque1.placa || '',
        pesoBruto: this.doubleTrailerState.remolque1.pesoBruto || 0,
        fotos: this.doubleTrailerState.remolque1.fotos || [],
        pesoCapturado: this.doubleTrailerState.remolque1.pesoCapturado || false,
        fotosCapturadas:
          this.doubleTrailerState.remolque1.fotosCapturadas || false,
        fotoCargaCapturada:
          this.doubleTrailerState.remolque1.fotoCargaCapturada || false,
        fotoPlacaCapturada:
          this.doubleTrailerState.remolque1.fotoPlacaCapturada || false,
      },
      product: formData['product'] as string,
      clientProviderName: formData['clientProviderName'] as string,
      clientProviderRfc: (formData['clientProviderRfc'] as string) || undefined,
      tieneEdicionesManuale: this.hasManualEdits,
    };

    console.log('🔄 [SAVE R1] Guardando entrada parcial de doble remolque');
    console.log('📸 [SAVE R1] Fotos en request.remolque1.fotos:', JSON.stringify(request.remolque1.fotos));
    console.log('📸 [SAVE R1] fotoCargaCapturada:', request.remolque1.fotoCargaCapturada);
    console.log('📸 [SAVE R1] fotoPlacaCapturada:', request.remolque1.fotoPlacaCapturada);
    console.log('🔄 [SAVE R1] Request completo:', JSON.stringify(request, null, 2));

    this.weighingService.createPartialDoubleTrailerEntry(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('✅ Entrada parcial registrada:', response);

        this.showToast(
          'success',
          'Remolque 1 guardado',
          `Remolque 1 registrado exitosamente. Folio: ${response?.folio ?? response?.data?.folio ?? 'N/A'}. Puede continuar con remolque 2 posteriormente.`,
        );

        // Redirigir igual que "Guardar entrada" (mismo flujo y destino)
        setTimeout(() => {
          this.onGoBack();
        }, 1500);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error al guardar entrada parcial:', error);

        let errorMessage = 'No se pudo guardar la entrada parcial.';
        if (error.status === 409) {
          errorMessage =
            'La placa ya tiene una entrada registrada previamente.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error al guardar', errorMessage);
      },
    });
  }

  /**
   * Guardar salida parcial de doble remolque (solo remolque 1).
   * Comportamiento equivalente al de entrada: validar, enviar y redirigir.
   */
  savePartialDoubleTrailerExit(): void {
    if (!this.canSavePartialRemolque1()) {
      this.showToast(
        'error',
        'Datos incompletos',
        'Complete todos los campos obligatorios del remolque 1 antes de guardar',
      );
      return;
    }

    const entryFolio = this.weightData.entryFolio;
    if (!entryFolio) {
      this.showToast(
        'error',
        'Entrada no encontrada',
        'No se encontró el folio de entrada. Capture la placa para cargar la operación previa.',
      );
      return;
    }

    this.isLoading = true;

    const request: CreatePartialDoubleTrailerExitRequest = {
      folio: entryFolio,
      placaTrailer: this.doubleTrailerState.trailerPlaca,
      remolque1: {
        placa: this.doubleTrailerState.remolque1.placa || '',
        pesoTara: this.doubleTrailerState.remolque1.pesoBruto || 0,
        fotoCargaCapturada:
          this.doubleTrailerState.remolque1.fotoCargaCapturada ?? false,
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
        const folio =
          (response as { folio?: string })?.folio ??
          (response as { data?: { folio?: string } })?.data?.folio ??
          'N/A';
        this.showToast(
          'success',
          'Remolque 1 guardado',
          `Salida parcial (remolque 1) registrada. Folio: ${folio}. Puede continuar con remolque 2 posteriormente.`,
        );
        setTimeout(() => {
          this.onGoBack();
        }, 1500);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al guardar salida parcial:', error);
        let errorMessage = 'No se pudo guardar la salida parcial.';
        if (error.status === 409) {
          errorMessage = 'La operación ya tiene salida registrada.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.showToast('error', 'Error al guardar', errorMessage);
      },
    });
  }

  /**
   * Verificar si se puede guardar parcialmente el remolque 1
   */
  canSavePartialRemolque1(): boolean {
    const formData = this.weighingForm.value;
    const product = formData['product'] as string;
    const clientProviderName = formData['clientProviderName'] as string;

    return !!(
      this.doubleTrailerState.trailerPlaca &&
      this.doubleTrailerState.remolque1.placa &&
      (this.doubleTrailerState.remolque1.pesoBruto ?? 0) > 0 &&
      this.doubleTrailerState.remolque1.pesoCapturado &&
      product &&
      clientProviderName
    );
  }

  private saveNormalEntry(formData: Record<string, unknown>): void {
    const tipoUnidad = formData['containerOnly']
      ? 'contenedor'
      : formData['doubleTrailer']
        ? 'doble-remolque'
        : 'remolque';

    const entryRequest: CreateEntryRequest = {
      unitType: this.unitType as 'client' | 'provider',
      operationType: 'entry',
      tipoUnidad: tipoUnidad,
      trailerPlate: formData['trailerPlate'] as string,
      trailerPlate2: (formData['trailerPlate2'] as string) || undefined,
      product: formData['product'] as string,
      clientProviderName: formData['clientProviderName'] as string,
      entryWeight: this.weightData.capturedWeight || 0,
      photos: {
        trailerPlate: this.photoData.trailerPlate || undefined,
        trailerPlate2: this.photoData.trailerPlate2 || undefined,
        cargo: this.photoData.cargo || '',
      },
      tieneEdicionesManuale: this.hasManualEdits,
    };

    this.weighingService.createEntryOperation(entryRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Entrada registrada:', response);

        this.currentOperationId = response.id;
        this.showToast(
          'success',
          'Entrada registrada',
          `Entrada registrada exitosamente. Folio: ${response.folio}`,
        );
        this.generateTicket('normal', response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar entrada:', error);

        let errorMessage = 'No se pudo completar la operación.';
        if (error.status === 409) {
          errorMessage =
            'La placa ya tiene una entrada registrada previamente.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error al registrar', errorMessage);
      },
    });
  }

  private saveNormalExit(formData: Record<string, unknown>): void {
    if (!this.weightData.capturedWeight) {
      this.isLoading = false;
      this.showToast(
        'error',
        'Error de validación',
        'Debe capturar el peso de salida.',
      );
      return;
    }

    // Determinar tipo de unidad basado en checkboxes
    const tipoUnidad = formData['containerOnly'] ? 'contenedor' : 'remolque';

    // Calcular peso neto (peso entrada - peso salida)
    const pesoNeto =
      (this.weightData.entryWeight || 0) -
      (this.weightData.capturedWeight || 0);

    // Crear request para el backend
    const exitRequest: CreateExitRequest = {
      folio: '', // Se generará en el backend
      pesoBruto: this.weightData.capturedWeight,
      pesoTara: this.weightData.capturedWeight, // Peso de salida es tara
      pesoNeto: Math.abs(pesoNeto), // Valor absoluto del peso neto
      placaTrailer: formData['trailerPlate'] as string,
      placaRemolque: (formData['trailerPlate2'] as string) || undefined,
      placaContenedor: formData['containerOnly']
        ? (formData['trailerPlate'] as string)
        : undefined,
      placaTrailerContenedor: formData['containerOnly']
        ? (formData['trailerPlate'] as string)
        : undefined,
      placaRemolqueContenedor: formData['containerOnly']
        ? (formData['trailerPlate2'] as string)
        : undefined,
      fotos: {
        trailerPlate: this.photoData.trailerPlate || undefined,
        trailerPlate2: this.photoData.trailerPlate2 || undefined,
        cargoState: this.photoData.cargo || '',
        containerPlate: formData['containerOnly']
          ? (formData['trailerPlate'] as string)
          : undefined,
      },
      estado: 'SALIDA_REGISTRADA',
      fechaSalida: new Date().toISOString(),
      tipoUnidad: tipoUnidad,
    };

    this.weighingService.createExitOperation(exitRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Salida registrada:', response);

        // El interceptor ya procesó la respuesta y extrajo solo los datos
        this.showToast(
          'success',
          'Salida registrada',
          `Salida registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
        );

        // Generar ticket para salida normal
        this.generateTicket('exit', response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar salida:', error);

        let errorMessage = 'No se pudo completar la operación.';
        if (error.status === 404) {
          errorMessage = 'No se encontró la entrada previa para esta placa.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.showToast('error', 'Error al registrar', errorMessage);
      },
    });
  }

  private saveDoubleTrailerExit(formData: Record<string, unknown>): void {
    // Validar entrada previa
    if (!this.weightData.hasValidEntry || !this.weightData.entryWeight) {
      this.isLoading = false;
      this.showToast(
        'error',
        'Error de validación',
        'No se encontró entrada previa válida para esta placa.',
      );
      return;
    }

    // Calcular peso neto total (peso entrada - peso salida total)
    const pesoNetoCalculado =
      this.weightData.entryWeight - this.doubleTrailerState.pesoBrutoTotal;

    const exitRequest: CreateDoubleTrailerExitRequest = {
      folio: '', // Se generará en el backend
      placaTrailer: this.doubleTrailerState.trailerPlaca,
      remolque1: {
        placa: this.doubleTrailerState.remolque1.placa || '',
        pesoTara: this.doubleTrailerState.remolque1.pesoBruto || 0,
        fotoCargaCapturada:
          this.doubleTrailerState.remolque1.fotoCargaCapturada || false,
      },
      remolque2: {
        placa: this.doubleTrailerState.remolque2.placa || '',
        pesoTara: this.doubleTrailerState.remolque2.pesoBruto || 0,
        fotoCargaCapturada:
          this.doubleTrailerState.remolque2.fotoCargaCapturada || false,
      },
      pesoBrutoTotal: this.doubleTrailerState.pesoBrutoTotal,
      pesoNetoCalculado: Math.abs(pesoNetoCalculado),
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
      next: (response) => {
        this.isLoading = false;
        console.log('Salida con doble remolque registrada:', response);

        // El interceptor ya procesó la respuesta
        this.showToast(
          'success',
          'Salida registrada',
          `Salida con doble remolque registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
        );

        // Generar ticket para salida con doble remolque
        this.generateTicket('double-exit', response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar salida con doble remolque:', error);

        let errorMessage = 'No se pudo completar la operación.';
        if (error.status === 404) {
          errorMessage = 'No se encontró la entrada previa para esta placa.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.messageService.showErrorToast({
          title: 'Error al registrar',
          message: errorMessage,
          position: 'top-right',
        });
      },
    });
  }

  private generateTicket(
    type: 'double' | 'normal' | 'exit' | 'double-exit',
    operation: any,
  ): void {
    // TODO: Implementar generación de ticket PDF con QR
    console.log(`Generando ticket para operación tipo: ${type}`, operation);

    // Mostrar mensaje de éxito según el tipo de operación
    let message = '';
    switch (type) {
      case 'double':
        message = `Entrada con doble remolque registrada exitosamente. Folio: ${
          operation?.folio || 'N/A'
        }`;
        break;
      case 'normal':
        message = `Entrada normal registrada exitosamente. Folio: ${
          operation?.folio || 'N/A'
        }`;
        break;
      case 'exit':
        message = `Salida registrada exitosamente. Folio: ${
          operation?.folio || 'N/A'
        }. Peso neto: ${operation?.pesoNeto || 0} kg`;
        break;
      case 'double-exit':
        message = `Salida con doble remolque registrada exitosamente. Folio: ${
          operation?.folio || 'N/A'
        }. Peso neto: ${operation?.pesoNeto || 0} kg`;
        break;
    }

    // Mostrar mensaje de éxito
    this.showToast('success', 'Operación registrada', message);
    console.log('✅ Toast de éxito enviado desde showSuccessMessage');

    // Esperar 1.5 segundos para que el usuario vea el mensaje antes de redirigir
    setTimeout(() => {
      console.log('🔄 Redirigiendo desde showSuccessMessage...');
      this.onGoBack();
    }, 1500);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.weighingForm.controls).forEach((key) => {
      const control = this.weighingForm.get(key);
      control?.markAsTouched();
    });
  }

  onClear(): void {
    this.weighingForm.reset();
    this.weightData.capturedWeight = undefined;
    this.photoData = {
      trailerPlate: '',
      trailerPlate2: '',
      cargo: '',
      remolque1Plate: '',
      remolque2Plate: '',
      cargoRemolque1: '',
      cargoRemolque2: '',
    };

    // Resetear estado de doble remolque si está activo
    if (this.weighingForm.get('doubleTrailer')?.value) {
      this.resetDoubleTrailerState();
    }

    // Actualizar el estado de los pasos del proceso
    setTimeout(() => this.updateProcessStepsStatus(), 0);
  }

  onGoBack(): void {
    this.router.navigate(['/operation-selection', this.unitType]);
  }

  private validateFlow(): void {
    const flowValidation = this.weighingFlowService.validateFlow();
    if (!flowValidation.isValid) {
      console.warn('Flujo inválido:', flowValidation.missingSteps);
      // Redirigir al dashboard si el flujo no es válido
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Carga una operación parcial de doble remolque para continuar con el remolque 2
   * Reutiliza toda la lógica de captura de peso/fotos existente
   */
  private loadPartialOperationForContinue(folio: string): void {
    this.isLoading = true;

    this.weighingService.getPendingDoubleTrailerByFolio(folio).subscribe({
      next: (operation) => {
        console.log('✅ Operación parcial cargada:', operation);

        // Configurar tipo y operación
        this.unitType = 'client'; // Las operaciones parciales son siempre de cliente por ahora
        this.operationType = 'entry';
        this.updateTitles();

        // Inicializar formulario
        this.initializeForm();

        // Iniciar servicios de peso en tiempo real
        this.startRealtimeWeightUpdates();

        // Precargar datos existentes de la operación
        this.weighingForm.patchValue({
          doubleTrailer: true,
          trailerPlate: operation.trailerPlaca,
          product: operation.product,
          clientProviderName: operation.clientProviderName,
          comments: operation.comments || '',
          remolque1Plate: operation.remolque1.placa,
        });

        // Deshabilitar campos de datos generales y tipo de unidad (solo lectura)
        this.weighingForm.get('product')?.disable();
        this.weighingForm.get('clientProviderName')?.disable();
        this.weighingForm.get('comments')?.disable();
        this.weighingForm.get('doubleTrailer')?.disable();
        this.weighingForm.get('containerOnly')?.disable();

        // Configurar estado de doble remolque - CLAVE: empezar en remolque2
        this.doubleTrailerState = {
          currentStep: 'remolque2',
          trailerPlaca: operation.trailerPlaca,
          remolque1: {
            numero: 1,
            placa: operation.remolque1.placa,
            pesoBruto: operation.remolque1.pesoBruto,
            fotos: operation.remolque1.fotos || [],
            pesoCapturado: true,
            fotoCargaCapturada: true,
            fotoPlacaCapturada: true,
            fotosCapturadas: true,
          },
          remolque2: {
            numero: 2,
            placa: '',
            pesoBruto: 0,
            fotos: [],
            fotoCargaCapturada: false,
            fotoPlacaCapturada: false,
            fotosCapturadas: false,
          },
          pesoBrutoTotal: 0,
          isComplete: false,
        };

        // Guardar folio para el submit
        this.currentOperationFolio = folio;

        // Configurar detección de edición manual
        this.setupManualEditDetection();

        // Configurar búsqueda de productos con debounce
        this.setupProductSearch();

        // Configurar búsqueda de clientes/proveedores con debounce
        this.setupClientSearch();

        // Actualizar estado de pasos
        setTimeout(() => this.updateProcessStepsStatus(), 100);

        this.isLoading = false;
        this.cdr.markForCheck();

        this.notificationService.showInfo(
          'Continuando operación',
          `Remolque 1 ya registrado (${operation.remolque1.placa}). Ahora capture remolque 2.`,
        );
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Error al cargar operación parcial:', err);
        this.notificationService.showError(
          'Error',
          'No se pudo cargar la operación parcial. Verifique el folio.',
        );
        this.router.navigate(['/dashboard']);
      },
    });
  }

  onQueries(): void {
    console.log('Navegando a consultas...');
    this.router.navigate(['/weighing-query']);
  }

  onAdmin(): void {
    this.router.navigate(['/admin']);
  }

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

  // Getters para validaciones
  getFieldError(fieldName: string): string {
    const field = this.weighingForm.get(fieldName);
    const isContainerOnly = this.weighingForm.get('containerOnly')?.value;

    // Si es solo contenedor, no mostrar errores de placas
    if (
      isContainerOnly &&
      (fieldName === 'trailerPlate' || fieldName === 'trailerPlate2')
    ) {
      return '';
    }

    if (field?.invalid && field?.touched) {
      if (field.errors?.['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors?.['pattern']) {
        return 'Formato de placa inválido';
      }
      if (field.errors?.['invalidPlate']) {
        return 'Solo se permiten letras, números y guion medio (-)';
      }
      if (field.errors?.['maxLength']) {
        return 'La placa no puede exceder 12 caracteres';
      }
    }
    return '';
  }

  get isFormValid(): boolean {
    const isContainerOnly = this.weighingForm.get('containerOnly')?.value;
    const isDoubleTrailer = this.weighingForm.get('doubleTrailer')?.value;

    // FLUJO SOLO CONTENEDOR: placa tráiler, producto, cliente y peso obligatorios
    // Foto de carga es OPCIONAL
    if (isContainerOnly) {
      return (
        this.weighingForm.valid && this.weightData.capturedWeight !== undefined
      );
    }

    // FLUJO DOBLE REMOLQUE: validar campos obligatorios únicamente
    // Obligatorios: producto, cliente, placa tráiler, placas remolques y pesos
    // Opcionales: fotos
    if (isDoubleTrailer) {
      // MODO CONTINUE: Solo validar remolque 2 (remolque 1 ya está registrado)
      if (this.currentOperationFolio) {
        const validations = {
          remolque2Placa: !!this.doubleTrailerState.remolque2.placa,
          remolque2Peso: !!this.doubleTrailerState.remolque2.pesoCapturado,
        };

        console.log(
          '🔍 isFormValid - Modo Continue (solo remolque 2):',
          validations,
        );

        const result = validations.remolque2Placa && validations.remolque2Peso;

        console.log('🔍 isFormValid result (continue):', result);

        return result;
      }

      // MODO NORMAL: Validar ambos remolques
      const validations = {
        formValid: this.weighingForm.valid,
        isComplete: this.doubleTrailerState.isComplete,
        trailerPlaca: !!this.doubleTrailerState.trailerPlaca,
        remolque1Placa: !!this.doubleTrailerState.remolque1.placa,
        remolque2Placa: !!this.doubleTrailerState.remolque2.placa,
        remolque1Peso: !!this.doubleTrailerState.remolque1.pesoCapturado,
        remolque2Peso: !!this.doubleTrailerState.remolque2.pesoCapturado,
      };

      console.log('🔍 isFormValid - Doble Remolque:', validations);

      // Si el formulario no es válido, mostrar qué campos están fallando
      if (!this.weighingForm.valid) {
        const invalidFields: string[] = [];
        Object.keys(this.weighingForm.controls).forEach((key) => {
          const control = this.weighingForm.get(key);
          if (control && control.invalid) {
            invalidFields.push(`${key}: ${JSON.stringify(control.errors)}`);
          }
        });
        console.log('❌ Campos inválidos del formulario:', invalidFields);
      }

      const result =
        validations.formValid &&
        validations.isComplete &&
        validations.trailerPlaca &&
        validations.remolque1Placa &&
        validations.remolque2Placa &&
        validations.remolque1Peso &&
        validations.remolque2Peso;

      console.log('🔍 isFormValid result:', result);

      return result;
    }

    // FLUJO REMOLQUE ÚNICO: Solo campos del formulario + peso capturado
    // Las fotos son OPCIONALES
    return (
      this.weighingForm.valid && this.weightData.capturedWeight !== undefined
    );
  }

  get canProceedToNextStep(): boolean {
    if (!this.weighingForm.get('doubleTrailer')?.value) return false;

    switch (this.doubleTrailerState.currentStep) {
      case 'trailer':
        return !!this.doubleTrailerState.trailerPlaca;
      case 'remolque1':
        return !!(
          this.doubleTrailerState.remolque1.pesoCapturado &&
          this.doubleTrailerState.remolque1.fotoCargaCapturada
        );
      case 'remolque2':
        return !!(
          this.doubleTrailerState.remolque2.pesoCapturado &&
          this.doubleTrailerState.remolque2.fotoCargaCapturada
        );
      default:
        return false;
    }
  }

  get showDoubleTrailerInstructions(): boolean {
    return (
      this.weighingForm.get('doubleTrailer')?.value &&
      this.doubleTrailerState.currentStep !== 'complete'
    );
  }

  get showDoubleTrailerSummary(): boolean {
    return (
      this.weighingForm.get('doubleTrailer')?.value &&
      this.doubleTrailerState.currentStep === 'complete'
    );
  }

  /**
   * Oculta el panel tipo checklist
   */
  hideChecklistPanel(): void {
    this.showChecklistPanel = false;
  }

  /**
   * Determina el tipo de flujo para el componente de pasos del proceso
   */
  getProcessFlowType(): 'container-only' | 'single-trailer' | 'double-trailer' {
    if (this.weighingForm.get('containerOnly')?.value) {
      return 'container-only';
    } else if (this.weighingForm.get('doubleTrailer')?.value) {
      return 'double-trailer';
    } else {
      return 'single-trailer';
    }
  }

  /**
   * Determina el paso actual del proceso
   */
  getCurrentProcessStep(): string {
    if (this.weighingForm.get('doubleTrailer')?.value) {
      return this.doubleTrailerState.currentStep;
    }
    return '';
  }

  /**
   * Actualiza el estado de los pasos del proceso
   */
  updateProcessStepsStatus(): void {
    const flowType = this.getProcessFlowType();
    this.updateStepStatuses(flowType);
  }

  /**
   * Actualiza el estado de los pasos según el tipo de flujo
   */
  private updateStepStatuses(
    flowType: 'container-only' | 'single-trailer' | 'double-trailer',
  ): void {
    this.stepStatuses = {};

    switch (flowType) {
      case 'container-only':
        this.stepStatuses = {
          product: !!this.weighingForm.get('product')?.value,
          client: !!this.weighingForm.get('clientProviderName')?.value,
          'cargo-photo': !!this.photoData.cargo,
          weight: this.weightData.capturedWeight !== undefined,
        };
        break;

      case 'single-trailer':
        this.stepStatuses = {
          'trailer-plate': !!this.weighingForm.get('trailerPlate')?.value,
          'trailer2-plate': !!this.weighingForm.get('trailerPlate2')?.value,
          product: !!this.weighingForm.get('product')?.value,
          client: !!this.weighingForm.get('clientProviderName')?.value,
          'cargo-photo': !!this.photoData.cargo,
          weight: this.weightData.capturedWeight !== undefined,
        };
        break;

      case 'double-trailer':
        this.stepStatuses = {
          'trailer-plate': !!this.doubleTrailerState.trailerPlaca,
          'remolque1-plate':
            !!this.doubleTrailerState.remolque1.fotoPlacaCapturada,
          'remolque1-cargo':
            !!this.doubleTrailerState.remolque1.fotoCargaCapturada,
          product: !!this.weighingForm.get('product')?.value,
          client: !!this.weighingForm.get('clientProviderName')?.value,
          'remolque2-plate':
            !!this.doubleTrailerState.remolque2.fotoPlacaCapturada,
          'remolque2-cargo':
            !!this.doubleTrailerState.remolque2.fotoCargaCapturada,
          weight: this.doubleTrailerState.isComplete,
        };
        break;
    }
  }

  /**
   * Actualiza los pasos para el flujo "Solo contenedor"
   */
  private updateContainerOnlySteps(): void {
    this.processStepsComponent?.updateStepStatus(
      'product',
      !!this.weighingForm.get('product')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'client',
      !!this.weighingForm.get('clientProviderName')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'cargo-photo',
      !!this.photoData.cargo,
    );
    this.processStepsComponent?.updateStepStatus(
      'weight',
      this.weightData.capturedWeight !== undefined,
    );
  }

  /**
   * Actualiza los pasos para el flujo "Remolque único"
   */
  private updateSingleTrailerSteps(): void {
    this.processStepsComponent?.updateStepStatus(
      'trailer-plate',
      !!this.weighingForm.get('trailerPlate')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'trailer2-plate',
      !!this.weighingForm.get('trailerPlate2')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'product',
      !!this.weighingForm.get('product')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'client',
      !!this.weighingForm.get('clientProviderName')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'cargo-photo',
      !!this.photoData.cargo,
    );
    this.processStepsComponent?.updateStepStatus(
      'weight',
      this.weightData.capturedWeight !== undefined,
    );
  }

  /**
   * Actualiza los pasos para el flujo "Doble remolque"
   */
  private updateDoubleTrailerSteps(): void {
    this.processStepsComponent?.updateStepStatus(
      'trailer-plate',
      !!this.doubleTrailerState.trailerPlaca,
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque1-plate',
      !!this.doubleTrailerState.remolque1.placa,
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque1-cargo',
      !!this.doubleTrailerState.remolque1.fotoCargaCapturada,
    );
    this.processStepsComponent?.updateStepStatus(
      'product',
      !!this.weighingForm.get('product')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'client',
      !!this.weighingForm.get('clientProviderName')?.value,
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque2-plate',
      !!this.doubleTrailerState.remolque2.placa,
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque2-cargo',
      !!this.doubleTrailerState.remolque2.fotoCargaCapturada,
    );
    this.processStepsComponent?.updateStepStatus(
      'weight',
      this.doubleTrailerState.isComplete,
    );
  }

  /**
   * Alterna la visibilidad del panel de pasos del proceso en móviles
   */
  toggleProcessSteps(): void {
    this.showProcessSteps = !this.showProcessSteps;
  }

  // ============= GETTERS PARA INFORMACIÓN DE ENTRADA =============

  get hasEntryInfo(): boolean {
    return (
      this.operationType === 'exit' &&
      this.weightData.hasValidEntry === true &&
      this.showEntryInfo
    );
  }

  get entryInfoData() {
    return {
      folio: this.weightData.entryFolio || 'N/A',
      weight: this.weightData.entryWeight || 0,
      date: this.weightData.entryDate
        ? new Date(this.weightData.entryDate).toLocaleString()
        : 'N/A',
      product: this.weighingForm.get('product')?.value || 'N/A',
      client: this.weighingForm.get('clientProviderName')?.value || 'N/A',
    };
  }

  get calculatedNetWeight(): number {
    if (this.weightData.entryWeight && this.weightData.capturedWeight) {
      return Math.abs(
        this.weightData.entryWeight - this.weightData.capturedWeight,
      );
    }
    return 0;
  }

  hideEntryInfo(): void {
    this.showEntryInfo = false;
  }

  /**
   * Verifica si el formulario tiene campos editados manualmente
   */
  get hasManualPlateEdits(): boolean {
    return (
      this.hasManualEdits ||
      this.manualEditDetector.hasManualChanges('weighing-form')
    );
  }

  /**
   * Obtiene la lista de campos que fueron editados manualmente
   */
  getManuallyEditedFields(): string[] {
    return this.manualEditDetector.getManuallyChangedFields('weighing-form');
  }

  /**
   * Configura el filtro para una báscula específica
   */
  setBasculaFilter(basculaId: number): void {
    this.currentBasculaId = basculaId;
    console.log(`Filtro de báscula configurado: ${basculaId}`);
  }

  /**
   * Limpia el filtro de báscula
   */
  clearBasculaFilter(): void {
    this.currentBasculaId = null;
    console.log('Filtro de báscula limpiado');
  }

  /**
   * Fuerza la reconexión con el servicio de peso en tiempo real
   */
  async reconnectToWeightService(): Promise<void> {
    try {
      await this.pesoRealtimeService.reconnect();
      this.showToast(
        'info',
        'Reconexión',
        'Intentando reconectar con el servicio de peso...',
      );
    } catch (error) {
      console.error('Error al reconectar:', error);
      this.showToast(
        'error',
        'Error de reconexión',
        'No se pudo reconectar con el servicio de peso',
      );
    }
  }

  /**
   * Obtiene el estado actual de la conexión
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
   * Actualiza la operación en el backend cuando se detecta una edición manual
   */
  private updateOperationWithManualEdit(editEvent: ManualEditEvent): void {
    if (!this.currentOperationId) return;

    // Usar getRawValue() para incluir campos deshabilitados
    const formValues = this.weighingForm.getRawValue();
    const updateRequest: UpdateWeighingOperationRequest = {
      esEdicionManual: true,
      // Solo incluir los campos que cambiaron
      ...(editEvent.fieldName === 'trailerPlate' && {
        trailerPlate: formValues.trailerPlate,
      }),
      ...(editEvent.fieldName === 'trailerPlate2' && {
        trailerPlate2: formValues.trailerPlate2,
      }),
      ...(editEvent.fieldName === 'remolque1Plate' && {
        placaRemolque1: formValues.remolque1Plate,
      }),
      ...(editEvent.fieldName === 'remolque2Plate' && {
        placaRemolque2: formValues.remolque2Plate,
      }),
    };

    this.weighingService
      .updateWeighingOperation(this.currentOperationId, updateRequest)
      .subscribe({
        next: (response) => {
          console.log('✅ Operación actualizada con edición manual:', response);
          // No mostrar toast para ediciones manuales - se guarda silenciosamente
        },
        error: (error) => {
          console.error('❌ Error al actualizar operación:', error);
          this.showToast(
            'error',
            'Error al guardar',
            'No se pudieron guardar los cambios manuales',
          );
        },
      });
  }

  /**
   * Construye la URL completa para una imagen desde el servidor
   */
  getFullImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';

    // Si ya es una URL completa, retornarla tal cual
    if (
      relativeUrl.startsWith('http://') ||
      relativeUrl.startsWith('https://')
    ) {
      return relativeUrl;
    }

    // Construir URL completa desde environment
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${relativeUrl}`;
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

  /**
   * Configurar búsqueda de productos con debounce
   */
  private setupProductSearch(): void {
    // Suscribirse a los cambios del control de formulario 'product'
    const productControl = this.weighingForm.get('product');

    if (productControl) {
      this.productSearchSubscription = productControl.valueChanges
        .pipe(
          debounceTime(400), // Esperar 400ms después del último keystroke
          distinctUntilChanged(), // Solo buscar si el valor cambió
          switchMap((searchTerm: string) => {
            console.log('🔍 Buscando productos con término:', searchTerm);

            // Solo buscar si hay al menos 2 caracteres
            if (!searchTerm || searchTerm.trim().length < 2) {
              console.log('❌ Valor muy corto, limpiando sugerencias');
              this.productSuggestions = [];
              this.showProductSuggestions = false;
              this.cdr.detectChanges();
              return [];
            }

            return this.weighingService.searchProducts(searchTerm.trim());
          }),
        )
        .subscribe({
          next: (products) => {
            console.log('✅ Productos recibidos:', products);
            console.log(
              '✅ Tipo de products:',
              typeof products,
              Array.isArray(products),
            );
            this.productSuggestions = products;
            this.showProductSuggestions = products.length > 0;
            console.log(
              '📋 showProductSuggestions:',
              this.showProductSuggestions,
            );
            console.log('📋 productSuggestions:', this.productSuggestions);
            console.log(
              '📋 productSuggestions.length:',
              this.productSuggestions.length,
            );

            // Verificar si el elemento existe en el DOM
            setTimeout(() => {
              const dropdown = document.querySelector('.autocomplete-dropdown');
              console.log('🔍 Dropdown element:', dropdown);
              if (dropdown) {
                const styles = window.getComputedStyle(dropdown);
                console.log('🔍 Dropdown display:', styles.display);
                console.log('🔍 Dropdown visibility:', styles.visibility);
                console.log('🔍 Dropdown z-index:', styles.zIndex);
                console.log('🔍 Dropdown position:', styles.position);
                console.log('🔍 Dropdown top:', styles.top);
              }
            }, 50);

            this.cdr.detectChanges(); // Forzar detección de cambios
          },
          error: (error) => {
            console.error('❌ Error buscando productos:', error);
            this.productSuggestions = [];
            this.showProductSuggestions = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  /**
   * Seleccionar un producto de las sugerencias
   */
  selectProductSuggestion(product: string): void {
    console.log('🎯 Producto seleccionado:', product);
    this.weighingForm.patchValue({ product }, { emitEvent: false });
    this.productSuggestions = [];
    this.showProductSuggestions = false;
    this.cdr.detectChanges();
  }

  /**
   * Mostrar sugerencias al hacer focus (si hay productos previos)
   */
  onProductFocus(): void {
    const productValue = this.weighingForm.get('product')?.value;
    if (
      productValue &&
      productValue.trim().length >= 2 &&
      this.productSuggestions.length > 0
    ) {
      this.showProductSuggestions = true;
      this.cdr.detectChanges();
    }
  }

  /**
   * Cerrar sugerencias al hacer blur
   */
  onProductBlur(): void {
    // Delay para permitir click en sugerencias
    setTimeout(() => {
      this.showProductSuggestions = false;
      this.cdr.detectChanges();
    }, 200);
  }

  /**
   * Configurar búsqueda de clientes/proveedores con debounce
   */
  private setupClientSearch(): void {
    const clientControl = this.weighingForm.get('clientProviderName');

    if (clientControl) {
      this.clientSearchSubscription = clientControl.valueChanges
        .pipe(
          debounceTime(400),
          distinctUntilChanged(),
          switchMap((searchTerm: string) => {
            if (!searchTerm || searchTerm.trim().length < 2) {
              this.clientSuggestions = [];
              this.showClientSuggestions = false;
              this.cdr.detectChanges();
              return [];
            }

            return this.weighingService.searchClients(searchTerm.trim());
          }),
        )
        .subscribe({
          next: (clients) => {
            this.clientSuggestions = clients;
            this.showClientSuggestions = clients.length > 0;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error buscando clientes:', error);
            this.clientSuggestions = [];
            this.showClientSuggestions = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  /**
   * Seleccionar un cliente/proveedor de las sugerencias
   */
  selectClientSuggestion(client: string): void {
    this.weighingForm.patchValue(
      { clientProviderName: client },
      { emitEvent: false },
    );
    this.clientSuggestions = [];
    this.showClientSuggestions = false;
    this.cdr.detectChanges();
  }

  /**
   * Mostrar sugerencias de clientes al hacer focus
   */
  onClientFocus(): void {
    const clientValue = this.weighingForm.get('clientProviderName')?.value;
    if (
      clientValue &&
      clientValue.trim().length >= 2 &&
      this.clientSuggestions.length > 0
    ) {
      this.showClientSuggestions = true;
      this.cdr.detectChanges();
    }
  }

  /**
   * Cerrar sugerencias de clientes al hacer blur
   */
  onClientBlur(): void {
    setTimeout(() => {
      this.showClientSuggestions = false;
      this.cdr.detectChanges();
    }, 200);
  }

  /**
   * Captura todas las fotos del flujo actual de manera consolidada
   * Para doble remolque: SOLO captura tráiler + remolque1 + carga remolque1 (Fase 1)
   * Para otros flujos: captura todas las fotos en paralelo
   * Este método NO modifica la funcionalidad existente
   */
  async onCaptureAllPhotos(): Promise<void> {
    const isDoubleTrailer = this.weighingForm.get('doubleTrailer')?.value;
    const isContainerOnly = this.weighingForm.get('containerOnly')?.value;

    this.isCapturingAllPhotos = true;

    console.log(
      '🎯 [WEIGHING-FORM] Iniciando captura consolidada - doubleTrailer:',
      isDoubleTrailer,
      'containerOnly:',
      isContainerOnly,
    );

    try {
      // Doble remolque entrada: asegurar que el paso sea remolque1 antes de solicitar peso,
      // para que cuando la respuesta del peso llegue (asíncrona) processDoubleTrailerWeight()
      // asigne el peso al Remolque 1 en el primer clic (evitar que currentStep siga en 'trailer').
      if (isDoubleTrailer) {
        this.doubleTrailerState.currentStep = 'remolque1';
      }

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
          { promise: this.onPhotoCapture('trailerPlate'), name: 'Tráiler' },
          {
            promise: this.onPhotoCapture('remolque1Plate'),
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
              `✅ [WEIGHING-FORM] Foto ${phase1Promises[index].name} capturada exitosamente`,
            );
          } else {
            fotosFallidas++;
            console.error(
              `❌ [WEIGHING-FORM] Error capturando ${phase1Promises[index].name}:`,
              result.reason,
            );
          }
        });
      } else {
        // ============= FLUJO REMOLQUE ÚNICO O CONTENEDOR - TODO PARALELO =============
        const capturePromises = [
          { promise: this.onPhotoCapture('trailerPlate'), name: 'Tráiler' },
          {
            promise: this.onPhotoCapture('trailerPlate2'),
            name: isContainerOnly ? 'Contenedor' : 'Remolque',
          },
          { promise: this.onPhotoCapture('cargo'), name: 'Carga' },
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
              `✅ [WEIGHING-FORM] Foto ${capturePromises[index].name} capturada exitosamente`,
            );
          } else {
            fotosFallidas++;
            console.error(
              `❌ [WEIGHING-FORM] Error capturando ${capturePromises[index].name}:`,
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
      console.error('❌ [WEIGHING-FORM] Error en captura consolidada:', error);
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
    const isDoubleTrailer = this.weighingForm.get('doubleTrailer')?.value;

    if (!isDoubleTrailer) {
      console.warn(
        '⚠️ [WEIGHING-FORM] onCaptureRemolque2Photos solo aplica para doble remolque',
      );
      return;
    }

    this.isCapturingAllPhotos = true;

    console.log('🎯 [WEIGHING-FORM] Iniciando captura de fotos Remolque 2');

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
        { promise: this.onPhotoCapture('remolque2Plate'), name: 'Remolque 2' },
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
            `✅ [WEIGHING-FORM] Foto ${phase2Promises[index].name} capturada exitosamente`,
          );
        } else {
          fotosFallidas++;
          console.error(
            `❌ [WEIGHING-FORM] Error capturando ${phase2Promises[index].name}:`,
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
        '❌ [WEIGHING-FORM] Error en captura de Remolque 2:',
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
