import { Injectable } from '@angular/core';
import { PermissionsService } from './permissions.service';

/**
 * Servicio helper para facilitar el trabajo con permisos en componentes
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionHelperService {

  constructor(private permissionsService: PermissionsService) {}

  // ==========================================
  // MÉTODOS PARA MÓDULO PESAJES
  // ==========================================

  get pesajes() {
    return {
      canCreate: () => this.permissionsService.canCreate('PESAJES'),
      canRead: () => this.permissionsService.canRead('PESAJES'),
      canUpdate: () => this.permissionsService.canUpdate('PESAJES'),
      canDelete: () => this.permissionsService.canDelete('PESAJES'),
      canApprove: () => this.permissionsService.canApprove('PESAJES'),
      canExport: () => this.permissionsService.canExport('PESAJES'),
      hasFullAccess: () => this.permissionsService.hasAllPermissions([
        'PESAJES.CREATE', 'PESAJES.READ', 'PESAJES.UPDATE', 'PESAJES.DELETE'
      ]),
      hasAnyAccess: () => this.permissionsService.hasAnyPermission([
        'PESAJES.CREATE', 'PESAJES.READ', 'PESAJES.UPDATE', 'PESAJES.DELETE'
      ])
    };
  }

  // ==========================================
  // MÉTODOS PARA MÓDULO REPORTES
  // ==========================================

  get reportes() {
    return {
      canRead: () => this.permissionsService.canRead('REPORTES'),
      canExport: () => this.permissionsService.canExport('REPORTES'),
      canPrint: () => this.permissionsService.canPrint('REPORTES'),
      canEdit: () => this.permissionsService.canUpdate('REPORTES'),
      hasAnyAccess: () => this.permissionsService.hasAnyPermission([
        'REPORTES.READ', 'REPORTES.EXPORT', 'REPORTES.PRINT', 'REPORTES.EDIT'
      ]),
      hasFullAccess: () => this.permissionsService.hasAllPermissions([
        'REPORTES.READ', 'REPORTES.EXPORT', 'REPORTES.PRINT', 'REPORTES.EDIT'
      ])
    };
  }

  // ==========================================
  // MÉTODOS PARA MÓDULO CATALOGOS
  // ==========================================

  get catalogos() {
    return {
      canCreate: () => this.permissionsService.canCreate('CATALOGOS'),
      canRead: () => this.permissionsService.canRead('CATALOGOS'),
      canUpdate: () => this.permissionsService.canUpdate('CATALOGOS'),
      canDelete: () => this.permissionsService.canDelete('CATALOGOS'),
      canExport: () => this.permissionsService.canExport('CATALOGOS'),
      hasFullAccess: () => this.permissionsService.hasAllPermissions([
        'CATALOGOS.CREATE', 'CATALOGOS.READ', 'CATALOGOS.UPDATE', 'CATALOGOS.DELETE'
      ]),
      hasAnyAccess: () => this.permissionsService.hasAnyPermission([
        'CATALOGOS.CREATE', 'CATALOGOS.READ', 'CATALOGOS.UPDATE', 'CATALOGOS.DELETE'
      ])
    };
  }

  // ==========================================
  // MÉTODOS PARA MÓDULO USUARIOS
  // ==========================================

  get usuarios() {
    return {
      canCreate: () => this.permissionsService.canCreate('USUARIOS'),
      canRead: () => this.permissionsService.canRead('USUARIOS'),
      canUpdate: () => this.permissionsService.canUpdate('USUARIOS'),
      canDelete: () => this.permissionsService.canDelete('USUARIOS'),
      canExport: () => this.permissionsService.canExport('USUARIOS'),
      hasFullAccess: () => this.permissionsService.hasAllPermissions([
        'USUARIOS.CREATE', 'USUARIOS.READ', 'USUARIOS.UPDATE', 'USUARIOS.DELETE'
      ]),
      hasAnyAccess: () => this.permissionsService.hasAnyPermission([
        'USUARIOS.CREATE', 'USUARIOS.READ', 'USUARIOS.UPDATE', 'USUARIOS.DELETE'
      ])
    };
  }

  // ==========================================
  // MÉTODOS PARA MÓDULO BASCULA
  // ==========================================

  get bascula() {
    return {
      canCreate: () => this.permissionsService.canCreate('BASCULA'),
      canRead: () => this.permissionsService.canRead('BASCULA'),
      canUpdate: () => this.permissionsService.canUpdate('BASCULA'),
      canDelete: () => this.permissionsService.canDelete('BASCULA'),
      canCalibrate: () => this.permissionsService.canCalibrate('BASCULA'),
      canExport: () => this.permissionsService.canExport('BASCULA'),
      hasFullAccess: () => this.permissionsService.hasAllPermissions([
        'BASCULA.CREATE', 'BASCULA.READ', 'BASCULA.UPDATE', 'BASCULA.DELETE', 'BASCULA.CALIBRATE'
      ]),
      hasAnyAccess: () => this.permissionsService.hasAnyPermission([
        'BASCULA.CREATE', 'BASCULA.READ', 'BASCULA.UPDATE', 'BASCULA.DELETE', 'BASCULA.CALIBRATE'
      ])
    };
  }

  // ==========================================
  // MÉTODOS PARA MÓDULO CONFIGURACION
  // ==========================================

  get configuracion() {
    return {
      canCreate: () => this.permissionsService.canCreate('CONFIGURACION'),
      canRead: () => this.permissionsService.canRead('CONFIGURACION'),
      canUpdate: () => this.permissionsService.canUpdate('CONFIGURACION'),
      canDelete: () => this.permissionsService.canDelete('CONFIGURACION'),
      hasFullAccess: () => this.permissionsService.hasAllPermissions([
        'CONFIGURACION.CREATE', 'CONFIGURACION.READ', 'CONFIGURACION.UPDATE', 'CONFIGURACION.DELETE'
      ]),
      hasAnyAccess: () => this.permissionsService.hasAnyPermission([
        'CONFIGURACION.CREATE', 'CONFIGURACION.READ', 'CONFIGURACION.UPDATE', 'CONFIGURACION.DELETE'
      ])
    };
  }

  // ==========================================
  // MÉTODOS GENERALES
  // ==========================================

  /**
   * Verifica si el usuario es administrador (tiene todos los permisos)
   */
  isAdmin(): boolean {
    const adminPermissions = [
      'PESAJES.CREATE', 'PESAJES.READ', 'PESAJES.UPDATE', 'PESAJES.DELETE',
      'REPORTES.READ', 'REPORTES.EXPORT', 'REPORTES.PRINT',
      'CATALOGOS.CREATE', 'CATALOGOS.READ', 'CATALOGOS.UPDATE', 'CATALOGOS.DELETE',
      'USUARIOS.CREATE', 'USUARIOS.READ', 'USUARIOS.UPDATE', 'USUARIOS.DELETE',
      'BASCULA.CREATE', 'BASCULA.READ', 'BASCULA.UPDATE', 'BASCULA.DELETE', 'BASCULA.CALIBRATE',
      'CONFIGURACION.CREATE', 'CONFIGURACION.READ', 'CONFIGURACION.UPDATE', 'CONFIGURACION.DELETE'
    ];
    
    return this.permissionsService.hasAllPermissions(adminPermissions);
  }

  /**
   * Verifica si el usuario es supervisor
   */
  isSupervisor(): boolean {
    const supervisorPermissions = [
      'PESAJES.READ', 'PESAJES.CREATE', 'PESAJES.UPDATE', 'PESAJES.APPROVE',
      'CATALOGOS.READ', 'CATALOGOS.CREATE', 'CATALOGOS.UPDATE', 'CATALOGOS.EXPORT',
      'BASCULA.READ', 'BASCULA.CALIBRATE',
      'REPORTES.READ', 'REPORTES.EXPORT', 'REPORTES.PRINT',
      'USUARIOS.READ'
    ];
    
    return this.permissionsService.hasAllPermissions(supervisorPermissions);
  }

  /**
   * Verifica si el usuario es operador básico
   */
  isOperator(): boolean {
    const operatorPermissions = [
      'PESAJES.READ', 'PESAJES.CREATE',
      'CATALOGOS.READ',
      'BASCULA.READ'
    ];
    
    return this.permissionsService.hasAllPermissions(operatorPermissions) && 
           !this.isSupervisor() && !this.isAdmin();
  }

  /**
   * Obtiene el nivel de acceso del usuario como string
   */
  getUserLevel(): 'admin' | 'supervisor' | 'operator' | 'limited' {
    if (this.isAdmin()) return 'admin';
    if (this.isSupervisor()) return 'supervisor';
    if (this.isOperator()) return 'operator';
    return 'limited';
  }

  /**
   * Verifica si el usuario puede acceder a una sección específica
   */
  canAccessSection(section: string): boolean {
    const sectionPermissions: { [key: string]: string[] } = {
      'dashboard': ['PESAJES.READ', 'REPORTES.READ', 'CATALOGOS.READ'],
      'weighing': ['PESAJES.CREATE', 'PESAJES.READ', 'PESAJES.UPDATE'],
      'reports': ['REPORTES.READ'],
      'admin': ['USUARIOS.READ', 'CONFIGURACION.READ'],
      'calibration': ['BASCULA.CALIBRATE', 'BASCULA.READ']
    };

    const requiredPermissions = sectionPermissions[section];
    if (!requiredPermissions) return false;

    return this.permissionsService.hasAnyPermission(requiredPermissions);
  }

  /**
   * Genera elementos de menú basados en permisos
   */
  getMenuItems() {
    const items = [];

    if (this.canAccessSection('weighing')) {
      items.push({
        label: 'Pesajes',
        icon: 'pi pi-scale',
        routerLink: '/weighing',
        permission: 'PESAJES.READ'
      });
    }

    if (this.canAccessSection('reports')) {
      items.push({
        label: 'Reportes',
        icon: 'pi pi-chart-bar',
        routerLink: '/reports',
        permission: 'REPORTES.READ'
      });
    }

    if (this.catalogos.hasAnyAccess()) {
      items.push({
        label: 'Catálogos',
        icon: 'pi pi-database',
        routerLink: '/catalogos',
        permission: 'CATALOGOS.READ'
      });
    }

    if (this.canAccessSection('admin')) {
      items.push({
        label: 'Administración',
        icon: 'pi pi-cog',
        items: [
          ...(this.usuarios.hasAnyAccess() ? [{
            label: 'Usuarios',
            icon: 'pi pi-users',
            routerLink: '/admin/usuarios',
            permission: 'USUARIOS.READ'
          }] : []),
          ...(this.configuracion.hasAnyAccess() ? [{
            label: 'Configuración',
            icon: 'pi pi-cog',
            routerLink: '/admin/configuracion',
            permission: 'CONFIGURACION.READ'
          }] : [])
        ]
      });
    }

    if (this.canAccessSection('calibration')) {
      items.push({
        label: 'Básculas',
        icon: 'pi pi-wrench',
        routerLink: '/bascula',
        permission: 'BASCULA.READ'
      });
    }

    return items;
  }
}