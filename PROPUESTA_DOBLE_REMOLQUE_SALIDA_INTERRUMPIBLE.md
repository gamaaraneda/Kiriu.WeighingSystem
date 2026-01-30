# Propuesta: Doble Remolque en SALIDA en dos tiempos (interrumpible)

## 1. Análisis de lo implementado en ENTRADA

### 1.1 Resumen del flujo de ENTRADA (doble remolque interrumpible)

| Aspecto                    | Implementación actual                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Creación parcial**       | `POST /api/weighing/entry/double-trailer/partial` — guarda solo remolque 1. Operación queda en `ENTRADA_PARCIAL_R1`.                                              |
| **Búsqueda/continuación**  | Pantalla `/continue-double-trailer`: búsqueda por folio/placa → lista de operaciones con `ENTRADA_PARCIAL_R1`.                                                    |
| **Reanudación**            | Al seleccionar una operación se redirige a `/weighing/client/entry` con `mode=continue-double-trailer&folio={folio}`.                                             |
| **Formulario reutilizado** | `weighing-form` (entry): detecta `mode=continue-double-trailer` y `folio`, carga operación parcial, muestra solo remolque 2 (remolque 1 en resumen solo lectura). |
| **Submit remolque 2**      | `POST /api/weighing/entry/double-trailer/continue` — completa operación; estado pasa a `ENTRADA_REGISTRADA` (compatibilidad reportes).                            |
| **Persistencia**           | Por remolque: `RegistradoPor`, `FechaRegistro`, `Estado` (PENDIENTE/REGISTRADO). Operación: `EntryWeight` (suma), `EntryDate`, `Status`.                          |
| **Estados**                | `ENTRADA_PARCIAL_R1` → (continue) → `ENTRADA_REGISTRADA`.                                                                                                         |

### 1.2 Query params / flags en ENTRADA

- **Pantalla continue**: ruta `/continue-double-trailer` (solo entrada por ahora).
- **Formulario entry en modo continue**: `mode=continue-double-trailer`, `folio={folio}`.
- **Segmento**: implícito por `currentStep === 'remolque2'` cuando existe `currentOperationFolio`.

### 1.3 Guard y rutas

- `weighing-flow.guard`: permite acceso directo a `/weighing/client/entry` si `mode=continue-double-trailer` y `folio` presentes.
- Entry: `/weighing/:unitType/:operationType` → weighing-form (entry o exit según `operationType`).
- Exit actual: `/weighing-exit/:unitType` → weighing-exit-form.

---

## 2. Flujo funcional propuesto para SALIDA (paso a paso)

### 2.1 Cómo se crea la “salida parcial” (solo remolque 1)

1. Usuario va a **Registro de salida** (flujo normal: buscar entrada por placa/folio).
2. Sistema encuentra una entrada de **doble remolque** con estado `ENTRADA_REGISTRADA` (o `ENTRADA_COMPLETA`).
3. En la pantalla de salida (`weighing-exit-form`), cuando es doble remolque se muestra:
   - Tráiler + Remolque 1 + Remolque 2 (placas y pesos de entrada ya conocidos).
   - Captura de **peso de salida** y **fotos de salida** por remolque.
4. **Nuevo**: Después de completar **solo remolque 1** (peso salida R1, fotos R1), el usuario puede hacer clic en **“Guardar salida Remolque 1 y continuar después”**.
5. Frontend llama a **`POST /api/weighing/exit/double-trailer/partial`** con:
   - `folio`, `placaTrailer`, `remolque1`: placa, peso salida (pesoTara/bruto según contrato actual), fotos.
6. Backend:
   - Obtiene operación por folio; valida que esté en `ENTRADA_REGISTRADA` / `ENTRADA_COMPLETA` y sea doble remolque.
   - Actualiza **solo** el remolque 1: `PesoTara` (peso salida), fotos de salida, y **nuevos campos** `FechaSalida`, `RegistradoPorSalida` en `WeighingRemolque`.
   - Pone la **operación** en `SALIDA_PARCIAL_R1`.
   - No escribe aún `ExitWeight`/`ExitDate`/`ExitRegisteredBy` a nivel operación (o los deja null hasta completar).

