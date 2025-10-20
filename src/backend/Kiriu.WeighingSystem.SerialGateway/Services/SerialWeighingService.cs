using System.Globalization;
using System.IO;
using System.IO.Ports;
using System.Text;
using System.Text.RegularExpressions;
using Kiriu.WeighingSystem.SerialGateway.Configuration;
using Kiriu.WeighingSystem.SerialGateway.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Kiriu.WeighingSystem.SerialGateway.Services;

/// <summary>
/// Gestiona la comunicación serial con la báscula y expone una lectura bajo demanda.
/// </summary>
public sealed class SerialWeighingService : ISerialWeighingService
{
    private static readonly byte[] WeightCommand = { 0x02, (byte)'A', 0x03 };
    private static readonly Regex WeightRegex = new(@"([+-]?\d+\.?\d*)", RegexOptions.Compiled);

    private readonly SerialSettings _settings;
    private readonly ILogger<SerialWeighingService> _logger;
    private readonly SemaphoreSlim _mutex = new(1, 1);

    private SerialPort? _serialPort;
    private bool _disposed;

    public SerialWeighingService(IOptions<SerialSettings> options, ILogger<SerialWeighingService> logger)
    {
        _settings = options.Value;
        _logger = logger;
    }

    public async Task<WeightReading> GetWeightAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await _mutex.WaitAsync(cancellationToken).ConfigureAwait(false);

        try
        {
            EnsurePortReady();

            _serialPort!.DiscardInBuffer();
            _serialPort.DiscardOutBuffer();

            _logger.LogDebug("Enviando comando de lectura a la báscula en {Port}", _settings.PortName);
            _serialPort.WriteTimeout = _settings.WriteTimeoutMs;
            _serialPort.Write(WeightCommand, 0, WeightCommand.Length);

            var rawResponse = await ReadResponseAsync(_serialPort, _settings.ReadTimeoutMs, cancellationToken)
                .ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(rawResponse))
            {
                throw new TimeoutException("La báscula no respondió dentro del tiempo configurado.");
            }

            var weight = ParseWeight(rawResponse);
            var reading = new WeightReading(
                weight,
                _settings.Unit,
                DateTime.UtcNow,
                rawResponse);

            _logger.LogInformation("Lectura de peso exitosa: {Weight}{Unit}", reading.Value, reading.Unit);
            return reading;
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Tiempo de espera agotado al solicitar peso.");
            throw;
        }
        catch (IOException ex)
        {
            _logger.LogError(ex, "Error de E/S al comunicarse con la báscula.");
            ResetPort();
            throw;
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Acceso denegado al puerto serial {Port}", _settings.PortName);
            ResetPort();
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inesperado al obtener peso.");
            throw;
        }
        finally
        {
            _mutex.Release();
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _serialPort?.Dispose();
        _mutex.Dispose();
        GC.SuppressFinalize(this);
    }

    private void EnsurePortReady()
    {
        if (_serialPort == null)
        {
            _serialPort = CreatePort();
        }

        if (!_serialPort.IsOpen)
        {
            _serialPort.Open();
            _logger.LogInformation("Puerto serial {Port} abierto correctamente.", _serialPort.PortName);
        }
    }

    private SerialPort CreatePort()
    {
        var parity = Enum.TryParse(_settings.Parity, true, out Parity parsedParity)
            ? parsedParity
            : Parity.None;

        var stopBits = Enum.TryParse(_settings.StopBits, true, out StopBits parsedStopBits)
            ? parsedStopBits
            : StopBits.One;

        var port = new SerialPort(_settings.PortName, _settings.BaudRate, parity, _settings.DataBits, stopBits)
        {
            ReadTimeout = _settings.ReadTimeoutMs,
            WriteTimeout = _settings.WriteTimeoutMs,
            NewLine = "\r\n",
            Encoding = Encoding.ASCII
        };

        return port;
    }

    private async Task<string> ReadResponseAsync(SerialPort port, int timeoutMs, CancellationToken cancellationToken)
    {
        var responseBuilder = new StringBuilder();
        var timeout = TimeSpan.FromMilliseconds(timeoutMs);
        var start = DateTime.UtcNow;

        while (DateTime.UtcNow - start < timeout)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (port.BytesToRead > 0)
            {
                var chunk = port.ReadExisting();
                responseBuilder.Append(chunk);

                if (chunk.Contains('\n') || chunk.Contains('\r'))
                {
                    break;
                }
            }
            else
            {
                await Task.Delay(20, cancellationToken).ConfigureAwait(false);
            }
        }

        return responseBuilder.ToString().Trim();
    }

    private static decimal ParseWeight(string rawResponse)
    {
        var match = WeightRegex.Match(rawResponse);
        if (!match.Success)
        {
            throw new InvalidOperationException($"No se pudo interpretar el peso de la respuesta: '{rawResponse}'.");
        }

        var value = match.Groups[1].Value;
        if (!decimal.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var weight))
        {
            throw new InvalidOperationException($"No se pudo convertir el valor '{value}' a decimal.");
        }

        return weight;
    }

    private void ResetPort()
    {
        try
        {
            if (_serialPort == null)
            {
                return;
            }

            _logger.LogWarning("Reiniciando puerto serial {Port} tras error.", _serialPort.PortName);
            if (_serialPort.IsOpen)
            {
                _serialPort.Close();
            }

            _serialPort.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fallo al cerrar el puerto serial tras error.");
        }
        finally
        {
            _serialPort = null;
        }
    }
}
