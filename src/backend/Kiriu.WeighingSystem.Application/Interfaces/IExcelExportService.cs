using Kiriu.WeighingSystem.Application.DTOs.Weighing;

namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IExcelExportService
{
    Task<byte[]> ExportWeighingOperationsToExcelAsync(List<WeighingExportDto> data);
}