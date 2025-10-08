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
import { environment } from '../../../../../environments/environment';

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
  private cdr = inject(ChangeDetectorRef);

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
      this.messageService.showSuccess({
        message: 'Intentando reconectar con el servicio de peso...',
      });
    } catch (error) {
      console.error('Error al reconectar:', error);
      this.messageService.showError({
        message: 'No se pudo reconectar con el servicio de peso',
      });
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
   * Busca una entrada por placa del tráiler usando endpoints reales
   */
  onSearchEntry(): void {
    const plate = this.exitForm.get('trailerPlate')?.value;

    // Para contenedor, permitir búsqueda sin placa
    if (this.unitType === 'contenedor' && !plate) {
      this.messageService.showInfo({
        message: 'Para contenedor, la búsqueda se realizará por otros criterios',
      });
      // TODO: Implementar búsqueda alternativa para contenedor
      return;
    }

    // Para otros tipos, validar que se ingrese placa
    if (!plate) {
      this.messageService.showError({
        message: 'Debe ingresar una placa para buscar',
      });
      return;
    }

    this.isSearching = true;

    // Paso 1: Validar si se puede registrar salida para esta placa
    this.weighingService.validateExit(plate).subscribe({
      next: (validation) => {
        if (validation.canExit) {
          // Paso 2: Si se puede registrar salida, obtener datos completos de la operación
          this.loadOperationData(plate);
        } else {
          this.isSearching = false;
          this.messageService.showError({
            message: validation.message || 'No se puede registrar salida para esta placa',
          });
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error validating exit:', error);
        this.messageService.showErrorToast({
          title: 'Error de validación',
          message: extractErrorMessage(error),
          position: 'top-right'
        });
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
        
        this.messageService.showSuccess({
          message: `Entrada encontrada exitosamente. Folio: ${operation.folio}`,
        });
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error loading operation data:', error);
        this.messageService.showErrorToast({
          title: 'Error de búsqueda',
          message: extractErrorMessage(error),
          position: 'top-right'
        });
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
      tipoUnidad: this.mapTipoUnidad(operation.tipoUnidad, operation.placaRemolque1, operation.placaRemolque2),
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
  private mapTipoUnidad(tipoUnidad?: string, placaRemolque1?: string, placaRemolque2?: string): 'remolque' | 'contenedor' | 'doble-remolque' {
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
      this.doubleTrailerState.trailerPlaca = this.entryData.placaTrailer || '';
      this.doubleTrailerState.remolque1.placa =
        this.entryData.placaRemolque1 || '';
      this.doubleTrailerState.remolque2.placa =
        this.entryData.placaRemolque2 || '';
      this.doubleTrailerState.pesoBrutoTotal = this.entryData.entryWeight;

      // Actualizar validaciones de placas
      this.updatePlateValidations();
    } else {
      // Para otros tipos de unidad
      this.exitForm.patchValue({
        trailerPlate: this.entryData.placaTrailer || '',
        trailerPlate2: this.entryData.placaRemolque || '',
      });

      // Actualizar validaciones de placas
      this.updatePlateValidations();
    }
  }

  /**
   * Actualiza las validaciones de placas basándose en los datos de entrada
   */
  private updatePlateValidations(): void {
    if (!this.entryData) return;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      // Validar placa del tráiler
      this.validatePlate('trailerPlate', this.entryData.placaTrailer);
      this.validatePlate('remolque1Plate', this.entryData.placaRemolque1);
      this.validatePlate('remolque2Plate', this.entryData.placaRemolque2);
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
      this.validatePlate('trailerPlate', this.entryData.placaTrailer);
      this.validatePlate('trailerPlate2', this.entryData.placaRemolque);
    }
  }

  /**
   * Valida una placa específica contra el valor de entrada
   */
  private validatePlate(fieldName: string, expectedPlate?: string): void {
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
   * Captura foto con OCR para una placa específica
   */
  async onPhotoCaptureWithOCR(fieldName: string): Promise<void> {
    console.log('🎯 Capturando foto con ANPR para campo:', fieldName);

    // Mapear fieldName a cameraType
    const cameraTypeMap: Record<string, 'trailer' | 'remolque' | 'cargo'> = {
      'trailerPlate': 'trailer',
      'trailerPlate2': 'remolque',
      'remolque1Plate': 'remolque',
      'remolque2Plate': 'remolque',
      'containerPlate': 'trailer'
    };

    const cameraType = cameraTypeMap[fieldName];
    if (!cameraType) {
      console.error('Tipo de cámara no encontrado para:', fieldName);
      return;
    }

    const plateTypeLabel = fieldName === 'trailerPlate' ? 'tráiler' :
                           fieldName === 'trailerPlate2' ? 'remolque' :
                           fieldName === 'remolque1Plate' ? 'remolque 1' :
                           fieldName === 'remolque2Plate' ? 'remolque 2' : 'vehículo';

    try {
      this.messageService.showInfo({
        title: 'Esperando lectura',
        message: `Esperando lectura de placa del ${plateTypeLabel} desde la cámara ANPR...`,
        duration: 30000
      });

      // Capturar placa con ANPR (30 segundos de timeout)
      const anprEvent: AnprEvent = await this.anprService.capturePlate(cameraType, 30000);

      // Guardar la imagen URL
      this.photoData[fieldName as keyof ExitPhotoData] = anprEvent.imageUrl;

      // Guardar la placa detectada
      this.detectedPlates[fieldName] = anprEvent.licensePlate;

      // Actualizar el formulario con la placa detectada
      this.exitForm.get(fieldName)?.setValue(anprEvent.licensePlate);

      console.log('✅ Placa detectada por ANPR:', anprEvent.licensePlate);
      console.log('Imagen guardada en:', anprEvent.imageUrl);
      console.log('Confianza:', anprEvent.confidenceLevel + '%');

      // Validar placa contra la entrada (si existe)
      if (this.entryData) {
        const expectedPlate = this.getExpectedPlate(fieldName);
        const isMatch = anprEvent.licensePlate === expectedPlate;

        if (!isMatch && expectedPlate) {
          // Placa no coincide - marcar error
          this.plateValidations[fieldName] = {
            isValid: false,
            errorMessage: `Placa detectada (${anprEvent.licensePlate}) no coincide con la entrada (${expectedPlate})`
          };

          this.messageService.showWarning({
            title: 'Placa no coincide',
            message: `La placa detectada "${anprEvent.licensePlate}" no coincide con la de entrada "${expectedPlate}". Puede editar manualmente si es correcto.`,
            duration: 5000
          });
        } else {
          // Placa coincide - marcar válida
          this.plateValidations[fieldName] = {
            isValid: true,
            errorMessage: ''
          };

          this.messageService.showSuccess({
            title: 'Placa verificada',
            message: `Placa ${anprEvent.licensePlate} del ${plateTypeLabel} verificada correctamente`,
            duration: 3000
          });
        }
      } else {
        // No hay datos de entrada aún, solo mostrar éxito
        this.messageService.showSuccess({
          title: 'Placa capturada',
          message: `Placa ${anprEvent.licensePlate} del ${plateTypeLabel} detectada con ${anprEvent.confidenceLevel}% de confianza`,
          duration: 3000
        });
      }

    } catch (error: any) {
      console.error('❌ Error capturando placa con ANPR:', error);

      const errorMessage = error.name === 'TimeoutError'
        ? 'Tiempo de espera agotado (30s). No se detectó ninguna placa.'
        : 'Error al capturar placa desde la cámara ANPR';

      this.messageService.showError({
        title: 'Error de captura',
        message: errorMessage,
        duration: 5000
      });
    }
  }

  /**
   * Captura foto para campos que no requieren OCR
   */
  onPhotoCapture(fieldName: string): void {
    // MOCK: Marcar la foto como capturada sin hacer nada
    this.photoData[fieldName as keyof ExitPhotoData] = 'MOCK_CAPTURED';

    // Actualizar estado de doble remolque si es necesario
    if (fieldName === 'cargoRemolque1') {
      this.doubleTrailerState.remolque1.fotoCargaCapturada = true;
    } else if (fieldName === 'cargoRemolque2') {
      this.doubleTrailerState.remolque2.fotoCargaCapturada = true;
    }

    this.messageService.showSuccess({
      message: `Foto de ${fieldName} capturada (mock)`,
    });
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

    this.messageService.showInfo({
      title: 'Edición manual habilitada',
      message: `Puede editar manualmente la placa. La validación automática ha sido deshabilitada.`,
      duration: 3000
    });
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

      this.messageService.showSuccess({
        message: `Peso tara del Remolque 1 capturado: ${this.weightData.currentWeight} kg`,
      });
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

      this.messageService.showSuccess({
        message: `Peso tara del Remolque 2 capturado: ${this.weightData.currentWeight} kg`,
      });
      this.calculateNetWeight();
    }
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

      this.messageService.showSuccess({
        message: `Peso de salida capturado: ${this.weightData.currentWeight} kg`,
      });
    }
  }

  /**
   * Obtiene el tipo de unidad del parámetro de la ruta
   */
  private getUnitTypeFromRoute(): void {
    this.route.params.subscribe((params) => {
      this.unitType = params['unitType'] || '';
      this.unitTypeTitle = this.getUnitTypeDisplayName(this.unitType);
    });
  }

  /**
   * Calcula el peso neto basándose en el tipo de unidad y la lógica de negocio
   */
  private calculateNetWeight(): void {
    if (!this.entryData) return;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      // Para doble remolque: peso bruto - suma de pesos tara de ambos remolques
      const pesoTaraRemolque1 =
        this.exitForm.get('pesoTaraRemolque1')?.value || 0;
      const pesoTaraRemolque2 =
        this.exitForm.get('pesoTaraRemolque2')?.value || 0;

      let pesoNeto: number;

      if (this.unitType === 'provider') {
        // Proveedor (Entrada con Carga, Salida Vacío)
        // Peso neto: Peso bruto - Peso tara = Material descargado
        pesoNeto =
          this.entryData.entryWeight - (pesoTaraRemolque1 + pesoTaraRemolque2);
      } else {
        // Cliente (Entrada Vacío, Salida con Carga)
        // Peso neto: Peso tara - Peso bruto = Material cargado
        pesoNeto =
          pesoTaraRemolque1 + pesoTaraRemolque2 - this.entryData.entryWeight;
      }

      this.exitForm.get('netWeight')?.setValue(pesoNeto);
      this.doubleTrailerState.pesoNetoCalculado = pesoNeto;
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

      this.exitForm.get('netWeight')?.setValue(pesoNeto);
    }
  }

  /**
   * Verifica si se puede capturar peso
   */
  canCaptureWeight(): boolean {
    return this.weightData.isConnected;
  }

  /**
   * Verifica si se puede capturar peso para el remolque 2
   */
  canCaptureWeightRemolque2(): boolean {
    // Verificar que se pueda capturar peso en general
    if (!this.canCaptureWeight()) return false;

    // Verificar que el remolque 1 esté completo
    if (!this.entryData || this.entryData.tipoUnidad !== 'doble-remolque')
      return false;

    const remolque1Complete =
      this.exitForm.get('remolque1Plate')?.value &&
      this.exitForm.get('pesoTaraRemolque1')?.value &&
      this.photoData.cargoRemolque1 &&
      this.plateValidations['remolque1Plate'].isValid;

    return !!remolque1Complete;
  }

  /**
   * Verifica si se deben mostrar campos de tráiler
   */
  shouldShowTrailerFields(): boolean {
    return this.entryData?.tipoUnidad !== 'contenedor';
  }

  /**
   * Obtiene el nombre de visualización del tipo de unidad
   */
  getUnitTypeDisplayName(tipoUnidad: string): string {
    const displayNames: Record<string, string> = {
      remolque: 'Remolque Único',
      contenedor: 'Solo Contenedor',
      'doble-remolque': 'Doble Remolque',
    };

    return displayNames[tipoUnidad] || tipoUnidad;
  }

  /**
   * Obtiene el error de un campo específico
   */
  getFieldError(fieldName: string): string {
    const field = this.exitForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['min']) return 'El valor debe ser mayor a 0';
    }
    return '';
  }

  /**
   * Construye la URL completa de una imagen ANPR
   */
  getFullImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';

    // Si ya es una URL completa, retornarla tal cual
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }

    // Construir URL completa desde environment
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${relativeUrl}`;
  }

  /**
   * Genera el PDF con los datos de la salida registrada
   */
  private async generatePDF(response: any): Promise<void> {
    if (!this.entryData) return;

    try {
      const receiptData: WeighingReceiptData = {
        folio: response.folio || this.entryFolio,
        fecha: new Date(response.fechaSalida || new Date()),
        tipoUnidad: this.entryData.tipoUnidad,
        clienteProveedor: this.entryData.clientProviderName || '',
        tipo: 'client', // Por defecto, ya que EntrySearchData no tiene este campo
        producto: this.entryData.product || '',

        // Datos de entrada
        fechaEntrada: this.entryData.createdAt ? new Date(this.entryData.createdAt) : new Date(),
        pesoBrutoEntrada: this.entryData.entryWeight || 0,
        placaTrailer: this.entryData.placaTrailer || '',
        placaRemolque: this.entryData.placaRemolque || this.entryData.placaRemolque1 || '',

        // Datos de salida
        fechaSalida: new Date(response.fechaSalida || new Date()),
        pesoBrutoSalida: this.exitForm.get('exitWeight')?.value || 0,
        pesoTara: this.exitForm.get('exitWeight')?.value || 0,
        pesoNeto: response.pesoNeto || 0,
      };

      // Si es doble remolque, agregar datos de los remolques
      if (this.entryData.tipoUnidad === 'doble-remolque') {
        const pesoBrutoR1 = this.entryData.entryWeight || 0; // Usar entryWeight como aproximación
        const pesoTaraR1 = this.exitForm.get('pesoTaraRemolque1')?.value || 0;
        const pesoBrutoR2 = this.entryData.entryWeight || 0; // Usar entryWeight como aproximación
        const pesoTaraR2 = this.exitForm.get('pesoTaraRemolque2')?.value || 0;

        receiptData.remolque1 = {
          placa: this.entryData.placaRemolque1 || '',
          pesoBruto: pesoBrutoR1,
          pesoTara: pesoTaraR1,
          pesoNeto: Math.abs(pesoBrutoR1 - pesoTaraR1),
        };

        receiptData.remolque2 = {
          placa: this.entryData.placaRemolque2 || '',
          pesoBruto: pesoBrutoR2,
          pesoTara: pesoTaraR2,
          pesoNeto: Math.abs(pesoBrutoR2 - pesoTaraR2),
        };
      }

      await this.pdfGeneratorService.generateWeighingReceipt(receiptData);
      console.log('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      // No mostrar error al usuario, el PDF es opcional
    }
  }

  /**
   * Verifica si el formulario es válido
   */
  get isFormValid(): boolean {
    if (!this.entryData) return false;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      // Validar campos obligatorios para doble remolque
      const basicValid =
        this.exitForm.get('trailerPlate')?.valid &&
        this.exitForm.get('remolque1Plate')?.valid &&
        this.exitForm.get('remolque2Plate')?.valid &&
        this.exitForm.get('pesoTaraRemolque1')?.valid &&
        this.exitForm.get('pesoTaraRemolque2')?.valid;

      // Validar que las placas coincidan
      const platesValid =
        this.plateValidations['trailerPlate'].isValid &&
        this.plateValidations['remolque1Plate'].isValid &&
        this.plateValidations['remolque2Plate'].isValid;

      // Validar que las fotos estén capturadas
      const photosValid =
        this.photoData.trailerPlate &&
        this.photoData.remolque1Plate &&
        this.photoData.remolque2Plate &&
        this.photoData.cargoRemolque1 &&
        this.photoData.cargoRemolque2;

      return !!(basicValid && platesValid && photosValid);
    } else if (this.entryData.tipoUnidad === 'contenedor') {
      // Para contenedor: trailerPlate es opcional, solo validar peso y foto de carga
      const basicValid = this.exitForm.get('exitWeight')?.valid;

      // No validar placas para contenedor
      const platesValid = true;

      // Solo validar foto de carga (obligatoria)
      const photosValid = this.photoData.cargoState;

      return !!(basicValid && platesValid && photosValid);
    } else {
      // Validar campos para otros tipos (remolque único)
      const basicValid =
        this.exitForm.get('trailerPlate')?.valid &&
        this.exitForm.get('exitWeight')?.valid;

      const platesValid =
        this.plateValidations['trailerPlate'].isValid &&
        this.plateValidations['trailerPlate2'].isValid;

      const photosValid =
        this.photoData.trailerPlate &&
        this.photoData.trailerPlate2 &&
        this.photoData.cargoState;

      return !!(basicValid && platesValid && photosValid);
    }
  }

  /**
   * Guarda el registro de salida usando endpoints reales
   */
  onSave(): void {
    if (!this.isFormValid) {
      this.messageService.showError({
        message: 'Por favor complete todos los campos requeridos',
      });
      return;
    }

    if (!this.entryData || !this.entryFolio) {
      this.messageService.showError({
        message: 'No hay datos de entrada válidos para procesar la salida. Debe buscar una entrada primero.',
      });
      return;
    }

    this.isLoading = true;

    if (this.entryData.tipoUnidad === 'doble-remolque') {
      this.saveDoubleTrailerExit();
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
      placaContenedor: this.entryData.tipoUnidad === 'contenedor' ? this.entryData.placaTrailerContenedor : undefined,
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

        this.notificationService.showSuccess(
          'Salida registrada',
          `Salida registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`
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
          originalResponse: (error as any).originalResponse
        });

        const finalMessage = extractErrorMessage(error);
        console.log('📢 Showing error toast:', finalMessage);

        this.messageService.showErrorToast({
          title: 'Error al registrar salida',
          message: finalMessage,
          position: 'top-right'
        });
      },
    });
  }

  /**
   * Guarda una salida con doble remolque
   */
  private saveDoubleTrailerExit(): void {
    if (!this.entryData) return;

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
      pesoBrutoTotal: this.entryData.entryWeight,
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

        this.notificationService.showSuccess(
          'Salida registrada',
          `Salida con doble remolque registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`
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
        console.error('🔥 Error saving double trailer exit:', {
          error,
          errorMessage: error.message,
          errorStatus: error.status,
          isApiError: (error as any).isApiError,
          originalResponse: (error as any).originalResponse
        });

        const finalMessage = extractErrorMessage(error);
        console.log('📢 Showing error toast for double trailer:', finalMessage);

        this.messageService.showErrorToast({
          title: 'Error al registrar salida',
          message: finalMessage,
          position: 'top-right'
        });
      },
    });
  }

  /**
   * Limpia el formulario
   */
  onClear(): void {
    this.exitForm.reset();
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
    this.entryData = null;
    this.isEntryFound = false;
    this.isExitRegistered = false;
    this.entryFolio = ''; // Limpiar el folio
    this.currentWeightCaptureType = null;

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

    // Resetear validaciones
    Object.keys(this.plateValidations).forEach((key) => {
      this.plateValidations[key] = {
        isValid: true,
        errorMessage: '',
      };
    });

    // Resetear edición manual
    Object.keys(this.manualEditEnabled).forEach((key) => {
      this.manualEditEnabled[key] = false;
    });

    this.messageService.showInfo({ message: 'Formulario limpiado' });
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
    // Implementar logout
    this.messageService.showInfo({ message: 'Cerrando sesión...' });
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
}
