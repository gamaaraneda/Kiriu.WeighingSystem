import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-card">
        <div class="icon">🚫</div>
        <h1>Acceso No Autorizado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
        <button class="btn" (click)="goBack()">Volver</button>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f8f9fa;
      padding: 16px;
    }
    
    .unauthorized-card {
      background: #ffffff;
      border: 1px solid #398df1;
      border-radius: 12px;
      padding: 48px;
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    
    h1 {
      color: #398df1;
      margin-bottom: 16px;
    }
    
    p {
      color: #545454;
      margin-bottom: 32px;
    }
    
    .btn {
      background-color: #398df1;
      color: #ffffff;
      border: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn:hover {
      background-color: #005bb5;
      transform: translateY(-1px);
    }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
} 