export interface RolDto {
  id: string;
  nombre: string;
  descripcion: string;
  fechaCreacion: Date;
  activo: boolean;
  usuariosAsignados: number;
  permisos: PermisoDto[];
}

export interface CreateRolRequest {
  nombre: string;
  descripcion?: string;
  activo: boolean;
  permisosIds: string[];
}

export interface UpdateRolRequest {
  nombre: string;
  descripcion?: string;
  activo: boolean;
  permisosIds: string[];
}

export interface PermisoDto {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  fechaCreacion: Date;
  activo: boolean;
}

export interface CreatePermisoRequest {
  nombre: string;
  descripcion?: string;
  tipo: string;
  activo: boolean;
}

export interface ModuloDto {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  orden: number;
  activo: boolean;
  permisos: ModuloPermisoDto[];
}

export interface ModuloPermisoDto {
  id: string;
  moduloId: string;
  permisoId: string;
  codigo: string;
  descripcion: string;
  permiso: PermisoDto;
}

export interface CreateModuloRequest {
  nombre: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  activo: boolean;
}

export interface UsuarioDto {
  id: string;
  nombre: string;
  apellidos?: string;
  email: string;
  rolId: string;
  rol: string; // Changed from RolDto to string to match backend
  fechaCreacion: Date;
  ultimoAcceso?: Date;
  activo: boolean;
  permisos: string[];
}

export interface CreateUsuarioRequest {
  nombre: string;
  apellidos?: string;
  email: string;
  rolId: string;
  activo: boolean;
  contrasena: string;
}

export interface UpdateUsuarioRequest {
  nombre: string;
  apellidos?: string;
  email: string;
  rolId: string;
  activo: boolean;
  nuevaContrasena?: string;
}

export interface UpdateModuloRequest {
  nombre: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  activo: boolean;
}

export interface AsignarPermisosRequest {
  rolId: string;
  moduloPermisosIds: string[];
}

export interface AsignarRolesRequest {
  usuarioId: string;
  rolesIds: string[];
}

export interface SearchUsuariosRequest {
  search?: string;
  rolId?: string;
  activo?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface SearchUsuariosResponse {
  usuarios: UsuarioDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export enum TipoPermiso {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
}

export interface AdminStatsDto {
  totalUsuarios: number;
  usuariosActivos: number;
  totalRoles: number;
  totalPermisos: number;
  totalModulos: number;
}