Resultado: una sola operación de doble remolque con estado `SALIDA_PARCIAL_R1`, con remolque 1 ya “salido” y remolque 2 pendiente.

### 2.2 Cómo se reanuda para remolque 2

1. Usuario entra a **“Continuar doble remolque”** (se puede unificar o separar entrada/salida; ver apartado de pantallas).
2. **Opción A (recomendada)**: Misma pantalla `/continue-double-trailer` con un **selector o pestaña** “Entrada pendiente” / “Salida pendiente”. Si elige “Salida pendiente”, la búsqueda usa `GET .../exit/double-trailer/pending/search?searchTerm=...` y devuelve operaciones con `SALIDA_PARCIAL_R1`.
3. Usuario busca por folio o placa, selecciona la operación.
4. Se redirige a **`/weighing-exit/{unitType}`** (o ruta equivalente) con **`mode=continue-double-trailer-exit&folio={folio}`** (o `segment=2`).
5. **weighing-exit-form** (reutilizado):
   - Detecta `mode=continue-double-trailer-exit` y `folio`.
   - Carga operación con `GET /api/weighing/exit/double-trailer/pending/{folio}`.
   - Muestra **resumen de remolque 1** (placa, peso entrada, peso salida, fecha salida, usuario) en solo lectura.
   - Muestra solo la sección de **remolque 2**: captura peso salida R2 y fotos R2.
6. Usuario captura peso y fotos del remolque 2 y guarda.
7. Frontend llama a **`POST /api/weighing/exit/double-trailer/continue`** con `folio` y datos de `remolque2`.
8. Backend:
   - Obtiene operación por folio; valida estado `SALIDA_PARCIAL_R1`.
   - Actualiza remolque 2: peso salida, fotos, `FechaSalida`, `RegistradoPorSalida`.
   - Calcula `ExitWeight` total (suma R1 + R2), `NetWeight`, `ExitDate` (p. ej. última fecha de salida), `ExitRegisteredBy` (usuario que registró R2).
   - Cambia estado a `SALIDA_REGISTRADA` (o `SALIDA_COMPLETA` si se quiere alinear con la migración).

Resultado: operación con estado de salida completa, lista para ticket/PDF.

### 2.3 Cómo queda la operación lista para ticket final

- Estado: `SALIDA_REGISTRADA` (o `SALIDA_COMPLETA`).
- Operación: `ExitWeight`, `ExitDate`, `ExitRegisteredBy`, `NetWeight` llenos.
- Remolques: ambos con peso de salida (y si se añaden) `FechaSalida`, `RegistradoPorSalida` para auditoría.
- Ticket/PDF: se genera al completar el “continue” (igual que hoy al hacer salida completa de una vez), usando los mismos datos ya expuestos en el backend (folio, pesos, fotos).

---

## 3. Estados / banderas para salida parcial y completa

| Estado operación                          | Significado                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `ENTRADA_REGISTRADA` / `ENTRADA_COMPLETA` | Entrada doble remolque completa; puede iniciar salida (normal o parcial). |
| `SALIDA_PARCIAL_R1`                       | Solo remolque 1 tiene salida registrada; pendiente remolque 2.            |
| `SALIDA_REGISTRADA` / `SALIDA_COMPLETA`   | Salida de ambos remolques registrada; operación cerrada.                  |

Ya existen en BD (`manual_migrations.sql`): `SALIDA_PARCIAL_R1`, `SALIDA_COMPLETA`. No afectan flujo normal de remolque único ni salida única.

Búsquedas:

- Pendientes de **continuar entrada**: `Status = 'ENTRADA_PARCIAL_R1'`.
- Pendientes de **continuar salida**: `Status = 'SALIDA_PARCIAL_R1'`.

---

## 4. Pantallas a reutilizar y query params / flags

### 4.1 Pantallas

