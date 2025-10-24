namespace Kiriu.WeighingSystem.Infrastructure.Configuration;

/// <summary>
/// Configuración de manejo de fotos
/// </summary>
public class PhotoSettings
{
    /// <summary>
    /// Tiempo máximo (en minutos) que una foto huérfana se considera válida.
    /// Fotos más antiguas serán ignoradas al buscar fotos disponibles.
    /// Por defecto: 10 minutos
    /// </summary>
    public int OrphanPhotoMaxAgeMinutes { get; set; } = 10;
}
