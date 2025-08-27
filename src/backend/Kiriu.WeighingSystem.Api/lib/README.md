# MAPPS Control Device - Documentación Técnica

## Descripción General

**MAPPS Control Device** es una biblioteca .NET 8.0 diseñada para el control y gestión de dispositivos de pesaje (básculas) y teclados a través de conexiones seriales y TCP/IP. La solución proporciona una interfaz unificada para la comunicación con múltiples tipos de dispositivos industriales.

## Arquitectura de la Solución

### Estructura del Proyecto

```
MAPPS Control Device/
├── Mapps.Control.Devices.sln          # Solución principal
└── src/
    ├── Mapp.Control.Devices.Library/  # Biblioteca principal (DLL)
    │   ├── ControlBascula/            # Control de básculas
    │   ├── ControlTeclado/            # Control de teclados
    │   ├── Data/                      # Capa de datos (Entity Framework)
    │   ├── Services/                  # Servicios de negocio
    │   ├── Interfaces/                # Interfaces de servicios
    │   └── Managers/                  # Gestores de utilidades
    └── Mapps.Control.Devices.Console/ # Aplicación de consola de ejemplo
```

### Tecnologías Utilizadas

- **.NET 8.0** - Framework de desarrollo
- **Entity Framework Core 7.0.13** - ORM para acceso a datos
- **SQLite** - Base de datos local
- **System.IO.Ports** - Comunicación serial
- **Serilog** - Sistema de logging
- **Mapps.Logify** - Biblioteca de logging personalizada

## Componentes Principales

### 1. Control de Básculas (`ControlBascula/`)

#### Interfaces Principales

##### `IBascula`

Interfaz base para todas las básculas que define los eventos y métodos comunes:

```csharp
public interface IBascula
{
    // Eventos de peso y datos
    event EventHandler<NuevoPesoEventArgs> NuevoPesoEvent;
    event EventHandler<string> PesoValidoDebug;
    event EventHandler<string> DatoRecibidoDebug;

    // Eventos de control
    event EventHandler<string> RespuestaDeCambioProducto;
    event EventHandler<string> reportarTiempoTrascurrido;
    event EventHandler<string> estadisticasEstabilidad;
    event EventHandler<string> reportarNoDatos;
    event EventHandler<string> reportarConexionExitosa;

    // Propiedades
    int Id { get; }
    bool Activa { get; }

    // Métodos de conexión
    Task<bool> Conectar();
    void Desconectar();
    Task<bool> estadoConexion();

    // Métodos de control
    Task<bool> EnviarComando(string itemProducto, string comando);
    void PesoSinBascula(float peso);
}
```

##### `ITipoBascula`

Interfaz para la configuración de básculas:

```csharp
public interface ITipoBascula
{
    // Propiedades básicas
    int Id { get; set; }
    string Descripcion { get; set; }
    string CadenaInicial { get; set; }
    string CadenaFinal { get; set; }

    // Configuración de comportamiento
    bool PasaPorCero { get; set; }
    bool EnviaRepetidos { get; set; }
    float MinimoPermitido { get; set; }
    int TiempoEnMsActualizar { get; set; }
    float multiplicador { get; set; }

    // Configuración de dispositivo
    int TIPODISPOSITIVO_ID { get; set; }
    string TIPODISPOSITIVO { get; set; }

    // Configuración de muestreo
    int SALTO { get; set; }
    int TOMAR { get; set; }
    int TratamientoDeDatos { get; set; }
    int MUESTRAS { get; set; }
    float RANGO { get; set; }

    // Puntos de control
    float PUNTOCONTROL1 { get; set; }
    float PUNTOCONTROL2 { get; set; }
    float MINIMOPARAREGISTRO { get; set; }

    // Factory method
    IBascula Crear();
}
```

#### Tipos de Básculas Implementadas

1. **`TipoBasculaSerial`** - Básculas conectadas por puerto serial
2. **`TipoBasculaTcp`** - Básculas conectadas por TCP/IP
3. **`TipoBasculaUdp`** - Básculas conectadas por UDP

#### Clases de Control

##### `Basculas`

Clase principal para gestionar múltiples básculas:

```csharp
public class Basculas
{
    public ObservableCollection<IBascula> basculas { get; set; }

    // Eventos principales
    public event EventHandler<NuevoPesoEventArgs> NuevoPesoEvent;
    public event EventHandler<string> PesoValidoDebug;
    public event EventHandler<string> DatoRecibidoDebug;

    // Métodos de control masivo
    public bool ConectarTodas();
    public bool DesconectarTodas();

    // Métodos de control individual
    public async Task<bool> Conectar(int Id);
    public bool Desconectar(int Id);

    // Métodos de operación
    public void PesoSinBascula(int IdBascula, float peso);
    public void EnviarCOMANDO(int IdBascula, string comando);
}
```

### 2. Control de Teclados (`ControlTeclado/`)

#### `ControlTeclados`

Clase para gestionar teclados conectados por puerto serial:

```csharp
public class ControlTeclados
{
    public bool Estado { get; set; }

    // Eventos
    public event EventHandler<string> eventoNuevaTecla;
    public event EventHandler<bool> eventoActivoTeclado;

    // Métodos
    public async Task _InicioConexion();
    public InfoPuertos DameInformacionPuertosSeriales();
}
```

### 3. Capa de Datos (`Data/`)

#### `DevicesDbContext`

Contexto de Entity Framework para acceso a la base de datos SQLite:

