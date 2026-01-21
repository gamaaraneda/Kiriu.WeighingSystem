import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  throwError,
  timer,
  Subscription,
} from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  UserInfo,
  RefreshTokenRequest,
} from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly tokenKey = 'kiriu-token';
  private readonly refreshTokenKey = 'kiriu-refresh-token';
  private readonly userKey = 'kiriu-user';

  private currentUserSubject = new BehaviorSubject<UserInfo | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  private refreshTokenTimer?: Subscription;

  constructor() {
    // Configurar auto-refresh del token solo en el navegador
    if (this.isBrowser) {
      this.setupTokenRefresh();
      this.checkTokenExpiration();
    }
  }

  /**
   * Verifica si estamos en el navegador
   */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const loginRequest: LoginRequest = { email, password };

    console.log('🌐 AuthService: Haciendo llamada al backend real', {
      url: `${environment.apiUrl}/Auth/login`,
      request: { email, password: '***' },
    });

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/Auth/login`, loginRequest)
      .pipe(
        tap((loginResponse) => {
          console.log('💾 AuthService: Guardando sesión en localStorage', {
            hasToken: !!loginResponse.token,
            hasRefreshToken: !!loginResponse.refreshToken,
            user: loginResponse.user?.nombre,
          });

          this.setSession(loginResponse);
          if (this.isBrowser) {
            this.setupTokenRefresh();
          }
        }),
        catchError(this.handleError)
      );
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.warn('⚠️ No hay refresh token disponible');
      return throwError(() => new Error('No refresh token available'));
    }

    const refreshRequest: RefreshTokenRequest = { refreshToken };

    console.log('🔄 AuthService: Renovando token JWT...');

    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/Auth/refresh-token`,
        refreshRequest
      )
      .pipe(
        tap((loginResponse) => {
          console.log('✅ AuthService: Token renovado exitosamente', {
            hasNewToken: !!loginResponse.token,
            hasNewRefreshToken: !!loginResponse.refreshToken,
            user: loginResponse.user?.nombre,
            expiresAt: loginResponse.expiresAt,
          });

          this.setSession(loginResponse);
          if (this.isBrowser) {
            this.setupTokenRefresh();
          }
        }),
        catchError((error) => {
          console.error('❌ AuthService: Error al renovar token:', error);
          console.log('🚪 AuthService: Forzando logout por error en refresh');
          this.logout().subscribe();
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();

    console.log('🚪 AuthService: Iniciando logout...', {
      hasRefreshToken: !!refreshToken,
      isBrowser: this.isBrowser,
    });

    if (refreshToken && this.isBrowser) {
      const logoutRequest = { refreshToken };

      return this.http
        .post<boolean>(`${environment.apiUrl}/Auth/logout`, logoutRequest)
        .pipe(
          tap(() => {
            console.log('✅ AuthService: Logout exitoso en backend');
            this.clearSession();
          }),
          catchError((error) => {
            console.error(
              '❌ AuthService: Error en logout del backend:',
              error
            );
            console.log(
              '🧹 AuthService: Limpiando sesión local de todas formas'
            );
            this.clearSession(); // Limpiar sesión incluso si el logout falla
            return [true];
          })
        );
    } else {
      console.log('🧹 AuthService: Limpiando sesión local (sin refresh token)');
      this.clearSession();
      return new Observable((observer) => {
        observer.next(true);
        observer.complete();
      });
    }
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false; // En el servidor, siempre retornar false
    }

    const token = this.getToken();
    if (!token) return false;

    // Verificar si el token no ha expirado
    const user = this.getCurrentUser();
    if (!user) return false;

    return !this.isTokenExpired();
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.refreshTokenKey);
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permisos?.includes(permission) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.rol === role;
  }

  /**
   * Fuerza la renovación del token (útil para testing o casos especiales)
   */
  forceTokenRefresh(): Observable<LoginResponse> {
    console.log('🔄 AuthService: Forzando renovación del token...');
    return this.refreshToken();
  }

  /**
   * Verifica si el token necesita renovación (útil para interceptores)
   */
  needsTokenRefresh(): boolean {
    if (!this.isBrowser) return false;

    const expiresAt = localStorage.getItem('token-expires-at');
    if (!expiresAt) return true;

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const timeUntilExpiry = expirationTime - currentTime;

    // Considerar que necesita refresh si expira en menos de 5 minutos
    return timeUntilExpiry <= 5 * 60 * 1000;
  }

  private setSession(authResult: LoginResponse): void {
    if (!this.isBrowser) return;

    localStorage.setItem(this.tokenKey, authResult.token);
    localStorage.setItem(this.refreshTokenKey, authResult.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(authResult.user));
    localStorage.setItem('token-expires-at', authResult.expiresAt);

    this.currentUserSubject.next(authResult.user);
  }

  private clearSession(): void {
    if (!this.isBrowser) return;

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('token-expires-at');

    this.currentUserSubject.next(null);
    this.clearTokenRefresh();
    this.router.navigate(['/login']);
  }

  /**
   * Limpia la sesión localmente sin hacer llamada al backend.
   * Útil cuando la sesión ya fue invalidada por el backend (ej: login en otro dispositivo).
   * No redirige al login (el interceptor se encarga de eso).
   */
  clearSessionLocally(): void {
    if (!this.isBrowser) return;

    console.log('🧹 AuthService: Limpiando sesión local (sin llamada al backend)');

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('token-expires-at');

    this.currentUserSubject.next(null);
    this.clearTokenRefresh();
  }

  private getUserFromStorage(): UserInfo | null {
    if (!this.isBrowser) return null;

    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  private isTokenExpired(): boolean {
    if (!this.isBrowser) return true;

    const expiresAt = localStorage.getItem('token-expires-at');
    if (!expiresAt) return true;

    return new Date(expiresAt).getTime() <= new Date().getTime();
  }

  private checkTokenExpiration(): void {
    if (this.isTokenExpired()) {
      this.clearSession();
    }
  }

  private setupTokenRefresh(): void {
    if (!this.isBrowser) return;

    const expiresAt = localStorage.getItem('token-expires-at');
    if (!expiresAt) {
      console.warn('⚠️ AuthService: No hay fecha de expiración configurada');
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const timeUntilExpiry = expirationTime - currentTime;

    // Renovar el token 5 minutos antes de que expire
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;

    console.log('⏰ AuthService: Configurando refresh automático', {
      expiresAt: new Date(expiresAt).toLocaleString(),
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + ' minutos',
      refreshIn: Math.round(refreshTime / 1000 / 60) + ' minutos',
    });

    if (refreshTime > 0) {
      this.clearTokenRefresh();
      this.refreshTokenTimer = timer(refreshTime).subscribe(() => {
        console.log('🔄 AuthService: Ejecutando refresh automático del token');
        this.refreshToken().subscribe({
          next: () => {
            console.log('✅ AuthService: Refresh automático exitoso');
          },
          error: (error) => {
            console.error(
              '❌ AuthService: Error en refresh automático:',
              error
            );
            // El logout se maneja automáticamente en refreshToken()
          },
        });
      });
    } else {
      console.warn(
        '⚠️ AuthService: Token expira muy pronto, no se puede configurar refresh automático'
      );
      // Si el token expira en menos de 5 minutos, verificar si ya expiró
      if (timeUntilExpiry <= 0) {
        console.log('🚪 AuthService: Token ya expiró, forzando logout');
        this.clearSession();
      }
    }
  }

  private clearTokenRefresh(): void {
    if (this.refreshTokenTimer) {
      this.refreshTokenTimer.unsubscribe();
      this.refreshTokenTimer = undefined;
    }
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Error desconocido';
    let errorCode = '';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      if (error.error && typeof error.error === 'object') {
        const apiError = error.error as Record<string, unknown>;
        if (apiError['message'] && typeof apiError['message'] === 'string') {
          errorMessage = apiError['message'];
        }
        // Detectar errores específicos
        if (apiError['errors'] && Array.isArray(apiError['errors'])) {
          const errors = apiError['errors'] as string[];
          // Verificar si es error de sesión activa existente
          if (errors.includes('ACTIVE_SESSION_EXISTS')) {
            errorCode = 'ACTIVE_SESSION_EXISTS';
            console.log('🚫 AuthService: Sesión activa existente detectada', errors);
          }
          // Solo agregar errores si no tenemos mensaje
          if (!errorMessage || errorMessage === 'Error desconocido') {
            errorMessage = errors.join(', ');
          }
        }
      } else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }

    // Crear error personalizado con código
    const customError = new Error(errorMessage) as Error & { code?: string };
    if (errorCode) {
      customError.code = errorCode;
    }

    return throwError(() => customError);
  };
}
