using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Kiriu.WeighingSystem.Application.DTOs;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

namespace Kiriu.WeighingSystem.Api.Middleware;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // No interceptar peticiones de SignalR
        if (context.Request.Path.StartsWithSegments("/hubs"))
        {
            await _next(context);
            return;
        }

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var response = context.Response;
        response.ContentType = "application/json";

        var errorResponse = new ApiResponse<object>
        {
            Success = false,
            Data = null,
            Errors = new List<string>()
        };

        switch (exception)
        {
            case SecurityTokenExpiredException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Message = "Token JWT expirado";
                errorResponse.Errors.Add("El token de acceso ha expirado. Por favor, inicie sesión nuevamente.");
                break;

            case SecurityTokenInvalidSignatureException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Message = "Token JWT inválido";
                errorResponse.Errors.Add("La firma del token es inválida.");
                break;

            case SecurityTokenInvalidIssuerException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Message = "Token JWT inválido";
                errorResponse.Errors.Add("El emisor del token es inválido.");
                break;

            case SecurityTokenInvalidAudienceException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Message = "Token JWT inválido";
                errorResponse.Errors.Add("La audiencia del token es inválida.");
                break;

            case SecurityTokenNotYetValidException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Message = "Token JWT no válido aún";
                errorResponse.Errors.Add("El token aún no es válido.");
                break;

            case UnauthorizedAccessException:
                response.StatusCode = (int)HttpStatusCode.Forbidden;
                errorResponse.Message = "Acceso denegado";
                errorResponse.Errors.Add("No tiene permisos para acceder a este recurso.");
                break;

            case ArgumentException:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.Message = "Error de validación";
                errorResponse.Errors.Add(exception.Message);
                break;

            case InvalidOperationException:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.Message = "Operación inválida";
                errorResponse.Errors.Add(exception.Message);
                break;

            default:
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                errorResponse.Message = "Error interno del servidor";
                errorResponse.Errors.Add("Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo más tarde.");
                
                // Log del error completo para debugging
                _logger.LogError(exception, "Error no manejado en la aplicación");
                break;
        }

        // Agregar metadata de la respuesta
        errorResponse.Metadata = new ResponseMetadata
        {
            Timestamp = DateTime.UtcNow,
            RequestId = context.TraceIdentifier,
            Version = "1.0"
        };

        var result = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await response.WriteAsync(result);
    }
} 