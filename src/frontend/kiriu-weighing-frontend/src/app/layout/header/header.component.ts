import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionsService } from '../../core/services/permissions.service';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/auth.models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  @Input() showQueriesButton = true;
  @Input() showAdminButton = true; // Siempre visible, guards controlan acceso
  @Input() showLogoutButton = true;
  @Output() queriesClick = new EventEmitter<void>();
  @Output() adminClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();

  currentUser: UserInfo | null = null;

  constructor(
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener usuario actual
    this.currentUser = this.authService.getCurrentUser();
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
