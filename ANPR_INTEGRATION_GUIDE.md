# Guía de Integración ANPR (Lectura Automática de Placas)

## Resumen

Se ha implementado un sistema completo y reutilizable para la lectura automática de placas vehiculares mediante cámaras ANPR Hikvision. El sistema está diseñado para ser escalable, configurable y fácil de integrar en las pantallas de entrada y salida.

## Arquitectura

### Backend (.NET)

#### 1. DTOs (Data Transfer Objects)
- **`AnprEventDto`**: Representa un evento de lectura de placa
- **`AnprCameraConfigDto`**: Configuración de cámaras individuales
- **`AnprSystemConfigDto`**: Configuración completa del sistema

**Ubicación**: `src/backend/Kiriu.WeighingSystem.Application/DTOs/Anpr/`

#### 2. Servicios

**`AnprParserService`**
- Parsea payload multipart/form-data de cámaras Hikvision
- Extrae XML con metadata y imagen JPG
- Convierte XML a `AnprEventDto`

**Ubicación**: `src/backend/Kiriu.WeighingSystem.Infrastructure/Services/AnprParserService.cs`

**`AnprApplicationService`**
- Procesa eventos ANPR
- Almacena imágenes de placas en sistema de archivos
- Crea registros de `WeighingPhoto` asociados a operaciones

**Ubicación**: `src/backend/Kiriu.WeighingSystem.Application/Services/AnprApplicationService.cs`

#### 3. Controlador

**`AnprController`**
- Expone 3 endpoints HTTP para recibir eventos de cámaras:
  - `POST /api/anpr/trailer` - Cámara de placa de tráiler
  - `POST /api/anpr/remolque` - Cámara de placa de remolque
  - `POST /api/anpr/cargo` - Cámara de placa de carga/contenedor
- Notifica al frontend vía SignalR evento `anprEventReceived`

**Ubicación**: `src/backend/Kiriu.WeighingSystem.Api/Controllers/AnprController.cs`

#### 4. Configuración

**`appsettings.json`**:
```json
{
  "AnprCamera": {
    "TrailerCamera": {
      "Port": 5001,
      "TimeoutSeconds": 30,
      "Enabled": true
    },
    "RemolqueCamera": {
      "Port": 5002,
      "TimeoutSeconds": 30,
      "Enabled": true
    },
    "CargoCamera": {
      "Port": 5003,
      "TimeoutSeconds": 30,
      "Enabled": true
    },
    "ImageStoragePath": "uploads/plates"
  }
}
```

**Nota**: Los puertos son configurables. El backend escucha en el puerto principal configurado (ej: 5000), y las cámaras envían a rutas específicas.

### Frontend (Angular)

#### 1. Servicio ANPR

**`AnprService`**
- Conecta con SignalR Hub para recibir eventos ANPR
- Método `capturePlate()` para iniciar captura con timeout
- Observables para estado de captura y conexión
- Reutiliza la infraestructura existente de SignalR

**Ubicación**: `src/frontend/kiriu-weighing-frontend/src/app/features/weighing/services/anpr.service.ts`

**Métodos principales**:
```typescript
// Capturar placa con timeout
capturePlate(cameraType: 'trailer' | 'remolque' | 'cargo', timeoutMs?: number): Promise<AnprEvent>

// Cancelar captura
cancelCapture(): void

// Observable de estado de captura
getCaptureState(): Observable<AnprCaptureState>

// Observable de eventos ANPR
getAnprEvents(): Observable<AnprEvent | null>
```

#### 2. Componente Reutilizable

**`AnprCaptureComponent`**
- Componente standalone reutilizable
- Botón de captura con indicador de carga
- Preview de placa e imagen capturada
- Indicador de estado de conexión
- Botón de cancelar durante captura
- Manejo de timeouts y errores

**Ubicación**: `src/frontend/kiriu-weighing-frontend/src/app/features/weighing/components/anpr-capture/`

**Uso**:
```html
<app-anpr-capture
  cameraType="trailer"
  label="Capturar Placa Tráiler"
  icon="pi pi-camera"
  [timeoutSeconds]="30"
  [disabled]="false"
  [showPreview]="true"
  (plateCaptured)="onPlateCaptured($event)"
  (captureFailed)="onCaptureFailed($event)"
></app-anpr-capture>
```

**Inputs**:
- `cameraType`: Tipo de cámara ('trailer' | 'remolque' | 'cargo')
- `label`: Texto del botón
- `icon`: Ícono del botón
- `timeoutSeconds`: Timeout en segundos (default: 30)
- `disabled`: Deshabilitar botón
- `showPreview`: Mostrar preview de captura

**Outputs**:
- `plateCaptured`: Emite `AnprEvent` cuando se captura exitosamente
- `captureFailed`: Emite `Error` cuando falla la captura

## Integración en Pantallas

### Paso 1: Importar el componente

```typescript
import { AnprCaptureComponent } from '../../components/anpr-capture/anpr-capture.component';
import { AnprEvent } from '../../services/anpr.service';

@Component({
  // ...
  imports: [
    // ... otros imports
    AnprCaptureComponent
  ]
})
export class WeighingFormComponent {
  // ...
}
```

### Paso 2: Agregar el componente al HTML

**Ejemplo para pantalla de entrada** (`weighing-form.component.html`):

Buscar la sección de "Placa del Tráiler" (línea ~141) y agregar antes del botón existente de captura de foto:

