import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password } = this.loginForm.value;

      console.log('🔄 Iniciando login con backend real...', { email });

      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('✅ Login exitoso con backend real:', {
            user: response.user,
            token: response.token ? 'Token recibido' : 'Sin token',
            expiresAt: response.expiresAt,
          });
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('❌ Error en login con backend:', error);
          this.errorMessage =
            error.message || 'Error en el login. Verifique sus credenciales.';
          this.isLoading = false;
        },
        complete: () => {
          console.log('🏁 Login completado');
          this.isLoading = false;
        },
      });
    } else {
      console.log('⚠️ Formulario inválido o ya cargando');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName === 'email' ? 'Email' : 'Contraseña'} es requerido`;
      }
      if (field.errors['email']) {
        return 'Email debe tener un formato válido';
      }
      if (field.errors['minlength']) {
        return 'Contraseña debe tener al menos 6 caracteres';
      }
    }
    return '';
  }
}
