namespace Kiriu.WeighingSystem.Application.DTOs.Admin;

public class RolDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; }
    public bool Activo { get; set; }
    public int UsuariosAsignados { get; set; }
    public List<PermisoDto> Permisos { get; set; } = new();
}