import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionsService } from '../../core/services/permissions.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  @Input() showQueriesButton = true;
  @Input() showAdminButton = false;
  @Input() showLogoutButton = true;
  @Output() queriesClick = new EventEmitter<void>();
  @Output() adminClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();

  // Control automático basado en permisos
  hasAdminPermissions = false;

  constructor(private permissionsService: PermissionsService) {}

  ngOnInit(): void {
    // Verificar si tiene permisos para el área de administración
    this.hasAdminPermissions = this.permissionsService.hasPermission('USUARIOS.READ');
  }

  /**
   * Determina si debe mostrar el botón de administración
   * Combina el Input manual con la verificación automática de permisos
   */
  get shouldShowAdminButton(): boolean {
    return this.showAdminButton && this.hasAdminPermissions;
  }

  /**
   * Emite el evento de click en consultas
   */
  onQueriesClick(): void {
    this.queriesClick.emit();
  }

  /**
   * Emite el evento de click en administración
   */
  onAdminClick(): void {
    this.adminClick.emit();
  }

  /**
   * Emite el evento de click en logout
   */
  onLogoutClick(): void {
    this.logoutClick.emit();
  }
}
