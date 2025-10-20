# Script de Instalacion - Kiriu Serial Gateway
# Ejecutar como Administrador

param(
    [string]$ComPort = "COM4",
    [int]$ServicePort = 5080,
    [string]$BasePathPath = "C:\Kiriu\Services\SerialGateway"
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "================================================================"
Write-Info "  Instalador de Kiriu Serial Gateway"
Write-Info "================================================================"
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Este script requiere permisos de Administrador."
    Write-Warning "Por favor, ejecute PowerShell como Administrador y vuelva a intentar."
    pause
    exit 1
}

$serviceName = "KiriuSerialGateway"
$serviceDisplayName = "Kiriu Serial Gateway"
$serviceDescription = "Gateway de comunicacion serial para bascula Kiriu Weighing System"

$InstallPath = Join-Path $BasePathPath "installed"
$SetupPath = Join-Path $BasePathPath "setup"

Write-Info "Configuracion:"
Write-Host "  - Puerto COM: $ComPort"
Write-Host "  - Puerto HTTP: $ServicePort"
Write-Host "  - Ruta base: $BasePathPath"
Write-Host "  - Ruta instalacion: $InstallPath"
Write-Host ""

Write-Info "[1/7] Verificando servicio existente..."
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Warning "El servicio '$serviceName' ya existe. Deteniendolo..."
    if ($existingService.Status -eq 'Running') {
        Stop-Service -Name $serviceName -Force
        Start-Sleep -Seconds 2
    }
    Write-Info "Eliminando servicio existente..."
    sc.exe delete $serviceName
    Start-Sleep -Seconds 2
    Write-Success "Servicio existente eliminado"
}
else {
    Write-Success "No hay servicio existente"
}

Write-Info "[2/7] Creando directorio de instalacion..."
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Success "Directorio creado: $InstallPath"
}
else {
    Write-Success "Directorio ya existe: $InstallPath"
}

Write-Info "[3/7] Verificando archivos de publicacion..."
$publishPath = Join-Path $SetupPath "publish"
if (-not (Test-Path $publishPath)) {
    Write-Error "ERROR: No se encontro la carpeta 'publish' en $SetupPath."
    Write-Warning "La estructura debe ser:"
    Write-Warning "  $BasePathPath\"
    Write-Warning "    setup\"
    Write-Warning "      install-service-clean.ps1"
    Write-Warning "      publish\"
    pause
    exit 1
}

$exePath = Join-Path $publishPath "Kiriu.WeighingSystem.SerialGateway.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "ERROR: No se encontro el ejecutable en la carpeta publish."
    pause
    exit 1
}
Write-Success "Archivos de publicacion encontrados"

Write-Info "[4/7] Copiando archivos al directorio de instalacion..."
Copy-Item -Path "$publishPath\*" -Destination $InstallPath -Recurse -Force
Write-Success "Archivos copiados correctamente"

Write-Info "[5/7] Configurando appsettings.json..."
$appsettingsPath = Join-Path $InstallPath "appsettings.json"
if (Test-Path $appsettingsPath) {
    $config = Get-Content $appsettingsPath -Raw | ConvertFrom-Json
    $config.SerialSettings.PortName = $ComPort
    $config.ServiceHost.Urls = "http://0.0.0.0:$ServicePort"
    $config | ConvertTo-Json -Depth 10 | Set-Content $appsettingsPath -Encoding UTF8
    Write-Success "Configuracion actualizada (Puerto: $ComPort, HTTP: $ServicePort)"
}
else {
    Write-Warning "No se encontro appsettings.json"
}

Write-Info "[6/7] Creando servicio de Windows..."
$serviceBinPath = Join-Path $InstallPath "Kiriu.WeighingSystem.SerialGateway.exe"
sc.exe create $serviceName binPath= $serviceBinPath start= auto | Out-Null
sc.exe description $serviceName $serviceDescription | Out-Null
Write-Success "Servicio creado: $serviceDisplayName"

Write-Info "Iniciando servicio..."
Start-Service -Name $serviceName
Start-Sleep -Seconds 3

$service = Get-Service -Name $serviceName
if ($service.Status -eq 'Running') {
    Write-Success "Servicio iniciado correctamente"
}
else {
    Write-Warning "El servicio fue creado pero no esta corriendo. Estado: $($service.Status)"
}

Write-Info "[7/7] Configurando regla de Firewall..."
$firewallRuleName = "Kiriu Serial Gateway"
$existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Warning "Regla de firewall existente encontrada. Eliminandola..."
    Remove-NetFirewallRule -DisplayName $firewallRuleName
}

New-NetFirewallRule -DisplayName $firewallRuleName -Description "Permite acceso HTTP al Gateway de bascula Kiriu" -Direction Inbound -LocalPort $ServicePort -Protocol TCP -Action Allow -Profile Any -Enabled True | Out-Null

Write-Success "Regla de firewall creada (Puerto: $ServicePort)"

Write-Info "================================================================"
Write-Success "  INSTALACION COMPLETADA EXITOSAMENTE"
Write-Info "================================================================"
Write-Host ""
Write-Info "Informacion del servicio:"
Write-Host "  - Nombre: $serviceName"
Write-Host "  - Estado: Running"
Write-Host "  - Puerto COM: $ComPort"
Write-Host "  - Puerto HTTP: $ServicePort"
Write-Host "  - Ruta: $InstallPath"
Write-Host ""

$allIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" }

Write-Info "Endpoints disponibles:"
Write-Host "  - Local:  http://localhost:$ServicePort"
Write-Host ""

if ($allIPs) {
    Write-Info "Endpoints de red (usar desde otros equipos):"
    foreach ($ip in $allIPs) {
        $ipAddr = $ip.IPAddress
        if ($ipAddr -like "192.168.*") {
            Write-Success "  - Red LAN (RECOMENDADA): http://${ipAddr}:$ServicePort"
        }
        elseif ($ipAddr -like "172.*") {
            Write-Host "  - Red privada:           http://${ipAddr}:$ServicePort" -ForegroundColor Gray
        }
        elseif ($ipAddr -like "10.*") {
            Write-Host "  - Red privada:           http://${ipAddr}:$ServicePort" -ForegroundColor Gray
        }
        else {
            Write-Host "  - Otra red:              http://${ipAddr}:$ServicePort" -ForegroundColor Gray
        }
    }
}
Write-Host ""
Write-Info "Prueba los endpoints:"
Write-Host "  curl http://localhost:$ServicePort/health"
Write-Host "  curl http://localhost:$ServicePort/weight"
Write-Host ""

Write-Info "Comandos utiles:"
Write-Host "  - Ver estado:     sc query $serviceName"
Write-Host "  - Detener:        sc stop $serviceName"
Write-Host "  - Iniciar:        sc start $serviceName"
Write-Host "  - Desinstalar:    sc delete $serviceName"
Write-Host ""

Write-Success "Presione cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
