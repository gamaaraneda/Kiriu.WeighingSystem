using Mapster;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Weighing;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Application.Services;

public class WeighingApplicationService : IWeighingApplicationService
{
    private readonly IWeighingOperationRepository _weighingRepository;
    private readonly IWeighingService _weighingService;

    public WeighingApplicationService(
        IWeighingOperationRepository weighingRepository,
        IWeighingService weighingService)
    {
        _weighingRepository = weighingRepository;
        _weighingService = weighingService;
    }

    public async Task<ApiResponse<WeighingOperationDto>> CreateEntryAsync(CreateEntryRequest request)
    {
        try
        {
            // Validate unique entry
            var canCreate = await _weighingService.ValidateUniqueEntryAsync(request.TrailerPlate);
            if (!canCreate)
            {
                return ApiResponse<WeighingOperationDto>.CreateError("Placa ya registrada en entrada previa");
            }

            var operation = new WeighingOperation
            {
                Id = Guid.NewGuid(),
                Folio = _weighingService.GenerateFolio(),
                UnitType = request.UnitType,
                OperationType = request.OperationType,
                TrailerPlate = request.TrailerPlate,
                TrailerPlate2 = request.TrailerPlate2,
                TrailerPlateContenedor = request.TrailerPlateContenedor,
                RemolquePlateContenedor = request.RemolquePlateContenedor,
                Product = request.Product,
                ClientProviderName = request.ClientProviderName,
                ClientProviderRfc = request.ClientProviderRfc,
                EntryWeight = request.EntryWeight,
                Status = "ENTRADA_REGISTRADA",
                TipoUnidad = request.TipoUnidad,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EntryDate = DateTime.UtcNow
            };

            // Add photos
            operation.Photos = CreatePhotosFromRequest(operation.Id, request.Photos);

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
                Product = request.Product,
                ClientProviderName = request.ClientProviderName,
                EntryWeight = request.PesoBrutoTotal,
                Status = "ENTRADA_REGISTRADA",
                TipoUnidad = request.TipoUnidad,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EntryDate = DateTime.UtcNow
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

            var created = await _weighingRepository.CreateAsync(operation);

            var response = new DoubleTrailerEntryResponseDto
            {
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
            var entry = await _weighingRepository.GetByFolioAsync(request.Folio);
            if (entry == null)
            {
                return ApiResponse<ExitResponseDto>.CreateError("Registro de entrada no encontrado");
            }

            if (entry.Status != "ENTRADA_REGISTRADA")
            {
                return ApiResponse<ExitResponseDto>.CreateError("El registro ya tiene una salida registrada");
            }

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

            await _weighingRepository.UpdateAsync(entry);

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

    public async Task<ApiResponse<ExitValidationDto>> ValidateExitAsync(string placa)
    {
        try
        {
            var activeEntry = await _weighingService.FindActiveEntryAsync(placa);

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

    private List<WeighingPhoto> CreatePhotosFromRequest(Guid operationId, PhotoDataDto photos)
    {
        var photoList = new List<WeighingPhoto>();
        var createdAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(photos.TrailerPlate))
        {
            photoList.Add(new WeighingPhoto
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operationId,
                PhotoType = "trailerPlate",
                PhotoUrl = photos.TrailerPlate,
                CreatedAt = createdAt
            });
        }

        if (!string.IsNullOrEmpty(photos.TrailerPlate2))
        {
            photoList.Add(new WeighingPhoto
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operationId,
                PhotoType = "trailerPlate2",
                PhotoUrl = photos.TrailerPlate2,
                CreatedAt = createdAt
            });
        }

        if (!string.IsNullOrEmpty(photos.Cargo))
        {
            photoList.Add(new WeighingPhoto
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operationId,
                PhotoType = "cargo",
                PhotoUrl = photos.Cargo,
                CreatedAt = createdAt
            });
        }

        return photoList;
    }

    private List<WeighingPhoto> CreateExitPhotosFromRequest(Guid operationId, ExitPhotoDataDto photos)
    {
        var photoList = new List<WeighingPhoto>();
        var createdAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(photos.CargoState))
        {
            photoList.Add(new WeighingPhoto
            {
                Id = Guid.NewGuid(),
                WeighingOperationId = operationId,
                PhotoType = "cargoState",
                PhotoUrl = photos.CargoState,
                CreatedAt = createdAt
            });
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
                case "cargo":
                    result.FotoCargaEntrada = photo.PhotoUrl;
                    break;
            }
        }

        return result;
    }
}