import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para extraer el nombre de usuario de un email
 * Ejemplo: "juan.perez@empresa.com" -> "juan.perez"
 *
 * Casos especiales:
 * - null/undefined -> "—"
 * - "SYSTEM" o "LEGACY_USER" -> se devuelve tal cual (sin @)
 * - Emails sin @ -> se devuelve tal cual
 */
@Pipe({
  name: 'username',
  standalone: true,
  pure: true // Cache automático de resultados para optimizar performance
})
export class UsernamePipe implements PipeTransform {
  transform(email: string | null | undefined): string {
    // Manejar valores nulos o indefinidos
    if (!email) {
      return '—';
    }

    // Valores especiales del sistema sin dominio
    if (email === 'SYSTEM' || email === 'LEGACY_USER' || !email.includes('@')) {
      return email;
    }

    // Extraer la parte antes del @ (username)
    const username = email.split('@')[0];
    return username || '—';
  }
}
