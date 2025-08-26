using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class RolePermisoRepository : IRolePermisoRepository
{
    private readonly WeighingDbContext _context;

    public RolePermisoRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<RolePermiso>> GetByRolIdAsync(Guid rolId)
    {
        return await _context.RolePermisos
            .Include(rp => rp.ModuloPermiso)
                .ThenInclude(mp => mp.Modulo)
            .Include(rp => rp.ModuloPermiso)
                .ThenInclude(mp => mp.Permiso)
            .Where(rp => rp.RolId == rolId)
            .OrderBy(rp => rp.ModuloPermiso.Modulo.Nombre)
            .ThenBy(rp => rp.ModuloPermiso.Permiso.Nombre)
            .ToListAsync();
    }

    public async Task<IEnumerable<RolePermiso>> GetByModuloPermisoIdAsync(Guid moduloPermisoId)
    {
        return await _context.RolePermisos
            .Include(rp => rp.Rol)
            .Where(rp => rp.ModuloPermisoId == moduloPermisoId)
            .OrderBy(rp => rp.Rol.Nombre)
            .ToListAsync();
    }

    public async Task<RolePermiso> CreateAsync(RolePermiso rolePermiso)
    {
        rolePermiso.FechaAsignacion = DateTime.UtcNow;
        
        _context.RolePermisos.Add(rolePermiso);
        await _context.SaveChangesAsync();
        
        return rolePermiso;
    }

    public async Task<bool> DeleteAsync(Guid rolId, Guid moduloPermisoId)
    {
        var rolePermiso = await _context.RolePermisos
            .FirstOrDefaultAsync(rp => rp.RolId == rolId && rp.ModuloPermisoId == moduloPermisoId);
            
        if (rolePermiso == null) return false;

        _context.RolePermisos.Remove(rolePermiso);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAllByRolIdAsync(Guid rolId)
    {
        var rolePermisos = await _context.RolePermisos
            .Where(rp => rp.RolId == rolId)
            .ToListAsync();

        if (!rolePermisos.Any()) return true;

        _context.RolePermisos.RemoveRange(rolePermisos);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(Guid rolId, Guid moduloPermisoId)
    {
        return await _context.RolePermisos
            .AnyAsync(rp => rp.RolId == rolId && rp.ModuloPermisoId == moduloPermisoId);
    }

    public async Task<IEnumerable<RolePermiso>> GetPermisosForRolAsync(Guid rolId)
    {
        return await _context.RolePermisos
            .Include(rp => rp.ModuloPermiso)
                .ThenInclude(mp => mp.Modulo)
            .Include(rp => rp.ModuloPermiso)
                .ThenInclude(mp => mp.Permiso)
            .Where(rp => rp.RolId == rolId)
            .ToListAsync();
    }
}