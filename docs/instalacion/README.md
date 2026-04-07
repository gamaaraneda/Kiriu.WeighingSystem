# Guía de Instalación y Despliegue

---

| Campo              | Detalle                                      |
|--------------------|----------------------------------------------|
| **Proyecto**       | Kiriu Weighing System                        |
| **Versión**        | 1.0                                          |
| **Fecha**          | Abril 2026                                   |
| **Responsable**    | [Completar con información del proyecto]     |

---

## Introducción

Este documento describe el proceso completo para instalar, configurar y desplegar la solución **Kiriu Weighing System** en un ambiente objetivo. Cubre tanto la ejecución local en entorno de desarrollo como el despliegue en servidores de QA y producción.

La guía está dirigida a técnicos de infraestructura o desarrolladores responsables del handoff e instalación del sistema en sitio. Se asume familiaridad básica con servidores Windows, IIS y SQL Server.

---

## Vista general

La solución se compone de cuatro elementos desplegables que deben instalarse en el siguiente orden:

1. **Base de datos** — SQL Server con el esquema y datos iniciales del sistema.
2. **API Backend** — Servicio .NET 8 alojado en IIS, núcleo de la lógica del sistema.
3. **Frontend Angular** — Archivos estáticos servidos desde IIS, integrados con la API.
4. **SerialGateway** — Servicio auxiliar independiente en la máquina de operación con acceso al puerto serial de la báscula.

Las cámaras IP (ANPR y captura de imágenes) son dispositivos externos que deben estar accesibles desde la red del servidor; no requieren instalación de software adicional.

---

## Prerrequisitos

### Servidor de aplicación (API + Frontend)

| Requisito                      | Versión mínima    | Propósito                                    | Obligatorio | Observaciones                                      |
|--------------------------------|-------------------|----------------------------------------------|-------------|----------------------------------------------------|
| Windows Server                 | 2019 o superior   | Sistema operativo del servidor               | Sí          |                                                    |
| IIS                            | 10                | Servidor web para hospedar API y frontend    | Sí          | Habilitar módulo ASP.NET Core Hosting Bundle       |
| .NET 8 Runtime (Hosting Bundle) | 8.x              | Ejecución de la API y SerialGateway          | Sí          | Descargar desde microsoft.com/dotnet               |
| Node.js                        | 20 LTS            | Solo requerido para compilar el frontend     | Sí (build)  | No necesario en servidor de producción si se usa dist ya compilado |
| SQL Server                     | 2019 o superior   | Motor de base de datos                       | Sí          | Express Edition es suficiente para instalaciones pequeñas |
| SQL Server Management Studio   | Cualquiera        | Ejecución de scripts de migración            | Recomendado |                                                    |
| Acceso a red hacia cámaras IP  | —                 | Comunicación con cámaras ANPR y de captura   | Sí          | Verificar apertura de puertos si hay firewall      |

### Equipo de operación (SerialGateway)

| Requisito              | Versión mínima | Propósito                                       | Obligatorio | Observaciones                                        |
|------------------------|----------------|-------------------------------------------------|-------------|------------------------------------------------------|
| Windows 10/11 o Server | —              | Sistema operativo                               | Sí          |                                                      |
| .NET 8 Runtime         | 8.x            | Ejecución del SerialGateway                     | Sí          |                                                      |
| Puerto COM disponible  | —              | Conexión física con la báscula                  | Sí          | Predeterminado: COM4; configurable en appsettings    |
| Cable serial / USB-RS232 | —            | Interfaz física hacia la báscula                | Sí          | Verificar driver del adaptador si aplica             |
| Acceso de red al servidor de API | —      | El gateway debe ser accesible desde la API      | Sí          | Puerto 5080 debe estar abierto en el firewall local  |

---

## Estructura de la solución

