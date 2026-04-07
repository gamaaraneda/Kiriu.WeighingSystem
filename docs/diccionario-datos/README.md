# Diccionario de Datos

---

| Campo              | Detalle                                      |
|--------------------|----------------------------------------------|
| **Proyecto**       | Kiriu Weighing System                        |
| **Versión**        | 1.0                                          |
| **Fecha**          | Abril 2026                                   |
| **Responsable**    | [Completar con información del proyecto]     |

---

## Introducción

Este documento describe las estructuras de datos del sistema **Kiriu Weighing System**, incluyendo las entidades principales, sus campos, tipos de dato, reglas de negocio asociadas y relaciones entre ellas.

Su propósito es servir como referencia técnica para actividades de soporte, mantenimiento, integración y continuidad del sistema. No sustituye al esquema físico de la base de datos, pero complementa su comprensión con contexto funcional.

Se documentan todas las entidades del dominio con relevancia operativa o de negocio. Las tablas de relación sin lógica propia se describen en la sección de relaciones.

---

## Vista general del modelo de datos

El modelo de datos se organiza en tres dominios principales:

| Dominio                   | Descripción                                                                 |
|---------------------------|-----------------------------------------------------------------------------|
| **Seguridad y acceso**    | Usuarios, roles, permisos, módulos, sesiones activas                       |
| **Operaciones de pesaje** | Operaciones, fotos, remolques (doble remolque) e historial de ediciones     |
| **Auditoría y control**   | Registro de auditoría del sistema y secuencia de folios                     |

En base de datos se utilizan dos esquemas:

- **`dbo`**: Tablas de seguridad, usuarios, auditoría y control.
- **`weighing`**: Tablas de operaciones de pesaje y sus entidades relacionadas.

El diseño favorece la trazabilidad completa: cada operación de pesaje registra quién la creó, quién registró la salida, si fue editada manualmente y quién realizó cada edición.

---

## Convenciones utilizadas

| Convención             | Detalle                                                                                  |
|------------------------|------------------------------------------------------------------------------------------|
| **Clave primaria**     | `Id` de tipo `GUID` (uniqueidentifier) en todas las entidades, excepto `AuditLogs` (`INT IDENTITY`) y `FolioSequence` (`INT`) |
| **Nomenclatura**       | Tablas en inglés (pesaje) y español (seguridad). Campos en camelCase o PascalCase según la entidad |
| **Fechas**             | Tipo `DATETIME2` en SQL Server. Se almacenan en UTC salvo indicación contraria            |
| **Textos obligatorios**| Indicados con `NOT NULL` en BD; el modelo de dominio los marca como `[Required]`         |
| **Longitudes máximas** | Definidas con `[MaxLength]` en el modelo de dominio; reflejadas en la BD como `NVARCHAR(n)` |
| **Campos de auditoría**| `CreatedAt` y `UpdatedAt` presentes en las entidades principales de pesaje               |
| **Borrado lógico**     | No existe eliminación física de operaciones. El campo `Activo` en usuarios y roles controla su estado |
| **Enumeraciones**      | No existen enumeraciones en BD; los valores de tipo catálogo se almacenan como `NVARCHAR` con valores controlados por la aplicación |

---

## Resumen de entidades principales

| Entidad / Tabla          | Esquema    | Descripción                                          | Relaciones principales                                         |
|--------------------------|------------|------------------------------------------------------|----------------------------------------------------------------|
| `Usuarios`               | dbo        | Cuentas de acceso al sistema                         | Pertenece a un `Rol`; tiene `UserSessions`                     |
| `Roles`                  | dbo        | Agrupaciones de permisos por función                 | Tiene muchos `Usuarios`; asignados a `RolePermisos`            |
| `Permisos`               | dbo        | Acciones permitidas (Create, Read, Update, Delete)   | Asociado a `ModuloPermisos`                                    |
| `Modulos`                | dbo        | Funcionalidades del sistema visibles por rol         | Asociado a `ModuloPermisos`                                    |
| `ModuloPermisos`         | dbo        | Combinaciones módulo–permiso con código único        | Relaciona `Modulos` y `Permisos`; asignada a `RolePermisos`    |
| `RolePermisos`           | dbo        | Asignación de permisos a roles                       | Relaciona `Roles` y `ModuloPermisos`                           |
| `UserSessions`           | dbo        | Sesiones activas para control de concurrencia        | Pertenece a un `Usuario`                                       |
| `WeighingOperations`     | weighing   | Registro principal de cada operación de pesaje       | Tiene `WeighingPhotos`, `WeighingRemolques`, `WeighingEditHistories` |
| `WeighingPhotos`         | weighing   | Imágenes asociadas a una operación                   | Pertenece a `WeighingOperations` (nullable durante captura)    |
| `WeighingRemolques`      | weighing   | Datos de cada remolque en operaciones dobles         | Pertenece a `WeighingOperations`                               |
| `WeighingEditHistories`  | weighing   | Historial de ediciones manuales de operaciones       | Pertenece a `WeighingOperations`                               |
| `AuditLogs`              | dbo        | Registro de auditoría de acciones del sistema        | Sin FK; referencia a recursos por texto                        |
| `FolioSequence`          | dbo        | Contador global para generación de folios            | Sin relaciones; tabla de un solo registro                      |
| `DatabaseVersions`       | dbo        | Control de migraciones aplicadas                     | Sin relaciones                                                 |

---

## Detalle por entidad

---

### Usuarios

**Descripción:** Cuentas de acceso de los operadores y administradores del sistema. Cada usuario tiene exactamente un rol asignado.

