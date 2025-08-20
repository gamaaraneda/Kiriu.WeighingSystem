# 📡 Ejemplos de API Actualizados

## Cambio Importante: TipoUnidad es Parámetro de Entrada

El campo `TipoUnidad` ahora es un **parámetro obligatorio** en las peticiones de entrada, en lugar de ser calculado automáticamente por el servidor.

---

## 🚛 1. Crear Operación de Entrada

### Endpoint
```http
POST /api/weighing/entry
```

### Request Body - Remolque Simple
```json
{
  "unitType": "client",
  "operationType": "entry",
  "tipoUnidad": "remolque",
  "trailerPlate": "ABC-123",
  "product": "Maíz",
  "clientProviderName": "Transportes González",
  "clientProviderRfc": "TGO123456789",
  "entryWeight": 15000.50,
  "photos": {
    "trailerPlate": "url_foto_placa_trailer",
    "cargo": "url_foto_carga"
  }
}
```

### Request Body - Contenedor
```json
{
  "unitType": "provider",
  "operationType": "entry",
  "tipoUnidad": "contenedor",
  "trailerPlate": "DEF-456",
  "trailerPlateContenedor": "CONT-789",
  "remolquePlateContenedor": "REM-456",
  "product": "Fertilizante",
  "clientProviderName": "Logística del Norte",
  "entryWeight": 22000.00,
  "photos": {
    "trailerPlate": "url_foto_trailer",
    "cargo": "url_foto_carga"
  }
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "folio": "KWS-20250820-143025-456",
    "unitType": "client",
    "operationType": "entry",
    "trailerPlate": "ABC-123",
    "product": "Maíz",
    "clientProviderName": "Transportes González",
    "entryWeight": 15000.50,
    "status": "ENTRADA_REGISTRADA",
    "tipoUnidad": "remolque",
    "createdAt": "2025-08-20T14:30:25Z",
    "updatedAt": "2025-08-20T14:30:25Z"
  },
  "message": "Operación de entrada registrada exitosamente"
}
```

---

## 🚚 2. Crear Entrada con Doble Remolque

### Endpoint
```http
POST /api/weighing/entry/double-trailer
```

### Request Body
```json
{
  "unitType": "client",
  "tipoUnidad": "doble-remolque",
  "trailerPlaca": "TRAIL-789",
  "remolques": [
    {
      "numero": 1,
      "placa": "REM1-123",
      "pesoBruto": 8000.00,
      "fotos": ["url_foto_rem1_placa", "url_foto_rem1_carga"],
      "pesoCapturado": true,
      "fotosCapturadas": true,
      "fotoCargaCapturada": true,
      "fotoPlacaCapturada": true
    },
    {
      "numero": 2,
      "placa": "REM2-456",
      "pesoBruto": 9500.50,
      "fotos": ["url_foto_rem2_placa", "url_foto_rem2_carga"],
      "pesoCapturado": true,
      "fotosCapturadas": true,
      "fotoCargaCapturada": true,
      "fotoPlacaCapturada": true
    }
  ],
  "pesoBrutoTotal": 17500.50,
  "product": "Arena",
  "clientProviderName": "Construcciones del Sur"
}
```

---

## 🔍 3. Buscar Entrada por Placa

### Endpoint
```http
GET /api/weighing/entry/search?placa=ABC-123
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2025-08-20T14:30:25Z",
    "tipoUnidad": "remolque",
    "clientProviderName": "Transportes González",
    "product": "Maíz",
    "entryWeight": 15000.50,
    "status": "ENTRADA_REGISTRADA",
    "placaTrailer": "ABC-123",
    "placaRemolque": null,
    "placaRemolque1": null,
    "placaRemolque2": null,
    "placaTrailerContenedor": null,
    "placaRemolqueContenedor": null,
    "fotos": {
      "fotoEntradaTrailer": "url_foto_placa_trailer",
      "fotoEntradaRemolque": null,
      "fotoEntradaRemolque1": null,
      "fotoEntradaRemolque2": null,
      "fotoCargaEntrada": "url_foto_carga"
    }
  },
  "message": "Registro de entrada encontrado"
}
```

---

## 📋 4. Listar Operaciones

### Endpoint
```http
GET /api/weighing/operations?page=1&size=10&status=ENTRADA_REGISTRADA
```

### Response
```json
{
  "success": true,
  "data": {
    "operations": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "folio": "KWS-20250820-143025-456",
        "unitType": "client",
        "operationType": "entry",
        "trailerPlate": "ABC-123",
        "product": "Maíz",
        "clientProviderName": "Transportes González",
        "entryWeight": 15000.50,
        "exitWeight": null,
        "netWeight": null,
        "status": "ENTRADA_REGISTRADA",
        "tipoUnidad": "remolque",
        "createdAt": "2025-08-20T14:30:25Z",
        "updatedAt": "2025-08-20T14:30:25Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Operaciones obtenidas exitosamente"
}
```

---

## ✅ Validaciones del Campo TipoUnidad

### Valores Permitidos:
- `"remolque"` - Para operaciones de remolque simple
- `"contenedor"` - Para operaciones con contenedor
- `"doble-remolque"` - Para operaciones con múltiples remolques

### Validaciones Aplicadas:
- ✅ **Campo obligatorio** en todas las peticiones de entrada
- ✅ **Valores específicos** - solo acepta los 3 tipos definidos
- ✅ **Consistencia** - el valor se mantiene en toda la operación
- ✅ **Retorno** - se incluye en todas las respuestas de búsqueda

---

## 🎯 Beneficios del Cambio

1. **Control del Cliente**: El frontend/cliente determina el tipo de operación
2. **Flexibilidad**: Permite casos especiales o configuraciones personalizadas
3. **Simplicidad**: No hay lógica compleja de determinación automática
4. **Consistencia**: El tipo se define una vez y se mantiene
5. **Claridad**: Explicitly definido en cada petición

---

## 🚨 Cambios Necesarios en el Frontend

### Antes (Automático):
```javascript
// El servidor calculaba automáticamente el tipoUnidad
const request = {
  unitType: "client",
  trailerPlate: "ABC-123",
  // ... otros campos
};
```

### Ahora (Explícito):
```javascript
// El cliente debe especificar el tipoUnidad
const request = {
  unitType: "client",
  tipoUnidad: "remolque", // ← NUEVO CAMPO OBLIGATORIO
  trailerPlate: "ABC-123",
  // ... otros campos
};
```

### Implementación en Frontend:
```javascript
// Ejemplo de selección en la UI
const tipoUnidadOptions = [
  { value: 'remolque', label: 'Remolque Simple' },
  { value: 'contenedor', label: 'Contenedor' },
  { value: 'doble-remolque', label: 'Doble Remolque' }
];

// En el formulario
<select name="tipoUnidad" required>
  <option value="">Seleccione tipo de unidad</option>
  {tipoUnidadOptions.map(option => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```

¡El sistema ahora es más flexible y le da control completo al cliente sobre el tipo de operación! 🎉