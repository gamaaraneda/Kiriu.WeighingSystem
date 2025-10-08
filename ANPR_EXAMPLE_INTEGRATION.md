# Ejemplo de Integración ANPR en Pantalla de Entrada

## Código para weighing-form.component.ts

Agregar este código al componente existente:

```typescript
import { AnprCaptureComponent } from '../../components/anpr-capture/anpr-capture.component';
import { AnprEvent } from '../../services/anpr.service';

@Component({
  selector: 'app-weighing-form',
  standalone: true,
  imports: [
    // ... imports existentes
    AnprCaptureComponent  // AGREGAR ESTA LÍNEA
  ],
  // ... resto de la configuración
})
export class WeighingFormComponent {
  // ... código existente

  /**
   * Maneja la captura exitosa de placa mediante ANPR
   * @param event Evento ANPR con datos de la placa capturada
   * @param fieldName Nombre del campo del formulario a actualizar
   */
  onAnprPlateCaptured(event: AnprEvent, fieldName: string): void {
    // 1. Actualizar el campo de placa en el formulario
    this.weighingForm.patchValue({
      [fieldName]: event.licensePlate
    });

    // 2. Guardar la URL de la imagen de la placa
    // Nota: Asegúrate de que photoData tenga una propiedad para la placa
    if (!this.photoData[fieldName]) {
      this.photoData[fieldName] = {};
    }
    this.photoData[fieldName] = event.imageUrl;

    // 3. Mostrar mensaje de éxito (opcional, el componente ya lo hace)
    console.log('✅ Placa capturada exitosamente:', {
      placa: event.licensePlate,
      confianza: `${event.confidenceLevel}%`,
      marca: event.vehicleBrand,
      color: event.vehicleColor,
      imagen: event.imageUrl,
      campo: fieldName
    });

    // 4. Opcional: Deshabilitar edición manual si la confianza es alta
    if (event.confidenceLevel >= 85) {
      // Alta confianza, bloquear edición manual
      this.manualEditEnabled[fieldName] = false;
    }
  }

  /**
   * Maneja errores de captura ANPR
   * @param error Error ocurrido durante la captura
   */
  onAnprCaptureFailed(error: Error): void {
    console.error('❌ Error capturando placa ANPR:', error);

    // El componente ya muestra un mensaje de error al usuario,
    // pero aquí puedes agregar lógica adicional si es necesario:

    // Por ejemplo, registrar el error en analytics
    // this.analyticsService.trackError('anpr_capture_failed', error);

    // O mostrar un mensaje personalizado
    // this.messageService.add({
    //   severity: 'warn',
    //   summary: 'Captura no exitosa',
    //   detail: 'Puedes capturar manualmente la foto o ingresar la placa'
    // });
  }
}
```

## Código HTML para insertar en weighing-form.component.html

### Opción 1: Reemplazar los botones existentes

Buscar la sección de "Placa del Tráiler" (aproximadamente línea 141) y **reemplazar** el grupo de botones existente:

```html
<div class="form-group">
  <label for="trailerPlate" class="form-label">Placa del Tráiler *</label>

  <!-- ========== NUEVO: Botones de captura ========== -->
  <div class="capture-buttons-group mb-3">
    <!-- Lectura automática ANPR -->
    <app-anpr-capture
      cameraType="trailer"
      label="Leer Placa Automáticamente"
      icon="pi pi-qrcode"
      [timeoutSeconds]="30"
      [showPreview]="true"
      (plateCaptured)="onAnprPlateCaptured($event, 'trailerPlate')"
      (captureFailed)="onAnprCaptureFailed($event)"
    ></app-anpr-capture>

    <!-- Captura manual de foto (botón existente) -->
    <div class="manual-capture-group mt-2">
      <p-button
        label="Capturar Foto Manualmente"
        icon="pi pi-camera"
        severity="secondary"
        [outlined]="true"
        (onClick)="onPhotoCapture('trailerPlate')"
        styleClass="w-full"
      />
    </div>
  </div>
  <!-- ================================================ -->

  <!-- Campo de input existente -->
  <div class="input-group">
    <button
      *ngIf="manualEditEnabled.trailerPlate"
      type="button"
      class="btn btn-outline edit-toggle-btn active"
      (click)="onEnableManualEdit('trailerPlate')"
      title="Edición manual activa"
    >
      ✏️
    </button>
    <button
      *ngIf="!manualEditEnabled.trailerPlate"
      type="button"
      class="btn btn-outline edit-toggle-btn"
      (click)="onEnableManualEdit('trailerPlate')"
      title="Habilitar edición manual"
    >
      🔒
    </button>

    <input
      type="text"
      id="trailerPlate"
      formControlName="trailerPlate"
      class="form-input"
      [class.error]="getFieldError('trailerPlate')"
      placeholder="Placa del tráiler"
      [readonly]="!manualEditEnabled.trailerPlate"
    />
  </div>

  <!-- Error de validación -->
  <div *ngIf="getFieldError('trailerPlate')" class="error-message">
    {{ getFieldError("trailerPlate") }}
  </div>

  <!-- Indicador de foto capturada (código existente) -->
  <div class="photo-status">
    <span
      class="photo-status-indicator"
      [class.has-photo]="photoData.trailerPlate"
    >
      <span *ngIf="!photoData.trailerPlate" class="photo-pending">
        📷 Foto pendiente
      </span>
      <span *ngIf="photoData.trailerPlate" class="photo-captured">
        ✓ Foto capturada
      </span>
    </span>
  </div>
</div>
```

