import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Interfaces para las llamadas al backend
export interface CreateEntryRequest {
  unitType: string; // client, provider
  operationType: string; // entry
  tipoUnidad: string; // remolque, contenedor, doble-remolque
  trailerPlate: string;
  trailerPlate2?: string;
  trailerPlateContenedor?: string;
  remolquePlateContenedor?: string;
  product: string;
  clientProviderName: string;
  clientProviderRfc?: string;
  entryWeight: number;
  photos: PhotoDataDto;
  // Campos para rastrear edición manual durante el registro
  tieneEdicionesManuale?: boolean;
  usuarioEditor?: string;
}

export interface PhotoDataDto {
  trailerPlate?: string;
  trailerPlate2?: string;
  cargo: string;
  remolque1Plate?: string;
  remolque2Plate?: string;
  cargoRemolque2?: string;
}

export interface WeighingOperationDto {
  id: string;
  folio: string;
  unitType: string;
  operationType: string;
  trailerPlate: string;
  trailerPlate2?: string;
  trailerPlateContenedor?: string;
  remolquePlateContenedor?: string;
  placaRemolque1?: string;
  placaRemolque2?: string;
  product: string;
  clientProviderName: string;
  entryWeight?: number;
  exitWeight?: number;
  netWeight?: number;
  status: string;
  tipoUnidad: string;
  createdAt: string;
  updatedAt: string;
  // Campos para edición manual
  fueEditado?: boolean;
  fechaUltimaEdicion?: string;
  usuarioEditor?: string;
  createdBy?: string;
  exitRegisteredBy?: string;
}

export interface CreateDoubleTrailerEntryRequest {
  unitType: string;
  tipoUnidad: string;
  trailerPlaca: string;
  trailerPlacaFoto?: string; // URL de la foto ANPR del tráiler
  remolques: RemolqueEntryData[];
  pesoBrutoTotal: number;
  product: string;
  clientProviderName: string;
  // Campos para rastrear edición manual durante el registro
  tieneEdicionesManuale?: boolean;
  usuarioEditor?: string;
}

export interface CreatePartialDoubleTrailerEntryRequest {
  unitType: string;
  tipoUnidad: string;
  trailerPlaca: string;
  trailerPlacaFoto?: string;
  remolque1: RemolqueEntryData;
  product: string;
  clientProviderName: string;
  clientProviderRfc?: string;
  tieneEdicionesManuale?: boolean;
  usuarioEditor?: string;
}

export interface ContinueDoubleTrailerEntryRequest {
  folio: string;
  remolque2: RemolqueEntryData;
  tieneEdicionesManuale?: boolean;
  usuarioEditor?: string;
}

export interface RemolqueEntryData {
  numero: number;
  placa: string;
  pesoBruto: number;
  fotos: PhotoWithType[];
  pesoCapturado: boolean;
  fotosCapturadas: boolean;
  fotoCargaCapturada: boolean;
  fotoPlacaCapturada: boolean;
}

export interface DoubleTrailerEntryResponse {
  id: string;
  folio: string;
  trailerPlaca: string;
  remolques: RemolqueResponseData[];
  pesoBrutoTotal: number;
  fechaHoraEntrada: string;
  unitType: string;
  product: string;
  clientProviderName: string;
}