**Reglas de negocio:**
- El `Email` es el identificador funcional del usuario y se usa como referencia en registros de auditoría de pesaje.
- `PasswordHash` almacena la contraseña en formato hash; nunca en texto plano.
- Un usuario con `Activo = false` no puede autenticarse.
- Solo puede tener una sesión activa simultánea (controlada por `UserSessions`).

| Campo          | Tipo              | Descripción                                | Obligatorio | Llave | Valor por defecto | Observaciones                                       |
|----------------|-------------------|--------------------------------------------|-------------|-------|-------------------|-----------------------------------------------------|
| `Id`           | UNIQUEIDENTIFIER  | Identificador único del usuario            | Sí          | PK    | NEWID()           |                                                     |
| `Nombre`       | NVARCHAR(100)     | Nombre del usuario                         | Sí          | —     | —                 |                                                     |
| `Apellidos`    | NVARCHAR(100)     | Apellidos del usuario                      | No          | —     | NULL              |                                                     |
| `Email`        | NVARCHAR(255)     | Correo electrónico (login y referencia)    | Sí          | UK    | —                 | Debe ser único en la tabla                          |
| `PasswordHash` | NVARCHAR(255)     | Contraseña en formato hash                 | Sí          | —     | —                 | No almacenar en texto plano                         |
| `RolId`        | UNIQUEIDENTIFIER  | Rol asignado al usuario                    | Sí          | FK    | —                 | FK hacia `Roles.Id`                                 |
| `FechaCreacion`| DATETIME2         | Fecha de alta del usuario                  | Sí          | —     | GETUTCDATE()      |                                                     |
| `UltimoAcceso` | DATETIME2         | Última autenticación exitosa               | No          | —     | NULL              | Se actualiza al hacer login                         |
| `Activo`       | BIT               | Indica si la cuenta está habilitada        | Sí          | —     | 1                 | Borrado lógico: poner `Activo = 0` en lugar de eliminar |

---

### Roles

**Descripción:** Agrupaciones que concentran un conjunto de permisos. Todo usuario debe pertenecer a un rol.

**Reglas de negocio:**
- Un rol con `Activo = false` no debería asignarse a nuevos usuarios.
- Los permisos de un rol se definen mediante la tabla `RolePermisos`.

| Campo         | Tipo             | Descripción                         | Obligatorio | Llave | Valor por defecto | Observaciones                        |
|---------------|------------------|-------------------------------------|-------------|-------|-------------------|--------------------------------------|
| `Id`          | UNIQUEIDENTIFIER | Identificador único del rol         | Sí          | PK    | NEWID()           |                                      |
| `Nombre`      | NVARCHAR(50)     | Nombre del rol                      | Sí          | UK    | —                 | Debe ser único                       |
| `Descripcion` | NVARCHAR(255)    | Descripción del rol                 | No          | —     | ''                |                                      |
| `FechaCreacion`| DATETIME2       | Fecha de creación del rol           | Sí          | —     | GETUTCDATE()      |                                      |
| `Activo`      | BIT              | Estado del rol                      | Sí          | —     | 1                 |                                      |

---

### Permisos

**Descripción:** Catálogo de acciones que pueden habilitarse o restringirse por módulo y rol. Representan las capacidades del sistema (crear, leer, actualizar, eliminar, exportar, etc.).

| Campo         | Tipo             | Descripción                                          | Obligatorio | Llave | Valor por defecto | Observaciones                                               |
|---------------|------------------|------------------------------------------------------|-------------|-------|-------------------|-------------------------------------------------------------|
| `Id`          | UNIQUEIDENTIFIER | Identificador único del permiso                      | Sí          | PK    | NEWID()           |                                                             |
| `Nombre`      | NVARCHAR(50)     | Nombre descriptivo del permiso                       | Sí          | —     | —                 | Ej.: `Crear pesaje`, `Ver reportes`                         |
| `Descripcion` | NVARCHAR(255)    | Descripción del permiso                              | No          | —     | ''                |                                                             |
| `Tipo`        | NVARCHAR(20)     | Categoría de acción                                  | Sí          | —     | —                 | Valores: `CREATE`, `READ`, `UPDATE`, `DELETE`, `EXPORT`, etc. |
| `FechaCreacion`| DATETIME2       | Fecha de creación                                    | Sí          | —     | GETUTCDATE()      |                                                             |
| `Activo`      | BIT              | Estado del permiso                                   | Sí          | —     | 1                 |                                                             |

---

### Modulos

**Descripción:** Funcionalidades o secciones del sistema. Los módulos permiten agrupar permisos con una lógica funcional y controlan la navegación visible para cada rol.

| Campo         | Tipo             | Descripción                                   | Obligatorio | Llave | Valor por defecto | Observaciones                            |
|---------------|------------------|-----------------------------------------------|-------------|-------|-------------------|------------------------------------------|
| `Id`          | UNIQUEIDENTIFIER | Identificador único del módulo                | Sí          | PK    | NEWID()           |                                          |
| `Nombre`      | NVARCHAR(50)     | Nombre del módulo                             | Sí          | UK    | —                 | Ej.: `Pesaje`, `Usuarios`, `Reportes`    |
| `Descripcion` | NVARCHAR(255)    | Descripción funcional                         | No          | —     | ''                |                                          |
| `Icono`       | NVARCHAR(50)     | Identificador de icono en el frontend (PrimeIcons) | No     | —     | ''                | Ej.: `pi-scale`, `pi-users`              |
| `Orden`       | INT              | Orden de aparición en el menú de navegación   | Sí          | —     | 0                 |                                          |
| `Activo`      | BIT              | Estado del módulo                             | Sí          | —     | 1                 |                                          |

