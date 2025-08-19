# Cambio en Activación del Segundo Remolque - Flujo de Doble Remolque

## Descripción del Cambio

Se ha modificado la lógica de activación de la sección del segundo remolque en el flujo de "Unidad con doble remolque". 

**❌ Comportamiento Anterior:**
- El segundo remolque se activaba cuando se tomaba la foto de carga del primer remolque
- No se requería el peso del Remolque 1 para desbloquear la sección

**✅ Comportamiento Nuevo:**
- El segundo remolque se activa **únicamente después de que se registre el peso del Remolque 1**
- Se mantiene bloqueado hasta que se capture el peso, incluso si se han completado todos los demás pasos

## Cambios Técnicos Implementados

### 1. Función `canProceedToRemolque2()` Modificada

**Antes:**
```typescript
canProceedToRemolque2(): boolean {
  return !!(
    this.doubleTrailerState.trailerPlaca &&
    this.doubleTrailerState.remolque1.fotoPlacaCapturada &&
    this.doubleTrailerState.remolque1.fotoCargaCapturada &&
    this.weighingForm.get('product')?.value &&
    this.weighingForm.get('clientProviderName')?.value
    // ❌ NO se validaba el peso del Remolque 1
  );
}
```

**Después:**
```typescript
canProceedToRemolque2(): boolean {
  return !!(
    this.doubleTrailerState.trailerPlaca &&
    this.doubleTrailerState.remolque1.fotoPlacaCapturada &&
    this.doubleTrailerState.remolque1.fotoCargaCapturada &&
    this.weighingForm.get('product')?.value &&
    this.weighingForm.get('clientProviderName')?.value &&
    this.doubleTrailerState.remolque1.pesoCapturado  // ✅ NUEVO REQUISITO
  );
}
```

### 2. Función `canProceedToRemolque2WithWeight()` Simplificada

**Antes:**
```typescript
canProceedToRemolque2WithWeight(): boolean {
  return !!(
    this.doubleTrailerState.trailerPlaca &&
    this.doubleTrailerState.remolque1.fotoPlacaCapturada &&
    this.doubleTrailerState.remolque1.fotoCargaCapturada &&
    this.weighingForm.get('product')?.value &&
    this.weighingForm.get('clientProviderName')?.value &&
    this.doubleTrailerState.remolque1.pesoCapturado
  );
}
```

**Después:**
```typescript
canProceedToRemolque2WithWeight(): boolean {
  return this.canProceedToRemolque2(); // ✅ Reutiliza la lógica principal
}
```

### 3. Función `resetDoubleTrailerState()` Corregida

Se agregó la propiedad `fotoPlacaCapturada` que faltaba:

```typescript
private resetDoubleTrailerState(): void {
  this.doubleTrailerState = {
    currentStep: 'trailer',
    trailerPlaca: '',
    remolque1: {
      numero: 1,
      placa: '',
      pesoBruto: 0,
      fotos: [],
      fotoCargaCapturada: false,
      fotoPlacaCapturada: false,  // ✅ Agregada
    },
    remolque2: {
      numero: 2,
      placa: '',
      pesoBruto: 0,
      fotos: [],
      fotoCargaCapturada: false,
      fotoPlacaCapturada: false,  // ✅ Agregada
    },
    pesoBrutoTotal: 0,
    isComplete: false,
  };
}
```

## Flujo de Validación Actualizado

### ✅ Secuencia de Activación del Segundo Remolque

1. **Placa del Tráiler** ✅
2. **Placa del Remolque 1** ✅
3. **Foto de Carga del Remolque 1** ✅
4. **Producto/Material** ✅
5. **Cliente/Proveedor** ✅
6. **Peso del Remolque 1** ✅ ← **NUEVO REQUISITO OBLIGATORIO**
7. **→ Sección del Remolque 2 se DESBLOQUEA** 🎯

### 🔒 Estados de Bloqueo

**Remolque 2 BLOQUEADO cuando:**
- Falta la placa del tráiler
- Falta la placa del remolque 1
- Falta la foto de carga del remolque 1
- Falta el producto/material
- Falta el cliente/proveedor
- **Falta el peso del remolque 1** ← **NUEVO**

**Remolque 2 DESBLOQUEADO cuando:**
- Todos los campos del remolque 1 están completos
- **Y el peso del remolque 1 está capturado** ← **NUEVO**

## Comportamiento en la Interfaz

### 📱 Indicadores Visuales

- **Badge "Bloqueado"** en el Remolque 2 hasta completar todos los requisitos
- **Mensaje de bloqueo** explicativo: "Complete todos los datos del Remolque 1 para desbloquear esta sección"
- **Campos deshabilitados** en el Remolque 2 hasta que se desbloquee
- **Mensaje de desbloqueo** cuando se active: "Sube el segundo remolque para capturar su peso."

### 🎯 Botón de Captura de Peso

- **Remolque 1**: Se habilita cuando se completan todos los campos requeridos (sin peso)
- **Remolque 2**: Solo se habilita cuando el Remolque 1 está completamente terminado (con peso)

## Validaciones Mantenidas

### ✅ Validaciones Existentes Preservadas

- **Captura de peso del Remolque 1**: Requiere todos los campos previos
- **Guardado de entrada**: Requiere todos los datos completos
- **Flujos alternativos**: "Solo contenedor" y "Remolque único" no se afectan
- **Diseño visual**: No se modificaron estilos ni estructura HTML

### 🔄 Lógica de Progreso

- **Pasos del proceso**: Se actualizan correctamente según el nuevo flujo
- **Indicadores de progreso**: Muestran el estado real de cada paso
- **Validación en tiempo real**: Se ejecuta en cada cambio de estado

## Archivos Modificados

1. **`weighing-form.component.ts`**
   - Función `canProceedToRemolque2()` actualizada
   - Función `canProceedToRemolque2WithWeight()` simplificada
   - Función `resetDoubleTrailerState()` corregida

2. **`CAMBIO_ACTIVACION_REMOLQUE2_README.md`** (este archivo)

## Pruebas Recomendadas

### 🧪 Escenarios de Prueba

1. **Flujo Normal (Sin Peso):**
   - Completar todos los campos del Remolque 1 (sin peso)
   - Verificar que el Remolque 2 permanezca bloqueado
   - Verificar que se muestre el mensaje de bloqueo

2. **Flujo Completo (Con Peso):**
   - Completar todos los campos del Remolque 1
   - Capturar el peso del Remolque 1
   - Verificar que el Remolque 2 se desbloquee
   - Verificar que se muestre el mensaje de desbloqueo

3. **Validación de Campos:**
   - Verificar que cada campo individual mantenga su validación
   - Verificar que el progreso se calcule correctamente
   - Verificar que los indicadores visuales funcionen

4. **Flujos Alternativos:**
   - Verificar que "Solo contenedor" funcione igual
   - Verificar que "Remolque único" funcione igual
   - Verificar que no se afecten otros componentes

## Conclusión

El cambio implementado asegura que:

- **El segundo remolque solo se active después de capturar el peso del primero**
- **Se mantenga la integridad del flujo de validación**
- **No se afecten otros flujos o funcionalidades**
- **La experiencia del usuario sea más clara y lógica**

La modificación es mínima y específica, afectando únicamente la lógica de activación del segundo remolque en el flujo de doble remolque, tal como se solicitó.
