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

  apiUrl: 'http://localhost:5000/KiriuWeighingAPI/api',
  hubUrl: 'http://localhost:5000/KiriuWeighingAPI/hubs',

  serialGatewayUrl: 'http://192.168.110.91:5080',

  apiTimeout: 30000,

  cargoCamera: {
    url: 'http://192.168.1.49/ISAPI/Streaming/channels/1/picture',
    username: 'admin',
    password: 'Admin123',
  },
};
