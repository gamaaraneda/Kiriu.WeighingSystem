# README de Entrega / Handoff Técnico

---

| Campo              | Detalle                                      |
|--------------------|----------------------------------------------|
| **Proyecto**       | Kiriu Weighing System                        |
| **Versión**        | 1.0                                          |
| **Fecha**          | Abril 2026                                   |
| **Responsable**    | [Completar con información del proyecto]     |

---

## Introducción

Este documento es el punto de entrega formal del proyecto **Kiriu Weighing System**. Concentra el estado del sistema, los componentes entregados, los ambientes configurados, las dependencias relevantes y las recomendaciones para la operación continua.

Está dirigido al equipo técnico receptor, ya sea el área de sistemas del cliente, el equipo de soporte o un nuevo equipo de desarrollo que tome la continuidad del proyecto. No profundiza en detalles técnicos que ya están cubiertos en la documentación específica de cada componente; se limita a ofrecer una vista consolidada y accionable del estado de la entrega.

---

## Resumen del proyecto

**Kiriu Weighing System** es una solución de control de pesaje vehicular para instalaciones con báscula industrial. El sistema cubre el ciclo completo de entrada y salida de unidades, incluyendo operaciones con doble remolque y contenedor, captura fotográfica del vehículo y carga, reconocimiento automático de placas (ANPR) y gestión de usuarios con control de acceso basado en roles.

### Estado actual

La solución fue implementada y validada. Todos los flujos principales están operativos.

### Capacidades implementadas

| Capacidad                             | Estado     |
|---------------------------------------|------------|
| Registro de entrada de vehículos      | Completo   |
| Registro de salida y cálculo de peso neto | Completo |
| Operación de doble remolque interrumpible | Completo |
| Operación de contenedor               | Completo   |
| Captura de fotos vía cámaras IP       | Completo   |
| Reconocimiento automático de placas (ANPR) | Completo |
| Transmisión de peso en tiempo real (SignalR) | Completo |
| Generación de folio secuencial único  | Completo   |
| Exportación a Excel                   | Completo   |
| Generación de ticket en PDF           | Completo   |
| Edición manual con historial y justificación | Completo |
| Registro de auditoría del sistema     | Completo   |
| Gestión de usuarios, roles y permisos | Completo   |
| Control de sesiones concurrentes      | Completo   |
| Compresión automática de imágenes     | Completo   |

---

## Componentes entregados

| Componente                        | Descripción                                                         | Estado    | Ubicación / Artefacto                                      | Observaciones                                          |
|-----------------------------------|---------------------------------------------------------------------|-----------|-------------------------------------------------------------|--------------------------------------------------------|
| API Backend (.NET 8)              | Núcleo de la lógica de negocio y endpoints REST                     | Entregado | `src/backend/Kiriu.WeighingSystem.Api/`                     | Publicar con `dotnet publish -c Release`               |
| Frontend Angular 20               | Interfaz de usuario SPA con SSR                                     | Entregado | `src/frontend/kiriu-weighing-frontend/`                     | Compilar con `npm run build` para producción           |
| SerialGateway (.NET 8)            | Servicio de lectura serial de la báscula                            | Entregado | `src/backend/Kiriu.WeighingSystem.SerialGateway/`           | Desplegar en el equipo con acceso al puerto COM        |
| Scripts de base de datos          | Script idempotente de migración y verificación del esquema          | Entregado | `src/backend/Kiriu.WeighingSystem.Database/`                | Ver `manual_migrations.sql` y `check_database.sql`     |
| Librería de dispositivos          | Binario de control de dispositivos integrado como referencia local  | Entregado | `src/backend/lib/Mapps.Control.Devices.Library.dll`         | Librería de tercero; no forma parte del código fuente  |
| Documentación técnica             | Conjunto de documentos de arquitectura, instalación, datos y uso   | Entregado | `docs/`                                                     | Ver sección de documentos relacionados                 |

