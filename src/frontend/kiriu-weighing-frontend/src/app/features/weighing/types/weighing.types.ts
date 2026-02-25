export interface VehicleData {
  trailerPlate: string;
  trailerPlate2?: string;
  containerOnly: boolean;
  doubleTrailer: boolean;
  product: string;
  // Campos para rastrear edición manual
  hasManualEdits?: boolean;
  manualEditUser?: string;
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
  cargoRemolque1?: string;
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
    pesoSalida?: number;
    pesoSalidaCapturado?: boolean;
  };
  remolque2: {
    numero: number;
    placa: string;
    pesoTara: number;
    fotoCargaCapturada: boolean;
    pesoSalida?: number;
    pesoSalidaCapturado?: boolean;
  };
  isComplete: boolean;
  pesoBrutoTotal: number;
  pesoNetoCalculado: number;
  pesoSalidaTotal?: number;
}

// Tipo para la respuesta de búsqueda de entrada
export interface EntrySearchData {
  id: string;
  createdAt: Date;
  tipoUnidad: 'remolque' | 'contenedor' | 'doble-remolque';
  unitType: string; // 'client' | 'provider'
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
  // Campos para edición manual
  fueEditado?: boolean;
  fechaUltimaEdicion?: Date;
  usuarioEditor?: string;
  createdBy?: string;
  fotos: {
    fotoEntradaTrailer?: string;
    fotoEntradaRemolque?: string;
    fotoEntradaRemolque1?: string;
    fotoEntradaRemolque2?: string;
    fotoCargaEntrada: string;
  };
}

// Tipos para doble remolque interrumpible
export interface PartialDoubleTrailerEntryResponse {
  id: string;
  folio: string;
  trailerPlaca: string;
  remolque1: {
    numero: number;
    placa: string;
    pesoBruto: number;
    fotos: string[];
  };
  fechaHoraRegistroR1: Date;
  usuarioRegistroR1: string;
  status: string;
  unitType: string;
  product: string;
  clientProviderName: string;
}

export interface PendingDoubleTrailerSearchResult {
  id: string;
  folio: string;
  trailerPlaca: string;
  placaRemolque1: string;
  fechaRegistroR1: Date;
  product: string;
  clientProviderName: string;
  pesoBrutoR1: number;
  usuarioRegistroR1: string;
  status: string;
  unitType: string;
}
