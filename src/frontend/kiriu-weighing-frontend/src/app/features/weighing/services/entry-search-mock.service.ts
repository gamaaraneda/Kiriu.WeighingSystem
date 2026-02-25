import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { EntrySearchData } from '../types/weighing.types';

export interface EntrySearchResponse {
  success: boolean;
  data: EntrySearchData | null;
  message: string;
  errors: null;
  metadata: null;
}

@Injectable({
  providedIn: 'root',
})
export class EntrySearchMockService {
  /**
   * Mock service para buscar entradas por placa
   * Simula una llamada HTTP GET a /api/salida/buscar?placa={placa}
   */
  searchEntryByPlate(plate: string): Observable<EntrySearchResponse> {
    // Simular delay de red
    return of(this.generateMockResponse(plate)).pipe(delay(800));
  }

  /**
   * Genera una respuesta mock condicional basada en la placa ingresada
   */
  private generateMockResponse(plate: string): EntrySearchResponse {
    // Lógica condicional para placas específicas
    if (plate === '1') {
      return this.generateRemolqueUnicoResponse();
    } else if (plate === '2') {
      return this.generateSoloContenedorResponse();
    } else if (plate === '3') {
      return this.generateDobleRemolqueResponse();
    } else {
      // Para cualquier otra placa, retornar error
      return {
        success: false,
        data: null,
        message: 'Registro no encontrado',
        errors: null,
        metadata: null,
      };
    }
  }

  /**
   * Genera respuesta para Remolque Único (placa "1")
   */
  private generateRemolqueUnicoResponse(): EntrySearchResponse {
    const fechaEntrada = this.generateRandomDate();

    return {
      success: true,
      data: {
        id: 'R001',
        createdAt: fechaEntrada,
        tipoUnidad: 'remolque',
        unitType: 'client',
        clientProviderName: 'Cliente Remolque',
        product: 'Cemento',
        entryWeight: 18000,
        status: 'ENTRADA_REGISTRADA',
        placaTrailer: 'REM-001',
        placaRemolque: 'REMOLQUE-001',
        placaRemolque1: undefined,
        placaRemolque2: undefined,
        placaTrailerContenedor: undefined,
        placaRemolqueContenedor: undefined,
        fotos: {
          fotoEntradaTrailer:
            'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Foto+Trailer+REM-001',
          fotoEntradaRemolque:
            'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Foto+Remolque+REMOLQUE-001',
          fotoEntradaRemolque1: undefined,
          fotoEntradaRemolque2: undefined,
          fotoCargaEntrada:
            'https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+Cemento',
        },
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null,
    };
  }

  /**
   * Genera respuesta para Solo Contenedor (placa "2")
   */
  private generateSoloContenedorResponse(): EntrySearchResponse {
    const fechaEntrada = this.generateRandomDate();

    return {
      success: true,
      data: {
        id: 'C001',
        createdAt: fechaEntrada,
        tipoUnidad: 'contenedor',
        unitType: 'provider',
        clientProviderName: 'Cliente Contenedor',
        product: 'Granos',
        entryWeight: 25000,
        status: 'ENTRADA_REGISTRADA',
        placaTrailer: undefined,
        placaRemolque: undefined,
        placaRemolque1: undefined,
        placaRemolque2: undefined,
        placaTrailerContenedor: 'CONT-001',
        placaRemolqueContenedor: 'REM-CONT-001',
        fotos: {
          fotoEntradaTrailer: undefined,
          fotoEntradaRemolque: undefined,
          fotoEntradaRemolque1: undefined,
          fotoEntradaRemolque2: undefined,
          fotoCargaEntrada:
            'https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+Granos',
        },
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null,
    };
  }

  /**
   * Genera respuesta para Doble Remolque (placa "3")
   */
  private generateDobleRemolqueResponse(): EntrySearchResponse {
    const fechaEntrada = this.generateRandomDate();

    return {
      success: true,
      data: {
        id: 'DR001',
        createdAt: fechaEntrada,
        tipoUnidad: 'doble-remolque',
        unitType: 'client',
        clientProviderName: 'Cliente Doble Remolque',
        product: 'Arena',
        entryWeight: 35000,
        status: 'ENTRADA_REGISTRADA',
        placaTrailer: 'TRAILER-001',
        placaRemolque: undefined,
        placaRemolque1: 'REM1-001',
        placaRemolque2: 'REM2-001',
        placaTrailerContenedor: undefined,
        placaRemolqueContenedor: undefined,
        fotos: {
          fotoEntradaTrailer:
            'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Foto+Trailer+TRAILER-001',
          fotoEntradaRemolque: undefined,
          fotoEntradaRemolque1:
            'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Foto+Remolque1+REM1-001',
          fotoEntradaRemolque2:
            'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Foto+Remolque2+REM2-001',
          fotoCargaEntrada:
            'https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+Arena',
        },
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null,
    };
  }

  /**
   * Genera una fecha aleatoria para simular entradas
   */
  private generateRandomDate(): Date {
    const start = new Date(2024, 0, 1);
    const end = new Date();
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  }
}
