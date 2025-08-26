import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  RolDto,
  CreateRolRequest,
  UpdateRolRequest,
  PermisoDto,
  CreatePermisoRequest,
  ModuloDto,
  CreateModuloRequest,
  UpdateModuloRequest,
  UsuarioDto,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  AsignarPermisosRequest,
  AsignarRolesRequest,
  ModuloPermisoDto,
  SearchUsuariosRequest,
  SearchUsuariosResponse,
  ApiResponse,
} from '../types/admin.types';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // ==================== ROLES ====================

  getAllRoles(): Observable<ApiResponse<RolDto[]>> {
    return this.http.get<ApiResponse<RolDto[]>>(`${this.apiUrl}/roles`);
  }

  getRolById(id: string): Observable<ApiResponse<RolDto>> {
    return this.http.get<ApiResponse<RolDto>>(`${this.apiUrl}/roles/${id}`);
  }

  createRol(request: CreateRolRequest): Observable<ApiResponse<RolDto>> {
    return this.http.post<ApiResponse<RolDto>>(`${this.apiUrl}/roles`, request);
  }

  updateRol(
    id: string,
    request: UpdateRolRequest
  ): Observable<ApiResponse<RolDto>> {
    return this.http.put<ApiResponse<RolDto>>(
      `${this.apiUrl}/roles/${id}`,
      request
    );
  }

  deleteRol(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/roles/${id}`);
  }

  // ==================== PERMISOS ====================

  getAllPermisos(): Observable<ApiResponse<PermisoDto[]>> {
    return this.http.get<ApiResponse<PermisoDto[]>>(`${this.apiUrl}/permisos`);
  }

  getPermisoById(id: string): Observable<ApiResponse<PermisoDto>> {
    return this.http.get<ApiResponse<PermisoDto>>(
      `${this.apiUrl}/permisos/${id}`
    );
  }

  createPermiso(
    request: CreatePermisoRequest
  ): Observable<ApiResponse<PermisoDto>> {
    return this.http.post<ApiResponse<PermisoDto>>(
      `${this.apiUrl}/permisos`,
      request
    );
  }

  updatePermiso(
    id: string,
    request: CreatePermisoRequest
  ): Observable<ApiResponse<PermisoDto>> {
    return this.http.put<ApiResponse<PermisoDto>>(
      `${this.apiUrl}/permisos/${id}`,
      request
    );
  }

  deletePermiso(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/permisos/${id}`
    );
  }

  // ==================== MÓDULOS ====================

  getAllModulos(): Observable<ApiResponse<ModuloDto[]>> {
    return this.http.get<ApiResponse<ModuloDto[]>>(`${this.apiUrl}/modulos`);
  }

  getModuloById(id: string): Observable<ApiResponse<ModuloDto>> {
    return this.http.get<ApiResponse<ModuloDto>>(
      `${this.apiUrl}/modulos/${id}`
    );
  }

  createModulo(
    request: CreateModuloRequest
  ): Observable<ApiResponse<ModuloDto>> {
    return this.http.post<ApiResponse<ModuloDto>>(
      `${this.apiUrl}/modulos`,
      request
    );
  }

  updateModulo(
    id: string,
    request: UpdateModuloRequest
  ): Observable<ApiResponse<ModuloDto>> {
    return this.http.put<ApiResponse<ModuloDto>>(
      `${this.apiUrl}/modulos/${id}`,
      request
    );
  }

  deleteModulo(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/modulos/${id}`
    );
  }

  // ==================== USUARIOS ====================

  getAllUsuarios(): Observable<ApiResponse<UsuarioDto[]>> {
    return this.http.get<ApiResponse<UsuarioDto[]>>(`${this.apiUrl}/usuarios`);
  }

  searchUsuarios(
    request: SearchUsuariosRequest
  ): Observable<ApiResponse<SearchUsuariosResponse>> {
    return this.http.post<ApiResponse<SearchUsuariosResponse>>(
      `${this.apiUrl}/usuarios/search`,
      request
    );
  }

  createUsuario(
    request: CreateUsuarioRequest
  ): Observable<ApiResponse<UsuarioDto>> {
    return this.http.post<ApiResponse<UsuarioDto>>(
      `${this.apiUrl}/usuarios`,
      request
    );
  }

  updateUsuario(
    id: string,
    request: UpdateUsuarioRequest
  ): Observable<ApiResponse<UsuarioDto>> {
    return this.http.put<ApiResponse<UsuarioDto>>(
      `${this.apiUrl}/usuarios/${id}`,
      request
    );
  }

  deleteUsuario(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/usuarios/${id}`
    );
  }

  asignarRoles(request: AsignarRolesRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/usuarios/${request.usuarioId}/roles`,
      request.rolesIds
    );
  }

  // ==================== ASIGNACIÓN DE PERMISOS ====================

  asignarPermisosARol(
    rolId: string,
    moduloPermisosIds: string[]
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/roles/${rolId}/permisos`,
      moduloPermisosIds
    );
  }

  getPermisosDeRol(rolId: string): Observable<ApiResponse<ModuloPermisoDto[]>> {
    return this.http.get<ApiResponse<ModuloPermisoDto[]>>(
      `${this.apiUrl}/roles/${rolId}/permisos`
    );
  }

  getRolesWithPermisos(): Observable<ApiResponse<RolDto[]>> {
    return this.http.get<ApiResponse<RolDto[]>>(
      `${this.apiUrl}/roles-permisos`
    );
  }
}
