# Implementación de Lógica de Cálculo de Peso Neto

## Descripción

Este documento describe la implementación de la lógica de negocio para el cálculo del peso neto en el registro de salida del sistema de pesaje, basándose en el tipo de unidad (proveedor o cliente).

## 🎯 **Lógica de Negocio Implementada**

### **Proveedor (Entrada con Carga, Salida Vacío)**

- **Entrada**: Llega con material → Peso bruto ALTO
- **Salida**: Sale vacío → Peso tara BAJO
- **Peso neto**: `Peso bruto - Peso tara = Material descargado`

### **Cliente (Entrada Vacío, Salida con Carga)**

- **Entrada**: Llega vacío → Peso bruto BAJO
- **Salida**: Sale con material → Peso tara ALTO
- **Peso neto**: `Peso tara - Peso bruto = Material cargado`

## 🔧 **Cambios Implementados**

### 1. **Componente WeighingExitFormComponent**

#### **Obtención del Tipo de Unidad**

- Se agregó el método `getUnitTypeFromRoute()` para obtener el tipo de unidad del parámetro de la ruta
- Se llama en `ngOnInit()` para inicializar el tipo de unidad al cargar el componente

#### **Cálculo del Peso Neto Actualizado**

- Se modificó el método `calculateNetWeight()` para implementar la lógica de negocio
- **Para doble remolque**:
  - Proveedor: `pesoBruto - (pesoTaraRemolque1 + pesoTaraRemolque2)`
  - Cliente: `(pesoTaraRemolque1 + pesoTaraRemolque2) - pesoBruto`
- **Para otros tipos**:
  - Proveedor: `pesoBruto - pesoTara`
  - Cliente: `pesoTara - pesoBruto`

#### **Métodos de Descripción del Cálculo**

- `getNetWeightCalculationDescription()`: Descripción para tipos normales
- `getDoubleTrailerNetWeightCalculationDescription()`: Descripción para doble remolque

### 2. **Servicio WeighingService**

#### **Método updateOperationForExit Actualizado**

- Se modificó para calcular el peso neto según la lógica de negocio del tipo de unidad
- Mantiene la misma lógica que el componente de salida

### 3. **Interfaz de Usuario**

#### **Etiquetas Dinámicas**

- Las etiquetas del peso neto ahora muestran la lógica de cálculo correcta
- Se actualizan automáticamente según el tipo de unidad seleccionado

## 📁 **Archivos Modificados**

1. **`weighing-exit-form.component.ts`**

   - Agregado `getUnitTypeFromRoute()`
   - Modificado `calculateNetWeight()`
   - Agregados métodos de descripción del cálculo

2. **`weighing.service.ts`**

   - Modificado `updateOperationForExit()`

3. **`weighing-exit-form.component.html`**
   - Actualizadas etiquetas del peso neto para mostrar la lógica correcta

## 🚀 **Flujo de Funcionamiento**

### **1. Inicialización del Componente**

```typescript
ngOnInit() {
  this.initializeForm();
  this.setupWeightSimulation();
  this.getUnitTypeFromRoute(); // ← Nuevo: Obtiene tipo de unidad
}
```

### **2. Obtención del Tipo de Unidad**

```typescript
private getUnitTypeFromRoute(): void {
  this.route.params.subscribe(params => {
    this.unitType = params['unitType'] || '';
    this.unitTypeTitle = this.getUnitTypeDisplayName(this.unitType);
  });
}
```

### **3. Cálculo del Peso Neto**

```typescript
private calculateNetWeight(): void {
  if (this.unitType === 'provider') {
    // Proveedor: Peso bruto - Peso tara = Material descargado
    pesoNeto = this.entryData.entryWeight - exitWeight;
  } else {
    // Cliente: Peso tara - Peso bruto = Material cargado
    pesoNeto = exitWeight - this.entryData.entryWeight;
  }
}
```

## ✅ **Casos de Uso Cubiertos**

### **Proveedor (Provider)**

- **Escenario**: Entrada con carga pesada, salida vacía
- **Cálculo**: `Peso bruto - Peso tara = Material descargado`
- **Resultado**: Peso neto positivo que representa el material descargado

### **Cliente (Client)**

- **Escenario**: Entrada vacía, salida con carga pesada
- **Cálculo**: `Peso tara - Peso bruto = Material cargado`
- **Resultado**: Peso neto positivo que representa el material cargado

### **Tipos de Unidad Soportados**

- ✅ Remolque único
- ✅ Solo contenedor
- ✅ Doble remolque

## 🔍 **Validaciones Implementadas**

1. **Tipo de Unidad**: Se valida que el tipo de unidad sea 'client' o 'provider'
2. **Datos de Entrada**: Se verifica que existan datos de entrada antes del cálculo
3. **Pesos**: Se valida que los pesos sean números válidos
4. **Cálculo**: Se aplica la lógica correcta según el tipo de unidad

## 🎨 **Mejoras en la Interfaz**

### **Etiquetas Dinámicas**

- **Proveedor**: "Peso bruto menos peso tara (Material descargado)"
- **Cliente**: "Peso tara menos peso bruto (Material cargado)"

### **Descripciones Específicas**

- **Doble remolque**: Descripciones adaptadas para la suma de pesos tara
- **Tipos normales**: Descripciones para peso individual

## 🧪 **Pruebas Recomendadas**

1. **Flujo de Proveedor**:

   - Verificar que el peso neto se calcule como `bruto - tara`
   - Confirmar que las etiquetas muestren "Material descargado"

2. **Flujo de Cliente**:

   - Verificar que el peso neto se calcule como `tara - bruto`
   - Confirmar que las etiquetas muestren "Material cargado"

3. **Doble Remolque**:

   - Probar con ambos tipos de unidad
   - Verificar el cálculo con la suma de pesos tara

4. **Navegación**:
   - Confirmar que el tipo de unidad se obtenga correctamente de la ruta
   - Verificar que se mantenga durante toda la sesión

## 🔮 **Consideraciones Futuras**

1. **Persistencia**: El tipo de unidad se obtiene de la ruta, considerar almacenamiento en estado global
2. **Validaciones**: Agregar validaciones adicionales para pesos negativos o cero
3. **Auditoría**: Registrar el tipo de cálculo utilizado para auditoría
4. **Internacionalización**: Preparar para soporte multiidioma en las etiquetas

## 📝 **Notas de Implementación**

- Los cambios son retrocompatibles con la funcionalidad existente
- Se mantiene la estructura de datos actual
- No se requieren cambios en la base de datos
- La lógica se aplica tanto en el frontend como en el servicio mock
