using System.Text;
using System.Globalization;
using System.Threading;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using FluentValidation.AspNetCore;
using Serilog;
using Mapster;
using Kiriu.WeighingSystem.Api.Middleware;
using Kiriu.WeighingSystem.Application.Mappers;
using Kiriu.WeighingSystem.Application.Validators;
using Kiriu.WeighingSystem.Domain.Interfaces;
using Kiriu.WeighingSystem.Infrastructure.Data;
using Kiriu.WeighingSystem.Infrastructure.Repositories;
using Kiriu.WeighingSystem.Infrastructure.Services;

// Configuración definitiva de cultura para México
// Forzar cultura invariante a nivel de aplicación
AppContext.SetData("System.Globalization.Invariant", true);

// Configurar cultura invariante para todos los hilos
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
Thread.CurrentThread.CurrentUICulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateBuilder(args);

// Entity Framework - Configuración simplificada para evitar problemas de cultura
builder.Services.AddDbContext<WeighingDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
    
    // Configurar SQL Server para usar configuración básica sin cultura específica
    options.ConfigureWarnings(warnings => warnings.Ignore(
        Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.NavigationBaseIncludeIgnored));
});

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!))
        };
    });

// Mapster
MapsterConfig.ConfigureMappings();

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
FluentValidation.ValidatorOptions.Global.LanguageManager.Culture = CultureInfo.InvariantCulture;

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Swagger con JWT
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Kiriu Weighing API", Version = "v1" });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
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
});

// Health Checks
builder.Services.AddHealthChecks();

// Serilog - Comentado temporalmente para evitar problemas de configuración
// builder.Host.UseSerilog((context, configuration) =>
//     configuration.ReadFrom.Configuration(context.Configuration));

// Controllers
builder.Services.AddControllers();

// Dependency Injection
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();

var app = builder.Build();

// Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseSerilogRequestLogging();
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
