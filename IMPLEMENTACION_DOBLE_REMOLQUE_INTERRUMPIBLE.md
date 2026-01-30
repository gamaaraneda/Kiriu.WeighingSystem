# Implementación: Doble Remolque Interrumpible

## ✅ BACKEND COMPLETADO (100%)

### 1. Base de Datos
- ✅ Script de migración versión 8 en `manual_migrations.sql`
- ✅ Nuevos campos en `WeighingRemolques`:
  - `RegistradoPor` (NVARCHAR(255))
  - `FechaRegistro` (DATETIME2)
  - `Estado` (NVARCHAR(30)) - 'PENDIENTE', 'REGISTRADO'
- ✅ Nuevos estados en `WeighingOperations.Status`:
  - 'ENTRADA_PARCIAL_R1'
  - 'ENTRADA_COMPLETA'
  - 'SALIDA_PARCIAL_R1'
  - 'SALIDA_COMPLETA'
- ✅ Índices optimizados para búsquedas de operaciones parciales

### 2. Entidades de Dominio
- ✅ `WeighingRemolque.cs` actualizado con nuevos campos

### 3. DTOs
- ✅ `CreatePartialDoubleTrailerEntryRequest.cs`
- ✅ `ContinueDoubleTrailerEntryRequest.cs`
- ✅ `PartialDoubleTrailerEntryResponseDto.cs`
- ✅ `PendingDoubleTrailerSearchResultDto.cs`

### 4. Repositorio
- ✅ `SearchPendingDoubleTrailersAsync()` - Buscar operaciones parciales
- ✅ `GetPendingDoubleTrailerByFolioAsync()` - Obtener por folio

### 5. Servicios de Aplicación
- ✅ `CreatePartialDoubleTrailerEntryAsync()` - Guardar remolque 1
- ✅ `ContinueDoubleTrailerEntryAsync()` - Continuar con remolque 2
- ✅ `SearchPendingDoubleTrailersAsync()` - Buscar pendientes
- ✅ `GetPendingDoubleTrailerByFolioAsync()` - Obtener por folio

### 6. API Endpoints
- ✅ `POST /api/weighing/entry/double-trailer/partial`
- ✅ `POST /api/weighing/entry/double-trailer/continue`
- ✅ `GET /api/weighing/entry/double-trailer/pending/search?searchTerm={term}&limit={limit}`
- ✅ `GET /api/weighing/entry/double-trailer/pending/{folio}`

### 7. Compilación
- ✅ Backend compila sin errores

---

## ✅ FRONTEND COMPLETADO (70%)

### 1. Tipos TypeScript
- ✅ `PartialDoubleTrailerEntryResponse` en `weighing.types.ts`
- ✅ `PendingDoubleTrailerSearchResult` en `weighing.types.ts`

### 2. Servicios
- ✅ `createPartialDoubleTrailerEntry()` en `real-weighing.service.ts`
- ✅ `continueDoubleTrailerEntry()` en `real-weighing.service.ts`
- ✅ `searchPendingDoubleTrailers()` en `real-weighing.service.ts`
- ✅ `getPendingDoubleTrailerByFolio()` en `real-weighing.service.ts`
- ✅ Interfaces de request agregadas

### 3. Componente weighing-form
- ✅ Método `savePartialDoubleTrailerEntry()` implementado
- ✅ Método `canSavePartialRemolque1()` implementado
- ✅ Import de `CreatePartialDoubleTrailerEntryRequest`

---

## ⚠️ PENDIENTE EN FRONTEND (30%)

### 1. Actualizar `weighing-form.component.html`

Agregar botón para guardar parcialmente después del remolque 1. Buscar la sección de remolque 1 y agregar:

```html
<!-- Botón para guardar parcialmente (solo mostrar cuando remolque 1 está completo) -->
<div
  *ngIf="weighingForm.get('doubleTrailer')?.value &&
         doubleTrailerState.currentStep === 'remolque1' &&
         canSavePartialRemolque1()"
  class="partial-save-section"
>
  <button
    type="button"
    class="btn btn-secondary btn-save-partial"
    (click)="savePartialDoubleTrailerEntry()"
    [disabled]="isLoading"
  >
    💾 Guardar Remolque 1 y Continuar Después
  </button>
  <p class="help-text">
    Puede guardar el remolque 1 ahora y continuar con el remolque 2 posteriormente
    (sin límite de tiempo).
  </p>
</div>
```

