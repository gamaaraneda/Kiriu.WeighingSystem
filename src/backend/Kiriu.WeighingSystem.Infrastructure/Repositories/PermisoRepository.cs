using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class PermisoRepository : IPermisoRepository
{
    private readonly WeighingDbContext _context;

    public PermisoRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Permiso>> GetAllAsync()
    {
        return await _context.Permisos
            .OrderBy(p => p.Tipo)
            .ThenBy(p => p.Nombre)
            .ToListAsync();
    }

    public async Task<Permiso?> GetByIdAsync(Guid id)
    {
        return await _context.Permisos
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<Permiso?> GetByNombreAsync(string nombre)
    {
        return await _context.Permisos
            .FirstOrDefaultAsync(p => p.Nombre.ToLower() == nombre.ToLower());
    }

    public async Task<Permiso> CreateAsync(Permiso permiso)
    {
        permiso.Id = Guid.NewGuid();
        permiso.FechaCreacion = DateTime.UtcNow;
        
        _context.Permisos.Add(permiso);
        await _context.SaveChangesAsync();
        
        return permiso;
    }

    public async Task<Permiso> UpdateAsync(Permiso permiso)
    {
        _context.Permisos.Update(permiso);
        await _context.SaveChangesAsync();
        return permiso;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var permiso = await _context.Permisos.FindAsync(id);
        if (permiso == null) return false;

        _context.Permisos.Remove(permiso);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByNombreAsync(string nombre, Guid? excludeId = null)
    {
        var query = _context.Permisos.Where(p => p.Nombre.ToLower() == nombre.ToLower());
        
        if (excludeId.HasValue)
        {
            query = query.Where(p => p.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<IEnumerable<Permiso>> GetByTipoAsync(string tipo)
    {
        return await _context.Permisos
            .Where(p => p.Tipo.ToLower() == tipo.ToLower())
            .OrderBy(p => p.Nombre)
            .ToListAsync();
    }
}