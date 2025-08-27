using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Api.Hubs;
using System.Reflection;

namespace Kiriu.WeighingSystem.Api.Services;

public class PesoRealtimeService : BackgroundService
{
    private readonly ILogger<PesoRealtimeService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private object? _controlSerialGen;
    private bool _isInitialized;

    public PesoRealtimeService(
        ILogger<PesoRealtimeService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
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

            // Cargar la DLL dinámicamente
            var dllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "lib", "Mapps.Control.Devices.Library.dll");
            
            if (!File.Exists(dllPath))
            {
                _logger.LogError("No se encontró la DLL en: {DllPath}", dllPath);
                return;
            }

            var assembly = Assembly.LoadFrom(dllPath);
            var controlSerialGenType = assembly.GetType("Mapps.Control.Devices.Library.ControlSerialGen");
            
            if (controlSerialGenType == null)
            {
                _logger.LogError("No se encontró la clase ControlSerialGen en la DLL");
                return;
            }

            _controlSerialGen = Activator.CreateInstance(controlSerialGenType);
            
            if (_controlSerialGen == null)
            {
                _logger.LogError("Error al crear instancia de ControlSerialGen");
                return;
            }

            // Suscribirse al evento NuevoPesoEvent
            var nuevoPesoEvent = controlSerialGenType.GetEvent("NuevoPesoEvent");
            if (nuevoPesoEvent != null)
            {
                var handlerMethod = typeof(PesoRealtimeService).GetMethod(nameof(OnNuevoPeso), BindingFlags.NonPublic | BindingFlags.Instance);
                var handler = Delegate.CreateDelegate(nuevoPesoEvent.EventHandlerType!, this, handlerMethod!);
                nuevoPesoEvent.AddEventHandler(_controlSerialGen, handler);
                _logger.LogInformation("Evento NuevoPesoEvent suscrito correctamente");
            }

            // Llamar a ListaSerial
            var listaSerialMethod = controlSerialGenType.GetMethod("ListaSerial");
            if (listaSerialMethod != null)
            {
                await (Task)listaSerialMethod.Invoke(_controlSerialGen, null)!;
                _logger.LogInformation("ListaSerial ejecutado correctamente");
            }

            // Obtener y configurar básculas (implementación simplificada para el ejemplo)
            await ConfigurarBasculasAsync();

            _isInitialized = true;
            _logger.LogInformation("ControlSerialGen inicializado correctamente");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al inicializar ControlSerialGen");
        }
    }

    private async Task ConfigurarBasculasAsync()
    {
        try
        {
            // Esta implementación debería obtener las básculas desde la base de datos
            // Por ahora, solo llamamos a ConectarTodasBasculas si está disponible
            var controlSerialGenType = _controlSerialGen?.GetType();
            var conectarTodasMethod = controlSerialGenType?.GetMethod("ConectarTodasBasculas");
            
            if (conectarTodasMethod != null)
            {
                conectarTodasMethod.Invoke(_controlSerialGen, null);
                _logger.LogInformation("Intentando conectar todas las básculas");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al configurar básculas");
        }
    }

    private async void OnNuevoPeso(object sender, object e)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<PesoHub>>();

            // Usar reflexión para obtener las propiedades del evento
            var eventType = e.GetType();
            var idProperty = eventType.GetProperty("IdDispositivo");
            var pesoProperty = eventType.GetProperty("Peso");

            if (idProperty != null && pesoProperty != null)
            {
                var idDispositivo = (int)idProperty.GetValue(e)!;
                var pesoArray = (float[])pesoProperty.GetValue(e)!;
                var pesoActual = pesoArray.LastOrDefault();

                // Emitir el peso a todos los clientes conectados
                await hubContext.Clients.All.SendAsync("pesoActualizado", new 
                { 
                    id = idDispositivo, 
                    peso = pesoActual,
                    timestamp = DateTime.UtcNow 
                });

                _logger.LogDebug("Peso actualizado - Báscula: {Id}, Peso: {Peso}", idDispositivo, pesoActual);
            }
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
                // Intentar desconectar básculas antes de limpiar
                var controlSerialGenType = _controlSerialGen.GetType();
                var conexionBaculaProperty = controlSerialGenType.GetProperty("conexionBascula");
                
                if (conexionBaculaProperty != null)
                {
                    var conexionBascula = conexionBaculaProperty.GetValue(_controlSerialGen);
                    if (conexionBascula != null)
                    {
                        var desconectarTodasMethod = conexionBascula.GetType().GetMethod("DesconectarTodas");
                        desconectarTodasMethod?.Invoke(conexionBascula, null);
                        _logger.LogInformation("Básculas desconectadas correctamente");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al desconectar básculas durante dispose");
            }
        }

        base.Dispose();
    }
}