using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Services;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Kiriu.WeighingSystem.Infrastructure.Repositories;
using Kiriu.WeighingSystem.Infrastructure.Services;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Application Services
        services.AddScoped<IUsuarioApplicationService, UsuarioApplicationService>();
        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<IHealthCheckApplicationService, HealthCheckApplicationService>();
        services.AddScoped<IWeighingApplicationService, WeighingApplicationService>();
        services.AddScoped<IWeighingQueryService, WeighingQueryService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();

        return services;
    }

    public static IServiceCollection AddDomainServices(this IServiceCollection services)
    {
        // Domain Services (Infrastructure implementations)
        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPasswordService, AuthService>(); // AuthService implementa IPasswordService
        services.AddScoped<IHealthCheckService, HealthCheckService>();
        
        // Weighing Services
        services.AddScoped<IWeighingOperationRepository, WeighingOperationRepository>();
        services.AddScoped<IWeighingService, WeighingService>();

        return services;
    }

    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<WeighingDbContext>(options =>
        {
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
            
            // Configurar SQL Server para usar configuración básica sin cultura específica
            options.ConfigureWarnings(warnings => warnings.Ignore(
                Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.NavigationBaseIncludeIgnored));
        });

        return services;
    }
} 