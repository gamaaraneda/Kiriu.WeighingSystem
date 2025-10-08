# 📹 Guía de Configuración de Cámaras ANPR Hikvision

## 🎯 Resumen Rápido

Tienes **3 cámaras** Hikvision que enviarán eventos a **1 servidor backend** usando **diferentes endpoints** en el **mismo puerto**.

```
┌──────────────────────────────────────────────────────────────┐
│                  SERVIDOR BACKEND .NET                        │
│  IP: 192.168.110.17 (ejemplo)                                │
│  Puerto: 5000 (configurado en launchSettings.json)           │
│                                                               │
│  Endpoints disponibles:                                       │
│  ├─ POST /api/anpr/trailer    ← Cámara 1                    │
│  ├─ POST /api/anpr/remolque   ← Cámara 2                    │
│  └─ POST /api/anpr/cargo      ← Cámara 3                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📷 Configuración de las 3 Cámaras

### Escenario de Ejemplo

Supongamos:
- **Servidor Backend**: `192.168.110.17:5000`
- **Cámara 1** (tráiler): `192.168.1.37` (puerto interno 8095)
- **Cámara 2** (remolque): `192.168.1.38` (puerto interno 8095)
- **Cámara 3** (cargo): `192.168.1.39` (puerto interno 8095)

---

## ⚙️ Pasos de Configuración en Cada Cámara

### CÁMARA 1 - Placa de Tráiler

1. **Acceder a la cámara**: `http://192.168.1.37`
   - Usuario: `admin`
   - Contraseña: (tu contraseña)

2. **Navegar a**: Configuration → Event → Smart Event → ANPR

3. **Habilitar ANPR**: ✅ Enable

4. **Linkage Method** → **Notify Surveillance Center** o **HTTP Listening**

5. **HTTP Notification Settings**:
   ```
   Server IP: 192.168.110.17
   Port: 5000
   URL: /api/anpr/trailer
   Method: POST
   ```

   O directamente:
   ```
   Full URL: http://192.168.110.17:5000/api/anpr/trailer
   ```

6. **Guardar** y **Aplicar**

---

### CÁMARA 2 - Placa de Remolque

1. **Acceder a la cámara**: `http://192.168.1.38`

2. Seguir los mismos pasos, pero en **URL**:
   ```
   Server IP: 192.168.110.17
   Port: 5000
   URL: /api/anpr/remolque
   ```

   O:
   ```
   Full URL: http://192.168.110.17:5000/api/anpr/remolque
   ```

---

### CÁMARA 3 - Placa de Carga/Contenedor

1. **Acceder a la cámara**: `http://192.168.1.39`

2. Seguir los mismos pasos, pero en **URL**:
   ```
   Server IP: 192.168.110.17
   Port: 5000
   URL: /api/anpr/cargo
   ```

   O:
   ```
   Full URL: http://192.168.110.17:5000/api/anpr/cargo
   ```

---

## 🔍 Capturas de Pantalla Hikvision (Referencia)

En la interfaz de configuración de la cámara, busca algo similar a:

```
┌─────────────────────────────────────────────────────┐
│ Smart Event                                         │
│ └─ ANPR                                            │
│                                                     │
│ [✓] Enable ANPR                                    │
│                                                     │
│ Linkage Method:                                     │
│ [✓] Notify Surveillance Center                     │
│ [ ] Upload to FTP/NAS                              │
│ [ ] Send Email                                     │
│                                                     │
│ HTTP Notification:                                  │
│ ┌───────────────────────────────────────────────┐  │
│ │ URL: http://192.168.110.17:5000/api/anpr/... │  │
│ │ Method: [POST ▼]                              │  │
│ │ Content-Type: multipart/form-data             │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ [Test]  [Save]  [Cancel]                           │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Verificar Configuración

### 1. Verificar que el Backend esté Corriendo

```bash
# Endpoint de prueba para cada cámara
curl http://192.168.110.17:5000/api/anpr/test/trailer
curl http://192.168.110.17:5000/api/anpr/test/remolque
curl http://192.168.110.17:5000/api/anpr/test/cargo
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "Endpoint ANPR para cámara 'trailer' está funcionando",
  "endpoint": "/api/anpr/trailer",
  "timestamp": "2025-10-07T..."
}
```

### 2. Probar con Postman (Simular Cámara)

**URL**: `http://192.168.110.17:5000/api/anpr/trailer`
**Método**: POST
**Body** (form-data):

| KEY | TYPE | VALUE |
|-----|------|-------|
| `anpr.xml` | File | [Archivo XML con estructura Hikvision] |
| `licensePlatePicture.jpg` | File | [Imagen JPG de la placa] |

### 3. Usar el Botón "Test" en la Cámara

Muchas cámaras Hikvision tienen un botón **"Test"** en la configuración HTTP que envía un evento de prueba.

---

## 🚨 Troubleshooting

### Problema 1: Cámara no puede alcanzar el servidor

**Síntomas**: La cámara muestra "Connection failed" o timeout