```
Kiriu.WeighingSystem/
├── src/
│   ├── backend/
│   │   ├── Kiriu.WeighingSystem.Api/           ← API principal (publicar y desplegar en IIS)
│   │   ├── Kiriu.WeighingSystem.Application/   ← Lógica de negocio (referenciado por API)
│   │   ├── Kiriu.WeighingSystem.Domain/        ← Entidades (referenciado por Application)
│   │   ├── Kiriu.WeighingSystem.Infrastructure/← Acceso a datos (referenciado por API)
│   │   ├── Kiriu.WeighingSystem.SerialGateway/ ← Servicio serial (publicar y desplegar por separado)
│   │   └── Kiriu.WeighingSystem.Database/      ← Scripts SQL de migración
│   └── frontend/
│       └── kiriu-weighing-frontend/            ← Aplicación Angular (compilar y desplegar en IIS)
└── publish/                                    ← Artefactos publicados (si ya existen)
```

Para el despliegue solo se requieren los artefactos publicados o compilados de:

| Componente     | Carpeta de origen                                      | Artefacto de salida     |
|----------------|--------------------------------------------------------|-------------------------|
| API Backend    | `src/backend/Kiriu.WeighingSystem.Api/`                | `publish/api/`          |
| SerialGateway  | `src/backend/Kiriu.WeighingSystem.SerialGateway/`      | `publish/gateway/`      |
| Frontend       | `src/frontend/kiriu-weighing-frontend/`                | `dist/kiriu-weighing-frontend/browser/` |
| Base de datos  | `src/backend/Kiriu.WeighingSystem.Database/`           | `manual_migrations.sql` |

---

## Configuración previa

Antes de desplegar, ajustar los archivos de configuración según el ambiente objetivo.

### API Backend — `appsettings.Production.json`

Ubicación: `src/backend/Kiriu.WeighingSystem.Api/appsettings.Production.json`

| Parámetro                            | Descripción                                      | Ejemplo                                      | Obligatorio | Observaciones                                              |
|--------------------------------------|--------------------------------------------------|----------------------------------------------|-------------|------------------------------------------------------------|
| `ConnectionStrings.DefaultConnection`| Cadena de conexión a SQL Server                  | `Server=192.168.1.10,1433;Database=WeighingSystem;User Id=sa;Password=...` | Sí | Usar TrustServerCertificate=true si no hay certificado SSL |
| `JwtSettings.SecretKey`              | Clave de firma de tokens JWT                     | Cadena aleatoria de 32+ caracteres           | Sí          | **No usar la clave de desarrollo en producción**           |
| `JwtSettings.ExpirationInMinutes`    | Tiempo de vida del access token                  | `480`                                        | Sí          | Producción: 480 min; desarrollo: 60 min                    |
| `JwtSettings.RefreshTokenExpirationInDays` | Tiempo de vida del refresh token           | `30`                                         | Sí          |                                                            |
| `CargoCamera.Url`                    | URL de captura de la cámara de carga             | `http://192.168.110.40:5001/ISAPI/Streaming/channels/1/picture` | Sí | Formato Hikvision ISAPI                      |
| `TrailerCamera.Url`                  | URL de la cámara de trailer                      | `http://192.168.110.40:5002/ISAPI/...`       | Sí          |                                                            |
| `RemolqueCamera.Url`                 | URL de la cámara de remolque                     | `http://192.168.110.40:5003/ISAPI/...`       | Sí          |                                                            |
| `ImageCompression.MaxWidth`          | Ancho máximo de imágenes almacenadas (px)        | `1280`                                       | No          | Reducir si el almacenamiento es limitado                   |
| `ImageCompression.Quality`           | Calidad JPEG (0–100)                             | `75`                                         | No          | 75 es el balance recomendado calidad/tamaño                |
| `PhotoSettings.OrphanPhotoMaxAgeMinutes` | Minutos antes de descartar fotos sin asignar | `10`                                         | No          |                                                            |

### Frontend Angular — `environment.prod.ts`

Ubicación: `src/frontend/kiriu-weighing-frontend/src/environments/environment.prod.ts`

