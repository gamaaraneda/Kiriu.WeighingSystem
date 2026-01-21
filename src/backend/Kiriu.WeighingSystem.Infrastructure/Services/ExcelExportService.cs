using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.Interfaces;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

public class ExcelExportService : IExcelExportService
{
    public async Task<byte[]> ExportWeighingOperationsToExcelAsync(List<WeighingExportDto> data)
    {
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        
        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("Operaciones de Pesaje");

        // Configurar encabezados
        var headers = new[]
        {
            "Folio",
            "Placa T",
            "Placa R",
            "Placa R2",
            "Cliente/Proveedor",
            "Producto",
            "Tipo",
            "Tipo de Unidad",
            "Peso Bruto (kg)",
            "Peso Salida (kg)",
            "Peso Neto (kg)",
            "Estado",
            "Pesado a la entrada por",
            "Pesado a la salida por",
            "Fecha Entrada",
            "Fecha Salida",
            "Editado Por",
            "Fecha Edición"
        };

        // Escribir encabezados
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
            worksheet.Cells[1, i + 1].Style.Font.Bold = true;
            worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
            worksheet.Cells[1, i + 1].Style.Border.BorderAround(ExcelBorderStyle.Thin);
        }

        // Escribir datos
        for (int row = 0; row < data.Count; row++)
        {
            var item = data[row];
            var excelRow = row + 2; // Empezar en la fila 2 (después de encabezados)

            worksheet.Cells[excelRow, 1].Value = item.Folio;
            worksheet.Cells[excelRow, 2].Value = item.PlacaT;
            worksheet.Cells[excelRow, 3].Value = item.PlacaR;
            worksheet.Cells[excelRow, 4].Value = item.PlacaR2;
            worksheet.Cells[excelRow, 5].Value = item.ClienteProveedor;
            worksheet.Cells[excelRow, 6].Value = item.Producto;
            worksheet.Cells[excelRow, 7].Value = item.Tipo == "client" ? "Cliente" : item.Tipo == "provider" ? "Proveedor" : item.Tipo;
            worksheet.Cells[excelRow, 8].Value = item.TipoUnidad;
            worksheet.Cells[excelRow, 9].Value = item.PesoBruto;
            worksheet.Cells[excelRow, 10].Value = item.PesoSalida;
            worksheet.Cells[excelRow, 11].Value = item.PesoNeto;
            worksheet.Cells[excelRow, 12].Value = item.Estado;
            worksheet.Cells[excelRow, 13].Value = item.PesadoEntradaPor;
            worksheet.Cells[excelRow, 14].Value = item.PesadoSalidaPor;
            worksheet.Cells[excelRow, 15].Value = item.FechaEntrada?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? "";
            worksheet.Cells[excelRow, 16].Value = item.FechaSalida?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? "";
            worksheet.Cells[excelRow, 17].Value = item.EditadoPor;
            worksheet.Cells[excelRow, 18].Value = item.FechaEdicion?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? "";

            // Aplicar bordes a todas las celdas de datos
            for (int col = 1; col <= headers.Length; col++)
            {
                worksheet.Cells[excelRow, col].Style.Border.BorderAround(ExcelBorderStyle.Thin);
            }

            // Resaltar registros editados
            if (item.FechaEdicion.HasValue)
            {
                for (int col = 1; col <= headers.Length; col++)
                {
                    worksheet.Cells[excelRow, col].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    worksheet.Cells[excelRow, col].Style.Fill.BackgroundColor.SetColor(Color.LightYellow);
                }
            }
        }

        // Autoajustar columnas
        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

        // Configurar formato de números para peso
        var weightColumns = new[] { 10, 11, 12 }; // Columnas de peso bruto, salida y neto
        foreach (var col in weightColumns)
        {
            worksheet.Column(col).Style.Numberformat.Format = "#,##0.00";
        }

        // Agregar filtros automáticos
        worksheet.Cells[1, 1, data.Count + 1, headers.Length].AutoFilter = true;

        // Congelar la primera fila
        worksheet.View.FreezePanes(2, 1);

        return await Task.FromResult(package.GetAsByteArray());
    }
}