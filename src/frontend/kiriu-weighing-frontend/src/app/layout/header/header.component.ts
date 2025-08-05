import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() showQueriesButton = true;
  @Input() showLogoutButton = true;
  @Output() queriesClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();

  /**
   * Emite el evento de click en consultas
   */
  onQueriesClick(): void {
    this.queriesClick.emit();
  }

  /**
   * Emite el evento de click en logout
   */
  onLogoutClick(): void {
    this.logoutClick.emit();
  }
}
