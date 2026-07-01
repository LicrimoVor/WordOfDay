import { Data } from '@/shared/const/settings';
import { MqttClient } from 'mqtt';

function cleanText(input: string): string {
    // Оставляем только русские (А-Я, а-я, Ё, ё) и английские (A-Z, a-z) буквы
    return input.replace(/[^a-zA-Zа-яА-ЯёЁ ]/g, '');
}

export const subscribeWord = (client: MqttClient, setData: (data: Data) => void) => {
    client.subscribe('words/data', { qos: 1 });
    client.on('message', (_, message) => {
        const str = message.toString();
        const fixed = str.replace(/'/g, '"'); // заменяем одинарные кавычки на двойные
        setData(JSON.parse(fixed));
    });
};
