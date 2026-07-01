import { IClientOptions } from 'mqtt/*';

export const MqqtOptions: IClientOptions = {
    protocol: 'wss',
    host: import.meta.env.VITE_MQTT_HOST,
    hostname: import.meta.env.VITE_MQTT_HOST,
    path: '/ws/',
    port: import.meta.env.VITE_MQTT_PORT,
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD,
    rejectUnauthorized: false,
};
