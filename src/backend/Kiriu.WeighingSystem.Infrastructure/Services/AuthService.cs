using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Services;

public class AuthService : IAuthService, IPasswordService
{
    private readonly IConfiguration _configuration;
    private readonly WeighingDbContext _context;

    public AuthService(IConfiguration configuration, WeighingDbContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    public async Task<string> GenerateJwtTokenAsync(Usuario usuario)
    {
        var permissions = await GetUserPermissionsAsync(usuario.Id);
        
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.Nombre),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Rol.Nombre)
        };

        // Agregar permisos como claims
        foreach (var permission in permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:SecretKey"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["JwtSettings:ExpirationInMinutes"])),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Task<string> GenerateRefreshTokenAsync()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Task.FromResult(Convert.ToBase64String(randomNumber));
    }

    public Task<bool> ValidatePasswordAsync(string password, string passwordHash)
    {
        return Task.FromResult(BCrypt.Net.BCrypt.Verify(password, passwordHash));
    }

    public Task<string> HashPasswordAsync(string password)
    {
        return Task.FromResult(BCrypt.Net.BCrypt.HashPassword(password));
    }

    public async Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId)
    {
        var permissions = await _context.RolePermisos
            .Include(rp => rp.ModuloPermiso)
            .Include(rp => rp.Rol)
            .Where(rp => rp.Rol.Usuarios.Any(u => u.Id == userId))
            .Select(rp => rp.ModuloPermiso.Codigo)
            .Distinct()
            .ToListAsync();

        return permissions;
    }
} 