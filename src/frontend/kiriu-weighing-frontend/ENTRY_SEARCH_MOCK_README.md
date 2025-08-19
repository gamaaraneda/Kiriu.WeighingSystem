# Mock del Servicio de Búsqueda de Entradas

## Descripción
Este documento describe la implementación del mock temporal del servicio de búsqueda de entradas por placa para el flujo de registro de salida del sistema de pesaje.

## Archivos Implementados

### 1. `entry-search-mock.service.ts`
- **Ubicación**: `src/app/features/weighing/services/entry-search-mock.service.ts`
- **Propósito**: Servicio mock que simula la búsqueda de entradas por placa
- **Endpoint simulado**: `GET /api/salida/buscar?placa={placa}`

### 2. `weighing-exit-form.component.ts`
- **Ubicación**: `src/app/features/weighing/pages/weighing-exit-form/weighing-exit-form.component.ts`
- **Modificaciones**: Integración del servicio mock en la función `onSearchEntry()`

## Funcionalidad del Mock

### ✅ Características Implementadas
- **Respuesta siempre exitosa**: El servicio devuelve `success: true` para cualquier placa ingresada
- **Datos simulados realistas**: Genera información variada y coherente para cada búsqueda
- **Delay simulado**: Incluye un delay de 800ms para simular latencia de red
- **Integración completa**: Los datos mock se mapean correctamente al formulario de salida

### 🔄 Comportamiento del Mock
1. **Acepta cualquier placa**: No hay validaciones sobre el formato o existencia de la placa
2. **Genera datos únicos**: Cada búsqueda produce un folio único y datos diferentes
3. **Simula variabilidad**: 
   - Tipo de unidad: Cliente o Proveedor (aleatorio)
   - Cliente/Proveedor: Lista de nombres predefinidos
   - Producto: Lista de materiales de construcción
   - Peso bruto: Entre 15,000 y 35,000 kg
   - Fecha de entrada: Entre 2 y 7 días atrás
   - Remolque: 70% de probabilidad de tener remolque

### 📊 Estructura de Respuesta
```typescript
{
  success: true,
  data: {
    folio: 'FABC1234',           // Generado automáticamente
    fechaEntrada: '2024-01-15T08:32:00',
    tipoUnidad: 'cliente' | 'proveedor',
    cliente: 'Transportes García',
    producto: 'Arena',
    pesoBruto: 25000,
    placaTrailer: 'ABC-123',     // Placa ingresada por el usuario
    placaRemolque: 'XYZ-789',    // Opcional, generada aleatoriamente
    status: 'ENTRADA_REGISTRADA',
    fotos: {
      fotoEntradaTrailer: 'https://via.placeholder.com/...',
      fotoEntradaRemolque: 'https://via.placeholder.com/...',
      fotoCargaEntrada: 'https://via.placeholder.com/...'
    }
  },
  message: 'Registro de entrada encontrado',
  errors: null,
  metadata: null
}
```

## Uso en el Componente

### 🔍 Función de Búsqueda
```typescript
onSearchEntry(): void {
  const trailerPlate = this.exitForm.get('trailerPlate')?.value;
  
  // Usar el servicio mock
  this.entrySearchMockService.searchEntryByPlate(trailerPlate).subscribe({
    next: (response: EntrySearchResponse) => {
      // Convertir respuesta mock a WeighingOperation
      const mockOperation: WeighingOperation = { /* ... */ };
      
      // Poblar formulario y mostrar datos
      this.entryData = mockOperation;
      this.isEntryFound = true;
      this.populateFormWithEntryData(mockOperation);
    }
  });
}
```

### 🔄 Mapeo de Datos
Los datos del mock se mapean automáticamente a la interfaz `WeighingOperation` existente:
- `folio` → `id`
- `tipoUnidad` → `unitType` ('cliente' → 'client', 'proveedor' → 'provider')
- `cliente` → `clientProviderName`
- `producto` → `product`
- `pesoBruto` → `entryWeight`
- `placaTrailer` → `trailerPlate`
- `placaRemolque` → `trailerPlate2`

## Ventajas del Mock

### 🚀 Desarrollo y Testing
- **Desarrollo independiente**: Permite trabajar en el frontend sin depender del backend
- **Testing completo**: Facilita probar todos los flujos de la interfaz
- **Datos consistentes**: Los datos mock mantienen la estructura esperada por el formulario

### 🔧 Mantenimiento
- **Fácil de modificar**: Cambios en la estructura de datos se pueden hacer rápidamente
- **Configurable**: Parámetros como delays, probabilidades y listas de datos son ajustables
- **Documentado**: Código claro y comentado para futuras modificaciones

## Próximos Pasos

### 🔄 Integración con Backend Real
Cuando el backend esté listo, solo se necesita:
1. Reemplazar `EntrySearchMockService` por el servicio real
2. Ajustar la interfaz de respuesta si es necesario
3. Mantener la misma lógica de mapeo en el componente

### 🧪 Testing
- **Unit tests**: Crear tests para el servicio mock
- **Integration tests**: Verificar que el mapeo de datos funcione correctamente
- **E2E tests**: Probar el flujo completo de búsqueda y registro

## Notas Técnicas

### 📦 Dependencias
- **RxJS**: Para operadores `of` y `delay`
- **Angular**: Injectable service con `providedIn: 'root'`

### 🎯 Patrón de Diseño
- **Service Pattern**: Servicio dedicado para la funcionalidad mock
- **Interface Segregation**: Interfaces específicas para la respuesta mock
- **Dependency Injection**: Inyección del servicio en el componente

### 🔒 Seguridad
- **Datos simulados**: No hay riesgo de exponer datos reales
- **Validaciones**: El mock no valida entradas, solo simula respuestas exitosas