```csharp
public class DevicesDbContext : DbContext
{
    public DbSet<SdmC02Bascula> Basculas { get; set; }
    public DbSet<SdmC03ConfigSerial> ConfiguracionesSeriales { get; set; }
    public DbSet<SdmC17ConfigTcp> ConfiguracionesTcp { get; set; }
    public DbSet<SdbC13Tenant> Tenants { get; set; }
    public DbSet<SdmC01Estacion> Estaciones { get; set; }
    public DbSet<SdbC01Lines> Lines { get; set; }
}
```

### 4. Servicios (`Services/`)

#### `WeighingMachineService`

Servicio principal para obtener y gestionar básculas desde la base de datos:

```csharp
public class WeighingMachineService : IWeighingMachineService
{
    public async Task<ObservableCollection<ITipoBascula>> GetWeighingMachinesAsync();
}
```

### 5. Control General (`ControlSerialGen`)

Clase principal que unifica el control de todos los dispositivos:

```csharp
public class ControlSerialGen
{
    // Componentes
    public ConexionSerial conexionSerial;
    public ControlTeclados conexionTeclado;
    public Basculas conexionBascula;

    // Eventos de teclado
    public event EventHandler<string> eventoNuevaTecla;
    public event EventHandler<bool> eventoActivoTeclado;

    // Eventos de báscula
    public event EventHandler<NuevoPesoEventArgs> NuevoPesoEvent;
    public event EventHandler<string> PesoValidoDebug;
    public event EventHandler<string> DatoRecibidoDebug;
    public event EventHandler<string> RespuestaDeCambioProducto;
    public event EventHandler<string> reportarTiempoTrascurrido;
    public event EventHandler<string> reportarNoDatos;
    public event EventHandler<string> estadisticasEstabilidad;
    public event EventHandler<string> reportarConexionExitosa;

    // Métodos principales
    public async Task ListaSerial();
    public async Task ConectarTeclado();
    public void InicioBascula(ObservableCollection<ITipoBascula> _basculas);
    public void ConectarTodasBasculas();
    public void PesoSinBascula(int IdBascula, float peso);
    public void EnviarCOMANDO(int IdBascula, string comando);
    public void CerrarConexion(int IdBascula);
}
```

## Eventos y Delegados

### Eventos de Peso

```csharp
public class NuevoPesoEventArgs : EventArgs
{
    public int IdDispositivo { get; set; }
    public float[] Peso { get; set; }
}
```

### Delegados Especializados

```csharp
public delegate void NuevoPesoEventHandler(Object sender, NuevoPesoEventArgs e);
public delegate void UltimoDatoInterpretado(float[] dato);
public delegate void TiempoTranscurrioUltimaInterpretacion(string tiempotranscurrido);
public delegate void ReportarNoDeDatos(string NoDeDatos);
public delegate void EstadisticasEstabilidad(int Muestras, float Rango, float LSC, float LIC, double DiferenciaLimites, int NumeroDeDatos);
public delegate void NumeroDeDatos(string NumDeDatos);
public delegate void ConexionExitosa(string NumDeDatos);
public delegate void LastInterpretedDataMultipleScales(Tuple<int, float> data);
```

## Configuración de Base de Datos

### Entidades Principales

1. **`SdmC02Bascula`** - Configuración de básculas
2. **`SdmC03ConfigSerial`** - Configuración de conexiones seriales
3. **`SdmC17ConfigTcp`** - Configuración de conexiones TCP
4. **`SdbC13Tenant`** - Información de inquilinos
5. **`SdmC01Estacion`** - Configuración de estaciones
6. **`SdbC01Lines`** - Configuración de líneas

### Migraciones

- `20240927002414_InitialCreate.cs` - Migración inicial

## Dependencias

### NuGet Packages

- `Microsoft.EntityFrameworkCore` (7.0.13)
- `Microsoft.EntityFrameworkCore.Sqlite` (7.0.13)
- `Serilog.AspNetCore` (8.0.3)
- `Serilog.Sinks.File` (6.0.0)
- `System.IO.Ports` (8.0.0)

### Referencias Locales

- `Mapps.Logify.dll` - Biblioteca de logging personalizada

## Configuración del Proyecto

### Target Framework

- .NET 8.0
- ImplicitUsings habilitado
- Nullable habilitado

### Configuración de Compilación

- Configuración optimizada para biblioteca
- Soporte para Entity Framework Design
- Herramientas de Entity Framework incluidas

## Consideraciones de Seguridad

1. **Manejo de Excepciones**: Todos los métodos incluyen manejo de excepciones con logging
2. **Validación de Datos**: Validación de parámetros en métodos críticos
3. **Logging**: Sistema de logging completo para auditoría y debugging
4. **Conexiones Seguras**: Soporte para configuraciones de seguridad en conexiones TCP

## Limitaciones Conocidas

1. **Dependencia de Mapps.Logify**: Requiere la DLL externa para logging
2. **Configuración de Ruta**: La ruta de la base de datos está hardcodeada en el ejemplo
3. **Versiones de EF**: Usa Entity Framework 7.0.13 en lugar de la versión 8.0

## Próximas Mejoras Sugeridas

1. Migración a Entity Framework 8.0
2. Implementación de inyección de dependencias
3. Configuración mediante archivos de configuración
4. Soporte para más tipos de dispositivos
5. Implementación de patrones de retry para conexiones
6. Mejora en el manejo de errores y logging
