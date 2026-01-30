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
    Task<ApiResponse<WeighingOperationDto>> GetOperationByIdAsync(string id);
    Task<ApiResponse<ExitValidationDto>> ValidateExitAsync(string placa);
    Task<ApiResponse<WeighingOperationDto>> UpdateWeighingOperationAsync(Guid operationId, UpdateWeighingOperationRequest request);
    Task<PhotoBinaryDataDto?> GetPhotoDataAsync(Guid photoId);
    Task<ApiResponse<List<string>>> SearchProductsAsync(string searchTerm, int limit = 10);
    Task<ApiResponse<List<string>>> SearchClientsAsync(string searchTerm, int limit = 10);
    Task<ApiResponse<List<PendingExitSearchResultDto>>> SearchPendingExitsAsync(string searchTerm, int limit = 10, string? unitType = null);
    Task<ApiResponse<List<WeighingEditHistoryDto>>> GetEditHistoryAsync(Guid operationId);

    // Métodos para doble remolque interrumpible (entrada)
    Task<ApiResponse<PartialDoubleTrailerEntryResponseDto>> CreatePartialDoubleTrailerEntryAsync(CreatePartialDoubleTrailerEntryRequest request);
    Task<ApiResponse<DoubleTrailerEntryResponseDto>> ContinueDoubleTrailerEntryAsync(ContinueDoubleTrailerEntryRequest request);
    Task<ApiResponse<List<PendingDoubleTrailerSearchResultDto>>> SearchPendingDoubleTrailersAsync(string searchTerm, int limit = 10);
    Task<ApiResponse<PartialDoubleTrailerEntryResponseDto>> GetPendingDoubleTrailerByFolioAsync(string folio);

    // Métodos para doble remolque interrumpible (salida)
    Task<ApiResponse<PartialDoubleTrailerExitResponseDto>> CreatePartialDoubleTrailerExitAsync(CreatePartialDoubleTrailerExitRequest request);
    Task<ApiResponse<ExitResponseDto>> ContinueDoubleTrailerExitAsync(ContinueDoubleTrailerExitRequest request);
    Task<ApiResponse<List<PendingDoubleTrailerExitSearchResultDto>>> SearchPendingDoubleTrailerExitsAsync(string searchTerm, int limit = 10);
    Task<ApiResponse<PartialDoubleTrailerExitResponseDto>> GetPendingDoubleTrailerExitByFolioAsync(string folio);
}