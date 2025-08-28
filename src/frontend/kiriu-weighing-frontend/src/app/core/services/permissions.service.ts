import { Injectable } from '@angular/core';
import { UserInfo } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private readonly STORAGE_KEY = 'kiriu-user';

  /**
   * Obtiene los permisos del usuario desde localStorage
   */
  getUserPermissions(): string[] {
    try {
      const userData = localStorage.getItem(this.STORAGE_KEY);
      if (userData) {
        const user: UserInfo = JSON.parse(userData);
        return user.permisos || [];
      }
      return [];
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      return [];
    }
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const userPermissions = this.getUserPermissions();
    return userPermissions.includes(permission);
  }

  /**
   * Verifica si el usuario tiene todos los permisos especificados (AND)
   */
  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.getUserPermissions();
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados (OR)
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.getUserPermissions();
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Verifica si el usuario tiene permisos para un módulo específico
   */
  hasModulePermission(module: string, action: string): boolean {
    const permission = `${module.toUpperCase()}.${action.toUpperCase()}`;
    return this.hasPermission(permission);
  }

  /**
   * Obtiene todos los permisos de un módulo específico que tiene el usuario
   */
  getModulePermissions(module: string): string[] {
    const userPermissions = this.getUserPermissions();
    const modulePrefix = `${module.toUpperCase()}.`;
    return userPermissions
      .filter(permission => permission.startsWith(modulePrefix))
      .map(permission => permission.replace(modulePrefix, ''));
  }

  /**
   * Verifica si el usuario puede realizar operaciones CRUD en un módulo
   */
  canCreate(module: string): boolean {
    return this.hasModulePermission(module, 'CREATE');
  }

  canRead(module: string): boolean {
    return this.hasModulePermission(module, 'READ');
  }

  canUpdate(module: string): boolean {
    return this.hasModulePermission(module, 'UPDATE');
  }

  canDelete(module: string): boolean {
    return this.hasModulePermission(module, 'DELETE');
  }

  canExport(module: string): boolean {
    return this.hasModulePermission(module, 'EXPORT');
  }

  canApprove(module: string): boolean {
    return this.hasModulePermission(module, 'APPROVE');
  }

  canPrint(module: string): boolean {
    return this.hasModulePermission(module, 'PRINT');
  }

  canCalibrate(module: string): boolean {
    return this.hasModulePermission(module, 'CALIBRATE');
  }
}