using System.IO;
using System.Net.Mime;
using Kiriu.WeighingSystem.SerialGateway.Configuration;
using Kiriu.WeighingSystem.SerialGateway.Models;
using Kiriu.WeighingSystem.SerialGateway.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Systemd;
using Microsoft.Extensions.Hosting.WindowsServices;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService();
builder.Host.UseSystemd();

var urls = builder.Configuration.GetValue<string>("ServiceHost:Urls");
if (!string.IsNullOrWhiteSpace(urls))
{
    builder.WebHost.UseUrls(urls.Split(';', StringSplitOptions.RemoveEmptyEntries));
}

builder.Services.Configure<SerialSettings>(
    builder.Configuration.GetSection(SerialSettings.SectionName));

builder.Services.AddSingleton<ISerialWeighingService, SerialWeighingService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Habilitar CORS
app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/", () => Results.Ok("Kiriu Serial Gateway"));

app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    Service = "Kiriu Serial Gateway",
    Timestamp = DateTime.UtcNow
}));

app.MapGet("/weight", async (ISerialWeighingService service, CancellationToken cancellationToken) =>
    {
        try
        {
            var reading = await service.GetWeightAsync(cancellationToken).ConfigureAwait(false);
            var response = new WeightResponseDto(reading.Value, reading.Unit, reading.TimestampUtc, reading.RawResponse);

            return Results.Json(response, contentType: MediaTypeNames.Application.Json);
        }
        catch (TimeoutException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status504GatewayTimeout,
                title: "Timeout",
                detail: ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "Lectura inválida",
                detail: ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Puerto no disponible",
                detail: ex.Message);
        }
        catch (IOException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Error de E/S",
                detail: ex.Message);
        }
    })
    .WithName("GetWeight")
    .Produces<WeightResponseDto>(StatusCodes.Status200OK, contentType: MediaTypeNames.Application.Json)
    .ProducesProblem(StatusCodes.Status502BadGateway)
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable)
    .ProducesProblem(StatusCodes.Status504GatewayTimeout)
    .WithOpenApi();

app.Run();