- **Registro de salida (flujo normal)**: **`/weighing-exit/:unitType`** → **weighing-exit-form**.  
  Aquí se agrega el botón **“Guardar salida Remolque 1 y continuar después”** cuando sea doble remolque y solo esté completado el remolque 1 (equivalente al botón de entrada parcial en weighing-form).

- **Continuar salida (remolque 2)**:
  - **Opción recomendada**: Reutilizar **weighing-exit-form** en modo “continue”, igual que entry reutiliza weighing-form.
  - Ruta de llegada: por ejemplo **`/weighing-exit/client`** con query params (ver abajo), o una ruta dedicada **`/continue-double-trailer-exit`** que solo redirija a weighing-exit con params.

### 4.2 Query params / flags propuestos (salida)

- **Modo continue salida** en weighing-exit-form:
  - `mode=continue-double-trailer-exit`
  - `folio={folio}`
- Opcional: `segment=2` para alinear con la idea de “solo estoy capturando segmento 2”.

Navegación desde la pantalla de “continuar doble remolque” (salida):

- `router.navigate(['/weighing-exit', 'client'], { queryParams: { mode: 'continue-double-trailer-exit', folio: operation.folio } });`

### 4.3 Pantalla de búsqueda “continuar”

- **Opción A**: Un solo **`/continue-double-trailer`** con pestañas o selector “Entrada pendiente” / “Salida pendiente”. Según la pestaña se llama a:
  - Entrada: `GET .../entry/double-trailer/pending/search`
  - Salida: `GET .../exit/double-trailer/pending/search`
- **Opción B**: Ruta separada **`/continue-double-trailer-exit`** que solo busque salidas pendientes y redirija a weighing-exit con `mode=continue-double-trailer-exit&folio=...`.

Ambas opciones reutilizan el mismo formulario de salida para el segmento 2.

---

## 5. Datos y mapeos de salida (remolque 1 vs remolque 2)

### 5.1 Por remolque (WeighingRemolque)

Hoy en salida completa solo se persiste en cada remolque (desde `RemolqueExitDataDto`):

- `PesoTara` (peso de salida del remolque, según contrato actual)
- `FotoCargaCapturada` (y fotos asociadas vía `ProcessDoubleTrailerExitPhotosFromRequestAsync`)

Para **trazabilidad en dos tiempos** conviene guardar quién y cuándo registró la salida de cada remolque:

| Campo (nuevo en WeighingRemolque)           | Uso                                                      |
| ------------------------------------------- | -------------------------------------------------------- |
| `FechaSalida` (DATETIME2, null)             | Fecha/hora en que se registró la salida de ese remolque. |
| `RegistradoPorSalida` (NVARCHAR(255), null) | Usuario (email) que registró la salida de ese remolque.  |

Pesos y fotos:

- **Remolque 1 (salida parcial)**: `PesoTara` (peso salida R1), fotos salida R1, `FechaSalida`, `RegistradoPorSalida`.
- **Remolque 2 (continue)**: mismo para R2.

A nivel **operación** (`WeighingOperation`):

- En **salida parcial**: no escribir (o dejar null) `ExitWeight`, `ExitDate`, `ExitRegisteredBy` hasta completar.
- En **continue**: asignar `ExitWeight` = suma de pesos de salida de R1 y R2, `ExitDate` (p. ej. última de los dos), `ExitRegisteredBy` (p. ej. usuario que registró R2), `NetWeight`.

### 5.2 DTOs sugeridos (backend)

- **CreatePartialDoubleTrailerExitRequest**: `Folio`, `PlacaTrailer`, `Remolque1` (Placa, PesoTara/peso salida, fotos), `FechaSalida` (opcional, por defecto servidor).
- **ContinueDoubleTrailerExitRequest**: `Folio`, `Remolque2` (Placa, PesoTara/peso salida, fotos), `FechaSalida` (opcional).
- **PartialDoubleTrailerExitResponseDto** / **PendingDoubleTrailerExitSearchResultDto**: análogos a los de entrada (folio, placas, fecha/usuario salida R1, producto, cliente, etc.) para listar y mostrar resumen en el formulario de continue.

---

