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

  // Permission state
  hasReportsPermission = false;

  estadoOptions = [
    { label: 'Todos', value: '' },
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
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
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

  private setupFormSubscriptions(): void {
    // Auto-búsqueda con debounce en campos de texto
    this.filtersForm
      .get('folio')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.hasSearched) {
          this.onSearch();
        }
      });

    this.filtersForm
      .get('placas')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.hasSearched) {
          this.onSearch();
        }
      });
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
    // Desbloquear scroll del body
    document.body.classList.remove('km-scroll-lock');
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
      // Construir los datos para el PDF
      const receiptData: WeighingReceiptData = {
        folio: operation.folio,
        fecha: new Date(operation.fecha),
        tipoUnidad: operation.tipoUnidad || 'remolque',
        clienteProveedor: operation.clienteProveedor,
        tipo: operation.tipo || 'cliente',
        producto: operation.producto,

        // Datos de entrada (solo disponibles: fecha)
        fechaEntrada: new Date(operation.fecha),
        pesoBrutoEntrada: 0, // No disponible en WeighingQueryResult
        placaTrailer: operation.placas,
        placaRemolque: '', // No disponible en WeighingQueryResult

        // Datos de salida
        fechaSalida: new Date(operation.fecha), // Usar fecha general
        pesoBrutoSalida: operation.pesoBruto || 0,
        pesoTara: operation.pesoBruto || 0, // La tara es el peso de salida
        pesoNeto: operation.pesoNeto || 0,
      };

      // Si es doble remolque y tiene datos de remolques
      if (operation.tipoUnidad === 'doble-remolque') {
        // Los datos de remolques individuales no están disponibles en WeighingQueryResult
        // Se puede mejorar si el backend los proporciona
        receiptData.remolque1 = {
          placa: '',
          pesoBruto: 0,
          pesoTara: 0,
          pesoNeto: 0,
        };

        receiptData.remolque2 = {
          placa: '',
          pesoBruto: 0,
          pesoTara: 0,
          pesoNeto: 0,
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
