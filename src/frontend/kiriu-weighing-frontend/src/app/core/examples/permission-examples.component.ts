import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { HasPermissionDirective } from '../directives/has-permission.directive';
import { PermissionHelperService } from '../services/permission-helper.service';

/**
 * Componente de ejemplo que muestra cómo usar el sistema de permisos
 * Este componente es solo para demostración y documentación
 */
@Component({
  selector: 'app-permission-examples',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    HasPermissionDirective
  ],
  template: `
    <div class="permission-examples">
      <h1>Ejemplos del Sistema de Permisos</h1>
      <p>Este componente demuestra diferentes formas de usar el sistema de permisos.</p>

      <!-- Ejemplo 1: Permisos simples con directiva -->
      <p-card header="Ejemplo 1: Permisos Simples">
        <div class="example-content">
          <!-- Solo visible para usuarios con permiso de crear pesajes -->
          <p-button 
            *appHasPermission="'PESAJES.CREATE'"
            label="Crear Pesaje" 
            icon="pi pi-plus"
            severity="success"
            styleClass="m-2">
          </p-button>

          <!-- Solo visible para usuarios con permiso de exportar reportes -->
          <p-button 
            *appHasPermission="'REPORTES.EXPORT'"
            label="Exportar Excel" 
            icon="pi pi-file-excel"
            severity="info"
            styleClass="m-2">
          </p-button>

          <!-- Solo visible para usuarios con permiso de calibrar básculas -->
          <p-button 
            *appHasPermission="'BASCULA.CALIBRATE'"
            label="Calibrar Báscula" 
            icon="pi pi-wrench"
            severity="warning"
            styleClass="m-2">
          </p-button>
        </div>
      </p-card>

      <!-- Ejemplo 2: Múltiples permisos con lógica OR -->
      <p-card header="Ejemplo 2: Múltiples Permisos (OR)">
        <div class="example-content">
          <!-- Visible si tiene cualquiera de estos permisos -->
          <div *appHasPermission="['REPORTES.READ', 'REPORTES.EXPORT', 'REPORTES.PRINT']">
            <h4>Sección de Reportes</h4>
            <p>Visible para usuarios con cualquier permiso de reportes</p>
            
            <p-button 
              *appHasPermission="'REPORTES.READ'"
              label="Ver Reportes" 
              icon="pi pi-eye"
              outlined="true"
              styleClass="m-1">
            </p-button>
            
            <p-button 
              *appHasPermission="'REPORTES.EXPORT'"
              label="Exportar" 
              icon="pi pi-download"
              outlined="true"
              styleClass="m-1">
            </p-button>
            
            <p-button 
              *appHasPermission="'REPORTES.PRINT'"
              label="Imprimir" 
              icon="pi pi-print"
              outlined="true"
              styleClass="m-1">
            </p-button>
          </div>
        </div>
      </p-card>

      <!-- Ejemplo 3: Múltiples permisos con lógica AND -->
      <p-card header="Ejemplo 3: Múltiples Permisos (AND)">
        <div class="example-content">
          <!-- Visible solo si tiene TODOS los permisos -->
          <div *appHasPermission="['USUARIOS.READ', 'USUARIOS.UPDATE']" 
               appHasPermissionRequireAll="true">
            <h4>Administración Avanzada de Usuarios</h4>
            <p>Solo visible para usuarios con permisos de lectura Y actualización</p>
            
            <p-button 
              label="Panel Avanzado" 
              icon="pi pi-cog"
              severity="secondary"
              styleClass="m-1">
            </p-button>
          </div>
        </div>
      </p-card>

      <!-- Ejemplo 4: Uso en código TypeScript -->
      <p-card header="Ejemplo 4: Verificación en Código TypeScript">
        <div class="example-content">
          <h4>Estado de Permisos del Usuario</h4>
          <div class="permission-status">
            <p><strong>Nivel del usuario:</strong> 
              <p-tag [value]="userLevel" [severity]="getLevelSeverity()"></p-tag>
            </p>
            
            <h5>Módulos Disponibles:</h5>
            <ul>
              <li *ngIf="canAccessPesajes">✅ Pesajes</li>
              <li *ngIf="canAccessReportes">✅ Reportes</li>
              <li *ngIf="canAccessCatalogos">✅ Catálogos</li>
              <li *ngIf="canAccessUsuarios">✅ Usuarios</li>
              <li *ngIf="canAccessBascula">✅ Básculas</li>
              <li *ngIf="canAccessConfiguracion">✅ Configuración</li>
            </ul>

            <h5>Acciones Específicas:</h5>
            <div class="actions-grid">
              <p-tag *ngIf="permissions.pesajes.canCreate()" 
                     value="Crear Pesajes" severity="success"></p-tag>
              <p-tag *ngIf="permissions.pesajes.canApprove()" 
                     value="Aprobar Pesajes" severity="warning"></p-tag>
              <p-tag *ngIf="permissions.reportes.canExport()" 
                     value="Exportar Reportes" severity="info"></p-tag>
              <p-tag *ngIf="permissions.bascula.canCalibrate()" 
                     value="Calibrar Básculas" severity="secondary"></p-tag>
            </div>
          </div>
        </div>
      </p-card>

      <!-- Ejemplo 5: Tabla con acciones condicionales -->
      <p-card header="Ejemplo 5: Tabla con Acciones Basadas en Permisos">
        <div class="example-content">
          <p-table [value]="sampleData" styleClass="p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.id }}</td>
                <td>{{ item.nombre }}</td>
                <td>{{ item.estado }}</td>
                <td>
                  <div class="action-buttons">
                    <p-button 
                      *appHasPermission="'CATALOGOS.READ'"
                      icon="pi pi-eye" 
                      size="small" 
                      outlined="true"
                      pTooltip="Ver detalle"
                      styleClass="p-button-info p-mr-1">
                    </p-button>
                    
                    <p-button 
                      *appHasPermission="'CATALOGOS.UPDATE'"
                      icon="pi pi-pencil" 
                      size="small" 
                      outlined="true"
                      pTooltip="Editar"
                      styleClass="p-button-warning p-mr-1">
                    </p-button>
                    
                    <p-button 
                      *appHasPermission="'CATALOGOS.DELETE'"
                      icon="pi pi-trash" 
                      size="small" 
                      outlined="true"
                      pTooltip="Eliminar"
                      severity="danger">
                    </p-button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .permission-examples {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .example-content {
      margin-top: 1rem;
    }

    .permission-status {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    .actions-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.25rem;
    }

    ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }

    li {
      margin-bottom: 0.25rem;
    }

    h1 {
      color: #495057;
      margin-bottom: 0.5rem;
    }

    h4, h5 {
      color: #6c757d;
      margin-bottom: 0.75rem;
    }
  `]
})
export class PermissionExamplesComponent implements OnInit {

