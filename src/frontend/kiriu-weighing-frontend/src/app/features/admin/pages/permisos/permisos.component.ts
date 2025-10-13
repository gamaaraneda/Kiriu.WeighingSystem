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
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
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
import { AuthService } from '../../../../core/services/auth.service';
import {
  PermisoDto,
  CreatePermisoRequest,
  TipoPermiso,
  RolDto,
} from '../../types/admin.types';

interface FilterOptions {
  search: string;
  tipo?: string;
  activo?: boolean;
}

interface TipoOption {
  label: string;
  value: string;
}

interface EstadoOption {
  label: string;
  value: boolean;
}

interface PermissionStats {
  tipo: string;
  count: number;
}

interface PermissionUsageStats {
  rolesCount: number;
  modulesCount: number;
  usersCount: number;
}

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    HeaderComponent,
    BreadcrumbComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.scss'],
})
export class PermisosComponent implements OnInit {
  // Data properties
  permisos: PermisoDto[] = [];
  filteredPermisos: PermisoDto[] = [];
  selectedPermiso: PermisoDto | null = null;
  permissionStats: PermissionStats[] = [];
  permissionUsageStats: PermissionUsageStats = {
    rolesCount: 0,
    modulesCount: 0,
    usersCount: 0,
  };
  rolesUsingPermission: RolDto[] = [];

  // UI state
  isLoading = false;
  showModal = false;
  showUsageModal = false;
  pageSize = 10;

  // Forms
  permisoForm!: FormGroup;

  // Filter options
  searchFilters: FilterOptions = {
    search: '',
    tipo: undefined,
    activo: undefined,
  };

  tipoOptions: TipoOption[] = [
    { label: 'Crear', value: TipoPermiso.CREATE },
    { label: 'Leer', value: TipoPermiso.READ },
    { label: 'Actualizar', value: TipoPermiso.UPDATE },
    { label: 'Eliminar', value: TipoPermiso.DELETE },
    { label: 'Exportar', value: TipoPermiso.EXPORT },
  ];