export interface RemolqueResponseData {
  numero: number;
  placa: string;
  pesoBruto: number;
  fotos: PhotoWithType[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface EntrySearchResponse {
  id: string;
  createdAt: string;
  tipoUnidad: string;
  clientProviderName: string;
  product: string;
  entryWeight: number;
  status: string;
  placaTrailer?: string;
  placaRemolque?: string;
  placaRemolque1?: string;
  placaRemolque2?: string;
  placaTrailerContenedor?: string;
  placaRemolqueContenedor?: string;
  fotos: {
    fotoEntradaTrailer?: string;
    fotoEntradaRemolque?: string;
    fotoEntradaRemolque1?: string;
    fotoEntradaRemolque2?: string;
    fotoCargaEntrada: string;
  };
}

// ============= INTERFACES PARA SALIDAS =============

export interface CreateExitRequest {
  folio: string;
  pesoBruto: number;
  pesoTara: number;
  pesoNeto: number;
  placaTrailer: string;
  placaRemolque?: string;
  placaContenedor?: string;
  placaTrailerContenedor?: string;
  placaRemolqueContenedor?: string;
  fotos: ExitPhotoDataDto;
  estado: string;
  fechaSalida: string;
  tipoUnidad: string;
  tieneEdicionesManuale?: boolean;
}

export interface ExitPhotoDataDto {
  trailerPlate?: string;
  trailerPlate2?: string;
  cargoState: string;
  containerPlate?: string;
}

export interface CreateDoubleTrailerExitRequest {
  folio: string;
  placaTrailer: string;
  remolque1: RemolqueExitDataDto;
  remolque2: RemolqueExitDataDto;
  pesoBrutoTotal: number;
  pesoNetoCalculado: number;
  fechaSalida: string;
  fotos: DoubleTrailerExitPhotoDataDto;
}

/** Request para salida parcial (solo remolque 1) */
export interface CreatePartialDoubleTrailerExitRequest {
  folio: string;
  placaTrailer: string;
  remolque1: RemolqueExitDataDto;
  fechaSalida: string;
  fotos: PartialDoubleTrailerExitPhotoDataDto;
  tieneEdicionesManuale?: boolean;
}

/** Fotos solo remolque 1 para salida parcial */
export interface PartialDoubleTrailerExitPhotoDataDto {
  trailerPlate: string;
  remolque1Plate: string;
  cargoRemolque1: string;
}

/** Request para continuar salida con remolque 2 */
export interface ContinueDoubleTrailerExitRequest {
  folio: string;
  remolque2: RemolqueExitDataDto;
  fechaSalida: string;
  fotos: ContinueDoubleTrailerExitPhotoDataDto;
  tieneEdicionesManuale?: boolean;
}

/** Fotos solo remolque 2 para continue exit */
export interface ContinueDoubleTrailerExitPhotoDataDto {
  remolque2Plate: string;
  cargoRemolque2: string;
}

/** Response salida parcial */
export interface PartialDoubleTrailerExitResponse {
  id: string;
  folio: string;
  trailerPlaca: string;
  remolque1: RemolqueExitResponseDto;
  fechaSalidaR1: string;
  usuarioRegistroSalidaR1: string;
  status: string;
  unitType: string;
  product: string;
  clientProviderName: string;
  placaRemolque2?: string;
}

export interface RemolqueExitResponseDto {
  numero: number;
  placa: string;
  pesoBrutoEntrada: number;
  pesoTaraSalida: number;
}

/** Resultado de búsqueda de salidas parciales pendientes */
export interface PendingDoubleTrailerExitSearchResult {
  id: string;
  folio: string;
  trailerPlaca: string;
  placaRemolque1: string;
  placaRemolque2: string;
  fechaSalidaR1: string;
  usuarioRegistroSalidaR1: string;
  pesoBrutoR1: number;
  pesoTaraR1: number;
  product: string;
  clientProviderName: string;
  status: string;
  unitType: string;
}

export interface RemolqueExitDataDto {
  placa: string;
  pesoTara: number;
  fotoCargaCapturada: boolean;
}

export interface DoubleTrailerExitPhotoDataDto {
  trailerPlate: string;
  remolque1Plate: string;
  remolque2Plate: string;
  cargoRemolque1: string;
  cargoRemolque2: string;
}

export interface ExitValidationDto {
  canExit: boolean;
  entryOperation?: {
    id: string;
    folio: string;
    entryWeight: number;
    status: string;
  };
  message: string;
}

export interface ExitResponseDto {
  folio: string;
  estado: string;
  fechaSalida: string;
  pesoNeto: number;
  mensaje: string;
  exitRegisteredBy?: string;
}

// Interfaces del frontend (reutilizamos las existentes)
export interface WeightReading {
  weight: number;
  isStable: boolean;
  isConnected: boolean;
  timestamp: Date;
}

export interface DoubleTrailerWeighingState {
  currentStep: 'trailer' | 'remolque1' | 'remolque2' | 'complete';
  trailerPlaca: string;
  remolque1: Partial<RemolqueData>;
  remolque2: Partial<RemolqueData>;
  pesoBrutoTotal: number;
  isComplete: boolean;
}

/**
 * Representa una foto con metadatos de tipo
 * Usado internamente en frontend para identificar fotos sin ambigüedad
 */
export interface PhotoWithType {
  url: string;
  type: 'plate' | 'cargo';
}

export interface RemolqueData {
  numero: number;
  placa: string;
  pesoBruto: number;
  fotos: PhotoWithType[]; // Cambio: de string[] a PhotoWithType[]
  pesoCapturado?: boolean;
  fotosCapturadas?: boolean;
  fotoCargaCapturada?: boolean;
  fotoPlacaCapturada?: boolean;
}

export interface UpdateWeighingOperationRequest {
  trailerPlate?: string;
  trailerPlate2?: string;
  trailerPlateContenedor?: string;
  remolquePlateContenedor?: string;
  placaRemolque1?: string;
  placaRemolque2?: string;
  product?: string;
  clientProviderName?: string;
  clientProviderRfc?: string;
  entryWeight?: number;
  exitWeight?: number;
  esEdicionManual: boolean;
  usuarioEditor?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RealWeighingService {
  private readonly apiUrl = `${environment.apiUrl}/weighing`;
  private currentWeight = 15000; // Simulación de peso actual
  private isConnected = true;
  private doubleTrailerState: DoubleTrailerWeighingState = {
    currentStep: 'trailer',
    trailerPlaca: '',
    remolque1: { numero: 1, placa: '', pesoBruto: 0, fotos: [] },
    remolque2: { numero: 2, placa: '', pesoBruto: 0, fotos: [] },
    pesoBrutoTotal: 0,
    isComplete: false,
  };

  constructor(private http: HttpClient) {}

  // ============= ENDPOINTS REALES =============

  /**
   * Crear operación de entrada (remolque/contenedor simple)
   */
  createEntryOperation(
    request: CreateEntryRequest,
  ): Observable<WeighingOperationDto> {
    return this.http.post<WeighingOperationDto>(
      `${this.apiUrl}/entry`,
      request,
    );
  }

  /**
   * Crear operación de entrada con doble remolque
   */
  createDoubleTrailerEntry(
    request: CreateDoubleTrailerEntryRequest,
  ): Observable<DoubleTrailerEntryResponse> {
    return this.http.post<DoubleTrailerEntryResponse>(
      `${this.apiUrl}/entry/double-trailer`,
      request,
    );
  }

  /**
   * Crear entrada parcial de doble remolque (solo remolque 1)
   */
  createPartialDoubleTrailerEntry(
    request: CreatePartialDoubleTrailerEntryRequest,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/entry/double-trailer/partial`,
      request,
    );
  }

  /**
   * Continuar entrada de doble remolque con remolque 2
   */
  continueDoubleTrailerEntry(
    request: ContinueDoubleTrailerEntryRequest,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/entry/double-trailer/continue`,
      request,
    );
  }

  /**
   * Buscar operaciones parciales de doble remolque pendientes
   */
  searchPendingDoubleTrailers(
    searchTerm: string,
    limit: number = 10,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/entry/double-trailer/pending/search`,
      {
        params: { searchTerm, limit: limit.toString() },
      },
    );
  }

  /**
   * Obtener operación parcial de doble remolque por folio
   */
  getPendingDoubleTrailerByFolio(folio: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/entry/double-trailer/pending/${folio}`,
    );
  }

  /**
   * Buscar entrada por placa
   */
  searchEntryByPlate(placa: string): Observable<EntrySearchResponse> {
    return this.http.get<EntrySearchResponse>(`${this.apiUrl}/entry/search`, {
      params: { placa },
    });
  }

  // ============= ENDPOINTS DE SALIDA =============

  /**
   * Crear operación de salida (remolque/contenedor simple)
   */
  createExitOperation(request: CreateExitRequest): Observable<ExitResponseDto> {
    return this.http.post<ExitResponseDto>(`${this.apiUrl}/exit`, request);
  }

  /**
   * Crear operación de salida con doble remolque
   */
  createDoubleTrailerExit(
    request: CreateDoubleTrailerExitRequest,
  ): Observable<ExitResponseDto> {
    return this.http.post<ExitResponseDto>(
      `${this.apiUrl}/exit/double-trailer`,
      request,
    );
  }

  /**
   * Crear salida parcial de doble remolque (solo remolque 1)
   */
  createPartialDoubleTrailerExit(
    request: CreatePartialDoubleTrailerExitRequest,
  ): Observable<PartialDoubleTrailerExitResponse> {
    return this.http.post<PartialDoubleTrailerExitResponse>(
      `${this.apiUrl}/exit/double-trailer/partial`,
      request,
    );
  }

  /**
   * Continuar salida de doble remolque con remolque 2
   */
  continueDoubleTrailerExit(
    request: ContinueDoubleTrailerExitRequest,
  ): Observable<ExitResponseDto> {
    return this.http.post<ExitResponseDto>(
      `${this.apiUrl}/exit/double-trailer/continue`,
      request,
    );
  }

  /**
   * Buscar operaciones con salida parcial de doble remolque pendientes (remolque 2)
   */
  searchPendingDoubleTrailerExits(
    searchTerm: string,
    limit: number = 10,
  ): Observable<PendingDoubleTrailerExitSearchResult[]> {
    return this.http
      .get<
        | PendingDoubleTrailerExitSearchResult[]
        | { data: PendingDoubleTrailerExitSearchResult[] }
      >(`${this.apiUrl}/exit/double-trailer/pending/search`, {
        params: { searchTerm, limit: limit.toString() },
      })
      .pipe(
        // El interceptor api-response extrae body.data, así que res puede ser ya el array
        map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
      );
  }

  /**
   * Obtener operación con salida parcial por folio
   */
  getPendingDoubleTrailerExitByFolio(
    folio: string,
  ): Observable<PartialDoubleTrailerExitResponse> {
    return this.http
      .get<
        | { data?: PartialDoubleTrailerExitResponse }
        | PartialDoubleTrailerExitResponse
      >(`${this.apiUrl}/exit/double-trailer/pending/${encodeURIComponent(folio)}`)
      .pipe(
        map((res) =>
          res && 'data' in res && res.data != null
            ? res.data
            : (res as PartialDoubleTrailerExitResponse),
        ),
      );
  }

  /**
   * Validar si se puede registrar salida para una placa
   */
  validateExit(placa: string): Observable<ExitValidationDto> {
    return this.http.get<ExitValidationDto>(
      `${this.apiUrl}/exit/validate/${placa}`,
    );
  }

  /**
   * Obtener operación por placa (último registro de entrada)
   */
  getOperationByPlate(placa: string): Observable<WeighingOperationDto> {
    return this.http.get<WeighingOperationDto>(
      `${this.apiUrl}/operations/plate/${placa}`,
    );
  }

  /**
   * Obtener operación completa por ID
   */
  getOperationById(id: string): Observable<WeighingOperationDto> {
    return this.http.get<WeighingOperationDto>(
      `${this.apiUrl}/operations/${id}`,
    );
  }

  /**
   * Actualizar operación de pesaje (para ediciones manuales)
   */
  updateWeighingOperation(
    operationId: string,
    request: UpdateWeighingOperationRequest,
  ): Observable<WeighingOperationDto> {
    return this.http.put<WeighingOperationDto>(
      `${this.apiUrl}/operations/${operationId}`,
      request,
    );
  }

  // ============= FUNCIONES DE PESO (SIMULADAS) =============

  /**
   * Simular lectura de peso en tiempo real
   */
  getWeightReadings(): Observable<WeightReading> {
    return timer(0, 1000).pipe(
      map(() => {
        // Simular variaciones de peso pequeñas
        const variation = (Math.random() - 0.5) * 100; // ±50 kg de variación
        this.currentWeight = Math.max(0, this.currentWeight + variation);

        return {
          weight: Math.round(this.currentWeight),
          isStable: Math.random() > 0.2, // 80% del tiempo estable
          isConnected: this.isConnected,
          timestamp: new Date(),
        };
      }),
    );
  }

  /**
   * Alternar conexión de báscula (para pruebas)
   */
  toggleConnection(): void {
    this.isConnected = !this.isConnected;
  }

  // ============= FUNCIONES DE DOBLE REMOLQUE (LOCALES) =============

  /**
   * Obtener estado del doble remolque
   */
  getDoubleTrailerState(): Observable<DoubleTrailerWeighingState> {
    return new Observable((observer) => {
      observer.next(this.doubleTrailerState);
      observer.complete();
    });
  }

  /**
   * Actualizar estado del doble remolque
   */
  updateDoubleTrailerState(updates: Partial<DoubleTrailerWeighingState>): void {
    this.doubleTrailerState = { ...this.doubleTrailerState, ...updates };
  }

  /**
   * Establecer placa del tráiler
   */
  setTrailerPlaca(placa: string): void {
    this.doubleTrailerState.trailerPlaca = placa;
    this.doubleTrailerState.currentStep = 'remolque1';
  }

  /**
   * Capturar datos del remolque 1
   */
  captureRemolque1Data(placa: string, peso: number, fotos: string[]): void {
    // Convertir string[] a PhotoWithType[] asumiendo que son fotos de carga por defecto
    const photosWithType: PhotoWithType[] = fotos.map(url => ({ url, type: 'cargo' }));

    this.doubleTrailerState.remolque1 = {
      numero: 1,
      placa,
      pesoBruto: peso,
      fotos: photosWithType,
      pesoCapturado: true,
      fotosCapturadas: true,
      fotoCargaCapturada: true,
      fotoPlacaCapturada: true,
    };
    this.doubleTrailerState.currentStep = 'remolque2';
  }

  /**
   * Capturar datos del remolque 2
   */
  captureRemolque2Data(placa: string, peso: number, fotos: string[]): void {
    // Convertir string[] a PhotoWithType[] asumiendo que son fotos de carga por defecto
    const photosWithType: PhotoWithType[] = fotos.map(url => ({ url, type: 'cargo' }));

    this.doubleTrailerState.remolque2 = {
      numero: 2,
      placa,
      pesoBruto: peso,
      fotos: photosWithType,
      pesoCapturado: true,
      fotosCapturadas: true,
      fotoCargaCapturada: true,
      fotoPlacaCapturada: true,
    };

    // Calcular peso total
    this.doubleTrailerState.pesoBrutoTotal =
      (this.doubleTrailerState.remolque1.pesoBruto || 0) +
      (this.doubleTrailerState.remolque2.pesoBruto || 0);

    this.doubleTrailerState.currentStep = 'complete';
    this.doubleTrailerState.isComplete = true;
  }

  /**
   * Resetear estado del doble remolque
   */
  resetDoubleTrailerState(): void {
    this.doubleTrailerState = {
      currentStep: 'trailer',
      trailerPlaca: '',
      remolque1: { numero: 1, placa: '', pesoBruto: 0, fotos: [] },
      remolque2: { numero: 2, placa: '', pesoBruto: 0, fotos: [] },
      pesoBrutoTotal: 0,
      isComplete: false,
    };
  }

  /**
   * Verificar si se puede proceder al siguiente paso
   */
  canProceedToNextStep(): boolean {
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

  // ============= UTILIDADES =============

  /**
   * Validar si se puede registrar una salida
   */
  canRegisterExit(trailerPlate: string): Observable<boolean> {
    return this.validateExit(trailerPlate).pipe(
      map((response) => response.canExit),
    );
  }

  /**
   * Generar folio único (simulado)
   */
  generateFolio(unitType: string, operationType: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const prefix = unitType === 'client' ? 'CLI' : 'PRO';
    const opPrefix = operationType === 'entry' ? 'ENT' : 'SAL';
    return `${prefix}-${opPrefix}-${timestamp}`;
  }

  /**
   * Buscar productos por término (autocompletado)
   */
  searchProducts(searchTerm: string, limit: number = 10): Observable<string[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    // El interceptor ya extrae body.data, así que recibimos directamente el array
    return this.http.get<string[]>(`${this.apiUrl}/products/search`, {
      params: { searchTerm, limit: limit.toString() },
    });
  }

  /**
   * Buscar clientes/proveedores por término (autocompletado)
   */
  searchClients(searchTerm: string, limit: number = 10): Observable<string[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    // El interceptor ya extrae body.data, así que recibimos directamente el array
    return this.http.get<string[]>(`${this.apiUrl}/clients/search`, {
      params: { searchTerm, limit: limit.toString() },
    });
  }

  /**
   * Buscar entradas pendientes de salida por placa o folio (autocompletado)
   */
  searchPendingExits(
    searchTerm: string,
    limit: number = 10,
    unitType?: string,
  ): Observable<PendingExitSearchResult[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    // Construir parámetros de consulta
    const params: any = { searchTerm, limit: limit.toString() };
    if (unitType) {
      params.unitType = unitType;
    }

    // El interceptor ya extrae body.data, así que recibimos directamente el array
    return this.http.get<PendingExitSearchResult[]>(
      `${this.apiUrl}/pending-exits/search`,
      { params },
    );
  }
}

export interface PendingExitSearchResult {
  id: string;
  folio: string;
  trailerPlate: string;
  trailerPlate2?: string;
  product: string;
  clientProviderName: string;
  entryWeight: number;
  createdAt: string;
  tipoUnidad: string;
  displayText: string;
}
