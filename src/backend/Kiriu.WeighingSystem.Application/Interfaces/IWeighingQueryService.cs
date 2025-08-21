using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.DTOs;

namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IWeighingQueryService
{
    Task<ApiResponse<WeighingQueryResponseDto>> QueryWeighingOperationsAsync(WeighingQueryFiltersDto filters);
    Task<ApiResponse<List<WeighingExportDto>>> GetWeighingOperationsForExportAsync(WeighingQueryFiltersDto filters);
}