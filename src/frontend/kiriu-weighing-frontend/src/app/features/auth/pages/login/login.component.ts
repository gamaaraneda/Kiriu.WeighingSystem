import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  /** Mensaje informativo cuando la sesión fue invalidada */
  sessionMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // Verificar si se redirigió por sesión invalidada
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        const reason = params['reason'];
        
        if (reason === 'session_invalidated') {
          this.sessionMessage = 'Su sesión fue cerrada porque se inició sesión en otro dispositivo.';
        } else {
          this.sessionMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
        }

        // Limpiar los query params de la URL después de mostrar el mensaje
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });

        console.log('ℹ️ LoginComponent: Sesión invalidada detectada', { reason, message: this.sessionMessage });
      }
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
        error: (error: Error & { code?: string }) => {
          console.error('❌ Error en login con backend:', error);
          
          // Verificar si es error de sesión activa existente
          if (error.code === 'ACTIVE_SESSION_EXISTS') {
            // Mostrar mensaje informativo (fondo amarillo) en lugar de error
            this.sessionMessage = error.message || 'Ya existe una sesión activa para este usuario en otro dispositivo.';
            this.errorMessage = ''; // Limpiar error general
          } else {
            // Error general de login
            this.errorMessage = error.message || 'Error en el login. Verifique sus credenciales.';
            this.sessionMessage = ''; // Limpiar mensaje de sesión
          }
          
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