| Parámetro          | Descripción                                  | Ejemplo                                              | Obligatorio |
|--------------------|----------------------------------------------|------------------------------------------------------|-------------|
| `apiUrl`           | URL base de la API REST                      | `http://172.16.192.14/KiriuWeighingAPI/api`          | Sí          |
| `hubUrl`           | URL del hub SignalR (peso en tiempo real)    | `http://172.16.192.14/KiriuWeighingAPI/hubs`         | Sí          |
| `serialGatewayUrl` | URL del SerialGateway en el equipo báscula   | `http://172.16.193.132:5080`                         | Sí          |
| `apiTimeout`       | Tiempo de espera de solicitudes HTTP (ms)    | `30000`                                              | No          |

> **Importante:** Actualizar estos valores antes de compilar el frontend para el ambiente de destino. Los valores se embeben en el bundle de compilación.

### SerialGateway — `appsettings.json`

Ubicación: `src/backend/Kiriu.WeighingSystem.SerialGateway/appsettings.json`

| Parámetro                  | Descripción                              | Ejemplo     | Obligatorio |
|----------------------------|------------------------------------------|-------------|-------------|
| `SerialSettings.PortName`  | Nombre del puerto serial de la báscula   | `COM4`      | Sí          |
| `SerialSettings.BaudRate`  | Velocidad de comunicación serial         | `9600`      | Sí          |
| `SerialSettings.DataBits`  | Bits de datos                            | `8`         | Sí          |
| `SerialSettings.Parity`    | Paridad (`None`, `Even`, `Odd`)          | `None`      | Sí          |
| `SerialSettings.StopBits`  | Bits de parada (`One`, `Two`)            | `One`       | Sí          |
| `ServiceHost.Urls`         | Dirección en que escucha el gateway      | `http://0.0.0.0:5080` | Sí |

> Los parámetros de comunicación serial deben coincidir exactamente con la configuración del equipo de báscula. Consultar el manual del fabricante.

---

## Instalación del entorno

### 1. Preparar el servidor de aplicación

1. Instalar **IIS** desde el Panel de control → Activar o desactivar características de Windows.
   - Habilitar: IIS, Herramientas de administración web, Compatibilidad con la administración de IIS 6.
2. Descargar e instalar el **.NET 8 Hosting Bundle** desde el sitio oficial de Microsoft.
3. Reiniciar IIS tras la instalación: ejecutar `iisreset` en símbolo del sistema con privilegios de administrador.
4. Verificar instalación de .NET:
   ```
   dotnet --version
   ```

### 2. Preparar SQL Server

1. Verificar que SQL Server esté en ejecución y accesible por red si la API estará en otro servidor.
2. Crear la base de datos:
   ```sql
   CREATE DATABASE WeighingSystem;
   ```
3. Crear un usuario SQL con permisos sobre la base de datos, o usar el usuario `sa` con contraseña segura.
4. Verificar conectividad desde el servidor de la API hacia SQL Server (puerto 1433).

### 3. Preparar la máquina del SerialGateway

1. Instalar el **.NET 8 Runtime** (no se requiere Hosting Bundle, basta con el Runtime).
2. Conectar físicamente la báscula al puerto COM del equipo.
3. Verificar que el puerto COM sea reconocido por Windows (Administrador de dispositivos).
4. Verificar que el puerto **5080** no esté bloqueado por el firewall local:
   ```
   netsh advfirewall firewall add rule name="SerialGateway" dir=in action=allow protocol=TCP localport=5080
   ```

---

## Ejecución local (entorno de desarrollo)

### Backend API

```bash
# Desde la raíz del repositorio
cd src/backend
dotnet restore
dotnet build
dotnet run --project Kiriu.WeighingSystem.Api
```

La API quedará disponible en: `http://localhost:5269`
Swagger UI: `http://localhost:5269/swagger`

### Frontend Angular

```bash
# Instalar dependencias (primera vez)
cd src/frontend/kiriu-weighing-frontend
npm install

# Servidor de desarrollo
npm start
```

La aplicación quedará disponible en: `http://localhost:4200`

### SerialGateway

```bash
cd src/backend/Kiriu.WeighingSystem.SerialGateway
dotnet run
```

El gateway quedará disponible en: `http://localhost:5080`

### Validación local básica