---

## Ambientes

| Ambiente    | Propósito                                        | URL o referencia                                               | Estado      | Observaciones                                                  |
|-------------|--------------------------------------------------|----------------------------------------------------------------|-------------|----------------------------------------------------------------|
| Desarrollo  | Trabajo local del equipo de desarrollo           | `http://localhost:4200` (frontend) / `http://localhost:5269` (API) | Referencia | Solo para uso del equipo de desarrollo                         |
| QA          | Validación funcional e integración               | `http://172.16.192.25/KiriuWeighingAPI`                        | [Confirmar] | SerialGateway: `http://172.16.193.176:5080`                    |
| Producción  | Operación en sitio del cliente                   | `http://172.16.192.14/KiriuWeighingAPI`                        | [Confirmar] | SerialGateway: `http://172.16.193.132:5080`                    |

> Las IPs de los ambientes de QA y producción corresponden a las configuraciones registradas en los archivos de entorno del proyecto. Confirmar con el equipo de infraestructura del cliente antes de la puesta en marcha.

---

## Repositorios, ramas y artefactos

| Elemento            | Detalle                                                                   |
|---------------------|---------------------------------------------------------------------------|
| Repositorio         | [Completar con URL del repositorio]                                       |
| Rama principal      | `initial-upload`                                                          |
| Rama de desarrollo  | `dev-camara`                                                              |
| Rama activa         | `dev-camara` (última funcionalidad integrada)                             |
| Artefactos de build | `publish/` en la raíz del repositorio (artefactos publicados previos)     |
| Entregables         | Código fuente completo + documentación técnica en `docs/`                 |

> Se recomienda consolidar las ramas activas antes de la transición formal al equipo receptor, asegurando que `initial-upload` refleja el estado final entregado.

---

## Dependencias y servicios relacionados

| Dependencia / Servicio          | Tipo                    | Descripción                                                           | Observaciones                                                  |
|---------------------------------|-------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------|
| Microsoft SQL Server            | Infraestructura         | Motor de base de datos principal                                      | Requerido en red accesible desde el servidor de la API         |
| IIS (Internet Information Services) | Infraestructura     | Servidor web para hospedar API y frontend                             | Requiere .NET 8 Hosting Bundle y módulo URL Rewrite instalados |
| .NET 8 Runtime                  | Runtime                 | Ejecución de API y SerialGateway                                      |                                                                |
| Cámaras IP (Hikvision ISAPI)    | Integración externa     | Captura de imágenes de carga, tráiler y remolque                      | Tres cámaras configuradas; acceso vía red local                |
| Sistema ANPR                    | Integración externa     | Reconocimiento automático de placas; envía capturas a la API          | Requiere configuración del endpoint en la cámara ANPR          |
| Báscula industrial (serial)     | Integración hardware    | Lectura del peso vía puerto COM; mediada por SerialGateway            | Parámetros seriales configurables en `appsettings.json`        |
| Node.js 20 LTS                  | Herramienta de build    | Requerido solo para compilar el frontend Angular                      | No es necesario en el servidor de producción                   |

---

## Configuraciones relevantes

Los detalles completos de configuración están documentados en la **Guía de Instalación y Despliegue** (`docs/instalacion/README.md`). Se destacan aquí los puntos críticos:

