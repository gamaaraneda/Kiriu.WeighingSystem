using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Kiriu.WeighingSystem.Application.DTOs;
using Kiriu.WeighingSystem.Application.DTOs.Admin;
using Kiriu.WeighingSystem.Application.DTOs.Users;
using Kiriu.WeighingSystem.Application.Interfaces;
using Kiriu.WeighingSystem.Application.Exceptions;

namespace Kiriu.WeighingSystem.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminApplicationService _adminApplicationService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IAdminApplicationService adminApplicationService,
        ILogger<AdminController> logger)
    {
        _adminApplicationService = adminApplicationService;
        _logger = logger;
    }

    #region Gestión de Roles

    [HttpGet("roles")]
    public async Task<ActionResult<ApiResponse<IEnumerable<RolDto>>>> GetAllRoles()
    {
        try
        {
            var roles = await _adminApplicationService.GetAllRolesAsync();
            return Ok(new ApiResponse<IEnumerable<RolDto>>
            {
                Success = true,
                Data = roles,
                Message = "Roles obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener roles");
            return StatusCode(500, new ApiResponse<IEnumerable<RolDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("roles/search")]
    public async Task<ActionResult<ApiResponse<SearchRolesResponse>>> SearchRoles(SearchRolesRequest request)
    {
        try
        {
            var searchResult = await _adminApplicationService.SearchRolesAsync(request);
            return Ok(new ApiResponse<SearchRolesResponse>
            {
                Success = true,
                Data = searchResult,
                Message = $"Se encontraron {searchResult.TotalCount} roles"
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiResponse<SearchRolesResponse>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar roles: {@Request}", request);
            return StatusCode(500, new ApiResponse<SearchRolesResponse>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("roles/{id}")]
    public async Task<ActionResult<ApiResponse<RolDto>>> GetRolById(Guid id)
    {
        try
        {
            var rol = await _adminApplicationService.GetRolByIdAsync(id);
            return Ok(new ApiResponse<RolDto>
            {
                Success = true,
                Data = rol,
                Message = "Rol encontrado"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Rol no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener rol: {Id}", id);
            return StatusCode(500, new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("roles")]
    public async Task<ActionResult<ApiResponse<RolDto>>> CreateRol(CreateRolRequest request)
    {
        try
        {
            var rol = await _adminApplicationService.CreateRolAsync(request);
            return CreatedAtAction(nameof(GetRolById), new { id = rol.Id }, new ApiResponse<RolDto>
            {
                Success = true,
                Data = rol,
                Message = "Rol creado exitosamente"
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear rol: {Nombre}", request.Nombre);
            return StatusCode(500, new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPut("roles/{id}")]
    public async Task<ActionResult<ApiResponse<RolDto>>> UpdateRol(Guid id, UpdateRolRequest request)
    {
        try
        {
            var rol = await _adminApplicationService.UpdateRolAsync(id, request);
            return Ok(new ApiResponse<RolDto>
            {
                Success = true,
                Data = rol,
                Message = "Rol actualizado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Rol no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar rol: {Id}", id);
            return StatusCode(500, new ApiResponse<RolDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpDelete("roles/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRol(Guid id)
    {
        try
        {
            var result = await _adminApplicationService.DeleteRolAsync(id);
            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Data = result,
                Message = "Rol eliminado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<bool>
            {
                Success = false,
                Message = "Rol no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<bool>
            {
                Success = false,
                Message = "No se puede eliminar el rol",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al eliminar rol: {Id}", id);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    #endregion

    #region Gestión de Permisos

    [HttpGet("permisos")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PermisoDto>>>> GetAllPermisos()
    {
        try
        {
            var permisos = await _adminApplicationService.GetAllPermisosAsync();
            return Ok(new ApiResponse<IEnumerable<PermisoDto>>
            {
                Success = true,
                Data = permisos,
                Message = "Permisos obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener permisos");
            return StatusCode(500, new ApiResponse<IEnumerable<PermisoDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("permisos/{id}")]
    public async Task<ActionResult<ApiResponse<PermisoDto>>> GetPermisoById(Guid id)
    {
        try
        {
            var permiso = await _adminApplicationService.GetPermisoByIdAsync(id);
            return Ok(new ApiResponse<PermisoDto>
            {
                Success = true,
                Data = permiso,
                Message = "Permiso encontrado"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Permiso no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener permiso: {Id}", id);
            return StatusCode(500, new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("permisos")]
    public async Task<ActionResult<ApiResponse<PermisoDto>>> CreatePermiso(CreatePermisoRequest request)
    {
        try
        {
            var permiso = await _adminApplicationService.CreatePermisoAsync(request);
            return CreatedAtAction(nameof(GetPermisoById), new { id = permiso.Id }, new ApiResponse<PermisoDto>
            {
                Success = true,
                Data = permiso,
                Message = "Permiso creado exitosamente"
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear permiso: {Nombre}", request.Nombre);
            return StatusCode(500, new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPut("permisos/{id}")]
    public async Task<ActionResult<ApiResponse<PermisoDto>>> UpdatePermiso(Guid id, CreatePermisoRequest request)
    {
        try
        {
            var permiso = await _adminApplicationService.UpdatePermisoAsync(id, request);
            return Ok(new ApiResponse<PermisoDto>
            {
                Success = true,
                Data = permiso,
                Message = "Permiso actualizado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Permiso no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar permiso: {Id}", id);
            return StatusCode(500, new ApiResponse<PermisoDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpDelete("permisos/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeletePermiso(Guid id)
    {
        try
        {
            var result = await _adminApplicationService.DeletePermisoAsync(id);
            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Data = result,
                Message = "Permiso eliminado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<bool>
            {
                Success = false,
                Message = "Permiso no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al eliminar permiso: {Id}", id);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    #endregion

    #region Gestión de Módulos

    [HttpGet("modulos")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ModuloDto>>>> GetAllModulos()
    {
        try
        {
            var modulos = await _adminApplicationService.GetAllModulosAsync();
            return Ok(new ApiResponse<IEnumerable<ModuloDto>>
            {
                Success = true,
                Data = modulos,
                Message = "Módulos obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener módulos");
            return StatusCode(500, new ApiResponse<IEnumerable<ModuloDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("modulos/{id}")]
    public async Task<ActionResult<ApiResponse<ModuloDto>>> GetModuloById(Guid id)
    {
        try
        {
            var modulo = await _adminApplicationService.GetModuloByIdAsync(id);
            return Ok(new ApiResponse<ModuloDto>
            {
                Success = true,
                Data = modulo,
                Message = "Módulo encontrado"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Módulo no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener módulo: {Id}", id);
            return StatusCode(500, new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("modulos")]
    public async Task<ActionResult<ApiResponse<ModuloDto>>> CreateModulo(CreateModuloRequest request)
    {
        try
        {
            var modulo = await _adminApplicationService.CreateModuloAsync(request);
            return CreatedAtAction(nameof(GetModuloById), new { id = modulo.Id }, new ApiResponse<ModuloDto>
            {
                Success = true,
                Data = modulo,
                Message = "Módulo creado exitosamente"
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear módulo: {Nombre}", request.Nombre);
            return StatusCode(500, new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPut("modulos/{id}")]
    public async Task<ActionResult<ApiResponse<ModuloDto>>> UpdateModulo(Guid id, CreateModuloRequest request)
    {
        try
        {
            var modulo = await _adminApplicationService.UpdateModuloAsync(id, request);
            return Ok(new ApiResponse<ModuloDto>
            {
                Success = true,
                Data = modulo,
                Message = "Módulo actualizado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Módulo no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar módulo: {Id}", id);
            return StatusCode(500, new ApiResponse<ModuloDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpDelete("modulos/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteModulo(Guid id)
    {
        try
        {
            var result = await _adminApplicationService.DeleteModuloAsync(id);
            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Data = result,
                Message = "Módulo eliminado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<bool>
            {
                Success = false,
                Message = "Módulo no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al eliminar módulo: {Id}", id);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    #endregion

    #region Gestión de Usuarios

    [HttpGet("usuarios")]
    public async Task<ActionResult<ApiResponse<IEnumerable<UsuarioDto>>>> GetAllUsuarios()
    {
        try
        {
            var usuarios = await _adminApplicationService.GetAllUsuariosWithRolesAsync();
            return Ok(new ApiResponse<IEnumerable<UsuarioDto>>
            {
                Success = true,
                Data = usuarios,
                Message = "Usuarios obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener usuarios");
            return StatusCode(500, new ApiResponse<IEnumerable<UsuarioDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("usuarios/search")]
    public async Task<ActionResult<ApiResponse<SearchUsuariosResponse>>> SearchUsuarios(SearchUsuariosRequest request)
    {
        try
        {
            var searchResult = await _adminApplicationService.SearchUsuariosAsync(request);
            return Ok(new ApiResponse<SearchUsuariosResponse>
            {
                Success = true,
                Data = searchResult,
                Message = $"Se encontraron {searchResult.TotalCount} usuarios"
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiResponse<SearchUsuariosResponse>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar usuarios: {@Request}", request);
            return StatusCode(500, new ApiResponse<SearchUsuariosResponse>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost("usuarios")]
    public async Task<ActionResult<ApiResponse<CreateUsuarioResponse>>> CreateUsuario(CreateUsuarioRequest request)
    {
        try
        {
            var response = await _adminApplicationService.CreateUsuarioAsync(request);
            return CreatedAtAction(nameof(GetUsuarioById), new { id = response.Id }, new ApiResponse<CreateUsuarioResponse>
            {
                Success = true,
                Data = response,
                Message = "Usuario creado exitosamente"
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ApiResponse<CreateUsuarioResponse>
            {
                Success = false,
                Message = "Error de validación",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<CreateUsuarioResponse>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear usuario: {Email}", request.Email);
            return StatusCode(500, new ApiResponse<CreateUsuarioResponse>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("usuarios/{id}")]
    public async Task<ActionResult<ApiResponse<UsuarioDto>>> GetUsuarioById(Guid id)
    {
        try
        {
            var usuarios = await _adminApplicationService.GetAllUsuariosWithRolesAsync();
            var usuario = usuarios.FirstOrDefault(u => u.Id == id);
            
            if (usuario == null)
                return NotFound(new ApiResponse<UsuarioDto>
                {
                    Success = false,
                    Message = "Usuario no encontrado"
                });

            return Ok(new ApiResponse<UsuarioDto>
            {
                Success = true,
                Data = usuario,
                Message = "Usuario encontrado"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener usuario: {Id}", id);
            return StatusCode(500, new ApiResponse<UsuarioDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPut("usuarios/{id}")]
    public async Task<ActionResult<ApiResponse<UsuarioDto>>> UpdateUsuario(Guid id, UpdateUsuarioRequest request)
    {
        try
        {
            var usuario = await _adminApplicationService.UpdateUsuarioAsync(id, request);
            return Ok(new ApiResponse<UsuarioDto>
            {
                Success = true,
                Data = usuario,
                Message = "Usuario actualizado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<UsuarioDto>
            {
                Success = false,
                Message = "Usuario no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (ConflictException ex)
        {
            return BadRequest(new ApiResponse<UsuarioDto>
            {
                Success = false,
                Message = "Conflicto de datos",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar usuario: {Id}", id);
            return StatusCode(500, new ApiResponse<UsuarioDto>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpDelete("usuarios/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUsuario(Guid id)
    {
        try
        {
            var result = await _adminApplicationService.DeleteUsuarioAsync(id);
            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Data = result,
                Message = "Usuario eliminado exitosamente"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<bool>
            {
                Success = false,
                Message = "Usuario no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al eliminar usuario: {Id}", id);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    #endregion

    #region Asignación de Permisos

    [HttpPost("roles/{rolId}/permisos")]
    public async Task<ActionResult<ApiResponse<bool>>> AsignarPermisosARol(Guid rolId, List<Guid> moduloPermisosIds)
    {
        try
        {
            var request = new AsignarPermisosRequest
            {
                RolId = rolId,
                ModuloPermisosIds = moduloPermisosIds
            };

            var result = await _adminApplicationService.AsignarPermisosARolAsync(request);
            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Data = result,
                Message = "Permisos asignados exitosamente al rol"
            });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ApiResponse<bool>
            {
                Success = false,
                Message = "Rol no encontrado",
                Errors = new List<string> { ex.Message }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al asignar permisos al rol: {RolId}", rolId);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("roles/{rolId}/permisos")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ModuloPermisoDto>>>> GetPermisosDeRol(Guid rolId)
    {
        try
        {
            var permisos = await _adminApplicationService.GetPermisosDeRolAsync(rolId);
            return Ok(new ApiResponse<IEnumerable<ModuloPermisoDto>>
            {
                Success = true,
                Data = permisos,
                Message = "Permisos del rol obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener permisos del rol: {RolId}", rolId);
            return StatusCode(500, new ApiResponse<IEnumerable<ModuloPermisoDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("roles-permisos")]
    public async Task<ActionResult<ApiResponse<IEnumerable<RolDto>>>> GetRolesWithPermisos()
    {
        try
        {
            var roles = await _adminApplicationService.GetRolesWithPermisosAsync();
            return Ok(new ApiResponse<IEnumerable<RolDto>>
            {
                Success = true,
                Data = roles,
                Message = "Roles con permisos obtenidos exitosamente"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener roles con permisos");
            return StatusCode(500, new ApiResponse<IEnumerable<RolDto>>
            {
                Success = false,
                Message = "Error interno del servidor",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    #endregion
}