---

### ModuloPermisos

**Descripción:** Tabla de relación que representa la combinación válida de un módulo con un permiso. Cada combinación tiene un código único que es el que se evalúa en la autorización de endpoints.

**Reglas de negocio:**
- El `Codigo` es la clave de autorización. Los endpoints de la API validan permisos por código (ej.: `PESAJES.CREATE`, `USUARIOS.READ`).
- La combinación `ModuloId + PermisoId` debe ser única.

| Campo         | Tipo             | Descripción                                         | Obligatorio | Llave | Observaciones                              |
|---------------|------------------|-----------------------------------------------------|-------------|-------|--------------------------------------------|
| `Id`          | UNIQUEIDENTIFIER | Identificador único                                 | Sí          | PK    |                                            |
| `ModuloId`    | UNIQUEIDENTIFIER | Módulo al que pertenece el permiso                  | Sí          | FK    | FK hacia `Modulos.Id`                      |
| `PermisoId`   | UNIQUEIDENTIFIER | Tipo de permiso aplicado                            | Sí          | FK    | FK hacia `Permisos.Id`                     |
| `Codigo`      | NVARCHAR(100)    | Código de autorización evaluado en la API           | Sí          | UK    | Ej.: `PESAJES.CREATE`, `REPORTES.EXPORT`   |
| `Descripcion` | NVARCHAR(255)    | Descripción legible del permiso-módulo              | No          | —     |                                            |

---

### RolePermisos

**Descripción:** Tabla de relación que asigna permisos específicos (combinación módulo–permiso) a un rol determinado.

| Campo            | Tipo             | Descripción                              | Obligatorio | Llave | Observaciones                          |
|------------------|------------------|------------------------------------------|-------------|-------|----------------------------------------|
| `RolId`          | UNIQUEIDENTIFIER | Rol al que se asigna el permiso          | Sí          | PK/FK | FK hacia `Roles.Id`                    |
| `ModuloPermisoId`| UNIQUEIDENTIFIER | Permiso-módulo asignado                  | Sí          | PK/FK | FK hacia `ModuloPermisos.Id`           |
| `FechaAsignacion`| DATETIME2        | Fecha en que se realizó la asignación    | Sí          | —     | Se registra automáticamente            |

> La clave primaria es compuesta: `(RolId, ModuloPermisoId)`.

---

### UserSessions

**Descripción:** Registro de sesiones activas de usuario. Permite implementar el control de sesiones concurrentes: solo se permite una sesión activa por usuario en cualquier momento.

**Reglas de negocio:**
- Al iniciar sesión, si ya existe una sesión activa para el usuario, la sesión anterior se revoca automáticamente.
- El `TokenJti` (JWT ID) vincula el registro de sesión con el token JWT emitido.
- Una sesión puede ser revocada explícitamente (logout) o expirar por tiempo.

| Campo              | Tipo             | Descripción                                      | Obligatorio | Llave | Observaciones                                  |
|--------------------|------------------|--------------------------------------------------|-------------|-------|------------------------------------------------|
| `Id`               | UNIQUEIDENTIFIER | Identificador único de la sesión                 | Sí          | PK    |                                                |
| `UserId`           | UNIQUEIDENTIFIER | Usuario propietario de la sesión                 | Sí          | FK    | FK hacia `Usuarios.Id`                         |
| `TokenJti`         | NVARCHAR(100)    | JWT ID del token emitido                         | Sí          | UK    | Identificador único del JWT                    |
| `RefreshToken`     | NVARCHAR(500)    | Token de renovación                              | Sí          | —     | Usado para emitir nuevos access tokens         |
| `DeviceInfo`       | NVARCHAR(500)    | User-Agent del cliente                           | No          | —     |                                                |
| `IpAddress`        | NVARCHAR(45)     | IP desde donde se inició sesión                  | No          | —     | Soporta IPv6 (hasta 45 caracteres)             |
| `CreatedAt`        | DATETIME2        | Fecha de creación de la sesión                   | Sí          | —     | UTC                                            |
| `ExpiresAt`        | DATETIME2        | Fecha de expiración de la sesión                 | Sí          | —     | Basado en `RefreshTokenExpirationInDays`        |
| `RevokedAt`        | DATETIME2        | Fecha de revocación (si fue revocada)            | No          | —     | NULL si la sesión está activa                  |
| `IsActive`         | BIT              | Indica si la sesión está actualmente activa      | Sí          | —     | Se pone en `0` al revocar o expirar            |
| `RevocationReason` | NVARCHAR(200)    | Motivo de revocación                             | No          | —     | Ej.: `logout`, `new_session`, `expired`        |

---

### WeighingOperations

**Descripción:** Entidad central del sistema. Representa cada operación de pesaje desde el registro de entrada hasta el cierre con la salida. Agrupa toda la información del vehículo, carga, pesos y trazabilidad del proceso.

**Reglas de negocio:**
- El `Folio` es el identificador funcional de la operación, generado en forma secuencial desde `FolioSequence`. Es único e inmutable.
- `Status` controla el ciclo de vida: `ENTRADA_REGISTRADA` → `SALIDA_REGISTRADA`.
- `NetWeight` se calcula al momento del registro de salida como diferencia entre `EntryWeight` y `ExitWeight`.
- `FueEditado` se activa si algún dato de la operación fue modificado manualmente después de su registro; se registra `FechaUltimaEdicion` y `UsuarioEditor`.
- Los campos `TrailerPlate2`, `PlacaRemolque1`, `PlacaRemolque2`, `TrailerPlateContenedor` y `RemolquePlateContenedor` aplican según el `TipoUnidad` de la operación.