  // Datos de ejemplo para la tabla
  sampleData = [
    { id: 1, nombre: 'Elemento 1', estado: 'Activo' },
    { id: 2, nombre: 'Elemento 2', estado: 'Inactivo' },
    { id: 3, nombre: 'Elemento 3', estado: 'Activo' }
  ];

  // Propiedades para mostrar el estado de permisos
  userLevel: string = '';
  canAccessPesajes = false;
  canAccessReportes = false;
  canAccessCatalogos = false;
  canAccessUsuarios = false;
  canAccessBascula = false;
  canAccessConfiguracion = false;

  constructor(public permissions: PermissionHelperService) {}

  ngOnInit(): void {
    this.loadPermissionStatus();
  }

  private loadPermissionStatus(): void {
    // Obtener nivel del usuario
    this.userLevel = this.permissions.getUserLevel();

    // Verificar acceso a módulos
    this.canAccessPesajes = this.permissions.pesajes.hasAnyAccess();
    this.canAccessReportes = this.permissions.reportes.hasAnyAccess();
    this.canAccessCatalogos = this.permissions.catalogos.hasAnyAccess();
    this.canAccessUsuarios = this.permissions.usuarios.hasAnyAccess();
    this.canAccessBascula = this.permissions.bascula.hasAnyAccess();
    this.canAccessConfiguracion = this.permissions.configuracion.hasAnyAccess();
  }

  getLevelSeverity(): 'success' | 'info' | 'warning' | 'danger' {
    switch (this.userLevel) {
      case 'admin': return 'success';
      case 'supervisor': return 'info';
      case 'operator': return 'warning';
      default: return 'danger';
    }
  }
}