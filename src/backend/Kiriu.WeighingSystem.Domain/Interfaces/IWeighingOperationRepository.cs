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
}