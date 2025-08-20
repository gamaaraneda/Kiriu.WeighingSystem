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
import { WeighingService } from '../../services/weighing.service';
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
import { EntrySearchMockService } from '../../services/entry-search-mock.service';

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
  private weighingService = inject(WeighingService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private entrySearchMockService = inject(EntrySearchMockService);

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

  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initializeForm();
    this.setupWeightSimulation();
    this.getUnitTypeFromRoute();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initializeForm(): void {
    this.exitForm = this.fb.group({
      trailerPlate: ['', [Validators.required]],
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
   * Configura la simulación de peso en tiempo real
   */
  private setupWeightSimulation(): void {
    // Simular cambios de peso cada 2 segundos
    setInterval(() => {
      if (this.weightData.isConnected) {
        const variation = Math.random() * 100 - 50; // ±50 kg
        this.weightData.currentWeight = Math.max(
          0,
          this.weightData.currentWeight + variation
        );
        this.weightData.isStable = Math.abs(variation) < 10; // Estable si variación < 10kg
      }
    }, 2000);
  }

  /**
   * Busca una entrada por placa del tráiler
   */
  onSearchEntry(): void {
    const plate = this.exitForm.get('trailerPlate')?.value;
    if (!plate) {
      this.messageService.showError({
        message: 'Debe ingresar una placa para buscar',
      });
      return;
    }

    this.isSearching = true;
    this.entrySearchMockService.searchEntryByPlate(plate).subscribe({
      next: (response) => {
        this.isSearching = false;
        if (response.success && response.data) {
          this.entryData = response.data;
          this.isEntryFound = true;
          this.populateFormWithEntryData();
          this.messageService.showSuccess({
            message: 'Entrada encontrada exitosamente',
          });
        } else {
          this.messageService.showError({
            message: response.message || 'No se encontró la entrada',
          });
        }
      },
      error: (error) => {
        this.isSearching = false;
        this.messageService.showError({
          message: 'Error al buscar la entrada',
        });
        console.error('Error searching entry:', error);
      },
    });
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
    } else {
      // Validar placas para otros tipos
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
  onPhotoCaptureWithOCR(fieldName: string): void {
    // Simular captura de foto con OCR
    const mockPlate = this.generateMockPlate(fieldName);

    if (mockPlate) {
      this.detectedPlates[fieldName] = mockPlate;
      this.exitForm.get(fieldName)?.setValue(mockPlate);

      // Simular foto capturada
      this.photoData[
        fieldName as keyof ExitPhotoData
      ] = `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Foto+${fieldName}`;

      // Validar placa
      this.onPlateManualEdit(fieldName);

      this.messageService.showSuccess({
        message: `Placa ${fieldName} detectada: ${mockPlate}`,
      });
    }
  }

  /**
   * Genera una placa mock para simulación
   */
  private generateMockPlate(fieldName: string): string {
    const plates: Record<string, string> = {
      trailerPlate: 'TRAILER-001',
      remolque1Plate: 'REM1-001',
      remolque2Plate: 'REM2-001',
      trailerPlate2: 'REMOLQUE-001',
      containerPlate: 'CONT-001',
    };

    return plates[fieldName] || 'MOCK-001';
  }

  /**
   * Captura foto para campos que no requieren OCR
   */
  onPhotoCapture(fieldName: string): void {
    // Simular captura de foto
    this.photoData[
      fieldName as keyof ExitPhotoData
    ] = `https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+${fieldName}`;

    // Actualizar estado de doble remolque si es necesario
    if (fieldName === 'cargoRemolque1') {
      this.doubleTrailerState.remolque1.fotoCargaCapturada = true;
    } else if (fieldName === 'cargoRemolque2') {
      this.doubleTrailerState.remolque2.fotoCargaCapturada = true;
    }

    this.messageService.showSuccess({
      message: `Foto de ${fieldName} capturada`,
    });
  }

  /**
   * Habilita la edición manual de una placa
   */
  onEnableManualEdit(fieldName: string): void {
    this.manualEditEnabled[fieldName] = true;
    this.messageService.showInfo({
      message: `Edición manual habilitada para ${fieldName}`,
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
    this.route.params.subscribe(params => {
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
        pesoNeto = this.entryData.entryWeight - (pesoTaraRemolque1 + pesoTaraRemolque2);
      } else {
        // Cliente (Entrada Vacío, Salida con Carga)
        // Peso neto: Peso tara - Peso bruto = Material cargado
        pesoNeto = (pesoTaraRemolque1 + pesoTaraRemolque2) - this.entryData.entryWeight;
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
    return this.weightData.isConnected && this.weightData.isStable;
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
    } else {
      // Validar campos para otros tipos
      const basicValid =
        this.exitForm.get('trailerPlate')?.valid &&
        this.exitForm.get('exitWeight')?.valid;

      const platesValid =
        this.plateValidations['trailerPlate'].isValid &&
        (this.entryData.tipoUnidad === 'contenedor' ||
          this.plateValidations['trailerPlate2'].isValid);

      const photosValid =
        this.photoData.trailerPlate &&
        (this.entryData.tipoUnidad === 'contenedor' ||
          this.photoData.trailerPlate2) &&
        this.photoData.cargoState;

      return !!(basicValid && platesValid && photosValid);
    }
  }

  /**
   * Guarda el registro de salida
   */
  onSave(): void {
    if (!this.isFormValid) {
      this.messageService.showError({
        message: 'Por favor complete todos los campos requeridos',
      });
      return;
    }

    this.isLoading = true;

    // Simular envío al backend
    setTimeout(() => {
      this.isLoading = false;
      this.isExitRegistered = true;

      this.messageService.showSuccess({
        message: 'Salida registrada exitosamente',
        duration: 3000,
      });

      // Limpiar formulario después de 3 segundos
      setTimeout(() => {
        this.onClear();
      }, 3000);
    }, 2000);
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
    this.messageService.showInfo({ message: 'Navegando a consultas...' });
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
