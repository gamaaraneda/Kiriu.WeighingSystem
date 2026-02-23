using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IWeighingPhotoRepository
{
    Task<WeighingPhoto?> GetByIdAsync(Guid id);
    Task<IEnumerable<WeighingPhoto>> GetByOperationIdAsync(Guid operationId);
    Task<WeighingPhoto> AddAsync(WeighingPhoto photo);
    Task UpdateAsync(WeighingPhoto photo);
    Task DeleteAsync(Guid id);

    /// <summary>
    /// Busca fotos huérfanas (sin WeighingOperationId) por PhotoUrl
    /// </summary>
    Task<WeighingPhoto?> GetOrphanPhotoByUrlAsync(string photoUrl);

    /// <summary>
    /// Obtiene la última foto huérfana (sin WeighingOperationId) según el tipo
    /// </summary>
    /// <param name="photoType">Tipo de foto a buscar</param>
    /// <param name="excludePhotoId">ID de foto a excluir (para doble remolque)</param>
    Task<WeighingPhoto?> GetLatestOrphanPhotoByTypeAsync(string photoType, Guid? excludePhotoId = null);

    /// <summary>
    /// Vincula una foto huérfana con una operación de pesaje
    /// </summary>
    /// <param name="finalPhotoType">Tipo final de la foto según el request (opcional)</param>
    Task LinkOrphanPhotoToOperationAsync(Guid photoId, Guid operationId, string? finalPhotoType = null);
}
