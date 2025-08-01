using AutoMapper;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Domain.Entities;

namespace Kiriu.WeighingSystem.Application.Mappers;

public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {
        CreateMap<Usuario, UsuarioDto>()
            .ForMember(dest => dest.Rol, opt => opt.MapFrom(src => src.Rol.Nombre))
            .ForMember(dest => dest.Permisos, opt => opt.Ignore()); // Se llenará manualmente
    }
} 