using System.Globalization;
using System.Threading;
using Microsoft.Extensions.DependencyInjection;
using FluentValidation.AspNetCore;
using Mapster;
using Kiriu.WeighingSystem.Application.Mappers;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class ConfigurationExtensions
{
    public static IServiceCollection ConfigureCulture(this IServiceCollection services)
    {
        // La configuración de cultura se aplica en Program.cs antes del builder
        // Este método se mantiene para consistencia en la cadena de configuración
        return services;
    }

    public static IServiceCollection ConfigureCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAngular", policy =>
            {
                policy.WithOrigins("http://localhost:4200")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        return services;
    }

    public static IServiceCollection ConfigureValidation(this IServiceCollection services)
    {
        services.AddFluentValidationAutoValidation();
        FluentValidation.ValidatorOptions.Global.LanguageManager.Culture = CultureInfo.InvariantCulture;

        return services;
    }

    public static IServiceCollection ConfigureMappers(this IServiceCollection services)
    {
        MapsterConfig.ConfigureMappings();
        return services;
    }

    public static IServiceCollection ConfigureHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks();
        return services;
    }
} 