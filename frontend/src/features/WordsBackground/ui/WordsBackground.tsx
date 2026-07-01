import { CSSProperties, FC, memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { getRoom, RoomPublic, WordView } from '@/shared/api/client';

import { getColor } from '../model/libs/getColor';
import { layoutWordsRadial, Pos } from '../model/libs/super_libs';

import './WordsBackground.css';

interface WordsBackgroundProps {
    roomId: string;
}

function limitString(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function roomPath(roomId: string, suffix = '') {
    const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${base}/room/${roomId}${suffix}`;
}

export const WordsBackground: FC<WordsBackgroundProps> = memo(({ roomId }) => {
    const [room, setRoom] = useState<RoomPublic | null>(null);
    const [error, setError] = useState('');
    const [positions, setPositions] = useState<Record<string, Pos>>({});
    const refDiv = useRef<HTMLDivElement>(null);

    const loadRoom = useCallback(async () => {
        try {
            const nextRoom = await getRoom(roomId);
            setRoom(nextRoom);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Комната недоступна');
        }
    }, [roomId]);

    const updatePositions = useCallback((words: WordView[]) => {
        if (!refDiv.current) {
            return;
        }

        const nextPositions = layoutWordsRadial(
            refDiv.current,
            words.map((word) => ({
                key: word.id,
                text: word.text,
                count: word.score,
            })),
        );
        setPositions(nextPositions);
    }, []);

    useEffect(() => {
        loadRoom();
        const intervalId = window.setInterval(loadRoom, 1200);
        return () => window.clearInterval(intervalId);
    }, [loadRoom]);

    useEffect(() => {
        if (room) {
            updatePositions(room.words);
        }
    }, [room, updatePositions]);

    useEffect(() => {
        const onResize = () => {
            if (room) {
                updatePositions(room.words);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [room, updatePositions]);

    if (error) {
        return (
            <div className="WordsBackground WordsBackground_state">
                <h1>{error}</h1>
                <a href={roomPath('', '').replace('/room/', '/')}>Создать новую комнату</a>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="WordsBackground WordsBackground_state">
                <h1>Загрузка комнаты...</h1>
            </div>
        );
    }

    const { config } = room;
    const coverUrl = config.cover_url?.trim();
    const backgroundImage = coverUrl
        ? `linear-gradient(rgba(255,255,255,${config.cover_overlay}), rgba(255,255,255,${config.cover_overlay})), url(${coverUrl})`
        : undefined;

    return (
        <div
            ref={refDiv}
            className="WordsBackground"
            style={{
                backgroundColor: config.background_color,
                backgroundImage,
                '--accent-color': config.accent_color,
            } as CSSProperties}
        >
            <header className="WordsBackground__header">
                <span>{room.id}</span>
                <h1>{config.title}</h1>
            </header>

            <div className="WordsBackground__field">
                {room.words.map((word) => {
                    const pos = positions[word.id];
                    if (!pos) {
                        return null;
                    }

                    const count = Math.max(word.score, 0);
                    const fontSize = Math.max(18, Math.min(132, 16 + (count / config.max_points) * 104));
                    const color = getColor(
                        count,
                        0,
                        config.max_points,
                        config.word_color_min,
                        config.word_color_mid,
                        config.word_color_max,
                    );
                    const top = `${Math.min(Math.max(pos[1], 4), 86)}%`;
                    const left = `${Math.min(Math.max(pos[0], 5), 82)}%`;
                    const isShaking = count >= config.shake_threshold;

                    return (
                        <motion.div
                            key={word.id}
                            className="WordsBackground__word"
                            style={{
                                top,
                                left,
                                fontSize,
                                color,
                            }}
                            animate={{
                                y: isShaking ? [0, -4, 0] : [0],
                                scale: isShaking ? [1, 1.06, 1] : [1],
                            }}
                            transition={{
                                repeat: isShaking ? Infinity : 0,
                                duration: isShaking ? 1.2 : 0.2,
                            }}
                        >
                            {limitString(word.text, config.max_word_length)}
                        </motion.div>
                    );
                })}
            </div>

            {config.show_stats && (
                <aside className="WordsBackground__stats">
                    <span>Активны: {room.stats.active_users}</span>
                    <span>Отправлено: {room.stats.accepted_submissions}</span>
                    <span>Фильтр: {room.stats.bad_word_attempts}</span>
                </aside>
            )}

            {config.show_qr_hint && (
                <footer className="WordsBackground__hint">
                    <span>{roomPath(room.id, '/send')}</span>
                </footer>
            )}
        </div>
    );
});
