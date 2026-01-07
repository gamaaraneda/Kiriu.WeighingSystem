import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface WeighingQueryFilters {
  fechaDesde?: Date;
  fechaHasta?: Date;
  folio?: string;
  placas?: string;
  estado?: string;
  edicionPosterior?: string;
  page?: number;
  size?: number;
}

export interface WeighingPhotoDto {
  id: string;
  photoType: string;
  description?: string;
}

export interface WeighingQueryResult {
  id: string;
  folio: string;
  fecha: Date;
  placas: string;
  clienteProveedor: string;
  producto: string;
  tipo: string;
  tipoUnidad: string;
  pesoBruto?: number;
  pesoSalida?: number;
  pesoNeto?: number;
  estado: string;
  fueEditado: boolean;
  fechaEdicion?: Date;
  puedeReimprimir: boolean;
  photos: WeighingPhotoDto[];
}

export interface WeighingQueryResponse {
  resultados: WeighingQueryResult[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface WeighingOperationsStats {
  totalOperaciones: number;
  operacionesEntrada: number;
  operacionesSalida: number;
  operacionesEditadas: number;
  totalPesoBruto: number;
  totalPesoNeto: number;
  tiposUnidad: Array<{
    tipo: string;
    cantidad: number;
  }>;
}


@Injectable({
  providedIn: 'root'
})
export class WeighingQueryService {
  private readonly apiUrl = `${environment.apiUrl}/weighing/query`;

  constructor(private http: HttpClient) {}

  queryOperations(filters: WeighingQueryFilters): Observable<WeighingQueryResponse> {
    let params = new HttpParams();

    if (filters.fechaDesde) {
      const fechaDesde = typeof filters.fechaDesde === 'string'
        ? filters.fechaDesde
        : filters.fechaDesde.toISOString();
      params = params.set('fechaDesde', fechaDesde);
    }
    if (filters.fechaHasta) {
      const fechaHasta = typeof filters.fechaHasta === 'string'
        ? filters.fechaHasta
        : filters.fechaHasta.toISOString();
      params = params.set('fechaHasta', fechaHasta);
    }
    if (filters.folio) {
      params = params.set('folio', filters.folio);
    }
    if (filters.placas) {
      params = params.set('placa', filters.placas);
    }
    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }
    if (filters.edicionPosterior) {
      params = params.set('edicionPosterior', filters.edicionPosterior);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.size) {
      params = params.set('size', filters.size.toString());
    }

    return this.http.get<WeighingQueryResponse>(this.apiUrl, { params });
  }

  exportToExcel(filters: WeighingQueryFilters): Observable<Blob> {
    const url = `${this.apiUrl}/export`;
    return this.http.post(url, filters, {
      responseType: 'blob'
    });
  }

  getOperationsStats(filters: WeighingQueryFilters): Observable<WeighingOperationsStats> {
    const url = `${this.apiUrl}/stats`;
    let params = new HttpParams();

    if (filters.fechaDesde) {
      params = params.set('fechaDesde', filters.fechaDesde.toISOString());
    }
    if (filters.fechaHasta) {
      params = params.set('fechaHasta', filters.fechaHasta.toISOString());
    }
    if (filters.folio) {
      params = params.set('folio', filters.folio);
    }
    if (filters.placas) {
      params = params.set('placa', filters.placas);
    }
    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }
    if (filters.edicionPosterior) {
      params = params.set('edicionPosterior', filters.edicionPosterior);
    }

    return this.http.get<WeighingOperationsStats>(url, { params });
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  reprintTicket(operationId: string): Observable<Blob> {
    const url = `${this.apiUrl}/${operationId}/reprint`;
    return this.http.post(url, {}, {
      responseType: 'blob'
    });
  }

  updateWeights(operationId: string, entryWeight?: number, exitWeight?: number): Observable<any> {
    const url = `${environment.apiUrl}/weighing/operations/${operationId}`;
    const payload = {
      entryWeight: entryWeight,
      exitWeight: exitWeight,
      esEdicionManual: true
    };
    return this.http.put(url, payload);
  }

  updateOperationData(
    operationId: string,
    tipo?: string,
    tipoUnidad?: string,
    clienteProveedor?: string,
    producto?: string,
    trailerPlate?: string,
    trailerPlate2?: string,
    placaRemolque1?: string,
    placaRemolque2?: string,
    trailerPlateContenedor?: string,
    remolquePlateContenedor?: string
  ): Observable<any> {
    const url = `${environment.apiUrl}/weighing/operations/${operationId}`;
    const payload = {
      unitType: tipo,
      tipoUnidad: tipoUnidad,
      clientProviderName: clienteProveedor,
      product: producto,
      trailerPlate: trailerPlate,
      trailerPlate2: trailerPlate2,
      placaRemolque1: placaRemolque1,
      placaRemolque2: placaRemolque2,
      trailerPlateContenedor: trailerPlateContenedor,
      remolquePlateContenedor: remolquePlateContenedor,
      esEdicionManual: true
    };

    // LOG DIAGNÓSTICO (TEMPORAL)
    console.log('📤 PAYLOAD ENVIADO AL BACKEND:', payload);

    return this.http.put(url, payload);
  }
}