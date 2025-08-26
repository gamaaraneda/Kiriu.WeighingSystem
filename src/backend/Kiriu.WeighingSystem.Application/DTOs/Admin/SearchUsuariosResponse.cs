using Kiriu.WeighingSystem.Application.DTOs.Users;

namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class SearchUsuariosResponse
{
    public IEnumerable<UsuarioDto> Usuarios { get; set; } = new List<UsuarioDto>();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}
