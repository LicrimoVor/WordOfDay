import { MAX_COUNT } from '@/shared/const/settings';
import { useEffect } from 'react';
import { layoutWordsRadial } from './super_libs';

type MqttValue = { text: string; count: number };
type MqttData = Record<string, MqttValue>;

export type DataWord = Record<
    string,
    {
        text: string;
        count: number;
        pos: [number, number];
        time_st: number;
    }
>;

export function useUpdateData(
    mqttData: MqttData,
    delTime: number,
    wordData: DataWord,
    refDiv: React.RefObject<HTMLDivElement>,
    setWordData: (data: DataWord) => void,
) {
    useEffect(() => {
        const container = refDiv.current;
        if (!container) return;

        const updatedData: DataWord = { ...wordData };

        // Удаляем слова, которых нет в новых данных
        Object.keys(updatedData).forEach((key) => {
            if (!mqttData[key]) {
                delete updatedData[key];
            }
        });

        const wordsList = Object.entries(mqttData).map(([key, value]) => ({
            key,
            text: value.text,
            count: value.count,
        }));

        const newPositions = layoutWordsRadial(refDiv.current!, wordsList);

        Object.entries(mqttData).forEach(([key, value]) => {
            const prev = updatedData[key];
            const pos = newPositions[key];

            updatedData[key] = {
                text: value.text,
                count: value.count,
                pos,
                time_st: delTime,
            };
        });

        setWordData(updatedData);
    }, [mqttData]);
}
