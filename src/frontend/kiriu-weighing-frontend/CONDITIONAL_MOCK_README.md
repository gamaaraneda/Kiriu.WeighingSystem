# Mock Condicional del Servicio de Búsqueda de Entradas

## Descripción
Este documento describe la implementación del mock condicional del servicio de búsqueda de entradas por placa para el flujo de registro de salida del sistema de pesaje. El mock ahora responde de manera diferente según la placa ingresada, simulando los tres flujos principales del sistema.

## 🎯 **Comportamiento del Mock**

### ✅ **Placas Especiales (Siempre Exitosas)**

#### 🔹 **Placa: "1" – Remolque Único**
```typescript
{
  success: true,
  data: {
    folio: 'R001',
    tipoUnidad: 'remolque',
    cliente: 'Cliente Remolque',
    producto: 'Cemento',
    pesoBruto: 18000,
    status: 'ENTRADA_REGISTRADA',
    placaTrailer: 'REM-001',
    placaRemolque: 'REMOLQUE-001',
    fechaEntrada: '2024-01-10T10:00:00',
    fotos: {
      fotoEntradaTrailer: 'https://via.placeholder.com/...',
      fotoEntradaRemolque: 'https://via.placeholder.com/...',
      fotoCargaEntrada: 'https://via.placeholder.com/...'
    }
  },
  message: 'Registro de entrada encontrado'
}
```

#### 🔹 **Placa: "2" – Solo Contenedor**
```typescript
{
  success: true,
  data: {
    folio: 'SC001',
    tipoUnidad: 'contenedor',
    cliente: 'Cliente Contenedor',
    producto: 'Mineral',
    pesoBruto: 15000,
    status: 'ENTRADA_REGISTRADA',
    fechaEntrada: '2024-01-12T09:15:00',
    fotos: {
      fotoCargaEntrada: 'https://via.placeholder.com/...'
    }
  },
  message: 'Registro de entrada encontrado'
}
```

#### 🔹 **Placa: "3" – Doble Remolque**
```typescript
{
  success: true,
  data: {
    folio: 'DR001',
    tipoUnidad: 'doble-remolque',
    cliente: 'Cliente Doble',
    producto: 'Grava',
    pesoBruto: 32000,
    status: 'ENTRADA_REGISTRADA',
    placaTrailer: 'DR-TRAILER-001',
    placaRemolque1: 'DR-REM1',
    placaRemolque2: 'DR-REM2',
    fechaEntrada: '2024-01-14T14:30:00',
    fotos: {
      fotoEntradaTrailer: 'https://via.placeholder.com/...',
      fotoEntradaRemolque1: 'https://via.placeholder.com/...',
      fotoEntradaRemolque2: 'https://via.placeholder.com/...',
      fotoCargaEntrada: 'https://via.placeholder.com/...'
    }
  },
  message: 'Registro de entrada encontrado'
}
```

### ❌ **Otras Placas (Error Genérico)**
```typescript
{
  success: false,
  data: null,
  message: 'Registro no encontrado',
  errors: null,
  metadata: null
}
```

## 🔧 **Implementación Técnica**

### 📁 **Archivos Modificados**

#### 1. **`entry-search-mock.service.ts`**
- **Interfaz actualizada**: `EntrySearchResponse` con `data` opcional
- **Lógica condicional**: Función `generateMockResponse()` con switch por placa
- **Funciones específicas**:
  - `generateRemolqueUnicoResponse()`
  - `generateSoloContenedorResponse()`
  - `generateDobleRemolqueResponse()`
- **Helper**: `generateRandomDate()` para fechas consistentes

#### 2. **`weighing-exit-form.component.ts`**
- **Nueva propiedad**: `unitFlowType` para rastrear el tipo de flujo
- **Funciones helper**:
  - `getUnitFlowTypeDisplayName()`: Nombres de visualización
  - `shouldShowTrailerFields()`: Campos de remolque
  - `shouldShowDoubleTrailerFields()`: Campos de doble remolque
  - `shouldShowContainerFields()`: Campos de contenedor
- **UI adaptativa**: La interfaz se adapta según el tipo de unidad

### 🔄 **Flujo de Búsqueda**

