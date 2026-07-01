import { Data } from '@/shared/const/settings';
import { MqttClient } from 'mqtt';

export const subscribeWord = (client: MqttClient, setData: (data: Data) => void) => {
    client.subscribe('words/data', { qos: 1 });
    client.on('message', (topic, message) => {
        if (topic != 'words/data') return;
        const str = message.toString();
        const fixed = str.replace(/'/g, '"');
        setData(JSON.parse(fixed));
    });
};