- Acceder a `http://localhost:4200` → debe mostrar la pantalla de login.
- Acceder a `http://localhost:5269/swagger` → debe mostrar la documentación de la API.
- Acceder a `http://localhost:5080/weight` → debe retornar la lectura actual del puerto serial (o error si la báscula no está conectada).

---

## Despliegue

### Paso 1 — Publicar artefactos

**API Backend:**
```bash
cd src/backend
dotnet publish Kiriu.WeighingSystem.Api -c Release -o ./publish/api
```

**SerialGateway:**
```bash
dotnet publish Kiriu.WeighingSystem.SerialGateway -c Release -o ./publish/gateway
```

**Frontend Angular:**

Antes de compilar, actualizar `environment.prod.ts` con las URLs del ambiente de destino.

```bash
cd src/frontend/kiriu-weighing-frontend
npm install
npm run build
```

Los archivos estáticos quedan en:
`src/frontend/kiriu-weighing-frontend/dist/kiriu-weighing-frontend/browser/`

---

### Paso 2 — Desplegar la base de datos

1. Abrir **SQL Server Management Studio** y conectarse al servidor SQL de destino.
2. Ejecutar el script de migración completo:
   ```
   src/backend/Kiriu.WeighingSystem.Database/manual_migrations.sql
   ```
3. El script es idempotente: puede ejecutarse múltiples veces sin efecto adverso.
4. Verificar la ejecución con el script de comprobación:
   ```
   src/backend/Kiriu.WeighingSystem.Database/check_database.sql
   ```
5. Confirmar que el resultado del script de verificación muestra todas las tablas creadas sin errores.

> Si la base de datos ya existe de una versión anterior, el script aplicará solo las migraciones pendientes según la tabla `DatabaseVersions`.

---

### Paso 3 — Desplegar la API en IIS

1. Copiar el contenido de `publish/api/` al directorio de la aplicación en el servidor, por ejemplo:
   `C:\inetpub\wwwroot\KiriuWeighingAPI\`

2. En IIS, crear un nuevo **Sitio web** o **Aplicación** apuntando a esa carpeta.

3. Configurar el **Application Pool**:
   - Versión de .NET CLR: **Sin código administrado**
   - Modo de canalización administrada: **Integrado**

4. Actualizar `appsettings.Production.json` con los valores correctos de cadena de conexión, IPs de cámaras y clave JWT.

5. Asegurarse de que la carpeta `wwwroot/uploads/` tenga permisos de escritura para la cuenta del proceso IIS (`IIS_IUSRS` o la identidad del Application Pool).

6. Verificar que IIS tenga habilitado el módulo **ASP.NET Core Module v2**.

7. Reiniciar el sitio en IIS y acceder a: `http://<IP_SERVIDOR>/KiriuWeighingAPI/swagger`

---

### Paso 4 — Desplegar el frontend en IIS

1. Copiar el contenido de `dist/kiriu-weighing-frontend/browser/` a una carpeta del servidor, por ejemplo:
   `C:\inetpub\wwwroot\KiriuWeighingFrontend\`

2. En IIS, crear un **Sitio web** o **Aplicación virtual** apuntando a esa carpeta.

3. Agregar una regla de reescritura de URL en el archivo `web.config` de la carpeta para enrutar todas las rutas al `index.html` (requerido por Angular):

   ```xml
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="Angular Routes" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/index.html" />
           </rule>
         </rules>
       </rewrite>
     </system.webServer>
   </configuration>
   ```

   > Requiere el módulo **URL Rewrite** de IIS instalado.

4. Verificar acceso al frontend desde la red: `http://<IP_SERVIDOR>/KiriuWeighingFrontend/`

---

### Paso 5 — Desplegar el SerialGateway

> **Nota:** El procedimiento descrito aquí es el método manual de referencia usando `sc.exe`. En la instalación real del proyecto se utilizaron los scripts PowerShell incluidos en el proyecto (`install-service-clean.ps1` / `uninstall-service.ps1`), que automatizan estos pasos, configuran el firewall y gestionan la estructura de carpetas. Consultar `src/backend/Kiriu.WeighingSystem.SerialGateway/INSTALL-INSTRUCTIONS.md` para el procedimiento exacto aplicado.

