using Mapster;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.DTOs.Auth;
using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Application.Mappers;

public static class MapsterConfig
{
    public static void ConfigureMappings()
    {
        // Mapeo de Usuario a UsuarioDto
        TypeAdapterConfig<Usuario, UsuarioDto>
            .NewConfig()
            .Map(dest => dest.RolId, src => src.RolId)
            .Map(dest => dest.Rol, src => src.Rol.Nombre)
            .Map(dest => dest.FechaCreacion, src => src.FechaCreacion)
            .Map(dest => dest.UltimoAcceso, src => src.UltimoAcceso)
            .Map(dest => dest.Activo, src => src.Activo)
            .Map(dest => dest.Permisos, src => new List<string>()); // Se llenará manualmente

        // Mapeo de Usuario a CreateUsuarioResponse
        TypeAdapterConfig<Usuario, CreateUsuarioResponse>
            .NewConfig()
            .Map(dest => dest.Rol, src => src.Rol.Nombre);

        // Mapeo de LoginRequest a Usuario (para búsquedas)
        TypeAdapterConfig<LoginRequest, Usuario>
            .NewConfig()
            .Map(dest => dest.Email, src => src.Email)
            .Ignore(dest => dest.Id)
            .Ignore(dest => dest.Nombre)
            .Ignore(dest => dest.Apellidos)
            .Ignore(dest => dest.PasswordHash)
            .Ignore(dest => dest.RolId)
            .Ignore(dest => dest.FechaCreacion)
            .Ignore(dest => dest.UltimoAcceso)
            .Ignore(dest => dest.Activo)
            .Ignore(dest => dest.Rol)
            .IgnoreNonMapped(true);
    }
} 