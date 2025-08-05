import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UserInfo, ApiResponse, RefreshTokenRequest } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly tokenKey = 'kiriu-token';
  private readonly refreshTokenKey = 'kiriu-refresh-token';
  private readonly userKey = 'kiriu-user';
  
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private refreshTokenTimer?: any;

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
    
    return this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/Auth/login`, loginRequest)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Error en el login');
          }
          return response.data;
        }),
        tap(loginResponse => {
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
      return throwError(() => new Error('No refresh token available'));
    }

    const refreshRequest: RefreshTokenRequest = { refreshToken };
    
    return this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/Auth/refresh-token`, refreshRequest)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Error al renovar token');
          }
          return response.data;
        }),
        tap(loginResponse => {
          this.setSession(loginResponse);
          if (this.isBrowser) {
            this.setupTokenRefresh();
          }
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken && this.isBrowser) {
      const logoutRequest = { refreshToken };
      
      return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/Auth/logout`, logoutRequest)
        .pipe(
          tap(() => this.clearSession()),
          map(() => true),
          catchError(() => {
            this.clearSession(); // Limpiar sesión incluso si el logout falla
            return [true];
          })
        );
    } else {
      this.clearSession();
      return new Observable(observer => {
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
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.rol === role;
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
    if (!expiresAt) return;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Renovar el token 5 minutos antes de que expire
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.clearTokenRefresh();
      this.refreshTokenTimer = timer(refreshTime).subscribe(() => {
        this.refreshToken().subscribe({
          error: () => this.logout()
        });
      });
    }
  }

  private clearTokenRefresh(): void {
    if (this.refreshTokenTimer) {
      this.refreshTokenTimer.unsubscribe();
      this.refreshTokenTimer = null;
    }
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      if (error.error && typeof error.error === 'object') {
        const apiError = error.error as ApiResponse<any>;
        if (apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError.errors && apiError.errors.length > 0) {
          errorMessage = apiError.errors.join(', ');
        }
      } else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };
} 