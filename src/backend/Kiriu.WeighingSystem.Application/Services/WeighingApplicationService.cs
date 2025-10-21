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

    public WeighingApplicationService(
        IWeighingOperationRepository weighingRepository,
        IWeighingPhotoRepository photoRepository,
        IWeighingService weighingService,
        IAuditLogger auditLogger,
        ILogger<WeighingApplicationService> logger)
    {
        _weighingRepository = weighingRepository;
        _photoRepository = photoRepository;
        _weighingService = weighingService;
        _auditLogger = auditLogger;
        _logger = logger;
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
                Folio = _weighingService.GenerateFolio(),
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
                Folio = _weighingService.GenerateFolio(),
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

            // Add exit photos
            var exitPhotos = CreateExitPhotosFromRequest(entry.Id, request.Fotos);
            foreach (var photo in exitPhotos)
            {
                entry.Photos.Add(photo);
            }

            Console.WriteLine($"[CreateExitAsync] About to update - Folio: {entry.Folio}, New Status: {entry.Status}");
            
            var updatedEntry = await _weighingRepository.UpdateAsync(entry);
            
            Console.WriteLine($"[CreateExitAsync] Successfully updated - Folio: {updatedEntry.Folio}, Final Status: {updatedEntry.Status}");

            var response = new ExitResponseDto
            {
                Folio = entry.Folio,
                Estado = entry.Status,
                FechaSalida = entry.ExitDate ?? DateTime.UtcNow,
                PesoNeto = entry.NetWeight ?? 0,
                Mensaje = "Registro de salida completado"
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

            if (entry.Status != "ENTRADA_REGISTRADA")
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

            // Vincular fotos ANPR huérfanas del request.Fotos
            if (request.Fotos != null)
            {
                var exitPhotos = CreateDoubleTrailerExitPhotosFromRequest(entry.Id, request.Fotos);
                foreach (var photo in exitPhotos)
                {
                    entry.Photos.Add(photo);
                }
            }

            await _weighingRepository.UpdateAsync(entry);

            var response = new ExitResponseDto
            {
                Folio = entry.Folio,
                Estado = entry.Status,
                FechaSalida = entry.ExitDate ?? DateTime.UtcNow,
                PesoNeto = entry.NetWeight ?? 0,
                Mensaje = "Salida con doble remolque registrada exitosamente"
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
                    EntryWeight = activeEntry.EntryWeight ?? 0,
                    Status = activeEntry.Status
                } : null,
                Message = activeEntry != null 
                    ? "Vehículo puede registrar salida" 
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
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate, "trailerPlate");
        await ProcessPhotoFieldAsync(operationId, photos.TrailerPlate2, "trailerPlate2");
        await ProcessPhotoFieldAsync(operationId, photos.Cargo, "cargoEntry");
        await ProcessPhotoFieldAsync(operationId, photos.Remolque1Plate, "remolque1Plate");
        await ProcessPhotoFieldAsync(operationId, photos.Remolque2Plate, "remolque2Plate");
        await ProcessPhotoFieldAsync(operationId, photos.CargoRemolque2, "cargoRemolque2");
    }

    private async Task ProcessDoubleTrailerPhotosAsync(Guid operationId, CreateDoubleTrailerEntryRequest request)
    {
        _logger.LogInformation("Procesando fotos para entrada de doble remolque - OperationId: {OperationId}", operationId);

        // Procesar foto del tráiler (si existe)
        if (!string.IsNullOrEmpty(request.TrailerPlacaFoto))
        {
            _logger.LogInformation("Procesando foto del tráiler: {TrailerPlacaFoto}", request.TrailerPlacaFoto);
            await ProcessPhotoFieldAsync(operationId, request.TrailerPlacaFoto, "trailerPlate");
        }
        else
        {
            _logger.LogWarning("No se proporcionó foto del tráiler en el request");
        }

        // Procesar fotos de cada remolque
        foreach (var remolque in request.Remolques)
        {
            _logger.LogInformation("Procesando {Count} fotos del remolque {Numero}", remolque.Fotos.Count, remolque.Numero);

            foreach (var fotoUrl in remolque.Fotos)
            {
                // Determinar el tipo de foto según la URL
                string photoType;
                if (fotoUrl.StartsWith("/api/"))
                {
                    // Es una foto ANPR de placa
                    photoType = $"remolque{remolque.Numero}Plate";
                }
                else
                {
                    // Es una foto de carga u otro tipo (ignorar por ahora)
                    _logger.LogInformation("Ignorando foto no-ANPR: {FotoUrl}", fotoUrl);
                    continue;
                }

                await ProcessPhotoFieldAsync(operationId, fotoUrl, photoType);
            }
        }

        _logger.LogInformation("Finalizado procesamiento de fotos para doble remolque - OperationId: {OperationId}", operationId);
    }

    private async Task ProcessPhotoFieldAsync(Guid operationId, string? photoUrl, string photoType)
    {
        // Solo procesar si es una URL de API (foto ANPR guardada en BD)
        // Ignorar marcadores de texto como "Foto capturada"
        if (string.IsNullOrEmpty(photoUrl) || !photoUrl.StartsWith("/api/"))
        {
            return;
        }

        try
        {
            _logger.LogInformation("Buscando foto huérfana con URL: {PhotoUrl} para tipo: {PhotoType}", photoUrl, photoType);

            var orphanPhoto = await _photoRepository.GetOrphanPhotoByUrlAsync(photoUrl);
            if (orphanPhoto != null)
            {
                await _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId);
                _logger.LogInformation("✅ Foto huérfana {PhotoType} vinculada exitosamente: {PhotoId} -> {OperationId}",
                    photoType, orphanPhoto.Id, operationId);
            }
            else
            {
                _logger.LogWarning("❌ No se encontró foto huérfana con URL: {PhotoUrl} para tipo: {PhotoType}", photoUrl, photoType);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error al vincular foto huérfana {PhotoType} con URL {PhotoUrl}, se omitirá", photoType, photoUrl);
        }
    }

    private List<WeighingPhoto> CreateExitPhotosFromRequest(Guid operationId, ExitPhotoDataDto photos)
    {
        var photoList = new List<WeighingPhoto>();

        // Solo procesar fotos si son URLs de API (fotos ANPR guardadas)
        // Ignorar marcadores como "Foto capturada" o "MOCK_CAPTURED" que no son URLs

        // Vincular foto de placa del tráiler
        if (!string.IsNullOrEmpty(photos.TrailerPlate) && photos.TrailerPlate.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.TrailerPlate).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana trailerPlate vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana trailerPlate, se omitirá");
            }
        }

        // Vincular foto de placa del remolque
        if (!string.IsNullOrEmpty(photos.TrailerPlate2) && photos.TrailerPlate2.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.TrailerPlate2).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana trailerPlate2 vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana trailerPlate2, se omitirá");
            }
        }

        // Vincular foto de estado de carga
        if (!string.IsNullOrEmpty(photos.CargoState) && photos.CargoState.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.CargoState).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana cargoState vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana cargoState, se omitirá");
            }
        }

        // Vincular foto de placa del contenedor (si aplica)
        if (!string.IsNullOrEmpty(photos.ContainerPlate) && photos.ContainerPlate.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.ContainerPlate).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana containerPlate vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana containerPlate, se omitirá");
            }
        }

        return photoList;
    }

    private List<WeighingPhoto> CreateDoubleTrailerExitPhotosFromRequest(Guid operationId, DoubleTrailerExitPhotoDataDto photos)
    {
        var photoList = new List<WeighingPhoto>();

        // Solo procesar fotos si son URLs de API (fotos ANPR guardadas)
        // Ignorar marcadores como "Foto capturada" o "MOCK_CAPTURED" que no son URLs

        // Vincular foto de placa del tráiler
        if (!string.IsNullOrEmpty(photos.TrailerPlate) && photos.TrailerPlate.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.TrailerPlate).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana trailerPlate (doble remolque) vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana trailerPlate (doble remolque), se omitirá");
            }
        }

        // Vincular foto de placa del remolque 1
        if (!string.IsNullOrEmpty(photos.Remolque1Plate) && photos.Remolque1Plate.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.Remolque1Plate).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana remolque1Plate vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana remolque1Plate, se omitirá");
            }
        }

        // Vincular foto de placa del remolque 2
        if (!string.IsNullOrEmpty(photos.Remolque2Plate) && photos.Remolque2Plate.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.Remolque2Plate).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana remolque2Plate vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana remolque2Plate, se omitirá");
            }
        }

        // Vincular foto de carga del remolque 1
        if (!string.IsNullOrEmpty(photos.CargoRemolque1) && photos.CargoRemolque1.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.CargoRemolque1).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana cargoRemolque1 vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana cargoRemolque1, se omitirá");
            }
        }

        // Vincular foto de carga del remolque 2
        if (!string.IsNullOrEmpty(photos.CargoRemolque2) && photos.CargoRemolque2.StartsWith("/api/"))
        {
            try
            {
                var orphanPhoto = _photoRepository.GetOrphanPhotoByUrlAsync(photos.CargoRemolque2).Result;
                if (orphanPhoto != null)
                {
                    _photoRepository.LinkOrphanPhotoToOperationAsync(orphanPhoto.Id, operationId).Wait();
                    _logger.LogInformation("Foto huérfana cargoRemolque2 vinculada: {PhotoId} -> {OperationId}", orphanPhoto.Id, operationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al vincular foto huérfana cargoRemolque2, se omitirá");
            }
        }

        return photoList;
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

            // Marcar como editado manualmente si se cambiaron las placas o los pesos
            if (request.EsEdicionManual && (plateFieldsChanged || weightFieldsChanged))
            {
                operation.FueEditado = true;
                operation.FechaUltimaEdicion = DateTime.UtcNow;
                operation.UsuarioEditor = request.UsuarioEditor;

                _logger.LogInformation(
                    "Registro editado manualmente - OperationId: {OperationId}, Usuario: {Usuario}, PlacasEditadas: {PlacasEditadas}, PesosEditados: {PesosEditados}",
                    operationId,
                    request.UsuarioEditor,
                    plateFieldsChanged,
                    weightFieldsChanged
                );
            }

            // Actualizar campos si se proporcionan
            if (!string.IsNullOrEmpty(request.TrailerPlate))
                operation.TrailerPlate = request.TrailerPlate;
            
            if (!string.IsNullOrEmpty(request.TrailerPlate2))
                operation.TrailerPlate2 = request.TrailerPlate2;
            
            if (!string.IsNullOrEmpty(request.TrailerPlateContenedor))
                operation.TrailerPlateContenedor = request.TrailerPlateContenedor;
            
            if (!string.IsNullOrEmpty(request.RemolquePlateContenedor))
                operation.RemolquePlateContenedor = request.RemolquePlateContenedor;
            
            if (!string.IsNullOrEmpty(request.PlacaRemolque1))
                operation.PlacaRemolque1 = request.PlacaRemolque1;
            
            if (!string.IsNullOrEmpty(request.PlacaRemolque2))
                operation.PlacaRemolque2 = request.PlacaRemolque2;
            
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
}