1. Publicar el proyecto con runtime incluido (self-contained) para no requerir .NET instalado en el equipo:
   ```
   cd src/backend/Kiriu.WeighingSystem.SerialGateway
   dotnet publish -c Release -r win-x64 --self-contained -o publish
   ```
   > Si el equipo ya tiene .NET 8 Runtime instalado, se puede omitir `--self-contained`.

2. Copiar el contenido de `publish/` al equipo de operación, por ejemplo:
   `C:\Kiriu\Services\SerialGateway\setup\publish\`

3. Actualizar `appsettings.json` con el puerto COM correcto de la báscula.

4. Registrar el gateway como un **Servicio de Windows** para que inicie automáticamente:
   ```
   sc create KiriuSerialGateway binPath= "C:\Kiriu\Services\SerialGateway\installed\Kiriu.WeighingSystem.SerialGateway.exe"
   sc config KiriuSerialGateway start= auto
   sc start KiriuSerialGateway
   ```

5. Verificar que el servicio esté corriendo:
   ```
   sc query KiriuSerialGateway
   ```

6. Probar acceso desde el servidor de la API:
   ```
   http://<IP_MAQUINA_BASCULA>:5080/weight
   ```

---

### Paso 6 — Configurar las cámaras ANPR

Las tres cámaras ANPR Hikvision deben configurarse desde su propia interfaz web para que envíen los eventos de captura de placa al servidor de la API. Cada cámara apunta al mismo servidor pero a un endpoint diferente según su función.

#### Arquitectura de la integración

```
Cámara 1 (Tráiler)  → POST  http://<IP_SERVIDOR>/KiriuWeighingAPI/api/anpr/trailer
Cámara 2 (Remolque) → POST  http://<IP_SERVIDOR>/KiriuWeighingAPI/api/anpr/remolque
Cámara 3 (Cargo)    → POST  http://<IP_SERVIDOR>/KiriuWeighingAPI/api/anpr/cargo
```

> Las tres cámaras envían al **mismo servidor y mismo puerto**. Solo cambia el path del endpoint.

---

#### Configuración en la interfaz web de cada cámara (Hikvision)

El procedimiento es idéntico para las tres cámaras; solo varía la URL de destino.

1. Acceder a la interfaz web de la cámara desde un navegador: `http://<IP_DE_LA_CAMARA>`
2. Ingresar con usuario y contraseña de administrador de la cámara.
3. Navegar a: **Configuration → Event → Smart Event → ANPR**
4. Habilitar la opción **Enable ANPR**.
5. En **Linkage Method**, seleccionar **Notify Surveillance Center** o **HTTP Listening**.
6. Configurar los parámetros de notificación HTTP:

| Parámetro    | Valor                                                              |
|--------------|--------------------------------------------------------------------|
| Server IP    | IP del servidor de la API                                          |
| Port         | Puerto donde escucha la API (80 en IIS producción)                 |
| URL / Path   | El path correspondiente a la cámara (ver tabla abajo)              |
| Method       | POST                                                               |
| Content-Type | multipart/form-data                                                |

| Cámara                | Path del endpoint                          |
|-----------------------|--------------------------------------------|
| Cámara 1 — Tráiler    | `/KiriuWeighingAPI/api/anpr/trailer`       |
| Cámara 2 — Remolque   | `/KiriuWeighingAPI/api/anpr/remolque`      |
| Cámara 3 — Cargo      | `/KiriuWeighingAPI/api/anpr/cargo`         |

7. Guardar y aplicar la configuración.
8. Usar el botón **Test** (disponible en la mayoría de modelos Hikvision) para verificar que la cámara alcanza el servidor.

---

#### Verificación de los endpoints ANPR

Antes de probar con las cámaras físicas, verificar que los endpoints responden correctamente:

```
GET http://<IP_SERVIDOR>/KiriuWeighingAPI/api/anpr/test/trailer
GET http://<IP_SERVIDOR>/KiriuWeighingAPI/api/anpr/test/remolque
GET http://<IP_SERVIDOR>/KiriuWeighingAPI/api/anpr/test/cargo
```

