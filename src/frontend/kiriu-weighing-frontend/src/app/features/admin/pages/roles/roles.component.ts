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

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
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
  ModuloDto,
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
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    HeaderComponent,
    BreadcrumbComponent,
  ],
  providers: [],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
})
export class RolesComponent implements OnInit {
  // Data properties
  roles: RolDto[] = [];
  filteredRoles: RolDto[] = [];
  availableModulos: ModuloDto[] = [];
  availableModuloPermisos: ModuloPermisoDto[] = [];
  selectedRole: RolDto | null = null;
  selectedRolePermissions: ModuloPermisoDto[] = [];
  searchResult: SearchRolesResponse | null = null;

  // Grouped ModuloPermisos by module for better UX
  groupedModuloPermisos: { [moduloNombre: string]: ModuloPermisoDto[] } = {};

  // UI state
  isLoading = false;
  isSearching = false;
  showModal = false;
  showPermissionsModal = false;
  showConfirmModal = false;
  pageSize = 10;
  currentPage = 1;
  totalCount = 0;
  totalPages = 0;
  isUsingServerSearch = false;

  // Confirmation modal state
  confirmModalData: {
    message: string;
    title: string;
    acceptLabel: string;
    rejectLabel: string;
    acceptCallback: () => void;
  } | null = null;

