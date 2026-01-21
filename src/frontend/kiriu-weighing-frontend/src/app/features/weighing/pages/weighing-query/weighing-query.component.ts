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
  WeighingPhotoDto,
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
import { UsernamePipe } from '../../../../shared/pipes/username.pipe';

@Component({
  selector: 'app-weighing-query',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    BreadcrumbComponent,
    HasPermissionDirective,
    UsernamePipe,
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
  private isLoadingEditData = false; // Flag para evitar ejecución durante carga inicial

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
      tipo: [''],
      tipoUnidad: [''],
      clienteProveedor: [''],
      producto: [''],
      // Placas para remolque
      trailerPlate: [''],
      trailerPlate2: [''],
      // Placas para doble-remolque
      placaRemolque1: [''],
      placaRemolque2: [''],
      // Placas para contenedor
      trailerPlateContenedor: [''],
      remolquePlateContenedor: [''],
    });
  }

  private setupFormSubscriptions(): void {
    // Suscripción al cambio de tipo de unidad para reasignar placas
    this.editForm
      .get('tipoUnidad')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((nuevoTipo: string) => {
        // Solo ejecutar si estamos en el modal de edición y NO estamos cargando datos
        if (!this.showEditModal || this.isLoadingEditData) return;

        // Obtener valores actuales de todos los campos de placas
        const cv = this.editForm.value;

        // Identificar placas disponibles (placa del tráiler siempre es la primera)
        const placaTractorActual =
          cv.trailerPlate || cv.trailerPlateContenedor || '';

        // Identificar placa secundaria según el tipo actual
        let placaSecundariaActual = '';
        if (cv.trailerPlate2)
          placaSecundariaActual = cv.trailerPlate2; // Remolque
        else if (cv.placaRemolque1)
          placaSecundariaActual = cv.placaRemolque1; // Doble-remolque
        else if (cv.remolquePlateContenedor)
          placaSecundariaActual = cv.remolquePlateContenedor; // Contenedor

        // Mapear valores según el nuevo tipo seleccionado
        if (nuevoTipo === 'remolque') {
          // REMOLQUE: Tráiler + Remolque
          // - Asignar solo campos válidos para remolque
          // - Limpiar campos de doble-remolque y contenedor para evitar duplicados
          this.editForm.patchValue(
            {
              // Placas remolque
              trailerPlate: placaTractorActual,
              trailerPlate2: placaSecundariaActual,
              // Limpiar doble-remolque
              placaRemolque1: '',
              placaRemolque2: '',
              // Limpiar contenedor
              trailerPlateContenedor: '',
              remolquePlateContenedor: '',
            },
            { emitEvent: false }
          );
        } else if (nuevoTipo === 'doble-remolque') {
          // DOBLE-REMOLQUE: Tráiler + Remolque1 + Remolque2
          // - Preservar valores si ya existen, sino mapear desde otras fuentes
          // - Limpiar campos de remolque simple y contenedor para evitar duplicados
          this.editForm.patchValue(
            {
              // Placas doble-remolque
              trailerPlate: placaTractorActual,
              placaRemolque1: cv.placaRemolque1 || placaSecundariaActual,
              placaRemolque2: cv.placaRemolque2 || '', // Mantener si existe, sino vacío
              // Limpiar remolque simple
              trailerPlate2: '',
              // Limpiar contenedor
              trailerPlateContenedor: '',
              remolquePlateContenedor: '',
            },
            { emitEvent: false }
          );
        } else if (nuevoTipo === 'contenedor') {
          // CONTENEDOR: Tráiler + Contenedor
          // - Asignar solo campos válidos para contenedor
          // - Limpiar campos de remolque y doble-remolque para evitar duplicados
          this.editForm.patchValue(
            {
              // Placas contenedor
              trailerPlateContenedor: placaTractorActual,
              remolquePlateContenedor: placaSecundariaActual,
              // Limpiar remolque simple
              trailerPlate: '',
              trailerPlate2: '',
              // Limpiar doble-remolque
              placaRemolque1: '',
              placaRemolque2: '',
            },
            { emitEvent: false }
          );
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

  getSortedPhotos(): WeighingPhotoDto[] {
    if (!this.selectedOperation || !this.selectedOperation.photos) {
      return [];
    }

    const entryOnlyTypes = ['cargoEntry'];
    const exitOnlyTypes = ['cargoState', 'cargoExit'];

    // Agrupar fotos por tipo
    const photosByType = new Map<string, WeighingPhotoDto[]>();

    this.selectedOperation.photos.forEach(photo => {
      if (!photosByType.has(photo.photoType)) {
        photosByType.set(photo.photoType, []);
      }
      photosByType.get(photo.photoType)!.push(photo);
    });

    // Clasificar cada foto
    const photosWithClassification = this.selectedOperation.photos.map(photo => {
      const photoTime = new Date(photo.createdAt).getTime();
      let isEntry = false;

      // Tipos que siempre son entrada
      if (entryOnlyTypes.includes(photo.photoType)) {
        isEntry = true;
      }
      // Tipos que siempre son salida
      else if (exitOnlyTypes.includes(photo.photoType)) {
        isEntry = false;
      }
      // Tipos que pueden ser entrada o salida (placas)
      else {
        const photosOfSameType = photosByType.get(photo.photoType)!;

        if (photosOfSameType.length === 1) {
          // Si solo hay una foto de este tipo, clasificar por posición global
          const allPhotos = this.selectedOperation?.photos || [];
          const sortedAllPhotos = [...allPhotos].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const middleIndex = Math.floor(sortedAllPhotos.length / 2);
          const photoIndex = sortedAllPhotos.findIndex(p => p.id === photo.id);
          isEntry = photoIndex < middleIndex;
        } else {
          // Si hay múltiples fotos del mismo tipo, la más antigua es entrada
          const sortedByTime = [...photosOfSameType].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          isEntry = photo.id === sortedByTime[0].id;
        }
      }

      return {
        photo,
        isEntry,
        timestamp: photoTime
      };
    });

    // Ordenar: primero las de entrada, luego las de salida
    // Dentro de cada grupo, ordenar por timestamp ascendente
    return photosWithClassification
      .sort((a, b) => {
        // Primero ordenar por grupo (entrada primero)
        if (a.isEntry && !b.isEntry) return -1;
        if (!a.isEntry && b.isEntry) return 1;
        // Dentro del mismo grupo, ordenar por timestamp
        return a.timestamp - b.timestamp;
      })
      .map(item => item.photo);
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
    return this.selectedOperation.photos.filter(
      (p) => p.photoType === photoType
    );
  }

  getPhotoUrl(photoId: string): string {
    // URL del endpoint de fotos del backend usando el ID de la foto
    return `${environment.apiUrl}/weighing/photos/${photoId}`;
  }

  hasPhotoType(photoType: string): boolean {
    if (!this.selectedOperation || !this.selectedOperation.photos) return false;
    return this.selectedOperation.photos.some((p) => p.photoType === photoType);
  }

  getPhotoLabel(photo: WeighingPhotoDto): string {
    // Etiquetas base por tipo de fotografía
    const baseLabels: { [key: string]: string } = {
      trailerPlate: 'Placa del Tráiler',
      trailerPlate2: 'Placa del Remolque',
      cargo: 'Estado de la Carga',
      cargoEntry: 'Estado de la Carga',
      cargoExit: 'Estado de la Carga',
      cargoState: 'Estado de la Carga',
      containerPlate: 'Placa del Contenedor',
      remolque1Plate: 'Placa Remolque',
      remolque2Plate: 'Placa Remolque 2',
      cargoRemolque1: 'Carga Remolque 1',
      cargoRemolque2: 'Carga Remolque 2',
    };

    const baseLabel = baseLabels[photo.photoType] || photo.photoType;

    // Tipos que SIEMPRE son de entrada
    const entryOnlyTypes = ['cargoEntry'];

    // Tipos que SIEMPRE son de salida
    const exitOnlyTypes = ['cargoState', 'cargoExit'];

    let suffix = '';
    let finalLabel = baseLabel;

    // Para doble remolque, primero identificar el número de remolque por la placa
    let plateIdentifier = photo.photoType; // Identificador único para agrupar
    if (photo.photoType === 'remolque1Plate' && this.selectedOperation) {
      const plateMatch = photo.description?.match(/Placa ANPR: ([A-Z0-9]+)/);
      if (plateMatch) {
        const plateName = plateMatch[1];
        plateIdentifier = `remolque1Plate_${plateName}`; // Agrupar por placa específica

        const remolquePlates = this.selectedOperation.photos
          .filter(p => p.photoType === 'remolque1Plate' && p.description)
          .map(p => {
            const match = p.description!.match(/Placa ANPR: ([A-Z0-9]+)/);
            return match ? match[1] : null;
          })
          .filter((p): p is string => p !== null);

        const uniquePlates = Array.from(new Set(remolquePlates)).sort();
        const remolqueNumber = uniquePlates.indexOf(plateName) + 1;
        finalLabel = `Placa Remolque ${remolqueNumber}`;
      }
    }

    // Clasificar según el tipo
    if (entryOnlyTypes.includes(photo.photoType)) {
      suffix = ' – Entrada';
    } else if (exitOnlyTypes.includes(photo.photoType)) {
      suffix = ' – Salida';
    } else if (this.selectedOperation && photo.createdAt) {
      // Para tipos que pueden estar en entrada o salida (placas)
      // Buscar todas las fotos con el mismo identificador (tipo + placa en caso de remolques)
      const photosOfSameType = this.selectedOperation.photos.filter(p => {
        if (p.photoType !== photo.photoType) return false;

        // Para remolques, agrupar por placa específica
        if (photo.photoType === 'remolque1Plate') {
          const pPlateMatch = p.description?.match(/Placa ANPR: ([A-Z0-9]+)/);
          const currentPlateMatch = photo.description?.match(/Placa ANPR: ([A-Z0-9]+)/);
          if (pPlateMatch && currentPlateMatch) {
            return pPlateMatch[1] === currentPlateMatch[1];
          }
        }

        return true;
      });

      // Si solo hay una foto con este identificador, clasificar por timestamp global
      if (photosOfSameType.length === 1) {
        const allPhotos = this.selectedOperation.photos;
        const photoTime = new Date(photo.createdAt).getTime();
        const sortedAllPhotos = [...allPhotos].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const middleIndex = Math.floor(sortedAllPhotos.length / 2);
        const photoIndex = sortedAllPhotos.findIndex(p => p.id === photo.id);

        suffix = photoIndex < middleIndex ? ' – Entrada' : ' – Salida';
      } else {
        // Ordenar fotos del mismo identificador por timestamp
        const sortedByTime = [...photosOfSameType].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // La primera (más antigua) es entrada, la última (más reciente) es salida
        if (photo.id === sortedByTime[0].id) {
          suffix = ' – Entrada';
        } else if (photo.id === sortedByTime[sortedByTime.length - 1].id) {
          suffix = ' – Salida';
        }
      }
    }

    return `${finalLabel}${suffix}`;
  }

  onPhotoError(event: Event): void {
    // Si la foto no existe, mostrar placeholder
    const img = event.target as HTMLImageElement;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect width="200" height="150" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3ENo disponible%3C/text%3E%3C/svg%3E';
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
      const fullOperation = await this.weighingService
        .getOperationById(operation.id)
        .toPromise();

      if (!fullOperation) {
        throw new Error(
          'No se pudo obtener los datos completos de la operación'
        );
      }

      // DEBUG: Verificar valores de fechas
      
      // Determinar fechas finales a usar
      const fechaEntradaFinal = operation.entryDate || fullOperation.createdAt;
      const fechaSalidaFinal = operation.exitDate || fullOperation.updatedAt || fullOperation.createdAt;
     
      // Construir los datos para el PDF usando la misma lógica que en weighing-exit-form
      const receiptData: WeighingReceiptData = {
        folio: fullOperation.folio,
        fecha: fechaSalidaFinal,
        tipoUnidad: fullOperation.tipoUnidad || 'remolque',
        clienteProveedor: fullOperation.clientProviderName,
        tipo: fullOperation.unitType || 'cliente',
        producto: fullOperation.product,
        createdBy: fullOperation.createdBy,
        exitRegisteredBy: fullOperation.exitRegisteredBy || fullOperation.createdBy,

        // Datos de entrada - usar entryDate del query result
        fechaEntrada: fechaEntradaFinal,
        pesoBrutoEntrada: fullOperation.entryWeight || 0,
        placaTrailer: fullOperation.trailerPlate || '',
        placaRemolque:
          fullOperation.tipoUnidad === 'doble-remolque'
            ? fullOperation.placaRemolque1 || fullOperation.trailerPlate2 || ''
            : fullOperation.trailerPlate2 || '',

        // Datos de salida - usar exitDate del query result
        fechaSalida: fechaSalidaFinal,
        pesoBrutoSalida: fullOperation.exitWeight || 0,
        pesoTara: fullOperation.exitWeight || 0,
        pesoNeto: fullOperation.netWeight || 0,
      };

      // Si es doble remolque, agregar datos de los remolques
      if (fullOperation.tipoUnidad === 'doble-remolque') {
        const placaRemolque1 =
          fullOperation.placaRemolque1 || fullOperation.trailerPlate2 || '';
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

  onPlacasInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números y guion medio, máximo 12 caracteres
    const sanitized = value.replace(/[^A-Za-z0-9\-]/g, '').slice(0, 12);
    if (value !== sanitized) {
      input.value = sanitized;
      this.filtersForm.patchValue({ placas: sanitized }, { emitEvent: false });
    }
  }

  onFolioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números y guion medio, máximo 50 caracteres
    const sanitized = value.replace(/[^A-Za-z0-9\-]/g, '').slice(0, 50);
    if (value !== sanitized) {
      input.value = sanitized;
      this.filtersForm.patchValue({ folio: sanitized }, { emitEvent: false });
    }
  }

  // Filtrar caracteres no permitidos en tiempo real para placas (reutilizado del formulario de entrada)
  onPlateInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números y guion medio
    const filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
    // Limitar a 20 caracteres
    const truncatedValue = filteredValue.substring(0, 20);

    if (value !== truncatedValue) {
      // Si hubo cambios, actualizar el valor del input y del formulario
      input.value = truncatedValue;
      this.editForm.patchValue(
        { [fieldName]: truncatedValue },
        { emitEvent: false }
      );
    }
  }

  // Filtrar caracteres no permitidos en tiempo real para cliente/proveedor
  onAlphanumericInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números, espacios y guion medio
    const filteredValue = value.replace(/[^a-zA-Z0-9\s-]/g, '');
    // Limitar a 50 caracteres
    const truncatedValue = filteredValue.substring(0, 50);

    if (value !== truncatedValue) {
      // Si hubo cambios, actualizar el valor del input y del formulario
      input.value = truncatedValue;
      this.editForm.patchValue(
        { [fieldName]: truncatedValue },
        { emitEvent: false }
      );
    }
  }

  // Filtrar caracteres no permitidos en tiempo real para producto
  onProductInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números, espacios y los caracteres especiales: - / # .
    const filteredValue = value.replace(/[^a-zA-Z0-9\s\-\/#.]/g, '');
    // Limitar a 50 caracteres
    const truncatedValue = filteredValue.substring(0, 50);

    if (value !== truncatedValue) {
      // Si hubo cambios, actualizar el valor del input y del formulario
      input.value = truncatedValue;
      this.editForm.patchValue(
        { [fieldName]: truncatedValue },
        { emitEvent: false }
      );
    }
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
    this.isLoadingEditData = true; // Activar flag para evitar ejecución de suscripción

    // Prellenar el formulario con los valores actuales
    // Primero obtener la operación completa para tener todos los campos de placas
    this.weighingService.getOperationById(operation.id).subscribe({
      next: (fullOperation) => {
        // Log para diagnóstico (TEMPORAL - remover después)
        console.log('🔍 Datos cargados del backend:', {
          tipoUnidad: fullOperation.tipoUnidad,
          trailerPlate: fullOperation.trailerPlate,
          trailerPlate2: fullOperation.trailerPlate2,
          trailerPlateContenedor: fullOperation.trailerPlateContenedor,
          remolquePlateContenedor: fullOperation.remolquePlateContenedor,
          placaRemolque1: fullOperation.placaRemolque1,
          placaRemolque2: fullOperation.placaRemolque2,
        });

        // MAPEO INTELIGENTE: Si el tipoUnidad es "contenedor" pero las placas están
        // en los campos de remolque, mapearlas a los campos de contenedor
        let trailerPlateContenedor = fullOperation.trailerPlateContenedor || '';
        let remolquePlateContenedor =
          fullOperation.remolquePlateContenedor || '';

        if (fullOperation.tipoUnidad === 'contenedor') {
          // Si los campos de contenedor están vacíos, usar los de remolque
          if (!trailerPlateContenedor && fullOperation.trailerPlate) {
            trailerPlateContenedor = fullOperation.trailerPlate;
          }
          if (!remolquePlateContenedor && fullOperation.trailerPlate2) {
            remolquePlateContenedor = fullOperation.trailerPlate2;
          }
        }

        this.editForm.patchValue({
          tipo: fullOperation.unitType || operation.tipo || '',
          tipoUnidad: fullOperation.tipoUnidad || operation.tipoUnidad || '',
          clienteProveedor:
            fullOperation.clientProviderName ||
            operation.clienteProveedor ||
            '',
          producto: fullOperation.product || operation.producto || '',
          // Placas para remolque
          trailerPlate: fullOperation.trailerPlate || '',
          trailerPlate2: fullOperation.trailerPlate2 || '',
          // Placas para doble-remolque
          placaRemolque1: fullOperation.placaRemolque1 || '',
          placaRemolque2: fullOperation.placaRemolque2 || '',
          // Placas para contenedor (con mapeo inteligente)
          trailerPlateContenedor: trailerPlateContenedor,
          remolquePlateContenedor: remolquePlateContenedor,
        });

        // Log del estado del formulario después de patchValue (TEMPORAL)
        console.log(
          '📝 Estado del formulario después de patchValue:',
          this.editForm.value
        );

        this.isLoadingEditData = false; // Desactivar flag después de cargar

        // Forzar detección de cambios para asegurar que Angular actualice la vista
        this.cdr.detectChanges();

        // Abrir modal DESPUÉS de cargar los datos
        this.showEditModal = true;
        document.body.classList.add('km-scroll-lock');

        // Forzar detección de cambios después de abrir el modal
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar operación completa:', error);
        // Fallback: usar datos básicos de la query
        this.editForm.patchValue({
          tipo: operation.tipo || '',
          tipoUnidad: operation.tipoUnidad || '',
          clienteProveedor: operation.clienteProveedor || '',
          producto: operation.producto || '',
          trailerPlate: operation.placas || '',
        });

        this.isLoadingEditData = false; // Desactivar flag después de cargar

        // Forzar detección de cambios
        this.cdr.detectChanges();

        // Abrir modal incluso si hay error (con datos básicos)
        this.showEditModal = true;
        document.body.classList.add('km-scroll-lock');

        // Forzar detección de cambios después de abrir el modal
        this.cdr.detectChanges();
      },
    });
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

    const formValue = this.editForm.value;
    const tipoUnidad = formValue.tipoUnidad;

    // LOG DIAGNÓSTICO (TEMPORAL)
    console.log('💾 GUARDANDO - Valores del formulario:', formValue);
    console.log('💾 Operación original:', this.operationToEdit);

    // Construir payload según la estructura de BD mostrada:
    // REMOLQUE: TrailerPlate + TrailerPlate2 (resto NULL)
    // CONTENEDOR: TrailerPlate + TrailerPlate2 (resto NULL)
    // DOBLE-REMOLQUE: TrailerPlate + PlacaRemolque1 + PlacaRemolque2 (resto NULL)
    // 
    // IMPORTANTE: Backend solo actualiza campos NO vacíos (línea 688-704 WeighingApplicationService)
    // Por eso, para limpiar campos no aplicables, debemos enviar string vacío "" 
    // en lugar de undefined, de lo contrario el backend ignora el cambio y mantiene el valor anterior
    let trailerPlate: string | undefined = undefined;
    let trailerPlate2: string | undefined = undefined;
    let placaRemolque1: string | undefined = undefined;
    let placaRemolque2: string | undefined = undefined;
    let trailerPlateContenedor: string | undefined = undefined;
    let remolquePlateContenedor: string | undefined = undefined;

    if (tipoUnidad === 'remolque') {
      // REMOLQUE: TrailerPlate + TrailerPlate2
      trailerPlate = formValue.trailerPlate || '';
      trailerPlate2 = formValue.trailerPlate2 || '';
      // Resto explícitamente string vacío para forzar limpieza en BD
      placaRemolque1 = '';
      placaRemolque2 = '';
      trailerPlateContenedor = '';
      remolquePlateContenedor = '';
    } else if (tipoUnidad === 'contenedor') {
      // CONTENEDOR: TrailerPlate + TrailerPlate2 (mismo que remolque según BD)
      // Mapear desde los campos de contenedor del formulario
      trailerPlate = formValue.trailerPlateContenedor || '';
      trailerPlate2 = formValue.remolquePlateContenedor || '';
      // Resto explícitamente string vacío para forzar limpieza en BD
      placaRemolque1 = '';
      placaRemolque2 = '';
      trailerPlateContenedor = '';
      remolquePlateContenedor = '';
    } else if (tipoUnidad === 'doble-remolque') {
      // DOBLE-REMOLQUE: TrailerPlate + PlacaRemolque1 + PlacaRemolque2
      trailerPlate = formValue.trailerPlate || '';
      placaRemolque1 = formValue.placaRemolque1 || '';
      placaRemolque2 = formValue.placaRemolque2 || '';
      // Resto explícitamente string vacío para forzar limpieza en BD
      trailerPlate2 = '';
      trailerPlateContenedor = '';
      remolquePlateContenedor = '';
    }

    console.log('📤 PAYLOAD SEGÚN ESTRUCTURA BD:', {
      tipoUnidad,
      trailerPlate,
      trailerPlate2,
      placaRemolque1,
      placaRemolque2,
      trailerPlateContenedor,
      remolquePlateContenedor,
    });

    this.isLoading = true;

    this.weighingQueryService
      .updateOperationData(
        this.operationToEdit.id,
        formValue.tipo,
        tipoUnidad,
        formValue.clienteProveedor,
        formValue.producto,
        trailerPlate,
        trailerPlate2,
        placaRemolque1,
        placaRemolque2,
        trailerPlateContenedor,
        remolquePlateContenedor
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          this.showToast(
            'success',
            'Actualización exitosa',
            `Los datos del folio ${this.operationToEdit?.folio} han sido actualizados`
          );

          // Cerrar el modal
          this.onCloseEditModal();

          // Recargar los resultados
          this.executeSearch();
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = extractErrorMessage(error);
          this.handleError('Error al actualizar datos: ' + errorMessage);
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
        toast.style.animation =
          'toast-out 0.18s cubic-bezier(0.22, 0.61, 0.36, 1) both';
        setTimeout(() => {
          toast.remove();
        }, 180);
      }
    }, 5000);
  }
}
