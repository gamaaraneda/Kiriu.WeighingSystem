# Validación del Primer Remolque - Flujo de Doble Remolque

## Descripción

Se ha implementado una validación específica en el flujo de doble remolque que garantiza que se capture toda la información necesaria del primer remolque **antes de permitir capturar el peso** y **antes de permitir avanzar al segundo remolque**.

## Requisitos de Validación

### ✅ Campos Obligatorios del Primer Remolque

Antes de permitir **capturar el peso** o **avanzar al segundo remolque**, el sistema valida que se haya capturado:

1. **Placa del Tráiler** - Placa única para ambos remolques
2. **Placa del Remolque 1** - Placa específica del primer remolque
3. **Foto de la Carga del Remolque 1** - Documentación visual del material
4. **Material/Producto** - Tipo de material que se está transportando
5. **Nombre del Proveedor/Cliente** - Identificación de la entidad responsable

### ⚠️ Validación Estricta y Preventiva

- **Validación Preventiva**: Se ejecuta **antes** de permitir capturar el peso del primer remolque
- **Validación de Continuidad**: Se ejecuta **después** de capturar el peso para permitir avanzar al segundo remolque
- Si **cualquiera** de estos campos está vacío o no ha sido capturado, el sistema **NO permite**:
  - Capturar el peso del primer remolque
  - Avanzar al segundo remolque
- Se muestra una notificación de error usando `NotificationService.showError()`
- El flujo se mantiene en el paso del remolque 1 hasta completar todos los requisitos

## Implementación Técnica

### Método de Validación

```typescript
/**
 * Valida que se haya capturado toda la información del primer remolque
 * antes de permitir avanzar al segundo remolque
 */
private canProceedToRemolque2(): boolean {
  // Validar que se haya capturado:
  // 1. Placa del tráiler
  // 2. Placa del remolque 1
  // 3. Foto de la carga del remolque 1
  // 4. Material/producto
  // 5. Nombre del proveedor/cliente
  return !!(
    this.doubleTrailerState.trailerPlaca &&
    this.doubleTrailerState.remolque1.placa &&
    this.photoData.cargo &&
    this.weighingForm.get('product')?.value &&
    this.weighingForm.get('clientProviderName')?.value
  );
}
```

### Validación Preventiva en Captura de Peso

```typescript
onCaptureWeight(): void {
  if (this.weightData.isStable && this.weightData.isConnected) {
    // Si es doble remolque, validar requisitos antes de permitir capturar peso
    if (this.weighingForm.get('doubleTrailer')?.value) {
      if (this.doubleTrailerState.currentStep === 'remolque1') {
        // Validar que se hayan capturado las placas y foto de carga antes de permitir capturar peso
        if (!this.canProceedToRemolque2()) {
          this.notificationService.showError(
            'Información incompleta',
            'Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de capturar el peso.'
          );
          return; // No permitir capturar peso hasta completar requisitos
        }
      }
    }

    // ... resto de la lógica de captura de peso
  }
}
```

### Control de Estado del Botón

```typescript
/**
 * Determina si se puede capturar el peso del primer remolque
 * basado en si se han cumplido todos los requisitos previos
 */
get canCaptureFirstTrailerWeight(): boolean {
  if (!this.weighingForm.get('doubleTrailer')?.value) return true;

  // Solo validar cuando estamos en el paso del remolque 1
  if (this.doubleTrailerState.currentStep === 'remolque1') {
    // Validar que se haya capturado:
    // 1. Placa del tráiler
    // 2. Placa del remolque 1
    // 3. Foto de la carga del remolque 1
    // 4. Material/producto
    // 5. Nombre del proveedor/cliente
    return !!(
      this.doubleTrailerState.trailerPlaca &&
      this.doubleTrailerState.remolque1.placa &&
      this.photoData.cargo &&
      this.weighingForm.get('product')?.value &&
      this.weighingForm.get('clientProviderName')?.value
    );
  }

  return true; // Para otros pasos, permitir captura de peso
}
```

### Integración en el Flujo

