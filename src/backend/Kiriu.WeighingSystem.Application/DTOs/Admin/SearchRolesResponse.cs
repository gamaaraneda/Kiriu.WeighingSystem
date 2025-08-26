namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class SearchRolesResponse
{
    public IEnumerable<RolDto> Roles { get; set; } = new List<RolDto>();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}
