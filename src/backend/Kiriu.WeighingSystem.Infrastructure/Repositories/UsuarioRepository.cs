using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly WeighingDbContext _context;

    public UsuarioRepository(WeighingDbContext context)
    {
        _context = context;
    }

    public async Task<Usuario?> GetByIdAsync(Guid id)
    {
        return await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<Usuario?> GetByIdWithRolAsync(Guid id)
    {
        return await _context.Usuarios
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<Usuario?> GetByEmailAsync(string email)
    {
        return await _context.Usuarios
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.Email == email && u.Activo);
    }

    public async Task<IEnumerable<Usuario>> GetAllAsync()
    {
        return await _context.Usuarios
            .Where(u => u.Activo)
            .ToListAsync();
    }

    public async Task<IEnumerable<Usuario>> GetAllWithRolesAsync()
    {
        return await _context.Usuarios
            .Include(u => u.Rol)
            .OrderBy(u => u.Nombre)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Usuario> usuarios, int totalCount)> SearchUsuariosAsync(
        string? search = null, 
        Guid? rolId = null, 
        bool? activo = null, 
        int pageNumber = 1, 
        int pageSize = 10)
    {
        var query = _context.Usuarios
            .Include(u => u.Rol)
            .AsQueryable();

        // Apply search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.ToLower().Trim();
            query = query.Where(u => 
                u.Nombre.ToLower().Contains(searchTerm) ||
                u.Email.ToLower().Contains(searchTerm) ||
                (u.Apellidos != null && u.Apellidos.ToLower().Contains(searchTerm)));
        }

        // Apply role filter
        if (rolId.HasValue)
        {
            query = query.Where(u => u.RolId == rolId.Value);
        }

        // Apply active status filter
        if (activo.HasValue)
        {
            query = query.Where(u => u.Activo == activo.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply pagination and ordering
        var usuarios = await query
            .OrderBy(u => u.Nombre)
            .ThenBy(u => u.Apellidos)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (usuarios, totalCount);
    }

    public async Task<Usuario> AddAsync(Usuario usuario)
    {
        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();
        return usuario;
    }

    public async Task<Usuario> UpdateAsync(Usuario usuario)
    {
        _context.Usuarios.Update(usuario);
        await _context.SaveChangesAsync();
        return usuario;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario != null)
        {
            usuario.Activo = false;
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }

    public async Task<bool> ExistsAsync(Guid id)
    {
        return await _context.Usuarios.AnyAsync(u => u.Id == id && u.Activo);
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        return await _context.Usuarios.AnyAsync(u => u.Email == email && u.Activo);
    }

    public async Task<bool> ExistsByRolIdAsync(Guid rolId)
    {
        return await _context.Roles.AnyAsync(r => r.Id == rolId && r.Activo);
    }
} 