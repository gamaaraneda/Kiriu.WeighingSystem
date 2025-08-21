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
  product: string;
  clientProviderName: string;
  entryWeight?: number;
  exitWeight?: number;
  netWeight?: number;
  status: string;
  tipoUnidad: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDoubleTrailerEntryRequest {
  unitType: string;
  tipoUnidad: string;
  trailerPlaca: string;
  remolques: RemolqueEntryData[];
  pesoBrutoTotal: number;
  product: string;
  clientProviderName: string;
}

export interface RemolqueEntryData {
  numero: number;
  placa: string;
  pesoBruto: number;
  fotos: string[];
  pesoCapturado: boolean;
  fotosCapturadas: boolean;
  fotoCargaCapturada: boolean;
  fotoPlacaCapturada: boolean;
}

export interface DoubleTrailerEntryResponse {
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
  fotos: string[];
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

export interface RemolqueData {
  numero: number;
  placa: string;
  pesoBruto: number;
  fotos: string[];
  pesoCapturado?: boolean;
  fotosCapturadas?: boolean;
  fotoCargaCapturada?: boolean;
  fotoPlacaCapturada?: boolean;
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
  createEntryOperation(request: CreateEntryRequest): Observable<WeighingOperationDto> {
    return this.http.post<WeighingOperationDto>(`${this.apiUrl}/entry`, request);
  }

  /**
   * Crear operación de entrada con doble remolque
   */
  createDoubleTrailerEntry(request: CreateDoubleTrailerEntryRequest): Observable<DoubleTrailerEntryResponse> {
    return this.http.post<DoubleTrailerEntryResponse>(`${this.apiUrl}/entry/double-trailer`, request);
  }

  /**
   * Buscar entrada por placa
   */
  searchEntryByPlate(placa: string): Observable<EntrySearchResponse> {
    return this.http.get<EntrySearchResponse>(`${this.apiUrl}/entry/search`, {
      params: { placa }
    });
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
      })
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
    return new Observable(observer => {
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
    this.doubleTrailerState.remolque1 = {
      numero: 1,
      placa,
      pesoBruto: peso,
      fotos,
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
    this.doubleTrailerState.remolque2 = {
      numero: 2,
      placa,
      pesoBruto: peso,
      fotos,
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
   * Validar si se puede registrar una salida (mock)
   */
  canRegisterExit(trailerPlate: string): Observable<boolean> {
    return this.searchEntryByPlate(trailerPlate).pipe(
      map(response => response != null)
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
}