namespace Kiriu.WeighingSystem.SerialGateway.Configuration;

/// <summary>
/// Parámetros de conexión para la báscula serial.
/// </summary>
public sealed class SerialSettings
{
    public const string SectionName = "SerialSettings";

    public string PortName { get; set; } = "COM1";

    public int BaudRate { get; set; } = 9600;

    public int DataBits { get; set; } = 8;

    public string Parity { get; set; } = "None";

    public string StopBits { get; set; } = "One";

    public int ReadTimeoutMs { get; set; } = 2000;

    public int WriteTimeoutMs { get; set; } = 1000;

    public string Unit { get; set; } = "kg";
}