| Configuración                     | Archivo                             | Observación                                                                      |
|-----------------------------------|-------------------------------------|----------------------------------------------------------------------------------|
| Cadena de conexión a SQL Server   | `appsettings.Production.json`       | Actualizar IP, puerto, usuario y contraseña según el ambiente de destino         |
| Clave secreta JWT                 | `appsettings.Production.json`       | Cambiar la clave de desarrollo antes de ir a producción                          |
| IPs de cámaras IP                 | `appsettings.Production.json`       | Ajustar `CargoCamera.Url`, `TrailerCamera.Url`, `RemolqueCamera.Url`            |
| URLs de la API y SignalR          | `environment.prod.ts` (frontend)    | Deben reflejar la IP o dominio del servidor antes de compilar el frontend        |
| URL del SerialGateway             | `environment.prod.ts` (frontend)    | IP del equipo con acceso físico al puerto COM de la báscula                      |
| Puerto COM de la báscula          | `appsettings.json` (SerialGateway)  | Verificar el puerto COM correcto en el equipo de operación                       |
| Parámetros de comunicación serial | `appsettings.json` (SerialGateway)  | BaudRate, Parity y StopBits deben coincidir con la configuración de la báscula   |

> **Importante:** La clave JWT (`SecretKey`) actualmente configurada en los archivos de desarrollo **no debe usarse en producción**. Generar una nueva clave aleatoria antes del despliegue final.

---

## Estado funcional y técnico

### Completado

- Todos los flujos de pesaje (remolque, contenedor, doble remolque estándar e interrumpible).
- Sistema de autenticación con JWT, refresh tokens y control de sesiones concurrentes.
- Control de acceso basado en roles con granularidad por módulo y tipo de permiso.
- Integración con cámaras IP y sistema ANPR.
- Transmisión de peso en tiempo real vía SignalR.
- Auditoría completa a nivel de operación y de sistema.
- Exportación a Excel y generación de ticket en PDF.
- Compresión automática de imágenes antes del almacenamiento en base de datos.

### Pendiente o no incluido en esta versión

- Integración con sistemas ERP o facturación electrónica.
- Envío automático de reportes por correo electrónico.
- Módulo de alertas o notificaciones push.
- Aplicación móvil nativa.
- Configuración de HTTPS/TLS en el servidor (pendiente de confirmar con el cliente).

### Limitaciones conocidas

- El sistema requiere conectividad de red continua entre todos los componentes. No cuenta con modo de operación offline.
- El almacenamiento de imágenes en base de datos incrementa el tamaño de la BD con el tiempo; se recomienda monitorear y planificar respaldos regulares.
- La gestión de secretos (JWT, contraseñas de BD) se realiza mediante archivos de configuración; no está integrada con un gestor de secretos centralizado.

---

## Incidencias conocidas

| Tema                                      | Descripción                                                                  | Impacto  | Mitigación o siguiente paso                                               |
|-------------------------------------------|------------------------------------------------------------------------------|----------|---------------------------------------------------------------------------|
| Secretos en archivos de configuración     | La clave JWT y contraseñas están en `appsettings.json` sin cifrado           | Medio    | Migrar a variables de entorno o gestor de secretos antes de producción    |
| Sin HTTPS configurado                     | La comunicación entre frontend y API opera sobre HTTP                        | Medio    | Configurar certificado TLS en IIS para el ambiente de producción          |
| Crecimiento de `WeighingPhotos`           | El almacenamiento binario de imágenes incrementa el tamaño de la BD         | Bajo–Medio | Monitorear mensualmente; evaluar archivado o almacenamiento externo a futuro |
| Sin estrategia definida de purga de `AuditLogs` | La tabla crece indefinidamente sin política de retención             | Bajo     | Definir y programar una política de archivado o purga periódica           |
| Dependencia de red hacia periféricos      | Cámaras y SerialGateway deben ser accesibles por red sin redundancia         | Alto     | Asegurar infraestructura de red estable; documentar IPs fijas en la red local |

---

## Recomendaciones para continuidad

### Inmediato (antes de operación en producción)

1. Reemplazar la clave JWT de desarrollo por una cadena generada específicamente para producción.
2. Actualizar todas las IPs y URLs en los archivos de configuración del ambiente de producción.
3. Aplicar el script de migración (`manual_migrations.sql`) en la base de datos de producción y verificar con `check_database.sql`.
4. Configurar respaldos automáticos de la base de datos `WeighingSystem`.
5. Registrar el SerialGateway como servicio de Windows para inicio automático.
6. Confirmar la configuración del endpoint ANPR en las cámaras del cliente.