Respuesta esperada de cada endpoint:
```json
{
  "success": true,
  "message": "Endpoint ANPR para cámara 'trailer' está funcionando",
  "endpoint": "/api/anpr/trailer"
}
```

Para simular el envío de una cámara con Postman u otra herramienta HTTP, usar:

- **Método**: POST
- **Body**: form-data con:
  - `anpr.xml` (tipo File): XML con estructura Hikvision que contiene la placa detectada.
  - `licensePlatePicture.jpg` (tipo File): imagen JPG de la placa capturada.

---

#### Prerrequisitos en el servidor para que ANPR funcione

- [ ] La API está corriendo y accesible desde la subred de las cámaras.
- [ ] El firewall permite conexiones entrantes en el puerto de la API desde las IPs de las cámaras.
- [ ] La carpeta `wwwroot/uploads/plates` existe en el directorio de despliegue de la API y tiene permisos de escritura para la cuenta del Application Pool de IIS.
- [ ] El hub SignalR está activo (verificar en la consola del navegador que aparece el mensaje de conexión ANPR establecida).

---

#### Problemas frecuentes en la integración ANPR

| Problema                                        | Posible causa                                                   | Solución                                                                                   |
|-------------------------------------------------|-----------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| La cámara muestra "Connection failed" o timeout | El servidor no es alcanzable desde la red de la cámara          | Verificar conectividad entre subredes; revisar apertura del puerto en el firewall           |
| El servidor recibe el request pero responde 400 | Content-Type incorrecto o payload sin XML o sin imagen          | Confirmar que el envío es POST con `multipart/form-data` incluyendo ambos campos           |
| El frontend no muestra la placa capturada       | SignalR no conectado o componente ANPR no activo en la pantalla | Verificar en consola del navegador que SignalR ANPR está conectado antes de la captura     |
| Las imágenes de placa no se almacenan           | Carpeta `uploads/plates` inexistente o sin permisos             | Crear la carpeta y asignar permisos de escritura a la identidad del Application Pool IIS   |

---

#### Nota sobre el flujo de captura de fotografías

El sistema utiliza dos mecanismos distintos para capturar fotos, según el tipo de imagen:

- **Fotos de placa (ANPR)**: el frontend consulta primero si ya existe una foto huérfana en la base de datos (capturada automáticamente por la cámara ANPR al detectar el vehículo). Si existe, la muestra de inmediato. Si **no existe**, captura de forma inmediata una foto directa desde la cámara IP (placa queda como `unknown`) y simultáneamente escucha un evento ANPR en segundo plano durante 30 segundos. Si el evento ANPR llega, reemplaza la foto directa con la imagen ANPR y la placa detectada. Si no llega, conserva la foto de cámara sin mostrar error al operador.

- **Fotos de carga** (estado del vehículo): siempre se captura directamente desde la cámara IP en el momento que el operador presiona el botón. No consulta la base de datos previamente.

Para un análisis detallado de estos flujos, incluyendo diagramas de secuencia y tabla comparativa, consultar la sección **"Patrón de captura de fotografías"** en el documento de arquitectura (`docs/arquitectura/README.md`).

---

## Base de datos

**Motor requerido:** Microsoft SQL Server 2019 o superior.

**Script principal:** `src/backend/Kiriu.WeighingSystem.Database/manual_migrations.sql`

El script crea y mantiene las siguientes estructuras:

| Esquema    | Tablas principales                                                                          |
|------------|---------------------------------------------------------------------------------------------|
| `dbo`      | Usuarios, Roles, Permisos, Modulos, ModuloPermisos, RolePermisos, UserSessions, DatabaseVersions |
| `weighing` | WeighingOperations, WeighingPhotos, WeighingRemolques, WeighingEditHistories                |
| `dbo`      | AuditLogs, FolioSequence                                                                    |

**Datos semilla:** El script de migración incluye la creación de los módulos del sistema y los roles base. El usuario administrador inicial debe crearse desde la interfaz de administración o directamente en la base de datos según el procedimiento definido por el equipo. [Pendiente por confirmar si existe un script de seed de usuario administrador inicial]

