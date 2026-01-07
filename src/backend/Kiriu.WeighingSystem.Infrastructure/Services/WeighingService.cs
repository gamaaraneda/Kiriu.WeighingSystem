using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

public class WeighingService : IWeighingService
{
    private readonly IWeighingOperationRepository _weighingRepository;
    private readonly WeighingDbContext _context;

    public WeighingService(IWeighingOperationRepository weighingRepository, WeighingDbContext context)
    {
        _weighingRepository = weighingRepository;
        _context = context;
    }

    public async Task<string> GenerateFolioAsync()
    {
        // Nuevo formato: KWS-YYYYMMDD-N
        // Donde N es un consecutivo global que se incrementa solo en entradas
        var now = DateTime.UtcNow;
        var datePart = now.ToString("yyyyMMdd");
        
        // Obtener e incrementar el consecutivo de forma atómica
        var sequence = await GetNextSequenceAsync();
        
        return $"KWS-{datePart}-{sequence}";
    }

    /// <summary>
    /// Obtiene el siguiente número de secuencia de forma atómica
    /// Este método asegura que no se pierdan números incluso en condiciones de alta concurrencia
    /// </summary>
    private async Task<long> GetNextSequenceAsync()
    {
        // Crear estrategia de ejecución compatible con transacciones manuales
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            // Usar una transacción para asegurar atomicidad
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                // Obtener el registro de secuencia (siempre debe ser Id = 1)
                var sequence = await _context.FolioSequences
                    .FirstOrDefaultAsync(s => s.Id == 1);

                // Si no existe, crearlo
                if (sequence == null)
                {
                    sequence = new FolioSequence
                    {
                        Id = 1,
                        CurrentSequence = 0,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.FolioSequences.Add(sequence);
                }

                // Incrementar el consecutivo
                sequence.CurrentSequence++;
                sequence.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return sequence.CurrentSequence;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }


    public async Task<bool> ValidateUniqueEntryAsync(string plate)
    {
        return !await _weighingRepository.HasActiveEntryAsync(plate);
    }

    public async Task<WeighingOperation?> FindActiveEntryAsync(string plate)
    {
        return await _weighingRepository.GetActiveEntryByPlateAsync(plate);
    }

    public async Task<List<string>> GetAllPlatesFromOperation(WeighingOperation operation)
    {
        var plates = new List<string>();

        if (!string.IsNullOrEmpty(operation.TrailerPlate))
            plates.Add(operation.TrailerPlate);
            
        if (!string.IsNullOrEmpty(operation.TrailerPlate2))
            plates.Add(operation.TrailerPlate2);
            
        if (!string.IsNullOrEmpty(operation.TrailerPlateContenedor))
            plates.Add(operation.TrailerPlateContenedor);
            
        if (!string.IsNullOrEmpty(operation.RemolquePlateContenedor))
            plates.Add(operation.RemolquePlateContenedor);
            
        if (!string.IsNullOrEmpty(operation.PlacaRemolque1))
            plates.Add(operation.PlacaRemolque1);
            
        if (!string.IsNullOrEmpty(operation.PlacaRemolque2))
            plates.Add(operation.PlacaRemolque2);

        // Add remolque plates
        plates.AddRange(operation.Remolques.Select(r => r.Placa));

        return plates.Distinct().ToList();
    }
}