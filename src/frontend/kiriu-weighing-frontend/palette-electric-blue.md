# 🎨 Paleta de Colores — Sistema Azul Eléctrico

Esta paleta está basada en la combinación **azul eléctrico + verde lima** con fondo oscuro profundo, orientada a un diseño moderno, contrastante y tecnológico.

---

## 🌈 Paleta de Marca (Identidad Visual)

| Rol | Hex | Descripción | Uso recomendado |
|------|------|--------------|----------------|
| **Primario (`brand-primary`)** | `#0041F2` | Azul intenso tecnológico, comunica confianza, precisión y energía. | Botones principales, encabezados, vínculos, acentos visuales. |
| **Secundario (`brand-secondary`)** | `#BFEB30` | Verde lima brillante que genera contraste moderno con el azul. | Botones secundarios, íconos activos, indicadores, hover states. |
| **Fondo oscuro (`brand-dark`)** | `#0A1E33` | Azul petróleo profundo; transmite elegancia, profundidad y solidez. | Encabezados oscuros, barras de navegación, secciones premium. |
| **Fondo claro (`brand-light`)** | `#FFFFFF` | Blanco puro para máximo contraste. | Fondos de páginas, tarjetas, formularios, áreas neutras. |
| **Neutro (`brand-neutral`)** | `#E6EAF1` | Gris azulado derivado del primario. | Bordes, divisores, superficies secundarias. |

**Tono general:**  
Equilibra **tecnología + frescura + autoridad**, con un contraste visual fuerte pero sobrio. El verde lima aporta dinamismo sin perder elegancia.

---

## 🧭 Paleta Semántica (Acciones y Estados)

| Estado | Color base | Hex | Variante fondo | Descripción |
|--------|-------------|------|----------------|--------------|
| **Success** | Verde lima derivado | `#B8E92E` | `#F4FBE4` | Mensajes de éxito, confirmaciones, barras de progreso. |
| **Warning** | Amarillo dorado equilibrado | `#FFD93B` | `#FFF9E0` | Alertas leves, validaciones parciales, avisos preventivos. |
| **Error** | Rojo carmín sobrio | `#E54848` | `#FFECEC` | Errores de validación, estados críticos. |
| **Info** | Azul brillante derivado del primario | `#1F6BFF` | `#E8F1FF` | Mensajes informativos, banners de ayuda, tooltips. |
| **Neutral / Secondary** | Gris azulado neutro | `#D4D9E2` | `#F5F6F9` | Estados inactivos, loading placeholders, bordes suaves. |

---

## 💡 Recomendaciones de Uso

- **Primario (azul)** domina el 60–70% de los elementos activos.  
- **Secundario (verde)** se usa como acento o refuerzo visual.  
- **Fondo oscuro (`#0A1E33`)** ideal para headers o modo oscuro.  
- **Semántica** debe integrarse con transparencia (`rgba(..., 0.1)`) para mantener elegancia.  
- **Contraste** alto entre `#0041F2` y `#BFEB30` favorece microinteracciones (hover/focus).

---

## 🎨 Tokens CSS Sugeridos

```css
:root {
  /* Brand */
  --brand-primary: #0041F2;
  --brand-secondary: #BFEB30;
  --brand-dark: #0A1E33;
  --brand-light: #FFFFFF;
  --brand-neutral: #E6EAF1;

  /* Semantic */
  --success: #B8E92E;
  --success-bg: #F4FBE4;
  --warning: #FFD93B;
  --warning-bg: #FFF9E0;
  --error: #E54848;
  --error-bg: #FFECEC;
  --info: #1F6BFF;
  --info-bg: #E8F1FF;
  --neutral: #D4D9E2;
  --neutral-bg: #F5F6F9;
}
```

---

📘 **Versión:** 1.0  
📅 **Fecha:** Octubre 2025  
👤 **Autor:** Diseño de Experiencia — Gamaliel Araneda  
