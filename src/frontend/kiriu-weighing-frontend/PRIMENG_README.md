# PrimeNG Implementation - Sistema de Pesaje Kiriu

## Descripción

Este proyecto ha sido configurado con PrimeNG, una biblioteca de componentes de Angular que proporciona una amplia gama de controles de UI modernos y responsivos.

## Instalación Completada

✅ **PrimeNG** - Biblioteca principal de componentes
✅ **PrimeIcons** - Iconos vectoriales
✅ **Estilos** - Tema Lara Light Blue configurado
✅ **Módulos** - Configuración de módulos optimizada

## Archivos de Configuración

### 1. Estilos Globales (`src/styles.scss`)

```scss
// Importar estilos de PrimeNG
@import "primeng/resources/themes/lara-light-blue/theme.css";
@import "primeng/resources/primeng.css";
@import "primeicons/primeicons.css";
```

### 2. Módulo de Configuración (`src/app/prime-ng.config.ts`)

- Módulo principal `PrimeNGModule` con todos los componentes
- Exportaciones individuales para uso específico
- Configuración optimizada para standalone components

### 3. Componente de Demostración (`src/app/shared/components/prime-ng-demo/`)

- Ejemplos completos de uso de PrimeNG
- Formularios, tablas, botones, mensajes
- Estilos personalizados con tema Kiriu

## Componentes Disponibles

### Controles de Formulario

- **InputText** - Campos de texto
- **InputNumber** - Campos numéricos
- **Password** - Campos de contraseña
- **Checkbox** - Casillas de verificación
- **RadioButton** - Botones de opción
- **Rating** - Sistema de calificación
- **Slider** - Control deslizante

### Componentes de Layout

- **Card** - Tarjetas de contenido
- **Panel** - Paneles colapsables
- **Divider** - Separadores
- **Toolbar** - Barras de herramientas
- **Menu** - Menús de navegación
- **Breadcrumb** - Migas de pan

### Visualización de Datos

- **Table** - Tablas con paginación
- **ProgressBar** - Barras de progreso
- **ProgressSpinner** - Indicadores de carga
- **Tag** - Etiquetas de categoría

### Feedback y Mensajes

- **Message** - Mensajes informativos
- **Toast** - Notificaciones emergentes
- **ConfirmDialog** - Diálogos de confirmación
- **Dialog** - Ventanas modales
- **Tooltip** - Información contextual
- **BlockUI** - Bloqueo de interfaz

## Uso en Componentes

### Importar el Módulo

```typescript
import { Component } from "@angular/core";
import { PrimeNGModule } from "../prime-ng.config";

@Component({
  selector: "app-example",
  standalone: true,
  imports: [PrimeNGModule],
  templateUrl: "./example.component.html",
})
export class ExampleComponent {
  // Lógica del componente
}
```

### Usar Componentes

```html
<!-- Botón primario -->
<p-button label="Guardar" icon="pi pi-check" (onClick)="save()"></p-button>

<!-- Campo de texto -->
<p-inputText placeholder="Ingrese su nombre" [(ngModel)]="name"></p-inputText>

<!-- Tarjeta -->
<p-card header="Título" subheader="Subtítulo">
  <p>Contenido aquí</p>
</p-card>
```

## Personalización de Estilos

### Tema Kiriu

Los componentes están personalizados para mantener la identidad visual de Kiriu:

- Colores principales: `#398df1` (azul), `#1ee733` (verde), `#f70000` (rojo)
- Bordes redondeados: `8px` para botones, `12px` para tarjetas
- Sombras suaves y transiciones fluidas
- Diseño responsivo para móviles y tablets

### CSS Personalizado

```scss
:host ::ng-deep .p-button {
  &.p-button-primary {
    background-color: #398df1;
    border-color: #398df1;

    &:hover {
      background-color: #005bb5;
      transform: translateY(-1px);
    }
  }
}
```

## Mejores Prácticas

### 1. **Importar Solo lo Necesario**

```typescript
// En lugar de importar todo PrimeNGModule
import { ButtonModule, InputTextModule } from '../prime-ng.config';

@Component({
  imports: [ButtonModule, InputTextModule]
})
```

