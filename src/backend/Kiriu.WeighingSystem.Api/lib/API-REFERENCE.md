# MAPPS Control Device - Referencia Completa de la API

## Índice

1. [Clases Principales](#clases-principales)
2. [Interfaces](#interfaces)
3. [Eventos y Delegados](#eventos-y-delegados)
4. [Entidades de Base de Datos](#entidades-de-base-de-datos)
5. [Servicios](#servicios)
6. [Utilidades](#utilidades)

---

## Clases Principales

### ControlSerialGen

Clase principal que unifica el control de todos los dispositivos.

#### Propiedades Públicas

```csharp
public ConexionSerial conexionSerial { get; set; }
public ControlTeclados conexionTeclado { get; set; }
public Basculas conexionBascula { get; set; }
public ObservableCollection<PuertosSerial> Listaserial { get; set; }
```

#### Eventos

```csharp
// Eventos de Teclado
public event EventHandler<string> eventoNuevaTecla;
public event EventHandler<bool> eventoActivoTeclado;

// Eventos de Báscula
public event EventHandler<NuevoPesoEventArgs> NuevoPesoEvent;
public event EventHandler<string> PesoValidoDebug;
public event EventHandler<string> DatoRecibidoDebug;
public event EventHandler<string> RespuestaDeCambioProducto;
public event EventHandler<string> reportarTiempoTrascurrido;
public event EventHandler<string> reportarNoDatos;
public event EventHandler<string> estadisticasEstabilidad;
public event EventHandler<string> reportarConexionExitosa;
```

#### Métodos Públicos

```csharp
// Métodos de Conexión Serial
public async Task ListaSerial();

// Métodos de Teclado
public async Task ConectarTeclado();

// Métodos de Báscula
public void InicioBascula(ObservableCollection<ITipoBascula> _basculas);
public void ConectarTodasBasculas();
public void PesoSinBascula(int IdBascula, float peso);
public void EnviarCOMANDO(int IdBascula, string comando);
public void CerrarConexion(int IdBascula);
```

### Basculas

Clase para gestionar múltiples básculas simultáneamente.

#### Propiedades Públicas

```csharp
public ObservableCollection<IBascula> basculas { get; set; }
```

#### Eventos

```csharp
public event EventHandler<NuevoPesoEventArgs> NuevoPesoEvent;
public event EventHandler<string> PesoValidoDebug;
public event EventHandler<string> DatoRecibidoDebug;
public event EventHandler<string> RespuestaDeCambioProducto;
public event EventHandler<string> reportarTiempoTrascurrido;
public event EventHandler<string> estadisticasEstabilidad;
public event EventHandler<string> reportarNoDatos;
public event EventHandler<string> reportarConexionExitosa;
```

#### Métodos Públicos

```csharp
// Control Masivo
public bool ConectarTodas();
public bool DesconectarTodas();

// Control Individual
public async Task<bool> Conectar(int Id);
public bool Desconectar(int Id);

// Operaciones
public void PesoSinBascula(int IdBascula, float peso);
public void EnviarCOMANDO(int IdBascula, string comando);
```

### ControlTeclados

Clase para gestionar teclados conectados por puerto serial.

#### Propiedades Públicas

```csharp
public bool Estado { get; set; }
```

#### Eventos

```csharp
public event EventHandler<string> eventoNuevaTecla;
public event EventHandler<bool> eventoActivoTeclado;
```

#### Métodos Públicos

```csharp
public async Task _InicioConexion();
public InfoPuertos DameInformacionPuertosSeriales();
```

---

## Interfaces

### IBascula

Interfaz base para todas las básculas.

#### Propiedades

```csharp
int Id { get; }
bool Activa { get; }
```

#### Eventos

```csharp
event EventHandler<string> PesoValidoDebug;
event EventHandler<string> DatoRecibidoDebug;
event EventHandler<NuevoPesoEventArgs> NuevoPesoEvent;
event EventHandler<string> RespuestaDeCambioProducto;
event EventHandler<string> reportarTiempoTrascurrido;
event EventHandler<string> estadisticasEstabilidad;
event EventHandler<string> reportarNoDatos;
event EventHandler<string> reportarConexionExitosa;
```

#### Métodos

```csharp
Task<bool> Conectar();
void Desconectar();
Task<bool> estadoConexion();
Task<bool> EnviarComando(string itemProducto, string comando);
void PesoSinBascula(float peso);
```

### ITipoBascula

Interfaz para la configuración de básculas.

#### Propiedades Básicas

```csharp
int Id { get; set; }
string Descripcion { get; set; }
string CadenaInicial { get; set; }
string CadenaFinal { get; set; }
```

#### Propiedades de Comportamiento

```csharp
bool PasaPorCero { get; set; }
bool EnviaRepetidos { get; set; }
float MinimoPermitido { get; set; }
int TiempoEnMsActualizar { get; set; }
float multiplicador { get; set; }
```

#### Propiedades de Dispositivo

```csharp
int TIPODISPOSITIVO_ID { get; set; }
string TIPODISPOSITIVO { get; set; }
```

#### Propiedades de Muestreo

```csharp
int SALTO { get; set; }
int TOMAR { get; set; }
int TratamientoDeDatos { get; set; }
int MUESTRAS { get; set; }
float RANGO { get; set; }
```

#### Propiedades de Control

```csharp
float PUNTOCONTROL1 { get; set; }
float PUNTOCONTROL2 { get; set; }
float MINIMOPARAREGISTRO { get; set; }
```

#### Métodos

```csharp
IBascula Crear();
```

### IWeighingMachineService

Interfaz del servicio de básculas.

#### Métodos

```csharp
Task<ObservableCollection<ITipoBascula>> GetWeighingMachinesAsync();
```

---

## Eventos y Delegados

### NuevoPesoEventArgs

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

---

## Entidades de Base de Datos

### DevicesDbContext

Contexto de Entity Framework para acceso a datos.

#### Propiedades DbSet

```csharp
public DbSet<SdmC02Bascula> Basculas { get; set; }
public DbSet<SdmC03ConfigSerial> ConfiguracionesSeriales { get; set; }
public DbSet<SdmC17ConfigTcp> ConfiguracionesTcp { get; set; }
public DbSet<SdbC13Tenant> Tenants { get; set; }
public DbSet<SdmC01Estacion> Estaciones { get; set; }
public DbSet<SdbC01Lines> Lines { get; set; }
```

#### Constructor

```csharp
public DevicesDbContext(string connectionString)
```

#### Métodos

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
```

### Entidades Principales

#### SdmC02Bascula

- Configuración principal de básculas
- Relaciones con configuraciones seriales y TCP

#### SdmC03ConfigSerial

- Configuración de conexiones seriales
- Parámetros de comunicación serial

#### SdmC17ConfigTcp

- Configuración de conexiones TCP
- Parámetros de red

#### SdbC13Tenant

- Información de inquilinos del sistema

#### SdmC01Estacion

- Configuración de estaciones de trabajo

#### SdbC01Lines

- Configuración de líneas de producción

---

## Servicios

### WeighingMachineService

Servicio para obtener y gestionar básculas desde la base de datos.

#### Constructor

```csharp
public WeighingMachineService(DevicesDbContext context)
```

#### Métodos Públicos

```csharp
public async Task<ObservableCollection<ITipoBascula>> GetWeighingMachinesAsync()
```

#### Métodos Privados

```csharp
private ITipoBascula MapToSerialBascula(SdmC02Bascula weighingMachine)
private ITipoBascula MapToTcpBascula(SdmC02Bascula weighingMachine)
```

---

## Utilidades

### LoggingManager

Gestor de logging de la aplicación.

#### Métodos Estáticos

```csharp
public static LogFileProvider GetLogger()
```

### Converters

Utilidades de conversión de datos.

### DataTypeExtensions

Extensiones para tipos de datos.

---

## Tipos de Básculas Implementadas

### TipoBasculaSerial

Báscula conectada por puerto serial.

#### Propiedades Específicas

```csharp
public int ReadTimeout { get; set; }
public int WriteTimeout { get; set; }
public int BaudRate { get; set; }
public Parity Paridad { get; set; }
public ushort BitsDatos { get; set; }
public StopBits BitsParada { get; set; }
public int NumeroPuerto { get; set; }
public Handshake ControlFlujo { get; set; }
```

### TipoBasculaTcp

Báscula conectada por TCP/IP.

#### Propiedades Específicas

```csharp
public string Ip { get; set; }
public int Puerto { get; set; }
```

### TipoBasculaUdp

Báscula conectada por UDP.

#### Propiedades Específicas

```csharp
public string Ip { get; set; }
public int Puerto { get; set; }
```

---

## Excepciones

### ListenServiceExceptions

Excepciones específicas del servicio de escucha.

---

## Configuración de Comunicación

### Parámetros Seriales

- **BaudRate**: Velocidad de transmisión (ej: 9600, 19200, 38400)
- **Paridad**: Tipo de paridad (None, Even, Odd, Mark, Space)
- **BitsDatos**: Número de bits de datos (5, 6, 7, 8)
- **BitsParada**: Bits de parada (One, Two, OnePointFive)
- **ControlFlujo**: Control de flujo (None, XOnXOff, RequestToSend, RequestToSendXOnXOff)

### Parámetros TCP/UDP

- **IP**: Dirección IP del dispositivo
- **Puerto**: Puerto de comunicación
- **Timeouts**: Timeouts de conexión y lectura

### Parámetros de Báscula

- **CadenaInicial**: Cadena que indica inicio de datos
- **CadenaFinal**: Cadena que indica fin de datos
- **MinimoPermitido**: Peso mínimo para considerar válido
- **PasaPorCero**: Si permite pasar por cero
- **EnviaRepetidos**: Si envía datos repetidos
- **multiplicador**: Factor de multiplicación del peso
- **TiempoEnMsActualizar**: Intervalo de actualización en milisegundos

---

## Patrones de Uso Recomendados

### 1. Inicialización Segura

```csharp
try
{
    var control = new ControlSerialGen();
    await control.ListaSerial();

    var service = new WeighingMachineService(dbContext);
    var machines = await service.GetWeighingMachinesAsync();

    control.InicioBascula(machines);
    control.ConectarTodasBasculas();
}
catch (Exception ex)
{
    // Manejar errores de inicialización
}
```

### 2. Manejo de Eventos

```csharp
control.NuevoPesoEvent += (sender, e) =>
{
    var peso = e.Peso.Last();
    var id = e.IdDispositivo;
    // Procesar peso
};

control.reportarConexionExitosa += (sender, e) =>
{
    // Notificar conexión exitosa
};
```

### 3. Limpieza de Recursos

```csharp
public void Dispose()
{
    control?.conexionBascula?.DesconectarTodas();
    control?.conexionTeclado?.Dispose();
}
```

---

## Notas de Implementación

1. **Thread Safety**: Los eventos se disparan en el hilo principal
2. **Async/Await**: Usar async/await para operaciones de conexión
3. **Error Handling**: Siempre implementar manejo de excepciones
4. **Resource Management**: Desconectar dispositivos al finalizar
5. **Logging**: Los logs se escriben automáticamente
6. **Configuration**: La configuración se lee desde la base de datos SQLite

---

## Versiones y Compatibilidad

- **Framework**: .NET 8.0
- **Entity Framework**: 7.0.13
- **SQLite**: Incluido en EF Core
- **System.IO.Ports**: 8.0.0
- **Serilog**: 8.0.3

---

**Última actualización**: Basado en el análisis del código actual del proyecto.
