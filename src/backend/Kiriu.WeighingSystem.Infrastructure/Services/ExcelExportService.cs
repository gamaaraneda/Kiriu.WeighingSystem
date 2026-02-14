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
            "Fecha Edición",
            "Justificación",
            "Valores Originales"
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

            // Para doble remolque, mostrar pesos concatenados con formato: peso1 + peso2 = total
            if (item.TipoUnidad == "doble-remolque" && item.PesoBrutoRemolque1.HasValue && item.PesoBrutoRemolque2.HasValue)
            {
                var pesoR1 = item.PesoBrutoRemolque1.Value;
                var pesoR2 = item.PesoBrutoRemolque2.Value;
                var totalEntrada = pesoR1 + pesoR2;
                worksheet.Cells[excelRow, 9].Value = $"{pesoR1:N2} + {pesoR2:N2} = {totalEntrada:N2}";
            }
            else
            {
                worksheet.Cells[excelRow, 9].Value = item.PesoBruto;
            }

            if (item.TipoUnidad == "doble-remolque" && item.PesoTaraRemolque1.HasValue && item.PesoTaraRemolque2.HasValue)
            {
                var taraR1 = item.PesoTaraRemolque1.Value;
                var taraR2 = item.PesoTaraRemolque2.Value;
                var totalSalida = taraR1 + taraR2;
                worksheet.Cells[excelRow, 10].Value = $"{taraR1:N2} + {taraR2:N2} = {totalSalida:N2}";
            }
            else
            {
                worksheet.Cells[excelRow, 10].Value = item.PesoSalida;
            }

            worksheet.Cells[excelRow, 11].Value = item.PesoNeto;
            worksheet.Cells[excelRow, 12].Value = item.Estado;
            worksheet.Cells[excelRow, 13].Value = item.PesadoEntradaPor;
            worksheet.Cells[excelRow, 14].Value = item.PesadoSalidaPor;

            // Para doble remolque, concatenar fechas de ambos remolques
            if (item.TipoUnidad == "doble-remolque" && item.FechaEntradaRemolque1.HasValue && item.FechaEntradaRemolque2.HasValue)
            {
                var fechaEntrada1 = item.FechaEntradaRemolque1.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
                var fechaEntrada2 = item.FechaEntradaRemolque2.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
                worksheet.Cells[excelRow, 15].Value = $"{fechaEntrada1} - {fechaEntrada2}";
            }
            else
            {
                worksheet.Cells[excelRow, 15].Value = item.FechaEntrada?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? "";
            }

            if (item.TipoUnidad == "doble-remolque" && item.FechaSalidaRemolque1.HasValue && item.FechaSalidaRemolque2.HasValue)
            {
                var fechaSalida1 = item.FechaSalidaRemolque1.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
                var fechaSalida2 = item.FechaSalidaRemolque2.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
                worksheet.Cells[excelRow, 16].Value = $"{fechaSalida1} - {fechaSalida2}";
            }
            else
            {
                worksheet.Cells[excelRow, 16].Value = item.FechaSalida?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? "";
            }

            worksheet.Cells[excelRow, 17].Value = item.EditadoPor;
            worksheet.Cells[excelRow, 18].Value = item.FechaEdicion;
            worksheet.Cells[excelRow, 19].Value = item.Justificacion;
            worksheet.Cells[excelRow, 20].Value = item.ValoresOriginales;

            // Habilitar ajuste de texto (text wrap) para las columnas de edición para mostrar saltos de línea
            worksheet.Cells[excelRow, 18].Style.WrapText = true;
            worksheet.Cells[excelRow, 19].Style.WrapText = true;
            worksheet.Cells[excelRow, 20].Style.WrapText = true;

            // Aplicar bordes a todas las celdas de datos
            for (int col = 1; col <= headers.Length; col++)
            {
                worksheet.Cells[excelRow, col].Style.Border.BorderAround(ExcelBorderStyle.Thin);
            }

            // Resaltar registros editados en amarillo
            // Un registro está editado si la columna "Justificación" contiene más de una línea (valores actuales + ediciones)
            if (!string.IsNullOrWhiteSpace(item.Justificacion) && item.Justificacion.Contains("\n"))
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

        // Configurar ancho personalizado para las columnas de edición
        worksheet.Column(18).Width = 20; // Fecha Edición
        worksheet.Column(19).Width = 180; // Justificación
        worksheet.Column(20).Width = 180; // Valores Originales (la más ancha)

        // Configurar formato de números para peso
        var weightColumns = new[] { 9, 10, 11 }; // Columnas de peso bruto, salida y neto
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