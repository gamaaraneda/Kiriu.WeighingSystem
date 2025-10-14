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
import { InputNumberModule } from 'primeng/inputnumber';
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
  ModuloDto,
  CreateModuloRequest,
  UpdateModuloRequest,
  TipoPermiso,
  ModuloPermisoDto,
} from '../../types/admin.types';

interface FilterOptions {
  search: string;
  activo?: boolean;
}

interface EstadoOption {
  label: string;
  value: boolean;
}

interface IconOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-modulos',
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
    InputNumberModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    HeaderComponent,
    BreadcrumbComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './modulos.component.html',
  styleUrls: ['./modulos.component.scss'],
})
export class ModulosComponent implements OnInit {
  // Data properties
  modulos: ModuloDto[] = [];
  filteredModulos: ModuloDto[] = [];
  selectedModulo: ModuloDto | null = null;

  // UI state
  isLoading = false;
  showModal = false;
  showDetailsModal = false;
  pageSize = 10;

  // Reorder state
  reorderMode = false;
  reorderList: ModuloDto[] = [];
  draggedIndex: number | null = null;

  // Forms
  moduloForm!: FormGroup;

  // Filter options
  searchFilters: FilterOptions = {
    search: '',
    activo: undefined,
  };

  estadoOptions: EstadoOption[] = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  iconOptions: IconOption[] = [
    { label: 'Dashboard', value: 'pi pi-th-large' },
    { label: 'Pesajes', value: 'pi pi-calculator' },
    { label: 'Reportes', value: 'pi pi-chart-bar' },
    { label: 'Usuarios', value: 'pi pi-users' },
    { label: 'Configuración', value: 'pi pi-cog' },
    { label: 'Seguridad', value: 'pi pi-shield' },
    { label: 'Base de Datos', value: 'pi pi-database' },
    { label: 'Archivos', value: 'pi pi-folder' },
    { label: 'Red', value: 'pi pi-wifi' },
    { label: 'Herramientas', value: 'pi pi-wrench' },
    { label: 'Calendario', value: 'pi pi-calendar' },
    { label: 'Mensajes', value: 'pi pi-envelope' },
    { label: 'Notificaciones', value: 'pi pi-bell' },
    { label: 'Búsqueda', value: 'pi pi-search' },
    { label: 'Ayuda', value: 'pi pi-question-circle' },
  ];

