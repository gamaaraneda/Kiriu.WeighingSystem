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
  capturedAt?: Date;
  // Campos para salidas
  entryWeight?: number;
  hasValidEntry?: boolean;
  entryOperationId?: string;
  entryFolio?: string;
  entryDate?: string;
}

export interface PhotoData {
  trailerPlate: string;
  trailerPlate2?: string;
  cargo: string;
  remolque1Plate?: string;
  remolque2Plate?: string;
  cargoRemolque2?: string;
}

export interface ExitFormData {
  trailerPlate: string;
  trailerPlate2?: string;
  exitWeight: number;
  netWeight: number;
  // Campos para doble remolque
  remolque1Plate?: string;
  remolque2Plate?: string;
  pesoTaraRemolque1?: number;
  pesoTaraRemolque2?: number;
}

export interface ExitPhotoData {
  trailerPlate: string;
  trailerPlate2?: string;
  cargoState: string;
  containerPlate?: string;
  // Campos para doble remolque
  remolque1Plate?: string;
  remolque2Plate?: string;
  cargoRemolque1?: string;
  cargoRemolque2?: string;
}

export interface TicketOperation {
  folio?: string;
  type?: string;
  plate?: string;
}

export interface ExitOperation {
  type: string;
  plate: string;
}

// Tipos para el flujo de doble remolque
export interface DoubleTrailerExitState {
  currentStep: 'trailer' | 'remolque1' | 'remolque2' | 'complete';
  trailerPlaca: string;
  remolque1: {
    numero: number;
    placa: string;
    pesoTara: number;
    fotoCargaCapturada: boolean;
  };
  remolque2: {
    numero: number;
    placa: string;
    pesoTara: number;
    fotoCargaCapturada: boolean;
  };
  isComplete: boolean;
  pesoBrutoTotal: number;
  pesoNetoCalculado: number;
}

// Tipo para la respuesta de búsqueda de entrada
export interface EntrySearchData {
  id: string;
  createdAt: Date;
  tipoUnidad: 'remolque' | 'contenedor' | 'doble-remolque';
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
