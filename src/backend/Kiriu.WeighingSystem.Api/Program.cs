using System.Globalization;
using System.Threading;
using Kiriu.WeighingSystem.Api.Extensions;

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
    .AddPersistence(builder.Configuration)
    .AddDomainServices()
    .AddApplicationServices()
    .AddControllers();

var app = builder.Build();

// Configure Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDevelopmentMiddlewares();
}

app.UseGlobalMiddlewares();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
