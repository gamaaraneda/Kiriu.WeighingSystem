using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Domain.Interfaces;

public interface IWeighingOperationRepository
{
    Task<WeighingOperation> CreateAsync(WeighingOperation operation);
    Task<WeighingOperation?> GetByIdAsync(Guid id);
    Task<WeighingOperation?> GetByFolioAsync(string folio);
    Task<WeighingOperation?> GetLatestEntryByPlateAsync(string plate);
    Task<List<WeighingOperation>> GetByPlatesAsync(List<string> plates);
    Task<(List<WeighingOperation> operations, int total)> GetPaginatedAsync(
        int page, 
        int size, 
        string? status = null, 
        string? unitType = null, 
        DateTime? dateFrom = null, 
        DateTime? dateTo = null);
    Task<WeighingOperation> UpdateAsync(WeighingOperation operation);
    Task<bool> HasActiveEntryAsync(string plate);
    Task<WeighingOperation?> GetActiveEntryByPlateAsync(string plate);
    Task<List<WeighingOperation>> GetOperationsByPlateAsync(string plate);
    Task<List<WeighingOperation>> QueryOperationsAsync(
        DateTime? fechaDesde,
        DateTime? fechaHasta,
        string? folio,
        string? placa,
        string? estado,
        string? edicionPosterior,
        int page,
        int size);
    Task<int> CountOperationsAsync(
        DateTime? fechaDesde,
        DateTime? fechaHasta,
        string? folio,
        string? placa,
        string? estado,
        string? edicionPosterior);
    Task<List<string>> SearchProductsAsync(string searchTerm, int limit = 10);
    Task<List<string>> SearchClientsAsync(string searchTerm, int limit = 10);
    Task<List<WeighingOperation>> SearchPendingExitsAsync(string searchTerm, int limit = 10, string? unitType = null);

    // Métodos para doble remolque interrumpible
    /// <param name="statuses">Uno o más estados. Si null/vacío, se usa ENTRADA_PARCIAL_R1 por defecto.</param>
    Task<List<WeighingOperation>> SearchPendingDoubleTrailersAsync(string searchTerm, int limit = 10, params string[]? statuses);
    Task<WeighingOperation?> GetPendingDoubleTrailerByFolioAsync(string folio);
    Task<WeighingOperation?> GetPendingDoubleTrailerExitByFolioAsync(string folio);
}