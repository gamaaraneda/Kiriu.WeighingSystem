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
import { MultiSelectModule } from 'primeng/multiselect';
import { PasswordModule } from 'primeng/password';
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
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    PasswordModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    HeaderComponent,
    BreadcrumbComponent,
  ],
  providers: [MessageService, ConfirmationService],
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
  pageSize = 50;

  // Pagination state
  currentPage = 1;
  totalCount = 0;
  totalPages = 0;
  hasPreviousPage = false;
  hasNextPage = false;

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
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
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
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar la lista de usuarios',
            key: 'top-right',
          });
        }
      },
      error: (error) => {
        console.error('Error loading usuarios:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar la lista de usuarios',
          key: 'top-right',
        });
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
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al realizar la búsqueda',
            key: 'top-right',
          });
        }
      },
      error: (error) => {
        console.error('Error al realizar búsqueda:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al realizar la búsqueda',
          key: 'top-right',
        });
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
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas desactivar al usuario "${usuario.nombre}"? El usuario no podrá acceder al sistema.`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.deleteUsuario(usuario.id);
      },
    });
  }

  confirmReactivate(usuario: UsuarioDto): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas reactivar al usuario "${usuario.nombre}"? El usuario podrá acceder nuevamente al sistema.`,
      header: 'Confirmar reactivación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.reactivateUsuario(usuario);
      },
    });
  }

  async deleteUsuario(id: string): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService.deleteUsuario(id).toPromise();

      if (response?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario desactivado exitosamente',
          key: 'top-right',
        });

        this.onSearch();
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al desactivar el usuario',
        key: 'top-right',
      });
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
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario reactivado exitosamente',
          key: 'top-right',
        });

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
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario actualizado exitosamente',
            key: 'top-right',
          });

          this.onSearch();
          this.closeModal();
        }
      } else {
        // Create new user
        const createRequest: CreateUsuarioRequest = {
          nombre: formValue.nombre,
          apellidos: formValue.apellidos,
          email: formValue.email,
          contrasena: formValue.contrasena,
          activo: formValue.activo,
          rolId: formValue.rolId || '',
        };

        const response = await this.adminService
          .createUsuario(createRequest)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario creado exitosamente',
            key: 'top-right',
          });

          this.onSearch();
          this.closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error);

      let errorMessage = 'Error al guardar el usuario';

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
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Roles asignados exitosamente',
          key: 'top-right',
        });

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

  // Toggle user status
  async toggleUserStatus(usuario: UsuarioDto): Promise<void> {
    const action = usuario.activo ? 'desactivar' : 'activar';
    const newStatus = !usuario.activo;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea ${action} al usuario "${usuario.nombre}"?`,
      header: `Confirmar ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Sí, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      rejectLabel: 'Cancelar',
      accept: async () => {
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
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Usuario ${
                newStatus ? 'activado' : 'desactivado'
              } exitosamente`,
              key: 'top-right',
            });

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

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            key: 'top-right',
          });
        } finally {
          this.isLoading = false;
        }
      },
    });
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
      }
    });
  }

  onGoBack(): void {
    this.router.navigate(['/admin']);
  }
}