  // Page size options
  pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

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
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.searchRoles(); // Use search endpoint for initial load
    this.loadModuloPermisos(); // Load module-permissions combinations
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
        this.totalCount = response.data.length;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);

        // Reset search state when loading all roles
        this.searchResult = null;
        this.isUsingServerSearch = false;
        this.currentPage = 1;
      } else {
        throw new Error('Error al cargar roles');
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      this.showToast('error', 'Error', 'Error al cargar la lista de roles');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadModuloPermisos(): Promise<void> {
    try {
      const response = await this.adminService.getAllModulos().toPromise();

      if (response?.success && response.data) {
        this.availableModulos = response.data.filter((m) => m.activo);

        // Extract all ModuloPermisos from all modules
        this.availableModuloPermisos = [];
        this.availableModulos.forEach(modulo => {
          if (modulo.permisos && modulo.permisos.length > 0) {
            this.availableModuloPermisos.push(...modulo.permisos);
          }
        });

        this.groupPermissionsByModule();
      }
    } catch (error) {
      console.error('Error loading module permissions:', error);
    }
  }

  private groupPermissionsByModule(): void {
    this.groupedModuloPermisos = {};

    this.availableModulos.forEach(modulo => {
      if (modulo.permisos && modulo.permisos.length > 0) {
        this.groupedModuloPermisos[modulo.nombre] = modulo.permisos;
      }
    });
  }

  get moduleNames(): string[] {
    return Object.keys(this.groupedModuloPermisos).sort();
  }

  getModuleIcon(moduloNombre: string): string {
    const modulo = this.availableModulos.find(m => m.nombre === moduloNombre);
    return modulo?.icono || '📦';
  }

  selectAllInModule(moduloNombre: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];
    const modulePermisos = this.groupedModuloPermisos[moduloNombre].map(mp => mp.id);

    if (checkbox.checked) {
      // Add all ModuloPermisos of this module
      const newPermisos = [...new Set([...currentPermisos, ...modulePermisos])];
      this.rolForm.patchValue({ permisosIds: newPermisos });
    } else {
      // Remove all ModuloPermisos of this module
      const newPermisos = currentPermisos.filter((id: string) => !modulePermisos.includes(id));
      this.rolForm.patchValue({ permisosIds: newPermisos });
    }
  }

  isModuleFullySelected(moduloNombre: string): boolean {
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];
    const modulePermisos = this.groupedModuloPermisos[moduloNombre].map(mp => mp.id);
    return modulePermisos.length > 0 && modulePermisos.every(id => currentPermisos.includes(id));
  }

  isModulePartiallySelected(moduloNombre: string): boolean {
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];
    const modulePermisos = this.groupedModuloPermisos[moduloNombre].map(mp => mp.id);
    const selectedCount = modulePermisos.filter(id => currentPermisos.includes(id)).length;
    return selectedCount > 0 && selectedCount < modulePermisos.length;
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
        this.totalCount = response.data.totalCount;
        this.totalPages = response.data.totalPages;
        this.currentPage = response.data.pageNumber;
      } else {
        throw new Error('Error en la búsqueda de roles');
      }
    } catch (error) {
      console.error('Error searching roles:', error);
      this.showToast('error', 'Error', 'Error al buscar roles');
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

  async openEditModal(rol: RolDto): Promise<void> {
    this.selectedRole = rol;
    this.isLoading = true;

    try {
      // Load current ModuloPermisos for this role
      await this.loadRolePermissions(rol.id);

      // Extract ModuloPermiso IDs from the loaded permissions
      const moduloPermisosIds = this.selectedRolePermissions.map((mp) => mp.id);

      this.rolForm.patchValue({
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        activo: rol.activo,
        permisosIds: moduloPermisosIds,
      });

      this.showModal = true;
    } catch (error) {
      console.error('Error loading role for edit:', error);
      this.showToast('error', 'Error', 'Error al cargar los permisos del rol');
    } finally {
      this.isLoading = false;
    }
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
          this.showToast('success', 'Éxito', 'Rol actualizado exitosamente');
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
          this.showToast('success', 'Éxito', 'Rol creado exitosamente');
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

      this.showToast('error', 'Error', errorMessage);
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
      this.showToast(
        'warn',
        'Advertencia',
        `No se puede desactivar el rol "${rol.nombre}" porque tiene ${rol.usuariosAsignados} usuario(s) asignado(s)`
      );
      return;
    }

    this.showConfirmDialog(
      `¿Está seguro de que desea desactivar el rol "${rol.nombre}"?`,
      'Confirmar Desactivación',
      'Sí, desactivar',
      'Cancelar',
      () => this.toggleRoleStatus(rol, false)
    );
  }

  // Reactivate role
  confirmReactivate(rol: RolDto): void {
    this.showConfirmDialog(
      `¿Está seguro de que desea reactivar el rol "${rol.nombre}"?`,
      'Confirmar Reactivación',
      'Sí, reactivar',
      'Cancelar',
      () => this.toggleRoleStatus(rol, true)
    );
  }

  // Toggle role status (activate/deactivate)
  private async toggleRoleStatus(
    rol: RolDto,
    newStatus: boolean
  ): Promise<void> {
    this.isLoading = true;
    const action = newStatus ? 'activar' : 'desactivar';

    try {
      // Load current ModuloPermisos for this role to preserve them
      await this.loadRolePermissions(rol.id);
      const moduloPermisosIds = this.selectedRolePermissions.map((mp) => mp.id);

      const updateRequest: UpdateRolRequest = {
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        activo: newStatus,
        permisosIds: moduloPermisosIds,
      };

      const response = await this.adminService
        .updateRol(rol.id, updateRequest)
        .toPromise();

      if (response?.success) {
        this.showToast(
          'success',
          'Éxito',
          `Rol "${rol.nombre}" ${newStatus ? 'activado' : 'desactivado'} exitosamente`
        );

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

      this.showToast('error', 'Error', errorMessage);
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
  onModuloPermisoChange(event: Event, moduloPermisoId: string): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];

    if (checkbox.checked) {
      if (!currentPermisos.includes(moduloPermisoId)) {
        this.rolForm.patchValue({
          permisosIds: [...currentPermisos, moduloPermisoId]
        });
      }
    } else {
      this.rolForm.patchValue({
        permisosIds: currentPermisos.filter((id: string) => id !== moduloPermisoId)
      });
    }
  }

  isModuloPermisoSelected(moduloPermisoId: string): boolean {
    const currentPermisos = this.rolForm.get('permisosIds')?.value || [];
    return currentPermisos.includes(moduloPermisoId);
  }

  getPermissionTypeIcon(tipoPermiso: string): string {
    const icons: { [key: string]: string } = {
      'CREATE': '➕',
      'READ': '👁️',
      'UPDATE': '✏️',
      'DELETE': '🗑️',
      'EXPORT': '📥',
      'PRINT': '🖨️'
    };
    return icons[tipoPermiso] || '🔑';
  }

  // Pagination method
  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = Number(select.value);
    this.currentPage = 1;
    this.searchRoles();
  }

  // Modal de confirmación nativo
  showConfirmDialog(
    message: string,
    title: string,
    acceptLabel: string,
    rejectLabel: string,
    acceptCallback: () => void
  ): void {
    this.confirmModalData = {
      message,
      title,
      acceptLabel,
      rejectLabel,
      acceptCallback,
    };
    this.showConfirmModal = true;
    document.body.classList.add('km-scroll-lock');
  }

  onConfirmAccept(): void {
    if (this.confirmModalData?.acceptCallback) {
      this.confirmModalData.acceptCallback();
    }
    this.closeConfirmModal();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmModalData = null;
    document.body.classList.remove('km-scroll-lock');
  }

  // Sistema de notificaciones nativo
  private showToast(
    severity: 'success' | 'error' | 'warn' | 'info',
    summary: string,
    detail: string
  ): void {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${severity}`;

    const icons = {
      success: '✓',
      error: '✕',
      warn: '!',
      info: 'i',
    };

    toast.innerHTML = `
      <div class="toast__body">
        <div class="toast__icon">${icons[severity]}</div>
        <div>
          <div class="toast__title">${summary}</div>
          <div class="toast__msg">${detail}</div>
        </div>
        <button class="toast__close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove después de 5 segundos
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'toast-out 0.18s cubic-bezier(0.22, 0.61, 0.36, 1) both';
        setTimeout(() => {
          toast.remove();
        }, 180);
      }
    }, 5000);
  }
}
