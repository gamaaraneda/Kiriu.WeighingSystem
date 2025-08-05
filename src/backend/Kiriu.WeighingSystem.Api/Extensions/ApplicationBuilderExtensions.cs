using Microsoft.AspNetCore.Builder;
using Kiriu.WeighingSystem.Api.Middleware;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseGlobalMiddlewares(this IApplicationBuilder app)
    {
        // Global Exception Handler
        app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
        
        // CORS
        app.UseCors("AllowAngular");
        
        // Authentication & Authorization
        app.UseAuthentication();
        app.UseAuthorization();

        return app;
    }

    public static IApplicationBuilder UseDevelopmentMiddlewares(this IApplicationBuilder app)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        
        return app;
    }
} 