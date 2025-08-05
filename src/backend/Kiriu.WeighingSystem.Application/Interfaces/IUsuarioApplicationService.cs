using Kiriu.WeighingSystem.Application.DTOs.Users;

namespace Kiriu.WeighingSystem.Application.Interfaces;

public interface IUsuarioApplicationService
{
    Task<CreateUsuarioResponse> CreateUsuarioAsync(CreateUsuarioRequest request);
    Task<UsuarioDto> GetUsuarioByIdAsync(Guid id);
    Task<IEnumerable<UsuarioDto>> GetAllUsuariosAsync();
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByRolIdAsync(Guid rolId);
} 