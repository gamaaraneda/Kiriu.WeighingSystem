# Flujo de Entrada para Unidades con Doble Remolque

## Descripción General

Este documento describe la implementación del flujo de entrada para unidades con doble remolque en el sistema de pesaje Kiriu. El flujo está diseñado para guiar al operador paso a paso, asegurando que se capture toda la información necesaria antes de proceder al siguiente remolque.

## Características Principales

### ✅ Validación Secuencial
- **Remolque 1**: Debe completarse completamente antes de desbloquear el Remolque 2
- **Remolque 2**: Solo se activa cuando todos los datos del Remolque 1 están completos
- **Validación en tiempo real**: El sistema valida continuamente el estado de completitud

### 🔒 Control de Acceso
- Los campos del Remolque 2 permanecen deshabilitados hasta completar el Remolque 1
- Mensajes claros indican qué información falta para desbloquear la siguiente sección
- Indicadores visuales muestran el estado de cada remolque

### 📊 Seguimiento del Progreso
- Estado visual del paso actual (Tráiler → Remolque 1 → Remolque 2 → Completado)
- Indicadores de peso capturado para cada remolque
- Cálculo automático del peso total cuando ambos remolques están completos

## Flujo de Trabajo

### Paso 1: Selección del Tipo de Unidad
```
[ ] Solo contenedor
[x] Unidad con doble remolque  ← Seleccionar esta opción
```

### Paso 2: Datos del Tráiler
- **Campo requerido**: Placa del tráiler
- **Acción**: Capturar foto de la placa del tráiler
- **Resultado**: La placa se detecta automáticamente (OCR simulado)
- **Estado**: Avanza automáticamente al siguiente paso

### Paso 3: Remolque 1
**Campos requeridos:**
1. **Placa del remolque 1** - Capturar foto de la placa
2. **Producto/Material** - Ingresar nombre del material
3. **Nombre del cliente/proveedor** - Buscar o ingresar
4. **Foto de la carga** - Capturar foto del material
5. **Peso del remolque 1** - Capturar desde la báscula

**Validaciones:**
- Todos los campos deben estar completos
- El peso debe ser estable y conectado
- Solo se puede capturar peso cuando se cumplen todos los requisitos

**Resultado:**
- Sección del Remolque 2 se desbloquea automáticamente
- Mensaje: "Sube el segundo remolque para capturar su peso."

### Paso 4: Remolque 2
**Campos requeridos:**
1. **Placa del remolque 2** - Capturar foto de la placa
2. **Foto de la carga del remolque 2** - Capturar foto del material
3. **Peso del remolque 2** - Capturar desde la báscula

**Estado:**
- Solo activo cuando el Remolque 1 está completo
- Campos deshabilitados hasta completar el Remolque 1
- Mensaje de bloqueo: "Complete todos los datos del Remolque 1 para desbloquear esta sección"

### Paso 5: Resumen y Guardado
**Información mostrada:**
- Placa del tráiler
- Placa y peso del Remolque 1
- Placa y peso del Remolque 2
- **Peso total calculado** (Remolque 1 + Remolque 2)

**Acciones disponibles:**
- Botón "Guardar Entrada" habilitado
- Validación completa del formulario
- Generación del registro en la base de datos

## Validaciones del Sistema

### Validación del Remolque 1
```typescript
canProceedToRemolque2(): boolean {
  return !!(
    this.doubleTrailerState.trailerPlaca &&           // ✅ Placa del tráiler
    this.doubleTrailerState.remolque1.placa &&        // ✅ Placa del remolque 1
    this.photoData.cargo &&                           // ✅ Foto de la carga
    this.weighingForm.get('product')?.value &&        // ✅ Material/producto
    this.weighingForm.get('clientProviderName')?.value && // ✅ Nombre del cliente
    this.doubleTrailerState.remolque1.pesoCapturado   // ✅ Peso capturado
  );
}
```

### Validación para Captura de Peso
```typescript
canCaptureWeight(): boolean {
  if (!this.weighingForm.get('doubleTrailer')?.value) return true;
  
  if (this.doubleTrailerState.currentStep === 'remolque1') {
    return !!(
      this.doubleTrailerState.trailerPlaca &&
      this.doubleTrailerState.remolque1.placa &&
      this.photoData.cargo &&
      this.weighingForm.get('product')?.value &&
      this.weighingForm.get('clientProviderName')?.value
    );
  }
  
  return true;
}
```

