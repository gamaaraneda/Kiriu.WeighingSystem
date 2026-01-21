using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<AuthService> _logger;

    public AuthService(IConfiguration configuration, WeighingDbContext context, ILogger<AuthService> logger)
    {
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }

    public async Task<(string Token, string Jti)> GenerateJwtTokenAsync(Usuario usuario, string? jti = null)
    {
        var permissions = await GetUserPermissionsAsync(usuario.Id);

        // Cargar el rol si no está cargado
        if (usuario.Rol == null)
        {
            var usuarioConRol = await _context.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(u => u.Id == usuario.Id);

            if (usuarioConRol?.Rol == null)
            {
                throw new InvalidOperationException($"El usuario {usuario.Email} no tiene un rol asignado");
            }

            usuario = usuarioConRol;
        }

        // Generar JTI si no se proporciona (para control de sesiones)
        var tokenJti = jti ?? Guid.NewGuid().ToString();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.Nombre),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Rol.Nombre),
            new(JwtRegisteredClaimNames.Jti, tokenJti) // JWT ID para control de sesiones
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

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        
        _logger.LogInformation("🔑 JWT generado para usuario {Email} con JTI: {Jti}", usuario.Email, tokenJti);
        
        return (tokenString, tokenJti);
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
        try
        {
            _logger.LogInformation("🔍 Validando contraseña...");
            _logger.LogInformation("   Password: '{Password}'", password);
            _logger.LogInformation("   Password length: {Length}", password?.Length ?? 0);
            _logger.LogInformation("   Password bytes: {Bytes}", string.Join(",", System.Text.Encoding.UTF8.GetBytes(password ?? "")));
            _logger.LogInformation("   Hash COMPLETO: {Hash}", passwordHash);
            _logger.LogInformation("   Hash length: {HashLength}", passwordHash?.Length ?? 0);

            // Log de comparación directa
            _logger.LogInformation("   🔍 COMPARACIÓN DIRECTA:");
            _logger.LogInformation("      Password recibida: '{Password}'", password);
            _logger.LogInformation("      Hash almacenado: '{Hash}'", passwordHash);
            _logger.LogInformation("      ¿Son iguales las referencias?: {ReferenceEquals}", ReferenceEquals(password, passwordHash));
            _logger.LogInformation("      ¿Son iguales con ==?: {Equals}", password == passwordHash);
            _logger.LogInformation("      ¿Son iguales con Equals?: {EqualsMethod}", password?.Equals(passwordHash));
            _logger.LogInformation("      ¿Son iguales con StringComparison?: {StringComparison}", string.Equals(password, passwordHash, StringComparison.Ordinal));

            // Usar la misma configuración que se usó para generar el hash
            var isValid = BCrypt.Net.BCrypt.Verify(password, passwordHash, false);
            _logger.LogInformation("   ✅ Resultado validación BCrypt: {IsValid}", isValid);
            
            // Log adicional para debug
            if (!isValid)
            {
                _logger.LogWarning("   ⚠️ VALIDACIÓN FALLIDA - DEBUGGING:");
                _logger.LogWarning("      Password original: '{Password}'", password);
                _logger.LogWarning("      Password trimmed: '{PasswordTrimmed}'", password?.Trim());
                _logger.LogWarning("      Hash original: '{Hash}'", passwordHash);
                _logger.LogWarning("      Hash trimmed: '{HashTrimmed}'", passwordHash?.Trim());
                
                // Intentar con diferentes configuraciones
                try
                {
                    var testWithEnhanced = BCrypt.Net.BCrypt.Verify(password, passwordHash, true);
                    _logger.LogWarning("      Test con enhancedEntropy=true: {TestEnhanced}", testWithEnhanced);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("      Error con enhancedEntropy=true: {Error}", ex.Message);
                }
                
                try
                {
                    var testWithEnhancedFalse = BCrypt.Net.BCrypt.Verify(password, passwordHash, false);
                    _logger.LogWarning("      Test con enhancedEntropy=false: {TestEnhancedFalse}", testWithEnhancedFalse);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("      Error con enhancedEntropy=false: {Error}", ex.Message);
                }
            }

            return Task.FromResult(isValid);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error al validar contraseña");
            return Task.FromResult(false);
        }
    }

    public Task<string> HashPasswordAsync(string password)
    {
        try
        {
            _logger.LogInformation("🔐 Hasheando contraseña...");
            _logger.LogInformation("   Password: '{Password}'", password);
            _logger.LogInformation("   Password length: {Length}", password?.Length ?? 0);
            _logger.LogInformation("   Password bytes: {Bytes}", string.Join(",", System.Text.Encoding.UTF8.GetBytes(password ?? "")));

            // Usar configuración estándar de BCrypt con workFactor 11
            // Asegurar que no se use enhancedEntropy para consistencia
            var hash = BCrypt.Net.BCrypt.HashPassword(password, 11, false);
            _logger.LogInformation("   ✅ Hash generado COMPLETO: {Hash}", hash);
            _logger.LogInformation("   Hash length: {HashLength}", hash?.Length ?? 0);
            
            // Log adicional para verificar el hash generado
            _logger.LogInformation("   🔍 VERIFICACIÓN DEL HASH GENERADO:");
            _logger.LogInformation("      Hash generado: '{Hash}'", hash);
            _logger.LogInformation("      Hash bytes: {HashBytes}", string.Join(",", System.Text.Encoding.UTF8.GetBytes(hash ?? "")));
            
            // Verificar inmediatamente si el hash funciona
            var testVerification = BCrypt.Net.BCrypt.Verify(password, hash, false);
            _logger.LogInformation("      ✅ Verificación inmediata del hash: {TestVerification}", testVerification);

            return Task.FromResult(hash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error al hashear contraseña");
            throw;
        }
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