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

  // Usar la IP del servidor en lugar de localhost para permitir acceso desde red local
  apiUrl: 'http://192.168.110.91:5000/KiriuWeighingAPI/api',
  hubUrl: 'http://192.168.110.91:5000/KiriuWeighingAPI/hubs',

  serialGatewayUrl: 'http://172.16.193.176:5080',

  apiTimeout: 30000,

  cargoCamera: {
    url: 'http://192.168.1.49/ISAPI/Streaming/channels/1/picture',
    username: 'admin',
    password: 'Admin123',
  },
};
