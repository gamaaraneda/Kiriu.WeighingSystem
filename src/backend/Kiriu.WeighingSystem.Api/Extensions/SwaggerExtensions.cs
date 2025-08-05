using Microsoft.OpenApi.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authorization;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Reflection;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class SwaggerExtensions
{
    public static IServiceCollection ConfigureSwagger(this IServiceCollection services)
    {
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Kiriu Weighing System API",
                Version = "v1",
                Description = "API para el sistema de pesaje Kiriu",
                Contact = new OpenApiContact
                {
                    Name = "Kiriu Development Team",
                    Email = "dev@kiriu.com"
                }
            });

            // Configuración JWT para Swagger
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT"
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    new string[] {}
                }
            });

            // Configurar endpoints públicos (sin autenticación)
            c.DocumentFilter<PublicEndpointsDocumentFilter>();
            
            // Configurar operaciones para incluir descripciones de autenticación
            c.OperationFilter<SecurityRequirementsOperationFilter>();
        });

        return services;
    }
}

// Filtro para marcar endpoints públicos en Swagger
public class PublicEndpointsDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        // Marcar endpoints públicos
        var publicEndpoints = new[]
        {
            "/api/auth/login",
            "/api/healthcheck",
            "/api/healthcheck/detailed",
            "/api/healthcheck/ping",
            "/health"
        };

        foreach (var path in swaggerDoc.Paths)
        {
            if (publicEndpoints.Contains(path.Key))
            {
                // Marcar como endpoint público (sin autenticación requerida)
                foreach (var operation in path.Value.Operations)
                {
                    operation.Value.Security = new List<OpenApiSecurityRequirement>();
                }
            }
        }
    }
}

// Filtro para aplicar requisitos de seguridad a las operaciones
public class SecurityRequirementsOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // Obtener el atributo [Authorize] del controlador o método
        var hasAuthorize = context.MethodInfo.DeclaringType?.GetCustomAttributes(true)
            .OfType<AuthorizeAttribute>()
            .Any() ?? false;

        hasAuthorize = hasAuthorize || context.MethodInfo.GetCustomAttributes(true)
            .OfType<AuthorizeAttribute>()
            .Any();

        // Si no tiene [Authorize] o tiene [AllowAnonymous], no aplicar seguridad
        var hasAllowAnonymous = context.MethodInfo.GetCustomAttributes(true)
            .OfType<AllowAnonymousAttribute>()
            .Any();

        if (!hasAuthorize || hasAllowAnonymous)
        {
            operation.Security = new List<OpenApiSecurityRequirement>();
        }
    }
} 