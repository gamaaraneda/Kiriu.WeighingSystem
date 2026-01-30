import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  Subject,
  firstValueFrom,
  catchError,
  of,
} from 'rxjs';
import { filter, timeout, take, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AnprEvent {
  licensePlate: string;
  cameraType: 'trailer' | 'remolque' | 'cargo';
  imageUrl: string;
  confidenceLevel: number;
  direction: string;
  cameraName: string;
  vehicleBrand?: string;
  vehicleColor?: string;
  vehicleType?: string;
  capturedAt: Date;
}

export interface AnprConnectionStatus {
  isConnected: boolean;
  lastError?: string;
}

export interface AnprCaptureState {
  isCapturing: boolean;
  cameraType?: 'trailer' | 'remolque' | 'cargo';
  timeoutMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnprService implements OnDestroy {
  private http = inject(HttpClient);
  private connection: any = null;
  private anprEventSubject = new BehaviorSubject<AnprEvent | null>(null);
  private connectionStatusSubject = new BehaviorSubject<AnprConnectionStatus>({
    isConnected: false,
  });
  private captureStateSubject = new BehaviorSubject<AnprCaptureState>({
    isCapturing: false,
  });
  private destroy$ = new Subject<void>();

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      // Verificar si el cliente de SignalR está disponible
      if (typeof window !== 'undefined' && (window as any).signalR) {
        const { HubConnectionBuilder, LogLevel } = (window as any).signalR;

        this.connection = new HubConnectionBuilder()
          .withUrl(`${environment.hubUrl}/peso`, {
            withCredentials: true,
            headers: {
              'Access-Control-Allow-Credentials': 'true',
            },
          })
          .withAutomaticReconnect([0, 2000, 10000, 30000])
          .configureLogging(LogLevel.Information)
          .build();

        this.setupConnectionEvents();
        await this.startConnection();
      } else {
        // Fallback: intentar cargar el script de SignalR dinámicamente
        await this.loadSignalRScript();
        setTimeout(() => this.initializeConnection(), 1000);
      }
    } catch (error) {
      console.error('Error inicializando conexión SignalR para ANPR:', error);
      this.updateConnectionStatus(false, error as string);

      // Reintentar conexión después de 5 segundos
      setTimeout(() => this.initializeConnection(), 5000);
    }
  }

  private async loadSignalRScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://unpkg.com/@microsoft/signalr@latest/dist/browser/signalr.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar SignalR'));
      document.head.appendChild(script);
    });
  }

  private setupConnectionEvents(): void {
    if (!this.connection) return;

    // Escuchar el evento de ANPR recibido
    this.connection.on('anprEventReceived', (data: any) => {
      const anprEvent: AnprEvent = {
        licensePlate: data.licensePlate,
        cameraType: data.cameraType,
        imageUrl: data.imageUrl,
        confidenceLevel: data.confidenceLevel,
        direction: data.direction,
        cameraName: data.cameraName,
        vehicleBrand: data.vehicleBrand,
        vehicleColor: data.vehicleColor,
        vehicleType: data.vehicleType,
        capturedAt: new Date(data.capturedAt),
      };

      this.anprEventSubject.next(anprEvent);

      // Si hay una captura en proceso del tipo correcto, marcarla como completa
      const captureState = this.captureStateSubject.value;
      if (
        captureState.isCapturing &&
        captureState.cameraType === data.cameraType
      ) {
        this.captureStateSubject.next({ isCapturing: false });
      }
    });

    // Eventos de conexión
    this.connection.onclose(() => {
      this.updateConnectionStatus(false);
      console.log('Conexión SignalR ANPR cerrada');

      // Intentar reconectar después de 3 segundos
      setTimeout(() => this.startConnection(), 3000);
    });

    this.connection.onreconnecting(() => {
      console.log('Reconectando SignalR ANPR...');
      this.updateConnectionStatus(false);
    });

    this.connection.onreconnected(() => {
      console.log('SignalR ANPR reconectado');
      this.updateConnectionStatus(true);
    });
  }

  private async startConnection(): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.start();
      console.log('Conexión SignalR ANPR iniciada');
      this.updateConnectionStatus(true);
    } catch (error) {
      console.error('Error al iniciar conexión SignalR ANPR:', error);
      this.updateConnectionStatus(false, error as string);
    }
  }

  private updateConnectionStatus(
    isConnected: boolean,
    lastError?: string,
  ): void {
    this.connectionStatusSubject.next({
      isConnected,
      lastError,
    });
  }

  /**
   * Inicia la captura de placa para un tipo de cámara específico
   * Retorna una promesa que se resuelve cuando se recibe el evento ANPR o se alcanza el timeout
   */
  public async capturePlate(
    cameraType: 'trailer' | 'remolque' | 'cargo',
    timeoutMs: number = 30000,
  ): Promise<AnprEvent> {
    console.log(`🎯 Iniciando captura de placa para cameraType: ${cameraType}`);

    // Obtener el timestamp actual para filtrar solo eventos nuevos
    const captureStartTime = new Date();

    // Marcar como capturando
    this.captureStateSubject.next({
      isCapturing: true,
      cameraType,
      timeoutMs,
    });

    try {
      console.log(
        `⏳ Esperando evento ANPR de tipo: ${cameraType} (timeout: ${timeoutMs}ms)`,
      );

      // Esperar el SIGUIENTE evento ANPR del tipo correcto que llegue DESPUÉS de iniciar la captura
      const anprEvent = await firstValueFrom(
        this.anprEventSubject.pipe(
          filter((event): event is AnprEvent => {
            if (event === null) return false;

            // Verificar que sea del tipo correcto
            if (event.cameraType !== cameraType) return false;

            // Verificar que sea un evento nuevo (posterior a cuando iniciamos la captura)
            const isNewEvent = new Date(event.capturedAt) >= captureStartTime;

            console.log(
              `📸 Evento recibido - Tipo: ${event.cameraType}, Placa: ${event.licensePlate}, Nuevo: ${isNewEvent}`,
            );

            return isNewEvent;
          }),
          timeout(timeoutMs),
          take(1),
        ),
      );

      console.log(
        `✅ Evento ANPR recibido para ${cameraType}:`,
        anprEvent.licensePlate,
      );
      return anprEvent;
    } catch (error) {
      // En caso de timeout u otro error
      console.error(`❌ Error en captura de ${cameraType}:`, error);
      this.captureStateSubject.next({ isCapturing: false });
      throw error;
    } finally {
      // Limpiar estado de captura
      this.captureStateSubject.next({ isCapturing: false });
    }
  }

  /**
   * Cancela la captura en curso
   */
  public cancelCapture(): void {
    this.captureStateSubject.next({ isCapturing: false });
  }

  /**
   * Observable del estado de captura
   */
  public getCaptureState(): Observable<AnprCaptureState> {
    return this.captureStateSubject.asObservable();
  }

  /**
   * Observable de eventos ANPR
   */
  public getAnprEvents(): Observable<AnprEvent | null> {
    return this.anprEventSubject.asObservable();
  }

  /**
   * Observable del estado de conexión
   */
  public getConnectionStatus(): Observable<AnprConnectionStatus> {
    return this.connectionStatusSubject.asObservable();
  }

  /**
   * Verifica si la conexión está activa
   */
  public isConnected(): boolean {
    return this.connectionStatusSubject.value.isConnected;
  }

  /**
   * Verifica si hay una captura en curso
   */
  public isCapturing(): boolean {
    return this.captureStateSubject.value.isCapturing;
  }

  /**
   * Fuerza la reconexión
   */
  public async reconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.warn('Error al detener conexión ANPR:', error);
      }
    }

    await this.initializeConnection();
  }

  /**
   * Obtiene la última foto huérfana disponible en BD por tipo de cámara
   * Retorna null si no hay fotos disponibles
   */
  public getLatestOrphanPhoto(
    photoType: string,
    excludePhotoId?: string,
  ): Observable<{
    photoUrl: string;
    photoId: string;
    createdAt: Date;
    licensePlate?: string;
  } | null> {
    if (excludePhotoId) {
      console.log(
        `📦 Buscando última foto huérfana en BD para tipo: ${photoType}, excluyendo ID: ${excludePhotoId}`,
      );
    } else {
      console.log(
        `📦 Buscando última foto huérfana en BD para tipo: ${photoType}`,
      );
    }

    const url = excludePhotoId
      ? `${environment.apiUrl}/weighing/photos/orphan/latest/${photoType}?excludePhotoId=${excludePhotoId}`
      : `${environment.apiUrl}/weighing/photos/orphan/latest/${photoType}`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        // El interceptor puede devolver body.data (objeto directo) o la respuesta completa; aceptar ambos
        const data = response?.data != null ? response.data : response;
        if (!data?.photoUrl) {
          return null;
        }
        console.log(`✅ Foto huérfana encontrada en BD: ${data.photoUrl}`);

        // Extraer placa del campo Description (formato: "Placa ANPR: YKD482KY - Cámara: trailer")
        let licensePlate: string | undefined;
        if (data.description) {
          const plateMatch = (data.description as string).match(
            /Placa ANPR:\s*([A-Z0-9]+)/i,
          );
          if (plateMatch && plateMatch[1]) {
            licensePlate = plateMatch[1];
            console.log(`🔍 Placa extraída del Description: ${licensePlate}`);
          }
        }

        return {
          photoUrl: data.photoUrl,
          photoId: data.photoId != null ? String(data.photoId) : '',
          createdAt: new Date(data.createdAt),
          licensePlate,
        };
      }),
      catchError((error) => {
        if (error.status === 404) {
          console.log(
            `ℹ️ No hay fotos huérfanas disponibles para tipo: ${photoType}`,
          );
        } else {
          console.error(`❌ Error al buscar foto huérfana:`, error);
        }
        return of(null);
      }),
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.connection) {
      this.connection.stop();
    }

    this.anprEventSubject.complete();
    this.connectionStatusSubject.complete();
    this.captureStateSubject.complete();
  }
}
