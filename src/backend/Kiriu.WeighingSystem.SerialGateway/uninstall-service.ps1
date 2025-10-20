# Script de Desinstalacion - Kiriu Serial Gateway
# Ejecutar como Administrador

param(
    [switch]$KeepFiles = $false,
    [string]$BasePathPath = "C:\Kiriu\Services\SerialGateway"
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "================================================================"
Write-Info "  Desinstalador de Kiriu Serial Gateway"
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
$firewallRuleName = "Kiriu Serial Gateway"
$InstallPath = Join-Path $BasePathPath "installed"
$SetupPath = Join-Path $BasePathPath "setup"

Write-Info "Configuracion:"
Write-Host "  - Servicio: $serviceName"
Write-Host "  - Ruta base: $BasePathPath"
Write-Host "  - Ruta instalacion: $InstallPath"
Write-Host "  - Mantener archivos setup: $KeepFiles"
Write-Host ""

Write-Warning "ATENCION: Se desinstalara el servicio Kiriu Serial Gateway"
Write-Host "Presione cualquier tecla para continuar o Ctrl+C para cancelar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

Write-Info "[1/3] Deteniendo y eliminando servicio de Windows..."
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    if ($existingService.Status -eq 'Running') {
        Write-Info "Deteniendo servicio..."
        Stop-Service -Name $serviceName -Force
        Start-Sleep -Seconds 2
        Write-Success "Servicio detenido"
    }

    Write-Info "Eliminando servicio..."
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 1
    Write-Success "Servicio eliminado correctamente"
}
else {
    Write-Warning "El servicio '$serviceName' no existe o ya fue eliminado"
}

Write-Info "[2/3] Eliminando regla de Firewall..."
$existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue
if ($existingRule) {
    Remove-NetFirewallRule -DisplayName $firewallRuleName
    Write-Success "Regla de firewall eliminada"
}
else {
    Write-Warning "La regla de firewall no existe o ya fue eliminada"
}

Write-Info "[3/3] Gestionando archivos de instalacion..."
if (Test-Path $InstallPath) {
    Write-Info "Eliminando directorio de instalacion (installed)..."
    Remove-Item -Path $InstallPath -Recurse -Force
    Write-Success "Archivos eliminados: $InstallPath"
}
else {
    Write-Warning "El directorio '$InstallPath' no existe"
}

if (-not $KeepFiles) {
    if (Test-Path $SetupPath) {
        Write-Info "Eliminando directorio de setup (scripts y publish)..."
        Remove-Item -Path $SetupPath -Recurse -Force
        Write-Success "Archivos eliminados: $SetupPath"
    }

    if (Test-Path $BasePathPath) {
        $remainingItems = Get-ChildItem -Path $BasePathPath -ErrorAction SilentlyContinue
        if (-not $remainingItems) {
            Write-Info "Eliminando directorio base vacio..."
            Remove-Item -Path $BasePathPath -Force
            Write-Success "Directorio base eliminado: $BasePathPath"
        }
    }
}
else {
    Write-Warning "Archivos de setup mantenidos en: $SetupPath (parametro -KeepFiles)"
}

Write-Info ""
Write-Info "================================================================"
Write-Success "  DESINSTALACION COMPLETADA"
Write-Info "================================================================"
Write-Host ""

Write-Info "Resumen:"
if ($existingService) {
    Write-Success "  - Servicio '$serviceName': Eliminado"
}
else {
    Write-Host "  - Servicio: No existia"
}

if ($existingRule) {
    Write-Success "  - Regla firewall: Eliminada"
}
else {
    Write-Host "  - Regla firewall: No existia"
}

if ($KeepFiles) {
    Write-Warning "  - Archivos setup: Mantenidos en $SetupPath"
    Write-Success "  - Archivos installed: Eliminados"
}
else {
    Write-Success "  - Archivos: Eliminados completamente"
}

Write-Host ""
if ($KeepFiles) {
    Write-Info "Para reinstalar, ejecute: cd $SetupPath && .\install-service-clean.ps1"
}
else {
    Write-Info "Para reinstalar, copie nuevamente los archivos y ejecute install-service-clean.ps1"
}
Write-Host ""

Write-Success "Presione cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
