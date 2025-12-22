import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrailerCameraService {
  private readonly trailerApiUrl = `${environment.apiUrl}/trailer-camera`;
  private readonly remolqueApiUrl = `${environment.apiUrl}/remolque-camera`;

  constructor(private http: HttpClient) {}

  /**
   * Captura una foto desde la cámara de tráiler y la guarda directamente en el servidor (versión async)
   * @param photoType Tipo de foto (trailerPlate, trailerPlate2, etc.)
   * @returns Promise con la URL de la foto guardada en el servidor
   */
  async captureAndSaveTrailerPhotoAsync(photoType: string): Promise<string> {
    try {
      console.log(`📸 [TRAILER CAMERA] Capturando y guardando foto de ${photoType}...`);

      // Llamar al endpoint que captura y guarda la foto en un solo paso
      const response = await this.http.post<{ photoUrl: string; success: boolean }>(
        `${this.trailerApiUrl}/capture-and-save`,
        { photoType }
      ).toPromise();

      if (!response || !response.success || !response.photoUrl) {
        throw new Error('Error al capturar y guardar la foto en el servidor');
      }

      console.log('✅ [TRAILER CAMERA] Foto capturada y guardada exitosamente:', response.photoUrl);
      return response.photoUrl;
    } catch (error) {
      console.error('❌ [TRAILER CAMERA] Error capturando y guardando foto:', error);
      throw error;
    }
  }

  /**
   * Captura una foto desde la cámara de remolque y la guarda directamente en el servidor (versión async)
   * @param photoType Tipo de foto (trailerPlate2, remolque1Plate, remolque2Plate, etc.)
   * @returns Promise con la URL de la foto guardada en el servidor
   */
  async captureAndSaveRemolquePhotoAsync(photoType: string): Promise<string> {
    try {
      console.log(`📸 [REMOLQUE CAMERA] Capturando y guardando foto de ${photoType}...`);

      // Llamar al endpoint que captura y guarda la foto en un solo paso
      const response = await this.http.post<{ photoUrl: string; success: boolean }>(
        `${this.remolqueApiUrl}/capture-and-save`,
        { photoType }
      ).toPromise();

      if (!response || !response.success || !response.photoUrl) {
        throw new Error('Error al capturar y guardar la foto en el servidor');
      }

      console.log('✅ [REMOLQUE CAMERA] Foto capturada y guardada exitosamente:', response.photoUrl);
      return response.photoUrl;
    } catch (error) {
      console.error('❌ [REMOLQUE CAMERA] Error capturando y guardando foto:', error);
      throw error;
    }
  }
}
