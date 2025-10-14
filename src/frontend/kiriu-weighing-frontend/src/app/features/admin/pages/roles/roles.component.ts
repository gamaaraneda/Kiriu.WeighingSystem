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
  RolDto,
  CreateRolRequest,
  UpdateRolRequest,
  PermisoDto,
  ModuloPermisoDto,
  SearchRolesRequest,
  SearchRolesResponse,
} from '../../types/admin.types';

interface FilterOptions {
  search: string;
  activo?: boolean;
}

interface EstadoOption {
  label: string;
  value: boolean;
}

@Component({
  selector: 'app-roles',
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
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
})
export class RolesComponent implements OnInit {
  // Data properties
  roles: RolDto[] = [];
  filteredRoles: RolDto[] = [];
  availablePermisos: PermisoDto[] = [];
  selectedRole: RolDto | null = null;
  selectedRolePermissions: ModuloPermisoDto[] = [];
  searchResult: SearchRolesResponse | null = null;

  // UI state
  isLoading = false;
  isSearching = false;
  showModal = false;
  showPermissionsModal = false;
  pageSize = 10;
  currentPage = 1;
  isUsingServerSearch = false;

  // Forms
  rolForm!: FormGroup;

  // Filter options
  searchFilters: FilterOptions = {
    search: '',
    activo: undefined,
  };

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
    this.loadRoles();
    this.loadPermisos();
  }

  private initializeForm(): void {
    this.rolForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: [''],
      activo: [true],
      permisosIds: [[]],
    });
  }

  private async loadRoles(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService.getAllRoles().toPromise();

      if (response?.success && response.data) {
        this.roles = response.data;
        this.filteredRoles = response.data;

        // Reset search state when loading all roles
        this.searchResult = null;
        this.isUsingServerSearch = false;
        this.currentPage = 1;
      } else {
        throw new Error('Error al cargar roles');
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar la lista de roles',
        key: 'top-right',
      });
    } finally {
      this.isLoading = false;
    }
  }

  private async loadPermisos(): Promise<void> {
    try {
      const response = await this.adminService.getAllPermisos().toPromise();

      if (response?.success && response.data) {
        this.availablePermisos = response.data.filter((p) => p.activo);
      }
    } catch (error) {
      console.error('Error loading permisos:', error);
    }
  }

  // Search methods
  async searchRoles(): Promise<void> {
    if (this.isSearching) return;

    this.isSearching = true;
    this.isUsingServerSearch = true;

    try {
      const searchRequest: SearchRolesRequest = {
        search: this.searchFilters.search || undefined,
        activo: this.searchFilters.activo,
        pageNumber: this.currentPage,
        pageSize: this.pageSize,
      };

      const response = await this.adminService
        .searchRoles(searchRequest)
        .toPromise();

      if (response?.success && response.data) {
        this.searchResult = response.data;
        this.filteredRoles = response.data.roles;

        this.messageService.add({
          severity: 'success',
          summary: 'Búsqueda completada',
          detail: `Se encontraron ${response.data.totalCount} roles`,
          key: 'top-right',
        });
      } else {
        throw new Error('Error en la búsqueda de roles');
      }
    } catch (error) {
      console.error('Error searching roles:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al buscar roles',
        key: 'top-right',
      });
    } finally {
      this.isSearching = false;
    }
  }

  // Filter methods - No longer needed for automatic filtering
  // Keeping this method for potential future use, but it's not called automatically anymore

  async clearFilters(): Promise<void> {
    this.searchFilters = {
      search: '',
      activo: undefined,
    };
    this.currentPage = 1;
    this.searchResult = null;
    this.isUsingServerSearch = false;

    // Reload all roles
    await this.loadRoles();
  }

  // Pagination methods
  async goToPreviousPage(): Promise<void> {
    if (this.searchResult?.hasPreviousPage) {
      this.currentPage--;
      await this.searchRoles();
    }
  }

  async goToNextPage(): Promise<void> {
    if (this.searchResult?.hasNextPage) {
      this.currentPage++;
      await this.searchRoles();
    }
  }

  // Modal methods
  openCreateModal(): void {
    this.selectedRole = null;
    this.rolForm.reset({
      nombre: '',
      descripcion: '',
      activo: true,
      permisosIds: [],
    });
    this.showModal = true;
  }

  openEditModal(rol: RolDto): void {
    this.selectedRole = rol;

    // Load current permissions for this role
    this.loadRolePermissions(rol.id);

    this.rolForm.patchValue({
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      activo: rol.activo,
      permisosIds: rol.permisos?.map((p) => p.id) || [],
    });

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedRole = null;
    this.rolForm.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const formValue = this.rolForm.value;

      if (this.selectedRole) {
        // Update existing role
        const updateRequest: UpdateRolRequest = {
          nombre: formValue.nombre,
          descripcion: formValue.descripcion || '',
          activo: formValue.activo,
          permisosIds: formValue.permisosIds || [],
        };

        const response = await this.adminService
          .updateRol(this.selectedRole.id, updateRequest)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Rol actualizado exitosamente',
            key: 'top-right',
          });

          await this.loadRoles();
          this.closeModal();
        }
      } else {
        // Create new role
        const createRequest: CreateRolRequest = {
          nombre: formValue.nombre,
          descripcion: formValue.descripcion || '',
          activo: formValue.activo,
          permisosIds: formValue.permisosIds || [],
        };

        const response = await this.adminService
          .createRol(createRequest)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Rol creado exitosamente',
            key: 'top-right',
          });

          await this.loadRoles();
          this.closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving role:', error);

      let errorMessage = 'Error al guardar el rol';

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

  // Permission methods
  async viewRolePermissions(rol: RolDto): Promise<void> {
    this.selectedRole = rol;
    await this.loadRolePermissions(rol.id);
    this.showPermissionsModal = true;
  }

  private async loadRolePermissions(rolId: string): Promise<void> {
    try {
      const response = await this.adminService
        .getPermisosDeRol(rolId)
        .toPromise();

      if (response?.success && response.data) {
        this.selectedRolePermissions = response.data;
      } else {
        this.selectedRolePermissions = [];
      }
    } catch (error) {
      console.error('Error loading role permissions:', error);
      this.selectedRolePermissions = [];
    }
  }

  closePermissionsModal(): void {
    this.showPermissionsModal = false;
    this.selectedRole = null;
    this.selectedRolePermissions = [];
  }

  goToAssignPermissions(): void {
    if (this.selectedRole) {
      this.router.navigate(['/admin/roles-permisos'], {
        queryParams: { rolId: this.selectedRole.id },
      });
    }
  }

  // Legacy method for backwards compatibility (to avoid cache issues)
  confirmDelete(rol: RolDto): void {
    this.confirmDeactivate(rol);
  }

  // Deactivate role (soft delete)
  confirmDeactivate(rol: RolDto): void {
    if (rol.usuariosAsignados > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: `No se puede desactivar el rol "${rol.nombre}" porque tiene ${rol.usuariosAsignados} usuario(s) asignado(s)`,
        key: 'top-right',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea desactivar el rol "${rol.nombre}"?`,
      header: 'Confirmar Desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.toggleRoleStatus(rol, false),
    });
  }

  // Reactivate role
  confirmReactivate(rol: RolDto): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea reactivar el rol "${rol.nombre}"?`,
      header: 'Confirmar Reactivación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, Reactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.toggleRoleStatus(rol, true),
    });
  }

  // Toggle role status (activate/deactivate)
  private async toggleRoleStatus(
    rol: RolDto,
    newStatus: boolean
  ): Promise<void> {
    this.isLoading = true;
    const action = newStatus ? 'activar' : 'desactivar';

    try {
      const updateRequest: UpdateRolRequest = {
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        activo: newStatus,
        permisosIds: rol.permisos?.map((p) => p.id) || [],
      };

      const response = await this.adminService
        .updateRol(rol.id, updateRequest)
        .toPromise();

      if (response?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Rol "${rol.nombre}" ${
            newStatus ? 'activado' : 'desactivado'
          } exitosamente`,
          key: 'top-right',
        });

        // Refresh the data
        if (this.isUsingServerSearch && this.searchResult) {
          await this.searchRoles();
        } else {
          await this.loadRoles();
        }
      }
    } catch (error: any) {
      console.error(`Error ${action} role:`, error);

      let errorMessage = `Error al ${action} el rol`;

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

  // Pagination methods
  goToPage(page: number): void {
    this.currentPage = page;
    if (this.isUsingServerSearch) {
      this.searchRoles();
    }
  }

  // Math helper for templates
  Math = Math;

  // Checkbox handling for permisos
  onPermisoChange(event: Event, permisoId: string): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];

    if (checkbox.checked) {
      if (!currentPermisos.includes(permisoId)) {
        this.rolForm.patchValue({
          permisosIds: [...currentPermisos, permisoId]
        });
      }
    } else {
      this.rolForm.patchValue({
        permisosIds: currentPermisos.filter((id: string) => id !== permisoId)
      });
    }
  }

  isPermisoSelected(permisoId: string): boolean {
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];
    return currentPermisos.includes(permisoId);
  }
}
