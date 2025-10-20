using System.IO.Ports;
using System.Text;
using System.Text.RegularExpressions;
using System.Linq;

namespace Braunker.SerialTest;

class Program
{
    private static string _portName = "COM4"; // Puerto por defecto
    private const int BAUD_RATE = 9600;
    private const int DATA_BITS = 8;
    private const Parity PARITY = Parity.None;
    private const StopBits STOP_BITS = StopBits.One;
    private const int READ_TIMEOUT = 2000; // 2 segundos
    private const int WRITE_TIMEOUT = 1000; // 1 segundo

    static void Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Clear();

        WriteHeader();

        // Solicitar puerto COM al inicio
        AskForComPort();

        bool exit = false;
        while (!exit)
        {
            ShowMenu();
            var option = Console.ReadKey(true);
            Console.WriteLine();

            switch (option.Key)
            {
                case ConsoleKey.D1:
                case ConsoleKey.NumPad1:
                    GetWeight("W\r", "W\\r");
                    break;

                case ConsoleKey.D2:
                case ConsoleKey.NumPad2:
                    GetWeight("W\r\n", "W<CR><LF>");
                    break;

                case ConsoleKey.D3:
                case ConsoleKey.NumPad3:
                    GetWeight("W\r", "W<CR>");
                    break;

                case ConsoleKey.D4:
                case ConsoleKey.NumPad4:
                    GetWeight("W\\r\\n", "W\\r\\n");
                    break;

                case ConsoleKey.D5:
                case ConsoleKey.NumPad5:
                    GetWeightStxEtx();
                    break;

                case ConsoleKey.D6:
                case ConsoleKey.NumPad6:
                    exit = true;
                    WriteColored("👋 Saliendo de la aplicación...\n", ConsoleColor.Cyan);
                    break;

                default:
                    WriteColored("⚠️  Opción no válida. Por favor, seleccione 1-6.\n", ConsoleColor.Yellow);
                    break;
            }

            if (!exit)
            {
                Console.WriteLine();
                WriteColored("Presione cualquier tecla para continuar...", ConsoleColor.Gray);
                Console.ReadKey(true);
                Console.Clear();
                WriteHeader();
            }
        }
    }

    static void WriteHeader()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("╔═══════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║        BRAUNKER SERIAL TEST - Indicador ZM401-SD3            ║");
        Console.WriteLine("╚═══════════════════════════════════════════════════════════════╝");
        Console.ResetColor();
        Console.WriteLine();
    }

    static void ShowMenu()
    {
        Console.WriteLine("┌───────────────────────────────────────────────────────────────┐");
        Console.WriteLine("│  MENÚ PRINCIPAL                                               │");
        Console.WriteLine("├───────────────────────────────────────────────────────────────┤");
        Console.WriteLine("│  [1] Obtener peso - Comando: W\\r                              │");
        Console.WriteLine("│  [2] Obtener peso - Comando: W<CR><LF>                        │");
        Console.WriteLine("│  [3] Obtener peso - Comando: W<CR>                            │");
        Console.WriteLine("│  [4] Obtener peso - Comando: W\\r\\n                            │");
        Console.WriteLine("│  [5] Obtener peso - Comando: <STX>A<ETX>                      │");
        Console.WriteLine("│  [6] Salir                                                    │");
        Console.WriteLine("└───────────────────────────────────────────────────────────────┘");
        Console.Write("\nSeleccione una opción: ");
    }

    static void GetWeight(string command, string displayCommand)
    {
        Console.WriteLine();
        WriteColored("═══════════════════════════════════════════════════════════════", ConsoleColor.DarkGray);
        WriteColored("  OBTENIENDO PESO DEL INDICADOR ZM401-SD3", ConsoleColor.White);
        WriteColored("═══════════════════════════════════════════════════════════════\n", ConsoleColor.DarkGray);

        SerialPort? serialPort = null;

        try
        {
            // Configurar puerto serial
            serialPort = new SerialPort
            {
                PortName = _portName,
                BaudRate = BAUD_RATE,
                DataBits = DATA_BITS,
                Parity = PARITY,
                StopBits = STOP_BITS,
                Handshake = Handshake.None,
                ReadTimeout = READ_TIMEOUT,
                WriteTimeout = WRITE_TIMEOUT,
                Encoding = Encoding.ASCII
            };

            WriteColored($"📡 Conectando al puerto {_portName}...", ConsoleColor.Yellow);
            serialPort.Open();
            WriteColored(" [OK]\n", ConsoleColor.Green);

            // Limpiar buffer de entrada
            serialPort.DiscardInBuffer();
            serialPort.DiscardOutBuffer();

            // Enviar comando
            WriteColored($"📤 Enviando comando: ", ConsoleColor.Yellow);
            WriteColored($"'{displayCommand}'\n", ConsoleColor.Cyan);

            serialPort.Write(command);

            // Esperar un poco para que el indicador procese y responda
            WriteColored("⏳ Esperando respuesta (150ms)...\n", ConsoleColor.Yellow);
            Thread.Sleep(150);

            // Leer respuesta
            string response = string.Empty;
            if (serialPort.BytesToRead > 0)
            {
                response = serialPort.ReadExisting();
            }

            if (string.IsNullOrWhiteSpace(response))
            {
                WriteColored("❌ Sin respuesta del indicador\n", ConsoleColor.Red);
                WriteColored("   Verifique que el indicador esté encendido y conectado correctamente.\n", ConsoleColor.DarkYellow);
                return;
            }

            // Mostrar respuesta RAW (sin procesar)
            WriteColored("\n📥 RESPUESTA RAW (sin procesar):\n", ConsoleColor.Magenta);
            WriteColored("─────────────────────────────────────────────────────────────────\n", ConsoleColor.DarkGray);
            Console.WriteLine(response);
            WriteColored("─────────────────────────────────────────────────────────────────\n", ConsoleColor.DarkGray);

            // Mostrar respuesta con caracteres especiales visibles
            WriteColored("\n📋 RESPUESTA (caracteres especiales visibles):\n", ConsoleColor.Yellow);
            string displayResponse = response
                .Replace("\r", "<CR>")
                .Replace("\n", "<LF>")
                .Replace("\t", "<TAB>")
                .Replace(" ", "·");
            WriteColored($"'{displayResponse}'\n", ConsoleColor.Cyan);

            // Mostrar bytes en hexadecimal
            WriteColored("\n🔢 BYTES HEXADECIMALES:\n", ConsoleColor.Yellow);
            byte[] bytes = Encoding.ASCII.GetBytes(response);
            string hexString = string.Join(" ", bytes.Select(b => $"{b:X2}"));
            WriteColored($"{hexString}\n", ConsoleColor.Cyan);

            // Extraer peso numérico
            string? weightValue = ExtractWeight(response);

            if (weightValue != null)
            {
                WriteColored("\n✅ PESO EXTRAÍDO: ", ConsoleColor.Green);
                WriteColored($"{weightValue} kg\n", ConsoleColor.White, isBold: true);
            }
            else
            {
                WriteColored("\n⚠️  No se pudo extraer el valor numérico del peso\n", ConsoleColor.Yellow);
                WriteColored($"   Formato esperado: ST,GS,+000123.45kg\n", ConsoleColor.DarkYellow);
            }
        }
        catch (UnauthorizedAccessException)
        {
            WriteColored($"❌ ERROR: Acceso denegado al puerto {_portName}\n", ConsoleColor.Red);
            WriteColored("   El puerto puede estar en uso por otra aplicación.\n", ConsoleColor.DarkYellow);
        }
        catch (IOException ex)
        {
            WriteColored($"❌ ERROR de E/S: {ex.Message}\n", ConsoleColor.Red);
            WriteColored($"   Verifique que el puerto {_portName} exista y esté disponible.\n", ConsoleColor.DarkYellow);
        }
        catch (TimeoutException)
        {
            WriteColored("❌ ERROR: Tiempo de espera agotado\n", ConsoleColor.Red);
            WriteColored("   El indicador no respondió en el tiempo esperado.\n", ConsoleColor.DarkYellow);
        }
        catch (Exception ex)
        {
            WriteColored($"❌ ERROR inesperado: {ex.Message}\n", ConsoleColor.Red);
            WriteColored($"   Tipo: {ex.GetType().Name}\n", ConsoleColor.DarkYellow);
        }
        finally
        {
            // Cerrar puerto
            if (serialPort?.IsOpen == true)
            {
                serialPort.Close();
                WriteColored("\n🔌 Puerto cerrado correctamente\n", ConsoleColor.Gray);
            }
        }
    }

    /// <summary>
    /// Obtiene peso usando comando con bytes STX y ETX
    /// Envía: <STX>A<ETX> (0x02, 'A', 0x03)
    /// </summary>
    static void GetWeightStxEtx()
    {
        Console.WriteLine();
        WriteColored("═══════════════════════════════════════════════════════════════", ConsoleColor.DarkGray);
        WriteColored("  OBTENIENDO PESO DEL INDICADOR - COMANDO <STX>A<ETX>", ConsoleColor.White);
        WriteColored("═══════════════════════════════════════════════════════════════\n", ConsoleColor.DarkGray);

        SerialPort? serialPort = null;

        try
        {
            // Configurar puerto serial
            serialPort = new SerialPort
            {
                PortName = _portName,
                BaudRate = BAUD_RATE,
                DataBits = DATA_BITS,
                Parity = PARITY,
                StopBits = STOP_BITS,
                Handshake = Handshake.None,
                ReadTimeout = READ_TIMEOUT,
                WriteTimeout = WRITE_TIMEOUT,
                Encoding = Encoding.ASCII
            };

            WriteColored($"📡 Conectando al puerto {_portName}...", ConsoleColor.Yellow);
            serialPort.Open();
            WriteColored(" [OK]\n", ConsoleColor.Green);

            // Limpiar buffer de entrada
            serialPort.DiscardInBuffer();
            serialPort.DiscardOutBuffer();

            // Enviar comando <STX>A<ETX>
            byte[] cmd = { 0x02, (byte)'A', 0x03 };

            WriteColored($"📤 Enviando comando: ", ConsoleColor.Yellow);
            WriteColored($"<STX>A<ETX> (bytes: 0x02 0x41 0x03)\n", ConsoleColor.Cyan);

            serialPort.Write(cmd, 0, cmd.Length);

            // Esperar respuesta
            WriteColored("⏳ Esperando respuesta (200ms)...\n", ConsoleColor.Yellow);
            Thread.Sleep(200);

            // Leer respuesta
            string response = string.Empty;
            if (serialPort.BytesToRead > 0)
            {
                response = serialPort.ReadExisting();
            }

            if (string.IsNullOrWhiteSpace(response))
            {
                WriteColored("❌ Sin respuesta del indicador\n", ConsoleColor.Red);
                WriteColored("   Verifique que el indicador esté encendido y conectado correctamente.\n", ConsoleColor.DarkYellow);
                return;
            }

            // Mostrar respuesta RAW (sin procesar)
            WriteColored("\n📥 RESPUESTA RAW (sin procesar):\n", ConsoleColor.Magenta);
            WriteColored("─────────────────────────────────────────────────────────────────\n", ConsoleColor.DarkGray);
            Console.WriteLine(response);
            WriteColored("─────────────────────────────────────────────────────────────────\n", ConsoleColor.DarkGray);

            // Mostrar respuesta con caracteres especiales visibles
            WriteColored("\n📋 RESPUESTA (caracteres especiales visibles):\n", ConsoleColor.Yellow);
            string displayResponse = response
                .Replace("\r", "<CR>")
                .Replace("\n", "<LF>")
                .Replace("\t", "<TAB>")
                .Replace("\x02", "<STX>")
                .Replace("\x03", "<ETX>")
                .Replace(" ", "·");
            WriteColored($"'{displayResponse}'\n", ConsoleColor.Cyan);

            // Mostrar bytes en hexadecimal
            WriteColored("\n🔢 BYTES HEXADECIMALES:\n", ConsoleColor.Yellow);
            byte[] bytes = Encoding.ASCII.GetBytes(response);
            string hexString = string.Join(" ", bytes.Select(b => $"{b:X2}"));
            WriteColored($"{hexString}\n", ConsoleColor.Cyan);

            // Extraer peso numérico
            string? weightValue = ExtractWeight(response);

            if (weightValue != null)
            {
                WriteColored("\n✅ PESO EXTRAÍDO: ", ConsoleColor.Green);
                WriteColored($"{weightValue} kg\n", ConsoleColor.White, isBold: true);
            }
            else
            {
                WriteColored("\n⚠️  No se pudo extraer el valor numérico del peso\n", ConsoleColor.Yellow);
                WriteColored($"   Formato esperado: ST,GS,+000123.45kg\n", ConsoleColor.DarkYellow);
            }
        }
        catch (UnauthorizedAccessException)
        {
            WriteColored($"❌ ERROR: Acceso denegado al puerto {_portName}\n", ConsoleColor.Red);
            WriteColored("   El puerto puede estar en uso por otra aplicación.\n", ConsoleColor.DarkYellow);
        }
        catch (IOException ex)
        {
            WriteColored($"❌ ERROR de E/S: {ex.Message}\n", ConsoleColor.Red);
            WriteColored($"   Verifique que el puerto {_portName} exista y esté disponible.\n", ConsoleColor.DarkYellow);
        }
        catch (TimeoutException)
        {
            WriteColored("❌ ERROR: Tiempo de espera agotado\n", ConsoleColor.Red);
            WriteColored("   El indicador no respondió en el tiempo esperado.\n", ConsoleColor.DarkYellow);
        }
        catch (Exception ex)
        {
            WriteColored($"❌ ERROR inesperado: {ex.Message}\n", ConsoleColor.Red);
            WriteColored($"   Tipo: {ex.GetType().Name}\n", ConsoleColor.DarkYellow);
        }
        finally
        {
            // Cerrar puerto
            if (serialPort?.IsOpen == true)
            {
                serialPort.Close();
                WriteColored("\n🔌 Puerto cerrado correctamente\n", ConsoleColor.Gray);
            }
        }
    }

    /// <summary>
    /// Extrae el valor numérico del peso de la respuesta del indicador
    /// Formato esperado: ST,GS,+000123.45kg
    /// </summary>
    static string? ExtractWeight(string response)
    {
        if (string.IsNullOrWhiteSpace(response))
            return null;

        // Patrón para extraer número decimal con signo opcional
        // Busca: signo opcional + dígitos + punto decimal + dígitos
        var match = Regex.Match(response, @"([+-]?\d+\.?\d*)");

        if (match.Success)
        {
            string value = match.Groups[1].Value;

            // Intentar parsear para validar que es un número válido
            if (decimal.TryParse(value, out decimal weight))
            {
                return weight.ToString("0.00");
            }
        }

        return null;
    }

    /// <summary>
    /// Escribe texto en consola con color especificado
    /// </summary>
    static void WriteColored(string text, ConsoleColor color, bool isBold = false)
    {
        var originalColor = Console.ForegroundColor;
        Console.ForegroundColor = color;

        if (isBold)
        {
            Console.Write("\x1b[1m"); // ANSI escape code for bold
        }

        Console.Write(text);

        if (isBold)
        {
            Console.Write("\x1b[0m"); // ANSI escape code to reset
        }

        Console.ForegroundColor = originalColor;
    }

    /// <summary>
    /// Solicita al usuario el puerto COM al que desea conectarse
    /// </summary>
    static void AskForComPort()
    {
        Console.WriteLine();
        WriteColored("═══════════════════════════════════════════════════════════════", ConsoleColor.DarkGray);
        WriteColored("  CONFIGURACIÓN DE PUERTO SERIAL", ConsoleColor.White);
        WriteColored("═══════════════════════════════════════════════════════════════\n\n", ConsoleColor.DarkGray);

        // Listar puertos disponibles
        string[] availablePorts = SerialPort.GetPortNames();

        if (availablePorts.Length > 0)
        {
            WriteColored("📋 Puertos COM disponibles:\n", ConsoleColor.Cyan);
            foreach (string port in availablePorts)
            {
                WriteColored($"   • {port}\n", ConsoleColor.Green);
            }
            Console.WriteLine();
        }
        else
        {
            WriteColored("⚠️  No se detectaron puertos COM disponibles\n\n", ConsoleColor.Yellow);
        }

        // Solicitar puerto
        WriteColored($"🔌 Ingrese el puerto COM a utilizar (predeterminado: {_portName}): ", ConsoleColor.White);
        string? input = Console.ReadLine()?.Trim().ToUpper();

        if (!string.IsNullOrWhiteSpace(input))
        {
            // Validar formato COM
            if (!input.StartsWith("COM"))
            {
                input = "COM" + input;
            }

            _portName = input;
            WriteColored($"\n✅ Puerto configurado: {_portName}\n", ConsoleColor.Green);
        }
        else
        {
            WriteColored($"\n✅ Usando puerto predeterminado: {_portName}\n", ConsoleColor.Green);
        }

        Console.WriteLine();
        WriteColored("Presione cualquier tecla para continuar...", ConsoleColor.Gray);
        Console.ReadKey(true);
        Console.Clear();
        WriteHeader();
    }
}
