using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class WeighingOperationRepository : IWeighingOperationRepository
{
    private readonly WeighingDbContext _context;

    public WeighingOperationRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<WeighingOperation> CreateAsync(WeighingOperation operation)
    {
        _context.WeighingOperations.Add(operation);
        await _context.SaveChangesAsync();
        return operation;
    }

    public async Task<WeighingOperation?> GetByIdAsync(Guid id)
    {
        return await _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .FirstOrDefaultAsync(w => w.Id == id);
    }

    public async Task<WeighingOperation?> GetByFolioAsync(string folio)
    {
        return await _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .FirstOrDefaultAsync(w => w.Folio == folio);
    }

    public async Task<WeighingOperation?> GetLatestEntryByPlateAsync(string plate)
    {
        return await _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .Where(w => w.Status == "ENTRADA_REGISTRADA" && 
                       (w.TrailerPlate == plate || 
                        w.TrailerPlate2 == plate || 
                        w.TrailerPlateContenedor == plate || 
                        w.RemolquePlateContenedor == plate ||
                        w.PlacaRemolque1 == plate ||
                        w.PlacaRemolque2 == plate ||
                        w.Remolques.Any(r => r.Placa == plate)))
            .OrderByDescending(w => w.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<List<WeighingOperation>> GetByPlatesAsync(List<string> plates)
    {
        return await _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .Where(w => plates.Any(plate => 
                        w.TrailerPlate == plate || 
                        w.TrailerPlate2 == plate || 
                        w.TrailerPlateContenedor == plate || 
                        w.RemolquePlateContenedor == plate ||
                        w.PlacaRemolque1 == plate ||
                        w.PlacaRemolque2 == plate ||
                        w.Remolques.Any(r => r.Placa == plate)))
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<(List<WeighingOperation> operations, int total)> GetPaginatedAsync(
        int page, 
        int size, 
        string? status = null, 
        string? unitType = null, 
        DateTime? dateFrom = null, 
        DateTime? dateTo = null)
    {
        var query = _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(w => w.Status == status);
        }

        if (!string.IsNullOrEmpty(unitType))
        {
            query = query.Where(w => w.UnitType == unitType);
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(w => w.CreatedAt >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(w => w.CreatedAt <= dateTo.Value);
        }

        var total = await query.CountAsync();
        
        var operations = await query
            .OrderByDescending(w => w.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();

        return (operations, total);
    }

    public async Task<WeighingOperation> UpdateAsync(WeighingOperation operation)
    {
        try
        {
            Console.WriteLine($"[UpdateAsync] Updating operation ID: {operation.Id}, Status: {operation.Status}");
            
            // Attach the entity if it's not already tracked
            var entry = _context.Entry(operation);
            if (entry.State == EntityState.Detached)
            {
                _context.Attach(operation);
            }

            // Only mark specific properties as modified (the ones we actually want to update)
            operation.UpdatedAt = DateTime.UtcNow;
            
            entry.Property(e => e.ExitWeight).IsModified = true;
            entry.Property(e => e.NetWeight).IsModified = true;
            entry.Property(e => e.Status).IsModified = true;
            entry.Property(e => e.ExitDate).IsModified = true;
            entry.Property(e => e.UpdatedAt).IsModified = true;
            
            // Don't let EF track the Photos collection changes on the main entity
            entry.Collection(e => e.Photos).IsModified = false;
            
            Console.WriteLine($"[UpdateAsync] Marked specific properties as modified for operation: {operation.Id}");
            
            // Handle exit photos - add them directly without attaching to the main entity
            foreach (var photo in operation.Photos ?? new List<WeighingPhoto>())
            {
                // Only handle exit photos (cargoExit), skip entry photos that are already in DB
                if (photo.PhotoType == "cargoExit")
                {
                    // Ensure photo has correct properties
                    photo.WeighingOperationId = operation.Id;
                    photo.CreatedAt = DateTime.UtcNow;
                    
                    // Add photo directly to context (not through the navigation property)
                    _context.WeighingPhotos.Add(photo);
                    Console.WriteLine($"[UpdateAsync] Adding exit photo: {photo.PhotoType} with ID: {photo.Id}");
                }
            }

            // Handle remolques updates
            foreach (var remolque in operation.Remolques ?? new List<WeighingRemolque>())
            {
                var existingRemolque = await _context.WeighingRemolques
                    .FirstOrDefaultAsync(r => r.Id == remolque.Id);
                
                if (existingRemolque != null)
                {
                    existingRemolque.PesoTara = remolque.PesoTara;
                    existingRemolque.FotoCargaCapturada = remolque.FotoCargaCapturada;
                    existingRemolque.UpdatedAt = DateTime.UtcNow;
                    Console.WriteLine($"[UpdateAsync] Updated remolque: {remolque.Placa}");
                }
            }

            Console.WriteLine($"[UpdateAsync] About to save changes for operation: {operation.Id}");
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"[UpdateAsync] Successfully saved changes for operation: {operation.Id}");
            return operation;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            Console.WriteLine($"[UpdateAsync] Concurrency exception: {ex.Message}");
            throw new InvalidOperationException("El registro fue modificado por otro usuario. Por favor, recargue los datos e intente nuevamente.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdateAsync] Unexpected error: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> HasActiveEntryAsync(string plate)
    {
        return await _context.WeighingOperations
            .AnyAsync(w => w.Status == "ENTRADA_REGISTRADA" && 
                          (w.TrailerPlate == plate || 
                           w.TrailerPlate2 == plate || 
                           w.TrailerPlateContenedor == plate || 
                           w.RemolquePlateContenedor == plate ||
                           w.PlacaRemolque1 == plate ||
                           w.PlacaRemolque2 == plate ||
                           w.Remolques.Any(r => r.Placa == plate)));
    }

    public async Task<WeighingOperation?> GetActiveEntryByPlateAsync(string plate)
    {
        return await _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .FirstOrDefaultAsync(w => w.Status == "ENTRADA_REGISTRADA" && 
                                    (w.TrailerPlate == plate || 
                                     w.TrailerPlate2 == plate || 
                                     w.TrailerPlateContenedor == plate || 
                                     w.RemolquePlateContenedor == plate ||
                                     w.PlacaRemolque1 == plate ||
                                     w.PlacaRemolque2 == plate ||
                                     w.Remolques.Any(r => r.Placa == plate)));
    }

    public async Task<List<WeighingOperation>> GetOperationsByPlateAsync(string plate)
    {
        return await _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .Where(w => w.TrailerPlate == plate || 
                       w.TrailerPlate2 == plate || 
                       w.TrailerPlateContenedor == plate || 
                       w.RemolquePlateContenedor == plate ||
                       w.PlacaRemolque1 == plate ||
                       w.PlacaRemolque2 == plate ||
                       w.Remolques.Any(r => r.Placa == plate))
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<WeighingOperation>> QueryOperationsAsync(
        DateTime? fechaDesde,
        DateTime? fechaHasta,
        string? folio,
        string? placa,
        string? estado,
        string? edicionPosterior,
        int page,
        int size)
    {
        var query = _context.WeighingOperations
            .Include(w => w.Photos)
            .Include(w => w.Remolques)
            .AsQueryable();

        if (fechaDesde.HasValue)
        {
            query = query.Where(w => w.CreatedAt >= fechaDesde.Value);
        }

        if (fechaHasta.HasValue)
        {
            query = query.Where(w => w.CreatedAt <= fechaHasta.Value.AddDays(1).AddSeconds(-1));
        }

        if (!string.IsNullOrEmpty(folio))
        {
            query = query.Where(w => w.Folio.Contains(folio));
        }

        if (!string.IsNullOrEmpty(placa))
        {
            query = query.Where(w => 
                w.TrailerPlate.Contains(placa) || 
                w.TrailerPlate2.Contains(placa) || 
                w.TrailerPlateContenedor.Contains(placa) || 
                w.RemolquePlateContenedor.Contains(placa) ||
                w.PlacaRemolque1.Contains(placa) ||
                w.PlacaRemolque2.Contains(placa) ||
                w.Remolques.Any(r => r.Placa.Contains(placa)));
        }

        if (!string.IsNullOrEmpty(estado))
        {
            query = query.Where(w => w.Status == estado);
        }

        if (!string.IsNullOrEmpty(edicionPosterior) && edicionPosterior != "Todos")
        {
            if (edicionPosterior == "Editado")
            {
                query = query.Where(w => w.FueEditado == true);
            }
            else if (edicionPosterior == "NoEditado")
            {
                query = query.Where(w => w.FueEditado == false);
            }
        }

        return await query
            .OrderByDescending(w => w.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();
    }

    public async Task<int> CountOperationsAsync(
        DateTime? fechaDesde,
        DateTime? fechaHasta,
        string? folio,
        string? placa,
        string? estado,
        string? edicionPosterior)
    {
        var query = _context.WeighingOperations.AsQueryable();

        if (fechaDesde.HasValue)
        {
            query = query.Where(w => w.CreatedAt >= fechaDesde.Value);
        }

        if (fechaHasta.HasValue)
        {
            query = query.Where(w => w.CreatedAt <= fechaHasta.Value.AddDays(1).AddSeconds(-1));
        }

        if (!string.IsNullOrEmpty(folio))
        {
            query = query.Where(w => w.Folio.Contains(folio));
        }

        if (!string.IsNullOrEmpty(placa))
        {
            query = query.Where(w => 
                w.TrailerPlate.Contains(placa) || 
                w.TrailerPlate2.Contains(placa) || 
                w.TrailerPlateContenedor.Contains(placa) || 
                w.RemolquePlateContenedor.Contains(placa) ||
                w.PlacaRemolque1.Contains(placa) ||
                w.PlacaRemolque2.Contains(placa) ||
                w.Remolques.Any(r => r.Placa.Contains(placa)));
        }

        if (!string.IsNullOrEmpty(estado))
        {
            query = query.Where(w => w.Status == estado);
        }

        if (!string.IsNullOrEmpty(edicionPosterior) && edicionPosterior != "Todos")
        {
            if (edicionPosterior == "Editado")
            {
                query = query.Where(w => w.FueEditado == true);
            }
            else if (edicionPosterior == "NoEditado")
            {
                query = query.Where(w => w.FueEditado == false);
            }
        }

        return await query.CountAsync();
    }
}