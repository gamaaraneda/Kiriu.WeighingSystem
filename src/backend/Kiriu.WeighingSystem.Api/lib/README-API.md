# MAPPS Control Device - Guía de Uso para Desarrolladores

## Introducción

Esta guía está diseñada para desarrolladores que necesiten integrar la biblioteca **MAPPS Control Device** en sus aplicaciones. La DLL proporciona funcionalidades para el control de básculas y teclados industriales.

## Instalación y Configuración

### 1. Referenciar la DLL

```csharp
// Agregar referencia a la DLL
using Mapps.Control.Devices.Library;
using Mapps.Control.Devices.Library.ControlBascula;
using Mapps.Control.Devices.Library.Data;
using Mapps.Control.Devices.Library.Services;
```

### 2. Configurar la Base de Datos

```csharp
// Configurar la cadena de conexión
var connectionString = "Data Source=C:\\ControlDevices\\Data\\ControlDevices.db";
var dbContext = new DevicesDbContext(connectionString);

// Asegurar que la base de datos existe
dbContext.Database.EnsureCreated();
```

## Uso Básico

### 1. Inicialización del Control General

```csharp
// Crear instancia del control general
var controlSerialGen = new ControlSerialGen();

// Obtener lista de puertos seriales disponibles
await controlSerialGen.ListaSerial();

// Obtener básculas desde la base de datos
var service = new WeighingMachineService(dbContext);
var weighingMachines = await service.GetWeighingMachinesAsync();

// Inicializar control de básculas
controlSerialGen.InicioBascula(weighingMachines);
```

### 2. Suscribirse a Eventos

```csharp
// Eventos de peso
controlSerialGen.NuevoPesoEvent += OnNuevoPeso;
controlSerialGen.PesoValidoDebug += OnPesoValidoDebug;
controlSerialGen.DatoRecibidoDebug += OnDatoRecibidoDebug;

// Eventos de conexión
controlSerialGen.reportarConexionExitosa += OnConexionExitosa;
controlSerialGen.reportarNoDatos += OnNoDatos;

// Eventos de control
controlSerialGen.RespuestaDeCambioProducto += OnRespuestaCambioProducto;
controlSerialGen.reportarTiempoTrascurrido += OnTiempoTrascurrido;
controlSerialGen.estadisticasEstabilidad += OnEstadisticasEstabilidad;

// Eventos de teclado (si se usa)
controlSerialGen.eventoNuevaTecla += OnNuevaTecla;
controlSerialGen.eventoActivoTeclado += OnActivoTeclado;
```

### 3. Implementación de Event Handlers

```csharp
private void OnNuevoPeso(object sender, NuevoPesoEventArgs e)
{
    Console.WriteLine($"Nuevo peso: {e.Peso.Last()} kg de la báscula {e.IdDispositivo}");
    // Procesar el peso recibido
}

private void OnPesoValidoDebug(object sender, string e)
{
    Console.WriteLine($"Peso válido: {e}");
    // Logging o procesamiento adicional
}

private void OnDatoRecibidoDebug(object sender, string e)
{
    Console.WriteLine($"Datos recibidos: {e}");
    // Debugging de datos raw
}

private void OnConexionExitosa(object sender, string e)
{
    Console.WriteLine($"Conexión exitosa: {e}");
    // Notificar conexión establecida
}

private void OnNoDatos(object sender, string e)
{
    Console.WriteLine($"Sin datos: {e}");
    // Manejar falta de datos
}
```

## Métodos Principales Disponibles

### Control de Básculas

#### Conectar/Desconectar

```csharp
// Conectar todas las básculas
controlSerialGen.ConectarTodasBasculas();

// Conectar báscula específica
await controlSerialGen.conexionBascula.Conectar(basculaId);

// Desconectar báscula específica
controlSerialGen.conexionBascula.Desconectar(basculaId);

// Desconectar todas las básculas
controlSerialGen.conexionBascula.DesconectarTodas();
```

#### Envío de Comandos

