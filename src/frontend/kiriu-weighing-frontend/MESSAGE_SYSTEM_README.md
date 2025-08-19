# Sistema de Mensajes - Sistema de Pesaje Kiriu

## Descripción

Sistema completo de mensajes y notificaciones para el sistema de pesaje, implementado con PrimeNG y Angular. Permite mostrar mensajes de éxito, error, advertencia e información de manera fácil y reutilizable.

## 🚀 Características Principales

- ✅ **Mensajes Automáticos** para entradas y salidas del sistema de pesaje
- ✅ **Mensajes Personalizados** con título, mensaje y duración configurables
- ✅ **Múltiples Tipos** de mensajes (Éxito, Error, Advertencia, Información)
- ✅ **Toasts** (notificaciones emergentes) en diferentes posiciones
- ✅ **Duración Configurable** desde 1 segundo hasta 10 segundos
- ✅ **Diseño Responsivo** adaptable a diferentes tamaños de pantalla
- ✅ **Tema Kiriu** personalizado con colores corporativos
- ✅ **Fácil Integración** en cualquier componente de la aplicación

## 📁 Estructura de Archivos

```
src/app/shared/
├── services/
│   └── message.service.ts          # Servicio princiQuiero que implementes el uso del servicio NotificationService al registrar una entrada en Angular.

Contexto:
Ya tengo un servicio llamado NotificationService que usa PrimeNG para mostrar toasts con métodos:
- showSuccess(summary: string, detail: string)
- showError(summary: string, detail: string)

Necesito que en el componente de registro de entrada (`entrada.component.ts`) se invoque este servicio justo después de hacer la petición HTTP para guardar la entrada.

✅ Requisitos:
- Si el registro es exitoso (HTTP 200/201), debe mostrar:
  - summary: “Entrada registrada”
  - detail: “La operación se realizó correctamente.”
- Si ocurre un error (HTTP 4xx/5xx), debe mostrar:
  - summary: “Error al registrar”
  - detail: “No se pudo completar la operación.”

El método que realiza la llamada HTTP se llama `registrarEntrada()` y usa `this.http.post(...)`.

Usa `subscribe` con `next` y `error` para manejar la respuesta y mostrar el toast.pal de mensajes
└── components/
    ├── message-display/            # Componente de visualización
    │   ├── message-display.component.ts
    │   ├── message-display.component.html
    │   ├── message-display.component.scss
    │   └── index.ts
    └── message-demo/               # Componente de demostración
        ├── message-demo.component.ts
        ├── message-demo.component.html
        ├── message-demo.component.scss
        └── index.ts
```

## 🔧 Instalación y Configuración

### 1. Incluir el Componente de Visualización

El componente `app-message-display` debe estar incluido en tu aplicación principal:

```html
<!-- app.component.html -->
<app-message-display></app-message-display>

<!-- O en cualquier otro componente donde quieras mostrar mensajes -->
<app-message-display></app-message-display>
```

### 2. Importar el Servicio

```typescript
import { MessageService } from "./shared/services/message.service";

@Component({
  // ... configuración del componente
})
export class YourComponent {
  constructor(private messageService: MessageService) {}
}
```

## 📱 Uso del Servicio

### Mensajes del Sistema de Pesaje

#### Entrada Registrada con Éxito

```typescript
// Con número de placa
this.messageService.showEntrySuccess("ABC-123");
// Resultado: "Entrada registrada correctamente para la placa ABC-123."

// Sin número de placa
this.messageService.showEntrySuccess();
// Resultado: "Entrada registrada correctamente."
```

#### Salida Registrada con Éxito

```typescript
// Con número de placa
this.messageService.showExitSuccess("ABC-123");
// Resultado: "Salida registrada con éxito para la placa ABC-123."

// Sin número de placa
this.messageService.showExitSuccess();
// Resultado: "Salida registrada con éxito."
```

#### Error en Entrada

```typescript
// Con número de placa y mensaje personalizado
this.messageService.showEntryError("ABC-123", "Error de conexión con el servidor.");

// Con número de placa (mensaje por defecto)
this.messageService.showEntryError("ABC-123");

// Sin número de placa
this.messageService.showEntryError();
```

#### Error en Salida

```typescript
// Con número de placa y mensaje personalizado
this.messageService.showExitError("ABC-123", "Error al calcular el peso final.");

// Con número de placa (mensaje por defecto)
this.messageService.showExitError("ABC-123");

// Sin número de placa
this.messageService.showExitError();
```

### Mensajes Personalizados

#### Mensaje de Éxito

```typescript
this.messageService.showSuccess({
  title: "Operación Completada",
  message: "Los datos se han guardado correctamente.",
  duration: 5000, // 5 segundos (opcional)
  closable: true, // Permite cerrar manualmente (opcional)
});
```

#### Mensaje de Error

```typescript
this.messageService.showError({
  title: "Error de Validación",
  message: "Por favor complete todos los campos requeridos.",
  duration: 8000, // 8 segundos
  closable: true,
});
```

