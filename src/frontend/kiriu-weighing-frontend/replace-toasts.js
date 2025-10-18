const fs = require('fs');

// Archivo a procesar
const filePath = process.argv[2];

if (!filePath) {
  console.error('Por favor proporciona la ruta del archivo');
  process.exit(1);
}

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf-8');

// Reemplazos más flexibles para manejar multilinea
const replacements = [
  // showInfoToast con multilinea
  {
    pattern: /this\.messageService\.showInfoToast\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`]),[\s\S]*?position:\s*['"]top-right['"][\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('info', '${title}', ${message})`;
    }
  },
  // showSuccessToast con multilinea
  {
    pattern: /this\.messageService\.showSuccessToast\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`]),[\s\S]*?position:\s*['"]top-right['"][\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('success', '${title}', ${message})`;
    }
  },
  // showErrorToast con multilinea
  {
    pattern: /this\.messageService\.showErrorToast\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`]),[\s\S]*?position:\s*['"]top-right['"][\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('error', '${title}', ${message})`;
    }
  },
  // showWarningToast con multilinea
  {
    pattern: /this\.messageService\.showWarningToast\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`]),[\s\S]*?position:\s*['"]top-right['"][\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('warn', '${title}', ${message})`;
    }
  },
  // showInfo sin Toast con multilinea
  {
    pattern: /this\.messageService\.showInfo\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`])[\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('info', '${title}', ${message})`;
    }
  },
  // showSuccess sin Toast con multilinea
  {
    pattern: /this\.messageService\.showSuccess\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`])[\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('success', '${title}', ${message})`;
    }
  },
  // showError sin Toast con multilinea
  {
    pattern: /this\.messageService\.showError\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`])[\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('error', '${title}', ${message})`;
    }
  },
  // showWarning sin Toast con multilinea
  {
    pattern: /this\.messageService\.showWarning\(\{[\s\S]*?title:\s*['"]([^'"]+)['"],[\s\S]*?message:\s*(['"`][^'"`]+['"`])[\s\S]*?\}\)/g,
    replacement: (match, title, message) => {
      return `this.showToast('warn', '${title}', ${message})`;
    }
  },
];

// Aplicar reemplazos
replacements.forEach(({pattern, replacement}) => {
  content = content.replace(pattern, replacement);
});

// Escribir el archivo
fs.writeFileSync(filePath, content, 'utf-8');
console.log(`✅ Reemplazos completados en: ${filePath}`);
