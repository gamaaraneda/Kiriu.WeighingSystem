using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class ModuloRepository : IModuloRepository
{
    private readonly WeighingDbContext _context;

    public ModuloRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Modulo>> GetAllAsync()
    {
        return await _context.Modulos
            .OrderBy(m => m.Orden)
            .ThenBy(m => m.Nombre)
            .ToListAsync();
    }

    public async Task<Modulo?> GetByIdAsync(Guid id)
    {
        return await _context.Modulos
            .FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<Modulo?> GetByNombreAsync(string nombre)
    {
        return await _context.Modulos
            .FirstOrDefaultAsync(m => m.Nombre.ToLower() == nombre.ToLower());
    }

    public async Task<Modulo> CreateAsync(Modulo modulo)
    {
        modulo.Id = Guid.NewGuid();
        
        _context.Modulos.Add(modulo);
        await _context.SaveChangesAsync();
        
        return modulo;
    }

    public async Task<Modulo> UpdateAsync(Modulo modulo)
    {
        _context.Modulos.Update(modulo);
        await _context.SaveChangesAsync();
        return modulo;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var modulo = await _context.Modulos.FindAsync(id);
        if (modulo == null) return false;

        _context.Modulos.Remove(modulo);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByNombreAsync(string nombre, Guid? excludeId = null)
    {
        var query = _context.Modulos.Where(m => m.Nombre.ToLower() == nombre.ToLower());
        
        if (excludeId.HasValue)
        {
            query = query.Where(m => m.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<IEnumerable<Modulo>> GetActivosAsync()
    {
        return await _context.Modulos
            .Where(m => m.Activo)
            .OrderBy(m => m.Orden)
            .ThenBy(m => m.Nombre)
            .ToListAsync();
    }

    public async Task<IEnumerable<Modulo>> GetByOrdenAsync()
    {
        return await _context.Modulos
            .OrderBy(m => m.Orden)
            .ToListAsync();
    }
}