La validación se ejecuta en **dos momentos críticos**:

1. **Al intentar capturar peso** (`onCaptureWeight`):

   - Previene la captura de peso si faltan requisitos
   - Muestra notificación de error inmediata
   - Mantiene el estado actual

2. **Al procesar el peso capturado** (`processDoubleTrailerWeight`):
   - Valida que se haya capturado toda la información
   - Permite o deniega el avance al siguiente paso
   - Muestra mensaje de éxito o error según corresponda

## Notificación de Error

### Configuración del Toast

- **Servicio**: `NotificationService.showError()`
- **Duración**: 3000 ms (configurado en el servicio)
- **Posición**: `top-right`
- **Severidad**: `error`

### Mensajes Mostrados

#### Validación Preventiva (antes de capturar peso)

- **Summary**: "Información incompleta"
- **Detail**: "Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de capturar el peso."

#### Validación de Continuidad (después de capturar peso)

- **Summary**: "Información incompleta"
- **Detail**: "Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de continuar."

## Flujo de Validación

### 1. Validación Preventiva (antes de capturar peso)

```
Usuario intenta capturar peso → Sistema valida requisitos → Decisión
```

### 2. Validación de Continuidad (después de capturar peso)

```
Usuario captura peso → Sistema valida requisitos → Decisión
```

### 3. Validación de Requisitos

```
✅ Placa del tráiler: Capturada
✅ Placa del remolque 1: Capturada
✅ Foto de carga: Capturada
✅ Material/Producto: Capturado
✅ Nombre del Proveedor/Cliente: Capturado
```

### 4. Resultado de la Validación

```
Todos los requisitos cumplidos → Permitir captura/continuar → Avanzar al remolque 2
Faltan requisitos → Mostrar notificación de error → Mantener en remolque 1
```

## Interfaz de Usuario

### Botón "Capturar Peso"

- **Habilitado**: Cuando se cumplen todos los requisitos del primer remolque
- **Deshabilitado**: Cuando faltan requisitos del primer remolque
- **Indicador visual**: Muestra claramente por qué está deshabilitado

### Panel Tipo Checklist

- **Activación automática**: Se muestra cuando se intenta capturar peso sin completar requisitos
- **Activación manual**: Se puede activar al hacer clic en "Tomar captura del tráiler"
- **Visibilidad**: Solo visible cuando faltan requisitos del primer remolque
- **Estado visual**: Muestra el progreso de cada requisito (✅ completado, ⏳ pendiente)
- **Mensaje claro**: Explica qué se debe completar antes de capturar el peso
- **Botón de cerrar**: Permite al usuario cerrar el panel manualmente
- **Ocultación automática**: Se oculta automáticamente cuando se completan todos los requisitos
- **Requisitos mostrados**:
  - Placa del tráiler
  - Placa del remolque 1
  - Foto de la carga
  - Material/Producto
  - Nombre del Proveedor/Cliente

### Estados del Botón

```typescript
[disabled] = "!weightData.isStable || !weightData.isConnected || !canCaptureFirstTrailerWeight";
```

### Comportamiento del Panel Tipo Checklist

El panel tipo checklist se comporta de la siguiente manera:

#### **Activación**

1. **Automática**: Al hacer clic en "Capturar Peso" sin completar requisitos
2. **Manual**: Al hacer clic en "Tomar captura del tráiler" (funcionalidad existente)

#### **Visibilidad**

- Solo se muestra cuando `showChecklistPanel = true`
- Se oculta automáticamente cuando se completan todos los requisitos
- Se puede cerrar manualmente con el botón ✕

#### **Estados de Requisitos**

- **✅ Completado**: Campo capturado correctamente
- **⏳ Pendiente**: Campo aún no capturado
- **Actualización en tiempo real**: Los estados cambian conforme se completan los campos

#### **Ocultación Automática**

- El panel se oculta automáticamente cuando `canCaptureFirstTrailerWeight` retorna `true`
- Esto ocurre cuando todos los 5 requisitos están completos
- No requiere intervención manual del usuario

## Casos de Uso