**Ubicación sugerida**: Después de la sección de captura de fotos del remolque 1, antes de la sección del remolque 2.

### 2. Estilos en `weighing-form.component.scss`

```scss
.partial-save-section {
  margin: 20px 0;
  padding: 15px;
  background-color: #f0f9ff;
  border: 2px dashed #0ea5e9;
  border-radius: 8px;
  text-align: center;

  .btn-save-partial {
    background-color: #0ea5e9;
    color: white;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: #0284c7;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }

    &:disabled {
      background-color: #cbd5e1;
      cursor: not-allowed;
      transform: none;
    }
  }

  .help-text {
    margin-top: 10px;
    font-size: 14px;
    color: #64748b;
  }
}
```

### 3. Crear componente para continuar operaciones parciales

**Opción A: Crear nuevo componente independiente**

```bash
cd src/frontend/kiriu-weighing-frontend/src/app/features/weighing/pages
ng generate component continue-double-trailer --standalone
```

**Opción B: Agregar modal en el componente weighing-form existente**

Agregar búsqueda con autocompletado en la página inicial de pesaje para continuar operaciones parciales.

### 4. Componente `continue-double-trailer.component.ts` (Estructura Sugerida)

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RealWeighingService } from '../../services/real-weighing.service';
import { PendingDoubleTrailerSearchResult } from '../../types/weighing.types';