### 2. **Usar Standalone Components**

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, PrimeNGModule]
})
```

### 3. **Implementar Responsive Design**

```html
<p-table [responsiveLayout]="'scroll'" [scrollable]="true" scrollHeight="400px"></p-table>
```

### 4. **Validación de Formularios**

```typescript
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

this.form = this.fb.group({
  name: ["", [Validators.required, Validators.minLength(3)]],
  email: ["", [Validators.required, Validators.email]],
});
```

## Iconos Disponibles

PrimeNG incluye más de 200 iconos vectoriales:

```html
<!-- Iconos básicos -->
<p-button icon="pi pi-check"></p-button>
<p-button icon="pi pi-times"></p-button>
<p-button icon="pi pi-trash"></p-button>

<!-- Iconos con animación -->
<p-button icon="pi pi-spin pi-spinner"></p-button>
<p-button icon="pi pi-spin pi-cog"></p-button>
```

## Ejemplos Completos

### Formulario de Usuario

```html
<p-card header="Registro de Usuario">
  <div class="grid grid-2 gap-3">
    <div class="form-group">
      <label>Nombre:</label>
      <p-inputText [(ngModel)]="user.name" placeholder="Ingrese nombre"></p-inputText>
    </div>

    <div class="form-group">
      <label>Email:</label>
      <p-inputText [(ngModel)]="user.email" placeholder="Ingrese email"></p-inputText>
    </div>

    <div class="form-group">
      <label>Contraseña:</label>
      <p-password [(ngModel)]="user.password" [feedback]="false"></p-password>
    </div>

    <div class="form-group">
      <p-checkbox [(ngModel)]="user.accepted" label="Acepto términos"></p-checkbox>
    </div>
  </div>

  <div class="form-actions">
    <p-button label="Guardar" icon="pi pi-check" severity="success"></p-button>
    <p-button label="Cancelar" severity="secondary"></p-button>
  </div>
</p-card>
```

### Tabla de Datos

```html
<p-table [value]="products" [paginator]="true" [rows]="10">
  <ng-template pTemplate="header">
    <tr>
      <th>Código</th>
      <th>Nombre</th>
      <th>Precio</th>
      <th>Acciones</th>
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-product>
    <tr>
      <td>{{product.code}}</td>
      <td>{{product.name}}</td>
      <td>{{product.price | currency}}</td>
      <td>
        <p-button icon="pi pi-pencil" size="small"></p-button>
        <p-button icon="pi pi-trash" severity="danger" size="small"></p-button>
      </td>
    </tr>
  </ng-template>
</p-table>
```

## Troubleshooting

### Problemas Comunes

1. **Estilos no se aplican**

   - Verificar que los imports estén en `styles.scss`
   - Asegurar que `PrimeNGModule` esté importado

2. **Componentes no se renderizan**

   - Verificar que el módulo esté en `imports` del componente
   - Comprobar que no haya conflictos con Angular Material

3. **Responsive issues**
   - Usar `[responsiveLayout]="'scroll'"` en tablas
   - Implementar breakpoints CSS personalizados

### Logs y Debugging

```typescript
// Verificar que PrimeNG esté cargado
console.log("PrimeNG loaded:", typeof PrimeNGModule);

// Verificar estilos aplicados
console.log("Styles applied:", document.querySelector(".p-button"));
```

## Recursos Adicionales

- [Documentación Oficial PrimeNG](https://primeng.org/)
- [PrimeIcons](https://primeng.org/icons)
- [Temas Disponibles](https://primeng.org/themes)
- [Ejemplos de Código](https://primeng.org/showcase/)

## Soporte

Para problemas específicos de PrimeNG:

1. Revisar la documentación oficial
2. Verificar la consola del navegador
3. Comprobar versiones de Angular y PrimeNG
4. Consultar ejemplos en el componente de demostración

---

**Nota**: Este proyecto está configurado con PrimeNG v16+ y Angular 20+. Para actualizaciones, verificar compatibilidad en la documentación oficial.
