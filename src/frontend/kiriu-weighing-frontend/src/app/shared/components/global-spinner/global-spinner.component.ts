import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerService } from '../../../core/services/spinner.service';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="global-spinner-overlay" *ngIf="spinnerService.loading$ | async">
      <div class="global-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-text">Cargando...</div>
      </div>
    </div>
  `,
  styles: [],
})
export class GlobalSpinnerComponent {
  constructor(public spinnerService: SpinnerService) {}
}
