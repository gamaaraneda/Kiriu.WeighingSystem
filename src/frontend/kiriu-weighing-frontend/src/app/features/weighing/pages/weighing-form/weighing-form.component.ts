import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
import {
  RealWeighingService,
  DoubleTrailerWeighingState,
  RemolqueData,
  CreateEntryRequest,
  CreateDoubleTrailerEntryRequest,
  CreateExitRequest,
  CreateDoubleTrailerExitRequest,
  ExitPhotoDataDto,
  WeightReading,
} from '../../services/real-weighing.service';
import { WeighingFlowService } from '../../services/weighing-flow.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ProcessStepsComponent } from '../../../../shared/components/process-steps';
import { MessageService } from '../../../../shared/services/message.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ToastModule } from 'primeng/toast';
import { WeightData, PhotoData } from '../../types/weighing.types';

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
    cargoRemolque2: '',
  };

  // Control de edición manual de placas
  manualEditEnabled = {
    trailerPlate: false,
    trailerPlate2: false,
    remolque1Plate: false,
    remolque2Plate: false,
  };

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
  weightUpdateInterval: Subscription | undefined;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.unitType = params['unitType'];
      this.operationType = params['operationType'];
      this.updateTitles();
      this.initializeForm();
      this.startWeightUpdates();
      this.loadExistingData();

      // Validar que el flujo sea correcto
      this.validateFlow();
    });

    // Actualizar el estado de los pasos del proceso después de la inicialización
    setTimeout(() => this.updateProcessStepsStatus(), 100);
  }

  ngOnDestroy(): void {
    if (this.weightUpdateInterval) {
      this.weightUpdateInterval.unsubscribe();
    }
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

  private initializeForm(): void {
    this.weighingForm = this.fb.group({
      // Datos del vehículo
      trailerPlate: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Z]{3}-[0-9]{3}-[A-Z0-9]{2}$/),
        ],
      ],
      trailerPlate2: [''],
      remolque1Plate: [''],
      remolque2Plate: [''],
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

    this.weighingForm.get('trailerPlate')?.valueChanges.subscribe(() => {
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });

    this.weighingForm.get('trailerPlate2')?.valueChanges.subscribe(() => {
      setTimeout(() => this.updateProcessStepsStatus(), 0);
    });
  }

  private startWeightUpdates(): void {
    // Usar el servicio para obtener lecturas de peso en tiempo real
    this.weightUpdateInterval = this.weighingService
      .getWeightReadings()
      .subscribe((reading) => {
        this.weightData.currentWeight = reading.weight;
        this.weightData.isStable = reading.isStable;
        this.weightData.isConnected = reading.isConnected;

        // Actualizar historial
        if (this.weightData.weightHistory.length >= 5) {
          this.weightData.weightHistory.shift();
        }
        this.weightData.weightHistory.push(reading.weight);
      });
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
    this.weighingForm.get('trailerPlate')?.valueChanges.subscribe((plate: string) => {
      if (plate && plate.length >= 8) { // Longitud mínima para una placa válida
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
          this.messageService.showWarningToast({
            title: 'Sin entrada previa',
            message: validation.message || 'No se encontró entrada previa para esta placa',
            position: 'top-right',
          });
        }
      },
      error: (error) => {
        console.error('Error al validar salida:', error);
        // Intentar obtener datos de operación aunque la validación falle
        this.loadFullOperationData(plate);
      }
    });
  }

  private loadFullOperationData(plate: string): void {
    this.weighingService.getOperationByPlate(plate).subscribe({
      next: (operation) => {
        // Cargar datos completos de la entrada previa
        this.loadEntryDataForExit(operation);
        
        this.messageService.showInfoToast({
          title: 'Entrada encontrada',
          message: `Entrada previa encontrada. Folio: ${operation.folio}. Peso entrada: ${operation.entryWeight} kg`,
          position: 'top-right',
        });

        // Mostrar panel de información de entrada
        this.showEntryInfo = true;

        // Pre-cargar datos en el formulario si están disponibles
        this.preloadFormData(operation);
      },
      error: (error) => {
        console.error('Error al obtener operación por placa:', error);
        this.messageService.showErrorToast({
          title: 'Error de búsqueda',
          message: 'Error al buscar información de entrada previa',
          position: 'top-right',
        });
      }
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
    this.weightData.entryWeight = entryOperation.entryWeight || entryOperation.peso || 0;
    
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
      client: entryOperation.clientProviderName
    });
  }

  onCaptureWeight(): void {
    if (this.weightData.isStable && this.weightData.isConnected) {
      // Si es doble remolque, validar requisitos antes de permitir capturar peso
      if (this.weighingForm.get('doubleTrailer')?.value) {
        if (this.doubleTrailerState.currentStep === 'remolque1') {
          // Validar que se hayan capturado las placas y foto de carga antes de permitir capturar peso
          // NOTA: Usar canCaptureWeight() en lugar de canProceedToRemolque2() para evitar validación circular
          if (!this.canCaptureWeight()) {
            // Mostrar notificación de error
            this.notificationService.showError(
              'Información incompleta',
              'Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de capturar el peso.'
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

  private processDoubleTrailerWeight(): void {
    if (!this.weightData.capturedWeight) return;

    switch (this.doubleTrailerState.currentStep) {
      case 'remolque1':
        // Capturar peso del remolque 1
        this.doubleTrailerState.remolque1.pesoBruto =
          this.weightData.capturedWeight;
        this.doubleTrailerState.remolque1.pesoCapturado = true;

        // Validar que se haya capturado toda la información del primer remolque
        if (this.canProceedToRemolque2WithWeight()) {
          this.messageService.showSuccessToast({
            title: 'Peso capturado',
            message: `Peso del remolque 1: ${this.weightData.capturedWeight} kg. Ahora suba el segundo remolque.`,
            position: 'top-right',
          });

          // Avanzar al siguiente paso
          this.doubleTrailerState.currentStep = 'remolque2';

          // Actualizar el estado de los pasos del proceso
          setTimeout(() => this.updateProcessStepsStatus(), 0);
        } else {
          // Mostrar error si faltan datos del primer remolque
          this.notificationService.showError(
            'Información incompleta',
            'Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de continuar.'
          );
          // No avanzar al siguiente paso hasta que se complete la información
          return;
        }
        break;
      case 'remolque2':
        // Capturar peso del remolque 2
        this.doubleTrailerState.remolque2.pesoBruto =
          this.weightData.capturedWeight;
        this.doubleTrailerState.remolque2.pesoCapturado = true;

        // Calcular peso total
        this.doubleTrailerState.pesoBrutoTotal =
          (this.doubleTrailerState.remolque1.pesoBruto || 0) +
          (this.doubleTrailerState.remolque2.pesoBruto || 0);

        this.doubleTrailerState.currentStep = 'complete';
        this.doubleTrailerState.isComplete = true;

        this.messageService.showSuccessToast({
          title: 'Peso total calculado',
          message: `Peso total: ${this.doubleTrailerState.pesoBrutoTotal} kg. Puede proceder a guardar.`,
          position: 'top-right',
        });

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
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

      // Hacer las placas opcionales cuando es solo contenedor
      this.weighingForm.get('trailerPlate')?.clearValidators();
      this.weighingForm.get('trailerPlate')?.updateValueAndValidity();

      // Limpiar valores de placas ya que son opcionales
      this.weighingForm.patchValue({
        trailerPlate: '',
        trailerPlate2: '',
      });

      // Limpiar datos de fotos de placas
      this.photoData.trailerPlate = '';
      this.photoData.trailerPlate2 = '';
    } else {
      // Si se desmarca "Solo contenedor", restaurar validaciones normales
      this.weighingForm
        .get('trailerPlate')
        ?.setValidators([
          Validators.required,
          Validators.pattern(/^[A-Z]{3}-[0-9]{3}-[A-Z0-9]{2}$/),
        ]);
      this.weighingForm.get('trailerPlate')?.updateValueAndValidity();
    }

    // Actualizar el estado de los pasos del proceso
    setTimeout(() => this.updateProcessStepsStatus(), 0);
  }

  onDoubleTrailerChange(isChecked: boolean): void {
    if (isChecked) {
      // Si se selecciona "Doble remolque", desmarcar "Solo contenedor"
      this.weighingForm.patchValue({ containerOnly: false });
      this.initializeDoubleTrailerFlow();
    } else {
      this.resetDoubleTrailerState();
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
   * Valida que se haya capturado toda la información del primer remolque
   * ANTES de permitir avanzar al segundo remolque
   * NOTA: AHORA SÍ se valida el peso del Remolque 1
   */
  canProceedToRemolque2(): boolean {
    // Validar que se haya capturado:
    // 1. Placa del tráiler
    // 2. Placa del remolque 1
    // 3. Foto de la carga del remolque 1
    // 4. Material/producto
    // 5. Nombre del proveedor/cliente
    // 6. Peso del remolque 1 (NUEVO REQUISITO)
    return !!(
      this.doubleTrailerState.trailerPlaca &&
      this.doubleTrailerState.remolque1.fotoPlacaCapturada &&
      this.doubleTrailerState.remolque1.fotoCargaCapturada &&
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
   * NOTA: Esta función NO incluye la validación del peso, solo los campos previos
   */
  canCaptureWeight(): boolean {
    if (!this.weighingForm.get('doubleTrailer')?.value) return true;

    // Solo validar cuando estamos en el paso del remolque 1
    if (this.doubleTrailerState.currentStep === 'remolque1') {
      // Validar que se haya capturado:
      // 1. Placa del tráiler
      // 2. Placa del remolque 1
      // 3. Foto de la carga del remolque 1
      // 4. Material/producto
      // 5. Nombre del proveedor/cliente
      // NOTA: NO se valida el peso aquí, solo se valida cuando se quiere proceder al remolque 2
      const canCapture = !!(
        this.doubleTrailerState.trailerPlaca &&
        this.doubleTrailerState.remolque1.fotoPlacaCapturada &&
        this.doubleTrailerState.remolque1.fotoCargaCapturada &&
        this.weighingForm.get('product')?.value &&
        this.weighingForm.get('clientProviderName')?.value
      );

      // Log de debug para identificar el problema
      console.log('🔍 Debug canCaptureWeight:', {
        currentStep: this.doubleTrailerState.currentStep,
        trailerPlaca: !!this.doubleTrailerState.trailerPlaca,
        fotoPlacaCapturada:
          !!this.doubleTrailerState.remolque1.fotoPlacaCapturada,
        fotoCargaCapturada:
          !!this.doubleTrailerState.remolque1.fotoCargaCapturada,
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

    this.messageService.showInfoToast({
      title: 'Flujo de doble remolque',
      message:
        'Seleccione la placa del tráiler y luego proceda con el primer remolque.',
      position: 'top-right',
    });
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
        Math.floor(Math.random() * alphanumeric.length)
      );
    }

    return plate;
  }

  onPhotoCapture(photoType: keyof PhotoData): void {
    // TODO: Implementar captura de fotos con cámara real
    console.log('Capturando foto:', photoType);

    // Mock: simular captura de foto y detección automática de placa
    if (photoType === 'trailerPlate') {
      this.photoData.trailerPlate = 'Foto capturada';
      // Generar placa aleatoria en lugar de estática
      const randomPlate = this.generateRandomPlate();
      this.weighingForm.patchValue({ trailerPlate: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);

      // Si es doble remolque, actualizar el estado
      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.doubleTrailerState.trailerPlaca = randomPlate;
        this.doubleTrailerState.currentStep = 'remolque1';
      }
    } else if (photoType === 'remolque1Plate') {
      this.photoData.remolque1Plate = 'Foto capturada';
      // Generar placa aleatoria en lugar de estática
      const randomPlate = this.generateRandomPlate();
      this.weighingForm.patchValue({ remolque1Plate: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);

      // Si es doble remolque, actualizar el estado del remolque 1
      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.doubleTrailerState.remolque1.placa = randomPlate;
        this.doubleTrailerState.remolque1.fotos = ['foto_remolque1.jpg'];
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
      this.weighingForm.patchValue({ remolque2Plate: randomPlate });
      console.log('Placa detectada automáticamente:', randomPlate);

      // Si es doble remolque, actualizar el estado del remolque 2
      if (this.weighingForm.get('doubleTrailer')?.value) {
        this.doubleTrailerState.remolque2.placa = randomPlate;
        this.doubleTrailerState.remolque2.fotos = ['foto_remolque2.jpg'];
        // Marcar que se capturó la foto de la placa del remolque 2
        this.doubleTrailerState.remolque2.fotoPlacaCapturada = true;
        // NO marcar fotosCapturadas aquí, solo se marca cuando se captura la foto de carga
        // this.doubleTrailerState.remolque2.fotosCapturadas = true;
      }
    } else if (photoType === 'cargo') {
      this.photoData.cargo = 'Foto capturada';

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
          'foto_carga_remolque1.jpg',
        ];
        // También marcar que se capturó la foto de carga del remolque 1
        this.doubleTrailerState.remolque1.fotoCargaCapturada = true;

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
      }
    } else if (photoType === 'cargoRemolque2') {
      this.photoData.cargoRemolque2 = 'Foto capturada';

      // Si es doble remolque, actualizar el estado del remolque 2
      if (this.weighingForm.get('doubleTrailer')?.value) {
        if (!this.doubleTrailerState.remolque2.fotos) {
          this.doubleTrailerState.remolque2.fotos = [];
        }
        this.doubleTrailerState.remolque2.fotos = [
          ...this.doubleTrailerState.remolque2.fotos,
          'foto_carga_remolque2.jpg',
        ];
        this.doubleTrailerState.remolque2.fotosCapturadas = true;

        // Actualizar el estado de los pasos del proceso
        setTimeout(() => this.updateProcessStepsStatus(), 0);
      }
    } else if (photoType === 'trailerPlate2') {
      this.photoData.trailerPlate2 = 'Foto capturada';
      // Generar placa aleatoria en lugar de estática
      const randomPlate = this.generateRandomPlate();
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
      | 'remolque2Plate'
  ): void {
    // Habilitar edición manual del campo de placa
    this.manualEditEnabled[plateType] = true;
    console.log(`Edición manual habilitada para: ${plateType}`);
  }

  onSave(): void {
    if (this.weighingForm.valid && this.weightData.capturedWeight) {
      this.isLoading = true;

      const formData = this.weighingForm.value;

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
      this.markFormGroupTouched();
    }
  }

  private saveDoubleTrailerEntry(formData: Record<string, unknown>): void {
    if (!this.doubleTrailerState.isComplete) {
      this.messageService.showErrorToast({
        title: 'Datos incompletos',
        message:
          'Debe completar el pesaje de ambos remolques antes de guardar.',
        position: 'top-right',
      });
      this.isLoading = false;
      return;
    }

    const entradaData: CreateDoubleTrailerEntryRequest = {
      unitType: this.unitType as 'client' | 'provider',
      tipoUnidad: 'doble-remolque',
      trailerPlaca: this.doubleTrailerState.trailerPlaca,
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
    };

    this.weighingService.createDoubleTrailerEntry(entradaData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Entrada con doble remolque registrada:', response);

        // El interceptor ya procesó la respuesta y extrajo solo los datos
        this.messageService.showSuccessToast({
          title: 'Entrada registrada',
          message: `Entrada con doble remolque registrada exitosamente. Folio: ${response.folio}`,
          position: 'top-right',
        });

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

        this.messageService.showErrorToast({
          title: 'Error al registrar',
          message: errorMessage,
          position: 'top-right',
        });
      },
    });
  }

  private saveNormalEntry(formData: Record<string, unknown>): void {
    // Determinar tipo de unidad basado en checkboxes
    const tipoUnidad = formData['containerOnly'] ? 'contenedor' : 'remolque';

    // Crear request para el backend
    const request: CreateEntryRequest = {
      unitType: this.unitType as 'client' | 'provider',
      operationType: 'entry',
      tipoUnidad: tipoUnidad,
      trailerPlate: formData['trailerPlate'] as string,
      trailerPlate2: (formData['trailerPlate2'] as string) || undefined,
      trailerPlateContenedor: formData['containerOnly']
        ? (formData['trailerPlate'] as string)
        : undefined,
      remolquePlateContenedor: formData['containerOnly']
        ? (formData['trailerPlate2'] as string)
        : undefined,
      product: formData['product'] as string,
      clientProviderName: formData['clientProviderName'] as string,
      clientProviderRfc: (formData['clientProviderRfc'] as string) || undefined,
      entryWeight: this.weightData.capturedWeight || 0,
      photos: {
        trailerPlate: this.photoData.trailerPlate || undefined,
        trailerPlate2: this.photoData.trailerPlate2 || undefined,
        cargo: this.photoData.cargo || '',
      },
    };

    this.weighingService.createEntryOperation(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Entrada registrada:', response);

        // El interceptor ya procesó la respuesta y extrajo solo los datos
        this.messageService.showSuccessToast({
          title: 'Entrada registrada',
          message: `Entrada registrada exitosamente. Folio: ${response.folio}`,
          position: 'top-right',
        });

        // Generar ticket para entrada normal
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

        this.messageService.showErrorToast({
          title: 'Error al registrar',
          message: errorMessage,
          position: 'top-right',
        });
      },
    });
  }

  private saveNormalExit(formData: Record<string, unknown>): void {
    // Validar que haya peso de entrada y de salida
    if (!this.weightData.hasValidEntry || !this.weightData.entryWeight) {
      this.isLoading = false;
      this.messageService.showErrorToast({
        title: 'Error de validación',
        message: 'No se encontró entrada previa válida para esta placa.',
        position: 'top-right',
      });
      return;
    }

    if (!this.weightData.capturedWeight) {
      this.isLoading = false;
      this.messageService.showErrorToast({
        title: 'Error de validación',
        message: 'Debe capturar el peso de salida.',
        position: 'top-right',
      });
      return;
    }

    // Determinar tipo de unidad basado en checkboxes
    const tipoUnidad = formData['containerOnly'] ? 'contenedor' : 'remolque';
    
    // Calcular peso neto (peso entrada - peso salida)
    const pesoNeto = this.weightData.entryWeight - this.weightData.capturedWeight;
    
    // Crear request para el backend
    const exitRequest: CreateExitRequest = {
      folio: '', // Se generará en el backend
      pesoBruto: this.weightData.capturedWeight,
      pesoTara: this.weightData.capturedWeight, // Peso de salida es tara
      pesoNeto: Math.abs(pesoNeto), // Valor absoluto del peso neto
      placaTrailer: formData['trailerPlate'] as string,
      placaRemolque: (formData['trailerPlate2'] as string) || undefined,
      placaContenedor: formData['containerOnly'] ? (formData['trailerPlate'] as string) : undefined,
      placaTrailerContenedor: formData['containerOnly'] ? (formData['trailerPlate'] as string) : undefined,
      placaRemolqueContenedor: formData['containerOnly'] ? (formData['trailerPlate2'] as string) : undefined,
      fotos: {
        trailerPlate: this.photoData.trailerPlate || undefined,
        trailerPlate2: this.photoData.trailerPlate2 || undefined,
        cargoState: this.photoData.cargo || '',
        containerPlate: formData['containerOnly'] ? (formData['trailerPlate'] as string) : undefined,
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
        this.messageService.showSuccessToast({
          title: 'Salida registrada',
          message: `Salida registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
          position: 'top-right',
        });

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
        
        this.messageService.showErrorToast({
          title: 'Error al registrar',
          message: errorMessage,
          position: 'top-right',
        });
      },
    });
  }

  private saveDoubleTrailerExit(formData: Record<string, unknown>): void {
    // Validar que el flujo de doble remolque esté completo
    if (!this.doubleTrailerState.isComplete) {
      this.messageService.showErrorToast({
        title: 'Datos incompletos',
        message: 'Debe completar el pesaje de ambos remolques antes de guardar la salida.',
        position: 'top-right',
      });
      this.isLoading = false;
      return;
    }

    // Validar entrada previa
    if (!this.weightData.hasValidEntry || !this.weightData.entryWeight) {
      this.isLoading = false;
      this.messageService.showErrorToast({
        title: 'Error de validación',
        message: 'No se encontró entrada previa válida para esta placa.',
        position: 'top-right',
      });
      return;
    }

    // Calcular peso neto total (peso entrada - peso salida total)
    const pesoNetoCalculado = this.weightData.entryWeight - this.doubleTrailerState.pesoBrutoTotal;

    const exitRequest: CreateDoubleTrailerExitRequest = {
      folio: '', // Se generará en el backend  
      placaTrailer: this.doubleTrailerState.trailerPlaca,
      remolque1: {
        placa: this.doubleTrailerState.remolque1.placa || '',
        pesoTara: this.doubleTrailerState.remolque1.pesoBruto || 0,
        fotoCargaCapturada: this.doubleTrailerState.remolque1.fotoCargaCapturada || false,
      },
      remolque2: {
        placa: this.doubleTrailerState.remolque2.placa || '',
        pesoTara: this.doubleTrailerState.remolque2.pesoBruto || 0,
        fotoCargaCapturada: this.doubleTrailerState.remolque2.fotoCargaCapturada || false,
      },
      pesoBrutoTotal: this.doubleTrailerState.pesoBrutoTotal,
      pesoNetoCalculado: Math.abs(pesoNetoCalculado),
      fechaSalida: new Date().toISOString(),
      fotos: {
        trailerPlate: this.photoData.trailerPlate || '',
        remolque1Plate: this.photoData.remolque1Plate || '',
        remolque2Plate: this.photoData.remolque2Plate || '',
        cargoRemolque1: this.photoData.cargo || '',
        cargoRemolque2: this.photoData.cargoRemolque2 || '',
      },
    };

    this.weighingService.createDoubleTrailerExit(exitRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Salida con doble remolque registrada:', response);

        // El interceptor ya procesó la respuesta
        this.messageService.showSuccessToast({
          title: 'Salida registrada',
          message: `Salida con doble remolque registrada exitosamente. Folio: ${response.folio}. Peso neto: ${response.pesoNeto} kg`,
          position: 'top-right',
        });

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
    operation: any
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
    this.messageService.showSuccessToast({
      title: 'Operación registrada',
      message: message,
      position: 'top-right',
    });

    // Esperar 3 segundos para que el usuario vea el mensaje antes de redirigir
    setTimeout(() => {
      console.log('🔄 Redirigiendo después de generar ticket...');
      this.onGoBack();
    }, 3000);
  }

  private showSuccessMessage(): void {
    console.log('🔔 showSuccessMessage llamado...');

    try {
      this.messageService.showSuccessToast({
        title: 'Operación registrada',
        message: `Operación de ${this.operationTitle.toLowerCase()} registrada exitosamente`,
        position: 'top-right',
      });
      console.log('✅ Toast de éxito enviado desde showSuccessMessage');
    } catch (error) {
      console.error('❌ Error en showSuccessMessage:', error);
    }

    // Esperar 3 segundos para que el usuario vea el mensaje antes de redirigir
    setTimeout(() => {
      console.log('🔄 Redirigiendo desde showSuccessMessage...');
      this.onGoBack();
    }, 3000);
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

  onQueries(): void {
    console.log('Navegando a consultas...');
    this.router.navigate(['/weighing-query']);
  }

  onLogout(): void {
    // TODO: Implementar logout
    console.log('Logout...');
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
    }
    return '';
  }

  get isFormValid(): boolean {
    const isContainerOnly = this.weighingForm.get('containerOnly')?.value;
    const isDoubleTrailer = this.weighingForm.get('doubleTrailer')?.value;

    // Si es solo contenedor, las placas son opcionales
    if (isContainerOnly) {
      return (
        this.weighingForm.valid &&
        this.weightData.capturedWeight !== undefined &&
        !!this.photoData.cargo
      );
    }

    // Si es doble remolque, validar el flujo completo
    if (isDoubleTrailer) {
      return (
        this.weighingForm.valid &&
        this.doubleTrailerState.isComplete &&
        !!this.photoData.cargo
      );
    }

    // Si no es solo contenedor ni doble remolque, todas las placas son obligatorias
    return (
      this.weighingForm.valid &&
      this.weightData.capturedWeight !== undefined &&
      !!this.photoData.trailerPlate &&
      !!this.photoData.trailerPlate2 &&
      !!this.photoData.cargo
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
          this.doubleTrailerState.remolque1.fotosCapturadas
        );
      case 'remolque2':
        return !!(
          this.doubleTrailerState.remolque2.pesoCapturado &&
          this.doubleTrailerState.remolque2.fotosCapturadas
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
    flowType: 'container-only' | 'single-trailer' | 'double-trailer'
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
            !!this.doubleTrailerState.remolque2.fotosCapturadas,
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
      !!this.weighingForm.get('product')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'client',
      !!this.weighingForm.get('clientProviderName')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'cargo-photo',
      !!this.photoData.cargo
    );
    this.processStepsComponent?.updateStepStatus(
      'weight',
      this.weightData.capturedWeight !== undefined
    );
  }

  /**
   * Actualiza los pasos para el flujo "Remolque único"
   */
  private updateSingleTrailerSteps(): void {
    this.processStepsComponent?.updateStepStatus(
      'trailer-plate',
      !!this.weighingForm.get('trailerPlate')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'trailer2-plate',
      !!this.weighingForm.get('trailerPlate2')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'product',
      !!this.weighingForm.get('product')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'client',
      !!this.weighingForm.get('clientProviderName')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'cargo-photo',
      !!this.photoData.cargo
    );
    this.processStepsComponent?.updateStepStatus(
      'weight',
      this.weightData.capturedWeight !== undefined
    );
  }

  /**
   * Actualiza los pasos para el flujo "Doble remolque"
   */
  private updateDoubleTrailerSteps(): void {
    this.processStepsComponent?.updateStepStatus(
      'trailer-plate',
      !!this.doubleTrailerState.trailerPlaca
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque1-plate',
      !!this.doubleTrailerState.remolque1.placa
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque1-cargo',
      !!this.doubleTrailerState.remolque1.fotoCargaCapturada
    );
    this.processStepsComponent?.updateStepStatus(
      'product',
      !!this.weighingForm.get('product')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'client',
      !!this.weighingForm.get('clientProviderName')?.value
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque2-plate',
      !!this.doubleTrailerState.remolque2.placa
    );
    this.processStepsComponent?.updateStepStatus(
      'remolque2-cargo',
      !!this.doubleTrailerState.remolque2.fotosCapturadas
    );
    this.processStepsComponent?.updateStepStatus(
      'weight',
      this.doubleTrailerState.isComplete
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
    return this.operationType === 'exit' && (this.weightData.hasValidEntry === true) && this.showEntryInfo;
  }

  get entryInfoData() {
    return {
      folio: this.weightData.entryFolio || 'N/A',
      weight: this.weightData.entryWeight || 0,
      date: this.weightData.entryDate ? new Date(this.weightData.entryDate).toLocaleString() : 'N/A',
      product: this.weighingForm.get('product')?.value || 'N/A',
      client: this.weighingForm.get('clientProviderName')?.value || 'N/A'
    };
  }

  get calculatedNetWeight(): number {
    if (this.weightData.entryWeight && this.weightData.capturedWeight) {
      return Math.abs(this.weightData.entryWeight - this.weightData.capturedWeight);
    }
    return 0;
  }

  hideEntryInfo(): void {
    this.showEntryInfo = false;
  }
}
