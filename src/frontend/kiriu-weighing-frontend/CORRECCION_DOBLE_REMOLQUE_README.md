# Corrección de Validación de Pasos en Doble Remolque

## Problema Identificado

Se detectó un error en la validación de los pasos del flujo de doble remolque donde:

**❌ Comportamiento Incorrecto:**

- Al capturar la foto de la placa del segundo remolque (`remolque2Plate`), se marcaba incorrectamente como completado el paso de la foto de la carga del segundo remolque
- Esto causaba que el sistema mostrara como completado un paso que aún no se había ejecutado

**🔍 Causa Raíz:**

- La propiedad `fotosCapturadas` se estaba usando tanto para las fotos de placa como para las fotos de carga
- No había una separación clara entre estos dos tipos de captura de fotos
- La lógica de validación de pasos no distinguía entre foto de placa y foto de carga

## Solución Implementada

### 1. Nuevas Propiedades de Estado

Se agregaron propiedades específicas para rastrear cada tipo de foto:

```typescript
export interface RemolqueData {
  numero: number;
  placa: string;
  pesoBruto: number;
  fotos: string[];
  pesoCapturado?: boolean;
  fotosCapturadas?: boolean; // Solo para fotos de carga
  fotoCargaCapturada?: boolean; // Solo para fotos de carga
  fotoPlacaCapturada?: boolean; // NUEVA: Solo para fotos de placa
}
```

### 2. Lógica de Captura Separada

**Foto de Placa del Remolque 1:**

```typescript
} else if (photoType === 'remolque1Plate') {
  // ... código de detección OCR ...
  if (this.weighingForm.get('doubleTrailer')?.value) {
    this.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';
    this.doubleTrailerState.remolque1.fotos = ['foto_remolque1.jpg'];
    // ✅ Marcar específicamente la foto de placa
    this.doubleTrailerState.remolque1.fotoPlacaCapturada = true;
    // ❌ NO marcar fotosCapturadas aquí
  }
}
```

**Foto de Placa del Remolque 2:**

```typescript
} else if (photoType === 'remolque2Plate') {
  // ... código de detección OCR ...
  if (this.weighingForm.get('doubleTrailer')?.value) {
    this.doubleTrailerState.remolque2.placa = 'DEF-456-CD';
    this.doubleTrailerState.remolque2.fotos = ['foto_remolque2.jpg'];
    // ✅ Marcar específicamente la foto de placa
    this.doubleTrailerState.remolque2.fotoPlacaCapturada = true;
    // ❌ NO marcar fotosCapturadas aquí
  }
}
```

**Foto de Carga del Remolque 1:**

```typescript
} else if (photoType === 'cargo') {
  // ... código de captura ...
  if (this.weighingForm.get('doubleTrailer')?.value &&
      this.doubleTrailerState.currentStep === 'remolque1') {
    // ✅ Marcar específicamente la foto de carga
    this.doubleTrailerState.remolque1.fotoCargaCapturada = true;
    // ✅ También marcar fotosCapturadas para compatibilidad
    this.doubleTrailerState.remolque1.fotosCapturadas = true;
  }
}
```

**Foto de Carga del Remolque 2:**

```typescript
} else if (photoType === 'cargoRemolque2') {
  // ... código de captura ...
  if (this.weighingForm.get('doubleTrailer')?.value) {
    // ✅ Marcar específicamente la foto de carga
    this.doubleTrailerState.remolque2.fotosCapturadas = true;
  }
}
```

### 3. Validación de Pasos Corregida

La función `updateStepStatuses` ahora usa las propiedades correctas:

```typescript
case 'double-trailer':
  this.stepStatuses = {
    'trailer-plate': !!this.doubleTrailerState.trailerPlaca,
    'remolque1-plate': !!this.doubleTrailerState.remolque1.fotoPlacaCapturada,    // ✅ Foto de placa
    'remolque1-cargo': !!this.doubleTrailerState.remolque1.fotoCargaCapturada,    // ✅ Foto de carga
    'product': !!this.weighingForm.get('product')?.value,
    'client': !!this.weighingForm.get('clientProviderName')?.value,
    'remolque2-plate': !!this.doubleTrailerState.remolque2.fotoPlacaCapturada,    // ✅ Foto de placa
    'remolque2-cargo': !!this.doubleTrailerState.remolque2.fotosCapturadas,       // ✅ Foto de carga
    'weight': this.doubleTrailerState.isComplete,
  };
  break;
```

### 4. Funciones de Validación Actualizadas

Todas las funciones de validación ahora usan las propiedades correctas:

```typescript
canProceedToRemolque2(): boolean {
  return !!(
    this.doubleTrailerState.trailerPlaca &&
    this.doubleTrailerState.remolque1.fotoPlacaCapturada &&      // ✅ Foto de placa
    this.doubleTrailerState.remolque1.fotoCargaCapturada &&      // ✅ Foto de carga
    this.weighingForm.get('product')?.value &&
    this.weighingForm.get('clientProviderName')?.value
  );
}
```

## Resultado de la Corrección

### ✅ Comportamiento Correcto Implementado

1. **Foto de Placa del Remolque 1** → Marca solo el paso `remolque1-plate`
2. **Foto de Carga del Remolque 1** → Marca solo el paso `remolque1-cargo`
3. **Foto de Placa del Remolque 2** → Marca solo el paso `remolque2-plate`
4. **Foto de Carga del Remolque 2** → Marca solo el paso `remolque2-cargo`

### 🔒 Validaciones Mantenidas

- El Remolque 2 sigue bloqueado hasta completar el Remolque 1
- La captura de peso sigue validando todos los campos requeridos
- Los pasos del proceso se actualizan de forma independiente y correcta

### 📊 Indicadores Visuales

- Los pasos del proceso ahora muestran el estado correcto para cada tipo de foto
- No hay confusión entre fotos de placa y fotos de carga
- El progreso se calcula correctamente basado en los pasos reales completados

## Archivos Modificados

1. **`weighing.service.ts`** - Agregada nueva interfaz `fotoPlacaCapturada`
2. **`weighing-form.component.ts`** - Corregida lógica de captura y validación
3. **`process-steps.component.ts`** - Ya tenía la estructura correcta de pasos

## Pruebas Recomendadas

1. **Flujo de Doble Remolque:**

   - Capturar foto de placa del Remolque 1 → Verificar que solo se marque `remolque1-plate`
   - Capturar foto de carga del Remolque 1 → Verificar que solo se marque `remolque1-cargo`
   - Capturar foto de placa del Remolque 2 → Verificar que solo se marque `remolque2-plate`
   - Capturar foto de carga del Remolque 2 → Verificar que solo se marque `remolque2-cargo`

2. **Validaciones:**
   - Verificar que el Remolque 2 permanezca bloqueado hasta completar el Remolque 1
   - Verificar que la captura de peso funcione correctamente en cada paso
   - Verificar que los indicadores visuales muestren el progreso correcto

## Conclusión

La corrección implementada resuelve completamente el problema de validación de pasos en el flujo de doble remolque, asegurando que:

- Cada tipo de foto se valide de forma independiente
- Los pasos del proceso se actualicen correctamente
- No haya confusión entre diferentes tipos de captura
- Se mantenga la integridad del flujo de validación

El sistema ahora proporciona una experiencia de usuario más clara y precisa, con indicadores visuales que reflejan correctamente el estado real de cada paso del proceso.