#### Mensaje de Advertencia

```typescript
this.messageService.showWarning({
  title: "Advertencia",
  message: "El peso está por debajo del mínimo recomendado.",
  duration: 6000,
});
```

#### Mensaje de Información

```typescript
this.messageService.showInfo({
  title: "Información",
  message: "El sistema se conectará automáticamente en 30 segundos.",
  duration: 4000,
});
```

### Toasts (Notificaciones Emergentes)

#### Toast de Éxito

```typescript
this.messageService.showSuccessToast({
  title: "Éxito",
  message: "Operación completada exitosamente.",
  duration: 5000,
  position: "top-right", // top-right, top-left, top-center, bottom-right, bottom-left, bottom-center
});
```

#### Toast de Error

```typescript
this.messageService.showErrorToast({
  title: "Error",
  message: "Ha ocurrido un error en la operación.",
  duration: 5000,
  position: "top-right",
});
```

### Mensajes Específicos del Sistema

#### Advertencia de Pesaje

```typescript
this.messageService.showWeighingWarning("El vehículo está sobrecargado. Verifique el peso máximo permitido.", "Sobrepeso Detectado");
```

#### Información de Pesaje

```typescript
this.messageService.showWeighingInfo("La báscula está calibrada y lista para operaciones.", "Estado del Sistema");
```

## 🎨 Personalización de Estilos

### Colores del Tema Kiriu

```scss
// Colores principales
$kiriu-blue: #398df1; // Azul principal
$kiriu-green: #1ee733; // Verde de éxito
$kiriu-red: #f70000; // Rojo de error
$kiriu-orange: #ff914d; // Naranja de advertencia

// Personalización de mensajes
:host ::ng-deep {
  .p-message,
  .p-toast-message {
    &.p-message-success,
    &.p-toast-message-success {
      border-left-color: #1ee733;

      .p-message-icon,
      .p-toast-message-icon {
        color: #1ee733;
      }
    }

    &.p-message-error,
    &.p-toast-message-error {
      border-left-color: #f70000;

      .p-message-icon,
      .p-toast-message-icon {
        color: #f70000;
      }
    }
  }
}
```

### Duración de Mensajes

```typescript
// Duración por defecto: 5 segundos
private defaultDuration = 5000;

// Personalizar duración
this.messageService.showSuccess({
  title: 'Éxito',
  message: 'Operación completada.',
  duration: 3000  // 3 segundos
});
```

## 🔄 Gestión de Mensajes

### Limpiar Mensajes

```typescript
// Limpiar todos los mensajes
this.messageService.clear();

// Limpiar mensajes por tipo
this.messageService.clearBySeverity("success"); // Solo éxitos
this.messageService.clearBySeverity("error"); // Solo errores
this.messageService.clearBySeverity("warn"); // Solo advertencias
this.messageService.clearBySeverity("info"); // Solo información
```

### Prevenir Duplicados

Los toasts tienen la opción `preventDuplicates` activada por defecto para evitar mensajes repetidos.

## 📱 Diseño Responsivo

### Breakpoints

```scss
// Mobile
@media (max-width: 768px) {
  .message-controls {
    bottom: 10px;
    right: 10px;
    left: 10px;

    .control-buttons {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }
  }
}
```

### Adaptaciones Móviles

- Controles de mensajes se adaptan a pantallas pequeñas
- Botones se apilan verticalmente en móviles
- Espaciado optimizado para dispositivos táctiles

## 🧪 Componente de Demostración

### Uso del Componente Demo

```typescript
import { MessageDemoComponent } from "./shared/components/message-demo";

// En tu routing o componente principal
<app-message-demo></app-message-demo>;
```

### Funcionalidades del Demo

- **Simulación de Operaciones**: Entrada y salida del sistema de pesaje
- **Mensajes Personalizados**: Con título, mensaje y duración configurables
- **Mensajes Predefinidos**: Ejemplos del sistema
- **Toasts**: Demostración de notificaciones emergentes
- **Documentación Integrada**: Guías de uso y ejemplos de código

## 🚀 Ejemplos de Implementación

### En un Componente de Pesaje

```typescript
import { Component } from "@angular/core";
import { MessageService } from "./shared/services/message.service";

@Component({
  selector: "app-weighing-form",
  templateUrl: "./weighing-form.component.html",
})
export class WeighingFormComponent {
  plateNumber: string = "";
  weight: number = 0;

  constructor(private messageService: MessageService) {}

  async registerEntry(): Promise<void> {
    try {
      // Mostrar mensaje de procesamiento
      this.messageService.showInfo({
        title: "Procesando",
        message: `Registrando entrada para la placa ${this.plateNumber}...`,
        duration: 2000,
      });

      // Simular operación asíncrona
      await this.weighingService.registerEntry(this.plateNumber, this.weight);

      // Mostrar mensaje de éxito
      this.messageService.showEntrySuccess(this.plateNumber);
    } catch (error) {
      // Mostrar mensaje de error
      this.messageService.showEntryError(this.plateNumber, error.message || "Error desconocido al registrar la entrada.");
    }
  }

  async registerExit(): Promise<void> {
    try {
      // Mostrar mensaje de procesamiento
      this.messageService.showInfo({
        title: "Procesando",
        message: `Registrando salida para la placa ${this.plateNumber}...`,
        duration: 2000,
      });

      // Simular operación asíncrona
      const finalWeight = await this.weighingService.registerExit(this.plateNumber);

      // Mostrar mensaje de éxito con información adicional
      this.messageService.showSuccess({
        title: "Salida Registrada",
        message: `Salida registrada con éxito. Peso final: ${finalWeight} kg.`,
        duration: 6000,
      });
    } catch (error) {
      // Mostrar mensaje de error
      this.messageService.showExitError(this.plateNumber, error.message || "Error desconocido al registrar la salida.");
    }
  }
}
```

