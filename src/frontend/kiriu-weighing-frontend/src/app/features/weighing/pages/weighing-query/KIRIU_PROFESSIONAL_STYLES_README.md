# KIRIU Professional Styles - Guía de Uso

## Descripción

Este archivo contiene estilos profesionales y atractivos para los componentes de PrimeNG utilizados en el sistema Kiriu Weighing System. Los estilos están diseñados para ser reutilizables en todas las pantallas del sistema.

## Archivo Principal

- **Archivo**: `weighing-query-professional.styles.scss`
- **Ubicación**: `src/app/features/weighing/pages/weighing-query/`

## Cómo Usar en Otras Pantallas

### 1. Importar el Archivo CSS

En el archivo `.ts` de tu componente, agrega el archivo de estilos:

```typescript
@Component({
  selector: 'app-mi-componente',
  templateUrl: './mi-componente.component.html',
  styleUrls: [
    './mi-componente.component.scss',
    '../weighing-query/weighing-query-professional.styles.scss' // Ruta relativa
  ]
})
```

### 2. Aplicar las Clases CSS

#### Tarjetas (p-card)

```html
<p-card styleClass="kiriu-card">
  <!-- Contenido de la tarjeta -->
</p-card>
```

#### Campos de Entrada (p-inputtext)

```html
<div class="kiriu-input">
  <input pInputText type="text" placeholder="Ingrese texto" />
</div>
```

#### Selectores de Fecha (p-datepicker)

```html
<p-datepicker styleClass="kiriu-datepicker" placeholder="dd/mm/aaaa" [showIcon]="true"> </p-datepicker>
```

#### Dropdowns (p-select)

```html
<div class="kiriu-select">
  <p-select [options]="opciones" placeholder="Seleccione una opción"> </p-select>
</div>
```

#### Botones (p-button)

```html
<p-button label="Mi Botón" icon="pi pi-check" styleClass="kiriu-button"> </p-button>
```

#### Tablas (p-table)

```html
<p-table [value]="datos" styleClass="kiriu-table">
  <!-- Columnas de la tabla -->
</p-table>
```

#### Etiquetas (p-tag)

```html
<p-tag value="Mi Etiqueta" severity="success" styleClass="kiriu-tag"> </p-tag>
```

#### Modales (p-dialog)

```html
<p-dialog header="Mi Modal" styleClass="kiriu-dialog">
  <!-- Contenido del modal -->
</p-dialog>
```

#### Notificaciones (p-toast)

```html
<p-toast styleClass="kiriu-toast"></p-toast>
```

## Clases de Utilidad

### Layout y Espaciado

```html
<!-- Contenedor principal -->
<div class="kiriu-container">
  <!-- Contenido -->
</div>

<!-- Grid responsive -->
<div class="kiriu-grid kiriu-grid-3">
  <!-- 3 columnas en desktop, 1 en móvil -->
</div>

<!-- Flexbox -->
<div class="kiriu-flex kiriu-flex-between">
  <!-- Elementos con espacio entre ellos -->
</div>

<!-- Espaciado -->
<div class="kiriu-spacing-lg">
  <!-- Margen grande -->
</div>
```

### Texto

```html
<p class="kiriu-text-primary kiriu-text-bold">Texto principal en negrita</p>
<p class="kiriu-text-secondary">Texto secundario</p>
<p class="kiriu-text-center">Texto centrado</p>
```

### Fondos

```html
<div class="kiriu-bg-primary">Fondo blanco</div>
<div class="kiriu-bg-secondary">Fondo gris claro</div>
<div class="kiriu-bg-gradient">Fondo con gradiente</div>
```

### Estados Especiales

```html
<div class="kiriu-success">Mensaje de éxito</div>
<div class="kiriu-error">Mensaje de error</div>
<div class="kiriu-warning">Mensaje de advertencia</div>
<div class="kiriu-info">Mensaje informativo</div>
```

### Animaciones

```html
<div class="kiriu-animate-fade-in">Aparece con fade</div>
<div class="kiriu-animate-slide-in">Aparece deslizándose</div>
<div class="kiriu-animate-pulse">Efecto de pulso</div>
```

## Variables CSS Disponibles

El archivo incluye variables CSS personalizadas que puedes usar:

```scss
// Colores
--kiriu-primary: #2563eb;
--kiriu-success: #10b981;
--kiriu-warning: #f59e0b;
--kiriu-danger: #ef4444;

// Espaciado
--kiriu-spacing: 16px;
--kiriu-spacing-lg: 24px;

// Bordes redondeados
--kiriu-radius: 8px;
--kiriu-radius-lg: 12px;

// Sombras
--kiriu-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--kiriu-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

## Ejemplo Completo

```html
<div class="kiriu-container">
  <p-card styleClass="kiriu-card">
    <ng-template pTemplate="header">
      <h2>Mi Formulario</h2>
    </ng-template>

    <form class="kiriu-grid kiriu-grid-2">
      <div class="filter-group">
        <label class="kiriu-text-semibold">Nombre</label>
        <div class="kiriu-input">
          <input pInputText type="text" placeholder="Ingrese nombre" />
        </div>
      </div>

      <div class="filter-group">
        <label class="kiriu-text-semibold">Fecha</label>
        <p-datepicker styleClass="kiriu-datepicker" [showIcon]="true"></p-datepicker>
      </div>

      <div class="filter-group">
        <label class="kiriu-text-semibold">Estado</label>
        <div class="kiriu-select">
          <p-select [options]="estados" placeholder="Seleccione"></p-select>
        </div>
      </div>
    </form>

    <ng-template pTemplate="footer">
      <div class="kiriu-flex kiriu-flex-end">
        <p-button label="Cancelar" severity="secondary" styleClass="kiriu-button"></p-button>
        <p-button label="Guardar" severity="primary" styleClass="kiriu-button"></p-button>
      </div>
    </ng-template>
  </p-card>
</div>
```

## Responsive Design

Los estilos incluyen diseño responsive automático:

- **Desktop**: Layout completo con todas las columnas
- **Tablet**: Ajustes automáticos para pantallas medianas
- **Móvil**: Layout de una columna con botones apilados

## Personalización

Para personalizar los colores o estilos, modifica las variables CSS en la sección `:root` del archivo:

```scss
:root {
  --kiriu-primary: #tu-color-principal;
  --kiriu-success: #tu-color-exito;
  // ... otras variables
}
```

## Notas Importantes

1. **Orden de importación**: Importa siempre el archivo de estilos profesionales después de tus estilos locales
2. **Especificidad**: Los estilos usan `::ng-deep` para sobrescribir los estilos de PrimeNG
3. **Compatibilidad**: Funciona con todas las versiones de PrimeNG
4. **Performance**: Los estilos están optimizados para carga rápida

## Soporte

Para dudas o mejoras, contacta al equipo de desarrollo del sistema Kiriu Weighing System.