**Comprobación post-migración:**
```sql
-- Ejecutar para verificar estado del esquema
-- src/backend/Kiriu.WeighingSystem.Database/check_database.sql
SELECT * FROM dbo.DatabaseVersions ORDER BY Version;
```

El resultado debe mostrar versiones de 0 a 10 (versión actual del script).

---

## Validación post-instalación

Ejecutar las siguientes pruebas de humo una vez completado el despliegue:

| Verificación                                | Cómo validar                                                             | Resultado esperado                          |
|---------------------------------------------|--------------------------------------------------------------------------|---------------------------------------------|
| API responde                                | `GET http://<IP>/KiriuWeighingAPI/swagger`                               | Página Swagger visible                      |
| Login funciona                              | Ingresar credenciales en el frontend                                     | Redirección al dashboard                    |
| SerialGateway accesible                     | `GET http://<IP_GATEWAY>:5080/weight`                                    | JSON con valor de peso (o error controlado) |
| SignalR conecta                             | Abrir frontend y verificar lectura de peso en tiempo real en pantalla de pesaje | Valor de peso visible y actualizándose  |
| Captura de imágenes                         | Iniciar una operación y capturar imagen desde cámara                     | Imagen visible en la interfaz               |
| Base de datos con versiones correctas       | Ejecutar `SELECT * FROM dbo.DatabaseVersions`                            | Versiones del 0 al 10 presentes             |
| Exportación Excel                           | Acceder a consulta de operaciones y exportar                             | Archivo `.xlsx` descargado                  |

**Logs a revisar en caso de fallo:**
- Logs de IIS: `C:\inetpub\logs\LogFiles\`
- Logs de Serilog (API): carpeta `logs/` dentro del directorio de publicación de la API.
- Event Viewer de Windows (servicios y errores de aplicación).

---

## Problemas comunes

| Problema                                          | Posible causa                                                        | Solución sugerida                                                                      |
|---------------------------------------------------|----------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| La API retorna 500 al iniciar                     | Cadena de conexión incorrecta o SQL Server no accesible              | Verificar `DefaultConnection` en `appsettings.Production.json` y conectividad al puerto 1433 |
| El frontend no carga rutas (404 al refrescar)     | Falta la regla de reescritura de URL en IIS                          | Agregar `web.config` con regla de Angular Routes descrita en el paso 4                |
| El peso no se actualiza en tiempo real            | SignalR no puede establecer WebSocket                                 | Verificar que IIS tenga habilitado WebSocket Protocol; revisar `hubUrl` en `environment.prod.ts` |
| SerialGateway no lee el puerto COM                | Puerto incorrecto o driver no instalado                              | Verificar puerto en Administrador de dispositivos; ajustar `PortName` en `appsettings.json` |
| Error 401 en solicitudes autenticadas             | Token JWT expirado o clave de firma incorrecta                       | Verificar `SecretKey` en `appsettings.Production.json`; limpiar caché del navegador   |
| Las imágenes no se guardan                        | Sin permisos de escritura en `wwwroot/uploads/`                      | Otorgar permisos de escritura a `IIS_IUSRS` sobre la carpeta `uploads/`               |
| La cámara ANPR no envía placas                    | URL de endpoint incorrecta en la configuración de la cámara          | Revisar configuración en la interfaz web de la cámara; verificar accesibilidad de red |
| El frontend muestra error CORS                    | La API no tiene el origen del frontend en la política CORS            | Verificar configuración de CORS en `Program.cs`; la política actual permite todos los orígenes |
| Error al aplicar el script de migración           | La base de datos no existe o el usuario no tiene permisos            | Crear la base de datos manualmente antes de ejecutar el script; verificar permisos del usuario SQL |

---

## Consideraciones operativas

### Reinicio de servicios

| Servicio            | Comando de reinicio                                      |
|---------------------|----------------------------------------------------------|
| API en IIS          | `iisreset` o reinicio del Application Pool desde IIS Manager |
| SerialGateway       | `sc stop KiriuSerialGateway && sc start KiriuSerialGateway` |
| SQL Server          | `net stop MSSQLSERVER && net start MSSQLSERVER`          |

### Monitoreo básico

- Revisar el **Event Viewer** de Windows periódicamente para detectar errores de aplicación.
- Los logs de Serilog se encuentran en la carpeta `logs/` del directorio de despliegue de la API. Se generan archivos diarios.
- Verificar el estado del SerialGateway consultando `http://<IP_GATEWAY>:5080/weight` desde el servidor.
- El endpoint `GET /api/health` de la API retorna el estado de los componentes internos del sistema.

