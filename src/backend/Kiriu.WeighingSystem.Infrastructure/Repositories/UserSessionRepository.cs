using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Domain.Entities;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;

namespace Kiriu.WeighingSystem.Infrastructure.Repositories;

/// <summary>
/// Repositorio para gestión de sesiones de usuario
/// </summary>
public class UserSessionRepository : IUserSessionRepository
{
    private readonly WeighingDbContext _context;
    private readonly ILogger<UserSessionRepository> _logger;

    public UserSessionRepository(WeighingDbContext context, ILogger<UserSessionRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserSession?> GetByIdAsync(Guid id)
    {
        return await _context.UserSessions
            .Include(s => s.Usuario)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<UserSession?> GetActiveByJtiAsync(string jti)
    {
        return await _context.UserSessions
            .Include(s => s.Usuario)
            .FirstOrDefaultAsync(s => s.TokenJti == jti && s.IsActive && s.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<UserSession?> GetActiveByRefreshTokenAsync(string refreshToken)
    {
        return await _context.UserSessions
            .Include(s => s.Usuario)
            .FirstOrDefaultAsync(s => s.RefreshToken == refreshToken && s.IsActive && s.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<UserSession?> GetActiveSessionByUserIdAsync(Guid userId)
    {
        return await _context.UserSessions
            .Include(s => s.Usuario)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive && s.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<IEnumerable<UserSession>> GetActiveSessionsByUserIdAsync(Guid userId)
    {
        return await _context.UserSessions
            .Include(s => s.Usuario)
            .Where(s => s.UserId == userId && s.IsActive && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> HasActiveSessionAsync(Guid userId)
    {
        return await _context.UserSessions
            .AnyAsync(s => s.UserId == userId && s.IsActive && s.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<bool> IsSessionActiveByJtiAsync(string jti)
    {
        return await _context.UserSessions
            .AnyAsync(s => s.TokenJti == jti && s.IsActive && s.ExpiresAt > DateTime.UtcNow);
    }

    public async Task<UserSession> CreateAsync(UserSession session)
    {
        session.Id = Guid.NewGuid();
        session.CreatedAt = DateTime.UtcNow;
        session.IsActive = true;
        
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("✅ Sesión creada para usuario {UserId}, JTI: {Jti}", session.UserId, session.TokenJti);
        
        return session;
    }

    public async Task<UserSession> UpdateAsync(UserSession session)
    {
        _context.UserSessions.Update(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<bool> RevokeSessionAsync(Guid sessionId, string reason)
    {
        var session = await _context.UserSessions.FindAsync(sessionId);
        if (session == null || !session.IsActive)
        {
            return false;
        }

        session.IsActive = false;
        session.RevokedAt = DateTime.UtcNow;
        session.RevocationReason = reason;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("🔒 Sesión {SessionId} revocada. Razón: {Reason}", sessionId, reason);
        
        return true;
    }

    public async Task<int> RevokeAllUserSessionsAsync(Guid userId, string reason)
    {
        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == userId && s.IsActive)
            .ToListAsync();

        if (!activeSessions.Any())
        {
            return 0;
        }

        var now = DateTime.UtcNow;
        foreach (var session in activeSessions)
        {
            session.IsActive = false;
            session.RevokedAt = now;
            session.RevocationReason = reason;
        }

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("🔒 {Count} sesiones revocadas para usuario {UserId}. Razón: {Reason}", 
            activeSessions.Count, userId, reason);
        
        return activeSessions.Count;
    }

    public async Task<bool> RevokeSessionByJtiAsync(string jti, string reason)
    {
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.TokenJti == jti && s.IsActive);
            
        if (session == null)
        {
            return false;
        }

        session.IsActive = false;
        session.RevokedAt = DateTime.UtcNow;
        session.RevocationReason = reason;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("🔒 Sesión con JTI {Jti} revocada. Razón: {Reason}", jti, reason);
        
        return true;
    }

    public async Task<int> CleanExpiredSessionsAsync()
    {
        var expiredSessions = await _context.UserSessions
            .Where(s => s.ExpiresAt < DateTime.UtcNow || !s.IsActive)
            .Where(s => s.CreatedAt < DateTime.UtcNow.AddDays(-30)) // Solo eliminar sesiones de más de 30 días
            .ToListAsync();

        if (!expiredSessions.Any())
        {
            return 0;
        }

        _context.UserSessions.RemoveRange(expiredSessions);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("🧹 {Count} sesiones expiradas eliminadas", expiredSessions.Count);
        
        return expiredSessions.Count;
    }
}
