using System.Globalization;
using System.Threading;
using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Api.Converters;
using Kiriu.WeighingSystem.Api.Extensions;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Kiriu.WeighingSystem.Infrastructure.Configuration;

// Configuración de cultura para soporte de globalización
// AppContext.SetData("System.Globalization.Invariant", true); // Comentado para permitir culturas
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
Thread.CurrentThread.CurrentUICulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateBuilder(args);

// Configure Settings from appsettings.json
builder.Services.Configure<PhotoSettings>(builder.Configuration.GetSection("PhotoSettings"));

// Add HttpContextAccessor for user tracking
builder.Services.AddHttpContextAccessor();

// Configure Services
builder.Services
    .ConfigureCulture()
    .ConfigureCors()
    .ConfigureValidation()
    .ConfigureMappers()
    .ConfigureHealthChecks()
    .ConfigureAuthentication(builder.Configuration)
    .ConfigureSwagger()
    .ConfigureSignalR()
    .AddPersistence(builder.Configuration)
    .AddDomainServices()
    .AddApplicationServices(builder.Configuration)
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Configurar serialización de fechas en formato ISO 8601 con 'Z' (UTC)
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Add HttpClient for cargo camera
builder.Services.AddHttpClient();

var app = builder.Build();

// Database will be created manually
Console.WriteLine("API starting - Database should be configured manually using the provided SQL script.");

// Configure Middleware Pipeline
// Habilitar Swagger en todos los entornos (para pruebas de integración)
app.UseSwagger();
app.UseSwaggerUI();

// CORS debe ir primero - usar política que permite todos los orígenes (red local)
app.UseCors("AllowAll");

// Servir archivos estáticos (imágenes de placas)
app.UseStaticFiles();

// Authentication y Authorization
app.UseAuthentication();
app.UseAuthorization();

// Middleware personalizado - con exclusiones para SignalR ya implementadas
app.UseMiddleware<Kiriu.WeighingSystem.Api.Middleware.GlobalExceptionHandlerMiddleware>();
app.UseMiddleware<Kiriu.WeighingSystem.Api.Middleware.AuditMiddleware>();

// Mapear endpoints - SignalR debe ir con otros endpoints
app.MapControllers().RequireCors("AllowAll");
app.MapHealthChecks("/health").RequireCors("AllowAll");
app.MapSignalRHubs();

app.Run();