### Corto plazo (primera semana de operación)

- Monitorear los logs de la API (carpeta `logs/` en el directorio de publicación) diariamente.
- Verificar el crecimiento de la base de datos, especialmente la tabla `WeighingPhotos`.
- Confirmar que el SerialGateway mantiene conectividad estable con la báscula durante los turnos completos.
- Realizar una revisión del estado del sistema con el equipo operativo después de los primeros días de uso.

### Mediano plazo

- Evaluar la implementación de HTTPS si el sistema opera en redes que requieren mayor seguridad.
- Definir una política de retención y archivado para `AuditLogs` y `WeighingPhotos`.
- Considerar la migración a un gestor de secretos si el sistema escala a múltiples instalaciones.

---

## Documentos relacionados

| Documento                          | Propósito                                                               | Referencia                              |
|------------------------------------|-------------------------------------------------------------------------|-----------------------------------------|
| Arquitectura de la Solución        | Descripción de componentes, capas, tecnologías y decisiones técnicas    | `docs/arquitectura/README.md`           |
| Guía de Instalación y Despliegue   | Procedimiento paso a paso para instalar y configurar la solución        | `docs/instalacion/README.md`            |
| Diccionario de Datos               | Descripción de entidades, campos, tipos y reglas del modelo de datos    | `docs/diccionario-datos/README.md`      |
| Manual Operativo / Guía de Uso     | Guía de uso para operadores, supervisores y administradores funcionales | `docs/manual-operativo/README.md`       |

---

## Responsables y contactos

| Rol                                | Alcance de soporte                                              | Observaciones                                       |
|------------------------------------|-----------------------------------------------------------------|-----------------------------------------------------|
| Equipo de desarrollo               | Defectos de software, cambios funcionales, integraciones        | [Completar con datos de contacto]                   |
| Administrador funcional del cliente | Gestión de usuarios, roles y configuración operativa del sistema | Debe ser designado por el cliente antes del go-live |
| Área de sistemas / infraestructura | Servidores, red, SQL Server, IIS, periféricos                   | [Completar con datos de contacto del cliente]       |
| Soporte de primer nivel            | Dudas de uso, incidencias operativas cotidianas                 | [Completar con datos de contacto]                   |

---

## Consideraciones finales

El proyecto **Kiriu Weighing System** se entrega en estado funcional y completo para los alcances definidos. La solución cubre el ciclo de pesaje vehicular de extremo a extremo, con trazabilidad, auditoría y control de acceso incorporados desde el diseño.

La documentación entregada cubre los aspectos de arquitectura, instalación, datos y operación, y debe servir como base suficiente para que el equipo receptor pueda operar, mantener y, si se requiere, extender el sistema sin dependencia del equipo original.

Los puntos críticos para asegurar una transición exitosa son: la correcta configuración de los archivos de entorno para producción, la validación del script de base de datos, el funcionamiento estable del SerialGateway con la báscula física y la habilitación del usuario administrador inicial en el sistema.

---

## Pendientes o supuestos

- [ ] Confirmar URL definitiva de producción para actualizar este documento y la documentación de instalación.
- [ ] Confirmar datos de contacto del equipo de soporte de primer y segundo nivel.
- [ ] Confirmar si el cliente designó un administrador funcional del sistema antes del go-live.
- [ ] Confirmar si se requiere HTTPS en producción y si el certificado TLS está disponible.
- [ ] Confirmar la estrategia de gestión de secretos aprobada para el ambiente de producción.
- [ ] Confirmar si la rama `dev-camara` debe integrarse a `initial-upload` antes de la entrega formal del repositorio.
- [ ] Confirmar si existe un proceso de aceptación formal o acta de entrega requerida por el cliente.
