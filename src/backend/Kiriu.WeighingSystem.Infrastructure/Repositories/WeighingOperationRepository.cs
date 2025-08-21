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
        operation.UpdatedAt = DateTime.UtcNow;
        _context.WeighingOperations.Update(operation);
        await _context.SaveChangesAsync();
        return operation;
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
                query = query.Where(w => EF.Functions.DateDiffMinute(w.CreatedAt, w.UpdatedAt) > 5);
            }
            else if (edicionPosterior == "NoEditado")
            {
                query = query.Where(w => EF.Functions.DateDiffMinute(w.CreatedAt, w.UpdatedAt) <= 5);
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
                query = query.Where(w => EF.Functions.DateDiffMinute(w.CreatedAt, w.UpdatedAt) > 5);
            }
            else if (edicionPosterior == "NoEditado")
            {
                query = query.Where(w => EF.Functions.DateDiffMinute(w.CreatedAt, w.UpdatedAt) <= 5);
            }
        }

        return await query.CountAsync();
    }
}