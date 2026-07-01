import { FC, memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { useGlobalContext } from '@/shared/contex/contex';
import { Data, MAX_COUNT, THRESHOLD, TIME_STEP } from '@/shared/const/settings';

import { subscribeWord } from '../model/services/subscribeWord';
import { getColor } from '../model/libs/getColor';
import { getShakingPos } from '../model/libs/getShakingPos';

import './WordsBackground.css';
import { DataWord, useUpdateData } from '../model/libs/useUpdateData';

interface WordsBackgroundProps {
    className?: string;
}

function limitString(str: string, maxLength: number): string {
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

/** Станция по имени */
export const WordsBackground: FC<WordsBackgroundProps> = memo((props: WordsBackgroundProps) => {
    const {
        state: { statusMqtt, client },
    } = useGlobalContext();
    const [mqttData, setMqttData] = useState<
        Record<
            number,
            {
                text: string;
                count: number;
            }
        >
    >({});
    const [wordData, setWordData] = useState<DataWord>({});
    const [delTime, setDelTime] = useState(0);
    const refDiv = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (statusMqtt !== 'ready' || client === undefined) {
            return;
        }
        subscribeWord(client, setMqttData);
    }, [client, statusMqtt, setMqttData]);

    // @ts-ignore
    useUpdateData(mqttData, delTime, wordData, refDiv, setWordData);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDelTime(delTime + 0.1);
        }, TIME_STEP);
        return () => clearTimeout(timeoutId);
    }, [delTime, setDelTime]);

    return (
        <div ref={refDiv} className="WordsBackground">
            {Object.entries(wordData).map(([word, value], i) => {
                if (refDiv.current == undefined || value.pos == undefined) return;
                const windowWidth = refDiv.current?.clientWidth;
                const count = Math.max(value.count - delTime + value.time_st, 0);
                if (count === 0) {
                    return;
                }
                const size = 14 + ((count / MAX_COUNT) * windowWidth) / 25;
                const color = getColor(count, 0, MAX_COUNT);
                const top = `${5 + Math.min(Math.max(value.pos[1], 0), 80)}%`;
                const left = `${10 + Math.min(Math.max(value.pos[0], 0), 70)}%`;
                const duration = 1 + ((count - THRESHOLD) / (MAX_COUNT - THRESHOLD) / 100) * 3;
                const isShaking = count >= THRESHOLD;

                return (
                    <>
                        <motion.div
                            key={i}
                            className="absolute select-none"
                            style={{
                                position: 'fixed',
                                top,
                                left,
                                fontSize: size,
                                color,
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}
                            animate={{
                                y: isShaking ? [0, -3, 0] : [0],
                                scale: isShaking ? [1, 1.05, 1] : [1],
                                color: isShaking
                                    ? ['#fe0', '#fb0', '#f00', '#f00', '#fb0', '#fe0']
                                    : [color],
                            }}
                            layout
                            transition={
                                isShaking
                                    ? {
                                          repeat: Infinity,
                                          duration,
                                          layout: {
                                              duration: 1.2,
                                              ease: 'easeInOut',
                                          },
                                      }
                                    : {
                                          layout: {
                                              duration: 1.2,
                                              ease: 'easeInOut',
                                          },
                                      }
                            }
                        >
                            {limitString(value.text, 15)}
                        </motion.div>
                        {/* {count >= THRESHOLD && (
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    top,
                                    left,
                                    width: windowWidth,
                                    height: 20,
                                    borderRadius: '50%',
                                    background:
                                        'linear-gradient(to top, orange, yellow, transparent)',
                                    transform: 'translateX(-50%)',
                                    pointerEvents: 'none',
                                    zIndex: -1,
                                }}
                                animate={{
                                    y: [0, -4, 0],
                                    scaleY: [0.8, 1.2, 0.8],
                                    opacity: [0.7, 1, 0.7],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        )} */}
                    </>
                );
            })}
        </div>
    );
});