### En un Servicio de API

```typescript
import { Injectable } from "@angular/core";
import { MessageService } from "./message.service";

@Injectable({
  providedIn: "root",
})
export class WeighingApiService {
  constructor(private messageService: MessageService) {}

  async processWeighingOperation(operation: WeighingOperation): Promise<void> {
    try {
      // Procesar operación
      const result = await this.api.post("/weighing", operation);

      // Mostrar mensaje de éxito
      if (operation.type === "entry") {
        this.messageService.showEntrySuccess(operation.plateNumber);
      } else {
        this.messageService.showExitSuccess(operation.plateNumber);
      }
    } catch (error) {
      // Mostrar mensaje de error
      if (operation.type === "entry") {
        this.messageService.showEntryError(operation.plateNumber, error.message);
      } else {
        this.messageService.showExitError(operation.plateNumber, error.message);
      }

      // Re-lanzar el error para que el componente pueda manejarlo
      throw error;
    }
  }
}
```

## 🔧 Configuración Avanzada

### Personalizar Posiciones de Toast

```typescript
// Posiciones disponibles
type ToastPosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";

// Ejemplo de uso
this.messageService.showSuccessToast({
  title: "Notificación",
  message: "Mensaje en la esquina inferior izquierda",
  position: "bottom-left",
  duration: 4000,
});
```

### Configurar Z-Index

```typescript
// En el componente message-display
<p-toast
  key="top-right"
  position="top-right"
  [baseZIndex]="1001"
  [autoZIndex]="true">
</p-toast>
```

### Animaciones Personalizadas

```scss
// Transiciones de entrada y salida
.p-toast-message-enter {
  transform: translateY(-20px);
  opacity: 0;
}

.p-toast-message-enter-active {
  transform: translateY(0);
  opacity: 1;
  transition: all 0.3s ease-out;
}

.p-toast-message-exit {
  transform: translateY(0);
  opacity: 1;
}

.p-toast-message-exit-active {
  transform: translateY(-20px);
  opacity: 0;
  transition: all 0.25s ease-in;
}
```

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Los mensajes no se muestran

**Solución:**

- Verificar que `app-message-display` esté incluido en el template
- Comprobar que el servicio esté inyectado correctamente
- Verificar que no haya errores en la consola del navegador

#### 2. Estilos no se aplican correctamente

**Solución:**

- Verificar que los estilos CSS estén importados
- Comprobar que no haya conflictos con otros estilos
- Verificar que `:host ::ng-deep` esté configurado correctamente

#### 3. Mensajes se superponen

**Solución:**

- Ajustar el `baseZIndex` en los componentes
- Verificar que `autoZIndex` esté activado
- Comprobar que no haya conflictos de z-index

### Logs y Debugging

```typescript
// Verificar que el servicio esté funcionando
console.log("MessageService loaded:", typeof this.messageService);

// Verificar mensajes en la consola
this.messageService.showInfo({
  title: "Debug",
  message: "Este es un mensaje de prueba",
  duration: 10000,
});
```

## 📚 Recursos Adicionales

### Documentación de PrimeNG

- [MessageService API](https://primeng.org/messageservice)
- [Toast Component](https://primeng.org/toast)
- [Message Component](https://primeng.org/message)

### Mejores Prácticas

1. **Usar mensajes específicos** para operaciones del sistema de pesaje
2. **Configurar duraciones apropiadas** según la importancia del mensaje
3. **Implementar manejo de errores** consistente en toda la aplicación
4. **Usar toasts** para notificaciones no críticas
5. **Mantener consistencia** en títulos y mensajes

## 🤝 Contribución

Para contribuir al sistema de mensajes:

1. Crear un issue describiendo la funcionalidad o bug
2. Implementar la solución siguiendo los estándares del proyecto
3. Probar con el componente de demostración
4. Documentar los cambios realizados

## 📄 Licencia

Este sistema de mensajes es parte del proyecto Sistema de Pesaje Kiriu y está sujeto a la misma licencia del proyecto principal.

---

**Nota**: Este sistema está optimizado para Angular 20+ y PrimeNG 20+. Para versiones anteriores, verificar compatibilidad en la documentación oficial.
