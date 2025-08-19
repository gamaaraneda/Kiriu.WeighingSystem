import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ExitRegistrationRequest {
  folio: string;
  pesoBruto: number;
  pesoTara: number;
  pesoNeto: number;
  placaTrailer: string;
  placaRemolque?: string;
  placaContenedor?: string;
  // Nuevos campos para contenedor
  placaTrailerContenedor?: string;
  placaRemolqueContenedor?: string;
  fotos: {
    trailerPlate?: string;
    trailerPlate2?: string;
    cargoState?: string;
    containerPlate?: string;
  };
  estado: 'SALIDA_REGISTRADA';
  fechaSalida: string;
  tipoUnidad: 'remolque' | 'contenedor' | 'doble-remolque';
}

export interface ExitRegistrationResponse {
  success: boolean;
  data: {
    folio: string;
    estado: string;
    fechaSalida: string;
    pesoNeto: number;
    mensaje: string;
  } | null;
  message: string;
  errors: string[] | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExitRegistrationService {
  // TODO: Reemplazar con URL real del backend
  private readonly baseUrl = '/api/salida';

  constructor(private http: HttpClient) {}

  /**
   * Registra la salida en el sistema
   */
  registerExit(
    request: ExitRegistrationRequest
  ): Observable<ExitRegistrationResponse> {
    // TODO: Implementar llamada real al backend
    // return this.http.post<ExitRegistrationResponse>(`${this.baseUrl}/registrar`, request);

    // Mock temporal para desarrollo
    return this.mockRegisterExit(request);
  }

  /**
   * Mock temporal para simular el registro de salida
   */
  private mockRegisterExit(
    request: ExitRegistrationRequest
  ): Observable<ExitRegistrationResponse> {
    // Simular latencia de red
    const shouldSucceed = Math.random() > 0.1; // 90% de éxito

    if (shouldSucceed) {
      const response: ExitRegistrationResponse = {
        success: true,
        data: {
          folio: request.folio,
          estado: request.estado,
          fechaSalida: request.fechaSalida,
          pesoNeto: request.pesoNeto,
          mensaje: 'Salida registrada exitosamente',
        },
        message: 'Registro de salida completado',
        errors: null,
      };

      return of(response).pipe(delay(1500)); // Simular tiempo de respuesta
    } else {
      const response: ExitRegistrationResponse = {
        success: false,
        data: null,
        message: 'Error al registrar la salida',
        errors: [
          'Error de conexión con la base de datos',
          'Timeout en la operación',
        ],
      };

      return of(response).pipe(delay(1000)); // Simular tiempo de respuesta
    }
  }

  /**
   * Valida que todos los campos requeridos estén presentes
   */
  validateExitRequest(request: ExitRegistrationRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.folio) {
      errors.push('Folio es requerido');
    }

    if (!request.pesoBruto || request.pesoBruto <= 0) {
      errors.push('Peso bruto debe ser mayor a 0');
    }

    if (!request.pesoTara || request.pesoTara <= 0) {
      errors.push('Peso tara debe ser mayor a 0');
    }

    if (!request.pesoNeto || request.pesoNeto <= 0) {
      errors.push('Peso neto debe ser mayor a 0');
    }

    if (!request.placaTrailer) {
      errors.push('Placa del tráiler es requerida');
    }

    if (!request.fechaSalida) {
      errors.push('Fecha de salida es requerida');
    }

    if (!request.tipoUnidad) {
      errors.push('Tipo de unidad es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
