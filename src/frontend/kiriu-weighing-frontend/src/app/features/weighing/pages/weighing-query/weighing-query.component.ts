import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import {
  WeighingQueryService,
  WeighingQueryFilters,
  WeighingQueryResult,
} from '../../services/weighing-query.service';
import { AuthService } from '../../../../core/services/auth.service';
import { extractErrorMessage } from '../../../../shared/utils/error.utils';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { PermissionsService } from '../../../../core/services/permissions.service';
import {
  PdfGeneratorService,
  WeighingReceiptData,
} from '../../services/pdf-generator.service';
import { RealWeighingService } from '../../services/real-weighing.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-weighing-query',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    BreadcrumbComponent,
    HasPermissionDirective,
  ],
  templateUrl: './weighing-query.component.html',
  styleUrls: ['./weighing-query.component.scss'],
})
export class WeighingQueryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  filtersForm!: FormGroup;
  queryResults: WeighingQueryResult[] = [];
  totalResults = 0;
  currentPage = 1;
  pageSize = 10;
  isLoading = false;
  hasSearched = false;
  today = new Date();

  // Modal state
  showDetailModal = false;
  selectedOperation: WeighingQueryResult | null = null;
  photosExpanded = false;

  // Edit modal state
  showEditModal = false;
  operationToEdit: WeighingQueryResult | null = null;
  editForm!: FormGroup;

  // Permission state
  hasReportsPermission = false;

  estadoOptions = [
    { label: 'Entrada', value: 'ENTRADA_REGISTRADA' },
    { label: 'Salida', value: 'SALIDA_REGISTRADA' },
  ];

  edicionPosteriorOptions = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Editado', value: 'Editado' },
    { label: 'No Editado', value: 'NoEditado' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private weighingQueryService: WeighingQueryService,
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private pdfGeneratorService: PdfGeneratorService,
    private weighingService: RealWeighingService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    this.initializeEditForm();
  }

  ngOnInit(): void {
    // Usar setTimeout para evitar el error NG0100
    setTimeout(() => {
      this.checkPermissions();
    }, 0);
    this.setupFormSubscriptions();
  }

  private checkPermissions(): void {
    this.hasReportsPermission =
      this.permissionsService.hasPermission('REPORTES.READ');

    // Si no tiene permisos, mostrar mensaje de error
    if (!this.hasReportsPermission) {
      this.showToast(
        'warn',
        'Acceso Restringido',
        'No tienes permisos para acceder a los reportes del sistema'
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Limpiar scroll lock si el modal está abierto
    if (this.showDetailModal) {
      document.body.classList.remove('km-scroll-lock');
    }
  }

  private initializeForm(): void {
    this.filtersForm = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      folio: [''],
      placas: [''],
      estado: [''],
      edicionPosterior: ['Todos'],
    });
  }

  private initializeEditForm(): void {
    this.editForm = this.fb.group({
      entryWeight: [null],
      exitWeight: [null],
    });
  }

  private setupFormSubscriptions(): void {
    // No hay suscripciones automáticas - la búsqueda solo se dispara con el botón
  }

  onSearch(): void {
    this.currentPage = 1;
    this.hasSearched = true;
    this.executeSearch();
  }

  // Métodos de paginación nativa
  goToPage(page: number): void {
    if (
      page >= 1 &&
      page <= this.getTotalPages() &&
      page !== this.currentPage
    ) {
      this.currentPage = page;
      this.executeSearch();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalResults / this.pageSize);
  }

  getStartRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    const end = this.currentPage * this.pageSize;
    return Math.min(end, this.totalResults);
  }

  private executeSearch(): void {
    this.isLoading = true;

    const filters: WeighingQueryFilters = {
      ...this.filtersForm.value,
      page: this.currentPage,
      size: this.pageSize,
    };

    // Limpiar campos vacíos
    Object.keys(filters).forEach((key) => {
      if (
        filters[key as keyof WeighingQueryFilters] === '' ||
        filters[key as keyof WeighingQueryFilters] === null
      ) {
        delete filters[key as keyof WeighingQueryFilters];
      }
    });

    this.weighingQueryService
      .queryOperations(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.queryResults = response.resultados;
          this.totalResults = response.pagination.total;

          if (this.queryResults.length === 0 && this.currentPage === 1) {
            this.showToast(
              'info',
              'Sin resultados',
              'No se encontraron operaciones que coincidan con los filtros especificados'
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = extractErrorMessage(error);
          this.handleError('Error al consultar operaciones: ' + errorMessage);
          console.error('Error en búsqueda:', error);
        },
      });
  }

  onClearFilters(): void {
    this.filtersForm.reset({
      fechaDesde: null,
      fechaHasta: null,
      folio: '',
      placas: '',
      estado: '',
      edicionPosterior: 'Todos',
    });
    this.queryResults = [];
    this.totalResults = 0;
    this.hasSearched = false;
  }

  onExportExcel(): void {
    // Verificar permisos antes de exportar
    if (!this.permissionsService.hasPermission('REPORTES.EXPORT')) {
      this.showToast(
        'error',
        'Acceso Denegado',
        'No tienes permisos para exportar reportes'
      );
      return;
    }

    if (this.queryResults.length === 0) {
      this.showToast('warn', 'Sin datos', 'No hay resultados para exportar');
      return;
    }

    const filters: WeighingQueryFilters = {
      ...this.filtersForm.value,
    };

    // Limpiar campos vacíos
    Object.keys(filters).forEach((key) => {
      if (
        filters[key as keyof WeighingQueryFilters] === '' ||
        filters[key as keyof WeighingQueryFilters] === null
      ) {
        delete filters[key as keyof WeighingQueryFilters];
      }
    });

    this.isLoading = true;

    this.weighingQueryService
      .exportToExcel(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.isLoading = false;
          const filename = `Operaciones_Pesaje_${new Date().getTime()}.xlsx`;
          this.weighingQueryService.downloadFile(blob, filename);

          this.showToast(
            'success',
            'Exportación exitosa',
            'El archivo Excel ha sido descargado'
          );
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError('Error al exportar datos');
          console.error('Error en exportación:', error);
        },
      });
  }

  onViewDetail(operation: WeighingQueryResult): void {
    this.selectedOperation = operation;
    this.showDetailModal = true;
    // Bloquear scroll del body
    document.body.classList.add('km-scroll-lock');
  }

  onCloseDetailModal(): void {
    this.showDetailModal = false;
    this.selectedOperation = null;
    this.photosExpanded = false;
    // Desbloquear scroll del body
    document.body.classList.remove('km-scroll-lock');
  }

  togglePhotosExpanded(): void {
    this.photosExpanded = !this.photosExpanded;
  }

  getPhotosCount(): number {
    if (!this.selectedOperation || !this.selectedOperation.photos) return 0;
    return this.selectedOperation.photos.length;
  }

  getPhotosByType(photoType: string): any[] {
    if (!this.selectedOperation || !this.selectedOperation.photos) return [];
    return this.selectedOperation.photos.filter(p => p.photoType === photoType);
  }

  getPhotoUrl(photoId: string): string {
    // URL del endpoint de fotos del backend usando el ID de la foto
    return `${environment.apiUrl}/weighing/photos/${photoId}`;
  }

  hasPhotoType(photoType: string): boolean {
    if (!this.selectedOperation || !this.selectedOperation.photos) return false;
    return this.selectedOperation.photos.some(p => p.photoType === photoType);
  }

  getPhotoLabel(photoType: string): string {
    const labels: { [key: string]: string } = {
      'trailerPlate': 'Placa del Tráiler',
      'trailerPlate2': 'Placa del Remolque',
      'cargo': 'Carga',
      'cargoState': 'Estado de Carga',
      'containerPlate': 'Placa del Contenedor',
      'remolque1Plate': 'Placa Remolque 1',
      'remolque2Plate': 'Placa Remolque 2',
      'cargoRemolque1': 'Carga Remolque 1',
      'cargoRemolque2': 'Carga Remolque 2'
    };
    return labels[photoType] || photoType;
  }

  onPhotoError(event: Event): void {
    // Si la foto no existe, mostrar placeholder
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect width="200" height="150" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3ENo disponible%3C/text%3E%3C/svg%3E';
  }

  async onReprint(operation: WeighingQueryResult): Promise<void> {
    // Verificar permisos antes de reimprimir
    if (!this.permissionsService.hasPermission('REPORTES.PRINT')) {
      this.showToast(
        'error',
        'Acceso Denegado',
        'No tienes permisos para imprimir tickets'
      );
      return;
    }

    if (!operation.puedeReimprimir) {
      this.showToast(
        'warn',
        'No disponible',
        'Solo se pueden reimprimir operaciones de salida completadas'
      );
      return;
    }

    this.isLoading = true;

    try {
      // Obtener la operación completa desde el backend para tener todos los datos
      const fullOperation = await this.weighingService.getOperationById(operation.id).toPromise();

      if (!fullOperation) {
        throw new Error('No se pudo obtener los datos completos de la operación');
      }

      // Construir los datos para el PDF usando la misma lógica que en weighing-exit-form
      const receiptData: WeighingReceiptData = {
        folio: fullOperation.folio,
        fecha: fullOperation.updatedAt || fullOperation.createdAt,
        tipoUnidad: fullOperation.tipoUnidad || 'remolque',
        clienteProveedor: fullOperation.clientProviderName,
        tipo: fullOperation.unitType || 'cliente',
        producto: fullOperation.product,

        // Datos de entrada - pasar strings directamente del backend
        fechaEntrada: fullOperation.createdAt,
        pesoBrutoEntrada: fullOperation.entryWeight || 0,
        placaTrailer: fullOperation.trailerPlate || '',
        placaRemolque: fullOperation.tipoUnidad === 'doble-remolque'
          ? fullOperation.placaRemolque1 || fullOperation.trailerPlate2 || ''
          : fullOperation.trailerPlate2 || '',

        // Datos de salida - pasar strings directamente del backend
        fechaSalida: fullOperation.updatedAt || fullOperation.createdAt,
        pesoBrutoSalida: fullOperation.exitWeight || 0,
        pesoTara: fullOperation.exitWeight || 0,
        pesoNeto: fullOperation.netWeight || 0,
      };

      // Si es doble remolque, agregar datos de los remolques
      if (fullOperation.tipoUnidad === 'doble-remolque') {
        const placaRemolque1 = fullOperation.placaRemolque1 || fullOperation.trailerPlate2 || '';
        const placaRemolque2 = fullOperation.placaRemolque2 || '';
        const pesoBrutoBase = fullOperation.entryWeight || 0;
        const pesoTaraBase = (fullOperation.exitWeight || 0) / 2;

        receiptData.remolque1 = {
          placa: placaRemolque1,
          pesoBruto: pesoBrutoBase,
          pesoTara: pesoTaraBase,
          pesoNeto: Math.abs(pesoBrutoBase - pesoTaraBase),
        };

        receiptData.remolque2 = {
          placa: placaRemolque2,
          pesoBruto: pesoBrutoBase,
          pesoTara: pesoTaraBase,
          pesoNeto: Math.abs(pesoBrutoBase - pesoTaraBase),
        };
      }

      await this.pdfGeneratorService.generateWeighingReceipt(receiptData);

      this.isLoading = false;

      this.showToast(
        'success',
        '📄 PDF generado',
        `PDF del folio ${operation.folio} generado exitosamente`
      );

      console.log('✅ PDF generado exitosamente');
    } catch (error) {
      this.isLoading = false;
      const errorMessage = extractErrorMessage(error);
      this.handleError('Error al generar PDF: ' + errorMessage);
      console.error('❌ Error generando PDF:', error);
    }
  }

  onGoBack(): void {
    this.router.navigate(['/dashboard']);
  }

  onQueries(): void {
    // Ya estamos en queries, no hacer nada
  }

  onAdmin(): void {
    this.router.navigate(['/admin']);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getUnidadLabel(tipoUnidad: string): string {
    const labels: { [key: string]: string } = {
      remolque: 'Remolque',
      contenedor: 'Contenedor',
      'doble-remolque': '2 Remolques',
    };
    return labels[tipoUnidad] || tipoUnidad;
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      ENTRADA_REGISTRADA: 'Entrada',
      SALIDA_REGISTRADA: 'Salida',
    };
    return labels[estado] || estado;
  }

  getTaraWeight(pesoBruto?: number, pesoNeto?: number): number | null {
    if (pesoBruto && pesoNeto) {
      return pesoBruto - pesoNeto;
    }
    return null;
  }

  onEditWeights(operation: WeighingQueryResult): void {
    // Verificar permisos
    if (!this.permissionsService.hasPermission('REPORTES.UPDATE')) {
      this.showToast(
        'error',
        'Acceso Denegado',
        'No tienes permisos para editar registros de pesaje'
      );
      return;
    }

    this.operationToEdit = operation;

    // Prellenar el formulario con los valores actuales
    this.editForm.patchValue({
      entryWeight: operation.pesoBruto || null,
      exitWeight: operation.pesoNeto || null,
    });

    this.showEditModal = true;
    document.body.classList.add('km-scroll-lock');
  }

  onCloseEditModal(): void {
    this.showEditModal = false;
    this.operationToEdit = null;
    this.editForm.reset();
    document.body.classList.remove('km-scroll-lock');
  }

  onSaveWeights(): void {
    if (!this.operationToEdit || !this.editForm.valid) {
      return;
    }

    const { entryWeight, exitWeight } = this.editForm.value;

    this.isLoading = true;

    this.weighingQueryService
      .updateWeights(this.operationToEdit.id, entryWeight, exitWeight)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          this.showToast(
            'success',
            'Actualización exitosa',
            `Los pesos del folio ${this.operationToEdit?.folio} han sido actualizados`
          );

          // Cerrar el modal
          this.onCloseEditModal();

          // Recargar los resultados
          this.executeSearch();
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = extractErrorMessage(error);
          this.handleError('Error al actualizar pesos: ' + errorMessage);
          console.error('Error en actualización:', error);
        },
      });
  }

  private handleError(message: string): void {
    this.showToast('error', 'Error', message);
  }

  // Sistema de notificaciones nativo
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
