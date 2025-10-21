/**
 * CONFIGURACIÓN DE PRODUCCIÓN
 *
 * IMPORTANTE: Antes de publicar, actualiza estas URLs con los valores reales de tu servidor de producción.
 *
 * Puedes usar URLs relativas (recomendado) o URLs absolutas:
 * - Relativas: '/api' (se resuelven automáticamente al dominio actual)
 * - Absolutas: 'https://mi-servidor.com/api'
 */
export const environment = {
  production: true,

  // OPCIÓN 1: URLs relativas (recomendado - se ajustan al dominio actual)
  apiUrl: '/api',
  hubUrl: '/hubs',

  // OPCIÓN 2: URLs absolutas (descomentar y configurar si es necesario)
  // apiUrl: 'https://tu-servidor-produccion.com/api',
  // hubUrl: 'https://tu-servidor-produccion.com/hubs',

  // Serial Gateway URL (red local)
  serialGatewayUrl: 'http://192.168.110.91:5080',

  apiTimeout: 30000,

  cargoCamera: {
    // IMPORTANTE: Esta URL será visible en el código JavaScript del navegador
    // Considera mover las credenciales al backend mediante un proxy
    url: 'http://192.168.1.49/ISAPI/Streaming/channels/1/picture',
    username: 'admin',
    password: 'Admin123',
  },
};
