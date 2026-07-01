import { TConfig } from '@/shared/types/config';
import { MqttClient } from 'mqtt';

export const subscribeConfig = (client: MqttClient, setConfig: (data: TConfig) => void) => {
    client.subscribe('words/config', { qos: 1 });
    client.on('message', (topic, message) => {
        if (topic != 'words/config') return;
        const str = message.toString();
        const fixed = str.replace(/'/g, '"');
        setConfig(JSON.parse(fixed));
    });
};
