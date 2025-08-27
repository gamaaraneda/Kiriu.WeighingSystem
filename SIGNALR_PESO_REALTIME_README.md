# Integración SignalR para Peso en Tiempo Real

## ✅ Implementación Completada

Se ha implementado exitosamente la conexión entre la DLL `Mapps.Control.Devices.Library.dll` y el frontend Angular usando SignalR para mostrar datos de peso de báscula en tiempo real.

## 🏗️ Arquitectura Implementada

### Backend (.NET)

1. **SignalR Hub** (`PesoHub.cs`)
   - Hub central para comunicación en tiempo real
   - Soporte para grupos (filtrar por báscula)
   - Localización: `src/backend/Kiriu.WeighingSystem.Api/Hubs/PesoHub.cs`

2. **Servicio de Peso en Tiempo Real** (`PesoRealtimeService.cs`)
   - Servicio de background que ejecuta continuamente
   - Carga dinámicamente la DLL usando reflexión
   - Inicializa `ControlSerialGen` y se conecta a básculas
   - Se suscribe al evento `NuevoPesoEvent`
   - Localización: `src/backend/Kiriu.WeighingSystem.Application/Services/PesoRealtimeService.cs`

3. **Configuración SignalR**
   - Configurado en `Program.cs` y extensiones
   - Hub mapeado en `/hubs/peso`
   - CORS configurado para desarrollo

### Frontend (Angular)

1. **Servicio de Peso en Tiempo Real** (`PesoRealtimeService`)
   - Maneja la conexión SignalR con el hub
   - Observable con throttling y `distinctUntilChanged`
   - Reconexión automática
   - Localización: `src/app/features/weighing/services/peso-realtime.service.ts`

2. **Integración en Componente**
   - Actualizado `WeighingFormComponent` para usar SignalR
   - Indicadores visuales de estado de conexión
   - Información de estabilidad del peso
   - Detección de cambios para mejor performance

3. **UI/UX Mejorada**
   - Indicador de conexión Online/Offline
   - Estado de estabilidad del peso
   - Botón de reconexión manual
   - Información de báscula (ID, timestamp)

## 🔧 Configuración Técnica

### Evento de Peso (NuevoPesoEventArgs)
```csharp
public int IdDispositivo { get; set; }    // ID de la báscula
public float[] Peso { get; set; }          // Array de pesos (último valor es el actual)
```

### Datos Enviados por SignalR
```json
{
  "id": 1,                    // ID de la báscula
  "peso": 1234.5,             // Peso actual en kg
  "timestamp": "2025-01-15T10:30:00Z"  // Timestamp UTC
}
```

### Observable con Optimizaciones
- **Throttling**: Máximo una actualización cada 100ms
- **DistinctUntilChanged**: Solo emite cuando el peso cambia
- **Reconexión automática**: SignalR maneja reconexiones
- **ChangeDetection**: Optimizada con `markForCheck()`

## 🚀 Funcionalidades Implementadas

### ✅ Backend
- [x] Hub SignalR (`PesoHub`)
- [x] Integración con DLL usando reflexión
- [x] Manejo del evento `NuevoPesoEvent`
- [x] Emisión automática de peso a clientes
- [x] Configuración de SignalR en pipeline
- [x] Servicio de background (`PesoRealtimeService`)
- [x] Cleanup automático de recursos

### ✅ Frontend
- [x] Servicio SignalR (`PesoRealtimeService`)
- [x] Conexión automática al hub
- [x] Observable optimizado con throttling
- [x] Estado de conexión en tiempo real
- [x] Integración en componente de pesaje
- [x] UI mejorada con indicadores visuales
- [x] Botón de reconexión manual
- [x] Información de báscula en tiempo real

## 📋 Flujo de Datos

1. **DLL → API**: `ControlSerialGen` recibe datos de báscula serial
2. **API → Hub**: `PesoRealtimeService` emite peso via SignalR
3. **Hub → Angular**: Cliente recibe peso en tiempo real
4. **Angular → UI**: Componente muestra peso actualizado