```csharp
// Enviar comando a báscula específica
controlSerialGen.EnviarCOMANDO(basculaId, "COMANDO_ESPECIFICO");

// Ejemplo: Enviar comando de tara
controlSerialGen.EnviarCOMANDO(1, "TARA");

// Ejemplo: Enviar comando de calibración
controlSerialGen.EnviarCOMANDO(1, "CALIBRAR");
```

#### Simulación de Peso

```csharp
// Simular peso sin báscula física (para testing)
controlSerialGen.PesoSinBascula(basculaId, 25.5f);
```

### Control de Teclados

```csharp
// Conectar teclado
await controlSerialGen.ConectarTeclado();

// Obtener información de puertos seriales
var infoPuertos = controlSerialGen.conexionTeclado.DameInformacionPuertosSeriales();
```

## Configuración de Básculas

### Tipos de Básculas Soportadas

#### 1. Báscula Serial (`TipoBasculaSerial`)

```csharp
var basculaSerial = new TipoBasculaSerial
{
    Id = 1,
    Descripcion = "Báscula Principal",
    NumeroPuerto = 1,
    BaudRate = 9600,
    Paridad = Parity.None,
    BitsDatos = 8,
    BitsParada = StopBits.One,
    ControlFlujo = Handshake.None,
    CadenaInicial = "ST",
    CadenaFinal = "ET",
    MinimoPermitido = 0.1f,
    PasaPorCero = true,
    EnviaRepetidos = false,
    multiplicador = 1.0f,
    TiempoEnMsActualizar = 500
};
```

#### 2. Báscula TCP (`TipoBasculaTcp`)

```csharp
var basculaTcp = new TipoBasculaTcp
{
    Id = 2,
    Descripcion = "Báscula Remota",
    Ip = "192.168.1.100",
    Puerto = 8080,
    CadenaInicial = "ST",
    CadenaFinal = "ET",
    MinimoPermitido = 0.1f,
    PasaPorCero = true,
    EnviaRepetidos = false,
    multiplicador = 1.0f,
    TiempoEnMsActualizar = 50
};
```

## Manejo de Errores

### Patrón de Manejo de Excepciones

```csharp
try
{
    // Operaciones con básculas
    controlSerialGen.ConectarTodasBasculas();
}
catch (Exception ex)
{
    Console.WriteLine($"Error al conectar básculas: {ex.Message}");
    // Implementar logging o manejo específico
}
```

### Verificación de Estado

```csharp
// Verificar si una báscula está activa
var bascula = controlSerialGen.conexionBascula.basculas
    .FirstOrDefault(b => b.Id == basculaId);

if (bascula != null && bascula.Activa)
{
    // La báscula está conectada y activa
    Console.WriteLine($"Báscula {basculaId} está activa");
}
else
{
    Console.WriteLine($"Báscula {basculaId} no está activa");
}
```

## Ejemplos de Uso Completo

### Ejemplo 1: Aplicación Básica de Pesaje

```csharp
class Program
{
    static async Task Main(string[] args)
    {
        // Configuración inicial
        var connectionString = "Data Source=ControlDevices.db";
        var dbContext = new DevicesDbContext(connectionString);
        dbContext.Database.EnsureCreated();

        var service = new WeighingMachineService(dbContext);
        var weighingMachines = await service.GetWeighingMachinesAsync();

        var controlSerialGen = new ControlSerialGen();
        await controlSerialGen.ListaSerial();
        controlSerialGen.InicioBascula(weighingMachines);

        // Suscribirse a eventos
        controlSerialGen.NuevoPesoEvent += OnNuevoPeso;
        controlSerialGen.reportarConexionExitosa += OnConexionExitosa;

        // Conectar básculas
        controlSerialGen.ConectarTodasBasculas();

        Console.WriteLine("Presiona Enter para salir...");
        Console.ReadLine();

        // Limpieza
        controlSerialGen.conexionBascula.DesconectarTodas();
    }

    static void OnNuevoPeso(object sender, NuevoPesoEventArgs e)
    {
        var peso = e.Peso.Last();
        var idDispositivo = e.IdDispositivo;
        Console.WriteLine($"Peso: {peso} kg - Báscula: {idDispositivo}");
    }

    static void OnConexionExitosa(object sender, string e)
    {
        Console.WriteLine($"Conexión establecida: {e}");
    }
}
```

