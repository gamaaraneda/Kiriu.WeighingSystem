import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

// Shared Components
import { HeaderComponent } from '../../../../layout/header/header.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';

// Services and Types
import { AdminService } from '../../services/admin.service';
import {
  RolDto,
  ModuloDto,
  ModuloPermisoDto,
  AsignarPermisosRequest,
} from '../../types/admin.types';

interface RolPermisoAssignment {
  rol: RolDto;
  modulosPermisosAsignados: ModuloPermisoDto[];
  todosLosModulosPermisos: ModuloPermisoDto[];
}

@Component({
  selector: 'app-roles-permisos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,

    HeaderComponent,
    BreadcrumbComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './roles-permisos.component.html',
  styleUrls: ['./roles-permisos.component.scss'],
})
export class RolesPermisosComponent implements OnInit {
  roles: RolDto[] = [];
  modulos: ModuloDto[] = [];
  rolesPermisos: RolPermisoAssignment[] = [];

  selectedRol: RolDto | null = null;
  selectedPermisosIds: string[] = [];

  showAssignmentDialog = false;
  loading = true;
  saving = false;

  constructor(
    private adminService: AdminService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadRoles(),
        this.loadModulos(),
        this.loadRolesWithPermisos(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar los datos',
      });
    } finally {
      this.loading = false;
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const response = await this.adminService.getAllRoles().toPromise();
      if (response?.success && response.data) {
        this.roles = response.data;
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  }

  private async loadModulos(): Promise<void> {
    try {
      const response = await this.adminService.getAllModulos().toPromise();
      if (response?.success && response.data) {
        this.modulos = response.data;
      }
    } catch (error) {
      console.error('Error al cargar módulos:', error);
    }
  }

  private async loadRolesWithPermisos(): Promise<void> {
    try {
      const response = await this.adminService
        .getRolesWithPermisos()
        .toPromise();
      if (response?.success && response.data) {
        this.roles = response.data;
        await this.buildRolePermissionAssignments();
      }
    } catch (error) {
      console.error('Error al cargar roles con permisos:', error);
    }
  }

  private async buildRolePermissionAssignments(): Promise<void> {
    this.rolesPermisos = [];

    for (const rol of this.roles) {
      try {
        const permisosResponse = await this.adminService
          .getPermisosDeRol(rol.id)
          .toPromise();
        const modulosPermisosAsignados =
          permisosResponse?.success && permisosResponse.data
            ? permisosResponse.data
            : [];

        // Obtener todos los módulos-permisos disponibles
        const todosLosModulosPermisos: ModuloPermisoDto[] = [];
        this.modulos.forEach((modulo) => {
          if (modulo.permisos) {
            todosLosModulosPermisos.push(...modulo.permisos);
          }
        });

        this.rolesPermisos.push({
          rol,
          modulosPermisosAsignados,
          todosLosModulosPermisos,
        });
      } catch (error) {
        console.error(`Error al cargar permisos del rol ${rol.nombre}:`, error);
      }
    }
  }

  openAssignmentDialog(rol: RolDto): void {
    this.selectedRol = rol;
    const rolPermisos = this.rolesPermisos.find((rp) => rp.rol.id === rol.id);
    this.selectedPermisosIds =
      rolPermisos?.modulosPermisosAsignados.map((mp) => mp.id) || [];
    this.showAssignmentDialog = true;
  }

  closeAssignmentDialog(): void {
    this.showAssignmentDialog = false;
    this.selectedRol = null;
    this.selectedPermisosIds = [];
  }

  isPermisoSelected(moduloPermisoId: string): boolean {
    return this.selectedPermisosIds.includes(moduloPermisoId);
  }

  togglePermiso(moduloPermisoId: string): void {
    const index = this.selectedPermisosIds.indexOf(moduloPermisoId);
    if (index > -1) {
      this.selectedPermisosIds.splice(index, 1);
    } else {
      this.selectedPermisosIds.push(moduloPermisoId);
    }
  }

  toggleModuloPermisos(modulo: ModuloDto): void {
    const moduloPermisosIds = modulo.permisos?.map((p) => p.id) || [];
    const allSelected = moduloPermisosIds.every((id) =>
      this.selectedPermisosIds.includes(id)
    );

    if (allSelected) {
      // Deseleccionar todos los permisos de este módulo
      moduloPermisosIds.forEach((id) => {
        const index = this.selectedPermisosIds.indexOf(id);
        if (index > -1) {
          this.selectedPermisosIds.splice(index, 1);
        }
      });
    } else {
      // Seleccionar todos los permisos de este módulo
      moduloPermisosIds.forEach((id) => {
        if (!this.selectedPermisosIds.includes(id)) {
          this.selectedPermisosIds.push(id);
        }
      });
    }
  }

  isModuloFullySelected(modulo: ModuloDto): boolean {
    const moduloPermisosIds = modulo.permisos?.map((p) => p.id) || [];
    return (
      moduloPermisosIds.length > 0 &&
      moduloPermisosIds.every((id) => this.selectedPermisosIds.includes(id))
    );
  }

  isModuloPartiallySelected(modulo: ModuloDto): boolean {
    const moduloPermisosIds = modulo.permisos?.map((p) => p.id) || [];
    const selectedCount = moduloPermisosIds.filter((id) =>
      this.selectedPermisosIds.includes(id)
    ).length;
    return selectedCount > 0 && selectedCount < moduloPermisosIds.length;
  }

  async savePermissions(): Promise<void> {
    if (!this.selectedRol) return;

    this.saving = true;
    try {
      const request: AsignarPermisosRequest = {
        rolId: this.selectedRol.id,
        moduloPermisosIds: this.selectedPermisosIds,
      };

      const response = await this.adminService
        .asignarPermisosARol(this.selectedRol.id, this.selectedPermisosIds)
        .toPromise();

      if (response?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Permisos asignados correctamente',
        });

        this.closeAssignmentDialog();
        await this.loadRolesWithPermisos();
      } else {
        throw new Error(response?.message || 'Error al asignar permisos');
      }
    } catch (error) {
      console.error('Error al asignar permisos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al asignar permisos',
      });
    } finally {
      this.saving = false;
    }
  }

  getPermisosCount(rol: RolDto): number {
    const rolPermisos = this.rolesPermisos.find((rp) => rp.rol.id === rol.id);
    return rolPermisos?.modulosPermisosAsignados.length || 0;
  }

  getModulosWithPermisosCount(rol: RolDto): number {
    const rolPermisos = this.rolesPermisos.find((rp) => rp.rol.id === rol.id);
    if (!rolPermisos) return 0;

    const modulosConPermisos = new Set<string>();
    rolPermisos.modulosPermisosAsignados.forEach((mp) => {
      modulosConPermisos.add(mp.moduloId);
    });

    return modulosConPermisos.size;
  }

  onGoBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  onQueries(): void {
    this.router.navigate(['/weighing-query']);
  }

  onLogout(): void {
    this.router.navigate(['/login']);
  }
}