## 🔧 Configuración de Desarrollo

### Requisitos
- .NET 8.0
- Angular 20
- SignalR Client Library
- Acceso a puerto serial (para DLL)

### Archivos Clave Modificados

#### Backend
```
src/backend/Kiriu.WeighingSystem.Api/
├── Hubs/PesoHub.cs                     [NUEVO]
├── Program.cs                          [MODIFICADO]
└── Extensions/
    ├── ServiceCollectionExtensions.cs  [MODIFICADO]
    └── ApplicationBuilderExtensions.cs [MODIFICADO]

src/backend/Kiriu.WeighingSystem.Application/
└── Services/PesoRealtimeService.cs     [NUEVO]
```

#### Frontend
```
src/app/features/weighing/
├── services/peso-realtime.service.ts             [NUEVO]
└── pages/weighing-form/
    ├── weighing-form.component.ts                [MODIFICADO]
    ├── weighing-form.component.html              [MODIFICADO]
    └── weighing-form.component.scss              [MODIFICADO]

src/index.html                                    [MODIFICADO]
```

## 🧪 Testing

### Pruebas Automáticas
```bash
# Backend
cd src/backend
dotnet test

# Frontend  
cd src/frontend/kiriu-weighing-frontend
npm test
```

### Pruebas Manuales
1. **Iniciar API**: Verificar logs de inicialización de básculas
2. **Abrir navegador**: Navegar a componente de pesaje
3. **Verificar conexión**: Indicador debe mostrar "Online"
4. **Simular peso**: Debería actualizar en tiempo real
5. **Desconectar báscula**: UI debe mostrar estado "Offline"
6. **Reconectar**: Botón de reconexión debe funcionar

## ⚠️ Consideraciones Importantes

### Rendimiento
- Observable usa `throttleTime(100)` para evitar sobrecarga
- `ChangeDetectorRef.markForCheck()` para optimizar detección
- Cleanup automático de suscripciones en `ngOnDestroy`

### Estabilidad
- Reconexión automática de SignalR
- Manejo de errores con try-catch
- Logging detallado para debugging
- Cleanup de recursos en dispose

### Seguridad
- CORS configurado para desarrollo
- Validación de datos de entrada
- Manejo seguro de reflexión en DLL

## 🐛 Troubleshooting

### Backend No Conecta Básculas
```
Error: No se encontró la DLL en: [path]
```
**Solución**: Verificar que `Mapps.Control.Devices.Library.dll` esté en `/lib`

### Frontend No Recibe Datos
```
Conexión SignalR: Offline
```
**Solución**: 
1. Verificar que API esté ejecutándose
2. Verificar URL del hub (`/hubs/peso`)
3. Verificar CORS settings

### Peso No Se Actualiza
```
Peso siempre en 0 kg
```
**Solución**:
1. Verificar logs del `PesoRealtimeService`
2. Verificar conexión física de báscula
3. Verificar configuración de báscula en BD

## 🔄 Próximas Mejoras

### Funcionalidades Adicionales
- [ ] Filtros por báscula específica
- [ ] Histórico de peso en gráficas
- [ ] Alertas de peso (umbrales)
- [ ] Export de datos de peso
- [ ] Dashboard de múltiples básculas

### Optimizaciones Técnicas
- [ ] Compresión de mensajes SignalR
- [ ] Caché de última lectura
- [ ] Métricas de performance
- [ ] Tests de integración
- [ ] Configuración por ambiente

## 📞 Soporte

Para problemas técnicos:
1. Revisar logs del API (`PesoRealtimeService`)
2. Verificar consola del navegador (errores SignalR)
3. Validar estado de DLL y conexiones seriales
4. Contactar equipo de desarrollo

---

**Estado**: ✅ **IMPLEMENTACIÓN COMPLETA**  
**Fecha**: 2025-01-15  
**Autor**: Claude Code Integration  