import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { MessageService } from '../../../../shared/services/message.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ToastModule } from 'primeng/toast';
import {
  RealWeighingService,
  ContinueDoubleTrailerEntryRequest,
  RemolqueEntryData,
} from '../../services/real-weighing.service';
import {
  PendingDoubleTrailerSearchResult,
  PartialDoubleTrailerEntryResponse,
} from '../../types/weighing.types';
import { PendingDoubleTrailerExitSearchResult } from '../../services/real-weighing.service';
import {
  PesoRealtimeService,
  PesoData,
  ConnectionStatus,
} from '../../services/peso-realtime.service';
import { AnprService, AnprEvent } from '../../services/anpr.service';
import { CargoCameraService } from '../../services/cargo-camera.service';
import { TrailerCameraService } from '../../services/trailer-camera.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-continue-double-trailer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    ToastModule,
    RouterLink,
  ],
  templateUrl: './continue-double-trailer.component.html',
  styleUrls: ['./continue-double-trailer.component.scss'],
})
export class ContinueDoubleTrailerComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private weighingService = inject(RealWeighingService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private pesoRealtimeService = inject(PesoRealtimeService);
  private anprService = inject(AnprService);
  private cargoCameraService = inject(CargoCameraService);
  private trailerCameraService = inject(TrailerCameraService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  // Estado de búsqueda
  searchForm!: FormGroup;
  searchResults: PendingDoubleTrailerSearchResult[] = [];
  searchResultsExit: PendingDoubleTrailerExitSearchResult[] = [];
  showResults = false;
  isSearching = false;
  /** 'entry' = entrada pendiente (remolque 2), 'exit' = salida pendiente (remolque 2) */
  searchMode: 'entry' | 'exit' = 'entry';

  // Operación seleccionada
  selectedOperation: PartialDoubleTrailerEntryResponse | null = null;

  // Formulario de remolque 2
  remolque2Form!: FormGroup;
  isLoading = false;

  // Control de peso
  currentWeight = 0;
  isWeightStable = false;
  weightCaptured = false;
  capturedWeight = 0;

  // Control de fotos
  photoData = {
    remolque2Plate: '',
    cargoRemolque2: '',
  };

  // SignalR subscriptions
  private pesoRealtimeSubscription?: Subscription;
  private connectionStatusSubscription?: Subscription;
  connectionStatus: ConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0,
  };

  // Subscriptions
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initializeSearchForm();
    this.initializeRemolque2Form();
    this.startRealtimeWeightUpdates();
    this.setupSearchSubscription();
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

  private initializeSearchForm(): void {
    this.searchForm = this.fb.group({
      searchTerm: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  private initializeRemolque2Form(): void {
    this.remolque2Form = this.fb.group({
      remolque2Plate: ['', [Validators.required]],
    });
  }

  private setupSearchSubscription(): void {
    this.subscriptions.add(
      this.searchForm
        .get('searchTerm')
        ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((searchTerm) => {
          if (searchTerm && searchTerm.length >= 2) {
            this.searchPendingOperations(searchTerm);
          } else {
            this.searchResults = [];
            this.showResults = false;
          }
        }),
    );
  }

  private searchPendingOperations(searchTerm: string): void {
    this.isSearching = true;
    if (this.searchMode === 'exit') {
      this.weighingService
        .searchPendingDoubleTrailerExits(searchTerm, 10)
        .subscribe({
          next: (results) => {
            this.isSearching = false;
            this.searchResultsExit = results || [];
            this.showResults = this.searchResultsExit.length > 0;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isSearching = false;
            console.error('Error al buscar salidas parciales:', error);
            this.showToast(
              'error',
              'Error de búsqueda',
              'No se pudieron cargar las operaciones con salida parcial',
            );
          },
        });
      return;
    }
    this.weighingService.searchPendingDoubleTrailers(searchTerm, 10).subscribe({
      next: (response) => {
        this.isSearching = false;
        this.searchResults = response || [];
        this.showResults = this.searchResults.length > 0;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error al buscar operaciones parciales:', error);
        this.showToast(
          'error',
          'Error de búsqueda',
          'No se pudieron cargar las operaciones parciales',
        );
      },
    });
  }

  setSearchMode(mode: 'entry' | 'exit'): void {
    this.searchMode = mode;
    this.searchResults = [];
    this.searchResultsExit = [];
    this.showResults = false;
    this.searchForm.patchValue({ searchTerm: '' });
    this.cdr.markForCheck();
  }

  selectOperation(operation: PendingDoubleTrailerSearchResult): void {
    this.router.navigate(['/weighing/client/entry'], {
      queryParams: { mode: 'continue-double-trailer', folio: operation.folio },
    });
  }

  selectOperationExit(operation: PendingDoubleTrailerExitSearchResult): void {
    this.router.navigate(['/weighing-exit/client'], {
      queryParams: {
        mode: 'continue-double-trailer-exit',
        folio: operation.folio,
      },
    });
  }

  private startRealtimeWeightUpdates(): void {
    this.pesoRealtimeSubscription = this.pesoRealtimeService
      .getPesoObservable()
      .subscribe((pesoData: PesoData | null) => {
        if (pesoData) {
          this.currentWeight = pesoData.peso;
          this.isWeightStable =
            Math.abs(pesoData.peso - this.currentWeight) < 5;
          this.cdr.markForCheck();
        }
      });

    this.connectionStatusSubscription = this.pesoRealtimeService
      .getConnectionStatus()
      .subscribe((status: ConnectionStatus) => {
        this.connectionStatus = status;
        this.cdr.markForCheck();
      });
  }

  captureWeight(): void {
    if (!this.isWeightStable) {
      this.showToast(
        'warn',
        'Peso inestable',
        'Espere a que el peso se estabilice',
      );
      return;
    }

    this.capturedWeight = this.currentWeight;
    this.weightCaptured = true;
    this.showToast(
      'success',
      'Peso capturado',
      `Peso capturado: ${this.capturedWeight} kg`,
    );
  }

  onPhotoCapture(photoType: string): void {
    // TODO: Implementar captura de fotos cuando los servicios estén listos
    // Por ahora simular captura exitosa
    if (photoType === 'remolque2Plate') {
      // Simular captura de placa
      this.photoData.remolque2Plate = '/assets/placeholder-plate.jpg';
      this.showToast(
        'info',
        'Simulación',
        'Captura de placa simulada (implementar servicio real)',
      );
    } else if (photoType === 'cargoRemolque2') {
      // Simular captura de carga
      this.photoData.cargoRemolque2 = '/assets/placeholder-cargo.jpg';
      this.showToast(
        'info',
        'Simulación',
        'Captura de carga simulada (implementar servicio real)',
      );
    }
  }

  canSubmit(): boolean {
    return !!(
      this.selectedOperation &&
      this.remolque2Form.valid &&
      this.weightCaptured &&
      this.photoData.remolque2Plate &&
      this.photoData.cargoRemolque2
    );
  }

  submitRemolque2(): void {
    if (!this.canSubmit() || !this.selectedOperation) {
      this.showToast(
        'error',
        'Datos incompletos',
        'Complete todos los campos obligatorios',
      );
      return;
    }

    this.isLoading = true;

    const remolque2Data: RemolqueEntryData = {
      numero: 2,
      placa: this.remolque2Form.get('remolque2Plate')?.value,
      pesoBruto: this.capturedWeight,
      fotos: [
        { url: this.photoData.remolque2Plate, type: 'plate' },
        { url: this.photoData.cargoRemolque2, type: 'cargo' }
      ],
      pesoCapturado: true,
      fotosCapturadas: true,
      fotoCargaCapturada: true,
      fotoPlacaCapturada: true,
    };

    const request: ContinueDoubleTrailerEntryRequest = {
      folio: this.selectedOperation.folio,
      remolque2: remolque2Data,
      tieneEdicionesManuale: false,
    };

    this.weighingService.continueDoubleTrailerEntry(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        // El interceptor ya extrae body.data, así que response ES directamente el objeto
        this.showToast(
          'success',
          'Operación completada',
          `Doble remolque completado exitosamente. Folio: ${response.folio}`,
        );

        // Redirigir a consulta de pesajes
        setTimeout(() => {
          this.router.navigate(['/weighing/query']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al completar doble remolque:', error);

        let errorMessage = 'No se pudo completar la operación.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }

        this.showToast('error', 'Error', errorMessage);
      },
    });
  }

  onQueries(): void {
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

  cancel(): void {
    this.selectedOperation = null;
    this.remolque2Form.reset();
    this.weightCaptured = false;
    this.capturedWeight = 0;
    this.photoData = {
      remolque2Plate: '',
      cargoRemolque2: '',
    };
  }

  private showToast(
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail: string,
  ): void {
    switch (severity) {
      case 'success':
        this.notificationService.showSuccess(summary, detail);
        break;
      case 'error':
        this.notificationService.showError(summary, detail);
        break;
      case 'info':
        this.notificationService.showInfo(summary, detail);
        break;
      case 'warn':
        this.notificationService.showInfo(summary, detail);
        break;
    }
  }
}
