import { CSSProperties, FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

    const updatePositions = useCallback((words: WordView[], nextRoom: RoomPublic) => {
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
            nextRoom.config.max_points,
            nextRoom.config.letter_scale,
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
            updatePositions(room.words, room);
        }
    }, [room, updatePositions]);

    useEffect(() => {
        const onResize = () => {
            if (room) {
                updatePositions(room.words, room);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [room, updatePositions]);

    const resultWords = useMemo(() => {
        return room ? [...room.words].sort((a, b) => b.raw_score - a.raw_score) : [];
    }, [room]);

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
    const activeMainEffects = room.active_effects.filter(
        (effect) => effect.effect === 'main_image' || effect.effect === 'main_text',
    );
    const maxResultScore = Math.max(1, ...resultWords.map((word) => word.raw_score));

    return (
        <div
            ref={refDiv}
            className={config.is_finished ? 'WordsBackground WordsBackground_finished' : 'WordsBackground'}
            style={
                {
                    backgroundColor: config.background_color,
                    backgroundImage,
                    '--accent-color': config.word_color_max,
                } as CSSProperties
            }
        >
            <header className="WordsBackground__header">
                <span>{room.id}</span>
                <h1>{config.title}</h1>
            </header>

            {config.is_finished ? (
                <section className="WordsBackground__results">
                    <div className="WordsBackground__resultTitle">
                        <span>Итоги</span>
                        <h2>Статистика слов</h2>
                    </div>

                    <div className="WordsBackground__summary">
                        <strong>
                            {room.stats.total_submissions}
                            <span>всего сообщений</span>
                        </strong>
                        <strong>
                            {room.stats.accepted_submissions}
                            <span>принято слов</span>
                        </strong>
                        <strong>
                            {room.words.length}
                            <span>уникальных слов</span>
                        </strong>
                        <strong>
                            {room.stats.bad_word_attempts}
                            <span>попыток плохих слов</span>
                        </strong>
                    </div>

                    <div className="WordsBackground__bars">
                        {resultWords.length === 0 ? (
                            <p>Пока нет принятых слов</p>
                        ) : (
                            resultWords.slice(0, 24).map((word, index) => {
                                const percent = Math.max(3, (word.raw_score / maxResultScore) * 100);
                                return (
                                    <div key={word.id} className="WordsBackground__bar">
                                        <span>{index + 1}</span>
                                        <b>{limitString(word.text, config.max_word_length)}</b>
                                        <div>
                                            <i style={{ width: `${percent}%` }} />
                                        </div>
                                        <em>{Math.round(word.raw_score)}</em>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            ) : (
                <>
                    <div className="WordsBackground__field">
                        {room.words.map((word) => {
                            const pos = positions[word.id];
                            if (!pos) {
                                return null;
                            }

                            const count = Math.max(word.score, 0);
                            const fontSize = Math.max(
                                16,
                                Math.min(260, (16 + (count / config.max_points) * 104) * config.letter_scale),
                            );
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

                    {activeMainEffects.length > 0 && (
                        <div className="WordsBackground__effects">
                            {activeMainEffects.map((effect) =>
                                effect.effect === 'main_image' ? (
                                    <motion.div
                                        key={effect.id}
                                        className="WordsBackground__effectImage"
                                        initial={{ opacity: 0, y: -120 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {effect.image_url && <img alt="" src={effect.image_url} />}
                                        {effect.text && <strong>{effect.text}</strong>}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={effect.id}
                                        className="WordsBackground__effectText"
                                        initial={{ opacity: 0, y: -30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {effect.text}
                                    </motion.div>
                                ),
                            )}
                        </div>
                    )}
                </>
            )}

            {config.show_stats && !config.is_finished && (
                <aside className="WordsBackground__stats">
                    <span>Активны: {room.stats.active_users}</span>
                    <span>Отправлено: {room.stats.accepted_submissions}</span>
                    <span>Фильтр: {room.stats.bad_word_attempts}</span>
                </aside>
            )}

            {config.show_qr_hint && !config.is_finished && (
                <footer className="WordsBackground__hint">
                    <span>{roomPath(room.id, '/send')}</span>
                </footer>
            )}
        </div>
    );
});