### Opción 2: Agregar como botón adicional (sin reemplazar)

Si prefieres mantener los botones existentes y agregar el nuevo componente:

```html
<div class="form-group">
  <label for="trailerPlate" class="form-label">Placa del Tráiler *</label>

  <!-- NUEVO: Componente ANPR -->
  <div class="anpr-section mb-2 p-3 border rounded">
    <h4 class="text-sm font-semibold mb-2">🤖 Lectura Automática (Recomendado)</h4>
    <app-anpr-capture
      cameraType="trailer"
      label="Leer Placa Automáticamente"
      icon="pi pi-qrcode"
      [timeoutSeconds]="30"
      [showPreview]="true"
      (plateCaptured)="onAnprPlateCaptured($event, 'trailerPlate')"
      (captureFailed)="onAnprCaptureFailed($event)"
    ></app-anpr-capture>
  </div>

  <!-- Separador -->
  <div class="text-center text-gray-500 my-2">o</div>

  <!-- Botones existentes (captura manual) -->
  <div class="input-group">
    <button
      type="button"
      class="btn btn-outline photo-capture-btn"
      (click)="onPhotoCapture('trailerPlate')"
    >
      📷
    </button>
    <!-- ... resto de botones existentes -->
  </div>

  <!-- Resto del código existente -->
</div>
```

## CSS Adicional (Opcional)

Agregar en `weighing-form.component.scss`:

```scss
.capture-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: var(--border-radius);
  border: 1px dashed var(--surface-300);
}

.manual-capture-group {
  display: flex;
  flex-direction: column;
}

.anpr-section {
  background: linear-gradient(135deg, var(--blue-50) 0%, var(--purple-50) 100%);
  border-color: var(--blue-200);

  h4 {
    color: var(--blue-700);
    margin: 0 0 0.5rem 0;
  }
}
```

## Integración para Otras Placas

### Remolque 1

```html
<app-anpr-capture
  cameraType="remolque"
  label="Leer Placa Remolque 1"
  icon="pi pi-qrcode"
  [timeoutSeconds]="30"
  (plateCaptured)="onAnprPlateCaptured($event, 'placaRemolque1')"
  (captureFailed)="onAnprCaptureFailed($event)"
></app-anpr-capture>
```

### Remolque 2

```html
<app-anpr-capture
  cameraType="remolque"
  label="Leer Placa Remolque 2"
  icon="pi pi-qrcode"
  [timeoutSeconds]="30"
  (plateCaptured)="onAnprPlateCaptured($event, 'placaRemolque2')"
  (captureFailed)="onAnprCaptureFailed($event)"
></app-anpr-capture>
```

### Contenedor

```html
<app-anpr-capture
  cameraType="cargo"
  label="Leer Placa Contenedor"
  icon="pi pi-qrcode"
  [timeoutSeconds]="30"
  (plateCaptured)="onAnprPlateCaptured($event, 'trailerPlateContenedor')"
  (captureFailed)="onAnprCaptureFailed($event)"
></app-anpr-capture>
```

## Testing Rápido

1. **Compilar backend**:
   ```bash
   cd src/backend
   dotnet build
   dotnet run --project Kiriu.WeighingSystem.Api
   ```

2. **Compilar frontend**:
   ```bash
   cd src/frontend/kiriu-weighing-frontend
   npm install
   npm start
   ```

3. **Verificar conexión**:
   - Abrir navegador en `http://localhost:4200`
   - Abrir consola del navegador
   - Buscar mensaje: "Conexión SignalR ANPR iniciada"

4. **Probar endpoint**:
   ```bash
   curl http://localhost:5000/api/anpr/test/trailer
   ```

5. **Simular evento ANPR** (con Postman o curl):
   - POST a `http://localhost:5000/api/anpr/trailer`
   - Content-Type: `multipart/form-data`
   - Body: XML de ejemplo + imagen

## Notas de Integración

1. **No modifica funcionalidad existente**: El componente ANPR es completamente adicional y no interfiere con los botones de captura manual existentes.

2. **Compatibilidad**: Funciona con la estructura actual de `photoData` y `manualEditEnabled`.

3. **Validación**: El formulario sigue validando que la placa no esté vacía, independientemente de cómo se capture.

4. **Imágenes**: Las imágenes capturadas por ANPR se almacenan igual que las fotos manuales y se asocian a la operación de pesaje.

5. **UX**: El componente proporciona feedback visual claro:
   - ⏳ "Esperando placa..." durante captura
   - ✅ "Placa X615DYP detectada con 82% de confianza" al éxito
   - ❌ "Tiempo de espera agotado" en timeout
   - 🚫 "Conexión no disponible" si SignalR está desconectado
