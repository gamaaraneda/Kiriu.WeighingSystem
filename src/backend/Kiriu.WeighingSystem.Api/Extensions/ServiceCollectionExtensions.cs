using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Services;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Kiriu.WeighingSystem.Infrastructure.Repositories;
using Kiriu.WeighingSystem.Infrastructure.Services;
using Kiriu.WeighingSystem.Infrastructure.Interceptors;
using Kiriu.WeighingSystem.Api.Services;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Application Services
        services.AddScoped<IUsuarioApplicationService, UsuarioApplicationService>();
        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<IHealthCheckApplicationService, HealthCheckApplicationService>();
        services.AddScoped<IWeighingApplicationService, WeighingApplicationService>();
        services.AddScoped<IWeighingQueryService, WeighingQueryService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();
        services.AddScoped<IAdminApplicationService, AdminApplicationService>();

        // ANPR Services
        var imageStoragePath = configuration["AnprCamera:ImageStoragePath"] ?? "uploads/plates";
        services.AddScoped<AnprApplicationService>(sp =>
            new AnprApplicationService(
                sp.GetRequiredService<ILogger<AnprApplicationService>>(),
                imageStoragePath));
        services.AddScoped<AnprParserService>();

        // Peso Real-time Service
        services.AddHostedService<PesoRealtimeService>();

        return services;
    }

    public static IServiceCollection AddDomainServices(this IServiceCollection services)
    {
        // Domain Services (Infrastructure implementations)
        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPasswordService, AuthService>(); // AuthService implementa IPasswordService
        services.AddScoped<IHealthCheckService, HealthCheckService>();
        
        // Admin Services
        services.AddScoped<IRolRepository, RolRepository>();
        services.AddScoped<IPermisoRepository, PermisoRepository>();
        services.AddScoped<IModuloRepository, ModuloRepository>();
        services.AddScoped<IModuloPermisoRepository, ModuloPermisoRepository>();
        services.AddScoped<IRolePermisoRepository, RolePermisoRepository>();
        
        // Weighing Services
        services.AddScoped<IWeighingOperationRepository, WeighingOperationRepository>();
        services.AddScoped<IWeighingPhotoRepository, WeighingPhotoRepository>();
        services.AddScoped<IWeighingService, WeighingService>();

        // Audit Services
        services.AddScoped<IAuditLogger, AuditLoggerService>();

        return services;
    }

    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        // Registrar el interceptor para auditoría de CreatedBy
        services.AddScoped<AuditInterceptor>();

        services.AddDbContext<WeighingDbContext>((serviceProvider, options) =>
        {
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));

            // Configurar SQL Server para usar configuración básica sin cultura específica
            options.ConfigureWarnings(warnings => warnings.Ignore(
                Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.NavigationBaseIncludeIgnored));

            // Agregar interceptor para poblar CreatedBy automáticamente
            options.AddInterceptors(serviceProvider.GetRequiredService<AuditInterceptor>());
        });

        return services;
    }

    public static IServiceCollection ConfigureSignalR(this IServiceCollection services)
    {
        services.AddSignalR(options =>
        {
            options.EnableDetailedErrors = true;
            options.HandshakeTimeout = TimeSpan.FromSeconds(30);
            options.KeepAliveInterval = TimeSpan.FromSeconds(15);
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
        }).AddJsonProtocol();

        return services;
    }
} 