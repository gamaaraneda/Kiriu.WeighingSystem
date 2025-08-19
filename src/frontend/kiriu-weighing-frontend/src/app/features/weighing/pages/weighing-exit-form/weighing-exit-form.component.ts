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
  WeighingService,
  WeighingOperation,
} from '../../services/weighing.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { MessageService } from '../../../../shared/services/message.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ToastModule } from 'primeng/toast';
import {
  ExitFormData,
  ExitPhotoData,
  WeightData,
} from '../../types/weighing.types';
import { EntrySearchMockService, EntrySearchResponse } from '../../services/entry-search-mock.service';

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
  };

  // Datos de la entrada encontrada
  entryData: WeighingOperation | null = null;
  isSearching = false;
  isEntryFound = false;
  isLoading = false;
  
  // Tipo de unidad para adaptar la UI
  unitFlowType: 'remolque' | 'contenedor' | 'doble-remolque' | null = null;

  // Control de edición manual de placas
  manualEditEnabled = {
    trailerPlate: false,
    trailerPlate2: false,
  };

  weightUpdateInterval: Subscription | undefined;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.unitType = params['unitType'];
      this.updateTitles();
      this.initializeForm();
      this.startWeightUpdates();
    });
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
  }

  private initializeForm(): void {
    this.exitForm = this.fb.group({
      trailerPlate: ['', [Validators.required]],
      trailerPlate2: [''],
      exitWeight: [0, [Validators.required, Validators.min(0)]],
      netWeight: [{ value: 0, disabled: true }],
    });
  }

  private startWeightUpdates(): void {
    this.weightUpdateInterval = this.weighingService
      .getWeightReadings()
      .subscribe((reading) => {
        this.weightData.currentWeight = reading.weight;
        this.weightData.isStable = reading.isStable;
        this.weightData.isConnected = reading.isConnected;
        this.weightData.weightHistory = [
          ...this.weightData.weightHistory,
          reading.weight,
        ].slice(-10); // Mantener solo los últimos 10 valores
      });
  }

  onSearchEntry(): void {
    const trailerPlate = this.exitForm.get('trailerPlate')?.value;
    if (!trailerPlate) {
      this.messageService.showErrorToast({
        title: 'Error de Validación',
        message: 'Por favor ingrese la placa del tráiler para buscar.',
        position: 'top-right',
      });
      return;
    }

    this.isSearching = true;
    
    // Usar el servicio mock para buscar entradas
    this.entrySearchMockService.searchEntryByPlate(trailerPlate).subscribe({
      next: (response: EntrySearchResponse) => {
        this.isSearching = false;
        if (response.success && response.data) {
          // Guardar el tipo de unidad para adaptar la UI
          this.unitFlowType = response.data.tipoUnidad;
          
          // Convertir la respuesta mock a WeighingOperation
          const mockOperation: WeighingOperation = {
            id: response.data.folio,
            unitType: 'client', // Por defecto cliente para el mock
            operationType: 'entry',
            trailerPlate: response.data.placaTrailer || '',
            trailerPlate2: response.data.placaRemolque || response.data.placaRemolque1 || '',
            product: response.data.producto,
            clientProviderName: response.data.cliente,
            entryWeight: response.data.pesoBruto,
            status: response.data.status as 'ENTRADA_REGISTRADA',
            createdAt: new Date(response.data.fechaEntrada),
            updatedAt: new Date(response.data.fechaEntrada),
          };
          
          this.entryData = mockOperation;
          this.isEntryFound = true;
          this.populateFormWithEntryData(mockOperation);
          
          this.messageService.showSuccessToast({
            title: 'Entrada Encontrada',
            message: `Se encontró la entrada con folio: ${response.data.folio} - Tipo: ${this.getUnitFlowTypeDisplayName(response.data.tipoUnidad)}`,
            position: 'top-right',
          });
        } else {
          this.isEntryFound = false;
          this.entryData = null;
          this.messageService.showErrorToast({
            title: 'Entrada No Encontrada',
            message: 'No se encontró una entrada previa para esta placa.',
            position: 'top-right',
        });
        }
      },
      error: (error) => {
        this.isSearching = false;
        this.messageService.showErrorToast({
          title: 'Error en la Búsqueda',
          message: 'Error al buscar la entrada. Intente nuevamente.',
          position: 'top-right',
        });
        console.error('Error searching entry:', error);
      },
    });
  }

  private populateFormWithEntryData(operation: WeighingOperation): void {
    // Los campos de entrada no son editables, solo se muestran para verificación
    this.exitForm.patchValue({
      trailerPlate: operation.trailerPlate,
      trailerPlate2: operation.trailerPlate2 || '',
    });

    // Calcular peso neto inicial (será 0 hasta que se capture el peso de salida)
    this.updateNetWeight();
  }

  onPhotoCapture(photoType: keyof ExitPhotoData): void {
    // TODO: Implementar captura de fotos con cámara real
    console.log('Capturando foto:', photoType);

    // Mock: simular captura de foto
    if (photoType === 'trailerPlate') {
      this.photoData.trailerPlate = 'Foto capturada';
    } else if (photoType === 'trailerPlate2') {
      this.photoData.trailerPlate2 = 'Foto capturada';
    } else if (photoType === 'cargoState') {
      this.photoData.cargoState = 'Foto capturada';
    }

    this.messageService.showSuccessToast({
      title: 'Foto Capturada',
      message: 'Foto capturada exitosamente',
      position: 'top-right',
    });
  }

  onEnableManualEdit(plateType: 'trailerPlate' | 'trailerPlate2'): void {
    this.manualEditEnabled[plateType] = true;
    console.log(`Edición manual habilitada para: ${plateType}`);
  }

  onCaptureWeight(): void {
    if (!this.weightData.isConnected) {
      this.messageService.showErrorToast({
        title: 'Error de Conexión',
        message: 'La báscula no está conectada.',
        position: 'top-right',
      });
      return;
    }

    if (!this.weightData.isStable) {
      this.messageService.showErrorToast({
        title: 'Peso Inestable',
        message: 'Espere a que el peso se estabilice antes de capturarlo.',
        position: 'top-right',
      });
      return;
    }

    this.weightData.capturedWeight = this.weightData.currentWeight;
    this.weightData.capturedAt = new Date();

    // Actualizar el formulario
    this.exitForm.patchValue({
      exitWeight: this.weightData.capturedWeight,
    });

    this.updateNetWeight();

    this.messageService.showSuccessToast({
      title: 'Peso Capturado',
      message: `Peso de salida capturado: ${this.weightData.capturedWeight} kg`,
      position: 'top-right',
    });
  }

  private updateNetWeight(): void {
    if (this.entryData?.entryWeight && this.exitForm.get('exitWeight')?.value) {
      const entryWeight = this.entryData.entryWeight;
      const exitWeight = this.exitForm.get('exitWeight')?.value;
      const netWeight = entryWeight - exitWeight;
      
      this.exitForm.patchValue({
        netWeight: netWeight,
      });
    }
  }

  /**
   * Obtiene el nombre de visualización del tipo de unidad
   */
  getUnitFlowTypeDisplayName(tipoUnidad: string): string {
    switch (tipoUnidad) {
      case 'remolque':
        return 'Remolque Único';
      case 'contenedor':
        return 'Solo Contenedor';
      case 'doble-remolque':
        return 'Doble Remolque';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Verifica si debe mostrar campos de remolque
   */
  shouldShowTrailerFields(): boolean {
    return this.unitFlowType === 'remolque' || this.unitFlowType === 'doble-remolque';
  }

  /**
   * Verifica si debe mostrar campos de doble remolque
   */
  shouldShowDoubleTrailerFields(): boolean {
    return this.unitFlowType === 'doble-remolque';
  }

  /**
   * Verifica si debe mostrar campos de contenedor
   */
  shouldShowContainerFields(): boolean {
    return this.unitFlowType === 'contenedor';
  }

  onSave(): void {
    if (!this.entryData) {
      this.messageService.showErrorToast({
        title: 'Error de Validación',
        message: 'Debe buscar y encontrar una entrada antes de registrar la salida.',
        position: 'top-right',
      });
      return;
    }

    if (!this.exitForm.valid) {
      this.markFormGroupTouched();
      this.messageService.showErrorToast({
        title: 'Error de Validación',
        message: 'Por favor complete todos los campos requeridos.',
        position: 'top-right',
      });
      return;
    }

    if (!this.weightData.capturedWeight) {
      this.messageService.showErrorToast({
        title: 'Error de Validación',
        message: 'Debe capturar el peso de salida antes de continuar.',
        position: 'top-right',
      });
      return;
    }

    this.isLoading = true;

    // Registrar la salida
    this.weighingService
      .updateOperationForExit(this.entryData.id, this.weightData.capturedWeight)
      .subscribe({
        next: (updatedOperation) => {
          this.isLoading = false;
          this.messageService.showExitSuccess(updatedOperation.trailerPlate);
          
          // Generar ticket o redirigir
          setTimeout(() => {
            this.onGoBack();
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          this.messageService.showExitError(
            this.entryData?.trailerPlate || '',
            'Error al registrar la salida. Intente nuevamente.'
          );
          console.error('Error registering exit:', error);
        },
      });
  }

  onClear(): void {
    this.exitForm.reset();
    this.entryData = null;
    this.isEntryFound = false;
    this.unitFlowType = null;
    this.photoData = {
      trailerPlate: '',
      trailerPlate2: '',
      cargoState: '',
    };
    this.weightData.capturedWeight = undefined;
    this.weightData.capturedAt = undefined;
  }

  onGoBack(): void {
    this.router.navigate(['/weighing', this.unitType]);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.exitForm.controls).forEach((key) => {
      const control = this.exitForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.exitForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return 'Este campo es requerido.';
      }
      if (control.errors['min']) {
        return 'El valor debe ser mayor a 0.';
      }
    }
    return '';
  }

  getCurrentTime(): Date {
    return new Date();
  }

  canCaptureWeight(): boolean {
    return this.isEntryFound && !!this.entryData;
  }

  get isFormValid(): boolean {
    return this.exitForm.valid && this.isEntryFound && !!this.weightData.capturedWeight;
  }

  onQueries(): void {
    // TODO: Implementar navegación a consultas
    console.log('Navegando a consultas');
  }

  onLogout(): void {
    // TODO: Implementar logout
    console.log('Cerrando sesión');
  }
}
