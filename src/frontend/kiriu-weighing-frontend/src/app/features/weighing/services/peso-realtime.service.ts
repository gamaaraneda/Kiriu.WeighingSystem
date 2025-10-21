import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, throttleTime, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PesoData {
  id: number;
  peso: number;
  timestamp: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export interface SerialGatewayWeightResponse {
  value: number;
  unit: string;
  timestampUtc: string;
  raw: string;
}

@Injectable({
  providedIn: 'root'
})
export class PesoRealtimeService implements OnDestroy {
  private http = inject(HttpClient);
  private connection: any = null;
  private pesoSubject = new BehaviorSubject<PesoData | null>(null);
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
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
      console.error('Error inicializando conexión SignalR:', error);
      this.updateConnectionStatus(false, undefined, error as string);
      
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

    // Escuchar el evento de peso actualizado
    this.connection.on('pesoActualizado', (data: any) => {
      const pesoData: PesoData = {
        id: data.id,
        peso: data.peso,
        timestamp: new Date(data.timestamp)
      };
      
      this.pesoSubject.next(pesoData);
    });

    // Eventos de conexión
    this.connection.onclose(() => {
      this.updateConnectionStatus(false);
      console.log('Conexión SignalR cerrada');
      
      // Intentar reconectar después de 3 segundos
      setTimeout(() => this.startConnection(), 3000);
    });

    this.connection.onreconnecting(() => {
      console.log('Reconectando SignalR...');
      this.updateConnectionStatus(false, this.connectionStatusSubject.value.reconnectAttempts + 1);
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconectado');
      this.updateConnectionStatus(true, 0);
    });
  }

  private async startConnection(): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.start();
      console.log('Conexión SignalR iniciada');
      this.updateConnectionStatus(true, 0);
    } catch (error) {
      console.error('Error al iniciar conexión SignalR:', error);
      this.updateConnectionStatus(false, undefined, error as string);
    }
  }

  private updateConnectionStatus(isConnected: boolean, reconnectAttempts?: number, lastError?: string): void {
    const currentStatus = this.connectionStatusSubject.value;
    this.connectionStatusSubject.next({
      isConnected,
      reconnectAttempts: reconnectAttempts ?? currentStatus.reconnectAttempts,
      lastError
    });
  }

  /**
   * Observable que emite el peso actual con throttle y distinct para evitar actualizaciones excesivas
   */
  public getPesoObservable(): Observable<PesoData | null> {
    return this.pesoSubject.asObservable().pipe(
      throttleTime(100), // Máximo una actualización cada 100ms
      distinctUntilChanged((prev, curr) => {
        if (!prev || !curr) return prev === curr;
        return prev.peso === curr.peso && prev.id === curr.id;
      })
    );
  }

  /**
   * Observable que emite el peso actual sin throttle (para casos específicos)
   */
  public getPesoRawObservable(): Observable<PesoData | null> {
    return this.pesoSubject.asObservable();
  }

  /**
   * Observable del estado de conexión
   */
  public getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatusSubject.asObservable();
  }

  /**
   * Obtiene el último peso conocido
   */
  public getCurrentPeso(): PesoData | null {
    return this.pesoSubject.value;
  }

  /**
   * Verifica si la conexión está activa
   */
  public isConnected(): boolean {
    return this.connectionStatusSubject.value.isConnected;
  }

  /**
   * Fuerza la reconexión
   */
  public async reconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.warn('Error al detener conexión:', error);
      }
    }
    
    await this.initializeConnection();
  }

  /**
   * Unirse a un grupo específico (por ejemplo, para filtrar por báscula)
   */
  public async joinGroup(groupName: string): Promise<void> {
    if (this.connection && this.isConnected()) {
      try {
        await this.connection.invoke('JoinGroup', groupName);
        console.log(`Unido al grupo: ${groupName}`);
      } catch (error) {
        console.error('Error al unirse al grupo:', error);
      }
    }
  }

  /**
   * Salir de un grupo específico
   */
  public async leaveGroup(groupName: string): Promise<void> {
    if (this.connection && this.isConnected()) {
      try {
        await this.connection.invoke('LeaveGroup', groupName);
        console.log(`Salido del grupo: ${groupName}`);
      } catch (error) {
        console.error('Error al salir del grupo:', error);
      }
    }
  }

  /**
   * Obtener peso actual desde SerialGateway (bajo demanda)
   * Este método consulta el endpoint /weight del SerialGateway
   * para obtener el peso actual directamente de la báscula
   */
  public getCurrentWeightFromGateway(): Observable<PesoData> {
    const serialGatewayUrl = environment.serialGatewayUrl || 'http://localhost:5001';

    return this.http.get<SerialGatewayWeightResponse>(`${serialGatewayUrl}/weight`).pipe(
      map(response => ({
        id: 0, // ID temporal ya que no viene del backend principal
        peso: response.value,
        timestamp: new Date(response.timestampUtc)
      }))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.connection) {
      this.connection.stop();
    }

    this.pesoSubject.complete();
    this.connectionStatusSubject.complete();
  }
}