import { CSSProperties, FC, FormEvent, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getRoom, RoomPublic, submitWord } from '@/shared/api/client';

import './FormPage.css';

export const FormPage: FC = memo(() => {
    const { roomId } = useParams();
    const [room, setRoom] = useState<RoomPublic | null>(null);
    const [text, setText] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [isPending, setIsPending] = useState(false);

    const loadRoom = useCallback(async () => {
        if (!roomId) {
            return;
        }

        try {
            setRoom(await getRoom(roomId));
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Комната недоступна');
        }
    }, [roomId]);

    useEffect(() => {
        loadRoom();
        const intervalId = window.setInterval(loadRoom, 1200);
        return () => window.clearInterval(intervalId);
    }, [loadRoom]);

    useEffect(() => {
        const intervalId = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(intervalId);
    }, []);

    const cooldownLeft = useMemo(() => {
        return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
    }, [cooldownUntil, now]);

    const formEffects = useMemo(() => {
        return room?.active_effects.filter((effect) => effect.effect === 'form_text') || [];
    }, [room]);

    const isFinished = Boolean(room?.config.is_finished);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!roomId || !text.trim() || isPending || cooldownLeft > 0 || isFinished) {
            return;
        }

        setIsPending(true);
        setMessage('');
        setError('');

        try {
            const response = await submitWord(roomId, text);
            setMessage(response.message);
            setRoom((currentRoom) =>
                currentRoom
                    ? {
                          ...currentRoom,
                          words: response.words,
                          stats: response.stats,
                          active_effects: response.active_effects,
                      }
                    : currentRoom,
            );
            if (response.accepted) {
                setText('');
                if (room?.config.cooldown_seconds) {
                    setCooldownUntil(Date.now() + room.config.cooldown_seconds * 1000);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось отправить слово');
        } finally {
            setIsPending(false);
        }
    };

    if (!roomId) {
        return null;
    }

    if (error && !room) {
        return (
            <main className="FormPage FormPage_state">
                <h1>{error}</h1>
                <Link to="/">Создать комнату</Link>
            </main>
        );
    }

    const title = room?.config.title || 'Слово дня';
    const maxLength = room?.config.max_word_length || 24;

    return (
        <main
            className="FormPage"
            style={
                {
                    '--accent-color': room?.config.word_color_max || '#1c7c54',
                    backgroundColor: room?.config.background_color || '#f7fbf8',
                } as CSSProperties
            }
        >
            <section className="FormPage__shell">
                <div className="FormPage__title">
                    <span>{roomId}</span>
                    <h1>{title}</h1>
                </div>

                {formEffects.length > 0 && (
                    <div className="FormPage__effects">
                        {formEffects.map((effect) => (
                            <p key={effect.id}>{effect.text}</p>
                        ))}
                    </div>
                )}

                {isFinished && <p className="FormPage__message">Комната завершена, отправка закрыта</p>}

                <form className="FormPage__form" onSubmit={onSubmit}>
                    <label>
                        Ваше слово
                        <input
                            value={text}
                            disabled={isFinished}
                            maxLength={maxLength}
                            autoComplete="off"
                            placeholder="Напишите коротко"
                            onChange={(event) => setText(event.target.value)}
                        />
                    </label>
                    <button disabled={isPending || !text.trim() || cooldownLeft > 0 || isFinished} type="submit">
                        {isFinished
                            ? 'Завершено'
                            : cooldownLeft > 0
                              ? `Подождите ${cooldownLeft}`
                              : isPending
                                ? 'Отправка...'
                                : 'Отправить'}
                    </button>
                </form>

                {(message || error) && (
                    <p className={error ? 'FormPage__message FormPage__message_error' : 'FormPage__message'}>
                        {error || message}
                    </p>
                )}

                {room && (
                    <div className="FormPage__stats">
                        <span>Принято: {room.stats.accepted_submissions}</span>
                        <span>Активны: {room.stats.active_users}</span>
                    </div>
                )}
            </section>
        </main>
    );
});
