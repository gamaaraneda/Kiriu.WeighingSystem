import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiResponseInterceptor } from './core/interceptors/api-response.interceptor';
import { tokenRefreshInterceptor } from './core/interceptors/token-refresh.interceptor';
import { spinnerInterceptor } from './core/interceptors/spinner-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        spinnerInterceptor, // Primero mostrar spinner
        tokenRefreshInterceptor, // Verificar si necesita refresh
        authInterceptor, // Agregar el token
        apiResponseInterceptor, // Procesar la respuesta
      ])
    ),
    provideAnimations(),
    MessageService, // Provider para PrimeNG MessageService
  ],
};