### Respaldos

- Programar respaldo diario de la base de datos `WeighingSystem` con SQL Server Agent o herramienta equivalente.
- Respaldar periódicamente la carpeta `wwwroot/uploads/` que contiene las imágenes de las operaciones.
- Conservar los archivos de configuración (`appsettings.Production.json`, `appsettings.json` del gateway) fuera del repositorio con sus valores reales de producción.

### Mantenimiento inicial

- Revisar el crecimiento de la base de datos cada mes, especialmente la tabla `WeighingPhotos`, que almacena imágenes binarias.
- Si el volumen de operaciones es alto, evaluar una estrategia de archivado de registros históricos.
- Verificar que los logs de Serilog no crezcan sin límite; configurar retención si es necesario.

---

## Documentos relacionados

| Documento                        | Propósito                                                                                         | Referencia                              |
|----------------------------------|---------------------------------------------------------------------------------------------------|-----------------------------------------|
| Arquitectura de la Solución      | Descripción de componentes y tecnologías; lectura recomendada antes de instalar                   | `docs/arquitectura/README.md`           |
| Diccionario de Datos             | Detalle del esquema de base de datos que crean los scripts de migración referenciados aquí        | `docs/diccionario-datos/README.md`      |
| Manual Operativo / Guía de Uso   | Guía de uso del sistema una vez instalado y configurado                                           | `docs/manual-operativo/README.md`       |
| README de Entrega                | Vista consolidada del estado de entrega y configuraciones relevantes por ambiente                 | `docs/entrega/README.md`                |
| Instrucciones de instalación del SerialGateway | Procedimiento real aplicado con scripts PowerShell para instalar el gateway como servicio | `src/backend/Kiriu.WeighingSystem.SerialGateway/INSTALL-INSTRUCTIONS.md` |

---

## Consideraciones finales

El despliegue de Kiriu Weighing System requiere coordinación entre tres componentes distribuidos: el servidor de aplicación (API + frontend), la base de datos SQL Server y el equipo de operación con la báscula. El orden de despliegue es crítico: la base de datos debe estar lista antes de iniciar la API, y el SerialGateway debe estar operativo antes de iniciar operaciones de pesaje.

Una vez instalado, el sistema no requiere intervención técnica frecuente. Los puntos de atención principales en operación son: el estado del puerto serial, el espacio en disco del servidor (por las imágenes almacenadas) y la disponibilidad del SQL Server.

---

## Pendientes o supuestos

- [ ] Confirmar el usuario administrador inicial para la primera autenticación en producción (o si existe un script de seed).
- [ ] Confirmar si el despliegue de producción utiliza HTTPS; en ese caso, ajustar configuración de IIS y URLs de entorno.
- [ ] Confirmar si el frontend y la API se alojan en el mismo sitio IIS o en sitios separados.
- [ ] Confirmar si se requiere el módulo **URL Rewrite** de IIS previamente instalado o si debe incluirse en los prerrequisitos del servidor.
- [ ] Confirmar el mecanismo de gestión de secretos en producción (variables de entorno vs. archivos de configuración).
- [ ] Confirmar los parámetros seriales correctos del equipo báscula físico del cliente (BaudRate, Parity, StopBits, nombre del puerto COM).
- [ ] Confirmar si las cámaras IP del cliente son compatibles con el protocolo Hikvision ISAPI utilizado en la integración.
- [ ] Confirmar estrategia de respaldo y retención de datos en producción.
