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
import { MultiSelectModule } from 'primeng/multiselect';
import { PasswordModule } from 'primeng/password';
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
  UsuarioDto,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  RolDto,
  AsignarRolesRequest,
  SearchUsuariosRequest,
  SearchUsuariosResponse,
} from '../../types/admin.types';

interface FilterOptions {
  search: string;
  rol?: string;
  rolId?: string;
  activo?: boolean;
}

interface EstadoOption {
  label: string;
  value: boolean;
}

@Component({
  selector: 'app-usuarios',
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
    MultiSelectModule,
    PasswordModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    HeaderComponent,
    BreadcrumbComponent,
  ],
  providers: [],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})
export class UsuariosComponent implements OnInit {
  // Data properties
  usuarios: UsuarioDto[] = [];
  filteredUsuarios: UsuarioDto[] = [];
  availableRoles: RolDto[] = [];
  selectedUsuario: UsuarioDto | null = null;

  // UI state
  isLoading = false;
  showModal = false;
  showRolesModal = false;
  showConfirmModal = false;
  pageSize = 10;

  // Confirmation modal state
  confirmModalData: {
    message: string;
    title: string;
    acceptLabel: string;
    rejectLabel: string;
    acceptCallback: () => void;
  } | null = null;

  // Pagination state
  currentPage = 1;
  totalCount = 0;
  totalPages = 0;
  hasPreviousPage = false;
  hasNextPage = false;

  // Page size options
  pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

  // Forms
  usuarioForm!: FormGroup;
  rolesForm!: FormGroup;

  // Filter options
  searchFilters: FilterOptions = {
    search: '',
    rol: undefined,
    rolId: undefined,
    activo: undefined,
  };

  roleOptions: { label: string; value: string }[] = [];