| Campo                    | Tipo              | Descripción                                               | Obligatorio | Llave | Valor por defecto | Observaciones                                                          |
|--------------------------|-------------------|-----------------------------------------------------------|-------------|-------|-------------------|------------------------------------------------------------------------|
| `Id`                     | UNIQUEIDENTIFIER  | Identificador único de la operación                       | Sí          | PK    | NEWID()           |                                                                        |
| `Folio`                  | NVARCHAR(50)      | Identificador funcional de la operación                   | Sí          | UK    | —                 | Generado por `FolioSequence`; único e inmutable                        |
| `UnitType`               | NVARCHAR(20)      | Tipo de unidad: cliente o proveedor                       | Sí          | —     | —                 | Valores: `client`, `provider`                                          |
| `OperationType`          | NVARCHAR(20)      | Tipo de operación (siempre `entry` al crear)              | Sí          | —     | —                 | Valores: `entry`, `exit`                                               |
| `TipoUnidad`             | NVARCHAR(30)      | Tipo de vehículo o configuración de carga                 | Sí          | —     | —                 | Valores: `remolque`, `contenedor`, `doble-remolque`                    |
| `TrailerPlate`           | NVARCHAR(20)      | Placa principal del tráiler o unidad                      | No          | —     | NULL              |                                                                        |
| `TrailerPlate2`          | NVARCHAR(20)      | Segunda placa del tráiler (doble remolque)                | No          | —     | NULL              | Solo aplica en `TipoUnidad = doble-remolque`                           |
| `TrailerPlateContenedor` | NVARCHAR(20)      | Placa del contenedor (tracto)                             | No          | —     | NULL              | Solo aplica en `TipoUnidad = contenedor`                               |
| `RemolquePlateContenedor`| NVARCHAR(20)      | Placa del remolque portacontenedor                        | No          | —     | NULL              |                                                                        |
| `PlacaRemolque1`         | NVARCHAR(20)      | Placa del primer remolque en operación doble              | No          | —     | NULL              |                                                                        |
| `PlacaRemolque2`         | NVARCHAR(20)      | Placa del segundo remolque en operación doble             | No          | —     | NULL              |                                                                        |
| `Product`                | NVARCHAR(100)     | Producto o mercancía transportada                         | Sí          | —     | —                 |                                                                        |
| `ClientProviderName`     | NVARCHAR(200)     | Nombre del cliente o proveedor                            | Sí          | —     | —                 |                                                                        |
| `ClientProviderRfc`      | NVARCHAR(50)      | RFC del cliente o proveedor                               | No          | —     | NULL              |                                                                        |
| `EntryWeight`            | DECIMAL           | Peso capturado en la entrada (kg)                         | No          | —     | NULL              | Se captura al registrar la entrada                                     |
| `ExitWeight`             | DECIMAL           | Peso capturado en la salida (kg)                          | No          | —     | NULL              | Se captura al registrar la salida                                      |
| `NetWeight`              | DECIMAL           | Peso neto calculado (kg)                                  | No          | —     | NULL              | `EntryWeight - ExitWeight`; se calcula al cerrar la operación          |
| `Status`                 | NVARCHAR(30)      | Estado actual de la operación                             | Sí          | —     | —                 | Valores: `ENTRADA_REGISTRADA`, `SALIDA_REGISTRADA`                     |
| `EntryDate`              | DATETIME2         | Fecha y hora del registro de entrada                      | No          | —     | NULL              | UTC                                                                    |
| `ExitDate`               | DATETIME2         | Fecha y hora del registro de salida                       | No          | —     | NULL              | UTC                                                                    |
| `CreatedAt`              | DATETIME2         | Fecha de creación del registro                            | Sí          | —     | GETUTCDATE()      | UTC                                                                    |
| `UpdatedAt`              | DATETIME2         | Fecha de última modificación del registro                 | Sí          | —     | GETUTCDATE()      | UTC                                                                    |
| `CreatedBy`              | NVARCHAR(255)     | Email del usuario que registró la entrada                 | No          | —     | NULL              | Tomado del token JWT al momento del registro                           |
| `ExitRegisteredBy`       | NVARCHAR(255)     | Email del usuario que registró la salida                  | No          | —     | NULL              | Tomado del token JWT al momento del cierre                             |
| `FueEditado`             | BIT               | Indica si hubo edición manual posterior al registro       | Sí          | —     | 0                 |                                                                        |
| `FechaUltimaEdicion`     | DATETIME2         | Fecha de la última edición manual                         | No          | —     | NULL              |                                                                        |
| `UsuarioEditor`          | NVARCHAR(100)     | Email del usuario que realizó la última edición manual    | No          | —     | NULL              |                                                                        |

---

### WeighingPhotos

**Descripción:** Almacena las imágenes capturadas durante una operación de pesaje. Cada foto está tipificada según el elemento fotografiado (placa del tráiler, estado de la carga, remolque, etc.).

**Reglas de negocio:**
- `WeighingOperationId` puede ser `NULL` temporalmente. Las fotos capturadas antes de que se complete el registro de la operación se denominan "fotos huérfanas" y se asocian a la operación en un paso posterior.
- Las fotos huérfanas con más de `OrphanPhotoMaxAgeMinutes` minutos (configurado en 10 minutos) son descartadas.
- `ImageData` almacena los bytes de la imagen comprimida directamente en la base de datos.

