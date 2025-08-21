import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface WeighingQueryFilters {
  fechaDesde?: Date;
  fechaHasta?: Date;
  folio?: string;
  placa?: string;
  estado?: string;
  edicionPosterior?: string;
  page?: number;
  size?: number;
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
  pesoNeto?: number;
  estado: string;
  fueEditado: boolean;
  fechaEdicion?: Date;
  puedeReimprimir: boolean;
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeighingQueryService {
  private readonly apiUrl = `${environment.apiUrl}/api/weighing/query`;

  constructor(private http: HttpClient) {}

  queryOperations(filters: WeighingQueryFilters): Observable<ApiResponse<WeighingQueryResponse>> {
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
    if (filters.placa) {
      params = params.set('placa', filters.placa);
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

    return this.http.get<ApiResponse<WeighingQueryResponse>>(this.apiUrl, { params });
  }

  exportToExcel(filters: WeighingQueryFilters): Observable<Blob> {
    const url = `${this.apiUrl}/export`;
    return this.http.post(url, filters, {
      responseType: 'blob'
    });
  }

  getOperationsStats(filters: WeighingQueryFilters): Observable<ApiResponse<WeighingOperationsStats>> {
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
    if (filters.placa) {
      params = params.set('placa', filters.placa);
    }
    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }
    if (filters.edicionPosterior) {
      params = params.set('edicionPosterior', filters.edicionPosterior);
    }

    return this.http.get<ApiResponse<WeighingOperationsStats>>(url, { params });
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
}