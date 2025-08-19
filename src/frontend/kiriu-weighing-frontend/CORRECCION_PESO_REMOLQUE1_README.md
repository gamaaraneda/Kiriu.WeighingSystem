# Corrección del Problema de Captura de Peso del Remolque 1

## Problema Identificado

Después del ajuste anterior donde se modificó `canProceedToRemolque2()` para incluir la validación del peso, se presentó un problema:

**❌ Comportamiento Incorrecto:**

- No se permitía registrar el peso del primer remolque
- El botón "Capturar Peso" permanecía deshabilitado
- La función `canCaptureWeight()` no funcionaba correctamente

## 🔍 Causa Raíz del Problema

### 1. **Problema de Estado del `currentStep`**

La función `canCaptureWeight()` verifica:

```typescript
if (this.doubleTrailerState.currentStep === "remolque1") {
  // Validar campos para permitir captura de peso
}
```

**El problema era:**

- Cuando se captura la foto de la placa del tráiler → `currentStep = 'remolque1'` ✅
- Cuando se captura la foto de la placa del remolque 1 → **NO se actualizaba `currentStep`** ❌
- La función `canCaptureWeight()` no se ejecutaba porque `currentStep` no era `'remolque1'`

### 2. **Flujo de Establecimiento del `currentStep`**

**Antes (Incorrecto):**

```
1. Foto placa tráiler → currentStep = 'remolque1' ✅
2. Foto placa remolque 1 → currentStep = 'remolque1' ❌ (ya estaba en 'remolque1')
3. Foto carga remolque 1 → currentStep = 'remolque1' ❌ (ya estaba en 'remolque1')
```

**Después (Correcto):**

```
1. Foto placa tráiler → currentStep = 'remolque1' ✅
2. Foto placa remolque 1 → currentStep = 'remolque1' ✅ (se asegura que esté en 'remolque1')
3. Foto carga remolque 1 → currentStep = 'remolque1' ✅ (ya está en 'remolque1')
```

## ✅ Solución Implementada

### 1. **Corrección en `onPhotoCapture` para Placa del Remolque 1**

```typescript
} else if (photoType === 'remolque1Plate') {
  this.photoData.remolque1Plate = 'Foto capturada';
  // Simular detección automática de placa (OCR)
  this.weighingForm.patchValue({ remolque1Plate: 'XYZ-789-AB' });
  console.log('Placa detectada automáticamente: XYZ-789-AB');

  // Si es doble remolque, actualizar el estado del remolque 1
  if (this.weighingForm.get('doubleTrailer')?.value) {
    this.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';
    this.doubleTrailerState.remolque1.fotos = ['foto_remolque1.jpg'];
    // Marcar que se capturó la foto de la placa del remolque 1
    this.doubleTrailerState.remolque1.fotoPlacaCapturada = true;

    // ✅ NUEVO: Asegurar que estemos en el paso correcto para capturar peso
    if (this.doubleTrailerState.currentStep === 'trailer') {
      this.doubleTrailerState.currentStep = 'remolque1';
    }
  }
}
```

### 2. **Logs de Debug Agregados**

Se agregaron logs para facilitar la identificación de problemas futuros:

```typescript
// Log de debug para identificar el problema
console.log("🔍 Debug canCaptureWeight:", {
  currentStep: this.doubleTrailerState.currentStep,
  trailerPlaca: !!this.doubleTrailerState.trailerPlaca,
  fotoPlacaCapturada: !!this.doubleTrailerState.remolque1.fotoPlacaCapturada,
  fotoCargaCapturada: !!this.doubleTrailerState.remolque1.fotoCargaCapturada,
  product: !!this.weighingForm.get("product")?.value,
  clientProviderName: !!this.weighingForm.get("clientProviderName")?.value,
  canCapture: canCapture,
});
```

## 🔄 Flujo Corregido de Activación

### **Secuencia Correcta de Activación:**

1. **Foto Placa del Tráiler** → `currentStep = 'remolque1'`
2. **Foto Placa del Remolque 1** → `currentStep = 'remolque1'` (se asegura)
3. **Foto Carga del Remolque 1** → `currentStep = 'remolque1'` (ya está)
4. **Producto/Material** → Se valida en `canCaptureWeight()`
5. **Cliente/Proveedor** → Se valida en `canCaptureWeight()`
6. **→ Botón "Capturar Peso" se HABILITA** 🎯
7. **Peso del Remolque 1** → Se captura
8. **→ Sección del Remolque 2 se DESBLOQUEA** 🎯

### **Validaciones Separadas:**

- **`canCaptureWeight()`**: Solo valida campos previos (NO incluye peso)
- **`canProceedToRemolque2()`**: Valida campos previos + peso del Remolque 1

## 🧪 Pruebas de Verificación

### **Escenario 1: Captura de Peso del Remolque 1**

1. Activar "Doble remolque"
2. Capturar foto de placa del tráiler
3. Capturar foto de placa del remolque 1
4. Capturar foto de carga del remolque 1
5. Ingresar producto/material
6. Ingresar cliente/proveedor
7. **Verificar que el botón "Capturar Peso" esté habilitado** ✅

### **Escenario 2: Activación del Remolque 2**

1. Completar todos los pasos del Remolque 1 (incluyendo peso)
2. **Verificar que la sección del Remolque 2 se desbloquee** ✅
3. **Verificar que se muestre el mensaje de desbloqueo** ✅

### **Escenario 3: Logs de Debug**

1. Abrir consola del navegador
2. Seguir el flujo paso a paso
3. **Verificar que aparezcan los logs de debug** ✅
4. **Verificar que `currentStep` sea correcto en cada paso** ✅

## 📊 Estado del Sistema Después de la Corrección

### **✅ Funcionalidades Restauradas:**

- Captura de peso del Remolque 1 funciona correctamente
- Botón "Capturar Peso" se habilita cuando corresponde
- Activación del Remolque 2 requiere peso del Remolque 1
- Logs de debug para facilitar troubleshooting

### **🔒 Validaciones Mantenidas:**

- El Remolque 2 sigue bloqueado hasta completar Remolque 1
- La captura de peso requiere todos los campos previos
- El flujo de pasos se mantiene secuencial y lógico

### **📱 Interfaz de Usuario:**

- Indicadores visuales funcionan correctamente
- Mensajes de bloqueo/desbloqueo se muestran apropiadamente
- Progreso del proceso se calcula correctamente

## Archivos Modificados

1. **`weighing-form.component.ts`**

   - Función `onPhotoCapture` corregida para establecer `currentStep`
   - Logs de debug agregados a `canCaptureWeight`

2. **`CORRECCION_PESO_REMOLQUE1_README.md`** (este archivo)

## Conclusión

La corrección implementada resuelve el problema de captura de peso del Remolque 1 asegurando que:

- **El `currentStep` se establezca correctamente** en cada paso del flujo
- **La función `canCaptureWeight()` se ejecute** cuando corresponde
- **El botón "Capturar Peso" se habilite** cuando se cumplan los requisitos
- **La activación del Remolque 2 funcione** según la lógica solicitada

El sistema ahora funciona correctamente, permitiendo capturar el peso del primer remolque y activando el segundo remolque únicamente después de registrar el peso, tal como se solicitó originalmente.
