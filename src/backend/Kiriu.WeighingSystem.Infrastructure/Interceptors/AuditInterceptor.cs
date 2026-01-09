using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Infrastructure.Interceptors;

/// <summary>
/// Interceptor que automáticamente llena el campo CreatedBy en WeighingOperation
/// al momento de crear nuevos registros, usando el email del usuario autenticado
/// </summary>
public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        UpdateEntities(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        UpdateEntities(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void UpdateEntities(DbContext? context)
    {
        if (context == null) return;

        var userEmail = GetCurrentUserEmail();

        // Solo aplicar a entidades WeighingOperation que están siendo creadas
        var weighingEntries = context.ChangeTracker
            .Entries<WeighingOperation>()
            .Where(e => e.State == EntityState.Added);

        foreach (var entry in weighingEntries)
        {
            // Solo llenar si no tiene valor (permite override manual si es necesario)
            if (string.IsNullOrEmpty(entry.Entity.CreatedBy))
            {
                entry.Entity.CreatedBy = userEmail ?? "SYSTEM";
            }
        }
    }

    private string? GetCurrentUserEmail()
    {
        var user = _httpContextAccessor.HttpContext?.User;

        // Verificar que el usuario esté autenticado
        if (user?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        // Obtener email del claim (mismo que se usa en AuthService.GenerateJwtTokenAsync línea 52)
        return user.FindFirst(ClaimTypes.Email)?.Value;
    }
}