1. **Usuario ingresa placa** (ej: "1", "2", "3")
2. **Servicio mock evalúa** la placa
3. **Respuesta condicional** según el tipo de unidad
4. **Componente adapta UI** basado en `unitFlowType`
5. **Formulario se puebla** con datos específicos del flujo

## 🎨 **Adaptación de la UI**

### 📱 **Campos Mostrados por Flujo**

#### **Remolque Único (Placa "1")**
- ✅ Placa del tráiler
- ✅ Placa del remolque
- ✅ Foto del tráiler
- ✅ Foto del remolque
- ✅ Foto de la carga
- ✅ Peso bruto de entrada

#### **Solo Contenedor (Placa "2")**
- ❌ Sin campos de placas
- ❌ Sin fotos de placas
- ✅ Solo foto de la carga
- ✅ Peso bruto de entrada

#### **Doble Remolque (Placa "3")**
- ✅ Placa del tráiler
- ✅ Placa del remolque 1
- ✅ Placa del remolque 2
- ✅ Foto del tráiler
- ✅ Foto del remolque 1
- ✅ Foto del remolque 2
- ✅ Foto de la carga
- ✅ Peso bruto de entrada

## 🧪 **Testing del Mock**

### 🔍 **Casos de Prueba**

1. **Placa "1"** → Debe mostrar campos de remolque único
2. **Placa "2"** → Debe mostrar solo campos de contenedor
3. **Placa "3"** → Debe mostrar campos de doble remolque
4. **Placa "ABC-123"** → Debe mostrar error "Registro no encontrado"
5. **Placa vacía** → Debe mostrar error de validación

### 📋 **Verificaciones por Flujo**

#### **Remolque Único**
- [ ] Folio: R001
- [ ] Tipo: Remolque Único
- [ ] Producto: Cemento
- [ ] Peso: 18,000 kg
- [ ] Campos de placas visibles
- [ ] Fotos de tráiler y remolque

#### **Solo Contenedor**
- [ ] Folio: SC001
- [ ] Tipo: Solo Contenedor
- [ ] Producto: Mineral
- [ ] Peso: 15,000 kg
- [ ] Sin campos de placas
- [ ] Solo foto de carga

#### **Doble Remolque**
- [ ] Folio: DR001
- [ ] Tipo: Doble Remolque
- [ ] Producto: Grava
- [ ] Peso: 32,000 kg
- [ ] Campos de doble remolque
- [ ] Fotos de ambos remolques

## 🚀 **Ventajas de la Implementación**

### ✅ **Desarrollo y Testing**
- **Flujos completos**: Prueba todos los tipos de unidad
- **UI adaptativa**: Verifica que la interfaz se adapte correctamente
- **Validaciones**: Prueba campos requeridos por flujo
- **Datos consistentes**: Cada flujo tiene datos específicos y realistas

### 🔧 **Mantenimiento**
- **Fácil modificación**: Cambiar datos por flujo es simple
- **Escalable**: Agregar nuevos flujos es directo
- **Documentado**: Código claro y bien comentado
- **Tipado**: TypeScript asegura consistencia de datos

## 🔮 **Próximos Pasos**

### 🔄 **Integración con Backend Real**
1. **Reemplazar servicio mock** por servicio real
2. **Mantener lógica de UI** adaptativa
3. **Ajustar interfaces** si es necesario
4. **Preservar funciones helper** para adaptación de UI

### 🧪 **Testing Avanzado**
1. **Unit tests** para cada función del mock
2. **Integration tests** para flujos completos
3. **E2E tests** para navegación y formularios
4. **Performance tests** para delays simulados

### 🎨 **Mejoras de UI**
1. **Indicadores visuales** del tipo de flujo activo
2. **Validaciones dinámicas** según el flujo
3. **Mensajes contextuales** por tipo de unidad
4. **Iconos y colores** para diferenciar flujos

## 📚 **Referencias**

- **Mock Service**: `src/app/features/weighing/services/entry-search-mock.service.ts`
- **Componente**: `src/app/features/weighing/pages/weighing-exit-form/weighing-exit-form.component.ts`
- **Tipos**: `src/app/features/weighing/types/weighing.types.ts`
- **README Original**: `ENTRY_SEARCH_MOCK_README.md`

---

**Nota**: Este mock está diseñado para desarrollo y testing. Para producción, reemplazar por el servicio real del backend.
