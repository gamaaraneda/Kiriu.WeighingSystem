# Directiva de Permisos - HasPermissionDirective

## Descripción
La directiva `*appHasPermission` permite controlar la visibilidad de elementos HTML basándose en los permisos del usuario autenticado.

## Configuración
La directiva lee los permisos desde el `localStorage` con la clave `kiriu-user` que se establece durante el login.

## Permisos Disponibles

### Módulo PESAJES
- `PESAJES.CREATE` - Crear nuevos registros de pesaje
- `PESAJES.READ` - Consultar pesajes existentes
- `PESAJES.UPDATE` - Editar datos de pesaje
- `PESAJES.DELETE` - Cancelar pesajes
- `PESAJES.APPROVE` - Aprobar pesajes críticos
- `PESAJES.EXPORT` - Exportar datos de pesajes

### Módulo REPORTES
- `REPORTES.READ` - Ver reportes del sistema
- `REPORTES.EXPORT` - Exportar reportes a Excel
- `REPORTES.PRINT` - Imprimir tickets y reportes

### Módulo CATALOGOS
- `CATALOGOS.CREATE` - Crear vehículos y clientes
- `CATALOGOS.READ` - Ver catálogos del sistema
- `CATALOGOS.UPDATE` - Editar catálogos
- `CATALOGOS.DELETE` - Eliminar de catálogos
- `CATALOGOS.EXPORT` - Exportar catálogos a Excel

### Módulo USUARIOS
- `USUARIOS.CREATE` - Crear nuevos usuarios
- `USUARIOS.READ` - Ver listado de usuarios
- `USUARIOS.UPDATE` - Editar usuarios existentes
- `USUARIOS.DELETE` - Eliminar usuarios
- `USUARIOS.EXPORT` - Exportar listado de usuarios

### Módulo BASCULA
- `BASCULA.READ` - Ver estado de básculas
- `BASCULA.CREATE` - Registrar nuevas básculas
- `BASCULA.UPDATE` - Actualizar configuración de básculas
- `BASCULA.DELETE` - Dar de baja básculas
- `BASCULA.CALIBRATE` - Calibrar básculas
- `BASCULA.EXPORT` - Exportar datos de básculas

### Módulo CONFIGURACION
- `CONFIGURACION.READ` - Ver configuraciones
- `CONFIGURACION.CREATE` - Crear nuevas configuraciones
- `CONFIGURACION.UPDATE` - Modificar configuraciones
- `CONFIGURACION.DELETE` - Eliminar configuraciones obsoletas

## Ejemplos de Uso

### Uso Básico
```html
<!-- Botón solo visible para usuarios con permiso de exportar reportes -->
<button *appHasPermission="'REPORTES.EXPORT'">
  Exportar Excel
</button>

<!-- Botón solo visible para usuarios con permiso de crear pesajes -->
<p-button 
  *appHasPermission="'PESAJES.CREATE'"
  label="Nuevo Pesaje"
  (click)="createWeighing()">
</p-button>
```

### Uso con Arrays de Permisos (OR Logic)
```html
<!-- Visible si el usuario tiene cualquiera de estos permisos -->
<div *appHasPermission="['REPORTES.READ', 'REPORTES.EXPORT']">
  <h3>Sección de Reportes</h3>
  <p>Contenido visible para usuarios con permisos de lectura o exportación</p>
</div>
```

### Uso con Arrays de Permisos (AND Logic)
```html
<!-- Visible solo si el usuario tiene TODOS los permisos -->
<div *appHasPermission="['USUARIOS.READ', 'USUARIOS.UPDATE']" 
     appHasPermissionRequireAll="true">
  <h3>Administración Avanzada</h3>
  <p>Solo visible para usuarios con permisos de lectura Y actualización</p>
</div>
```

### Ejemplos Prácticos por Módulo

