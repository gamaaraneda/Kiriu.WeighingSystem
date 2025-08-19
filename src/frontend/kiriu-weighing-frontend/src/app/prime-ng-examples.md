# PrimeNG Components - Ejemplos de Uso

## Instalación y Configuración

PrimeNG ya está instalado y configurado en el proyecto. Los estilos están importados en `styles.scss` y el módulo está disponible en `prime-ng.config.ts`.

## Uso en Componentes

### 1. Importar el Módulo

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
  // Component logic here
}
```

### 2. Botones (Button)

```html
<!-- Botón primario -->
<p-button label="Guardar" icon="pi pi-check" (onClick)="save()"></p-button>

<!-- Botón secundario -->
<p-button label="Cancelar" severity="secondary" icon="pi pi-times"></p-button>

<!-- Botón de éxito -->
<p-button label="Confirmar" severity="success" icon="pi pi-check"></p-button>

<!-- Botón de peligro -->
<p-button label="Eliminar" severity="danger" icon="pi pi-trash"></p-button>

<!-- Botón con loading -->
<p-button label="Procesando" [loading]="isLoading" icon="pi pi-spin pi-spinner"></p-button>
```

### 3. Campos de Entrada (Input)

```html
<!-- Campo de texto básico -->
<p-inputText placeholder="Ingrese su nombre" [(ngModel)]="name"></p-inputText>

<!-- Campo numérico -->
<p-inputNumber placeholder="Peso en kg" [(ngModel)]="weight" [minFractionDigits]="2" [maxFractionDigits]="2"></p-inputNumber>

<!-- Campo de contraseña -->
<p-password placeholder="Contraseña" [(ngModel)]="password" [toggleMask]="true" [feedback]="false"></p-password>

<!-- Campo de texto multilínea -->
<textarea pInputTextarea [(ngModel)]="description" rows="3" cols="30"></textarea>
```

### 4. Checkboxes y Radio Buttons

```html
<!-- Checkbox -->
<p-checkbox [(ngModel)]="accepted" [binary]="true" label="Acepto los términos y condiciones"></p-checkbox>

<!-- Radio Button -->
<p-radioButton name="gender" value="male" [(ngModel)]="gender" label="Masculino"></p-radioButton>
<p-radioButton name="gender" value="female" [(ngModel)]="gender" label="Femenino"></p-radioButton>
```

### 5. Slider y Rating

```html
<!-- Slider -->
<p-slider [(ngModel)]="value" [min]="0" [max]="100" [step]="5" [showButtons]="true"></p-slider>

<!-- Rating -->
<p-rating [(ngModel)]="rating" [stars]="5" [cancel]="false"></p-rating>
```

### 6. Tarjetas (Card)

```html
<p-card header="Título de la Tarjeta" subheader="Subtítulo">
  <p>Contenido de la tarjeta aquí.</p>
  <ng-template pTemplate="footer">
    <p-button label="Acción" icon="pi pi-check"></p-button>
  </ng-template>
</p-card>
```

### 7. Paneles (Panel)

```html
<p-panel header="Título del Panel" [toggleable]="true">
  <p>Contenido del panel aquí.</p>
</p-panel>
```

### 8. Tablas (Table)

```html
<p-table [value]="products" [paginator]="true" [rows]="10" [showCurrentPageReport]="true" responsiveLayout="scroll" currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} productos" [rowsPerPageOptions]="[10,25,50]">
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
        <p-button icon="pi pi-pencil" severity="secondary" size="small"></p-button>
        <p-button icon="pi pi-trash" severity="danger" size="small"></p-button>
      </td>
    </tr>
  </ng-template>
</p-table>
```

### 9. Mensajes y Notificaciones

```html
<!-- Mensaje de información -->
<p-message severity="info" text="Esta es una información importante"></p-message>

<!-- Mensaje de éxito -->
<p-message severity="success" text="Operación completada exitosamente"></p-message>

<!-- Mensaje de advertencia -->
<p-message severity="warn" text="Por favor revise los datos ingresados"></p-message>

<!-- Mensaje de error -->
<p-message severity="error" text="Ha ocurrido un error"></p-message>
```

### 10. Diálogos de Confirmación

```html
<p-confirmDialog></p-confirmDialog>

<p-button label="Eliminar" icon="pi pi-trash" (onClick)="confirmDelete()" severity="danger"></p-button>
```

```typescript
import { ConfirmationService } from 'primeng/api';

constructor(private confirmationService: ConfirmationService) {}

confirmDelete() {
  this.confirmationService.confirm({
    message: '¿Está seguro de que desea eliminar este elemento?',
    header: 'Confirmar Eliminación',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      // Lógica para eliminar
    }
  });
}
```

### 11. Tooltips

```html
<p-button label="Hover me" pTooltip="Este es un tooltip" tooltipPosition="top"></p-button>
```

### 12. Loading y Bloqueo

```html
<p-blockUI [blocked]="isLoading" [target]="blockedPanel">
  <p-progressSpinner></p-progressSpinner>
</p-blockUI>

<div #blockedPanel>
  <!-- Contenido que se puede bloquear -->
</div>
```

## Estilos Personalizados

Los componentes de PrimeNG se pueden personalizar usando CSS:

```scss
// Personalizar botones
:host ::ng-deep .p-button {
  &.p-button-primary {
    background-color: #398df1;
    border-color: #398df1;

    &:hover {
      background-color: #005bb5;
      border-color: #005bb5;
    }
  }
}

// Personalizar campos de entrada
:host ::ng-deep .p-inputtext {
  border-radius: 8px;
  border: 2px solid transparent;

  &:focus {
    border-color: #398df1;
    box-shadow: 0 0 0 3px rgba(57, 141, 241, 0.1);
  }
}

// Personalizar tarjetas
:host ::ng-deep .p-card {
  border: 1px solid #398df1;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}
```

## Iconos Disponibles

PrimeNG incluye iconos de PrimeIcons. Algunos ejemplos:

- `pi pi-check` - Checkmark
- `pi pi-times` - X (cerrar)
- `pi pi-trash` - Basura
- `pi pi-pencil` - Lápiz
- `pi pi-search` - Lupa
- `pi pi-user` - Usuario
- `pi pi-home` - Casa
- `pi pi-cog` - Configuración
- `pi pi-spin pi-spinner` - Spinner girando

## Mejores Prácticas

1. **Importar solo los módulos necesarios** para reducir el tamaño del bundle
2. **Usar standalone components** cuando sea posible
3. **Personalizar estilos** para mantener consistencia con el diseño de la aplicación
4. **Implementar responsive design** usando las propiedades de PrimeNG
5. **Usar tooltips** para mejorar la experiencia del usuario
6. **Implementar loading states** para operaciones asíncronas
7. **Validar formularios** usando Angular Reactive Forms con PrimeNG
