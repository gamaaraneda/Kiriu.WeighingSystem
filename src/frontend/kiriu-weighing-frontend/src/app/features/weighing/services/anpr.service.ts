import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';
import { filter, timeout, take } from 'rxjs/operators';
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
  providedIn: 'root'
})
export class AnprService implements OnDestroy {
  private connection: any = null;
  private anprEventSubject = new BehaviorSubject<AnprEvent | null>(null);
  private connectionStatusSubject = new BehaviorSubject<AnprConnectionStatus>({
    isConnected: false
  });
  private captureStateSubject = new BehaviorSubject<AnprCaptureState>({
    isCapturing: false
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
              'Access-Control-Allow-Credentials': 'true'
            }
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
      script.src = 'https://unpkg.com/@microsoft/signalr@latest/dist/browser/signalr.min.js';
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
        capturedAt: new Date(data.capturedAt)
      };

      this.anprEventSubject.next(anprEvent);

      // Si hay una captura en proceso del tipo correcto, marcarla como completa
      const captureState = this.captureStateSubject.value;
      if (captureState.isCapturing && captureState.cameraType === data.cameraType) {
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

  private updateConnectionStatus(isConnected: boolean, lastError?: string): void {
    this.connectionStatusSubject.next({
      isConnected,
      lastError
    });
  }

  /**
   * Inicia la captura de placa para un tipo de cámara específico
   * Retorna una promesa que se resuelve cuando se recibe el evento ANPR o se alcanza el timeout
   */
  public async capturePlate(
    cameraType: 'trailer' | 'remolque' | 'cargo',
    timeoutMs: number = 30000
  ): Promise<AnprEvent> {
    // Marcar como capturando
    this.captureStateSubject.next({
      isCapturing: true,
      cameraType,
      timeoutMs
    });

    try {
      // Esperar el evento ANPR del tipo correcto con timeout
      const anprEvent = await firstValueFrom(
        this.anprEventSubject.pipe(
          filter((event): event is AnprEvent =>
            event !== null && event.cameraType === cameraType
          ),
          timeout(timeoutMs),
          take(1)
        )
      );

      return anprEvent;
    } catch (error) {
      // En caso de timeout u otro error
      this.captureStateSubject.next({ isCapturing: false });
      throw error;
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
