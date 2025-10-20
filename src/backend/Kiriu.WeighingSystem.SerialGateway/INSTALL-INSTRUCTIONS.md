# Instrucciones de Instalación - Kiriu Serial Gateway

## Estructura de Directorios

```
C:\Kiriu\Services\SerialGateway\
├── setup\                              <- Archivos de instalación
│   ├── install-service-clean.ps1       <- Script de instalación
│   ├── uninstall-service.ps1           <- Script de desinstalación
│   └── publish\                        <- Archivos compilados del proyecto
│       ├── Kiriu.WeighingSystem.SerialGateway.exe
│       ├── appsettings.json
│       └── (demás DLLs y archivos)
└── installed\                          <- Instalación del servicio (creada automáticamente)
    ├── Kiriu.WeighingSystem.SerialGateway.exe
    ├── appsettings.json
    └── (archivos copiados desde publish)
```

## Preparación en máquina de desarrollo

1. Publicar el proyecto:
```powershell
cd src/backend/Kiriu.WeighingSystem.SerialGateway
dotnet publish -c Release -r win-x64 --self-contained -o publish
```

2. Preparar paquete para el cliente:
```
SerialGateway-Package\
├── install-service-clean.ps1
├── uninstall-service.ps1
└── publish\
    └── (todos los archivos compilados)
```

## Instalación en equipo del cliente

### Paso 1: Copiar archivos
Copiar todo el contenido del paquete a:
```
C:\Kiriu\Services\SerialGateway\setup\
```

### Paso 2: Ejecutar instalación
1. Abrir **PowerShell como Administrador**
2. Ejecutar:
```powershell
cd C:\Kiriu\Services\SerialGateway\setup
.\install-service-clean.ps1
```

### Paso 3: Personalizar (opcional)
```powershell
# Puerto COM diferente
.\install-service-clean.ps1 -ComPort "COM3"

# Puerto HTTP diferente
.\install-service-clean.ps1 -ServicePort 8080

# Ruta base diferente
.\install-service-clean.ps1 -BasePathPath "D:\MiRuta"
```

## Desinstalación

### Desinstalación completa (elimina todo)
```powershell
cd C:\Kiriu\Services\SerialGateway\setup
.\uninstall-service.ps1
```
Esto elimina:
- ✓ Servicio de Windows
- ✓ Regla de Firewall
- ✓ Carpeta `installed\`
- ✓ Carpeta `setup\`
- ✓ Carpeta base (si queda vacía)

### Desinstalación manteniendo archivos de setup
```powershell
.\uninstall-service.ps1 -KeepFiles
```
Esto elimina:
- ✓ Servicio de Windows
- ✓ Regla de Firewall
- ✓ Carpeta `installed\`
- ✗ Mantiene carpeta `setup\` (para reinstalar después)

## Verificación

Después de la instalación, verificar:

```powershell
# Ver estado del servicio
sc query KiriuSerialGateway

# Probar endpoints (local)
curl http://localhost:5080/health
curl http://localhost:5080/weight

# Probar desde red (usar IP mostrada en la instalación)
curl http://192.168.x.x:5080/health
```

## Comandos útiles

```powershell
# Ver estado
sc query KiriuSerialGateway

# Detener servicio
sc stop KiriuSerialGateway

# Iniciar servicio
sc start KiriuSerialGateway

# Ver logs (Event Viewer)
eventvwr.msc
# Navegar a: Windows Logs > Application
# Buscar fuente: KiriuSerialGateway
```

## Solución de problemas

### Puerto COM en uso
- Cerrar cualquier programa que use el puerto serial
- Verificar el puerto correcto en Device Manager

### Puerto HTTP bloqueado
- Verificar que el firewall permite el puerto
- Verificar que ningún otro servicio usa el puerto:
```powershell
netstat -ano | findstr :5080
```

### Servicio no inicia
- Revisar Event Viewer para errores
- Verificar permisos de la carpeta installed\
- Verificar que la báscula está conectada