## Estados del Sistema

### Estados del Flujo
```typescript
type DoubleTrailerStep = 'trailer' | 'remolque1' | 'remolque2' | 'complete';
```

### Estados de los Remolques
```typescript
interface RemolqueData {
  numero: number;           // 1 o 2
  placa: string;           // Placa del remolque
  pesoBruto: number;       // Peso capturado
  fotos: string[];         // Rutas de las fotos
  pesoCapturado?: boolean; // Estado del peso
  fotosCapturadas?: boolean; // Estado de las fotos
}
```

## Mensajes del Sistema

### Mensajes de Bloqueo
- **Remolque 2 bloqueado**: "Complete todos los datos del Remolque 1 para desbloquear esta sección"
- **Peso no capturable**: "Complete la información del primer remolque antes de capturar el peso"

### Mensajes de Desbloqueo
- **Remolque 2 desbloqueado**: "Sube el segundo remolque para capturar su peso."
- **Peso capturado**: "Peso del remolque 1: [X] kg. Ahora suba el segundo remolque."

### Mensajes de Completitud
- **Peso total calculado**: "Peso total: [X] kg. Puede proceder a guardar."
- **Entrada registrada**: "Entrada con doble remolque registrada exitosamente. Folio: [X]"

## Interfaz de Usuario

### Indicadores Visuales
- **Números de remolque**: Círculos azules con números 1 y 2
- **Estado bloqueado**: Badge rojo "Bloqueado" en el Remolque 2
- **Estado desbloqueado**: Mensaje verde de instrucciones
- **Peso capturado**: Indicador verde "✅ Capturado"
- **Peso pendiente**: Indicador amarillo "⏳ Pendiente"

### Colores y Estilos
- **Remolque activo**: Borde azul, fondo blanco
- **Remolque bloqueado**: Borde gris, fondo gris claro, opacidad reducida
- **Sección de resumen**: Fondo verde claro, borde verde
- **Mensajes de éxito**: Verde (#28a745)
- **Mensajes de advertencia**: Amarillo (#ffc107)
- **Mensajes de error**: Rojo (#dc3545)

## Casos de Uso

### Caso 1: Flujo Normal
1. Operador selecciona "Unidad con doble remolque"
2. Captura foto de la placa del tráiler
3. Completa datos del Remolque 1
4. Captura peso del Remolque 1
5. Sistema desbloquea Remolque 2
6. Completa datos del Remolque 2
7. Captura peso del Remolque 2
8. Sistema calcula peso total
9. Guarda la entrada

### Caso 2: Datos Incompletos
1. Operador intenta capturar peso sin completar datos
2. Sistema muestra mensaje de error
3. Panel de requisitos muestra qué falta
4. Remolque 2 permanece bloqueado
5. Operador completa datos faltantes
6. Sistema desbloquea automáticamente

### Caso 3: Cambio de Tipo de Unidad
1. Operador cambia de "Doble remolque" a "Solo contenedor"
2. Sistema resetea estado de doble remolque
3. Formulario vuelve a estado normal
4. Se pierden datos capturados (confirmación requerida)

## Consideraciones Técnicas

### Dependencias
- Angular Reactive Forms
- Servicio de pesaje (WeighingService)
- Servicio de mensajes (MessageService)
- Servicio de notificaciones (NotificationService)

### Performance
- Validaciones en tiempo real
- Actualización automática del estado
- Sin recargas de página
- Transiciones suaves entre estados

### Mantenibilidad
- Código modular y reutilizable
- Interfaces TypeScript bien definidas
- Métodos con responsabilidades claras
- Estilos CSS organizados por componentes

## Próximas Mejoras

### Funcionalidades Planificadas
- [ ] Captura real de fotos con cámara
- [ ] OCR real para detección de placas
- [ ] Validación de formato de placas
- [ ] Historial de operaciones
- [ ] Reportes y estadísticas

### Optimizaciones Técnicas
- [ ] Lazy loading de componentes
- [ ] Caché de datos del cliente/proveedor
- [ ] Validación offline
- [ ] Sincronización automática
- [ ] Logs de auditoría

## Soporte y Contacto

Para reportar problemas o solicitar mejoras en el flujo de doble remolque, contactar al equipo de desarrollo.

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Estado**: Implementado y probado
