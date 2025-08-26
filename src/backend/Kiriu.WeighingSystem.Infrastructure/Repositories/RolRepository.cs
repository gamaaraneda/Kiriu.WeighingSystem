using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class RolRepository : IRolRepository
{
    private readonly WeighingDbContext _context;

    public RolRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Rol>> GetAllAsync()
    {
        return await _context.Roles
            .OrderBy(r => r.Nombre)
            .ToListAsync();
    }

    public async Task<Rol?> GetByIdAsync(Guid id)
    {
        return await _context.Roles
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<Rol?> GetByIdWithPermisosAsync(Guid id)
    {
        return await _context.Roles
            .Include(r => r.RolePermisos)
                .ThenInclude(rp => rp.ModuloPermiso)
                    .ThenInclude(mp => mp.Modulo)
            .Include(r => r.RolePermisos)
                .ThenInclude(rp => rp.ModuloPermiso)
                    .ThenInclude(mp => mp.Permiso)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<Rol?> GetByNombreAsync(string nombre)
    {
        return await _context.Roles
            .FirstOrDefaultAsync(r => r.Nombre.ToLower() == nombre.ToLower());
    }

    public async Task<(IEnumerable<Rol> roles, int totalCount)> SearchRolesAsync(
        string? search = null, 
        bool? activo = null, 
        int pageNumber = 1, 
        int pageSize = 10)
    {
        var query = _context.Roles.AsQueryable();

        // Apply search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.ToLower().Trim();
            query = query.Where(r => 
                r.Nombre.ToLower().Contains(searchTerm) ||
                (r.Descripcion != null && r.Descripcion.ToLower().Contains(searchTerm)));
        }

        // Apply active status filter
        if (activo.HasValue)
        {
            query = query.Where(r => r.Activo == activo.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply pagination and ordering
        var roles = await query
            .OrderBy(r => r.Nombre)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (roles, totalCount);
    }

    public async Task<Rol> CreateAsync(Rol rol)
    {
        rol.Id = Guid.NewGuid();
        rol.FechaCreacion = DateTime.UtcNow;
        
        _context.Roles.Add(rol);
        await _context.SaveChangesAsync();
        
        return rol;
    }

    public async Task<Rol> UpdateAsync(Rol rol)
    {
        _context.Roles.Update(rol);
        await _context.SaveChangesAsync();
        return rol;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var rol = await _context.Roles.FindAsync(id);
        if (rol == null) return false;

        _context.Roles.Remove(rol);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByNombreAsync(string nombre, Guid? excludeId = null)
    {
        var query = _context.Roles.Where(r => r.Nombre.ToLower() == nombre.ToLower());
        
        if (excludeId.HasValue)
        {
            query = query.Where(r => r.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<bool> HasUsuariosAsignadosAsync(Guid rolId)
    {
        return await _context.Usuarios.AnyAsync(u => u.RolId == rolId);
    }

    public async Task<int> GetUsuariosCountAsync(Guid rolId)
    {
        return await _context.Usuarios.CountAsync(u => u.RolId == rolId);
    }
}