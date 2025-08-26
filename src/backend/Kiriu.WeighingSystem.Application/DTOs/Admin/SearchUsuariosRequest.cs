namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class SearchUsuariosRequest
{
    public string? Search { get; set; }
    public Guid? RolId { get; set; }
    public bool? Activo { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