### Ejemplo 2: Control Avanzado con Múltiples Básculas

```csharp
class AdvancedWeighingControl
{
    private ControlSerialGen _control;
    private Dictionary<int, float> _ultimosPesos = new Dictionary<int, float>();

    public async Task InitializeAsync()
    {
        var dbContext = new DevicesDbContext("Data Source=ControlDevices.db");
        var service = new WeighingMachineService(dbContext);
        var weighingMachines = await service.GetWeighingMachinesAsync();

        _control = new ControlSerialGen();
        await _control.ListaSerial();
        _control.InicioBascula(weighingMachines);

        // Suscribirse a eventos
        _control.NuevoPesoEvent += OnNuevoPeso;
        _control.PesoValidoDebug += OnPesoValidoDebug;
        _control.reportarConexionExitosa += OnConexionExitosa;

        // Conectar todas las básculas
        _control.ConectarTodasBasculas();
    }

    public async Task<bool> ConectarBascula(int basculaId)
    {
        try
        {
            return await _control.conexionBascula.Conectar(basculaId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al conectar báscula {basculaId}: {ex.Message}");
            return false;
        }
    }

    public void EnviarComando(int basculaId, string comando)
    {
        try
        {
            _control.EnviarCOMANDO(basculaId, comando);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al enviar comando: {ex.Message}");
        }
    }

    public float ObtenerUltimoPeso(int basculaId)
    {
        return _ultimosPesos.TryGetValue(basculaId, out var peso) ? peso : 0f;
    }

    private void OnNuevoPeso(object sender, NuevoPesoEventArgs e)
    {
        var peso = e.Peso.Last();
        var idDispositivo = e.IdDispositivo;

        _ultimosPesos[idDispositivo] = peso;

        Console.WriteLine($"Báscula {idDispositivo}: {peso} kg");

        // Lógica específica según el peso
        if (peso > 100)
        {
            Console.WriteLine($"Peso alto detectado en báscula {idDispositivo}");
        }
    }

    private void OnPesoValidoDebug(object sender, string e)
    {
        Console.WriteLine($"Debug - Peso válido: {e}");
    }

    private void OnConexionExitosa(object sender, string e)
    {
        Console.WriteLine($"Conexión exitosa: {e}");
    }

    public void Dispose()
    {
        _control?.conexionBascula?.DesconectarTodas();
    }
}
```

## Configuración de Logging

La biblioteca utiliza Serilog para logging. Los logs se escriben automáticamente y pueden configurarse:

```csharp
// Los logs se escriben automáticamente usando Mapps.Logify
// No es necesario configuración adicional para logging básico
```

## Consideraciones de Rendimiento

1. **Conexiones Concurrentes**: La biblioteca maneja múltiples conexiones simultáneas
2. **Eventos Asíncronos**: Los eventos se disparan de forma asíncrona para no bloquear la UI
3. **Timeouts**: Configurar timeouts apropiados para evitar bloqueos
4. **Recursos**: Siempre desconectar dispositivos al finalizar

## Troubleshooting

### Problemas Comunes

1. **Báscula no conecta**:

   - Verificar configuración de puerto
   - Comprobar permisos de acceso al puerto serial
   - Verificar que el puerto no esté en uso

2. **No se reciben datos**:

   - Verificar configuración de BaudRate
   - Comprobar cadenas inicial y final
   - Verificar conexión física

3. **Errores de base de datos**:
   - Verificar que la base de datos existe
   - Comprobar permisos de escritura
   - Verificar cadena de conexión

### Debugging

```csharp
// Habilitar eventos de debug
controlSerialGen.DatoRecibidoDebug += (sender, data) =>
{
    Console.WriteLine($"Datos raw: {data}");
};

controlSerialGen.PesoValidoDebug += (sender, data) =>
{
    Console.WriteLine($"Peso procesado: {data}");
};
```

## Soporte y Contacto

Para soporte técnico o preguntas sobre la implementación, contactar al equipo de desarrollo de MAPPS.

---

**Nota**: Esta documentación está basada en la versión actual de la biblioteca. Para obtener la información más actualizada, consultar la documentación interna del proyecto.
