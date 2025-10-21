import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WeighingOperation {
  id: string;
  unitType: 'client' | 'provider';
  operationType: 'entry' | 'exit';
  trailerPlate: string;
  trailerPlate2?: string;
  // Nuevos campos para contenedor
  trailerPlateContenedor?: string;
  remolquePlateContenedor?: string;
  placaRemolque1?: string;
  placaRemolque2?: string;
  product: string;
  clientProviderName: string;
  clientProviderRfc?: string;
  entryWeight?: number;
  exitWeight?: number;
  netWeight?: number;
  status: 'ENTRADA_REGISTRADA' | 'SALIDA_REGISTRADA';
  createdAt: Date;
  updatedAt: Date;
  // Campos para rastrear edición manual
  fueEditado?: boolean;
  fechaUltimaEdicion?: Date;
  usuarioEditor?: string;
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

export interface WeightReading {
  weight: number;
  isStable: boolean;
  isConnected: boolean;
  timestamp: Date;
}

// Interfaces para el flujo de doble remolque
export interface RemolqueData {
  numero: number; // 1 o 2
  placa: string;
  pesoBruto: number;
  fotos: string[]; // rutas o base64
  pesoCapturado?: boolean;
  fotosCapturadas?: boolean;
  fotoCargaCapturada?: boolean; // Nueva propiedad para rastrear foto de carga
  fotoPlacaCapturada?: boolean; // Nueva propiedad para rastrear foto de placa
}

export interface EntradaConDobleRemolque {
  folio: string;
  trailerPlaca: string;
  trailerPlacaFoto?: string; // URL de la foto ANPR del tráiler
  remolques: [RemolqueData, RemolqueData];
  pesoBrutoTotal: number;
  fechaHoraEntrada: string;
  unitType: 'client' | 'provider';
  product: string;
  clientProviderName: string;
}

export interface DoubleTrailerWeighingState {
  currentStep: 'trailer' | 'remolque1' | 'remolque2' | 'complete';
  trailerPlaca: string;
  remolque1: Partial<RemolqueData>;
  remolque2: Partial<RemolqueData>;
  pesoBrutoTotal: number;
  isComplete: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WeighingService {
  private operations: WeighingOperation[] = [];
  private currentWeight = 0;
  private isConnected = true;
  private doubleTrailerState: DoubleTrailerWeighingState = {
    currentStep: 'trailer',
    trailerPlaca: '',
    remolque1: { numero: 1, placa: '', pesoBruto: 0, fotos: [] },
    remolque2: { numero: 2, placa: '', pesoBruto: 0, fotos: [] },
    pesoBrutoTotal: 0,
    isComplete: false,
  };

  constructor() {
    // Mock data inicial
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.operations = [
      {
        id: '1',
        unitType: 'client',
        operationType: 'entry',
        trailerPlate: 'ABC-123-XY',
        product: 'Material de construcción',
        clientProviderName: 'Constructora ABC',
        clientProviderRfc: 'ABC123456789',
        entryWeight: 25000,
        status: 'ENTRADA_REGISTRADA',
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: '2',
        unitType: 'provider',
        operationType: 'entry',
        trailerPlate: 'XYZ-789-AB',
        product: 'Granos',
        clientProviderName: 'Proveedor XYZ',
        clientProviderRfc: 'XYZ987654321',
        entryWeight: 30000,
        status: 'ENTRADA_REGISTRADA',
        createdAt: new Date('2024-01-15T11:00:00'),
        updatedAt: new Date('2024-01-15T11:00:00'),
      },
    ];
  }

  // Obtener operaciones existentes
  getOperations(): Observable<WeighingOperation[]> {
    return of(this.operations);
  }

  // Obtener operación por placa para validar entrada previa
  getOperationByPlate(
    trailerPlate: string
  ): Observable<WeighingOperation | null> {
    const operation = this.operations.find(
      (op) =>
        op.trailerPlate === trailerPlate && op.status === 'ENTRADA_REGISTRADA'
    );
    return of(operation || null);
  }

  // Crear nueva operación de entrada
  createEntryOperation(
    operation: Omit<
      WeighingOperation,
      'id' | 'status' | 'createdAt' | 'updatedAt'
    >
  ): Observable<WeighingOperation> {
    const newOperation: WeighingOperation = {
      ...operation,
      id: Date.now().toString(),
      status: 'ENTRADA_REGISTRADA',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.operations.push(newOperation);
    return of(newOperation);
  }

  // Actualizar operación para salida
  updateOperationForExit(
    operationId: string,
    exitWeight: number
  ): Observable<WeighingOperation> {
    const operation = this.operations.find((op) => op.id === operationId);
    if (!operation) {
      throw new Error('Operación no encontrada');
    }

    operation.exitWeight = exitWeight;

    // Calcular peso neto según la lógica de negocio del tipo de unidad
    if (operation.unitType === 'provider') {
      // Proveedor (Entrada con Carga, Salida Vacío)
      // Peso neto: Peso bruto - Peso tara = Material descargado
      operation.netWeight = (operation.entryWeight || 0) - exitWeight;
    } else {
      // Cliente (Entrada Vacío, Salida con Carga)
      // Peso neto: Peso tara - Peso bruto = Material cargado
      operation.netWeight = exitWeight - (operation.entryWeight || 0);
    }

    operation.status = 'SALIDA_REGISTRADA';
    operation.updatedAt = new Date();

    return of(operation);
  }

  // Simular lectura de peso en tiempo real
  getWeightReadings(): Observable<WeightReading> {
    return timer(0, 1000).pipe(
      map(() => {
        // Simular variaciones de peso
        const variation =
          Math.random() > 0.7 ? (Math.random() - 0.5) * 1000 : 0;
        this.currentWeight = Math.max(0, this.currentWeight + variation);

        return {
          weight: Math.round(this.currentWeight),
          isStable: Math.random() > 0.3, // 70% del tiempo estable
          isConnected: this.isConnected,
          timestamp: new Date(),
        };
      })
    );
  }

  // Simular conexión/desconexión de báscula
  toggleConnection(): void {
    this.isConnected = !this.isConnected;
  }

  // Validar si se puede registrar una salida
  canRegisterExit(trailerPlate: string): Observable<boolean> {
    return this.getOperationByPlate(trailerPlate).pipe(
      map((operation) => operation !== null)
    );
  }

  // Generar folio único
  generateFolio(unitType: string, operationType: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const prefix = unitType === 'client' ? 'CLI' : 'PRO';
    const opPrefix = operationType === 'entry' ? 'ENT' : 'SAL';
    return `${prefix}-${opPrefix}-${timestamp}`;
  }

  // Métodos para el flujo de doble remolque
  getDoubleTrailerState(): Observable<DoubleTrailerWeighingState> {
    return of(this.doubleTrailerState);
  }

  updateDoubleTrailerState(updates: Partial<DoubleTrailerWeighingState>): void {
    this.doubleTrailerState = { ...this.doubleTrailerState, ...updates };
  }

  setTrailerPlaca(placa: string): void {
    this.doubleTrailerState.trailerPlaca = placa;
    this.doubleTrailerState.currentStep = 'remolque1';
  }

  captureRemolque1Data(placa: string, peso: number, fotos: string[]): void {
    this.doubleTrailerState.remolque1 = {
      numero: 1,
      placa,
      pesoBruto: peso,
      fotos,
      pesoCapturado: true,
      fotosCapturadas: true,
    };
    this.doubleTrailerState.currentStep = 'remolque2';
  }

  captureRemolque2Data(placa: string, peso: number, fotos: string[]): void {
    this.doubleTrailerState.remolque2 = {
      numero: 2,
      placa,
      pesoBruto: peso,
      fotos,
      pesoCapturado: true,
      fotosCapturadas: true,
    };

    // Calcular peso total
    this.doubleTrailerState.pesoBrutoTotal =
      (this.doubleTrailerState.remolque1.pesoBruto || 0) +
      (this.doubleTrailerState.remolque2.pesoBruto || 0);

    this.doubleTrailerState.currentStep = 'complete';
    this.doubleTrailerState.isComplete = true;
  }

  createDoubleTrailerEntry(
    operation: Omit<EntradaConDobleRemolque, 'folio' | 'fechaHoraEntrada'>
  ): Observable<EntradaConDobleRemolque> {
    const folio = this.generateFolio(operation.unitType, 'entry');
    const fechaHoraEntrada = new Date().toISOString();

    const entrada: EntradaConDobleRemolque = {
      ...operation,
      folio,
      fechaHoraEntrada,
    };

    // Crear operación de entrada estándar también
    const weighingOperation: WeighingOperation = {
      id: Date.now().toString(),
      unitType: operation.unitType,
      operationType: 'entry',
      trailerPlate: operation.trailerPlaca,
      trailerPlate2: `${operation.remolques[0].placa} + ${operation.remolques[1].placa}`,
      product: operation.product,
      clientProviderName: operation.clientProviderName,
      entryWeight: operation.pesoBrutoTotal,
      status: 'ENTRADA_REGISTRADA',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.operations.push(weighingOperation);

    // Resetear el estado
    this.resetDoubleTrailerState();

    return of(entrada);
  }

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

  // Método para actualizar operación de pesaje
  updateWeighingOperation(operationId: string, request: UpdateWeighingOperationRequest): Observable<WeighingOperation> {
    const operationIndex = this.operations.findIndex(op => op.id === operationId);
    
    if (operationIndex === -1) {
      throw new Error('Operación no encontrada');
    }

    const operation = { ...this.operations[operationIndex] };
    const originalOperation = { ...operation };

    // Detectar si se están editando placas manualmente
    const plateFieldsChanged = this.hasPlateFieldsChanged(originalOperation, request);
    
    // Solo marcar como editado si se cambiaron placas y es edición manual
    if (request.esEdicionManual && plateFieldsChanged) {
      operation.fueEditado = true;
      operation.fechaUltimaEdicion = new Date();
      operation.usuarioEditor = request.usuarioEditor;
    }

    // Actualizar campos que se proporcionaron
    Object.keys(request).forEach(key => {
      if (key !== 'esEdicionManual' && key !== 'usuarioEditor' && request[key as keyof UpdateWeighingOperationRequest] !== undefined) {
        (operation as any)[key] = request[key as keyof UpdateWeighingOperationRequest];
      }
    });

    // Actualizar fecha de modificación
    operation.updatedAt = new Date();

    // Actualizar en el array
    this.operations[operationIndex] = operation;

    return of(operation);
  }

  private hasPlateFieldsChanged(original: WeighingOperation, request: UpdateWeighingOperationRequest): boolean {
    return (request.trailerPlate !== undefined && request.trailerPlate !== original.trailerPlate) ||
           (request.trailerPlate2 !== undefined && request.trailerPlate2 !== original.trailerPlate2) ||
           (request.trailerPlateContenedor !== undefined && request.trailerPlateContenedor !== original.trailerPlateContenedor) ||
           (request.remolquePlateContenedor !== undefined && request.remolquePlateContenedor !== original.remolquePlateContenedor) ||
           (request.placaRemolque1 !== undefined && request.placaRemolque1 !== original.placaRemolque1) ||
           (request.placaRemolque2 !== undefined && request.placaRemolque2 !== original.placaRemolque2);
  }

  // Método para buscar productos (autocompletado)
  searchProducts(searchTerm: string): Observable<string[]> {
    // Filtrar productos de las operaciones existentes
    const uniqueProducts = [...new Set(this.operations.map(op => op.product))];
    const filtered = uniqueProducts.filter(product =>
      product.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return of(filtered.slice(0, 10));
  }
}
