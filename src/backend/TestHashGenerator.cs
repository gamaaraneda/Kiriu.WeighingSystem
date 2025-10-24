using System;

class Program
{
    static void Main()
    {
        string password = "Sistemas1.";

        Console.WriteLine("Generando hash para: " + password);
        Console.WriteLine();

        // Generar hash con la nueva configuración
        var hashNuevo = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11, enhancedEntropy: false);
        Console.WriteLine("Hash nuevo (workFactor: 11, enhancedEntropy: false):");
        Console.WriteLine(hashNuevo);
        Console.WriteLine();

        // Probar validación
        var isValid = BCrypt.Net.BCrypt.Verify(password, hashNuevo, enhancedEntropy: false);
        Console.WriteLine("Validación del hash nuevo: " + isValid);
        Console.WriteLine();

        // Generar hash con configuración por defecto
        var hashDefault = BCrypt.Net.BCrypt.HashPassword(password);
        Console.WriteLine("Hash default:");
        Console.WriteLine(hashDefault);
        Console.WriteLine();

        // Probar validación
        var isValidDefault = BCrypt.Net.BCrypt.Verify(password, hashDefault);
        Console.WriteLine("Validación del hash default: " + isValidDefault);
        Console.WriteLine();

        Console.WriteLine("Copia uno de estos hashes y actualiza la BD con:");
        Console.WriteLine("UPDATE Usuarios SET PasswordHash = '[hash_aqui]' WHERE Email = 'admin4@kiriu.com';");
    }
}
