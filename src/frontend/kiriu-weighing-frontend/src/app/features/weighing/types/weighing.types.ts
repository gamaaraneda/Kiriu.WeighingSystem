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
}

export interface ExitPhotoData {
  trailerPlate: string;
  trailerPlate2?: string;
  cargoState: string;
  containerPlate?: string;
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
