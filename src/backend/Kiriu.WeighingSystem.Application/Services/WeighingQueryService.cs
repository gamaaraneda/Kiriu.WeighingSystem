using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Kiriu.WeighingSystem.Application.Services;

public class WeighingQueryService : IWeighingQueryService
{
    private readonly IWeighingOperationRepository _weighingRepository;
    private readonly ILogger<WeighingQueryService> _logger;

    public WeighingQueryService(
        IWeighingOperationRepository weighingRepository,
        ILogger<WeighingQueryService> logger)
    {
        _weighingRepository = weighingRepository;
        _logger = logger;
    }

    public async Task<ApiResponse<WeighingQueryResponseDto>> QueryWeighingOperationsAsync(WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Consultando operaciones de pesaje con filtros: {@Filters}", filters);

            var operations = await _weighingRepository.QueryOperationsAsync(
                filters.FechaDesde,
                filters.FechaHasta,
                filters.Folio,
                filters.Placa,
                filters.Estado,
                filters.EdicionPosterior,
                filters.Page,
                filters.Size
            );

            var totalCount = await _weighingRepository.CountOperationsAsync(
                filters.FechaDesde,
                filters.FechaHasta,
                filters.Folio,
                filters.Placa,
                filters.Estado,
                filters.EdicionPosterior
            );

            var resultados = operations.Select(op => new WeighingQueryResultDto
            {
                Id = op.Id.ToString(),
                Folio = op.Folio,
                Fecha = op.CreatedAt,
                Placas = BuildPlacasString(op),
                ClienteProveedor = op.ClientProviderName,
                Producto = op.Product,
                Tipo = op.UnitType,
                TipoUnidad = op.TipoUnidad,
                PesoBruto = op.EntryWeight,
                PesoSalida = op.ExitWeight,
                PesoNeto = op.NetWeight,
                Estado = op.Status,
                FueEditado = op.FueEditado,
                FechaEdicion = op.FechaUltimaEdicion,
                PuedeReimprimir = op.Status == "SALIDA_REGISTRADA",
                CreatedBy = op.CreatedBy,
                ExitRegisteredBy = op.ExitRegisteredBy,
                UsuarioEditor = op.UsuarioEditor,
                UpdatedAt = op.UpdatedAt,
                EntryDate = op.EntryDate,
                ExitDate = op.ExitDate,
                Photos = op.Photos?.Select(p => new WeighingPhotoDto
                {
                    Id = p.Id.ToString(),
                    PhotoType = p.PhotoType,
                    Description = p.Description,
                    CreatedAt = p.CreatedAt
                }).ToList() ?? new List<WeighingPhotoDto>(),
                Remolques = op.Remolques?.Select(r => new RemolqueInfoDto
                {
                    Numero = r.Numero,
                    Placa = r.Placa,
                    PesoBruto = r.PesoBruto,
                    PesoTara = r.PesoTara,
                    FechaRegistro = r.FechaRegistro,
                    RegistradoPor = r.RegistradoPor,
                    FechaSalida = r.FechaSalida,
                    RegistradoPorSalida = r.RegistradoPorSalida
                }).ToList() ?? new List<RemolqueInfoDto>()
            }).ToList();

            var response = new WeighingQueryResponseDto
            {
                Resultados = resultados,
                Pagination = new PaginationDto
                {
                    Page = filters.Page,
                    Size = filters.Size,
                    Total = totalCount,
                    TotalPages = (int)Math.Ceiling((double)totalCount / filters.Size)
                }
            };

            return ApiResponse<WeighingQueryResponseDto>.CreateSuccess(response, "Consulta realizada exitosamente");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar operaciones de pesaje");
            return ApiResponse<WeighingQueryResponseDto>.CreateError("Error interno del servidor al consultar operaciones");
        }
    }

    public async Task<ApiResponse<List<WeighingExportDto>>> GetWeighingOperationsForExportAsync(WeighingQueryFiltersDto filters)
    {
        try
        {
            _logger.LogInformation("Obteniendo datos para exportación con filtros: {@Filters}", filters);

            var operations = await _weighingRepository.QueryOperationsAsync(
                filters.FechaDesde,
                filters.FechaHasta,
                filters.Folio,
                filters.Placa,
                filters.Estado,
                filters.EdicionPosterior,
                1,
                int.MaxValue // Para exportar todos los resultados
            );

            var exportData = operations.Select(op =>
            {
                var dto = new WeighingExportDto
                {
                    Folio = op.Folio,
                    Fecha = op.CreatedAt,
                    Placas = BuildPlacasString(op),
                    PlacaT = GetPlacaTrailer(op),
                    PlacaR = GetPlacaRemolque(op),
                    PlacaR2 = GetPlacaRemolque2(op),
                    ClienteProveedor = op.ClientProviderName,
                    Producto = op.Product,
                    Tipo = op.UnitType,
                    TipoUnidad = op.TipoUnidad,
                    PesoBruto = op.EntryWeight,
                    PesoSalida = op.ExitWeight,
                    PesoNeto = op.NetWeight,
                    Estado = op.Status,
                    PesadoEntradaPor = GetPesadoEntradaPor(op),
                    PesadoSalidaPor = GetPesadoSalidaPor(op),
                    FechaEntrada = op.EntryDate,
                    FechaSalida = op.ExitDate,
                    EditadoPor = op.UsuarioEditor ?? ""
                };

                // Para doble remolque, agregar fechas y pesos individuales de cada remolque
                if (op.TipoUnidad == "doble-remolque" && op.Remolques?.Count == 2)
                {
                    var remolque1 = op.Remolques.FirstOrDefault(r => r.Numero == 1);
                    var remolque2 = op.Remolques.FirstOrDefault(r => r.Numero == 2);

                    if (remolque1 != null && remolque2 != null)
                    {
                        dto.FechaEntradaRemolque1 = remolque1.FechaRegistro;
                        dto.FechaEntradaRemolque2 = remolque2.FechaRegistro;
                        dto.FechaSalidaRemolque1 = remolque1.FechaSalida;
                        dto.FechaSalidaRemolque2 = remolque2.FechaSalida;

                        // Pesos individuales de cada remolque
                        dto.PesoBrutoRemolque1 = remolque1.PesoBruto;
                        dto.PesoBrutoRemolque2 = remolque2.PesoBruto;
                        dto.PesoTaraRemolque1 = remolque1.PesoTara;
                        dto.PesoTaraRemolque2 = remolque2.PesoTara;
                    }
                }

                // Construir bloques de edición: primero valores actuales, luego historial
                dto.FechaEdicion = BuildFechasEdicionColumn(op);
                dto.Justificacion = BuildJustificacionColumn(op);
                dto.ValoresOriginales = BuildValoresOriginalesColumn(op);

                return dto;
            }).ToList();

            return ApiResponse<List<WeighingExportDto>>.CreateSuccess(exportData, "Datos de exportación obtenidos exitosamente");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener datos para exportación");
            return ApiResponse<List<WeighingExportDto>>.CreateError("Error interno del servidor al obtener datos de exportación");
        }
    }

    private static string BuildPlacasString(Domain.Entities.WeighingOperation operation)
    {
        var placas = new List<string>();

        if (!string.IsNullOrEmpty(operation.TrailerPlate))
            placas.Add(operation.TrailerPlate);

        if (!string.IsNullOrEmpty(operation.TrailerPlate2))
            placas.Add(operation.TrailerPlate2);

        if (!string.IsNullOrEmpty(operation.TrailerPlateContenedor))
            placas.Add(operation.TrailerPlateContenedor);

        if (!string.IsNullOrEmpty(operation.RemolquePlateContenedor))
            placas.Add(operation.RemolquePlateContenedor);

        if (!string.IsNullOrEmpty(operation.PlacaRemolque1))
            placas.Add(operation.PlacaRemolque1);

        if (!string.IsNullOrEmpty(operation.PlacaRemolque2))
            placas.Add(operation.PlacaRemolque2);

        return string.Join(", ", placas.Where(p => !string.IsNullOrEmpty(p)));
    }

    private static string GetPlacaTrailer(Domain.Entities.WeighingOperation operation)
    {
        // La placa del tráiler es siempre la primera placa disponible
        return operation.TrailerPlate ?? operation.TrailerPlateContenedor ?? string.Empty;
    }

    private static string GetPlacaRemolque(Domain.Entities.WeighingOperation operation)
    {
        // La placa del remolque depende del tipo de unidad
        if (operation.TipoUnidad == "doble-remolque")
        {
            return operation.PlacaRemolque1 ?? string.Empty;
        }

        // Para remolque simple y contenedor
        return operation.TrailerPlate2 ?? operation.RemolquePlateContenedor ?? string.Empty;
    }

    private static string GetPlacaRemolque2(Domain.Entities.WeighingOperation operation)
    {
        // Solo para doble-remolque
        if (operation.TipoUnidad == "doble-remolque")
        {
            return operation.PlacaRemolque2 ?? string.Empty;
        }

        return string.Empty;
    }

    private static string FormatUsername(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return string.Empty;

        // Extraer solo el nombre de usuario antes del @
        var atIndex = email.IndexOf('@');
        return atIndex > 0 ? email.Substring(0, atIndex) : email;
    }

    private static string GetPesadoEntradaPor(Domain.Entities.WeighingOperation operation)
    {
        // Para doble remolque, concatenar usuarios de ambos remolques
        if (operation.TipoUnidad == "doble-remolque" && operation.Remolques?.Count == 2)
        {
            var remolque1 = operation.Remolques.FirstOrDefault(r => r.Numero == 1);
            var remolque2 = operation.Remolques.FirstOrDefault(r => r.Numero == 2);

            if (remolque1 != null && remolque2 != null)
            {
                var user1 = FormatUsername(remolque1.RegistradoPor);
                var user2 = FormatUsername(remolque2.RegistradoPor);
                return $"{user1} - {user2}";
            }
        }

        // Para otros flujos, usar CreatedBy
        return FormatUsername(operation.CreatedBy);
    }

    private static string GetPesadoSalidaPor(Domain.Entities.WeighingOperation operation)
    {
        // Para doble remolque, concatenar usuarios de salida de ambos remolques
        if (operation.TipoUnidad == "doble-remolque" && operation.Remolques?.Count == 2)
        {
            var remolque1 = operation.Remolques.FirstOrDefault(r => r.Numero == 1);
            var remolque2 = operation.Remolques.FirstOrDefault(r => r.Numero == 2);

            if (remolque1 != null && remolque2 != null)
            {
                var user1 = FormatUsername(remolque1.RegistradoPorSalida);
                var user2 = FormatUsername(remolque2.RegistradoPorSalida);
                return $"{user1} - {user2}";
            }
        }

        // Para otros flujos, usar ExitRegisteredBy
        return FormatUsername(operation.ExitRegisteredBy);
    }

    private static string FormatValoresOriginales(string? valoresOriginalesJson)
    {
        if (string.IsNullOrWhiteSpace(valoresOriginalesJson))
            return string.Empty;

        try
        {
            // Parsear el JSON de valores originales
            var valoresOriginales = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                valoresOriginalesJson,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (valoresOriginales == null || valoresOriginales.Count == 0)
                return string.Empty;

            var partes = new List<string>();

            // Mapear campos con etiquetas legibles, en el mismo orden que el modal
            if (valoresOriginales.TryGetValue("Tipo", out var tipo) && tipo != null)
            {
                var tipoStr = tipo.ToString() ?? "";
                var tipoLabel = tipoStr.ToLower() switch
                {
                    "provider" => "Proveedor",
                    "client" => "Cliente",
                    _ => tipoStr
                };
                partes.Add($"Tipo: {tipoLabel}");
            }

            if (valoresOriginales.TryGetValue("TipoUnidad", out var tipoUnidad) && tipoUnidad != null)
            {
                var tipoUnidadStr = tipoUnidad.ToString() ?? "";
                var tipoUnidadLabel = tipoUnidadStr.ToLower() switch
                {
                    "remolque" => "Remolque",
                    "contenedor" => "Contenedor",
                    "doble-remolque" => "2 Remolques",
                    _ => tipoUnidadStr
                };
                partes.Add($"Tipo Unidad: {tipoUnidadLabel}");
            }

            if (valoresOriginales.TryGetValue("ClienteProveedor", out var clienteProveedor) && clienteProveedor != null)
            {
                var valor = clienteProveedor.ToString();
                if (!string.IsNullOrWhiteSpace(valor))
                    partes.Add($"Empresa: {valor}");
            }

            if (valoresOriginales.TryGetValue("Producto", out var producto) && producto != null)
            {
                var valor = producto.ToString();
                if (!string.IsNullOrWhiteSpace(valor))
                    partes.Add($"Material-Chofer: {valor}");
            }

            if (valoresOriginales.TryGetValue("TrailerPlate", out var trailerPlate) && trailerPlate != null)
            {
                var valor = trailerPlate.ToString();
                if (!string.IsNullOrWhiteSpace(valor))
                    partes.Add($"Tráiler: {valor}");
            }

            if (valoresOriginales.TryGetValue("TrailerPlate2", out var trailerPlate2) && trailerPlate2 != null)
            {
                var valor = trailerPlate2.ToString();
                if (!string.IsNullOrWhiteSpace(valor))
                    partes.Add($"Remolque: {valor}");
            }

            if (valoresOriginales.TryGetValue("PlacaRemolque1", out var placaRemolque1) && placaRemolque1 != null)
            {
                var valor = placaRemolque1.ToString();
                if (!string.IsNullOrWhiteSpace(valor))
                    partes.Add($"Remolque 1: {valor}");
            }

            if (valoresOriginales.TryGetValue("PlacaRemolque2", out var placaRemolque2) && placaRemolque2 != null)
            {
                var valor = placaRemolque2.ToString();
                if (!string.IsNullOrWhiteSpace(valor))
                    partes.Add($"Remolque 2: {valor}");
            }

            // Retornar valores separados por " | " para mejor legibilidad en Excel
            return string.Join(" | ", partes);
        }
        catch
        {
            // Si falla el parseo, retornar el JSON original
            return valoresOriginalesJson;
        }
    }

    /// <summary>
    /// Construye la columna "Fecha de Edición" con formato:
    /// Todas las ediciones ordenadas de más reciente a más antigua (separadas por salto de línea)
    /// </summary>
    private static string BuildFechasEdicionColumn(Domain.Entities.WeighingOperation operation)
    {
        var bloques = new List<string>();

        // Mostrar solo las ediciones históricas ordenadas de más reciente a más antigua
        if (operation.EditHistory != null && operation.EditHistory.Any())
        {
            var edicionesOrdenadas = operation.EditHistory
                .OrderByDescending(h => h.FechaEdicion)
                .ToList();

            foreach (var edicion in edicionesOrdenadas)
            {
                bloques.Add(edicion.FechaEdicion.ToLocalTime().ToString("dd/MM/yyyy HH:mm"));
            }
        }

        // Separar cada bloque con salto de línea
        return string.Join("\n", bloques);
    }

    /// <summary>
    /// Construye la columna "Justificación" con formato:
    /// Todas las justificaciones de ediciones ordenadas de más reciente a más antigua (separadas por salto de línea)
    /// </summary>
    private static string BuildJustificacionColumn(Domain.Entities.WeighingOperation operation)
    {
        var bloques = new List<string>();

        // Mostrar solo las justificaciones históricas ordenadas de más reciente a más antigua
        if (operation.EditHistory != null && operation.EditHistory.Any())
        {
            var edicionesOrdenadas = operation.EditHistory
                .OrderByDescending(h => h.FechaEdicion)
                .ToList();

            foreach (var edicion in edicionesOrdenadas)
            {
                var justificacion = edicion.Justificacion ?? "(Sin justificación)";
                bloques.Add(justificacion);
            }
        }

        // Separar cada bloque con salto de línea
        return string.Join("\n", bloques);
    }

    /// <summary>
    /// Construye la columna "Valores Originales" con formato:
    /// Todas las ediciones históricas ordenadas de más reciente a más antigua (separadas por salto de línea)
    /// </summary>
    private static string BuildValoresOriginalesColumn(Domain.Entities.WeighingOperation operation)
    {
        var bloques = new List<string>();

        // Mostrar solo las ediciones históricas ordenadas de más reciente a más antigua
        if (operation.EditHistory != null && operation.EditHistory.Any())
        {
            var edicionesOrdenadas = operation.EditHistory
                .OrderByDescending(h => h.FechaEdicion)
                .ToList();

            foreach (var edicion in edicionesOrdenadas)
            {
                var valoresEditados = FormatValoresOriginales(edicion.ValoresOriginales);
                if (!string.IsNullOrWhiteSpace(valoresEditados))
                {
                    bloques.Add(valoresEditados);
                }
            }
        }

        // Separar cada bloque con salto de línea
        return string.Join("\n", bloques);
    }

}