| Campo              | Tipo             | Descripción                                                  | Obligatorio | Llave | Valor por defecto | Observaciones                                                            |
|--------------------|------------------|--------------------------------------------------------------|-------------|-------|-------------------|--------------------------------------------------------------------------|
| `Id`               | UNIQUEIDENTIFIER | Identificador único de la foto                               | Sí          | PK    | NEWID()           |                                                                          |
| `WeighingOperationId` | UNIQUEIDENTIFIER | Operación de pesaje a la que pertenece la foto            | No          | FK    | NULL              | FK hacia `WeighingOperations.Id`; nullable durante captura inicial       |
| `PhotoType`        | NVARCHAR(50)     | Tipo inicial de la foto al momento de captura                | Sí          | —     | —                 | Ej.: `trailerPlate`, `cargo`, `remolque1Plate`                           |
| `FinalPhotoType`   | NVARCHAR(50)     | Tipo final de la foto después de procesar la operación       | No          | —     | NULL              | Puede diferir de `PhotoType` si ocurrieron inversiones de asignación     |
| `PhotoUrl`         | NVARCHAR(500)    | Ruta relativa del archivo en el servidor                     | Sí          | —     | —                 | Ruta dentro de `wwwroot/uploads/`                                        |
| `ImageData`        | VARBINARY(MAX)   | Bytes de la imagen comprimida                                | No          | —     | NULL              | Almacenada en BD tras compresión (máx. 1280px, calidad 75)               |
| `ContentType`      | NVARCHAR(50)     | Tipo MIME de la imagen                                       | No          | —     | NULL              | Ej.: `image/jpeg`                                                        |
| `Description`      | NVARCHAR(200)    | Descripción adicional de la foto                             | No          | —     | NULL              |                                                                          |
| `CreatedAt`        | DATETIME2        | Fecha y hora de captura de la imagen                         | Sí          | —     | GETUTCDATE()      | UTC                                                                      |

---

### WeighingRemolques

**Descripción:** Entidad que almacena la información de cada remolque individual en operaciones de tipo doble remolque. Cada operación de este tipo puede tener dos registros: uno por cada remolque.

**Reglas de negocio:**
- `Numero` identifica si es el primer o segundo remolque dentro de la operación (valores: `1` o `2`).
- `Estado` controla el ciclo de vida del remolque individual: `PENDIENTE` → `REGISTRADO`.
- El proceso de salida en doble remolque permite registrar cada remolque en momentos distintos.

| Campo               | Tipo             | Descripción                                              | Obligatorio | Llave | Valor por defecto | Observaciones                                           |
|---------------------|------------------|----------------------------------------------------------|-------------|-------|-------------------|---------------------------------------------------------|
| `Id`                | UNIQUEIDENTIFIER | Identificador único del remolque                         | Sí          | PK    | NEWID()           |                                                         |
| `WeighingOperationId`| UNIQUEIDENTIFIER| Operación de pesaje a la que pertenece                   | Sí          | FK    | —                 | FK hacia `WeighingOperations.Id`                        |
| `Numero`            | INT              | Número de remolque dentro de la operación                | Sí          | —     | —                 | Valores: `1` o `2`                                      |
| `Placa`             | NVARCHAR(20)     | Placa del remolque                                       | Sí          | —     | —                 |                                                         |
| `PesoBruto`         | DECIMAL          | Peso bruto del remolque (kg)                             | Sí          | —     | 0                 |                                                         |
| `PesoTara`          | DECIMAL          | Peso tara del remolque (kg)                              | No          | —     | NULL              |                                                         |
| `PesoCapturado`     | BIT              | Indica si el peso fue capturado exitosamente             | Sí          | —     | 0                 |                                                         |
| `FotosCapturadas`   | BIT              | Indica si todas las fotos fueron capturadas              | Sí          | —     | 0                 |                                                         |
| `FotoCargaCapturada`| BIT              | Indica si la foto de carga fue capturada                 | Sí          | —     | 0                 |                                                         |
| `FotoPlacaCapturada`| BIT              | Indica si la foto de placa fue capturada                 | Sí          | —     | 0                 |                                                         |
| `Estado`            | NVARCHAR(30)     | Estado del remolque dentro del proceso de salida         | Sí          | —     | `PENDIENTE`       | Valores: `PENDIENTE`, `REGISTRADO`                      |
| `RegistradoPor`     | NVARCHAR(255)    | Email del usuario que registró el remolque               | No          | —     | NULL              |                                                         |
| `FechaRegistro`     | DATETIME2        | Fecha y hora del registro del remolque                   | No          | —     | NULL              | UTC                                                     |
| `FechaSalida`       | DATETIME2        | Fecha y hora del registro de salida de este remolque     | No          | —     | NULL              | UTC; aplica en salidas en partes                        |
| `RegistradoPorSalida`| NVARCHAR(255)   | Email del usuario que registró la salida del remolque    | No          | —     | NULL              |                                                         |
| `CreatedAt`         | DATETIME2        | Fecha de creación del registro                           | Sí          | —     | GETUTCDATE()      | UTC                                                     |
| `UpdatedAt`         | DATETIME2        | Fecha de última modificación                             | Sí          | —     | GETUTCDATE()      | UTC                                                     |

---

### WeighingEditHistories

**Descripción:** Historial de ediciones manuales realizadas sobre una operación de pesaje. Cada vez que un operador modifica datos de una operación ya registrada, se genera un registro en esta tabla con los valores previos.

**Reglas de negocio:**
- Solo los campos modificables (placas, datos del cliente, producto) pueden editarse manualmente.
- Toda edición requiere una justificación obligatoria de máximo 70 caracteres.
- `ValoresOriginales` contiene un JSON con los valores antes de la modificación.

