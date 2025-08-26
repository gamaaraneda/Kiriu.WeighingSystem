using Microsoft.AspNetCore.Builder;
using Kiriu.WeighingSystem.Api.Middleware;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseGlobalMiddlewares(this IApplicationBuilder app)
    {
        // Global Exception Handler
        app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
        
        // CORS - Usar política más permisiva para desarrollo
        app.UseCors("AllowAll");
        
        // Authentication & Authorization
        app.UseAuthentication();
        app.UseAuthorization();
        
        // Audit Middleware - Debe ir después de autenticación para capturar info del usuario
        app.UseMiddleware<AuditMiddleware>();

        return app;
    }

    public static IApplicationBuilder UseDevelopmentMiddlewares(this IApplicationBuilder app)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        
        return app;
    }
} 