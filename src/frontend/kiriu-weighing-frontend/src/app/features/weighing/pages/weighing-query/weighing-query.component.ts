import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { HeaderComponent } from '../../../../layout/header/header.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { 
  WeighingQueryService, 
  WeighingQueryFilters, 
  WeighingQueryResult 
} from '../../services/weighing-query.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-weighing-query',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
    DatePickerModule,
    SelectModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    HeaderComponent,
    BreadcrumbComponent
  ],
  providers: [MessageService],
  templateUrl: './weighing-query.component.html',
  styleUrls: ['./weighing-query.component.scss']
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

  estadoOptions = [
    { label: 'Todos', value: '' },
    { label: 'Entrada', value: 'ENTRADA_REGISTRADA' },
    { label: 'Salida', value: 'SALIDA_REGISTRADA' }
  ];

  edicionPosteriorOptions = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Editado', value: 'Editado' },
    { label: 'No Editado', value: 'NoEditado' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private weighingQueryService: WeighingQueryService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filtersForm = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      folio: [''],
      placas: [''],
      estado: [''],
      edicionPosterior: ['Todos']
    });
  }

  private setupFormSubscriptions(): void {
    // Auto-búsqueda con debounce en campos de texto
    this.filtersForm.get('folio')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.hasSearched) {
          this.onSearch();
        }
      });

    this.filtersForm.get('placas')?.valueChanges
      .pipe(
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

  onLazyLoad(event: any): void {
    if (this.hasSearched) {
      this.currentPage = Math.floor(event.first / event.rows) + 1;
      this.executeSearch();
    }
  }

  private executeSearch(): void {
    this.isLoading = true;
    
    const filters: WeighingQueryFilters = {
      ...this.filtersForm.value,
      page: this.currentPage,
      size: this.pageSize
    };

    // Limpiar campos vacíos
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof WeighingQueryFilters] === '' || 
          filters[key as keyof WeighingQueryFilters] === null) {
        delete filters[key as keyof WeighingQueryFilters];
      }
    });

    this.weighingQueryService.queryOperations(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.queryResults = response.data.resultados;
            this.totalResults = response.data.pagination.total;
            
            if (this.queryResults.length === 0 && this.currentPage === 1) {
              this.messageService.add({
                severity: 'info',
                summary: 'Sin resultados',
                detail: 'No se encontraron operaciones que coincidan con los filtros especificados',
                key: 'top-right'
              });
            }
          } else {
            this.handleError('Error al consultar operaciones: ' + response.message);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError('Error al consultar operaciones');
          console.error('Error en búsqueda:', error);
        }
      });
  }

  onClearFilters(): void {
    this.filtersForm.reset({
      fechaDesde: null,
      fechaHasta: null,
      folio: '',
      placas: '',
      estado: '',
      edicionPosterior: 'Todos'
    });
    this.queryResults = [];
    this.totalResults = 0;
    this.hasSearched = false;
  }

  onExportExcel(): void {
    if (this.queryResults.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay resultados para exportar',
        key: 'top-right'
      });
      return;
    }

    const filters: WeighingQueryFilters = {
      ...this.filtersForm.value
    };

    // Limpiar campos vacíos
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof WeighingQueryFilters] === '' || 
          filters[key as keyof WeighingQueryFilters] === null) {
        delete filters[key as keyof WeighingQueryFilters];
      }
    });

    this.isLoading = true;

    this.weighingQueryService.exportToExcel(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.isLoading = false;
          const filename = `Operaciones_Pesaje_${new Date().getTime()}.xlsx`;
          this.weighingQueryService.downloadFile(blob, filename);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Exportación exitosa',
            detail: 'El archivo Excel ha sido descargado',
            key: 'top-right'
          });
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError('Error al exportar datos');
          console.error('Error en exportación:', error);
        }
      });
  }

  onViewDetail(operation: WeighingQueryResult): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Ver detalle',
      detail: `Mostrando detalles de la operación ${operation.folio}`,
      key: 'top-right'
    });
    // Aquí se podría implementar un modal o navegación a detalle
  }

  onReprint(operation: WeighingQueryResult): void {
    if (!operation.puedeReimprimir) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No disponible',
        detail: 'Solo se pueden reimprimir operaciones de salida completadas',
        key: 'top-right'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Reimprimiendo',
      detail: `Generando ticket para ${operation.folio}`,
      key: 'top-right'
    });
    // Aquí se implementaría la lógica de reimpresión
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
      'remolque': 'Remolque',
      'contenedor': 'Contenedor',
      'doble-remolque': '2 Remolques'
    };
    return labels[tipoUnidad] || tipoUnidad;
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'ENTRADA_REGISTRADA': 'Entrada',
      'SALIDA_REGISTRADA': 'Salida'
    };
    return labels[estado] || estado;
  }

  private handleError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      key: 'top-right'
    });
  }
}