**Soluciones**:
1. ✅ Verificar que el servidor backend esté corriendo: `netstat -an | find "5000"`
2. ✅ Verificar conectividad: Desde la cámara hacer ping a `192.168.110.17`
3. ✅ Verificar firewall: Abrir puerto 5000 en el servidor
4. ✅ Verificar que ambos estén en la misma red o haya ruta entre ellas

```bash
# Desde el servidor, hacer ping a la cámara
ping 192.168.1.37

# Verificar que el puerto 5000 esté abierto
netstat -an | findstr :5000
```

---

### Problema 2: Backend recibe request pero no procesa

**Síntomas**: Logs del backend muestran error 400 o 500

**Verificar**:
1. Content-Type debe ser `multipart/form-data`
2. Payload debe incluir XML y JPG
3. Ver logs detallados en la consola del backend

---

### Problema 3: Frontend no recibe la placa

**Síntomas**: Backend procesa OK pero Angular no muestra nada

**Verificar**:
1. SignalR esté conectado (ver consola del navegador: "Conexión SignalR ANPR iniciada")
2. El usuario esté en la pantalla correcta con el componente ANPR
3. El `cameraType` coincida con el esperado

---

## 📊 Matriz de Configuración Completa

| Componente | IP | Puerto | Endpoint/Path | Descripción |
|------------|----|----|---------------|-------------|
| **Servidor Backend** | 192.168.110.17 | 5000 | - | API .NET que recibe eventos |
| **Endpoint Tráiler** | 192.168.110.17 | 5000 | /api/anpr/trailer | Recibe placa de tráiler |
| **Endpoint Remolque** | 192.168.110.17 | 5000 | /api/anpr/remolque | Recibe placa de remolque |
| **Endpoint Cargo** | 192.168.110.17 | 5000 | /api/anpr/cargo | Recibe placa de carga |
| **Cámara 1 (Tráiler)** | 192.168.1.37 | 8095 | - | Envía a /api/anpr/trailer |
| **Cámara 2 (Remolque)** | 192.168.1.38 | 8095 | - | Envía a /api/anpr/remolque |
| **Cámara 3 (Cargo)** | 192.168.1.39 | 8095 | - | Envía a /api/anpr/cargo |

---

## 🔐 Seguridad (Opcional)

Si quieres agregar autenticación básica a los endpoints ANPR:

### En la Cámara:
```
Username: anpr_camera
Password: SecurePassword123
```

### En el Backend:
Agregar middleware de autenticación básica solo para rutas `/api/anpr/*`

---

## 📝 Checklist de Configuración

### Backend
- [ ] Servidor corriendo en `http://192.168.110.17:5000`
- [ ] Endpoints `/api/anpr/trailer`, `/remolque`, `/cargo` responden a GET test
- [ ] Firewall permite conexiones entrantes al puerto 5000
- [ ] Carpeta `wwwroot/uploads/plates` existe y tiene permisos de escritura
- [ ] SignalR Hub configurado y funcionando

### Cámara 1 (Tráiler)
- [ ] IP configurada: `192.168.1.37`
- [ ] ANPR habilitado
- [ ] HTTP Notification habilitado
- [ ] URL: `http://192.168.110.17:5000/api/anpr/trailer`
- [ ] Método: POST
- [ ] Test exitoso

### Cámara 2 (Remolque)
- [ ] IP configurada: `192.168.1.38`
- [ ] ANPR habilitado
- [ ] HTTP Notification habilitado
- [ ] URL: `http://192.168.110.17:5000/api/anpr/remolque`
- [ ] Método: POST
- [ ] Test exitoso

### Cámara 3 (Cargo)
- [ ] IP configurada: `192.168.1.39`
- [ ] ANPR habilitado
- [ ] HTTP Notification habilitado
- [ ] URL: `http://192.168.110.17:5000/api/anpr/cargo`
- [ ] Método: POST
- [ ] Test exitoso

### Frontend
- [ ] Componente `AnprCaptureComponent` integrado en pantallas
- [ ] SignalR conectado (ver consola: "Conexión SignalR ANPR iniciada")
- [ ] Al hacer clic en "Leer Placa", muestra "Esperando placa..."

---

## 🎯 Resumen Final

**NO necesitas puertos diferentes**. Las 3 cámaras envían al **mismo servidor** y **mismo puerto**, solo cambia el **path del endpoint**:

```
Cámara 1 → http://servidor:5000/api/anpr/trailer   ✅
Cámara 2 → http://servidor:5000/api/anpr/remolque  ✅
Cámara 3 → http://servidor:5000/api/anpr/cargo     ✅
```

Cada endpoint sabe qué tipo de cámara envió el evento y notifica al frontend con el `cameraType` correcto.

---

## 📞 Soporte

Si tienes problemas:
1. Revisar logs del backend (consola donde corre `dotnet run`)
2. Revisar logs de la cámara (Event Logs en la interfaz web)
3. Usar Postman para simular el envío de la cámara
4. Verificar conectividad de red entre cámara y servidor
