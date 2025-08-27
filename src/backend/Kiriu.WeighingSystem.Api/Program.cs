using System.Globalization;
using System.Threading;
using Microsoft.EntityFrameworkCore;
using Kiriu.WeighingSystem.Api.Extensions;
using Kiriu.WeighingSystem.Infrastructure.Data;

// Configuración definitiva de cultura para México - DEBE IR ANTES DEL BUILDER
AppContext.SetData("System.Globalization.Invariant", true);
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
Thread.CurrentThread.CurrentUICulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateBuilder(args);

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
    .AddApplicationServices()
    .AddControllers();

var app = builder.Build();

// Database will be created manually
Console.WriteLine("API starting - Database should be configured manually using the provided SQL script.");

// Configure Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDevelopmentMiddlewares();
}

app.UseGlobalMiddlewares();
app.MapControllers();
app.MapHealthChecks("/health");
app.MapSignalRHubs();

app.Run();