| Campo                | Tipo             | Descripción                                            | Obligatorio | Llave | Observaciones                                               |
|----------------------|------------------|--------------------------------------------------------|-------------|-------|-------------------------------------------------------------|
| `Id`                 | UNIQUEIDENTIFIER | Identificador único del registro de edición            | Sí          | PK    |                                                             |
| `WeighingOperationId`| UNIQUEIDENTIFIER | Operación editada                                      | Sí          | FK    | FK hacia `WeighingOperations.Id`                            |
| `Justificacion`      | NVARCHAR(70)     | Motivo de la edición manual                            | Sí          | —     | Máximo 70 caracteres; requerido para toda edición           |
| `ValoresOriginales`  | NVARCHAR(MAX)    | JSON con los valores previos a la edición              | Sí          | —     | Permite reconstruir el estado anterior de la operación      |
| `FechaEdicion`       | DATETIME2        | Fecha y hora en que se realizó la edición              | Sí          | —     | UTC; valor predeterminado: `GETUTCDATE()`                   |
| `UsuarioEditor`      | NVARCHAR(255)    | Email del usuario que realizó la edición               | No          | —     | Tomado del token JWT                                        |

---

### AuditLogs

**Descripción:** Tabla de auditoría del sistema. Registra acciones relevantes realizadas por los usuarios: creación, modificación y eliminación de recursos, así como eventos de autenticación.

**Reglas de negocio:**
- Los registros de auditoría son de solo inserción. No se modifican ni eliminan.
- `Operacion` distingue entre `CREATE`, `UPDATE` y `DELETE`.
- `Payload` puede contener el cuerpo del request (sin datos sensibles como contraseñas).

| Campo          | Tipo           | Descripción                                                      | Obligatorio | Llave | Observaciones                                          |
|----------------|----------------|------------------------------------------------------------------|-------------|-------|--------------------------------------------------------|
| `Id`           | INT IDENTITY   | Identificador secuencial del registro                            | Sí          | PK    | Autoincremental; no GUID                               |
| `UsuarioId`    | NVARCHAR(100)  | ID del usuario que realizó la operación                          | Sí          | —     | Extraído del token JWT                                 |
| `NombreUsuario`| NVARCHAR(200)  | Nombre legible del usuario                                       | No          | —     | Para facilitar lecturas directas en la tabla           |
| `Operacion`    | NVARCHAR(10)   | Tipo de operación                                                | Sí          | —     | Valores: `CREATE`, `UPDATE`, `DELETE`                  |
| `Recurso`      | NVARCHAR(100)  | Tabla o recurso afectado                                         | Sí          | —     | Ej.: `WeighingOperation`, `Usuario`                    |
| `RegistroId`   | NVARCHAR(50)   | ID del registro modificado                                       | No          | —     | Referencia textual sin FK                              |
| `Timestamp`    | DATETIME2      | Fecha y hora exacta de la operación                              | Sí          | —     | UTC; valor predeterminado: `GETUTCDATE()`              |
| `Payload`      | NVARCHAR(MAX)  | JSON del request (sin datos sensibles)                           | No          | —     |                                                        |
| `IpOrigen`     | NVARCHAR(45)   | Dirección IP del cliente que realizó la solicitud                | No          | —     | Soporta IPv6                                           |
| `Resultado`    | NVARCHAR(20)   | Resultado de la operación                                        | Sí          | —     | Siempre `success` en esta tabla                        |
| `Detalles`     | NVARCHAR(500)  | Información adicional sobre la operación                         | No          | —     |                                                        |
| `MetodoHttp`   | NVARCHAR(10)   | Método HTTP utilizado                                            | No          | —     | Ej.: `POST`, `PUT`, `DELETE`                           |
| `RutaApi`      | NVARCHAR(200)  | Endpoint de la API invocado                                      | No          | —     | Ej.: `/api/weighing/entry`                             |
| `Dispositivo`  | NVARCHAR(200)  | User-Agent del cliente                                           | No          | —     |                                                        |

---

### FolioSequence

**Descripción:** Tabla de control con un único registro que mantiene el consecutivo global para la generación de folios de operación. El folio generado sigue el formato definido por la aplicación a partir de este contador.

**Reglas de negocio:**
- Esta tabla debe contener **exactamente un registro** con `Id = 1`.
- `CurrentSequence` se incrementa con bloqueo pesimista para garantizar unicidad del folio incluso bajo carga concurrente.
- No debe modificarse manualmente salvo en caso de recuperación controlada.

| Campo             | Tipo      | Descripción                                        | Obligatorio | Llave | Valor por defecto |
|-------------------|-----------|----------------------------------------------------|-------------|-------|-------------------|
| `Id`              | INT       | Siempre igual a `1`; registro único                | Sí          | PK    | 1                 |
| `CurrentSequence` | BIGINT    | Valor actual del consecutivo de folios             | Sí          | —     | 0                 |
| `UpdatedAt`       | DATETIME2 | Fecha de la última actualización del consecutivo   | Sí          | —     | GETUTCDATE()      |

---

### DatabaseVersions

**Descripción:** Tabla de control de migraciones aplicadas. Registra qué versiones del script de migración se han ejecutado sobre la base de datos.

| Campo          | Tipo           | Descripción                                  | Obligatorio | Llave |
|----------------|----------------|----------------------------------------------|-------------|-------|
| `Id`           | INT IDENTITY   | Identificador del registro                   | Sí          | PK    |
| `Version`      | INT            | Número de versión de la migración            | Sí          | UK    |
| `Description`  | NVARCHAR(255)  | Descripción de lo que aplica la migración    | Sí          | —     |
| `AppliedDate`  | DATETIME2      | Fecha en que se aplicó la migración          | Sí          | —     |
| `ScriptName`   | NVARCHAR(100)  | Nombre del script que generó la migración    | Sí          | —     |

