# Braunker Serial Test - Indicador ZM401-SD3

Aplicación de consola para probar la comunicación RS232 con el indicador de peso ZM401-SD3.

## Descripción

Esta aplicación permite probar la lectura de peso del indicador ZM401-SD3 conectado al puerto COM4 mediante comunicación serial RS232.

## Características

- ✅ Interfaz de menú interactivo
- ✅ Comunicación serial configurada para ZM401-SD3 (9600 bps, 8N1)
- ✅ Envío de comando `W\r` para solicitar peso
- ✅ Extracción automática del valor numérico del peso
- ✅ Mensajes con colores para mejor visualización
- ✅ Manejo robusto de errores (puerto ocupado, sin respuesta, timeout, etc.)
- ✅ Cierre automático del puerto después de cada operación

## Configuración del Puerto Serial

- **Puerto:** COM4
- **Velocidad:** 9600 bps
- **Bits de datos:** 8
- **Paridad:** None (sin paridad)
- **Stop bits:** 1
- **Control de flujo:** None (sin control de flujo)
- **Timeout lectura:** 2 segundos
- **Timeout escritura:** 1 segundo

## Formato de Respuesta Esperado

El indicador ZM401-SD3 debe responder con el siguiente formato:

```
ST,GS,+000123.45kg
```

Donde:
- `ST` = Status
- `GS` = Gross/Stable
- `+000123.45` = Valor del peso con signo
- `kg` = Unidad de medida

## Compilación

```bash
cd src/test/Braunker.SerialTest
dotnet build
```

## Ejecución

```bash
cd src/test/Braunker.SerialTest
dotnet run
```

## Uso

1. Al ejecutar la aplicación, verás un menú con las siguientes opciones:
   - **[1] Obtener peso del indicador** - Solicita el peso actual al indicador
   - **[2] Salir** - Cierra la aplicación

2. Selecciona la opción `1` para obtener el peso:
   - La aplicación se conectará al puerto COM4
   - Enviará el comando `W\r`
   - Esperará la respuesta del indicador (150ms)
   - Mostrará la respuesta completa y el peso extraído
   - Cerrará el puerto automáticamente

3. Puedes repetir el proceso cuantas veces necesites sin reiniciar la aplicación

## Códigos de Error

La aplicación maneja los siguientes errores:

- **❌ Acceso denegado al puerto COM4**
  - El puerto está siendo usado por otra aplicación
  - Solución: Cierra cualquier aplicación que esté usando el puerto

- **❌ Error de E/S**
  - El puerto COM4 no existe o no está disponible
  - Solución: Verifica que el dispositivo esté conectado

- **❌ Sin respuesta del indicador**
  - El indicador no envió ninguna respuesta
  - Solución: Verifica que el indicador esté encendido y correctamente conectado

- **❌ Tiempo de espera agotado**
  - El indicador no respondió en 2 segundos
  - Solución: Verifica la conexión y configuración del indicador

- **⚠️ No se pudo extraer el valor numérico del peso**
  - La respuesta no tiene el formato esperado
  - Solución: Verifica la configuración del indicador

## Ejemplo de Salida

```
╔═══════════════════════════════════════════════════════════════╗
║        BRAUNKER SERIAL TEST - Indicador ZM401-SD3            ║
╚═══════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────┐
│  MENÚ PRINCIPAL                                               │
├───────────────────────────────────────────────────────────────┤
│  [1] Obtener peso del indicador                               │
│  [2] Salir                                                    │
└───────────────────────────────────────────────────────────────┘

Seleccione una opción: 1

═══════════════════════════════════════════════════════════════
  OBTENIENDO PESO DEL INDICADOR ZM401-SD3
═══════════════════════════════════════════════════════════════

📡 Conectando al puerto COM4... [OK]
📤 Enviando comando: 'W\r'
⏳ Esperando respuesta (150ms)...
📥 Respuesta recibida: 'ST,GS,+000123.45kg'

✅ PESO EXTRAÍDO: 123.45 kg

🔌 Puerto cerrado correctamente
```

## Requisitos

- .NET 8.0 o superior
- Windows (puerto COM4)
- Indicador ZM401-SD3 conectado y configurado correctamente

## Notas Técnicas

- La aplicación utiliza `System.IO.Ports.SerialPort` para la comunicación serial
- Se limpia el buffer de entrada/salida antes de cada operación
- El puerto se cierra automáticamente después de cada lectura para evitar bloqueos
- Se utiliza un delay de 150ms después de enviar el comando para dar tiempo al indicador
- La extracción del peso usa expresiones regulares para buscar el patrón numérico

## Solución de Problemas

### El puerto COM4 no está disponible

1. Verifica en el Administrador de Dispositivos de Windows que el puerto COM4 existe
2. Si el puerto tiene otro número (ej: COM5), modifica la constante `PORT_NAME` en el código

### El indicador no responde

1. Verifica que el cable serial esté correctamente conectado
2. Verifica que el indicador esté encendido
3. Verifica que la configuración del indicador coincida con la de la aplicación (9600 bps, 8N1)
4. Prueba con un software de terminal serial (PuTTY, RealTerm) para descartar problemas de hardware

### El peso extraído no es correcto

1. Verifica el formato de respuesta del indicador
2. Si el formato es diferente, ajusta la expresión regular en el método `ExtractWeight()`