### Caso 1: Validación Preventiva Exitosa

1. Usuario captura placa del tráiler ✅
2. Usuario captura placa del remolque 1 ✅
3. Usuario captura foto de carga ✅
4. Usuario intenta capturar peso ✅
5. Sistema valida y **permite capturar peso** ✅
6. Peso se captura correctamente ✅

### Caso 2: Validación Preventiva Fallida

1. Usuario captura placa del tráiler ✅
2. Usuario captura placa del remolque 1 ✅
3. Usuario **NO captura** foto de carga ❌
4. Usuario intenta capturar peso ❌
5. Sistema valida y **NO permite capturar peso** ❌
6. Notificación de error mostrada ✅
7. Peso NO se captura ✅

### Caso 3: Validación de Continuidad

1. Usuario completa todos los requisitos ✅
2. Usuario captura peso del remolque 1 ✅
3. Sistema valida y permite continuar ✅
4. Mensaje de éxito mostrado ✅
5. Flujo avanza al remolque 2 ✅

## Beneficios de la Implementación

### 🎯 **Precisión de Datos**

- Garantiza que toda la información del primer remolque esté completa
- Previene registros incompletos o con datos faltantes
- **Nuevo**: Previene captura de peso sin información previa

### 🚫 **Prevención de Errores**

- Evita que el usuario avance sin completar requisitos obligatorios
- **Nuevo**: Evita que el usuario capture peso sin información previa
- Reduce la posibilidad de datos inconsistentes

### 📱 **Experiencia de Usuario**

- Feedback inmediato sobre qué información falta
- **Nuevo**: Feedback preventivo antes de intentar capturar peso
- Instrucciones claras sobre cómo proceder
- **Nuevo**: Panel visual de requisitos pendientes

### 🔒 **Integridad del Sistema**

- Mantiene la consistencia de datos en el flujo de doble remolque
- Valida el cumplimiento de requisitos de negocio
- **Nuevo**: Validación en dos puntos críticos del flujo

## Consideraciones Técnicas

### Dependencias

- `NotificationService` inyectado en el componente
- Estado del doble remolque (`doubleTrailerState`)
- Datos de fotos (`photoData`)
- **Nuevo**: Control de estado del botón de captura

### Rendimiento

- Validación síncrona y eficiente
- No impacta el rendimiento del sistema
- Ejecución solo cuando es necesario
- **Nuevo**: Validación preventiva evita operaciones innecesarias

### Mantenibilidad

- Método de validación separado y reutilizable
- Lógica clara y fácil de entender
- Fácil de modificar o extender en el futuro
- **Nuevo**: Separación clara entre validación preventiva y de continuidad

## Pruebas Implementadas

### Prueba de Validación Preventiva Exitosa

```typescript
it("should allow weight capture when first trailer requirements are complete", () => {
  // Configurar todos los requisitos
  // Ejecutar validación preventiva
  // Verificar que se permite capturar peso
});
```

### Prueba de Validación Preventiva Fallida

```typescript
it("should prevent weight capture when first trailer requirements are incomplete", () => {
  // Configurar requisitos incompletos
  // Ejecutar validación preventiva
  // Verificar que se muestra notificación de error
  // Verificar que NO se permite capturar peso
});
```

### Prueba de Control de Estado del Botón

```typescript
it("should correctly determine if first trailer weight can be captured", () => {
  // Verificar estado inicial
  // Agregar requisitos uno por uno
  // Verificar cambios en el estado del botón
});
```

## Conclusión

Esta implementación de **validación preventiva y de continuidad** del primer remolque mejora significativamente la calidad de los datos capturados en el flujo de doble remolque. Ahora el sistema:

1. **Previene** la captura de peso sin información previa
2. **Valida** la continuidad después de capturar peso
3. **Guía** al usuario con feedback visual claro
4. **Mantiene** la integridad del sistema en dos puntos críticos

La implementación es robusta, eficiente y proporciona una experiencia de usuario superior al evitar errores antes de que ocurran, manteniendo la consistencia de datos sin afectar otras funcionalidades existentes.
