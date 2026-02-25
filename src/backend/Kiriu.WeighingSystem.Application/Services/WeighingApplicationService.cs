using Mapster;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class WeighingApplicationService : IWeighingApplicationService
{
    private readonly IWeighingOperationRepository _weighingRepository;
    private readonly IWeighingPhotoRepository _photoRepository;
    private readonly IWeighingService _weighingService;
    private readonly IAuditLogger _auditLogger;
    private readonly ILogger<WeighingApplicationService> _logger;
    private readonly IWeighingEditHistoryRepository _editHistoryRepository;

    public WeighingApplicationService(
        IWeighingOperationRepository weighingRepository,
        IWeighingPhotoRepository photoRepository,
        IWeighingService weighingService,
        IAuditLogger auditLogger,
        ILogger<WeighingApplicationService> logger,
        IWeighingEditHistoryRepository editHistoryRepository)
    {
        _weighingRepository = weighingRepository;
        _photoRepository = photoRepository;
        _weighingService = weighingService;
        _auditLogger = auditLogger;
        _logger = logger;
        _editHistoryRepository = editHistoryRepository;
    }

    public async Task<ApiResponse<WeighingOperationDto>> CreateEntryAsync(CreateEntryRequest request)
    {
        try
        {
            // Validate unique entry (solo si hay placa del tráiler)
            // En flujo de solo contenedor, la placa puede estar vacía
            if (!string.IsNullOrWhiteSpace(request.TrailerPlate))
            {
                var canCreate = await _weighingService.ValidateUniqueEntryAsync(request.TrailerPlate);
                if (!canCreate)
                {
                    return ApiResponse<WeighingOperationDto>.CreateError("Placa ya registrada en entrada previa");
                }
            }

            var operation = new WeighingOperation
            {
                Id = Guid.NewGuid(),
                Folio = await _weighingService.GenerateFolioAsync(),
                UnitType = request.UnitType,
                OperationType = request.OperationType,
                // Convertir strings vacíos a null para campos opcionales (flujo contenedor)
                TrailerPlate = string.IsNullOrWhiteSpace(request.TrailerPlate) ? null : request.TrailerPlate,
                TrailerPlate2 = string.IsNullOrWhiteSpace(request.TrailerPlate2) ? null : request.TrailerPlate2,
                TrailerPlateContenedor = string.IsNullOrWhiteSpace(request.TrailerPlateContenedor) ? null : request.TrailerPlateContenedor,
                RemolquePlateContenedor = string.IsNullOrWhiteSpace(request.RemolquePlateContenedor) ? null : request.RemolquePlateContenedor,
                Product = request.Product,
                ClientProviderName = request.ClientProviderName,
                ClientProviderRfc = request.ClientProviderRfc,
                EntryWeight = request.EntryWeight,
                Status = "ENTRADA_REGISTRADA",
                TipoUnidad = request.TipoUnidad,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EntryDate = DateTime.UtcNow,
                // Marcar como editado manualmente si se detectaron ediciones durante el registro
                FueEditado = request.TieneEdicionesManuale,
                FechaUltimaEdicion = request.TieneEdicionesManuale ? DateTime.UtcNow : null,
                UsuarioEditor = request.TieneEdicionesManuale ? request.UsuarioEditor : null
            };

            // Add photos - vincular fotos huérfanas asíncronamente
            await ProcessPhotosFromRequestAsync(operation.Id, request.Photos);

            var created = await _weighingRepository.CreateAsync(operation);
            var result = created.Adapt<WeighingOperationDto>();

            return ApiResponse<WeighingOperationDto>.CreateSuccess(result, "Operación de entrada registrada exitosamente");
        }
        catch (Exception ex)
        {
            return ApiResponse<WeighingOperationDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<DoubleTrailerEntryResponseDto>> CreateDoubleTrailerEntryAsync(CreateDoubleTrailerEntryRequest request)
    {
        try
        {
            // Validate unique entry for all plates
            foreach (var remolque in request.Remolques)
            {
                var canCreate = await _weighingService.ValidateUniqueEntryAsync(remolque.Placa);
                if (!canCreate)
                {
                    return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError($"Placa {remolque.Placa} ya registrada en entrada previa");
                }
            }

            var operation = new WeighingOperation
            {
                Id = Guid.NewGuid(),
                Folio = await _weighingService.GenerateFolioAsync(),
                UnitType = request.UnitType,
                OperationType = "entry",
                TrailerPlate = request.TrailerPlaca,
                // Guardar placas de remolques en los campos de la operación principal
                PlacaRemolque1 = request.Remolques.FirstOrDefault(r => r.Numero == 1)?.Placa,
                PlacaRemolque2 = request.Remolques.FirstOrDefault(r => r.Numero == 2)?.Placa,
                Product = request.Product,
                ClientProviderName = request.ClientProviderName,
                EntryWeight = request.PesoBrutoTotal,
                Status = "ENTRADA_REGISTRADA",
                TipoUnidad = request.TipoUnidad,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EntryDate = DateTime.UtcNow,
                // Marcar como editado manualmente si se detectaron ediciones durante el registro
                FueEditado = request.TieneEdicionesManuale,
                FechaUltimaEdicion = request.TieneEdicionesManuale ? DateTime.UtcNow : null,
                UsuarioEditor = request.TieneEdicionesManuale ? request.UsuarioEditor : null
            };

            // Add remolques
            operation.Remolques = request.Remolques.Select(r => new WeighingRemolque
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operation.Id,
                Numero = r.Numero,
                Placa = r.Placa,
                PesoBruto = r.PesoBruto,
                PesoCapturado = r.PesoCapturado,
                FotosCapturadas = r.FotosCapturadas,
                FotoCargaCapturada = r.FotoCargaCapturada,
                FotoPlacaCapturada = r.FotoPlacaCapturada,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            // Procesar fotos ANPR del tráiler y remolques
            await ProcessDoubleTrailerPhotosAsync(operation.Id, request);

            var created = await _weighingRepository.CreateAsync(operation);

            var response = new DoubleTrailerEntryResponseDto
            {
                Id = created.Id.ToString(),
                Folio = created.Folio,
                TrailerPlaca = created.TrailerPlate!,
                Remolques = created.Remolques.Select(r => new RemolqueResponseDto
                {
                    Numero = r.Numero,
                    Placa = r.Placa,
                    PesoBruto = r.PesoBruto,
                    Fotos = request.Remolques.First(x => x.Numero == r.Numero).Fotos
                }).ToList(),
                PesoBrutoTotal = request.PesoBrutoTotal,
                FechaHoraEntrada = created.CreatedAt,
                UnitType = created.UnitType,
                Product = created.Product,
                ClientProviderName = created.ClientProviderName
            };

            return ApiResponse<DoubleTrailerEntryResponseDto>.CreateSuccess(response, "Entrada con doble remolque registrada exitosamente");
        }
        catch (Exception ex)
        {
            return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<EntrySearchDataDto>> SearchEntryByPlateAsync(string placa)
    {
        try
        {
            var entry = await _weighingRepository.GetLatestEntryByPlateAsync(placa);
            
            if (entry == null)
            {
                return ApiResponse<EntrySearchDataDto>.CreateError("Registro no encontrado");
            }

            var result = new EntrySearchDataDto
            {
                Id = entry.Id.ToString(),
                CreatedAt = entry.CreatedAt,
                TipoUnidad = entry.TipoUnidad,
                ClientProviderName = entry.ClientProviderName,
                Product = entry.Product,
                EntryWeight = entry.EntryWeight ?? 0,
                Status = entry.Status,
                PlacaTrailer = entry.TrailerPlate,
                PlacaRemolque = entry.TrailerPlate2,
                PlacaRemolque1 = entry.PlacaRemolque1,
                PlacaRemolque2 = entry.PlacaRemolque2,
                PlacaTrailerContenedor = entry.TrailerPlateContenedor,
                PlacaRemolqueContenedor = entry.RemolquePlateContenedor,
                Fotos = CreateEntryPhotosDto(entry.Photos)
            };

            return ApiResponse<EntrySearchDataDto>.CreateSuccess(result, "Registro de entrada encontrado");
        }
        catch (Exception ex)
        {
            return ApiResponse<EntrySearchDataDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ExitResponseDto>> CreateExitAsync(CreateExitRequest request)
    {
        try
        {
            Console.WriteLine($"[CreateExitAsync] Starting exit registration for folio: {request.Folio}");
            
            var entry = await _weighingRepository.GetByFolioAsync(request.Folio);
            if (entry == null)
            {
                Console.WriteLine($"[CreateExitAsync] No entry found for folio: {request.Folio}");
                return ApiResponse<ExitResponseDto>.CreateError("Registro de entrada no encontrado");
            }

            Console.WriteLine($"[CreateExitAsync] Found entry - Folio: {entry.Folio}, Status: {entry.Status}, ID: {entry.Id}");
            Console.WriteLine($"[CreateExitAsync] Entry plates: Trailer={entry.TrailerPlate}, Trailer2={entry.TrailerPlate2}");
            Console.WriteLine($"[CreateExitAsync] Request plates: Trailer={request.PlacaTrailer}, Remolque={request.PlacaRemolque}");

            // Validación más específica del estado
            if (entry.Status == "SALIDA_REGISTRADA")
            {
                Console.WriteLine($"[CreateExitAsync] Entry already has exit registered - Status: {entry.Status}");
                return ApiResponse<ExitResponseDto>.CreateError("El registro ya tiene una salida registrada");
            }

            if (entry.Status != "ENTRADA_REGISTRADA")
            {
                Console.WriteLine($"[CreateExitAsync] Invalid entry status - Expected: ENTRADA_REGISTRADA, Found: {entry.Status}");
                return ApiResponse<ExitResponseDto>.CreateError($"Estado del registro inválido: {entry.Status}. Se esperaba ENTRADA_REGISTRADA");
            }

            // Validar que las placas del request coincidan con las del entry
            bool plateMatches = 
                (request.PlacaTrailer == entry.TrailerPlate) ||
                (request.PlacaRemolque == entry.TrailerPlate2) ||
                (request.PlacaTrailer == entry.TrailerPlate2);

            if (!plateMatches)
            {
                Console.WriteLine($"[CreateExitAsync] Plate mismatch detected!");
                Console.WriteLine($"  Request: Trailer={request.PlacaTrailer}, Remolque={request.PlacaRemolque}");
                Console.WriteLine($"  Entry: Trailer={entry.TrailerPlate}, Trailer2={entry.TrailerPlate2}");
                return ApiResponse<ExitResponseDto>.CreateError("Las placas del request no coinciden con el registro de entrada");
            }

            Console.WriteLine($"[CreateExitAsync] All validations passed, proceeding with update");

            // Update entry to exit
            entry.ExitWeight = request.PesoBruto;
            entry.NetWeight = request.PesoNeto;
            entry.Status = "SALIDA_REGISTRADA";
            entry.ExitDate = request.FechaSalida;
            entry.UpdatedAt = DateTime.UtcNow;

            // Actualizar FueEditado si hubo ediciones manuales en la salida
            Console.WriteLine($"[CreateExitAsync] TieneEdicionesManuale={request.TieneEdicionesManuale}, UsuarioEditor={request.UsuarioEditor}");
            if (request.TieneEdicionesManuale)
            {
                entry.FueEditado = true;
                entry.FechaUltimaEdicion = DateTime.UtcNow;
                entry.UsuarioEditor = request.UsuarioEditor;
                Console.WriteLine($"[CreateExitAsync] Marked as edited - FueEditado={entry.FueEditado}, UsuarioEditor={entry.UsuarioEditor}");
            }

            // Add exit photos - usar el mismo motor que entrada
            await ProcessExitPhotosFromRequestAsync(entry.Id, request.Fotos);

            Console.WriteLine($"[CreateExitAsync] About to update - Folio: {entry.Folio}, New Status: {entry.Status}");
            
            var updatedEntry = await _weighingRepository.UpdateAsync(entry);
            
            Console.WriteLine($"[CreateExitAsync] Successfully updated - Folio: {updatedEntry.Folio}, Final Status: {updatedEntry.Status}");

            var response = new ExitResponseDto
            {
                Folio = updatedEntry.Folio,
                Estado = updatedEntry.Status,
                FechaSalida = updatedEntry.ExitDate ?? DateTime.UtcNow,
                PesoNeto = updatedEntry.NetWeight ?? 0,
                Mensaje = "Registro de salida completado",
                ExitRegisteredBy = updatedEntry.ExitRegisteredBy
            };

            return ApiResponse<ExitResponseDto>.CreateSuccess(response, "Registro de salida completado");
        }
        catch (Exception ex)
        {
            return ApiResponse<ExitResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ExitResponseDto>> CreateDoubleTrailerExitAsync(CreateDoubleTrailerExitRequest request)
    {
        try
        {
            var entry = await _weighingRepository.GetByFolioAsync(request.Folio);
            if (entry == null)
            {
                return ApiResponse<ExitResponseDto>.CreateError("Registro de entrada no encontrado");
            }

            // Aceptar entrada completa (ENTRADA_REGISTRADA o ENTRADA_COMPLETA para doble remolque)
            var entryOk = entry.Status == "ENTRADA_REGISTRADA" || entry.Status == "ENTRADA_COMPLETA";
            if (!entryOk)
            {
                return ApiResponse<ExitResponseDto>.CreateError("El registro ya tiene una salida registrada");
            }

            // Update remolques with exit data
            var remolque1 = entry.Remolques.FirstOrDefault(r => r.Placa == request.Remolque1.Placa);
            if (remolque1 != null)
            {
                remolque1.PesoTara = request.Remolque1.PesoTara;
                remolque1.FotoCargaCapturada = request.Remolque1.FotoCargaCapturada;
                remolque1.UpdatedAt = DateTime.UtcNow;
            }

            var remolque2 = entry.Remolques.FirstOrDefault(r => r.Placa == request.Remolque2.Placa);
            if (remolque2 != null)
            {
                remolque2.PesoTara = request.Remolque2.PesoTara;
                remolque2.FotoCargaCapturada = request.Remolque2.FotoCargaCapturada;
                remolque2.UpdatedAt = DateTime.UtcNow;
            }

            // Update main operation
            entry.ExitWeight = request.PesoBrutoTotal;
            entry.NetWeight = request.PesoNetoCalculado;
            entry.Status = "SALIDA_REGISTRADA";
            entry.ExitDate = request.FechaSalida;
            entry.UpdatedAt = DateTime.UtcNow;

            // Vincular fotos ANPR huérfanas del request.Fotos - usar el mismo motor que entrada
            if (request.Fotos != null)
            {
                await ProcessDoubleTrailerExitPhotosFromRequestAsync(entry.Id, request.Fotos);
            }

            var updatedEntry = await _weighingRepository.UpdateAsync(entry);

            var response = new ExitResponseDto
            {
                Folio = updatedEntry.Folio,
                Estado = updatedEntry.Status,
                FechaSalida = updatedEntry.ExitDate ?? DateTime.UtcNow,
                PesoNeto = updatedEntry.NetWeight ?? 0,
                Mensaje = "Salida con doble remolque registrada exitosamente",
                ExitRegisteredBy = updatedEntry.ExitRegisteredBy
            };

            return ApiResponse<ExitResponseDto>.CreateSuccess(response, "Registro de salida completado");
        }
        catch (Exception ex)
        {
            return ApiResponse<ExitResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PaginatedWeighingOperationsDto>> GetOperationsAsync(
        int page = 1, 
        int size = 20, 
        string? status = null, 
        string? unitType = null, 
        DateTime? dateFrom = null, 
        DateTime? dateTo = null)
    {
        try
        {
            var (operations, total) = await _weighingRepository.GetPaginatedAsync(
                page, size, status, unitType, dateFrom, dateTo);

            var operationDtos = operations.Adapt<List<WeighingOperationDto>>();

            var result = new PaginatedWeighingOperationsDto
            {
                Operations = operationDtos,
                Pagination = new PaginationDto
                {
                    Page = page,
                    Size = size,
                    Total = total,
                    TotalPages = (int)Math.Ceiling((double)total / size)
                }
            };

            return ApiResponse<PaginatedWeighingOperationsDto>.CreateSuccess(result, "Operaciones obtenidas exitosamente");
        }
        catch (Exception ex)
        {
            return ApiResponse<PaginatedWeighingOperationsDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<WeighingOperationDto>> GetOperationByPlateAsync(string placa)
    {
        try
        {
            var operations = await _weighingRepository.GetOperationsByPlateAsync(placa);
            var latestOperation = operations.FirstOrDefault();

            if (latestOperation == null)
            {
                return ApiResponse<WeighingOperationDto>.CreateError("Operación no encontrada");
            }

            var result = latestOperation.Adapt<WeighingOperationDto>();
            return ApiResponse<WeighingOperationDto>.CreateSuccess(result, "Operación encontrada");
        }
        catch (Exception ex)
        {
            return ApiResponse<WeighingOperationDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<WeighingOperationDto>> GetOperationByIdAsync(string id)
    {
        try
        {
            if (!Guid.TryParse(id, out var operationId))
            {
                return ApiResponse<WeighingOperationDto>.CreateError("ID de operación inválido");
            }

            var operation = await _weighingRepository.GetByIdAsync(operationId);

            if (operation == null)
            {
                return ApiResponse<WeighingOperationDto>.CreateError("Operación no encontrada");
            }

            var result = operation.Adapt<WeighingOperationDto>();
            return ApiResponse<WeighingOperationDto>.CreateSuccess(result, "Operación encontrada");
        }
        catch (Exception ex)
        {
            return ApiResponse<WeighingOperationDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ExitValidationDto>> ValidateExitAsync(string placa)
    {
        try
        {
            Console.WriteLine($"[ValidateExitAsync] Validating plate: {placa}");
            var activeEntry = await _weighingService.FindActiveEntryAsync(placa);

            if (activeEntry != null)
            {
                Console.WriteLine($"[ValidateExitAsync] Found active entry - Folio: {activeEntry.Folio}, Status: {activeEntry.Status}, ID: {activeEntry.Id}");
            }
            else
            {
                Console.WriteLine($"[ValidateExitAsync] No active entry found for plate: {placa}");
            }

            var result = new ExitValidationDto
            {
                CanExit = activeEntry != null,
                EntryOperation = activeEntry != null ? new EntryOperationDto
                {
                    Id = activeEntry.Id.ToString(),
                    Folio = activeEntry.Folio,
                    EntryWeight = activeEntry.EntryWeight ?? 0,
                    Status = activeEntry.Status
                } : null,
                Message = activeEntry != null
                    ? (activeEntry.Status == "SALIDA_PARCIAL_R1"
                        ? "Operación con salida parcial: puede continuar con remolque 2"
                        : "Vehículo puede registrar salida")
                    : "No se encontró entrada activa para esta placa"
            };

            return ApiResponse<ExitValidationDto>.CreateSuccess(result);
        }
        catch (Exception ex)
        {
            return ApiResponse<ExitValidationDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    private async Task ProcessPhotosFromRequestAsync(Guid operationId, PhotoDataDto photos)
    {
        // Procesar todas las fotos de forma asíncrona
        // FinalPhotoType = nombre de la propiedad del request (ej. "trailerPlate" en lugar de "trailerPlate")
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate, "trailerPlate", "trailerPlate_entry");
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate2, "trailerPlate2", "remolquePlate_entry");
        await ProcessPhotoFieldAsync(operationId, photos.Cargo, "cargoEntry", "cargo_entry");
        await ProcessPhotoFieldAsync(operationId, photos.Remolque1Plate, "remolque1Plate", "remolque1Plate_entry");
        await ProcessPhotoFieldAsync(operationId, photos.Remolque2Plate, "remolque2Plate", "remolque2Plate_entry");
        await ProcessPhotoFieldAsync(operationId, photos.CargoRemolque2, "cargoRemolque2", "cargoRemolque2_entry");
    }

    private async Task ProcessDoubleTrailerPhotosAsync(Guid operationId, CreateDoubleTrailerEntryRequest request)
    {
        _logger.LogInformation("Procesando fotos para entrada de doble remolque - OperationId: {OperationId}", operationId);

        // Procesar foto del tráiler (si existe)
        if (!string.IsNullOrEmpty(request.TrailerPlacaFoto))
        {
            _logger.LogInformation("Procesando foto del tráiler: {TrailerPlacaFoto}", request.TrailerPlacaFoto);
            await ProcessPhotoFieldAsync(operationId, request.TrailerPlacaFoto, "trailerPlate", "trailerPlate_entry");
        }
        else
        {
            _logger.LogWarning("No se proporcionó foto del tráiler en el request");
        }

        // Procesar fotos de cada remolque
        foreach (var remolque in request.Remolques)
        {
            _logger.LogInformation("Procesando {Count} fotos del remolque {Numero}", remolque.Fotos.Count, remolque.Numero);

            foreach (var foto in remolque.Fotos)
            {
                // Determinar el tipo de foto según el tipo especificado en el objeto
                string photoType;
                string finalPhotoType;

                if (foto.Type == "plate")
                {
                    // Es una foto de placa
                    photoType = $"remolque{remolque.Numero}Plate";
                    finalPhotoType = photoType; // FinalPhotoType = photoType para fotos de placa
                }
                else if (foto.Type == "cargo")
                {
                    // Es una foto de carga
                    photoType = $"cargoRemolque{remolque.Numero}";
                    finalPhotoType = photoType; // FinalPhotoType = photoType para fotos de carga
                }
                else
                {
                    _logger.LogWarning("Tipo de foto desconocido: {Type} para remolque {Numero}", foto.Type, remolque.Numero);
                    continue;
                }

                _logger.LogInformation("Procesando foto: URL={Url}, Type={Type}, PhotoType={PhotoType}, FinalPhotoType={FinalPhotoType}",
                    foto.Url, foto.Type, photoType, finalPhotoType);

                await ProcessPhotoFieldAsync(operationId, foto.Url, photoType, finalPhotoType);
            }
        }

        _logger.LogInformation("Finalizado procesamiento de fotos para doble remolque - OperationId: {OperationId}", operationId);
    }

    private async Task ProcessExitPhotosFromRequestAsync(Guid operationId, ExitPhotoDataDto photos)
    {
        // Usar el mismo motor que entrada para vincular fotos
        // FinalPhotoType = nombre de la propiedad del request
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate, "trailerPlate", "trailerPlate_exit");
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate2, "trailerPlate2", "remolquePlate_exit");
        await ProcessPhotoFieldAsync(operationId, photos.CargoState, "cargoExit", "cargo_exit");
        await ProcessPhotoFieldAsync(operationId, photos.ContainerPlate, "containerPlate", "containerPlate_exit");
    }

    private async Task ProcessDoubleTrailerExitPhotosFromRequestAsync(Guid operationId, DoubleTrailerExitPhotoDataDto photos)
    {
        // Usar el mismo motor que entrada para vincular fotos
        // FinalPhotoType = nombre de la propiedad del request
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate, "trailerPlate", "trailerPlate_exit");
        await ProcessPhotoFieldAsync(operationId, photos.Remolque1Plate, "remolque1Plate", "remolque1Plate_exit");
        await ProcessPhotoFieldAsync(operationId, photos.Remolque2Plate, "remolque2Plate", "remolque2Plate_exit");
        await ProcessPhotoFieldAsync(operationId, photos.CargoRemolque1, "cargoRemolque1", "cargoRemolque1_exit");
        await ProcessPhotoFieldAsync(operationId, photos.CargoRemolque2, "cargoRemolque2", "cargoRemolque2_exit");
    }

    private async Task ProcessPhotoFieldAsync(Guid operationId, string? photoUrl, string photoType, string? finalPhotoType = null)
    {
        // Solo procesar si es una URL de API (foto ANPR guardada en BD)
        // Ignorar marcadores de texto como "Foto capturada"
        if (string.IsNullOrEmpty(photoUrl) || !photoUrl.StartsWith("/api/"))
        {
            return;
        }

        try
        {
            WeighingPhoto? orphanPhoto = null;

            // Paso 1: Intentar buscar por URL exacta
            _logger.LogInformation("Buscando foto huérfana con URL: {PhotoUrl} para tipo: {PhotoType}", photoUrl, photoType);
            orphanPhoto = await _photoRepository.GetOrphanPhotoByUrlAsync(photoUrl);

            // Paso 2: Si no se encontró por URL, buscar la última huérfana por tipo (fallback)
            if (orphanPhoto == null)
            {
                _logger.LogWarning("⚠️ No se encontró foto huérfana con URL: {PhotoUrl}", photoUrl);
                _logger.LogInformation("🔄 Buscando última foto huérfana por tipo: {PhotoType}", photoType);

                orphanPhoto = await _photoRepository.GetLatestOrphanPhotoByTypeAsync(photoType);

                if (orphanPhoto != null)
                {
                    _logger.LogInformation("✅ Foto huérfana encontrada por tipo (fallback): {PhotoId}, CreatedAt: {CreatedAt}",
                        orphanPhoto.Id, orphanPhoto.CreatedAt);
                }
            }

            // Vincular la foto si se encontró (ya sea por URL o por tipo)
            if (orphanPhoto != null)
            {
                await _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId, finalPhotoType);
                _logger.LogInformation("✅ Foto huérfana {PhotoType} vinculada exitosamente: {PhotoId} -> {OperationId}, FinalPhotoType: {FinalPhotoType}",
                    photoType, orphanPhoto.Id, operationId, finalPhotoType ?? "null");
            }
            else
            {
                _logger.LogWarning("❌ No se encontró foto huérfana para tipo: {PhotoType} (ni por URL ni por tipo)", photoType);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error al vincular foto huérfana {PhotoType} con URL {PhotoUrl}, se omitirá", photoType, photoUrl);
        }
    }

    private EntryPhotosDto CreateEntryPhotosDto(ICollection<WeighingPhoto> photos)
    {
        var result = new EntryPhotosDto();

        foreach (var photo in photos)
        {
            switch (photo.PhotoType)
            {
                case "trailerPlate":
                    result.FotoEntradaTrailer = photo.PhotoUrl;
                    break;
                case "trailerPlate2":
                    result.FotoEntradaRemolque = photo.PhotoUrl;
                    break;
                case "remolque1Plate":
                    result.FotoEntradaRemolque1 = photo.PhotoUrl;
                    break;
                case "remolque2Plate":
                    result.FotoEntradaRemolque2 = photo.PhotoUrl;
                    break;
                case "cargoEntry":
                    result.FotoCargaEntrada = photo.PhotoUrl;
                    break;
            }
        }

        return result;
    }

    public async Task<ApiResponse<WeighingOperationDto>> UpdateWeighingOperationAsync(Guid operationId, UpdateWeighingOperationRequest request)
    {
        try
        {
            var operation = await _weighingRepository.GetByIdAsync(operationId);
            if (operation == null)
            {
                return ApiResponse<WeighingOperationDto>.CreateError("Operación de pesaje no encontrada");
            }

            // Detectar si se están editando las placas o pesos manualmente
            bool plateFieldsChanged = HasPlateFieldsChanged(operation, request);
            bool weightFieldsChanged = HasWeightFieldsChanged(operation, request);
            bool otherFieldsChanged = HasOtherFieldsChanged(operation, request);

            // LOG DIAGNÓSTICO (TEMPORAL)
            _logger.LogInformation(
                "🔍 DIAGNÓSTICO - OperationId: {OperationId}, PlacasEditadas: {PlacasEditadas}, PesosEditados: {PesosEditados}, OtrosCamposEditados: {OtrosCamposEditados}",
                operationId,
                plateFieldsChanged,
                weightFieldsChanged,
                otherFieldsChanged
            );

            // LOG DETALLE (TEMPORAL)
            _logger.LogInformation(
                "📊 VALORES - Original: [UnitType={OrigUnitType}, TipoUnidad={OrigTipoUnidad}, Product={OrigProduct}, ClientName={OrigClientName}] | Request: [UnitType={ReqUnitType}, TipoUnidad={ReqTipoUnidad}, Product={ReqProduct}, ClientName={ReqClientName}]",
                operation.UnitType, operation.TipoUnidad, operation.Product, operation.ClientProviderName,
                request.UnitType ?? "null", request.TipoUnidad ?? "null", request.Product ?? "null", request.ClientProviderName ?? "null"
            );

            // Capturar valores originales ANTES de aplicar cambios para el histórico
            var valoresOriginales = new
            {
                Tipo = operation.UnitType,
                TipoUnidad = operation.TipoUnidad,
                ClienteProveedor = operation.ClientProviderName,
                Producto = operation.Product,
                TrailerPlate = operation.TrailerPlate,
                TrailerPlate2 = operation.TrailerPlate2,
                PlacaRemolque1 = operation.PlacaRemolque1,
                PlacaRemolque2 = operation.PlacaRemolque2,
                TrailerPlateContenedor = operation.TrailerPlateContenedor,
                RemolquePlateContenedor = operation.RemolquePlateContenedor
            };

            // Marcar como editado manualmente si se cambió cualquier campo editable
            if (request.EsEdicionManual && (plateFieldsChanged || weightFieldsChanged || otherFieldsChanged))
            {
                // Validar justificación obligatoria
                if (string.IsNullOrWhiteSpace(request.Justificacion))
                {
                    return ApiResponse<WeighingOperationDto>.CreateError("La justificación es obligatoria para editar el registro");
                }

                if (request.Justificacion.Length > 70)
                {
                    return ApiResponse<WeighingOperationDto>.CreateError("La justificación no puede exceder 70 caracteres");
                }

                operation.FueEditado = true;
                operation.FechaUltimaEdicion = DateTime.UtcNow;
                operation.UsuarioEditor = request.UsuarioEditor;

                _logger.LogInformation(
                    "✅ Registro editado manualmente - OperationId: {OperationId}, Usuario: {Usuario}, Justificación: {Justificacion}, PlacasEditadas: {PlacasEditadas}, PesosEditados: {PesosEditados}, OtrosCamposEditados: {OtrosCamposEditados}",
                    operationId,
                    request.UsuarioEditor,
                    request.Justificacion,
                    plateFieldsChanged,
                    weightFieldsChanged,
                    otherFieldsChanged
                );
            }
            else
            {
                _logger.LogWarning(
                    "⚠️ NO se marcó como editado - OperationId: {OperationId}, EsEdicionManual: {EsEdicionManual}",
                    operationId,
                    request.EsEdicionManual
                );
            }

            // Actualizar campos si se proporcionan
            if (!string.IsNullOrEmpty(request.UnitType))
                operation.UnitType = request.UnitType;

            if (!string.IsNullOrEmpty(request.TipoUnidad))
                operation.TipoUnidad = request.TipoUnidad;

            // AJUSTE PARA LIMPIEZA DE PLACAS AL CAMBIAR TIPO DE UNIDAD:
            // Si es edición manual y se proporcionan campos de placas (aunque sean vacíos/null),
            // aplicarlos para permitir limpieza de placas no aplicables al nuevo tipo
            if (request.EsEdicionManual && request.TrailerPlate != null)
                operation.TrailerPlate = string.IsNullOrEmpty(request.TrailerPlate) ? null : request.TrailerPlate;

            if (request.EsEdicionManual && request.TrailerPlate2 != null)
                operation.TrailerPlate2 = string.IsNullOrEmpty(request.TrailerPlate2) ? null : request.TrailerPlate2;

            if (request.EsEdicionManual && request.TrailerPlateContenedor != null)
                operation.TrailerPlateContenedor = string.IsNullOrEmpty(request.TrailerPlateContenedor) ? null : request.TrailerPlateContenedor;

            if (request.EsEdicionManual && request.RemolquePlateContenedor != null)
                operation.RemolquePlateContenedor = string.IsNullOrEmpty(request.RemolquePlateContenedor) ? null : request.RemolquePlateContenedor;

            if (request.EsEdicionManual && request.PlacaRemolque1 != null)
                operation.PlacaRemolque1 = string.IsNullOrEmpty(request.PlacaRemolque1) ? null : request.PlacaRemolque1;

            if (request.EsEdicionManual && request.PlacaRemolque2 != null)
                operation.PlacaRemolque2 = string.IsNullOrEmpty(request.PlacaRemolque2) ? null : request.PlacaRemolque2;

            if (!string.IsNullOrEmpty(request.Product))
                operation.Product = request.Product;

            if (!string.IsNullOrEmpty(request.ClientProviderName))
                operation.ClientProviderName = request.ClientProviderName;

            if (!string.IsNullOrEmpty(request.ClientProviderRfc))
                operation.ClientProviderRfc = request.ClientProviderRfc;

            if (request.EntryWeight.HasValue)
                operation.EntryWeight = request.EntryWeight.Value;

            if (request.ExitWeight.HasValue)
                operation.ExitWeight = request.ExitWeight.Value;

            // Actualizar fecha de modificación
            operation.UpdatedAt = DateTime.UtcNow;

            var updated = await _weighingRepository.UpdateAsync(operation);

            // Guardar entrada en histórico de ediciones DESPUÉS de actualizar la operación
            if (request.EsEdicionManual && (plateFieldsChanged || weightFieldsChanged || otherFieldsChanged))
            {
                var historyEntry = new WeighingEditHistory
                {
                    Id = Guid.NewGuid(),
                    WeighingOperationId = operationId,
                    Justificacion = request.Justificacion!,
                    ValoresOriginales = System.Text.Json.JsonSerializer.Serialize(valoresOriginales),
                    FechaEdicion = DateTime.UtcNow,
                    UsuarioEditor = request.UsuarioEditor
                };

                // Guardar usando el repositorio para evitar problemas de concurrencia
                await _editHistoryRepository.CreateAsync(historyEntry);

                _logger.LogInformation(
                    "✅ Entrada de histórico creada - HistoryId: {HistoryId}, OperationId: {OperationId}, Justificación: {Justificacion}",
                    historyEntry.Id,
                    operationId,
                    request.Justificacion
                );
            }

            // Registrar en auditoría si fue una edición manual
            if (request.EsEdicionManual && (plateFieldsChanged || weightFieldsChanged))
            {
                var cambios = new List<string>();
                if (plateFieldsChanged) cambios.Add("Placas modificadas");
                if (weightFieldsChanged) cambios.Add($"Pesos modificados - Entrada: {request.EntryWeight}, Salida: {request.ExitWeight}");

                await _auditLogger.LogUpdateAsync(
                    usuarioId: request.UsuarioEditor ?? "Sistema",
                    nombreUsuario: request.UsuarioEditor,
                    recurso: "WeighingOperations",
                    registroId: operationId.ToString(),
                    payload: System.Text.Json.JsonSerializer.Serialize(new
                    {
                        Folio = operation.Folio,
                        EntryWeight = request.EntryWeight,
                        ExitWeight = request.ExitWeight,
                        Cambios = string.Join(", ", cambios)
                    }),
                    rutaApi: "/api/weighing/operations/{operationId}"
                );

                _logger.LogInformation(
                    "Registro de auditoría creado - OperationId: {OperationId}, Folio: {Folio}, Usuario: {Usuario}",
                    operationId,
                    operation.Folio,
                    request.UsuarioEditor
                );
            }

            var result = updated.Adapt<WeighingOperationDto>();

            return ApiResponse<WeighingOperationDto>.CreateSuccess(result, "Operación de pesaje actualizada exitosamente");
        }
        catch (Exception ex)
        {
            return ApiResponse<WeighingOperationDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    private bool HasPlateFieldsChanged(WeighingOperation original, UpdateWeighingOperationRequest request)
    {
        return (!string.IsNullOrEmpty(request.TrailerPlate) && request.TrailerPlate != original.TrailerPlate) ||
               (!string.IsNullOrEmpty(request.TrailerPlate2) && request.TrailerPlate2 != original.TrailerPlate2) ||
               (!string.IsNullOrEmpty(request.TrailerPlateContenedor) && request.TrailerPlateContenedor != original.TrailerPlateContenedor) ||
               (!string.IsNullOrEmpty(request.RemolquePlateContenedor) && request.RemolquePlateContenedor != original.RemolquePlateContenedor) ||
               (!string.IsNullOrEmpty(request.PlacaRemolque1) && request.PlacaRemolque1 != original.PlacaRemolque1) ||
               (!string.IsNullOrEmpty(request.PlacaRemolque2) && request.PlacaRemolque2 != original.PlacaRemolque2);
    }

    private bool HasWeightFieldsChanged(WeighingOperation original, UpdateWeighingOperationRequest request)
    {
        return (request.EntryWeight.HasValue && request.EntryWeight.Value != original.EntryWeight) ||
               (request.ExitWeight.HasValue && request.ExitWeight.Value != original.ExitWeight);
    }

    private bool HasOtherFieldsChanged(WeighingOperation original, UpdateWeighingOperationRequest request)
    {
        return (!string.IsNullOrEmpty(request.UnitType) && request.UnitType != original.UnitType) ||
               (!string.IsNullOrEmpty(request.TipoUnidad) && request.TipoUnidad != original.TipoUnidad) ||
               (!string.IsNullOrEmpty(request.Product) && request.Product != original.Product) ||
               (!string.IsNullOrEmpty(request.ClientProviderName) && request.ClientProviderName != original.ClientProviderName);
    }

    public async Task<PhotoBinaryDataDto?> GetPhotoDataAsync(Guid photoId)
    {
        try
        {
            var photo = await _photoRepository.GetByIdAsync(photoId);

            if (photo == null || photo.ImageData == null || photo.ImageData.Length == 0)
            {
                return null;
            }

            return new PhotoBinaryDataDto
            {
                ImageData = photo.ImageData,
                ContentType = photo.ContentType ?? "image/jpeg"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener datos de foto: {PhotoId}", photoId);
            return null;
        }
    }

    public async Task<ApiResponse<List<string>>> SearchProductsAsync(string searchTerm, int limit = 10)
    {
        try
        {
            var products = await _weighingRepository.SearchProductsAsync(searchTerm, limit);
            return ApiResponse<List<string>>.CreateSuccess(products);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar productos con término: {SearchTerm}", searchTerm);
            return ApiResponse<List<string>>.CreateError("Error al buscar productos");
        }
    }

    public async Task<ApiResponse<List<string>>> SearchClientsAsync(string searchTerm, int limit = 10)
    {
        try
        {
            var clients = await _weighingRepository.SearchClientsAsync(searchTerm, limit);
            return ApiResponse<List<string>>.CreateSuccess(clients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar clientes/proveedores con término: {SearchTerm}", searchTerm);
            return ApiResponse<List<string>>.CreateError("Error al buscar clientes/proveedores");
        }
    }

    public async Task<ApiResponse<List<PendingExitSearchResultDto>>> SearchPendingExitsAsync(string searchTerm, int limit = 10, string? unitType = null)
    {
        try
        {
            var results = await _weighingRepository.SearchPendingExitsAsync(searchTerm, limit, unitType);

            var dtos = results.Select(r => new PendingExitSearchResultDto
            {
                Id = r.Id.ToString(),
                Folio = r.Folio,
                TrailerPlate = r.TrailerPlate,
                TrailerPlate2 = r.TrailerPlate2,
                Product = r.Product,
                ClientProviderName = r.ClientProviderName,
                EntryWeight = r.EntryWeight ?? 0,
                CreatedAt = r.CreatedAt,
                TipoUnidad = r.TipoUnidad
            }).ToList();

            return ApiResponse<List<PendingExitSearchResultDto>>.CreateSuccess(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar entradas pendientes con término: {SearchTerm}", searchTerm);
            return ApiResponse<List<PendingExitSearchResultDto>>.CreateError("Error al buscar entradas pendientes");
        }
    }

    public async Task<ApiResponse<List<WeighingEditHistoryDto>>> GetEditHistoryAsync(Guid operationId)
    {
        try
        {
            // Obtener el histórico usando el repositorio
            var historyEntries = await _editHistoryRepository.GetByOperationIdAsync(operationId);

            var history = historyEntries
                .OrderByDescending(h => h.FechaEdicion)
                .Select(h => new WeighingEditHistoryDto
                {
                    Id = h.Id.ToString(),
                    WeighingOperationId = h.WeighingOperationId.ToString(),
                    Justificacion = h.Justificacion,
                    FechaEdicion = h.FechaEdicion,
                    UsuarioEditor = h.UsuarioEditor,
                    ValoresOriginales = System.Text.Json.JsonSerializer.Deserialize<OriginalValuesDto>(h.ValoresOriginales)
                })
                .ToList();

            return ApiResponse<List<WeighingEditHistoryDto>>.CreateSuccess(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener histórico de ediciones para operación: {OperationId}", operationId);
            return ApiResponse<List<WeighingEditHistoryDto>>.CreateError("Error al obtener histórico de ediciones");
        }
    }

    public async Task<ApiResponse<PartialDoubleTrailerEntryResponseDto>> CreatePartialDoubleTrailerEntryAsync(CreatePartialDoubleTrailerEntryRequest request)
    {
        try
        {
            _logger.LogInformation("Creando entrada parcial de doble remolque (solo remolque 1) - Trailer: {TrailerPlaca}", request.TrailerPlaca);

            // Validar placa del tráiler
            if (!string.IsNullOrWhiteSpace(request.TrailerPlaca))
            {
                var canCreate = await _weighingService.ValidateUniqueEntryAsync(request.TrailerPlaca);
                if (!canCreate)
                {
                    return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateError($"Placa del tráiler {request.TrailerPlaca} ya registrada en entrada previa");
                }
            }

            // Validar placa del remolque 1
            var canCreateRemolque = await _weighingService.ValidateUniqueEntryAsync(request.Remolque1.Placa);
            if (!canCreateRemolque)
            {
                return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateError($"Placa del remolque 1 {request.Remolque1.Placa} ya registrada en entrada previa");
            }

            var operation = new WeighingOperation
            {
                Id = Guid.NewGuid(),
                Folio = await _weighingService.GenerateFolioAsync(),
                UnitType = request.UnitType,
                OperationType = "entry",
                TrailerPlate = request.TrailerPlaca,
                PlacaRemolque1 = request.Remolque1.Placa,
                Product = request.Product,
                ClientProviderName = request.ClientProviderName,
                ClientProviderRfc = request.ClientProviderRfc,
                EntryWeight = request.Remolque1.PesoBruto, // Peso parcial del remolque 1
                Status = "ENTRADA_PARCIAL_R1", // Estado parcial
                TipoUnidad = "doble-remolque",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EntryDate = DateTime.UtcNow,
                FueEditado = request.TieneEdicionesManuale,
                FechaUltimaEdicion = request.TieneEdicionesManuale ? DateTime.UtcNow : null,
                UsuarioEditor = request.TieneEdicionesManuale ? request.UsuarioEditor : null
            };

            // Crear SOLO remolque 1
            var remolque1 = new WeighingRemolque
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operation.Id,
                Numero = 1,
                Placa = request.Remolque1.Placa,
                PesoBruto = request.Remolque1.PesoBruto,
                Estado = "REGISTRADO",
                RegistradoPor = request.UsuarioEditor,
                FechaRegistro = DateTime.UtcNow,
                PesoCapturado = request.Remolque1.PesoCapturado,
                FotosCapturadas = request.Remolque1.FotosCapturadas,
                FotoCargaCapturada = request.Remolque1.FotoCargaCapturada,
                FotoPlacaCapturada = request.Remolque1.FotoPlacaCapturada,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            operation.Remolques.Add(remolque1);

            // Guardar operación PRIMERO para que exista en BD antes de vincular fotos
            var created = await _weighingRepository.CreateAsync(operation);

            // Procesar fotos del tráiler y remolque 1 DESPUÉS de que la operación existe en BD
            await ProcessPartialDoubleTrailerPhotosAsync(created.Id, request);

            var response = new PartialDoubleTrailerEntryResponseDto
            {
                Id = created.Id.ToString(),
                Folio = created.Folio,
                TrailerPlaca = created.TrailerPlate!,
                Remolque1 = new RemolqueResponseDto
                {
                    Numero = remolque1.Numero,
                    Placa = remolque1.Placa,
                    PesoBruto = remolque1.PesoBruto,
                    Fotos = request.Remolque1.Fotos
                },
                FechaHoraRegistroR1 = remolque1.FechaRegistro!.Value,
                UsuarioRegistroR1 = remolque1.RegistradoPor ?? "Sistema",
                Status = created.Status,
                UnitType = created.UnitType,
                Product = created.Product,
                ClientProviderName = created.ClientProviderName
            };

            _logger.LogInformation("Entrada parcial de doble remolque creada exitosamente - Folio: {Folio}", created.Folio);

            return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateSuccess(
                response,
                "Remolque 1 registrado exitosamente. Puede continuar con remolque 2 posteriormente."
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear entrada parcial de doble remolque");
            return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<DoubleTrailerEntryResponseDto>> ContinueDoubleTrailerEntryAsync(ContinueDoubleTrailerEntryRequest request)
    {
        try
        {
            _logger.LogInformation("Continuando entrada de doble remolque con remolque 2 - Folio: {Folio}", request.Folio);

            var operation = await _weighingRepository.GetByFolioAsync(request.Folio);
            if (operation == null)
            {
                return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError("Operación no encontrada");
            }

            // Validar estado
            if (operation.Status != "ENTRADA_PARCIAL_R1")
            {
                return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError($"Estado inválido: {operation.Status}. Se esperaba ENTRADA_PARCIAL_R1");
            }

            // Validar que el remolque 1 ya esté registrado
            var remolque1 = operation.Remolques.FirstOrDefault(r => r.Numero == 1);
            if (remolque1 == null)
            {
                return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError("No se encontró el registro del remolque 1");
            }

            // Validar placa única del remolque 2
            var canCreate = await _weighingService.ValidateUniqueEntryAsync(request.Remolque2.Placa);
            if (!canCreate)
            {
                return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError($"Placa del remolque 2 {request.Remolque2.Placa} ya registrada en entrada previa");
            }

            // Crear remolque 2
            var remolque2 = new WeighingRemolque
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operation.Id,
                Numero = 2,
                Placa = request.Remolque2.Placa,
                PesoBruto = request.Remolque2.PesoBruto,
                Estado = "REGISTRADO",
                RegistradoPor = request.UsuarioEditor,
                FechaRegistro = DateTime.UtcNow,
                PesoCapturado = request.Remolque2.PesoCapturado,
                FotosCapturadas = request.Remolque2.FotosCapturadas,
                FotoCargaCapturada = request.Remolque2.FotoCargaCapturada,
                FotoPlacaCapturada = request.Remolque2.FotoPlacaCapturada,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            operation.Remolques.Add(remolque2);
            operation.PlacaRemolque2 = request.Remolque2.Placa;
            operation.EntryWeight = remolque1.PesoBruto + request.Remolque2.PesoBruto; // Suma total
            operation.Status = "ENTRADA_REGISTRADA"; // Cambiar a COMPLETA (mantener compatibilidad con reportes)
            operation.UpdatedAt = DateTime.UtcNow;

            // Actualizar FueEditado si hubo ediciones en remolque 2
            if (request.TieneEdicionesManuale)
            {
                operation.FueEditado = true;
                operation.FechaUltimaEdicion = DateTime.UtcNow;
                operation.UsuarioEditor = request.UsuarioEditor;
            }

            // Persistir operación y remolque 2 ANTES de vincular fotos para evitar
            // "Collection was modified" al enumerar Remolques durante SaveChanges
            var updated = await _weighingRepository.UpdateAsync(operation);

            // Procesar fotos del remolque 2 (vinculación hace su propio SaveChanges)
            await ProcessContinueDoubleTrailerPhotosAsync(operation.Id, request);

            var response = new DoubleTrailerEntryResponseDto
            {
                Id = updated.Id.ToString(),
                Folio = updated.Folio,
                TrailerPlaca = updated.TrailerPlate!,
                Remolques = updated.Remolques.OrderBy(r => r.Numero).Select(r => new RemolqueResponseDto
                {
                    Numero = r.Numero,
                    Placa = r.Placa,
                    PesoBruto = r.PesoBruto,
                    Fotos = r.Numero == 2 ? request.Remolque2.Fotos : new List<PhotoWithTypeDto>()
                }).ToList(),
                PesoBrutoTotal = updated.EntryWeight!.Value,
                FechaHoraEntrada = updated.EntryDate!.Value,
                UnitType = updated.UnitType,
                Product = updated.Product,
                ClientProviderName = updated.ClientProviderName
            };

            _logger.LogInformation("Entrada de doble remolque completada exitosamente - Folio: {Folio}", updated.Folio);

            return ApiResponse<DoubleTrailerEntryResponseDto>.CreateSuccess(
                response,
                "Entrada de doble remolque completada exitosamente"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al continuar entrada de doble remolque - Folio: {Folio}", request.Folio);
            return ApiResponse<DoubleTrailerEntryResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<List<PendingDoubleTrailerSearchResultDto>>> SearchPendingDoubleTrailersAsync(string searchTerm, int limit = 10)
    {
        try
        {
            _logger.LogInformation("Buscando operaciones parciales de doble remolque con término: {SearchTerm}", searchTerm);

            var results = await _weighingRepository.SearchPendingDoubleTrailersAsync(searchTerm, limit, "ENTRADA_PARCIAL_R1");

            var dtos = results.Select(r =>
            {
                var remolque1 = r.Remolques.FirstOrDefault(rem => rem.Numero == 1);
                return new PendingDoubleTrailerSearchResultDto
                {
                    Id = r.Id.ToString(),
                    Folio = r.Folio,
                    TrailerPlaca = r.TrailerPlate!,
                    PlacaRemolque1 = r.PlacaRemolque1!,
                    FechaRegistroR1 = remolque1?.FechaRegistro ?? r.CreatedAt,
                    Product = r.Product,
                    ClientProviderName = r.ClientProviderName,
                    PesoBrutoR1 = remolque1?.PesoBruto ?? 0,
                    UsuarioRegistroR1 = remolque1?.RegistradoPor ?? "Sistema",
                    Status = r.Status,
                    UnitType = r.UnitType
                };
            }).ToList();

            return ApiResponse<List<PendingDoubleTrailerSearchResultDto>>.CreateSuccess(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar operaciones parciales de doble remolque con término: {SearchTerm}", searchTerm);
            return ApiResponse<List<PendingDoubleTrailerSearchResultDto>>.CreateError("Error al buscar operaciones parciales");
        }
    }

    public async Task<ApiResponse<PartialDoubleTrailerEntryResponseDto>> GetPendingDoubleTrailerByFolioAsync(string folio)
    {
        try
        {
            _logger.LogInformation("Obteniendo operación parcial de doble remolque por folio: {Folio}", folio);

            var operation = await _weighingRepository.GetPendingDoubleTrailerByFolioAsync(folio);
            if (operation == null)
            {
                return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateError("Operación parcial no encontrada");
            }

            var remolque1 = operation.Remolques.FirstOrDefault(r => r.Numero == 1);
            if (remolque1 == null)
            {
                return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateError("No se encontró el registro del remolque 1");
            }

            var response = new PartialDoubleTrailerEntryResponseDto
            {
                Id = operation.Id.ToString(),
                Folio = operation.Folio,
                TrailerPlaca = operation.TrailerPlate!,
                Remolque1 = new RemolqueResponseDto
                {
                    Numero = remolque1.Numero,
                    Placa = remolque1.Placa,
                    PesoBruto = remolque1.PesoBruto,
                    Fotos = new List<PhotoWithTypeDto>() // Las fotos se cargan desde el repositorio de fotos
                },
                FechaHoraRegistroR1 = remolque1.FechaRegistro!.Value,
                UsuarioRegistroR1 = remolque1.RegistradoPor ?? "Sistema",
                Status = operation.Status,
                UnitType = operation.UnitType,
                Product = operation.Product,
                ClientProviderName = operation.ClientProviderName
            };

            return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateSuccess(response, "Operación parcial encontrada");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operación parcial por folio: {Folio}", folio);
            return ApiResponse<PartialDoubleTrailerEntryResponseDto>.CreateError("Error al obtener operación parcial");
        }
    }

    // ---------- Salida en partes (doble remolque) ----------

    public async Task<ApiResponse<PartialDoubleTrailerExitResponseDto>> CreatePartialDoubleTrailerExitAsync(CreatePartialDoubleTrailerExitRequest request)
    {
        try
        {
            _logger.LogInformation("Creando salida parcial de doble remolque (solo remolque 1) - Folio: {Folio}", request.Folio);

            var entry = await _weighingRepository.GetByFolioAsync(request.Folio);
            if (entry == null)
                return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError("Registro de entrada no encontrado");

            if (entry.TipoUnidad != "doble-remolque")
                return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError("La operación no es de doble remolque");

            // Aceptar entrada completa (ENTRADA_REGISTRADA o ENTRADA_COMPLETA)
            if (entry.Status != "ENTRADA_REGISTRADA" && entry.Status != "ENTRADA_COMPLETA")
                return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError($"Estado inválido: {entry.Status}. Se esperaba entrada completa.");

            var remolque1 = entry.Remolques.FirstOrDefault(r => r.Numero == 1);
            if (remolque1 == null)
                return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError("No se encontró el remolque 1");

            var fechaSalida = request.FechaSalida != default ? request.FechaSalida : DateTime.UtcNow;

            remolque1.PesoTara = request.Remolque1.PesoTara;
            remolque1.FotoCargaCapturada = request.Remolque1.FotoCargaCapturada;
            remolque1.FechaSalida = fechaSalida;
            remolque1.RegistradoPorSalida = request.UsuarioRegistroSalida ?? "Sistema";
            remolque1.UpdatedAt = DateTime.UtcNow;

            entry.Status = "SALIDA_PARCIAL_R1";
            entry.UpdatedAt = DateTime.UtcNow;

            // Actualizar FueEditado si hubo ediciones manuales en la salida
            if (request.TieneEdicionesManuale)
            {
                entry.FueEditado = true;
                entry.FechaUltimaEdicion = DateTime.UtcNow;
                entry.UsuarioEditor = request.UsuarioEditor;
            }

            await ProcessPartialDoubleTrailerExitPhotosAsync(entry.Id, request);

            var updated = await _weighingRepository.UpdateAsync(entry);

            var response = new PartialDoubleTrailerExitResponseDto
            {
                Id = updated.Id.ToString(),
                Folio = updated.Folio,
                TrailerPlaca = updated.TrailerPlate!,
                Remolque1 = new RemolqueExitResponseDto
                {
                    Numero = 1,
                    Placa = remolque1.Placa,
                    PesoBrutoEntrada = remolque1.PesoBruto,
                    PesoTaraSalida = remolque1.PesoTara ?? 0
                },
                FechaSalidaR1 = remolque1.FechaSalida!.Value,
                UsuarioRegistroSalidaR1 = remolque1.RegistradoPorSalida ?? "Sistema",
                Status = updated.Status,
                UnitType = updated.UnitType,
                Product = updated.Product,
                ClientProviderName = updated.ClientProviderName
            };

            _logger.LogInformation("Salida parcial de doble remolque creada - Folio: {Folio}", updated.Folio);
            return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateSuccess(
                response,
                "Remolque 1 salida registrada. Puede continuar con remolque 2 posteriormente.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear salida parcial de doble remolque - Folio: {Folio}", request.Folio);
            return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ExitResponseDto>> ContinueDoubleTrailerExitAsync(ContinueDoubleTrailerExitRequest request)
    {
        try
        {
            _logger.LogInformation("Continuando salida de doble remolque con remolque 2 - Folio: {Folio}", request.Folio);

            var entry = await _weighingRepository.GetPendingDoubleTrailerExitByFolioAsync(request.Folio);
            if (entry == null)
                return ApiResponse<ExitResponseDto>.CreateError("Operación no encontrada");

            if (entry.Status != "SALIDA_PARCIAL_R1")
                return ApiResponse<ExitResponseDto>.CreateError($"Estado inválido: {entry.Status}. Se esperaba SALIDA_PARCIAL_R1.");

            var remolque1 = entry.Remolques.FirstOrDefault(r => r.Numero == 1);
            var remolque2 = entry.Remolques.FirstOrDefault(r => r.Numero == 2);
            if (remolque1 == null || remolque2 == null)
                return ApiResponse<ExitResponseDto>.CreateError("No se encontraron los remolques de la operación");

            var fechaSalida = request.FechaSalida != default ? request.FechaSalida : DateTime.UtcNow;

            remolque2.PesoTara = request.Remolque2.PesoTara;
            remolque2.FotoCargaCapturada = request.Remolque2.FotoCargaCapturada;
            remolque2.FechaSalida = fechaSalida;
            remolque2.RegistradoPorSalida = request.UsuarioRegistroSalida ?? "Sistema";
            remolque2.UpdatedAt = DateTime.UtcNow;

            var pesoSalidaTotal = (remolque1.PesoTara ?? 0) + (remolque2.PesoTara ?? 0);
            var pesoEntradaTotal = entry.EntryWeight ?? 0;
            var pesoNeto = Math.Abs(pesoEntradaTotal - pesoSalidaTotal);

            entry.ExitWeight = pesoSalidaTotal;
            entry.NetWeight = pesoNeto;
            entry.ExitDate = fechaSalida;
            entry.Status = "SALIDA_REGISTRADA";
            entry.ExitRegisteredBy = request.UsuarioRegistroSalida ?? "Sistema";
            entry.UpdatedAt = DateTime.UtcNow;

            // Actualizar FueEditado si hubo ediciones manuales en remolque 2
            if (request.TieneEdicionesManuale)
            {
                entry.FueEditado = true;
                entry.FechaUltimaEdicion = DateTime.UtcNow;
                entry.UsuarioEditor = request.UsuarioEditor;
            }

            await ProcessContinueDoubleTrailerExitPhotosAsync(entry.Id, request);

            var updated = await _weighingRepository.UpdateAsync(entry);

            var response = new ExitResponseDto
            {
                Folio = updated.Folio,
                Estado = updated.Status,
                FechaSalida = updated.ExitDate ?? DateTime.UtcNow,
                PesoNeto = updated.NetWeight ?? 0,
                Mensaje = "Salida con doble remolque registrada exitosamente",
                ExitRegisteredBy = updated.ExitRegisteredBy,
                Remolques = updated.Remolques.Select(r => new RemolqueResponseDto
                {
                    Numero = r.Numero,
                    Placa = r.Placa,
                    PesoBruto = r.PesoBruto,
                    PesoTara = r.PesoTara,
                    FechaRegistro = r.FechaRegistro,
                    RegistradoPor = r.RegistradoPor,
                    FechaSalida = r.FechaSalida,
                    RegistradoPorSalida = r.RegistradoPorSalida
                }).ToList()
            };

            _logger.LogInformation("Salida de doble remolque completada - Folio: {Folio}", updated.Folio);
            return ApiResponse<ExitResponseDto>.CreateSuccess(response, "Registro de salida completado");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al continuar salida de doble remolque - Folio: {Folio}", request.Folio);
            return ApiResponse<ExitResponseDto>.CreateError($"Error interno del servidor: {ex.Message}");
        }
    }

    public async Task<ApiResponse<List<PendingDoubleTrailerExitSearchResultDto>>> SearchPendingDoubleTrailerExitsAsync(string searchTerm, int limit = 10)
    {
        try
        {
            _logger.LogInformation("Buscando operaciones con salida parcial de doble remolque - Término: {SearchTerm}", searchTerm);

            var results = await _weighingRepository.SearchPendingDoubleTrailersAsync(searchTerm, limit, "SALIDA_PARCIAL_R1");

            var dtos = results.Select(r =>
            {
                var remolque1 = r.Remolques.FirstOrDefault(rem => rem.Numero == 1);
                var remolque2 = r.Remolques.FirstOrDefault(rem => rem.Numero == 2);
                return new PendingDoubleTrailerExitSearchResultDto
                {
                    Id = r.Id.ToString(),
                    Folio = r.Folio,
                    TrailerPlaca = r.TrailerPlate!,
                    PlacaRemolque1 = r.PlacaRemolque1 ?? "",
                    PlacaRemolque2 = r.PlacaRemolque2 ?? "",
                    FechaSalidaR1 = remolque1?.FechaSalida ?? r.UpdatedAt,
                    UsuarioRegistroSalidaR1 = remolque1?.RegistradoPorSalida ?? "Sistema",
                    PesoBrutoR1 = remolque1?.PesoBruto ?? 0,
                    PesoTaraR1 = remolque1?.PesoTara ?? 0,
                    Product = r.Product,
                    ClientProviderName = r.ClientProviderName,
                    Status = r.Status,
                    UnitType = r.UnitType
                };
            }).ToList();

            return ApiResponse<List<PendingDoubleTrailerExitSearchResultDto>>.CreateSuccess(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar operaciones con salida parcial - Término: {SearchTerm}", searchTerm);
            return ApiResponse<List<PendingDoubleTrailerExitSearchResultDto>>.CreateError("Error al buscar operaciones con salida parcial");
        }
    }

    public async Task<ApiResponse<PartialDoubleTrailerExitResponseDto>> GetPendingDoubleTrailerExitByFolioAsync(string folio)
    {
        try
        {
            _logger.LogInformation("Obteniendo operación con salida parcial por folio: {Folio}", folio);

            var operation = await _weighingRepository.GetPendingDoubleTrailerExitByFolioAsync(folio);
            if (operation == null)
                return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError("Operación con salida parcial no encontrada");

            var remolque1 = operation.Remolques.FirstOrDefault(r => r.Numero == 1);
            if (remolque1 == null)
                return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError("No se encontró el remolque 1");

            var response = new PartialDoubleTrailerExitResponseDto
            {
                Id = operation.Id.ToString(),
                Folio = operation.Folio,
                TrailerPlaca = operation.TrailerPlate!,
                Remolque1 = new RemolqueExitResponseDto
                {
                    Numero = 1,
                    Placa = remolque1.Placa,
                    PesoBrutoEntrada = remolque1.PesoBruto,
                    PesoTaraSalida = remolque1.PesoTara ?? 0
                },
                FechaSalidaR1 = remolque1.FechaSalida ?? operation.UpdatedAt,
                UsuarioRegistroSalidaR1 = remolque1.RegistradoPorSalida ?? "Sistema",
                Status = operation.Status,
                UnitType = operation.UnitType,
                Product = operation.Product,
                ClientProviderName = operation.ClientProviderName,
                PlacaRemolque2 = operation.PlacaRemolque2 ?? string.Empty
            };

            return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateSuccess(response, "Operación con salida parcial encontrada");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener operación con salida parcial por folio: {Folio}", folio);
            return ApiResponse<PartialDoubleTrailerExitResponseDto>.CreateError("Error al obtener operación con salida parcial");
        }
    }

    private async Task ProcessPartialDoubleTrailerExitPhotosAsync(Guid operationId, CreatePartialDoubleTrailerExitRequest request)
    {
        var photos = new DoubleTrailerExitPhotoDataDto
        {
            TrailerPlate = request.Fotos.TrailerPlate ?? "",
            Remolque1Plate = request.Fotos.Remolque1Plate ?? "",
            Remolque2Plate = "",
            CargoRemolque1 = request.Fotos.CargoRemolque1 ?? "",
            CargoRemolque2 = ""
        };
        await ProcessDoubleTrailerExitPhotosFromRequestAsync(operationId, photos);
    }

    private async Task ProcessContinueDoubleTrailerExitPhotosAsync(Guid operationId, ContinueDoubleTrailerExitRequest request)
    {
        var photos = new DoubleTrailerExitPhotoDataDto
        {
            TrailerPlate = "",
            Remolque1Plate = "",
            Remolque2Plate = request.Fotos.Remolque2Plate ?? "",
            CargoRemolque1 = "",
            CargoRemolque2 = request.Fotos.CargoRemolque2 ?? ""
        };
        await ProcessDoubleTrailerExitPhotosFromRequestAsync(operationId, photos);
    }

    private async Task ProcessPartialDoubleTrailerPhotosAsync(Guid operationId, CreatePartialDoubleTrailerEntryRequest request)
    {
        _logger.LogInformation("Procesando fotos para entrada parcial de doble remolque - OperationId: {OperationId}", operationId);

        // Procesar foto del tráiler (si existe)
        if (!string.IsNullOrEmpty(request.TrailerPlacaFoto))
        {
            await ProcessPhotoFieldAsync(operationId, request.TrailerPlacaFoto, "trailerPlate", "trailerPlate_entry");
        }

        // Procesar fotos del remolque 1
        foreach (var foto in request.Remolque1.Fotos)
        {
            // Determinar el tipo de foto según el tipo especificado en el objeto
            string photoType;
            string finalPhotoType;

            if (foto.Type == "plate")
            {
                // Es una foto de placa
                photoType = "remolque1Plate_entry";
                finalPhotoType = photoType;
            }
            else if (foto.Type == "cargo")
            {
                // Es una foto de carga
                photoType = "cargoRemolque1_entry";
                finalPhotoType = photoType;
            }
            else
            {
                _logger.LogWarning("Tipo de foto desconocido: {Type} para remolque 1", foto.Type);
                continue;
            }

            _logger.LogInformation("Procesando foto remolque1: URL={Url}, Type={Type}, PhotoType={PhotoType}, FinalPhotoType={FinalPhotoType}",
                foto.Url, foto.Type, photoType, finalPhotoType);

            await ProcessPhotoFieldAsync(operationId, foto.Url, photoType, finalPhotoType);
        }

        _logger.LogInformation("Finalizado procesamiento de fotos para entrada parcial - OperationId: {OperationId}", operationId);
    }

    private async Task ProcessContinueDoubleTrailerPhotosAsync(Guid operationId, ContinueDoubleTrailerEntryRequest request)
    {
        _logger.LogInformation("Procesando fotos para continuar doble remolque - OperationId: {OperationId}", operationId);

        // Procesar fotos del remolque 2
        foreach (var foto in request.Remolque2.Fotos)
        {
            // Determinar el tipo de foto según el tipo especificado en el objeto
            string photoType;
            string finalPhotoType;

            if (foto.Type == "plate")
            {
                // Es una foto de placa
                photoType = "remolque2Plate_entry";
                finalPhotoType = photoType;
            }
            else if (foto.Type == "cargo")
            {
                // Es una foto de carga
                photoType = "cargoRemolque2_entry";
                finalPhotoType = photoType;
            }
            else
            {
                _logger.LogWarning("Tipo de foto desconocido: {Type} para remolque 2", foto.Type);
                continue;
            }

            _logger.LogInformation("Procesando foto remolque2: URL={Url}, Type={Type}, PhotoType={PhotoType}, FinalPhotoType={FinalPhotoType}",
                foto.Url, foto.Type, photoType, finalPhotoType);

            await ProcessPhotoFieldAsync(operationId, foto.Url, photoType, finalPhotoType);
        }

        _logger.LogInformation("Finalizado procesamiento de fotos para continuar doble remolque - OperationId: {OperationId}", operationId);
    }
}