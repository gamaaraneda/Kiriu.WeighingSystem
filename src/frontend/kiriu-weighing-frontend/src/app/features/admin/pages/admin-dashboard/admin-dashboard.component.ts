import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

// Shared Components
import { HeaderComponent } from '../../../../layout/header/header.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';

// Services and Types
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuarioDto, RolDto, PermisoDto, ModuloDto, AdminStatsDto } from '../../types/admin.types';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    TableModule,
    ToastModule,
    HeaderComponent,
    BreadcrumbComponent
  ],
  providers: [MessageService],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStatsDto | null = null;
  recentUsers: UsuarioDto[] = [];
  isLoading = false;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private messageService: MessageService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load stats
      await this.loadStats();
      
      // Load recent users
      await this.loadRecentUsers();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar los datos del dashboard',
        key: 'top-right'
      });
    } finally {
      this.isLoading = false;
    }
  }

  private async loadStats(): Promise<void> {
    try {
      // Load all data to calculate stats
      const [usuariosResponse, rolesResponse, permisosResponse, modulosResponse] = await Promise.all([
        this.adminService.getAllUsuarios().toPromise(),
        this.adminService.getAllRoles().toPromise(),
        this.adminService.getAllPermisos().toPromise(),
        this.adminService.getAllModulos().toPromise()
      ]);

      if (usuariosResponse?.success && rolesResponse?.success && 
          permisosResponse?.success && modulosResponse?.success) {
        
        const usuarios = usuariosResponse.data || [];
        const roles = rolesResponse.data || [];
        const permisos = permisosResponse.data || [];
        const modulos = modulosResponse.data || [];

        this.stats = {
          totalUsuarios: usuarios.length,
          usuariosActivos: usuarios.filter(u => u.activo).length,
          totalRoles: roles.length,
          totalPermisos: permisos.length,
          totalModulos: modulos.length
        };
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  private async loadRecentUsers(): Promise<void> {
    try {
      const response = await this.adminService.getAllUsuarios().toPromise();
      
      if (response?.success && response.data) {
        // Sort by creation date and take the most recent 5
        this.recentUsers = response.data
          .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
          .slice(0, 5);
      }
    } catch (error) {
      console.error('Error loading recent users:', error);
    }
  }

  // Navigation methods
  navigateToUsuarios(): void {
    this.router.navigate(['/admin/usuarios']);
  }

  navigateToRoles(): void {
    this.router.navigate(['/admin/roles']);
  }

  navigateToPermisos(): void {
    this.router.navigate(['/admin/permisos']);
  }

  navigateToModulos(): void {
    this.router.navigate(['/admin/modulos']);
  }

  navigateToRolesPermisos(): void {
    this.router.navigate(['/admin/roles-permisos']);
  }

  // Header handlers
  onQueries(): void {
    this.router.navigate(['/weighing-query']);
  }

  onAdmin(): void {
    // Ya estamos en admin, no hacer nada
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
    this.router.navigate(['/dashboard']);
  }
}