---

## Relaciones entre entidades

```
Usuarios ──────────── (N:1) ──── Roles
Usuarios ──────────── (1:N) ──── UserSessions
Roles ──────────────── (1:N) ──── RolePermisos
RolePermisos ────────── (N:1) ──── ModuloPermisos
ModuloPermisos ────── (N:1) ──── Modulos
ModuloPermisos ────── (N:1) ──── Permisos

WeighingOperations ── (1:N) ──── WeighingPhotos
WeighingOperations ── (1:N) ──── WeighingRemolques
WeighingOperations ── (1:N) ──── WeighingEditHistories
```

| Relación                                       | Cardinalidad | Impacto funcional                                                                   |
|------------------------------------------------|--------------|-------------------------------------------------------------------------------------|
| `Usuarios` → `Roles`                           | N:1          | Un usuario pertenece a un único rol; un rol puede tener múltiples usuarios          |
| `Roles` → `RolePermisos` → `ModuloPermisos`   | N:M          | Define qué puede hacer cada rol en cada módulo                                      |
| `ModuloPermisos` → `Modulos` y `Permisos`      | N:1 c/u      | Cada permiso-módulo referencia un módulo y un tipo de permiso del catálogo          |
| `Usuarios` → `UserSessions`                    | 1:N          | Un usuario puede tener múltiples registros históricos de sesión, pero solo uno activo |
| `WeighingOperations` → `WeighingPhotos`        | 1:N          | Una operación puede tener múltiples fotos de distintos tipos                        |
| `WeighingOperations` → `WeighingRemolques`     | 1:N (máx. 2) | Solo aplica en operaciones de tipo `doble-remolque`                                 |
| `WeighingOperations` → `WeighingEditHistories` | 1:N          | Cada edición manual genera un nuevo registro histórico                              |

---

## Catálogos y tablas de referencia

Los valores de tipo enumerado no están en tablas catálogo separadas; se controlan a nivel de aplicación. Los valores conocidos son:

### Valores de `WeighingOperations.UnitType`

| Valor      | Descripción                |
|------------|----------------------------|
| `client`   | Unidad del cliente         |
| `provider` | Unidad del proveedor       |

### Valores de `WeighingOperations.TipoUnidad`

| Valor            | Descripción                                        |
|------------------|----------------------------------------------------|
| `remolque`       | Operación con un solo tráiler o remolque           |
| `contenedor`     | Operación con contenedor ISO                       |
| `doble-remolque` | Operación con dos remolques independientes         |

### Valores de `WeighingOperations.Status`

| Valor                 | Descripción                                                |
|-----------------------|------------------------------------------------------------|
| `ENTRADA_REGISTRADA`  | La entrada fue registrada; pendiente de salida             |
| `SALIDA_REGISTRADA`   | La salida fue registrada; operación completada             |

### Valores de `WeighingRemolques.Estado`

| Valor        | Descripción                                              |
|--------------|----------------------------------------------------------|
| `PENDIENTE`  | El remolque aún no ha sido pesado en salida              |
| `REGISTRADO` | El remolque fue pesado y su salida fue registrada        |

### Valores de `Permisos.Tipo`

| Valor    | Descripción                                   |
|----------|-----------------------------------------------|
| `CREATE` | Creación de registros                         |
| `READ`   | Consulta de registros                         |
| `UPDATE` | Modificación de registros                     |
| `DELETE` | Eliminación de registros                      |
| `EXPORT` | Exportación de información (Excel, PDF)       |

### Ejemplo de códigos en `ModuloPermisos.Codigo`

| Código              | Significado                                      |
|---------------------|--------------------------------------------------|
| `PESAJES.CREATE`    | Crear operaciones de pesaje                      |
| `PESAJES.READ`      | Consultar operaciones de pesaje                  |
| `PESAJES.UPDATE`    | Editar operaciones de pesaje                     |
| `USUARIOS.READ`     | Consultar usuarios                               |
| `REPORTES.EXPORT`   | Exportar reportes a Excel o PDF                  |

---

## Reglas de integridad y validación

| Regla                                                      | Entidad                    | Detalle                                                                          |
|------------------------------------------------------------|----------------------------|----------------------------------------------------------------------------------|
| Unicidad de `Email`                                        | `Usuarios`                 | No pueden existir dos usuarios con el mismo correo electrónico                   |
| Unicidad de `Folio`                                        | `WeighingOperations`       | El folio es único en toda la tabla; generado con bloqueo desde `FolioSequence`   |
| Unicidad de `TokenJti`                                     | `UserSessions`             | Cada JWT emitido tiene un JTI único                                              |
| Unicidad de `Codigo`                                       | `ModuloPermisos`           | El código de autorización es único en la tabla                                   |
| Unicidad de `(ModuloId, PermisoId)`                        | `ModuloPermisos`           | Una combinación módulo–permiso no puede repetirse                                |
| Unicidad de `(RolId, ModuloPermisoId)`                     | `RolePermisos`             | No puede asignarse el mismo permiso dos veces al mismo rol                       |
| `WeighingPhotos.WeighingOperationId` nullable              | `WeighingPhotos`           | Las fotos pueden existir sin operación asociada durante la captura               |
| `FolioSequence` siempre tiene un solo registro             | `FolioSequence`            | `Id = 1` siempre; no insertar registros adicionales                              |
| Justificación obligatoria en ediciones                     | `WeighingEditHistories`    | Toda edición manual debe registrar una justificación de máximo 70 caracteres     |
| Solo una sesión activa por usuario                         | `UserSessions`             | Al crear una sesión nueva, la sesión previa activa se revoca automáticamente     |