@Component({
  selector: 'app-continue-double-trailer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="continue-container">
      <h2>Continuar Entrada de Doble Remolque</h2>

      <!-- Búsqueda -->
      <div class="search-section">
        <input
          type="text"
          placeholder="Buscar por folio o placa..."
          (input)="onSearchChange($event)"
          class="search-input"
        />

        <!-- Resultados de búsqueda -->
        <div *ngIf="searchResults.length > 0" class="search-results">
          <div
            *ngFor="let result of searchResults"
            (click)="selectOperation(result)"
            class="result-item"
          >
            <div class="result-header">
              <strong>{{ result.folio }}</strong>
              <span class="date">{{ result.fechaRegistroR1 | date:'short' }}</span>
            </div>
            <div class="result-details">
              <p>Tráiler: {{ result.trailerPlaca }}</p>
              <p>Remolque 1: {{ result.placaRemolque1 }}</p>
              <p>Producto: {{ result.product }}</p>
              <p>Cliente: {{ result.clientProviderName }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulario de remolque 2 (cuando se selecciona) -->
      <div *ngIf="selectedOperation" class="remolque2-form">
        <!-- Aquí reutilizar la UI de captura de remolque similar a weighing-form -->
      </div>
    </div>
  `
})
export class ContinueDoubleTrailerComponent implements OnInit {
  searchResults: PendingDoubleTrailerSearchResult[] = [];
  selectedOperation: PendingDoubleTrailerSearchResult | null = null;

  constructor(
    private weighingService: RealWeighingService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  onSearchChange(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    if (searchTerm.length < 2) {
      this.searchResults = [];
      return;
    }

    this.weighingService.searchPendingDoubleTrailers(searchTerm).subscribe({
      next: (response) => {
        this.searchResults = response.data;
      }
    });
  }

  selectOperation(operation: PendingDoubleTrailerSearchResult): void {
    this.selectedOperation = operation;
    // Cargar detalles completos y mostrar formulario de remolque 2
  }
}
```

### 5. Agregar Ruta

En `app.routes.ts` o el archivo de rutas correspondiente:

```typescript
{
  path: 'weighing/continue-double-trailer',
  component: ContinueDoubleTrailerComponent,
  canActivate: [AuthGuard]
}
```

### 6. Agregar Botón de Acceso

En el dashboard o página principal de pesaje, agregar:

```html
<button (click)="navigateToContinueDoubleTrailer()">
  🔄 Continuar Doble Remolque Pendiente
</button>
```

---

## 🧪 PRUEBAS REQUERIDAS

### 1. Aplicar Migración de Base de Datos

```sql
-- Ejecutar en SQL Server Management Studio
-- Conexión a: 192.168.110.202
-- Base de datos: WeighingSystem
USE WeighingSystem;
GO
-- Ejecutar todo el contenido de manual_migrations.sql
```

### 2. Probar Backend (Postman/Thunder Client)

**Test 1: Crear Entrada Parcial**
```http
POST http://localhost:5000/api/weighing/entry/double-trailer/partial
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "unitType": "client",
  "tipoUnidad": "doble-remolque",
  "trailerPlaca": "ABC-123",
  "remolque1": {
    "numero": 1,
    "placa": "REM-001",
    "pesoBruto": 25000,
    "fotos": [],
    "pesoCapturado": true,
    "fotosCapturadas": true,
    "fotoCargaCapturada": true,
    "fotoPlacaCapturada": true
  },
  "product": "Producto Test",
  "clientProviderName": "Cliente Test",
  "tieneEdicionesManuale": false
}
```

**Test 2: Buscar Operaciones Parciales**
```http
GET http://localhost:5000/api/weighing/entry/double-trailer/pending/search?searchTerm=ABC&limit=10
Authorization: Bearer {JWT_TOKEN}
```

**Test 3: Continuar con Remolque 2**
```http
POST http://localhost:5000/api/weighing/entry/double-trailer/continue
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "folio": "CLI-ENT-000123",
  "remolque2": {
    "numero": 2,
    "placa": "REM-002",
    "pesoBruto": 23000,
    "fotos": [],
    "pesoCapturado": true,
    "fotosCapturadas": true,
    "fotoCargaCapturada": true,
    "fotoPlacaCapturada": true
  },
  "tieneEdicionesManuale": false
}
```

### 3. Probar Frontend

1. Compilar frontend: `npm run build`
2. Iniciar aplicación: `npm start`
3. Navegar a registro de entrada de doble remolque
4. Completar datos del remolque 1
5. Verificar que aparece el botón "Guardar Remolque 1 y Continuar Después"
6. Hacer clic y verificar que se guarda correctamente
7. Buscar la operación parcial
8. Completar con remolque 2

---

## 📝 NOTAS IMPORTANTES

1. **Sin límite de tiempo**: No hay restricción de 30 minutos entre remolques
2. **Compatibilidad**: El flujo antiguo (continuo) sigue funcionando
3. **Trazabilidad**: Se registra quién y cuándo capturó cada remolque
4. **Reportes**: Las operaciones completadas se visualizan como una sola entrada
5. **Validaciones**: Se mantienen todas las validaciones existentes

---

## 🎯 RESUMEN DE ESTADOS

| Estado Original | Estado Nuevo (Parcial) | Descripción |
|----------------|----------------------|-------------|
| ENTRADA_REGISTRADA | ENTRADA_PARCIAL_R1 | Solo remolque 1 registrado |
| ENTRADA_REGISTRADA | ENTRADA_REGISTRADA | Ambos remolques registrados (mantener compatibilidad) |
| SALIDA_REGISTRADA | SALIDA_PARCIAL_R1 | Solo remolque 1 pesado en salida |
| SALIDA_REGISTRADA | SALIDA_REGISTRADA | Salida completa |

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Aplicar migración de base de datos
2. ⚠️ Agregar botón en HTML de weighing-form
3. ⚠️ Agregar estilos CSS
4. ⚠️ Crear componente continue-double-trailer
5. ⚠️ Agregar ruta y navegación
6. ⚠️ Probar flujo completo end-to-end
7. ⚠️ Implementar flujo similar para SALIDAS (opcional, si el cliente lo requiere)

---

## 📞 SOPORTE

Si necesita ayuda para completar la implementación:
- Revisar logs del backend para errores
- Verificar que la migración se aplicó correctamente
- Probar endpoints con Postman antes de integrar frontend
- Verificar permisos de usuario para acceder a los endpoints