#### Módulo Pesajes
```html
<!-- Botones de acciones CRUD para pesajes -->
<div class="actions">
  <p-button *appHasPermission="'PESAJES.CREATE'" 
            label="Nuevo Pesaje" (click)="create()"></p-button>
  
  <p-button *appHasPermission="'PESAJES.UPDATE'" 
            label="Editar" (click)="edit()"></p-button>
  
  <p-button *appHasPermission="'PESAJES.DELETE'" 
            label="Cancelar" severity="danger" (click)="cancel()"></p-button>
  
  <p-button *appHasPermission="'PESAJES.APPROVE'" 
            label="Aprobar" severity="success" (click)="approve()"></p-button>
</div>
```

#### Módulo Reportes
```html
<!-- Sección de reportes con diferentes niveles de acceso -->
<p-card>
  <div *appHasPermission="'REPORTES.READ'">
    <p-table [value]="reportes">
      <!-- Contenido de la tabla -->
    </p-table>
  </div>
  
  <div class="report-actions">
    <p-button *appHasPermission="'REPORTES.EXPORT'" 
              label="Exportar Excel" icon="pi pi-file-excel"></p-button>
    
    <p-button *appHasPermission="'REPORTES.PRINT'" 
              label="Imprimir" icon="pi pi-print"></p-button>
  </div>
</p-card>
```

#### Módulo Configuración
```html
<!-- Configuración del sistema con permisos granulares -->
<div class="config-section">
  <div *appHasPermission="'CONFIGURACION.READ'">
    <h3>Configuraciones Actuales</h3>
    <!-- Mostrar configuraciones -->
  </div>
  
  <div class="config-actions">
    <p-button *appHasPermission="'CONFIGURACION.CREATE'" 
              label="Agregar Config"></p-button>
    
    <p-button *appHasPermission="'CONFIGURACION.UPDATE'" 
              label="Modificar" severity="secondary"></p-button>
    
    <p-button *appHasPermission="'CONFIGURACION.DELETE'" 
              label="Eliminar" severity="danger"></p-button>
  </div>
</div>
```

### Casos de Uso Avanzados

#### Menú Dinámico
```html
<p-menu [model]="menuItems">
  <ng-template pTemplate="item" let-item>
    <div *appHasPermission="item.permission">
      <i [class]="item.icon"></i>
      <span>{{ item.label }}</span>
    </div>
  </ng-template>
</p-menu>
```

#### Tabs Condicionales
```html
<p-tabView>
  <p-tabPanel *appHasPermission="'PESAJES.READ'" 
              header="Pesajes" leftIcon="pi pi-scale">
    <!-- Contenido del tab de pesajes -->
  </p-tabPanel>
  
  <p-tabPanel *appHasPermission="'REPORTES.READ'" 
              header="Reportes" leftIcon="pi pi-chart-bar">
    <!-- Contenido del tab de reportes -->
  </p-tabPanel>
  
  <p-tabPanel *appHasPermission="['USUARIOS.READ', 'USUARIOS.UPDATE']" 
              appHasPermissionRequireAll="true"
              header="Administración" leftIcon="pi pi-users">
    <!-- Contenido del tab de administración -->
  </p-tabPanel>
</p-tabView>
```

## Características

- **Reactividad**: Se actualiza automáticamente cuando cambian los permisos en localStorage
- **Flexibilidad**: Soporta permisos individuales y arrays
- **Lógica AND/OR**: Control granular con `appHasPermissionRequireAll`
- **Rendimiento**: Directiva standalone que se puede importar solo donde se necesita
- **Standalone**: Compatible con arquitectura standalone de Angular

## Notas Importantes

1. La directiva elimina completamente el elemento del DOM cuando no hay permisos
2. Los cambios en localStorage se reflejan automáticamente en la UI
3. Si no se encuentran permisos en localStorage, todos los elementos se ocultan
4. Los permisos son case-sensitive: usar exactamente como están definidos
5. Para múltiples permisos, por defecto usa lógica OR (cualquier permiso válido)