## 6. Cambios mínimos requeridos (backend y frontend)

### 6.1 Backend

1. **Base de datos**
   - Migración (manual_migrations.sql o nueva versión): en `WeighingRemolques` agregar `FechaSalida` (DATETIME2 NULL), `RegistradoPorSalida` (NVARCHAR(255) NULL).

2. **Dominio**
   - `WeighingRemolque`: propiedades `FechaSalida` (DateTime?), `RegistradoPorSalida` (string?).

3. **DTOs**
   - `CreatePartialDoubleTrailerExitRequest`, `RemolqueExitDataDto` (reutilizar o extender el existente para partial).
   - `ContinueDoubleTrailerExitRequest` (solo folio + remolque2).
   - `PartialDoubleTrailerExitResponseDto`, `PendingDoubleTrailerExitSearchResultDto` para búsqueda y detalle por folio.

4. **Repositorio**
   - Reutilizar `SearchPendingDoubleTrailersAsync(searchTerm, limit, status)` con `status = "SALIDA_PARCIAL_R1"` para salidas pendientes.
   - Nuevo método `GetPendingDoubleTrailerExitByFolioAsync(string folio)` que devuelva operación con `Status == "SALIDA_PARCIAL_R1"` y `TipoUnidad == "doble-remolque"` (o ampliar `GetPendingDoubleTrailerByFolioAsync` con parámetro opcional `status`).

5. **Servicio de aplicación**
   - `CreatePartialDoubleTrailerExitAsync(CreatePartialDoubleTrailerExitRequest)`: validar entrada, actualizar solo remolque 1, fotos, estado `SALIDA_PARCIAL_R1`.
   - `ContinueDoubleTrailerExitAsync(ContinueDoubleTrailerExitRequest)`: validar `SALIDA_PARCIAL_R1`, actualizar remolque 2, calcular totales, estado `SALIDA_REGISTRADA` (o `SALIDA_COMPLETA`).
   - `SearchPendingDoubleTrailerExitsAsync(searchTerm, limit)`: llamar al repositorio con `SALIDA_PARCIAL_R1`.
   - `GetPendingDoubleTrailerExitByFolioAsync(folio)`: para cargar el formulario “continue” en exit.

6. **API**
   - `POST /api/weighing/exit/double-trailer/partial`
   - `POST /api/weighing/exit/double-trailer/continue`
   - `GET /api/weighing/exit/double-trailer/pending/search?searchTerm=&limit=`
   - `GET /api/weighing/exit/double-trailer/pending/{folio}`

7. **Contratos actuales**
   - Mantener `POST /api/weighing/exit/double-trailer` (salida completa de una vez) sin cambios; la salida en dos tiempos es un flujo adicional.

### 6.2 Frontend

1. **weighing-exit-form**
   - En `ngOnInit` (o equivalente), leer `queryParams`: si `mode=continue-double-trailer-exit` y `folio`, llamar a `loadPartialExitOperationForContinue(folio)`.
   - `loadPartialExitOperationForContinue(folio)`: GET pending exit por folio, rellenar entrada encontrada, marcar “solo remolque 2” (resumen R1, formulario R2), guardar `currentOperationFolio` (o similar).
   - Al guardar: si existe `currentOperationFolio` en modo continue, llamar a `submitContinueDoubleTrailerExit()` en lugar de `createDoubleTrailerExit` completo.
   - Botón **“Guardar salida Remolque 1 y continuar después”**: visible cuando es doble remolque y solo remolque 1 está completo (peso + fotos R1). Al hacer clic, llamar a `createPartialDoubleTrailerExit()` (nuevo método del servicio) y redirigir a dashboard o a “continuar doble remolque”.

2. **continue-double-trailer** (o nueva pantalla salida)
   - Añadir soporte para “Salida pendiente”: llamar a `searchPendingDoubleTrailerExits(searchTerm)` y, al seleccionar, navegar a `/weighing-exit/client?mode=continue-double-trailer-exit&folio=...`.

