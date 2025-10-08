@echo off
echo ========================================
echo Abriendo puerto 5269 en Firewall
echo ========================================
echo.

REM Eliminar regla anterior si existe
netsh advfirewall firewall delete rule name="Kiriu ANPR Backend"

REM Agregar regla para puerto 5269
netsh advfirewall firewall add rule name="Kiriu ANPR Backend" dir=in action=allow protocol=TCP localport=5269

echo.
echo ========================================
echo Puerto 5269 abierto exitosamente
echo ========================================
echo.
echo Ahora la camara puede conectarse a:
echo http://192.168.1.47:5269/api/anpr/trailer
echo.
pause
