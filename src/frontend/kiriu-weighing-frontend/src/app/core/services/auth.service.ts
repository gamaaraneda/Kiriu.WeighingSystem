import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'kiriu-token';
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  /**
   * Verifica si estamos en el navegador
   */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Realiza el login del usuario
   * @param username - Nombre de usuario
   * @param password - Contraseña
   * @returns Observable con el resultado del login
   */
  login(username: string, password: string): Observable<LoginResponse> {
    // Mock login - acepta admin/admin123
    const success = username === 'admin' && password === 'admin123';

    return of({
      success,
      token: success ? 'mock-token-' + Date.now() : undefined,
      message: success ? 'Login exitoso' : 'Credenciales inválidas',
    }).pipe(
      delay(1000), // Simular llamada API
      tap((response) => {
        if (response.success && response.token && this.isBrowser) {
          localStorage.setItem(this.tokenKey, response.token);
        }
      })
    );
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
    }
    this.router.navigate(['/login']);
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns true si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false; // En el servidor, siempre retornar false
    }
    return !!localStorage.getItem(this.tokenKey);
  }

  /**
   * Obtiene el token de autenticación
   * @returns El token almacenado o null
   */
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Verifica si el token ha expirado (mock - siempre válido)
   * @returns true si el token es válido
   */
  isTokenValid(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const token = this.getToken();
    return !!token;
  }
}
