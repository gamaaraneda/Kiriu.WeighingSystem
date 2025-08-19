import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface EntrySearchResponse {
  success: boolean;
  data: {
    folio: string;
    fechaEntrada: string;
    tipoUnidad: 'remolque' | 'contenedor' | 'doble-remolque';
    cliente: string;
    producto: string;
    pesoBruto: number;
    status: string;
    placaTrailer?: string;
    placaRemolque?: string;
    placaRemolque1?: string;
    placaRemolque2?: string;
    // Nuevos campos para contenedor
    placaTrailerContenedor?: string;
    placaRemolqueContenedor?: string;
    fotos: {
      fotoEntradaTrailer?: string;
      fotoEntradaRemolque?: string;
      fotoEntradaRemolque1?: string;
      fotoEntradaRemolque2?: string;
      fotoCargaEntrada: string;
    };
  } | null;
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
        metadata: null
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
        folio: 'R001',
        fechaEntrada: fechaEntrada.toISOString(),
        tipoUnidad: 'remolque',
        cliente: 'Cliente Remolque',
        producto: 'Cemento',
        pesoBruto: 18000,
        status: 'ENTRADA_REGISTRADA',
        placaTrailer: 'REM-001',
        placaRemolque: 'REMOLQUE-001',
        placaRemolque1: undefined,
        placaRemolque2: undefined,
        fotos: {
          fotoEntradaTrailer: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Foto+Trailer+REM-001',
          fotoEntradaRemolque: 'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Foto+Remolque+REMOLQUE-001',
          fotoEntradaRemolque1: undefined,
          fotoEntradaRemolque2: undefined,
          fotoCargaEntrada: 'https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+Cemento'
        }
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null
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
        folio: 'SC001',
        fechaEntrada: fechaEntrada.toISOString(),
        tipoUnidad: 'contenedor',
        cliente: 'Cliente Contenedor',
        producto: 'Mineral',
        pesoBruto: 15000,
        status: 'ENTRADA_REGISTRADA',
        placaTrailer: undefined,
        placaRemolque: undefined,
        placaRemolque1: undefined,
        placaRemolque2: undefined,
        placaTrailerContenedor: 'TC001',
        placaRemolqueContenedor: 'RC001',
        fotos: {
          fotoEntradaTrailer: undefined,
          fotoEntradaRemolque: undefined,
          fotoEntradaRemolque1: undefined,
          fotoEntradaRemolque2: undefined,
          fotoCargaEntrada: 'https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+Mineral'
        }
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null
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
        folio: 'DR001',
        fechaEntrada: fechaEntrada.toISOString(),
        tipoUnidad: 'doble-remolque',
        cliente: 'Cliente Doble',
        producto: 'Grava',
        pesoBruto: 32000,
        status: 'ENTRADA_REGISTRADA',
        placaTrailer: 'DR-TRAILER-001',
        placaRemolque: undefined,
        placaRemolque1: 'DR-REM1',
        placaRemolque2: 'DR-REM2',
        fotos: {
          fotoEntradaTrailer: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Foto+Trailer+DR-TRAILER-001',
          fotoEntradaRemolque: undefined,
          fotoEntradaRemolque1: 'https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Foto+Remolque+DR-REM1',
          fotoEntradaRemolque2: 'https://via.placeholder.com/300/2196F3/FFFFFF?text=Foto+Remolque+DR-REM2',
          fotoCargaEntrada: 'https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+Grava'
        }
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null
    };
  }

  /**
   * Genera una fecha aleatoria para entrada (hace 2-7 días)
   */
  private generateRandomDate(): Date {
    const daysAgo = Math.floor(Math.random() * 6) + 2;
    const fechaEntrada = new Date();
    fechaEntrada.setDate(fechaEntrada.getDate() - daysAgo);
    fechaEntrada.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
    return fechaEntrada;
  }

  /**
   * Genera una placa aleatoria para remolques
   */
  private generateRandomPlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let plate = '';
    // Formato: XXX-123
    for (let i = 0; i < 3; i++) {
      plate += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    plate += '-';
    for (let i = 0; i < 3; i++) {
      plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return plate;
  }
}