  estadoOptions: EstadoOption[] = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  // Role options for filtering
  get roleFilterOptions(): { label: string; value: string }[] {
    return this.availableRoles.map((rol) => ({
      label: rol.nombre,
      value: rol.id,
    }));
  }

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.onSearch(); // Use search endpoint for initial load
    this.loadRoles();
  }

  private initializeForms(): void {
    this.usuarioForm = this.fb.group(
      {
        nombre: ['', [Validators.required]],
        apellidos: [''],
        email: ['', [Validators.required, Validators.email]],
        rolId: ['', [Validators.required]],
        contrasena: ['', [Validators.required, Validators.minLength(6)]],
        nuevaContrasena: [''],
        activo: [true],
      },
      { validators: this.passwordMatchValidator }
    );

    this.rolesForm = this.fb.group({
      rolesIds: [[]],
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const contrasena = form.get('contrasena')?.value;
    const nuevaContrasena = form.get('nuevaContrasena')?.value;

    // Only validate if both fields have values and we're editing a user
    if (nuevaContrasena && contrasena && contrasena !== nuevaContrasena) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private loadUsuarios(): void {
    this.isLoading = true;

    this.adminService.getAllUsuarios().subscribe({
      next: (response) => {
        console.log('🔍 LoadUsuarios - Full response:', response);
        console.log('🔍 LoadUsuarios - response.success:', response?.success);
        console.log('🔍 LoadUsuarios - response.data:', response?.data);
        console.log(
          '🔍 LoadUsuarios - response.data length:',
          response?.data?.length
        );

        if (response?.success && response.data) {
          this.usuarios = response.data;
          this.applyFilters();
          console.log(
            '✅ LoadUsuarios - Usuarios loaded successfully:',
            this.usuarios.length
          );
        } else {
          console.error('❌ LoadUsuarios - Condition failed:', {
            success: response?.success,
            hasData: !!response?.data,
            dataLength: response?.data?.length,
          });
          this.showToast(
            'error',
            'Error',
            'Error al cargar la lista de usuarios'
          );
        }
      },
      error: (error) => {
        console.error('Error loading usuarios:', error);
        this.showToast(
          'error',
          'Error',
          'Error al cargar la lista de usuarios'
        );
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadRoles(): void {
    this.adminService.getAllRoles().subscribe({
      next: (response) => {
        console.log('🔍 LoadRoles - Full response:', response);
        console.log('🔍 LoadRoles - response.success:', response?.success);
        console.log('🔍 LoadRoles - response.data:', response?.data);
        console.log('🔍 LoadRoles - First role object:', response?.data?.[0]);
        console.log(
          '🔍 LoadRoles - First role keys:',
          Object.keys(response?.data?.[0] || {})
        );

        if (response?.success && response.data) {
          this.availableRoles = response.data.filter((r) => r.activo);
          // Actualizar roleOptions para los combos
          this.roleOptions = this.availableRoles.map((rol) => ({
            label: rol.nombre,
            value: rol.id,
          }));
          console.log(
            '✅ LoadRoles - Roles loaded successfully:',
            this.availableRoles.length
          );
          console.log('✅ LoadRoles - RoleOptions updated:', this.roleOptions);
        } else {
          console.error('❌ LoadRoles - Condition failed:', {
            success: response?.success,
            hasData: !!response?.data,
            dataLength: response?.data?.length,
          });
        }
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      },
    });
  }

  // Filter methods
  onFilterChange(): void {
    this.applyFilters();
  }

  // Search method using new backend endpoint
  onSearch(): void {
    this.isLoading = true;

    const searchRequest: SearchUsuariosRequest = {
      search: this.searchFilters.search || undefined,
      rolId: this.searchFilters.rolId || undefined,
      activo: this.searchFilters.activo,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
    };

    this.adminService.searchUsuarios(searchRequest).subscribe({
      next: (response) => {
        console.log('🔍 Search - Full response:', response);

        if (response?.success && response.data) {
          const searchResult = response.data;

          // Update users and pagination info
          this.usuarios = searchResult.usuarios;
          this.filteredUsuarios = searchResult.usuarios; // No local filtering needed anymore
          this.totalCount = searchResult.totalCount;
          this.totalPages = searchResult.totalPages;
          this.hasPreviousPage = searchResult.hasPreviousPage;
          this.hasNextPage = searchResult.hasNextPage;

          // Toast message removed for better UX

          console.log('✅ Search - Usuarios loaded successfully:', {
            totalCount: searchResult.totalCount,
            currentPage: searchResult.pageNumber,
            totalPages: searchResult.totalPages,
            usersInPage: searchResult.usuarios.length,
          });
        } else {
          console.error('❌ Search - Failed to load users');
          this.showToast('error', 'Error', 'Error al realizar la búsqueda');
        }
      },
      error: (error) => {
        console.error('Error al realizar búsqueda:', error);
        this.showToast('error', 'Error', 'Error al realizar la búsqueda');
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private applyFilters(): void {
    this.filteredUsuarios = this.usuarios.filter((usuario) => {
      const matchesSearch =
        !this.searchFilters.search ||
        usuario.nombre
          .toLowerCase()
          .includes(this.searchFilters.search.toLowerCase()) ||
        usuario.email
          .toLowerCase()
          .includes(this.searchFilters.search.toLowerCase());

      const matchesRole =
        !this.searchFilters.rol || usuario.rolId === this.searchFilters.rolId;

      const matchesStatus =
        this.searchFilters.activo === undefined ||
        usuario.activo === this.searchFilters.activo;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  clearFilters(): void {
    this.searchFilters = {
      search: '',
      rol: undefined,
      rolId: undefined,
      activo: undefined,
    };
    this.currentPage = 1; // Reset to first page
    this.onSearch(); // Reload data and apply cleared filters
  }

  // Modal methods
  openCreateModal(): void {
    this.selectedUsuario = null;
    this.usuarioForm.reset({
      nombre: '',
      apellidos: '',
      email: '',
      contrasena: '',
      nuevaContrasena: '',
      activo: true,
      rolId: '',
    });

    // Enable password fields for new user
    this.usuarioForm.get('contrasena')?.enable();
    this.usuarioForm.get('nuevaContrasena')?.disable();

    this.showModal = true;
  }

  openEditModal(usuario: UsuarioDto): void {
    this.selectedUsuario = usuario;
    this.usuarioForm.patchValue({
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      contrasena: '',
      nuevaContrasena: '',
      activo: usuario.activo,
      rolId: usuario.rolId || '',
    });

    // Disable password fields for existing user (optional change)
    this.usuarioForm.get('contrasena')?.disable();
    this.usuarioForm.get('nuevaContrasena')?.enable();

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedUsuario = null;
    this.usuarioForm.reset();
  }

  confirmDelete(usuario: UsuarioDto): void {
    this.showConfirmDialog(
      `¿Estás seguro de que deseas desactivar al usuario "${usuario.nombre}"? El usuario no podrá acceder al sistema.`,
      'Confirmar desactivación',
      'Sí, desactivar',
      'Cancelar',
      () => {
        this.deleteUsuario(usuario.id);
      }
    );
  }

  confirmReactivate(usuario: UsuarioDto): void {
    this.showConfirmDialog(
      `¿Estás seguro de que deseas reactivar al usuario "${usuario.nombre}"? El usuario podrá acceder nuevamente al sistema.`,
      'Confirmar reactivación',
      'Sí, reactivar',
      'Cancelar',
      () => {
        this.reactivateUsuario(usuario);
      }
    );
  }

  async deleteUsuario(id: string): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService.deleteUsuario(id).toPromise();

      if (response?.success) {
        this.showToast('success', 'Éxito', 'Usuario desactivado exitosamente');
        this.onSearch();
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      this.showToast('error', 'Error', 'Error al desactivar el usuario');
    } finally {
      this.isLoading = false;
    }
  }

  async reactivateUsuario(usuario: UsuarioDto): Promise<void> {
    this.isLoading = true;

    try {
      const updateRequest: UpdateUsuarioRequest = {
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        activo: true, // Reactivar el usuario
        rolId: usuario.rolId || '',
      };

      const response = await this.adminService
        .updateUsuario(usuario.id, updateRequest)
        .toPromise();

      if (response?.success) {
        this.showToast('success', 'Éxito', 'Usuario reactivado exitosamente');
        this.onSearch();
      }
    } catch (error: any) {
      console.error('Error al reactivar usuario:', error);

      let errorMessage = 'Error al reactivar el usuario';

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

  async onSubmit(): Promise<void> {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const formValue = this.usuarioForm.getRawValue();

      if (this.selectedUsuario) {
        // Update existing user
        const updateRequest: UpdateUsuarioRequest = {
          nombre: formValue.nombre,
          apellidos: formValue.apellidos,
          email: formValue.email,
          activo: formValue.activo,
          rolId: formValue.rolId || '',
        };

        // Only include password if provided
        if (formValue.nuevaContrasena) {
          updateRequest.nuevaContrasena = formValue.nuevaContrasena;
        }

        const response = await this.adminService
          .updateUsuario(this.selectedUsuario.id, updateRequest)
          .toPromise();

        if (response?.success) {
          this.showToast(
            'success',
            'Éxito',
            'Usuario actualizado exitosamente'
          );
          this.onSearch();
          this.closeModal();
        }
      } else {
        // Create new user
        const createRequest: CreateUsuarioRequest = {
          nombre: formValue.nombre,
          apellidos: formValue.apellidos,
          email: formValue.email,
          password: formValue.contrasena,
          activo: formValue.activo,
          rolId: formValue.rolId || '',
        };

        const response = await this.adminService
          .createUsuario(createRequest)
          .toPromise();

        if (response?.success) {
          this.showToast('success', 'Éxito', 'Usuario creado exitosamente');
          this.onSearch();
          this.closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      console.error('Error structure:', {
        error: error,
        errorError: error?.error,
        message: error?.error?.message,
        errors: error?.error?.errors,
      });

      let errorMessage = 'Error al guardar el usuario';

      // Priorizar el array de errores sobre el mensaje general
      if (
        error?.error?.errors &&
        Array.isArray(error.error.errors) &&
        error.error.errors.length > 0
      ) {
        errorMessage = error.error.errors[0];
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }

      this.showToast('error', 'Error', errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  // Role assignment methods
  openRolesModal(usuario: UsuarioDto): void {
    this.selectedUsuario = usuario;
    this.rolesForm.patchValue({
      rolesIds: usuario.rolId ? [usuario.rolId] : [],
    });
    this.showRolesModal = true;
  }

  closeRolesModal(): void {
    this.showRolesModal = false;
    this.selectedUsuario = null;
    this.rolesForm.reset();
  }

  async assignRoles(): Promise<void> {
    if (!this.selectedUsuario) return;

    this.isLoading = true;

    try {
      const formValue = this.rolesForm.value;
      const request: AsignarRolesRequest = {
        usuarioId: this.selectedUsuario.id,
        rolesIds: formValue.rolesIds || [],
      };

      const response = await this.adminService
        .asignarRoles(request)
        .toPromise();

      if (response?.success) {
        this.showToast('success', 'Éxito', 'Roles asignados exitosamente');
        this.onSearch();
        this.closeRolesModal();
      }
    } catch (error: any) {
      console.error('Error assigning roles:', error);

      let errorMessage = 'Error al asignar roles';

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

  // Toggle user status
  async toggleUserStatus(usuario: UsuarioDto): Promise<void> {
    const action = usuario.activo ? 'desactivar' : 'activar';
    const newStatus = !usuario.activo;

    this.showConfirmDialog(
      `¿Está seguro de que desea ${action} al usuario "${usuario.nombre}"?`,
      `Confirmar ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      `Sí, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      'Cancelar',
      async () => {
        this.isLoading = true;

        try {
          const updateRequest: UpdateUsuarioRequest = {
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            email: usuario.email,
            activo: newStatus,
            rolId: usuario.rolId || '',
          };

          const response = await this.adminService
            .updateUsuario(usuario.id, updateRequest)
            .toPromise();

          if (response?.success) {
            this.showToast(
              'success',
              'Éxito',
              `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`
            );
            this.onSearch();
          }
        } catch (error: any) {
          console.error('Error toggling user status:', error);

          let errorMessage = `Error al ${action} el usuario`;

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
    );
  }

  // Utility methods
  getUserInitials(nombre: string): string {
    return nombre
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getRoleNames(roles: RolDto[] | undefined): string {
    if (!roles || roles.length === 0) {
      return 'Sin roles';
    }

    if (roles.length <= 2) {
      return roles.map((r) => r.nombre).join(', ');
    }

    return `${roles[0].nombre}, ${roles[1].nombre} +${roles.length - 2} más`;
  }

  getVisibleRoles(roles: RolDto[] | undefined): RolDto[] {
    if (!roles) return [];
    return roles.slice(0, 2);
  }

  getHiddenRolesCount(roles: RolDto[] | undefined): number {
    if (!roles) return 0;
    return Math.max(0, roles.length - 2);
  }

  // Validation helper
  hasFormError(fieldName: string, errorType: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(
      field &&
      field.errors &&
      field.errors[errorType] &&
      field.touched
    );
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
      },
    });
  }

  onGoBack(): void {
    this.router.navigate(['/admin']);
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.onSearch();
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = Number(select.value);
    this.currentPage = 1;
    this.onSearch();
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
        toast.style.animation =
          'toast-out 0.18s cubic-bezier(0.22, 0.61, 0.36, 1) both';
        setTimeout(() => {
          toast.remove();
        }, 180);
      }
    }, 5000);
  }
}