  // Computed properties
  get sortedModulos(): ModuloDto[] {
    return [...this.modulos].sort((a, b) => a.orden - b.orden);
  }

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
    this.loadModulos();
  }

  private initializeForm(): void {
    this.moduloForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: [''],
      icono: [''],
      orden: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      activo: [true],
    });
  }

  private async loadModulos(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService.getAllModulos().toPromise();

      if (response?.success && response.data) {
        this.modulos = response.data;
        this.applyFilters();
      } else {
        throw new Error('Error al cargar módulos');
      }
    } catch (error) {
      console.error('Error loading modulos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar la lista de módulos',
        key: 'top-right',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Filter methods
  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredModulos = this.modulos.filter((modulo) => {
      const matchesSearch =
        !this.searchFilters.search ||
        modulo.nombre
          .toLowerCase()
          .includes(this.searchFilters.search.toLowerCase()) ||
        modulo.descripcion
          ?.toLowerCase()
          .includes(this.searchFilters.search.toLowerCase());

      const matchesStatus =
        this.searchFilters.activo === undefined ||
        modulo.activo === this.searchFilters.activo;

      return matchesSearch && matchesStatus;
    });
  }

  clearFilters(): void {
    this.searchFilters = {
      search: '',
      activo: undefined,
    };
    this.applyFilters();
  }

  // Reorder methods
  enableReorderMode(): void {
    this.reorderMode = true;
    this.reorderList = [...this.sortedModulos];
  }

  cancelReorder(): void {
    this.reorderMode = false;
    this.reorderList = [];
    this.draggedIndex = null;
  }

  async saveOrder(): Promise<void> {
    this.isLoading = true;

    try {
      // Update order for each module
      const updatePromises = this.reorderList.map((modulo, index) => {
        const updateRequest: UpdateModuloRequest = {
          nombre: modulo.nombre,
          descripcion: modulo.descripcion || '',
          icono: modulo.icono,
          orden: index + 1,
          activo: modulo.activo,
        };
        return this.adminService
          .updateModulo(modulo.id, updateRequest)
          .toPromise();
      });

      await Promise.all(updatePromises);

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Orden de módulos actualizado exitosamente',
        key: 'top-right',
      });

      await this.loadModulos();
      this.reorderMode = false;
      this.reorderList = [];
    } catch (error) {
      console.error('Error saving module order:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar el orden de los módulos',
        key: 'top-right',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Drag and drop methods
  onDragStart(index: number): void {
    this.draggedIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      const draggedItem = this.reorderList[this.draggedIndex];
      this.reorderList.splice(this.draggedIndex, 1);
      this.reorderList.splice(dropIndex, 0, draggedItem);
    }

    this.draggedIndex = null;
  }

  moveUp(index: number): void {
    if (index > 0) {
      const item = this.reorderList[index];
      this.reorderList.splice(index, 1);
      this.reorderList.splice(index - 1, 0, item);
    }
  }

  moveDown(index: number): void {
    if (index < this.reorderList.length - 1) {
      const item = this.reorderList[index];
      this.reorderList.splice(index, 1);
      this.reorderList.splice(index + 1, 0, item);
    }
  }

  // Modal methods
  openCreateModal(): void {
    this.selectedModulo = null;

    // Find next available order number
    const maxOrder = Math.max(...this.modulos.map((m) => m.orden), 0);

    this.moduloForm.reset({
      nombre: '',
      descripcion: '',
      icono: '',
      orden: maxOrder + 1,
      activo: true,
    });
    this.showModal = true;
  }

  openEditModal(modulo: ModuloDto): void {
    this.selectedModulo = modulo;
    this.moduloForm.patchValue({
      nombre: modulo.nombre,
      descripcion: modulo.descripcion,
      icono: modulo.icono,
      orden: modulo.orden,
      activo: modulo.activo,
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedModulo = null;
    this.moduloForm.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.moduloForm.invalid) {
      this.moduloForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const formValue = this.moduloForm.value;

      if (this.selectedModulo) {
        // Update existing module
        const updateRequest: UpdateModuloRequest = {
          nombre: formValue.nombre,
          descripcion: formValue.descripcion || '',
          icono: formValue.icono || '',
          orden: formValue.orden,
          activo: formValue.activo,
        };

        const response = await this.adminService
          .updateModulo(this.selectedModulo.id, updateRequest)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Módulo actualizado exitosamente',
            key: 'top-right',
          });

          await this.loadModulos();
          this.closeModal();
        }
      } else {
        // Create new module
        const createRequest: CreateModuloRequest = {
          nombre: formValue.nombre,
          descripcion: formValue.descripcion || '',
          icono: formValue.icono || '',
          orden: formValue.orden,
          activo: formValue.activo,
        };

        const response = await this.adminService
          .createModulo(createRequest)
          .toPromise();

        if (response?.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Módulo creado exitosamente',
            key: 'top-right',
          });

          await this.loadModulos();
          this.closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving module:', error);

      let errorMessage = 'Error al guardar el módulo';

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

  // Details modal methods
  viewModuleDetails(modulo: ModuloDto): void {
    this.selectedModulo = modulo;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedModulo = null;
  }

  editFromDetails(): void {
    this.showDetailsModal = false;
    if (this.selectedModulo) {
      this.openEditModal(this.selectedModulo);
    }
  }

  manageModulePermissions(): void {
    if (this.selectedModulo) {
      this.router.navigate(['/admin/modulos-permisos'], {
        queryParams: { moduloId: this.selectedModulo.id },
      });
    }
  }

  // Utility methods for permissions
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

  // Helper method for emoji icons
  getIconEmojiForPermissionType(tipo: string): string {
    switch (tipo.toUpperCase()) {
      case 'READ':
        return '📖';
      case 'WRITE':
      case 'UPDATE':
      case 'CREATE':
        return '✏️';
      case 'DELETE':
        return '🗑️';
      case 'ADMIN':
        return '⚙️';
      case 'EXPORT':
        return '📥';
      default:
        return '🔑';
    }
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

  // Delete method
  confirmDelete(modulo: ModuloDto): void {
    if (!modulo.activo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: `El módulo "${modulo.nombre}" ya está inactivo`,
        key: 'top-right',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el módulo "${modulo.nombre}"? Esta acción también eliminará todos los permisos asociados.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteModulo(modulo),
    });
  }

  private async deleteModulo(modulo: ModuloDto): Promise<void> {
    this.isLoading = true;

    try {
      const response = await this.adminService
        .deleteModulo(modulo.id)
        .toPromise();

      if (response?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Módulo "${modulo.nombre}" eliminado exitosamente`,
          key: 'top-right',
        });

        await this.loadModulos();
      }
    } catch (error: any) {
      console.error('Error deleting module:', error);

      let errorMessage = 'Error al eliminar el módulo';

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
