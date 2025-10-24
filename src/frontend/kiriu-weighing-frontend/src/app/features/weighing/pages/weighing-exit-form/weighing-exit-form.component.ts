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
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { RealWeighingService, PendingExitSearchResult } from '../../services/real-weighing.service';
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

  // Autocompletado de búsqueda de entradas
  entrySuggestions: any[] = [];
  showEntrySuggestions = false;
  entrySearchSubscription: Subscription | undefined;

  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initializeForm();
    this.startRealtimeWeightUpdates();
    this.getUnitTypeFromRoute();
    this.setupEntrySearch();
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
      this.showToast('success', 'Reconexión exitosa', 'Servicio de peso reconectado correctamente');
    } catch (error: any) {
      console.error('❌ Error reconectando servicio de peso:', error);
      this.showToast('error', 'Error de reconexión', 'No se pudo reconectar el servicio de peso');
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
    const detectedPlate = this.detectedPlates[fieldName];

    if (!expectedPlate || !detectedPlate) {
      this.plateValidations[fieldName] = {
        isValid: true,
        errorMessage: ''
      };
      return;
    }

    const matches = detectedPlate.toLowerCase() === expectedPlate.toLowerCase();
    this.plateValidations[fieldName] = {
      isValid: matches,
      errorMessage: matches ? '' : `Placa detectada no coincide con la esperada: ${expectedPlate}`
    };

    if (!matches) {
      this.showToast('warn', 'Placa no coincide', `La placa detectada (${detectedPlate}) no coincide con la esperada (${expectedPlate})`);
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

      this.showToast('success', 'Peso capturado', `Peso tara del Remolque 1 capturado: ${this.weightData.currentWeight} kg`);
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

      this.showToast('success', 'Peso capturado', `Peso tara del Remolque 2 capturado: ${this.weightData.currentWeight} kg`);
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
      this.doubleTrailerState.pesoBrutoTotal =
        pesoTaraRemolque1 + pesoTaraRemolque2;

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

  // ============= MÉTODOS AUXILIARES =============

  /**
   * Busca una entrada por placa del tráiler usando endpoints reales
   */
  onSearchEntry(): void {
    const plate = this.exitForm.get('trailerPlate')?.value;

    // Para contenedor, permitir búsqueda sin placa
    if (this.unitType === 'contenedor' && !plate) {
      this.showToast('info', 'Búsqueda de contenedor', 'Para contenedor, la búsqueda se realizará por otros criterios');
      // TODO: Implementar búsqueda alternativa para contenedor
      return;
    }

    // Para otros tipos, validar que se ingrese placa
    if (!plate) {
      this.showToast('error', 'Placa requerida', 'Debe ingresar una placa para buscar');
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
          this.showToast('error', 'Validación fallida', validation.message || 'No se puede registrar salida para esta placa');
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error validating exit:', error);
        this.showToast('error', 'Error de validación', extractErrorMessage(error));
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

        this.showToast('success', 'Entrada encontrada', `Entrada encontrada exitosamente. Folio: ${operation.folio}`);
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error loading operation data:', error);
        this.showToast('error', 'Error de búsqueda', extractErrorMessage(error));
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
      this.doubleTrailerState.currentStep = 'remolque1'; // Iniciar en remolque1 para captura de peso
      this.doubleTrailerState.trailerPlaca = this.entryData.placaTrailer || '';
      this.doubleTrailerState.remolque1.placa =
        this.entryData.placaRemolque1 || '';
      this.doubleTrailerState.remolque2.placa =
        this.entryData.placaRemolque2 || '';
      this.doubleTrailerState.pesoBrutoTotal = this.getDoubleTrailerExitWeight();

      console.log('🔄 [EXIT] Estado de doble remolque inicializado - currentStep:', this.doubleTrailerState.currentStep);

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
      this.validatePlateAfterLoad('remolque1Plate', this.entryData.placaRemolque1);
      this.validatePlateAfterLoad('remolque2Plate', this.entryData.placaRemolque2);
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
      this.validatePlateAfterLoad('trailerPlate2', this.entryData.placaRemolque);
    }
  }

  /**
   * Valida una placa específica contra el valor de entrada
   */
  private validatePlateAfterLoad(fieldName: string, expectedPlate?: string): void {
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
        'provider': 'Proveedor',
        'client': 'Cliente',
        'internal': 'Interno'
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
      // Paso 1: Intentar obtener foto huérfana de BD primero
      const isDoubleTrailer = this.entryData?.tipoUnidad === 'doble-remolque';
      // Buscar en BD para:
      // - Flujo de remolque único o contenedor: SIEMPRE buscar (trailerPlate, trailerPlate2, containerPlate)
      // - Flujo doble remolque: SOLO para trailerPlate, remolque1Plate y remolque2Plate
      const shouldSearchDB = !isDoubleTrailer ||
                            (isDoubleTrailer && (fieldName === 'trailerPlate' || fieldName === 'remolque1Plate' || fieldName === 'remolque2Plate'));

      if (shouldSearchDB) {
        console.log(`🔍 [WEIGHING-EXIT-FORM] Buscando foto en BD para photoType: ${fieldName}`);

        // Mapear fieldName a photoType para BD
        const photoTypeMap: Record<string, string> = {
          'trailerPlate': 'trailerPlate',
          'trailerPlate2': 'remolque1Plate', // Flujo remolque único - buscar en remolque1Plate
          'containerPlate': 'trailerPlate',   // Flujo solo contenedor - buscar en trailerPlate
          'remolque1Plate': 'remolque1Plate', // Flujo doble remolque
          'remolque2Plate': 'remolque1Plate'  // Flujo doble remolque - buscar en remolque1Plate porque backend guarda todo como remolque1Plate
        };

        let searchPhotoType = photoTypeMap[fieldName];
        let excludePhotoId: string | undefined = undefined;

        if (fieldName === 'remolque2Plate' && this.remolque1PhotoId) {
          excludePhotoId = this.remolque1PhotoId; // Excluir la foto ya usada para remolque1
          console.log(`🔄 [WEIGHING-EXIT-FORM] Buscando remolque2 en remolque1Plate, excluyendo foto de remolque1: ${excludePhotoId}`);
        }

        let orphanPhoto = await this.anprService.getLatestOrphanPhoto(searchPhotoType, excludePhotoId).toPromise();

        if (orphanPhoto) {
          console.log(`✅ [WEIGHING-EXIT-FORM] Foto huérfana encontrada en BD:`, orphanPhoto);

          // Guardar la imagen URL
          this.photoData[fieldName as keyof ExitPhotoData] = orphanPhoto.photoUrl;

          // Guardar photoId si es remolque1
          if (fieldName === 'remolque1Plate') {
            this.remolque1PhotoId = orphanPhoto.photoId;
            console.log(`💾 [WEIGHING-EXIT-FORM] PhotoId de remolque1 guardado: ${this.remolque1PhotoId}`);
          }

          // Actualizar placa en formulario y validar
          if (orphanPhoto.licensePlate) {
            this.exitForm.patchValue({ [fieldName]: orphanPhoto.licensePlate });
            console.log(`🔤 [WEIGHING-EXIT-FORM] Placa de ${plateTypeLabel} actualizada: ${orphanPhoto.licensePlate}`);
            console.log(`🔍 [DEBUG] entryData existe:`, !!this.entryData, `fieldName:`, fieldName);

            // Validar placa contra la entrada (si existe)
            if (this.entryData) {
              const expectedPlate = this.getExpectedPlate(fieldName);
              console.log(`🔍 [DEBUG] expectedPlate para ${fieldName}:`, expectedPlate);
              const isMatch = orphanPhoto.licensePlate === expectedPlate;
              console.log(`🔍 [DEBUG] isMatch:`, isMatch, `(${orphanPhoto.licensePlate} === ${expectedPlate})`);

              if (!isMatch && expectedPlate) {
                // Placa no coincide - marcar error
                this.plateValidations[fieldName] = {
                  isValid: false,
                  errorMessage: `Placa detectada (${orphanPhoto.licensePlate}) no coincide con la entrada (${expectedPlate})`
                };
                console.log(`⚠️ [WEIGHING-EXIT-FORM] Placa de BD no coincide: ${orphanPhoto.licensePlate} vs ${expectedPlate}`);
                this.showToast('warn', 'Placa no coincide', `La placa de BD "${orphanPhoto.licensePlate}" no coincide con la entrada "${expectedPlate}". Puede editar manualmente si es correcto.`);
              } else {
                // Placa coincide - marcar válida
                this.plateValidations[fieldName] = {
                  isValid: true,
                  errorMessage: ''
                };
                console.log(`✅ [WEIGHING-EXIT-FORM] Placa de BD validada correctamente: ${orphanPhoto.licensePlate}`);
                this.showToast('success', 'Foto obtenida', `Foto de ${plateTypeLabel} obtenida de base de datos. Esperando nueva captura...`);
              }
            } else {
              // No hay entrada, solo mostrar éxito
              this.showToast('success', 'Foto obtenida', `Foto de ${plateTypeLabel} obtenida de base de datos. Esperando nueva captura...`);
            }
          } else {
            // No hay placa en la foto
            this.showToast('success', 'Foto obtenida', `Foto de ${plateTypeLabel} obtenida de base de datos. Esperando nueva captura...`);
          }
        } else {
          console.log(`ℹ️ [WEIGHING-EXIT-FORM] No se encontró foto huérfana en BD para ${searchPhotoType}`);
        }
      }

      // Paso 2: Capturar desde cámara en tiempo real (SignalR)
      this.showToast('info', 'Esperando lectura', `Esperando lectura de placa del ${plateTypeLabel} desde la cámara ANPR...`);

      // Iniciar polling a BD cada 3 segundos mientras espera SignalR
      // Esto captura fotos que lleguen tarde a BD
      let pollingInterval: any = null;
      let photoFoundByPolling = false;

      if (shouldSearchDB) {
        console.log(`🔄 [WEIGHING-EXIT-FORM] Iniciando polling cada 3s mientras espera SignalR...`);

        pollingInterval = setInterval(async () => {
          try {
            console.log(`📡 [POLLING-EXIT] Revisando BD para ${fieldName}...`);

            // Determinar photoType y exclusión según el fieldName
            const photoTypeMap: Record<string, string> = {
              'trailerPlate': 'trailerPlate',
              'trailerPlate2': 'remolque1Plate', // Flujo remolque único - buscar en remolque1Plate
              'containerPlate': 'trailerPlate',   // Flujo solo contenedor - buscar en trailerPlate
              'remolque1Plate': 'remolque1Plate', // Flujo doble remolque
              'remolque2Plate': 'remolque1Plate'  // Flujo doble remolque - buscar en remolque1Plate porque backend guarda todo como remolque1Plate
            };

            let currentSearchPhotoType = photoTypeMap[fieldName];
            let currentExcludePhotoId = (fieldName === 'remolque2Plate' && this.remolque1PhotoId) ? this.remolque1PhotoId : undefined;

            let polledPhoto = await this.anprService.getLatestOrphanPhoto(currentSearchPhotoType, currentExcludePhotoId).toPromise();

            if (polledPhoto && !photoFoundByPolling) {
              photoFoundByPolling = true;
              console.log(`✅ [POLLING-EXIT] Foto encontrada en BD durante polling: ${polledPhoto.photoUrl}`);

              // Guardar la foto
              this.photoData[fieldName as keyof ExitPhotoData] = polledPhoto.photoUrl;

              // Guardar photoId si es remolque1
              if (fieldName === 'remolque1Plate') {
                this.remolque1PhotoId = polledPhoto.photoId;
                console.log(`💾 [POLLING-EXIT] PhotoId de remolque1 guardado: ${this.remolque1PhotoId}`);
              }

              // Si viene la placa en la foto, también actualizarla en el formulario y validar
              if (polledPhoto.licensePlate) {
                this.exitForm.patchValue({ [fieldName]: polledPhoto.licensePlate });
                console.log(`🔤 [POLLING-EXIT] Placa de ${plateTypeLabel} actualizada: ${polledPhoto.licensePlate}`);

                // Validar placa contra la entrada (si existe)
                if (this.entryData) {
                  const expectedPlate = this.getExpectedPlate(fieldName);
                  const isMatch = polledPhoto.licensePlate === expectedPlate;

                  if (!isMatch && expectedPlate) {
                    // Placa no coincide - marcar error
                    this.plateValidations[fieldName] = {
                      isValid: false,
                      errorMessage: `Placa detectada (${polledPhoto.licensePlate}) no coincide con la entrada (${expectedPlate})`
                    };
                    console.log(`⚠️ [POLLING-EXIT] Placa no coincide: ${polledPhoto.licensePlate} vs ${expectedPlate}`);
                    this.showToast('warn', 'Placa no coincide', `La placa encontrada "${polledPhoto.licensePlate}" no coincide con la entrada "${expectedPlate}". Puede editar manualmente si es correcto.`);
                  } else {
                    // Placa coincide - marcar válida
                    this.plateValidations[fieldName] = {
                      isValid: true,
                      errorMessage: ''
                    };
                    console.log(`✅ [POLLING-EXIT] Placa validada correctamente: ${polledPhoto.licensePlate}`);
                    this.showToast('success', 'Foto obtenida', `Foto de ${plateTypeLabel} obtenida durante espera`);
                  }
                } else {
                  // No hay entrada, solo mostrar éxito
                  this.showToast('success', 'Foto obtenida', `Foto de ${plateTypeLabel} obtenida durante espera`);
                }
              } else {
                // No hay placa en la foto
                this.showToast('success', 'Foto obtenida', `Foto de ${plateTypeLabel} obtenida durante espera`);
              }

              // No cancelamos SignalR, seguimos esperando por si llega una más reciente
            }
          } catch (error) {
            console.error(`❌ [POLLING-EXIT] Error en polling:`, error);
          }
        }, 3000); // Cada 3 segundos
      }

      // Capturar placa con ANPR (30 segundos de timeout)
      let anprEvent: AnprEvent;
      try {
        anprEvent = await this.anprService.capturePlate(cameraType, 30000);
      } finally {
        // Limpiar polling cuando termine (éxito o error)
        if (pollingInterval) {
          console.log(`🛑 [POLLING-EXIT] Deteniendo polling`);
          clearInterval(pollingInterval);
        }
      }

      // Guardar la imagen URL
      this.photoData[fieldName as keyof ExitPhotoData] = anprEvent.imageUrl;

      // Guardar la placa detectada
      this.detectedPlates[fieldName] = anprEvent.licensePlate;

      // Actualizar el formulario con la placa detectada
      this.exitForm.get(fieldName)?.setValue(anprEvent.licensePlate);

      console.log('✅ Placa detectada por ANPR:', anprEvent.licensePlate);
      console.log('Imagen guardada en:', anprEvent.imageUrl);
      console.log('Confianza:', anprEvent.confidenceLevel + '%');

      // Si es doble remolque y remolque1, obtener el photoId de la foto recién guardada
      if (isDoubleTrailer && fieldName === 'remolque1Plate') {
        // Esperar un momento para que la foto se guarde en BD
        setTimeout(async () => {
          const searchPhotoType = 'remolque1Plate';
          const recentPhoto = await this.anprService.getLatestOrphanPhoto(searchPhotoType).toPromise();
          if (recentPhoto) {
            this.remolque1PhotoId = recentPhoto.photoId;
            console.log(`💾 [WEIGHING-EXIT-FORM] PhotoId de remolque1 guardado desde SignalR: ${this.remolque1PhotoId}`);
          }
        }, 500); // Esperar 500ms para que se guarde en BD
      }

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

          this.showToast('warn', 'Placa no coincide', `La placa detectada "${anprEvent.licensePlate}" no coincide con la de entrada "${expectedPlate}". Puede editar manualmente si es correcto.`);
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
      console.error(`❌ Error capturando placa del ${plateTypeLabel}:`, error);
      const errorMessage = error?.message?.includes('timeout')
        ? 'Tiempo de espera agotado (30s). No se detectó ninguna placa.'
        : 'Error al capturar placa desde la cámara ANPR';

      this.showToast('error', 'Error de captura', errorMessage);
    }
  }

  /**
   * Obtiene la URL completa de una imagen
   */
  getFullImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
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
      this.showToast('info', 'Capturando foto', `Capturando foto de ${fieldName} desde la cámara...`);

      // Capturar foto real desde la cámara de carga
      const photoUrl = await this.cargoCameraService.captureAndSaveCargoPhotoAsync(fieldName);
      this.photoData[fieldName as keyof ExitPhotoData] = photoUrl;

      // Actualizar estado de doble remolque si es necesario
      if (fieldName === 'cargoRemolque1') {
        this.doubleTrailerState.remolque1.fotoCargaCapturada = true;
      } else if (fieldName === 'cargoRemolque2') {
        this.doubleTrailerState.remolque2.fotoCargaCapturada = true;
      }

      this.showToast('success', 'Foto capturada', `Foto de ${fieldName} capturada exitosamente`);
    } catch (error) {
      console.error(`Error capturando foto de ${fieldName}:`, error);
      this.showToast('error', 'Error de captura', `Error al capturar foto de ${fieldName} desde la cámara`);
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

      this.showToast('success', 'Peso capturado', `Peso de salida capturado: ${this.weightData.currentWeight} kg`);
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

        console.log('Peso capturado automáticamente:', this.weightData.capturedWeight);

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
            `Peso de salida capturado: ${pesoData.peso.toFixed(2)} kg`
          );
        }
      },
      error: (error) => {
        console.error('Error al solicitar peso desde SerialGateway:', error);
        this.loadingWeight = false;

        let errorMessage = 'Error al obtener peso de la báscula';
        if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el SerialGateway. Verifique que esté en ejecución.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error al solicitar peso', errorMessage);
      }
    });
  }

  /**
   * Procesa el peso capturado para el flujo de doble remolque
   */
  private processDoubleTrailerWeight(): void {
    if (!this.weightData.capturedWeight) return;

    console.log('🔍 [EXIT] processDoubleTrailerWeight - currentStep:', this.doubleTrailerState.currentStep);
    console.log('🔍 [EXIT] doubleTrailerState completo:', this.doubleTrailerState);

    switch (this.doubleTrailerState.currentStep) {
      case 'remolque1':
        // Capturar peso del remolque 1 en salida
        this.doubleTrailerState.remolque1.pesoSalida = this.weightData.capturedWeight;
        this.doubleTrailerState.remolque1.pesoSalidaCapturado = true;

        // Actualizar el campo del formulario para que se muestre en el HTML
        this.exitForm.get('pesoTaraRemolque1')?.setValue(this.weightData.capturedWeight);

        console.log('✅ [EXIT] Peso de salida del remolque 1 capturado:', this.weightData.capturedWeight);

        this.showToast('success', 'Peso capturado', `Peso de salida del remolque 1: ${this.weightData.capturedWeight} kg. Ahora suba el segundo remolque.`);

        // Avanzar al siguiente paso
        this.doubleTrailerState.currentStep = 'remolque2';
        break;

      case 'remolque2':
        // Capturar peso del remolque 2 en salida
        console.log('✅ [EXIT] Capturando peso de salida del remolque 2:', this.weightData.capturedWeight);
        this.doubleTrailerState.remolque2.pesoSalida = this.weightData.capturedWeight;
        this.doubleTrailerState.remolque2.pesoSalidaCapturado = true;

        // Actualizar el campo del formulario para que se muestre en el HTML
        this.exitForm.get('pesoTaraRemolque2')?.setValue(this.weightData.capturedWeight);

        // Calcular peso total de salida
        this.doubleTrailerState.pesoSalidaTotal =
          (this.doubleTrailerState.remolque1.pesoSalida || 0) +
          (this.doubleTrailerState.remolque2.pesoSalida || 0);

        console.log('✅ [EXIT] Peso total de salida calculado:', this.doubleTrailerState.pesoSalidaTotal);

        // Asignar el peso total al formulario
        this.exitForm.get('exitWeight')?.setValue(this.doubleTrailerState.pesoSalidaTotal);
        this.calculateNetWeight();

        this.showToast('success', 'Peso capturado', `Peso total de salida: ${this.doubleTrailerState.pesoSalidaTotal} kg`);

        this.doubleTrailerState.currentStep = 'complete';
        this.doubleTrailerState.isComplete = true;
        break;

      default:
        console.warn('⚠️ [EXIT] Paso no reconocido:', this.doubleTrailerState.currentStep);
    }
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
    this.showToast('info', 'Formulario limpiado', 'Los datos del formulario han sido limpiados');
  }

  /**
   * Guarda el registro de salida
   */
  onSave(): void {
    if (!this.isFormValid) {
      this.showToast('error', 'Formulario inválido', 'Por favor complete todos los campos requeridos');
      return;
    }

    if (!this.entryData || !this.entryFolio) {
      this.showToast('error', 'Datos incompletos', 'No hay datos de entrada válidos para procesar la salida. Debe buscar una entrada primero.');
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

        this.showToast('success', 'Salida registrada', `Salida registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`);

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

        this.showToast('error', 'Error al registrar salida', finalMessage);
      },
    });
  }

  /**
   * Guarda una salida con doble remolque
   */
  private saveDoubleTrailerExit(): void {
    if (!this.entryData) return;

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

        this.showToast('success', 'Salida registrada', `Salida con doble remolque registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`);

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

        // Datos de entrada - pasar strings directamente del backend
        fechaEntrada: this.entryData.createdAt || new Date().toISOString(),
        pesoBrutoEntrada: this.entryData.entryWeight || 0,
        placaTrailer: this.entryData.placaTrailer || '',
        placaRemolque: this.entryData.tipoUnidad === 'doble-remolque'
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
      this.showToast('warn', 'Advertencia', 'Salida registrada pero hubo un error al generar el PDF');
    }
  }

  /**
   * Obtiene el tipo de unidad de la ruta
   */
  private getUnitTypeFromRoute(): void {
    this.route.paramMap.subscribe(params => {
      this.unitType = params.get('unitType') || 'provider';
      const unitTypeTitles: Record<string, string> = {
        'provider': 'Proveedor',
        'client': 'Cliente',
        'internal': 'Interno'
      };
      this.unitTypeTitle = unitTypeTitles[this.unitType] || 'Unidad';
    });
  }

  /**
   * Verifica si el formulario es válido
   */
  get isFormValid(): boolean {
    return this.exitForm.valid;
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
            console.log('🔍 Buscando entradas pendientes con término:', searchTerm);

            // Solo buscar si hay al menos 2 caracteres y no se ha encontrado una entrada
            if (!searchTerm || searchTerm.trim().length < 2 || this.isEntryFound) {
              console.log('❌ Valor muy corto o entrada ya encontrada, limpiando sugerencias');
              this.entrySuggestions = [];
              this.showEntrySuggestions = false;
              this.cdr.detectChanges();
              return [];
            }

            // Pasar el unitType actual para filtrar resultados
            return this.weighingService.searchPendingExits(searchTerm.trim(), 10, this.unitType);
          })
        )
        .subscribe({
          next: (results: PendingExitSearchResult[]) => {
            console.log('✅ Entradas pendientes recibidas:', results);
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
  selectEntrySuggestion(entry: PendingExitSearchResult): void {
    console.log('🎯 Entrada seleccionada:', entry);

    // Actualizar el campo de placa sin disparar eventos
    this.exitForm.patchValue({ trailerPlate: entry.trailerPlate }, { emitEvent: false });

    // Ocultar sugerencias
    this.entrySuggestions = [];
    this.showEntrySuggestions = false;

    // Buscar la entrada completa usando el método existente
    this.onSearchEntry();

    this.cdr.detectChanges();
  }

  /**
   * Mostrar sugerencias al hacer focus
   */
  onEntrySearchFocus(): void {
    const plateValue = this.exitForm.get('trailerPlate')?.value;
    if (plateValue && plateValue.trim().length >= 2 && this.entrySuggestions.length > 0 && !this.isEntryFound) {
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
}