  estadoOptions: EstadoOption[] = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadPermisos();
  }

  private initializeForm(): void {
    this.permisoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: [''],
      tipo: ['', [Validators.required]],
      activo: [true],
    });
  }

  private async loadPermisos(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService.getAllPermisos().toPromise();

      if (response?.success && response.data) {
        this.permisos = response.data;
        this.calculatePermissionStats();
        this.applyFilters();
      } else {
        throw new Error('Error al cargar permisos');
      }
    } catch (error) {
      console.error('Error loading permisos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar la lista de permisos',
        key: 'top-right',
      });
    } finally {
      this.isLoading = false;
    }
  }

  private calculatePermissionStats(): void {
    const statsMap = new Map<string, number>();

    // Initialize with all permission types
    Object.values(TipoPermiso).forEach((tipo) => {
      statsMap.set(tipo, 0);
    });

    // Count permissions by type
    this.permisos.forEach((permiso) => {
      if (permiso.activo) {
        const currentCount = statsMap.get(permiso.tipo) || 0;
        statsMap.set(permiso.tipo, currentCount + 1);
      }
    });

    this.permissionStats = Array.from(statsMap.entries()).map(
      ([tipo, count]) => ({
        tipo,
        count,
      })
    );
  }

  // Utility methods for permission types
  getPermissionTypeLabel(tipo: string): string {
    const typeMap: Record<string, string> = {
      [TipoPermiso.CREATE]: 'Crear',
      [TipoPermiso.READ]: 'Leer',
      [TipoPermiso.UPDATE]: 'Actualizar',
      [TipoPermiso.DELETE]: 'Eliminar',
      [TipoPermiso.EXPORT]: 'Exportar',
    };
    return typeMap[tipo] || tipo;
  }

  getPermissionTypeSeverity(
    tipo: string
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const severityMap: Record<
      string,
      'success' | 'info' | 'warning' | 'danger' | 'secondary'
    > = {
      [TipoPermiso.CREATE]: 'success',
      [TipoPermiso.READ]: 'info',
      [TipoPermiso.UPDATE]: 'warning',
      [TipoPermiso.DELETE]: 'danger',
      [TipoPermiso.EXPORT]: 'secondary',
    };
    return severityMap[tipo] || 'secondary';
  }

  getIconForPermissionType(tipo: string): string {
    const iconMap: Record<string, string> = {
      [TipoPermiso.CREATE]: 'pi pi-plus-circle',
      [TipoPermiso.READ]: 'pi pi-eye',
      [TipoPermiso.UPDATE]: 'pi pi-pencil',
      [TipoPermiso.DELETE]: 'pi pi-trash',
      [TipoPermiso.EXPORT]: 'pi pi-download',
    };
    return iconMap[tipo] || 'pi pi-key';
  }

  // Filter methods
  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredPermisos = this.permisos.filter((permiso) => {
      const matchesSearch =
        !this.searchFilters.search ||
        permiso.nombre
          .toLowerCase()
          .includes(this.searchFilters.search.toLowerCase()) ||
        permiso.descripcion
          ?.toLowerCase()
          .includes(this.searchFilters.search.toLowerCase());

      const matchesType =
        !this.searchFilters.tipo || permiso.tipo === this.searchFilters.tipo;

      const matchesStatus =
        this.searchFilters.activo === undefined ||
        permiso.activo === this.searchFilters.activo;

      return matchesSearch && matchesType && matchesStatus;
    });
  }

  clearFilters(): void {
    this.searchFilters = {
      search: '',
      tipo: undefined,
      activo: undefined,
    };
    this.applyFilters();
  }

  // Modal methods
  openCreateModal(): void {
    this.selectedPermiso = null;
    this.permisoForm.reset({
      nombre: '',
      descripcion: '',
      tipo: '',
      activo: true,
    });
    this.showModal = true;
  }

  openEditModal(permiso: PermisoDto): void {
    this.selectedPermiso = permiso;
    this.permisoForm.patchValue({
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
      tipo: permiso.tipo,
      activo: permiso.activo,
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPermiso = null;
    this.permisoForm.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.permisoForm.invalid) {
      this.permisoForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const formValue = this.permisoForm.value;
      const request: CreatePermisoRequest = {
        nombre: formValue.nombre,
        descripcion: formValue.descripcion || '',
        tipo: formValue.tipo,
        activo: formValue.activo,
      };

      if (this.selectedPermiso) {
        // Update existing permission
        const response = await this.adminService
          .updatePermiso(this.selectedPermiso.id, request)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Permiso actualizado exitosamente',
            key: 'top-right',
          });

          await this.loadPermisos();
          this.closeModal();
        }
      } else {
        // Create new permission
        const response = await this.adminService
          .createPermiso(request)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Permiso creado exitosamente',
            key: 'top-right',
          });

          await this.loadPermisos();
          this.closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving permission:', error);

      let errorMessage = 'Error al guardar el permiso';

      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.error?.errors?.length > 0) {
        errorMessage = error.error.errors[0];
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        key: 'top-right',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Usage methods
  async viewPermissionUsage(permiso: PermisoDto): Promise<void> {
    this.selectedPermiso = permiso;
    await this.loadPermissionUsage(permiso.id);
    this.showUsageModal = true;
  }

  private async loadPermissionUsage(permisoId: string): Promise<void> {
    try {
      // Load roles that use this permission
      const rolesResponse = await this.adminService.getAllRoles().toPromise();

      if (rolesResponse?.success && rolesResponse.data) {
        this.rolesUsingPermission = rolesResponse.data.filter(
          (rol) => rol.permisos?.some((p) => p.id === permisoId) && rol.activo
        );

        // Calculate usage stats
        this.permissionUsageStats = {
          rolesCount: this.rolesUsingPermission.length,
          modulesCount: 0, // This would need to be calculated from ModuloPermiso data
          usersCount: this.rolesUsingPermission.reduce(
            (total, rol) => total + rol.usuariosAsignados,
            0
          ),
        };
      } else {
        this.rolesUsingPermission = [];
        this.permissionUsageStats = {
          rolesCount: 0,
          modulesCount: 0,
          usersCount: 0,
        };
      }
    } catch (error) {
      console.error('Error loading permission usage:', error);
      this.rolesUsingPermission = [];
      this.permissionUsageStats = {
        rolesCount: 0,
        modulesCount: 0,
        usersCount: 0,
      };
    }
  }

  closeUsageModal(): void {
    this.showUsageModal = false;
    this.selectedPermiso = null;
    this.rolesUsingPermission = [];
    this.permissionUsageStats = {
      rolesCount: 0,
      modulesCount: 0,
      usersCount: 0,
    };
  }

  // Delete method
  confirmDelete(permiso: PermisoDto): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el permiso "${permiso.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deletePermiso(permiso),
    });
  }

  private async deletePermiso(permiso: PermisoDto): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService
        .deletePermiso(permiso.id)
        .toPromise();

      if (response?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Permiso "${permiso.nombre}" eliminado exitosamente`,
          key: 'top-right',
        });

        await this.loadPermisos();
      }
    } catch (error: any) {
      console.error('Error deleting permission:', error);

      let errorMessage = 'Error al eliminar el permiso';

      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.error?.errors?.length > 0) {
        errorMessage = error.error.errors[0];
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        key: 'top-right',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Navigation methods
  onQueries(): void {
    this.router.navigate(['/weighing-query']);
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  onGoBack(): void {
    this.router.navigate(['/admin']);
  }
}
