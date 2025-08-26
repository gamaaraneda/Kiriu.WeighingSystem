namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class ModuloDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Icono { get; set; } = string.Empty;
    public int Orden { get; set; }
    public bool Activo { get; set; }
    public List<ModuloPermisoDto> Permisos { get; set; } = new();
}

public class ModuloPermisoDto
{
    public Guid Id { get; set; }
    public Guid ModuloId { get; set; }
    public Guid PermisoId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public PermisoDto Permiso { get; set; } = null!;
}