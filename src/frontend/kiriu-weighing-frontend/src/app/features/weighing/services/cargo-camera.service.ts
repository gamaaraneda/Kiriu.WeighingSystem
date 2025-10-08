import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CargoCameraService {
  private readonly apiUrl = `${environment.apiUrl}/cargo-camera`;

  constructor(private http: HttpClient) {}

  /**
   * Captura una foto desde la cámara de carga y la sube al servidor
   * @returns Observable con la URL de la foto guardada
   */
  captureAndUploadCargoPhoto(): Observable<string> {
    console.log('📸 Capturando foto desde cámara de carga...');

    // Primero capturamos la foto desde la cámara a través del backend
    return this.http.get(`${this.apiUrl}/capture`, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        if (!response.body) {
          throw new Error('No se recibió imagen de la cámara');
        }

        console.log('✅ Foto capturada exitosamente desde la cámara');

        // Crear un objeto File desde el blob
        const blob = response.body;
        const fileName = `cargo_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        // Retornar una URL temporal para preview
        return URL.createObjectURL(blob);
      }),
      catchError(error => {
        console.error('❌ Error capturando foto desde cámara de carga:', error);
        throw error;
      })
    );
  }

  /**
   * Captura una foto y la guarda directamente en el servidor
   * @param photoType Tipo de foto (cargoEntry, cargoExit, etc.)
   * @returns Observable con la URL de la foto guardada en el servidor
   */
  captureAndSaveCargoPhoto(photoType: string): Observable<string> {
    console.log(`📸 Capturando y guardando foto de ${photoType}...`);

    // Capturar la foto
    return from(
      this.http.get(`${this.apiUrl}/capture`, {
        responseType: 'blob'
      }).toPromise()
    ).pipe(
      map(async (blob) => {
        if (!blob) {
          throw new Error('No se recibió imagen de la cámara');
        }

        console.log('✅ Foto capturada, guardando en servidor...');

        // Crear FormData para subir la foto
        const formData = new FormData();
        const fileName = `${photoType}_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        formData.append('file', file);
        formData.append('photoType', photoType);

        // Subir al endpoint de fotos del backend
        const uploadResponse = await this.http.post<{ photoUrl: string }>(
          `${environment.apiUrl}/weighing/photos/upload`,
          formData
        ).toPromise();

        if (!uploadResponse || !uploadResponse.photoUrl) {
          throw new Error('Error al guardar la foto en el servidor');
        }

        console.log('✅ Foto guardada exitosamente:', uploadResponse.photoUrl);
        return uploadResponse.photoUrl;
      }),
      map(promise => {
        // Convertir la promesa en observable sincrónico
        throw new Error('Use captureAndSaveCargoPhotoAsync instead');
      }),
      catchError(error => {
        console.error('❌ Error capturando y guardando foto:', error);
        throw error;
      })
    );
  }

  /**
   * Captura una foto y la guarda directamente en el servidor (versión async)
   * @param photoType Tipo de foto (cargoEntry, cargoExit, etc.)
   * @returns Promise con la URL de la foto guardada en el servidor
   */
  async captureAndSaveCargoPhotoAsync(photoType: string): Promise<string> {
    try {
      console.log(`📸 Capturando y guardando foto de ${photoType}...`);

      // Capturar la foto desde la cámara
      const blob = await this.http.get(`${this.apiUrl}/capture`, {
        responseType: 'blob'
      }).toPromise();

      if (!blob) {
        throw new Error('No se recibió imagen de la cámara');
      }

      console.log('✅ Foto capturada, guardando en servidor...');

      // Crear FormData para subir la foto
      const formData = new FormData();
      const fileName = `${photoType}_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      formData.append('file', file);
      formData.append('photoType', photoType);

      // Subir al endpoint de fotos del backend
      const uploadResponse = await this.http.post<{ photoUrl: string }>(
        `${environment.apiUrl}/weighing/photos/upload`,
        formData
      ).toPromise();

      if (!uploadResponse || !uploadResponse.photoUrl) {
        throw new Error('Error al guardar la foto en el servidor');
      }

      console.log('✅ Foto guardada exitosamente:', uploadResponse.photoUrl);
      return uploadResponse.photoUrl;
    } catch (error) {
      console.error('❌ Error capturando y guardando foto:', error);
      throw error;
    }
  }
}