```html
<div class="form-group">
  <label for="trailerPlate" class="form-label">Placa del Tráiler *</label>

  <!-- NUEVO: Componente de lectura automática de placa -->
  <div class="anpr-capture-wrapper mb-2">
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

  <!-- Botones existentes -->
  <div class="input-group">
    <button
      type="button"
      class="btn btn-outline photo-capture-btn"
      (click)="onPhotoCapture('trailerPlate')"
    >
      📷
    </button>
    <!-- ... resto de botones -->
  </div>

  <!-- Campo de input -->
  <input
    type="text"
    id="trailerPlate"
    formControlName="trailerPlate"
    class="form-input"
    placeholder="Placa del tráiler"
    [readonly]="!manualEditEnabled.trailerPlate"
  />
</div>
```

### Paso 3: Implementar manejadores en el componente TypeScript

```typescript
export class WeighingFormComponent {

  /**
   * Maneja la captura exitosa de placa ANPR
   */
  onAnprPlateCaptured(event: AnprEvent, fieldName: string): void {
    // Actualizar el campo del formulario
    this.weighingForm.patchValue({
      [fieldName]: event.licensePlate
    });

    // Opcional: Guardar la URL de la imagen para asociarla a la operación
    this.photoData[fieldName] = event.imageUrl;

    console.log('Placa capturada:', {
      placa: event.licensePlate,
      confianza: event.confidenceLevel,
      imagen: event.imageUrl,
      campo: fieldName
    });
  }

  /**
   * Maneja errores de captura ANPR
   */
  onAnprCaptureFailed(error: Error): void {
    console.error('Error capturando placa:', error);

    // El componente ya muestra un mensaje de error,
    // pero puedes agregar lógica adicional aquí si es necesario
  }
}
```

### Paso 4: Repetir para otras placas

**Para Remolque 1** (línea ~210):
```html
<app-anpr-capture
  cameraType="remolque"
  label="Leer Placa Remolque"
  icon="pi pi-qrcode"
  [timeoutSeconds]="30"
  (plateCaptured)="onAnprPlateCaptured($event, 'placaRemolque1')"
  (captureFailed)="onAnprCaptureFailed($event)"
></app-anpr-capture>
```

**Para Carga/Contenedor**:
```html
<app-anpr-capture
  cameraType="cargo"
  label="Leer Placa Carga"
  icon="pi pi-qrcode"
  [timeoutSeconds]="30"
  (plateCaptured)="onAnprPlateCaptured($event, 'trailerPlateContenedor')"
  (captureFailed)="onAnprCaptureFailed($event)"
></app-anpr-capture>
```

## Configuración de Cámaras Hikvision

### URL de Notificación

Configurar cada cámara para enviar eventos HTTP POST a:

**Cámara de Tráiler**:
```
http://<IP_SERVIDOR>:<PUERTO>/api/anpr/trailer
```

**Cámara de Remolque**:
```
http://<IP_SERVIDOR>:<PUERTO>/api/anpr/remolque
```

**Cámara de Carga**:
```
http://<IP_SERVIDOR>:<PUERTO>/api/anpr/cargo
```

Donde:
- `<IP_SERVIDOR>`: IP del servidor backend (ej: 192.168.110.17)
- `<PUERTO>`: Puerto del backend (ej: 5000 o el configurado)

### Formato de Payload

Las cámaras deben enviar:
- Content-Type: `multipart/form-data`
- Parte 1: XML con metadata (`anpr.xml`)
- Parte 2: Imagen JPG de la placa

El sistema parsea automáticamente ambas partes.

## Flujo de Funcionamiento

1. **Usuario hace clic en "Leer Placa Automáticamente"**
   - Componente muestra indicador de carga
   - Servicio ANPR espera evento con timeout de 30s

2. **Cámara detecta vehículo y lee placa**
   - Envía POST al endpoint del backend correspondiente
   - Backend parsea XML e imagen
   - Guarda imagen en `wwwroot/uploads/plates/`
   - Notifica a todos los clientes vía SignalR

3. **Frontend recibe evento**
   - Servicio ANPR filtra por tipo de cámara
   - Resuelve promesa de `capturePlate()`
   - Componente actualiza UI con placa e imagen
   - Emite evento `plateCaptured` al componente padre

4. **Componente padre actualiza formulario**
   - Llena campo de placa automáticamente
   - Guarda referencia a imagen para asociarla a la operación

## Testing

### Probar Endpoints Backend

```bash
# Ver status del endpoint
curl http://localhost:5000/api/anpr/test/trailer
curl http://localhost:5000/api/anpr/test/remolque
curl http://localhost:5000/api/anpr/test/cargo
```

### Probar con Postman

1. Crear request POST a `http://localhost:5000/api/anpr/trailer`
2. Content-Type: `multipart/form-data`
3. Agregar dos partes:
   - `anpr.xml`: archivo XML con estructura Hikvision
   - `licensePlatePicture.jpg`: imagen de placa

## Próximos Pasos

1. ✅ Backend completo implementado
2. ✅ Frontend servicios y componentes creados
3. ⏳ **Integrar en pantalla de entrada** (weighing-form.component)
4. ⏳ **Integrar en pantalla de salida** (weighing-exit-form.component)
5. ⏳ Probar con cámaras reales
6. ⏳ Ajustar timeouts y configuración según comportamiento real

## Notas Importantes

- El sistema reutiliza el SignalR Hub existente (`PesoHub`)
- Las imágenes se almacenan en `wwwroot/uploads/plates/`
- El sistema es compatible con la estructura existente de `WeighingPhotos`
- Todas las configuraciones son modificables en `appsettings.json`
- El componente es completamente standalone y reutilizable
- Se puede usar en cualquier pantalla que necesite lectura de placas

## Soporte

Para cualquier duda o problema con la integración, revisar:
- Logs del backend en consola
- Logs de SignalR en consola del navegador
- Estado de conexión en el componente ANPR
- Configuración de cámaras Hikvision
