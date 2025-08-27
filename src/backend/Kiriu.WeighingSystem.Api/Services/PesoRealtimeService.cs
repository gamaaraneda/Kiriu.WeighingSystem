using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Kiriu.WeighingSystem.Api.Hubs;
using Mapps.Control.Devices.Library;
using Mapps.Control.Devices.Library.Data;
using Mapps.Control.Devices.Library.Services;
using Mapps.Control.Devices.Library.ControlBascula;
using System.Collections.ObjectModel;

namespace Kiriu.WeighingSystem.Api.Services;

public class PesoRealtimeService : BackgroundService
{
    private readonly ILogger<PesoRealtimeService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private ControlSerialGen? _controlSerialGen;
    private bool _isInitialized;

    public PesoRealtimeService(
        ILogger<PesoRealtimeService> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await InitializeControlSerialGenAsync();
        
        while (!stoppingToken.IsCancellationRequested && !_isInitialized)
        {
            await Task.Delay(5000, stoppingToken);
            await InitializeControlSerialGenAsync();
        }

        while (!stoppingToken.IsCancellationRequested && _isInitialized)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    private async Task InitializeControlSerialGenAsync()
    {
        try
        {
            _logger.LogInformation("Inicializando conexión con básculas...");

            // Crear instancia directa de ControlSerialGen
            _controlSerialGen = new ControlSerialGen();
            
            _logger.LogInformation("Instancia de ControlSerialGen creada correctamente");

            // Configurar base de datos de control devices
            var controlDevicesDb = _configuration.GetConnectionString("ControlDevicesConnection");
            var dbPath = controlDevicesDb?.Replace("Data Source=", "");
            
            if (!string.IsNullOrEmpty(controlDevicesDb))
            {
                try
                {
                    _logger.LogInformation("Intentando conectar a la base de datos de control devices: {DbPath}", dbPath);
                    
                    // Asegurar que el directorio existe
                    if (!string.IsNullOrEmpty(dbPath))
                    {
                        var directory = Path.GetDirectoryName(dbPath);
                        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                        {
                            Directory.CreateDirectory(directory);
                            _logger.LogInformation("Directorio creado: {Directory}", directory);
                        }
                    }
                    
                    // Crear contexto y asegurar que la base de datos existe
                    using var dbContext = new DevicesDbContext(controlDevicesDb);
                    
                    // Crear la base de datos si no existe
                    if (dbContext.Database != null)
                    {
                        dbContext.Database.EnsureCreated();
                        _logger.LogInformation("Base de datos de control devices verificada/creada: {DbPath}", dbPath);
                    }

                    // Obtener básculas desde la base de datos
                    var weighingMachineService = new WeighingMachineService(dbContext);
                    var weighingMachines = await weighingMachineService.GetWeighingMachinesAsync();

                    // Inicializar control de básculas
                    _controlSerialGen.InicioBascula(weighingMachines);
                    _logger.LogInformation("Básculas inicializadas desde la base de datos: {Count} básculas encontradas", weighingMachines?.Count() ?? 0);
                }
                catch (Exception dbEx)
                {
                    _logger.LogWarning(dbEx, "Error al acceder/crear la base de datos. Inicializando sin configuración de básculas");
                    // Inicializar con lista vacía como fallback
                    _controlSerialGen.InicioBascula(new ObservableCollection<ITipoBascula>());
                }
            }
            else
            {
                _logger.LogWarning("Cadena de conexión de control devices no configurada. Inicializando sin configuración");
                // Inicializar con lista vacía como fallback
                _controlSerialGen.InicioBascula(new ObservableCollection<ITipoBascula>());
            }

            // Suscribirse al evento NuevoPesoEvent
            _controlSerialGen.NuevoPesoEvent += OnNuevoPeso;
            _logger.LogInformation("Evento NuevoPesoEvent suscrito correctamente");

            // Llamar a ListaSerial
            await _controlSerialGen.ListaSerial();
            _logger.LogInformation("ListaSerial ejecutado correctamente");

            // Configurar básculas
            await ConfigurarBasculasAsync();

            _isInitialized = true;
            _logger.LogInformation("ControlSerialGen inicializado correctamente");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al inicializar ControlSerialGen");
        }
    }

    private Task ConfigurarBasculasAsync()
    {
        try
        {
            // Conectar todas las básculas configuradas en la base de datos
            if (_controlSerialGen != null)
            {
                _controlSerialGen.ConectarTodasBasculas();
                _logger.LogInformation("Intentando conectar todas las básculas configuradas en la base de datos");
            }
            else
            {
                _logger.LogWarning("ControlSerialGen no está inicializado");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al configurar básculas");
        }
        
        return Task.CompletedTask;
    }

    private async void OnNuevoPeso(object? sender, NuevoPesoEventArgs e)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<PesoHub>>();

            // Obtener el último peso del array
            var pesoActual = e.Peso.LastOrDefault();

            // Emitir el peso a todos los clientes conectados
            await hubContext.Clients.All.SendAsync("pesoActualizado", new 
            { 
                id = e.IdDispositivo, 
                peso = pesoActual,
                timestamp = DateTime.UtcNow 
            });

            _logger.LogDebug("Peso actualizado - Báscula: {Id}, Peso: {Peso}", e.IdDispositivo, pesoActual);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al procesar nuevo peso");
        }
    }

    public override void Dispose()
    {
        if (_controlSerialGen != null)
        {
            try
            {
                // Desconectar básculas antes de limpiar
                _controlSerialGen.conexionBascula?.DesconectarTodas();
                _logger.LogInformation("Básculas desconectadas correctamente");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al desconectar básculas durante dispose");
            }
        }

        base.Dispose();
    }
}