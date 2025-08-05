using Mapster;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Application.Mappers;

public static class MapsterConfig
{
    public static void ConfigureMappings()
    {
        // Mapeo de Usuario a UsuarioDto
        TypeAdapterConfig<Usuario, UsuarioDto>
            .NewConfig()
            .Map(dest => dest.Rol, src => src.Rol.Nombre)
            .Map(dest => dest.Permisos, src => new List<string>()); // Se llenará manualmente

        // Mapeo de Usuario a CreateUsuarioResponse
        TypeAdapterConfig<Usuario, CreateUsuarioResponse>
            .NewConfig()
            .Map(dest => dest.Rol, src => src.Rol.Nombre);
    }
} 