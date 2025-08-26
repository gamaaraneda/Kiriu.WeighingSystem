using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class ModuloPermisoRepository : IModuloPermisoRepository
{
    private readonly WeighingDbContext _context;

    public ModuloPermisoRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ModuloPermiso>> GetAllAsync()
    {
        return await _context.ModuloPermisos
            .Include(mp => mp.Modulo)
            .Include(mp => mp.Permiso)
            .OrderBy(mp => mp.Modulo.Nombre)
            .ThenBy(mp => mp.Permiso.Nombre)
            .ToListAsync();
    }

    public async Task<ModuloPermiso?> GetByIdAsync(Guid id)
    {
        return await _context.ModuloPermisos
            .Include(mp => mp.Modulo)
            .Include(mp => mp.Permiso)
            .FirstOrDefaultAsync(mp => mp.Id == id);
    }

    public async Task<IEnumerable<ModuloPermiso>> GetByModuloIdAsync(Guid moduloId)
    {
        return await _context.ModuloPermisos
            .Include(mp => mp.Permiso)
            .Where(mp => mp.ModuloId == moduloId)
            .OrderBy(mp => mp.Permiso.Nombre)
            .ToListAsync();
    }

    public async Task<IEnumerable<ModuloPermiso>> GetByPermisoIdAsync(Guid permisoId)
    {
        return await _context.ModuloPermisos
            .Include(mp => mp.Modulo)
            .Where(mp => mp.PermisoId == permisoId)
            .OrderBy(mp => mp.Modulo.Nombre)
            .ToListAsync();
    }

    public async Task<ModuloPermiso> CreateAsync(ModuloPermiso moduloPermiso)
    {
        moduloPermiso.Id = Guid.NewGuid();
        
        _context.ModuloPermisos.Add(moduloPermiso);
        await _context.SaveChangesAsync();
        
        return moduloPermiso;
    }

    public async Task<ModuloPermiso> UpdateAsync(ModuloPermiso moduloPermiso)
    {
        _context.ModuloPermisos.Update(moduloPermiso);
        await _context.SaveChangesAsync();
        return moduloPermiso;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var moduloPermiso = await _context.ModuloPermisos.FindAsync(id);
        if (moduloPermiso == null) return false;

        _context.ModuloPermisos.Remove(moduloPermiso);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByCodigoAsync(string codigo, Guid? excludeId = null)
    {
        var query = _context.ModuloPermisos.Where(mp => mp.Codigo.ToLower() == codigo.ToLower());
        
        if (excludeId.HasValue)
        {
            query = query.Where(mp => mp.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }
}