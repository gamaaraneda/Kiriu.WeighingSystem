using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;

namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IWeighingApplicationService
{
    Task<ApiResponse<WeighingOperationDto>> CreateEntryAsync(CreateEntryRequest request);
    Task<ApiResponse<DoubleTrailerEntryResponseDto>> CreateDoubleTrailerEntryAsync(CreateDoubleTrailerEntryRequest request);
    Task<ApiResponse<EntrySearchDataDto>> SearchEntryByPlateAsync(string placa);
    Task<ApiResponse<ExitResponseDto>> CreateExitAsync(CreateExitRequest request);
    Task<ApiResponse<ExitResponseDto>> CreateDoubleTrailerExitAsync(CreateDoubleTrailerExitRequest request);
    Task<ApiResponse<PaginatedWeighingOperationsDto>> GetOperationsAsync(
        int page = 1, 
        int size = 20, 
        string? status = null, 
        string? unitType = null, 
        DateTime? dateFrom = null, 
        DateTime? dateTo = null);
    Task<ApiResponse<WeighingOperationDto>> GetOperationByPlateAsync(string placa);
    Task<ApiResponse<ExitValidationDto>> ValidateExitAsync(string placa);
    Task<ApiResponse<WeighingOperationDto>> UpdateWeighingOperationAsync(Guid operationId, UpdateWeighingOperationRequest request);
}