---

## Auditoría e historial

El sistema implementa auditoría en dos niveles:

### Nivel de operación (dentro de `WeighingOperations`)

Cada operación registra directamente quién la creó y quién registró la salida:
- `CreatedBy`: email del operador de entrada.
- `ExitRegisteredBy`: email del operador de salida.
- `FueEditado`, `FechaUltimaEdicion`, `UsuarioEditor`: trazabilidad de modificaciones manuales.

### Nivel de historial de ediciones (`WeighingEditHistories`)

Cada edición manual genera un registro completo con:
- Los valores previos en formato JSON (`ValoresOriginales`).
- La justificación del cambio.
- El usuario que realizó la edición y la fecha exacta.

### Nivel de sistema (`AuditLogs`)

La tabla `AuditLogs` registra acciones a nivel de API para todos los recursos del sistema. Es de solo inserción y contiene IP de origen, endpoint, método HTTP y payload (sin datos sensibles).

### Campos comunes de trazabilidad temporal

| Campo       | Entidades que lo tienen                                          | Descripción                        |
|-------------|------------------------------------------------------------------|------------------------------------|
| `CreatedAt` | `Usuarios`, `Roles`, `Permisos`, `WeighingOperations`, `WeighingPhotos`, `WeighingRemolques`, `UserSessions` | Fecha de creación del registro |
| `UpdatedAt` | `WeighingOperations`, `WeighingRemolques`, `FolioSequence`       | Fecha de última actualización      |
| `Activo`    | `Usuarios`, `Roles`, `Permisos`, `Modulos`                       | Borrado lógico                     |

---

## Consideraciones de rendimiento

| Tabla                  | Campo(s) de búsqueda frecuente      | Observación                                                                                  |
|------------------------|-------------------------------------|----------------------------------------------------------------------------------------------|
| `WeighingOperations`   | `Folio`, `Status`, `EntryDate`      | Las consultas de operaciones se filtran habitualmente por fecha y estado                      |
| `WeighingPhotos`       | `WeighingOperationId`, `PhotoType`  | Puede contener volúmenes altos por almacenamiento de imágenes binarias en `ImageData`         |
| `WeighingPhotos`       | `ImageData`                         | Se recomienda compresión de página habilitada en SQL Server para esta tabla (`PAGE` compression) |
| `AuditLogs`            | `UsuarioId`, `Timestamp`, `Recurso` | Tabla de solo inserción con crecimiento constante; evaluar archivado periódico                |
| `UserSessions`         | `UserId`, `IsActive`                | Consultas frecuentes para validar sesión activa; índice recomendado sobre `(UserId, IsActive)` |
| `FolioSequence`        | `Id = 1`                            | Acceso con bloqueo pesimista; tabla de un solo registro, impacto mínimo                       |

> La tabla `WeighingPhotos` tiene habilitada compresión de página en SQL Server para reducir el impacto del almacenamiento binario de imágenes.

---

## Consideraciones finales

El modelo de datos de **Kiriu Weighing System** refleja con precisión el ciclo de vida de las operaciones de pesaje vehicular. Las entidades del dominio de pesaje (`WeighingOperations`, `WeighingPhotos`, `WeighingRemolques`, `WeighingEditHistories`) están diseñadas para garantizar trazabilidad completa: quién hizo qué, cuándo y en qué condiciones.

El sistema de seguridad (`Usuarios`, `Roles`, `Permisos`, `Modulos`, `ModuloPermisos`, `RolePermisos`) implementa un control de acceso granular basado en códigos de permiso por módulo, permitiendo configurar con precisión qué puede hacer cada rol en cada funcionalidad.

La auditoría está implementada en múltiples capas: campos embebidos en las operaciones, historial de ediciones manuales con snapshot de valores previos y tabla de auditoría de sistema para todas las acciones de la API.

---

## Documentos relacionados

| Documento                        | Propósito                                                                                       | Referencia                              |
|----------------------------------|-------------------------------------------------------------------------------------------------|-----------------------------------------|
| Arquitectura de la Solución      | Descripción de componentes, capas y tecnologías; contexto técnico del modelo de datos           | `docs/arquitectura/README.md`           |
| Guía de Instalación y Despliegue | Scripts de migración que crean y mantienen el esquema físico descrito en este diccionario       | `docs/instalacion/README.md`            |
| Manual Operativo / Guía de Uso   | Flujos funcionales que generan y consumen los datos documentados aquí                           | `docs/manual-operativo/README.md`       |
| README de Entrega                | Estado de entrega y recomendaciones para continuidad del sistema                                | `docs/entrega/README.md`                |

---

## Pendientes o supuestos

- [ ] Confirmar si existen índices adicionales definidos directamente en SQL Server fuera del modelo de EF Core.
- [ ] Confirmar el formato exacto del `Folio` generado (prefijo, longitud, relleno de ceros, etc.).
- [ ] Confirmar si la tabla `WeighingPhotos` almacena tanto la ruta en disco (`PhotoUrl`) como el binario en BD (`ImageData`) simultáneamente, o si son mutuamente excluyentes.
- [ ] Confirmar si existen datos semilla predefinidos para los catálogos de `Modulos`, `Permisos` y `Roles` que deba documentarse en este diccionario.
- [ ] Confirmar si la estrategia de archivado o purga de `AuditLogs` ha sido definida para producción.
