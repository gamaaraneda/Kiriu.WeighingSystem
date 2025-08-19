import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface EntrySearchResponse {
  success: boolean;
  data: {
    folio: string;
    fechaEntrada: string;
    tipoUnidad: 'cliente' | 'proveedor';
    cliente: string;
    producto: string;
    pesoBruto: number;
    placaTrailer: string;
    placaRemolque?: string;
    status: string;
    fotos: {
      fotoEntradaTrailer: string;
      fotoEntradaRemolque?: string;
      fotoCargaEntrada: string;
    };
  };
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
   * Genera una respuesta mock siempre exitosa
   */
  private generateMockResponse(plate: string): EntrySearchResponse {
    // Generar folio único basado en la placa
    const folio = `F${plate.replace(/[^A-Z0-9]/g, '').substring(0, 3)}${Date.now().toString().slice(-4)}`;
    
    // Fecha de entrada simulada (hace 2-7 días)
    const daysAgo = Math.floor(Math.random() * 6) + 2;
    const fechaEntrada = new Date();
    fechaEntrada.setDate(fechaEntrada.getDate() - daysAgo);
    fechaEntrada.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    // Tipo de unidad aleatorio
    const tipoUnidad = Math.random() > 0.5 ? 'cliente' : 'proveedor';
    
    // Cliente/Proveedor aleatorio
    const clientes = [
      'Transportes García',
      'Constructora ABC',
      'Logística Rápida',
      'Carga Express',
      'Mercancías del Norte',
      'Transporte Integral',
      'Carga Segura',
      'Logística Nacional'
    ];
    
    const proveedores = [
      'Minería del Sur',
      'Materiales del Norte',
      'Arena y Grava S.A.',
      'Construcción Rápida',
      'Materiales Premium',
      'Construcción del Valle',
      'Materiales Nacionales',
      'Construcción Integral'
    ];
    
    const nombre = tipoUnidad === 'cliente' 
      ? clientes[Math.floor(Math.random() * clientes.length)]
      : proveedores[Math.floor(Math.random() * proveedores.length)];

    // Producto aleatorio
    const productos = [
      'Arena',
      'Grava',
      'Material de construcción',
      'Piedra triturada',
      'Tierra',
      'Cemento',
      'Ladrillos',
      'Varilla',
      'Alambre',
      'Tubería'
    ];
    
    const producto = productos[Math.floor(Math.random() * productos.length)];
    
    // Peso bruto aleatorio entre 15,000 y 35,000 kg
    const pesoBruto = 15000 + Math.floor(Math.random() * 20001);
    
    // Determinar si tiene remolque basado en el tipo de unidad
    const tieneRemolque = Math.random() > 0.3; // 70% de probabilidad
    const placaRemolque = tieneRemolque ? this.generateRandomPlate() : undefined;

    return {
      success: true,
      data: {
        folio,
        fechaEntrada: fechaEntrada.toISOString(),
        tipoUnidad,
        cliente: nombre,
        producto,
        pesoBruto,
        placaTrailer: plate,
        placaRemolque,
        status: 'ENTRADA_REGISTRADA',
        fotos: {
          fotoEntradaTrailer: `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Foto+Trailer+${plate}`,
          fotoEntradaRemolque: tieneRemolque 
            ? `https://via.placeholder.com/400x300/2196F3/FFFFFF?text=Foto+Remolque+${placaRemolque}` 
            : undefined,
          fotoCargaEntrada: `https://via.placeholder.com/400x300/FF9800/FFFFFF?text=Foto+Carga+${producto}`
        }
      },
      message: 'Registro de entrada encontrado',
      errors: null,
      metadata: null
    };
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
