using System.IO.Ports;
using System.Text;

string portName = args.Length > 0 ? args[0] : "COM3";

Console.WriteLine($"Simulador de Báscula Serial - Puerto: {portName}");
Console.WriteLine("Esperando conexión...");
Console.WriteLine("Presiona Ctrl+C para salir");
Console.WriteLine();

var random = new Random();
SerialPort? port = null;

try
{
    port = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One)
    {
        Encoding = Encoding.ASCII,
        ReadTimeout = 500,
        WriteTimeout = 500
    };

    port.Open();
    Console.WriteLine($"Puerto {portName} abierto correctamente");

    var buffer = new byte[256];

    while (true)
    {
        try
        {
            if (port.BytesToRead > 0)
            {
                var bytesRead = port.Read(buffer, 0, buffer.Length);

                // Verificar si recibió el comando STX-A-ETX (0x02 'A' 0x03)
                if (bytesRead >= 3 && buffer[0] == 0x02 && buffer[1] == 'A' && buffer[2] == 0x03)
                {
                    // Generar peso aleatorio con decimales
                    var weightInt = random.Next(100, 1001);
                    var weightDecimal = random.Next(0, 100);
                    var weight = weightInt + (weightDecimal / 100.0m);

                    // Formato idéntico a la báscula real Braunker ZM401-SD3: ST,GS,+000123.45kg
                    var response = $"ST,GS,+{weight:000000.00}kg\r\n";

                    Thread.Sleep(200); // Simular latencia de la báscula real
                    port.Write(response);
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] <STX>A<ETX> recibido -> Respuesta: {response.Trim()}");
                }
            }

            Thread.Sleep(50);
        }
        catch (TimeoutException)
        {
            // Ignorar timeout de lectura
        }
    }
}
catch (UnauthorizedAccessException)
{
    Console.WriteLine($"Error: Puerto {portName} no disponible (en uso por otra aplicación)");
}
catch (IOException ex)
{
    Console.WriteLine($"Error de I/O: {ex.Message}");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
finally
{
    port?.Close();
    port?.Dispose();
}
