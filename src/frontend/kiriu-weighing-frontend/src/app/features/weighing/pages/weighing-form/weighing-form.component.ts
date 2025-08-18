import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../layout/header/header.component';
import {
  WeighingService,
  WeighingOperation,
} from '../../services/weighing.service';

export interface VehicleData {
  trailerPlate: string;
  trailerPlate2?: string;
  containerOnly: boolean;
  doubleTrailer: boolean;
  product: string;
}

export interface ClientProviderData {
  id?: string;
  name: string;
  rfc: string;
  isNew: boolean;
}

export interface WeightData {
  currentWeight: number;
  isStable: boolean;
  isConnected: boolean;
  weightHistory: number[];
  capturedWeight?: number;
}

export interface PhotoData {
  trailerPlate: string;
  trailerPlate2?: string;
  cargo: string;
}

@Component({
  selector: 'app-weighing-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './weighing-form.component.html',
  styleUrls: ['./weighing-form.component.scss'],
})
export class WeighingFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private weighingService = inject(WeighingService);

  unitType: string = '';
  operationType: string = '';
  unitTypeTitle: string = '';
  operationTitle: string = '';

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
  };

  isLoading = false;
  weightUpdateInterval: any;

  // Opciones de productos (mock - se puede cargar desde configuración)
  products = [
    'Material de construcción',
    'Granos',
    'Minerales',
    'Productos químicos',
    'Otros',
  ];

  // Observaciones predefinidas
  predefinedObservations = [
    'Vehículo en buen estado',
    'Carga bien asegurada',
    'Documentación completa',
    'Requiere revisión',
  ];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.unitType = params['unitType'];
      this.operationType = params['operationType'];
      this.updateTitles();
      this.initializeForm();
      this.startWeightUpdates();
      this.loadExistingData();
    });
  }

  ngOnDestroy(): void {
    if (this.weightUpdateInterval) {
      clearInterval(this.weightUpdateInterval);
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
      containerOnly: [false],
      doubleTrailer: [false],
      product: ['', Validators.required],

      // Cliente/Proveedor
      clientProviderId: [''],
      clientProviderName: ['', Validators.required],
      clientProviderRfc: ['', Validators.required],
      isNewClientProvider: [false],

      // Observaciones
      observations: [''],
    });

    // Suscribirse a cambios en los checkboxes
    this.weighingForm
      .get('containerOnly')
      ?.valueChanges.subscribe((containerOnly) => {
        this.onContainerOnlyChange(containerOnly);
      });

    this.weighingForm
      .get('doubleTrailer')
      ?.valueChanges.subscribe((doubleTrailer) => {
        this.onDoubleTrailerChange(doubleTrailer);
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
    // TODO: Implementar carga de datos de entrada previa
    // Por ahora se valida al guardar
    console.log('Validando entrada previa para salida...');
  }

  private onContainerOnlyChange(containerOnly: boolean): void {
    const trailerPlateControl = this.weighingForm.get('trailerPlate');
    const trailerPlate2Control = this.weighingForm.get('trailerPlate2');

    if (containerOnly) {
      trailerPlateControl?.clearValidators();
      trailerPlate2Control?.clearValidators();
    } else {
      trailerPlateControl?.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Z]{3}-[0-9]{3}-[A-Z0-9]{2}$/),
      ]);
      if (this.weighingForm.get('doubleTrailer')?.value) {
        trailerPlate2Control?.setValidators([
          Validators.required,
          Validators.pattern(/^[A-Z]{3}-[0-9]{3}-[A-Z0-9]{2}$/),
        ]);
      }
    }

    trailerPlateControl?.updateValueAndValidity();
    trailerPlate2Control?.updateValueAndValidity();
  }

  private onDoubleTrailerChange(doubleTrailer: boolean): void {
    const trailerPlate2Control = this.weighingForm.get('trailerPlate2');

    if (doubleTrailer) {
      trailerPlate2Control?.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Z]{3}-[0-9]{3}-[A-Z0-9]{2}$/),
      ]);
    } else {
      trailerPlate2Control?.clearValidators();
    }

    trailerPlate2Control?.updateValueAndValidity();
  }

  onCaptureWeight(): void {
    if (this.weightData.isStable && this.weightData.isConnected) {
      this.weightData.capturedWeight = this.weightData.currentWeight;
      console.log('Peso capturado:', this.weightData.capturedWeight);
    }
  }

  onPhotoCapture(photoType: keyof PhotoData): void {
    // TODO: Implementar captura de fotos con cámara
    console.log('Capturando foto:', photoType);

    // Mock: simular captura de foto
    if (photoType === 'trailerPlate') {
      this.photoData.trailerPlate = 'Foto capturada';
    } else if (photoType === 'trailerPlate2') {
      this.photoData.trailerPlate2 = 'Foto capturada';
    } else if (photoType === 'cargo') {
      this.photoData.cargo = 'Foto capturada';
    }
  }

  onAddObservation(observation: string): void {
    const currentObservations =
      this.weighingForm.get('observations')?.value || '';
    const newObservations = currentObservations
      ? `${currentObservations}; ${observation}`
      : observation;
    this.weighingForm.patchValue({ observations: newObservations });
  }

  onSave(): void {
    if (this.weighingForm.valid && this.weightData.capturedWeight) {
      this.isLoading = true;

      const formData = this.weighingForm.value;

      if (this.operationType === 'entry') {
        // Crear nueva operación de entrada
        this.weighingService
          .createEntryOperation({
            unitType: this.unitType as 'client' | 'provider',
            operationType: 'entry',
            trailerPlate: formData.trailerPlate,
            trailerPlate2: formData.trailerPlate2 || undefined,
            product: formData.product,
            clientProviderName: formData.clientProviderName,
            clientProviderRfc: formData.clientProviderRfc,
            entryWeight: this.weightData.capturedWeight,
          })
          .subscribe({
            next: (operation) => {
              this.isLoading = false;
              console.log('Entrada registrada:', operation);
              this.showSuccessMessage();
            },
            error: (error) => {
              this.isLoading = false;
              console.error('Error al registrar entrada:', error);
              alert('Error al registrar la entrada. Inténtalo de nuevo.');
            },
          });
      } else if (this.operationType === 'exit') {
        // Validar entrada previa y registrar salida
        this.weighingService
          .canRegisterExit(formData.trailerPlate)
          .subscribe((canExit) => {
            if (canExit) {
              // TODO: Implementar actualización de operación para salida
              this.isLoading = false;
              this.generateTicket();
            } else {
              this.isLoading = false;
              alert(
                'No se encontró una entrada previa para esta placa. Debe registrar una entrada antes de registrar una salida.'
              );
            }
          });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private generateTicket(): void {
    // TODO: Implementar generación de ticket PDF con QR
    console.log('Generando ticket...');
    this.showSuccessMessage();
  }

  private showSuccessMessage(): void {
    alert(
      `Operación de ${this.operationTitle.toLowerCase()} registrada exitosamente`
    );
    this.onGoBack();
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
    };
  }

  onGoBack(): void {
    this.router.navigate(['/operation-selection', this.unitType]);
  }

  onQueries(): void {
    console.log('Navegando a consultas...');
    // TODO: Implementar navegación a consultas
    alert('Funcionalidad de consultas en desarrollo');
  }

  onLogout(): void {
    // TODO: Implementar logout
    console.log('Logout...');
  }

  // Getters para validaciones
  getFieldError(fieldName: string): string {
    const field = this.weighingForm.get(fieldName);
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
    return (
      this.weighingForm.valid &&
      this.weightData.capturedWeight !== undefined &&
      !!this.photoData.trailerPlate &&
      !!this.photoData.cargo
    );
  }
}