3. **real-weighing.service**
   - `createPartialDoubleTrailerExit(request)` → POST exit/double-trailer/partial.
   - `continueDoubleTrailerExit(request)` → POST exit/double-trailer/continue.
   - `searchPendingDoubleTrailerExits(searchTerm, limit)` → GET exit/double-trailer/pending/search.
   - `getPendingDoubleTrailerExitByFolio(folio)` → GET exit/double-trailer/pending/{folio}.

4. **Guard**
   - Si existe ruta directa a weighing-exit con `mode=continue-double-trailer-exit` y `folio`, permitir acceso sin exigir el flujo “buscar entrada” previo (análogo a entry).

---

## 7. Validación de no impacto

- **Flujo normal (remolque único)**: No usa doble remolque ni estados `SALIDA_PARCIAL_R1`; sin cambios.
- **Salida doble remolque de una vez**: Sigue usando `POST /api/weighing/exit/double-trailer`; sin cambios de contrato.
- **Validaciones existentes**: Mismas validaciones de folio, placas y estado; solo se añaden validaciones para `SALIDA_PARCIAL_R1` en el endpoint “continue”.
- **Reportes / ticket**: Al final la operación queda en `SALIDA_REGISTRADA` (o `SALIDA_COMPLETA`) con todos los datos; el ticket/PDF se puede generar igual que hoy al completar la salida.

---

## 8. Tareas de implementación (checklist)

### Backend

- [ ] Migración: columnas `FechaSalida`, `RegistradoPorSalida` en `WeighingRemolques`.
- [ ] Dominio: `WeighingRemolque` + propiedades anteriores.
- [ ] DTOs: CreatePartialDoubleTrailerExitRequest, ContinueDoubleTrailerExitRequest, PartialDoubleTrailerExitResponseDto, PendingDoubleTrailerExitSearchResultDto.
- [ ] Repositorio: método(s) búsqueda/obtención por folio con `SALIDA_PARCIAL_R1`.
- [ ] WeighingApplicationService: CreatePartialDoubleTrailerExitAsync, ContinueDoubleTrailerExitAsync, SearchPendingDoubleTrailerExitsAsync, GetPendingDoubleTrailerExitByFolioAsync.
- [ ] IWeighingApplicationService: firmas de los nuevos métodos.
- [ ] WeighingController: 4 endpoints (partial, continue, pending/search, pending/{folio}).
- [ ] Procesamiento de fotos de salida parcial/continue (reutilizar/adaptar lógica existente).

### Frontend

- [ ] real-weighing.service: createPartialDoubleTrailerExit, continueDoubleTrailerExit, searchPendingDoubleTrailerExits, getPendingDoubleTrailerExitByFolio.
- [ ] weighing-exit-form: detección de `mode=continue-double-trailer-exit` y `folio`; loadPartialExitOperationForContinue; submitContinueDoubleTrailerExit; botón “Guardar salida Remolque 1 y continuar después”.
- [ ] continue-double-trailer: soporte “Salida pendiente” (búsqueda + redirección con query params) o nueva ruta/componente para salida.
- [ ] weighing-flow.guard (si aplica): permitir acceso directo a weighing-exit con mode + folio.
- [ ] Tipos TypeScript (weighing.types.ts o real-weighing.service): interfaces para request/response de salida parcial/continue.

### Pruebas y documentación

- [ ] Pruebas manuales: salida parcial R1 → búsqueda → continue R2 → ticket/PDF.
- [ ] Verificar que salida normal (remolque único y doble remolque de una vez) no se ve afectada.
- [ ] Actualizar documentación (por ejemplo IMPLEMENTACION_DOBLE_REMOLQUE_INTERRUMPIBLE.md) con la sección de salida.

---

**Resumen**: La salida en dos tiempos replica el patrón de la entrada: creación parcial (solo R1), pantalla de búsqueda/continuación y reutilización del formulario de salida en modo “continue” para R2, con estados `SALIDA_PARCIAL_R1` y `SALIDA_REGISTRADA`/`SALIDA_COMPLETA`, y trazabilidad por remolque con `FechaSalida` y `RegistradoPorSalida` en `WeighingRemolque`.
