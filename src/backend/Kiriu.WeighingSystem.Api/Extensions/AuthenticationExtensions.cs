using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Kiriu.WeighingSystem.Domain.Interfaces;

namespace Kiriu.WeighingSystem.Api.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection ConfigureAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];

        // Validar configuración JWT
        if (string.IsNullOrEmpty(secretKey) || string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
        {
            throw new InvalidOperationException("JWT configuration is incomplete. Please check JwtSettings in appsettings.json");
        }

        // Configuración JWT Bearer
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.SaveToken = true;
            options.RequireHttpsMetadata = false; // Para desarrollo, en producción debe ser true
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ClockSkew = TimeSpan.Zero, // Sin tolerancia de tiempo
                ValidIssuer = issuer,
                ValidAudience = audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                // Configuraciones adicionales para mejor compatibilidad
                RequireExpirationTime = true,
                RequireSignedTokens = true
            };

            // Configuración de eventos para logging detallado
            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();
                    logger.LogError("Authentication failed: {Error}", context.Exception.Message);
                    
                    if (context.Exception is SecurityTokenExpiredException)
                    {
                        logger.LogWarning("Token expired");
                    }
                    else if (context.Exception is SecurityTokenInvalidSignatureException)
                    {
                        logger.LogWarning("Invalid token signature");
                    }
                    else if (context.Exception is SecurityTokenInvalidIssuerException)
                    {
                        logger.LogWarning("Invalid token issuer");
                    }
                    else if (context.Exception is SecurityTokenInvalidAudienceException)
                    {
                        logger.LogWarning("Invalid token audience");
                    }
                    
                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();
                    var sessionService = context.HttpContext.RequestServices.GetService<IUserSessionService>();
                    
                    // Extraer el JTI del token para validar la sesión
                    var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                    
                    if (sessionService != null && !string.IsNullOrEmpty(jti))
                    {
                        var isSessionActive = await sessionService.IsSessionActiveAsync(jti);
                        
                        if (!isSessionActive)
                        {
                            logger.LogWarning("🔒 Sesión invalidada - JTI: {Jti}. El usuario puede haber iniciado sesión en otro dispositivo.", jti);
                            context.Fail("La sesión ha sido invalidada. Por favor, inicie sesión nuevamente.");
                            return;
                        }
                    }
                    
                    logger.LogInformation("Token validated successfully for user: {User}", 
                        context.Principal?.Identity?.Name ?? "Unknown");
                },
                OnChallenge = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();
                    logger.LogWarning("JWT challenge issued: {Error}", context.Error);
                    return Task.CompletedTask;
                },
                OnForbidden = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();
                    logger.LogWarning("Access forbidden for request: {Path}", 
                        context.HttpContext.Request.Path);
                    return Task.CompletedTask;
                }
            };
        });

        // Configuración de autorización global
        services.AddAuthorization(options =>
        {
            // Política por defecto que requiere autenticación
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();

            // Política para administradores (opcional, para futuras implementaciones)
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireRole("Admin"));

            // Política para usuarios autenticados
            options.AddPolicy("AuthenticatedUser", policy =>
                policy.RequireAuthenticatedUser());
        });

        return services;
    }
} 