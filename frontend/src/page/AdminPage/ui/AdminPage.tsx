import { CSSProperties, FC, FormEvent, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
    clearRoomWords,
    generateTestWords,
    getAdminRoom,
    loginAdmin,
    RoomAdmin,
    RoomConfig,
    Scenario,
    ScenarioTrigger,
    startNewRound,
    updateRoomConfig,
} from '@/shared/api/client';
import { getColor } from '@/features/WordsBackground/model/libs/getColor';
import { createQrMatrix } from '@/shared/lib/qr';

import './AdminPage.css';

const triggerLabels: Record<ScenarioTrigger, string> = {
    manual: 'Вручную',
    time: 'По времени',
    score: 'По очкам',
};

function tokenKey(roomId: string) {
    return `word-of-day-admin-token:${roomId}`;
}

function appBasePath() {
    return import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
}

function absoluteRoomUrl(path: string) {
    return `${window.location.origin}${appBasePath()}${path}`;
}

function defaultScenario(): Scenario {
    return {
        id: `scenario-${Date.now()}`,
        name: 'Новый сценарий',
        trigger: 'manual',
        message: '',
        boost: 0,
        active: true,
    };
}

function createQrSvg(value: string) {
    const matrix = createQrMatrix(value);
    const quietZone = 4;
    const size = matrix.length + quietZone * 2;
    const path = matrix
        .map((row, y) =>
            row
                .map((isDark, x) => (isDark ? `M${x + quietZone},${y + quietZone}h1v1h-1z` : ''))
                .join(''),
        )
        .join('');

    return {
        path,
        size,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path fill="#111" d="${path}"/></svg>`,
    };
}

function QrCode({ value }: { value: string }) {
    const qr = useMemo(() => {
        try {
            return { error: '', ...createQrSvg(value) };
        } catch {
            return { error: 'Ссылка слишком длинная для QR', path: '', size: 0, svg: '' };
        }
    }, [value]);

    if (qr.error) {
        return <div className="AdminPage__qrError">{qr.error}</div>;
    }

    return (
        <svg
            aria-label="QR код для отправки сообщений"
            className="AdminPage__qr"
            role="img"
            shapeRendering="crispEdges"
            viewBox={`0 0 ${qr.size} ${qr.size}`}
        >
            <rect fill="#fff" height={qr.size} width={qr.size} x={0} y={0} />
            <path d={qr.path} fill="#111" />
        </svg>
    );
}

function AdminPreview({ config }: { config: RoomConfig }) {
    const words = [
        { text: 'идея', score: config.max_points },
        { text: 'команда', score: Math.max(config.shake_threshold, config.max_points * 0.58) },
        { text: 'событие', score: config.max_points * 0.38 },
        { text: 'обсуждение', score: config.max_points * 0.24 },
        { text: 'старт', score: config.max_points * 0.18 },
    ];
    const positions = [
        [36, 42],
        [56, 28],
        [22, 62],
        [62, 66],
        [18, 24],
    ];

    return (
        <div
            className="AdminPage__preview"
            style={
                {
                    backgroundColor: config.background_color,
                    backgroundImage: config.cover_url
                        ? `linear-gradient(rgba(255,255,255,${config.cover_overlay}), rgba(255,255,255,${config.cover_overlay})), url(${config.cover_url})`
                        : undefined,
                } as CSSProperties
            }
        >
            <div className="AdminPage__previewTitle">
                <span>preview</span>
                <strong>{config.title}</strong>
            </div>
            {words.map((word, index) => {
                const fontSize = Math.max(16, Math.min(76, 16 + (word.score / config.max_points) * 62));
                const isHot = word.score >= config.shake_threshold;
                return (
                    <span
                        key={word.text}
                        className={isHot ? 'AdminPage__previewWord AdminPage__previewWord_hot' : 'AdminPage__previewWord'}
                        style={
                            {
                                top: `${positions[index][1]}%`,
                                left: `${positions[index][0]}%`,
                                fontSize,
                                color: getColor(
                                    word.score,
                                    0,
                                    config.max_points,
                                    config.word_color_min,
                                    config.word_color_mid,
                                    config.word_color_max,
                                ),
                            } as CSSProperties
                        }
                    >
                        {word.text}
                    </span>
                );
            })}
        </div>
    );
}

export const AdminPage: FC = memo(() => {
    const { roomId } = useParams();
    const [password, setPassword] = useState('');
    const [token, setToken] = useState(() => (roomId ? localStorage.getItem(tokenKey(roomId)) || '' : ''));
    const [room, setRoom] = useState<RoomAdmin | null>(null);
    const [draft, setDraft] = useState<RoomConfig | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const [testWordsCount, setTestWordsCount] = useState(30);
    const [testWordsPoints, setTestWordsPoints] = useState(20);
    const [replaceTestWords, setReplaceTestWords] = useState(false);

    const links = useMemo(() => {
        if (!room) {
            return [];
        }
        return [
            ['Экран', absoluteRoomUrl(room.links.screen)],
            ['Отправка', absoluteRoomUrl(room.links.submit)],
            ['Админка', absoluteRoomUrl(room.links.admin)],
        ];
    }, [room]);
    const submitUrl = room ? absoluteRoomUrl(room.links.submit) : '';

    const loadAdminRoom = useCallback(async () => {
        if (!roomId || !token) {
            return;
        }

        try {
            const data = await getAdminRoom(roomId, token);
            setRoom(data);
            setDraft(data.config);
            setError('');
        } catch (err) {
            const text = err instanceof Error ? err.message : 'Не удалось загрузить админку';
            setError(text);
            if (text.toLowerCase().includes('токен') || text.toLowerCase().includes('401')) {
                localStorage.removeItem(tokenKey(roomId));
                setToken('');
            }
        }
    }, [roomId, token]);

    useEffect(() => {
        loadAdminRoom();
    }, [loadAdminRoom]);

    const onLogin = async (event: FormEvent) => {
        event.preventDefault();
        if (!roomId) {
            return;
        }

        setIsBusy(true);
        setError('');
        try {
            const auth = await loginAdmin(roomId, password);
            localStorage.setItem(tokenKey(roomId), auth.access_token);
            setToken(auth.access_token);
            setPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось войти');
        } finally {
            setIsBusy(false);
        }
    };

    const setConfigValue = <K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) => {
        setDraft((current) => (current ? { ...current, [key]: value } : current));
    };

    const updateScenario = (id: string, patch: Partial<Scenario>) => {
        setDraft((current) =>
            current
                ? {
                      ...current,
                      scenarios: current.scenarios.map((scenario) =>
                          scenario.id === id ? { ...scenario, ...patch } : scenario,
                      ),
                  }
                : current,
        );
    };

    const saveConfig = async () => {
        if (!roomId || !token || !draft) {
            return;
        }

        setIsBusy(true);
        setMessage('');
        setError('');
        try {
            const nextRoom = await updateRoomConfig(roomId, token, {
                ...draft,
                cover_url: draft.cover_url?.trim() || null,
            });
            setRoom(nextRoom);
            setDraft(nextRoom.config);
            setMessage('Настройки сохранены');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить настройки');
        } finally {
            setIsBusy(false);
        }
    };

    const onClearWords = async () => {
        if (!roomId || !token) {
            return;
        }

        setIsBusy(true);
        try {
            const nextRoom = await clearRoomWords(roomId, token);
            setRoom(nextRoom);
            setDraft(nextRoom.config);
            setMessage('Слова очищены');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось очистить слова');
        } finally {
            setIsBusy(false);
        }
    };

    const onNewRound = async () => {
        if (!roomId || !token) {
            return;
        }

        setIsBusy(true);
        try {
            const nextRoom = await startNewRound(roomId, token);
            setRoom(nextRoom);
            setDraft(nextRoom.config);
            setMessage(`Раунд ${nextRoom.config.round_id} запущен`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось начать новый раунд');
        } finally {
            setIsBusy(false);
        }
    };

    const onGenerateTestWords = async () => {
        if (!roomId || !token) {
            return;
        }

        setIsBusy(true);
        setMessage('');
        setError('');
        try {
            const nextRoom = await generateTestWords(roomId, token, {
                count: testWordsCount,
                points: testWordsPoints,
                replace_existing: replaceTestWords,
            });
            setRoom(nextRoom);
            setDraft(nextRoom.config);
            setMessage(`Сгенерировано тестовых слов: ${testWordsCount}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сгенерировать тестовые слова');
        } finally {
            setIsBusy(false);
        }
    };

    const copyLink = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setMessage('Ссылка скопирована');
        } catch {
            setMessage(url);
        }
    };

    const downloadQr = (url: string) => {
        try {
            const { svg } = createQrSvg(url);
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `word-of-day-${roomId}-submit-qr.svg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
            setMessage('QR скачан как SVG');
        } catch {
            setError('Не удалось скачать QR');
        }
    };

    if (!roomId) {
        return null;
    }

    if (!token) {
        return (
            <main className="AdminPage AdminPage_login">
                <form className="AdminPage__loginPanel" onSubmit={onLogin}>
                    <Link to={`/room/${roomId}`} className="AdminPage__back">
                        Экран комнаты
                    </Link>
                    <h1>Админ-панель</h1>
                    <p>{roomId}</p>
                    <label>
                        Пароль
                        <input
                            value={password}
                            type="password"
                            autoFocus
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </label>
                    <button disabled={isBusy || !password} type="submit">
                        {isBusy ? 'Вход...' : 'Войти'}
                    </button>
                    {error && <span className="AdminPage__error">{error}</span>}
                </form>
            </main>
        );
    }

    if (!room || !draft) {
        return (
            <main className="AdminPage AdminPage_login">
                <div className="AdminPage__loginPanel">
                    <h1>Загрузка...</h1>
                    {error && <span className="AdminPage__error">{error}</span>}
                </div>
            </main>
        );
    }

    return (
        <main className="AdminPage" style={{ '--accent-color': draft.accent_color } as CSSProperties}>
            <header className="AdminPage__header">
                <div>
                    <span>{room.id}</span>
                    <h1>Админ-панель</h1>
                </div>
                <div className="AdminPage__actions">
                    <Link to={`/room/${room.id}`}>Экран</Link>
                    <Link to={`/room/${room.id}/send`}>Отправка</Link>
                    <button disabled={isBusy} onClick={saveConfig}>
                        Сохранить
                    </button>
                </div>
            </header>

            {(message || error) && (
                <p className={error ? 'AdminPage__notice AdminPage__notice_error' : 'AdminPage__notice'}>
                    {error || message}
                </p>
            )}

            <section className="AdminPage__grid">
                <section className="AdminPage__panel AdminPage__panel_links">
                    <h2>Ссылки</h2>
                    <div className="AdminPage__links">
                        {links.map(([label, url]) => (
                            <div key={label} className="AdminPage__linkRow">
                                <span>{label}</span>
                                <input readOnly value={url} />
                                <button type="button" onClick={() => copyLink(url)}>
                                    Копировать
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="AdminPage__qrBlock">
                        <QrCode value={submitUrl} />
                        <div>
                            <strong>QR на отправку сообщений</strong>
                            <span>{submitUrl}</span>
                            <button type="button" onClick={() => downloadQr(submitUrl)}>
                                Скачать QR
                            </button>
                        </div>
                    </div>
                </section>

                <section className="AdminPage__panel">
                    <h2>Статистика</h2>
                    <div className="AdminPage__stats">
                        <strong>
                            {room.stats.active_users}
                            <span>активны</span>
                        </strong>
                        <strong>
                            {room.stats.unique_users}
                            <span>всего пользователей</span>
                        </strong>
                        <strong>
                            {room.stats.accepted_submissions}
                            <span>принято слов</span>
                        </strong>
                        <strong className="AdminPage__dangerStat">
                            {room.stats.bad_word_attempts}
                            <span>попыток плохих слов</span>
                        </strong>
                    </div>
                </section>

                <section className="AdminPage__panel AdminPage__panel_preview">
                    <h2>Предпросмотр</h2>
                    <AdminPreview config={draft} />
                </section>

                <section className="AdminPage__panel AdminPage__panel_settings">
                    <h2>Настройки</h2>
                    <div className="AdminPage__settingsGrid">
                        <label>
                            Название
                            <input
                                value={draft.title}
                                onChange={(event) => setConfigValue('title', event.target.value)}
                            />
                        </label>
                        <label>
                            Обложка URL
                            <input
                                value={draft.cover_url || ''}
                                placeholder="https://..."
                                onChange={(event) => setConfigValue('cover_url', event.target.value)}
                            />
                        </label>
                        <label>
                            Цвет фона
                            <input
                                type="color"
                                value={draft.background_color}
                                onChange={(event) => setConfigValue('background_color', event.target.value)}
                            />
                        </label>
                        <label>
                            Акцент
                            <input
                                type="color"
                                value={draft.accent_color}
                                onChange={(event) => setConfigValue('accent_color', event.target.value)}
                            />
                        </label>
                        <label>
                            Цвет слов 0%
                            <input
                                type="color"
                                value={draft.word_color_min}
                                onChange={(event) => setConfigValue('word_color_min', event.target.value)}
                            />
                        </label>
                        <label>
                            Цвет слов 50%
                            <input
                                type="color"
                                value={draft.word_color_mid}
                                onChange={(event) => setConfigValue('word_color_mid', event.target.value)}
                            />
                        </label>
                        <label>
                            Цвет слов 100%
                            <input
                                type="color"
                                value={draft.word_color_max}
                                onChange={(event) => setConfigValue('word_color_max', event.target.value)}
                            />
                        </label>
                        <div
                            className="AdminPage__wordGradient"
                            style={
                                {
                                    background: `linear-gradient(90deg, ${draft.word_color_min} 0%, ${draft.word_color_mid} 50%, ${draft.word_color_max} 100%)`,
                                } as CSSProperties
                            }
                        >
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                        <label>
                            Затемнение обложки
                            <input
                                min={0}
                                max={0.9}
                                step={0.05}
                                type="range"
                                value={draft.cover_overlay}
                                onChange={(event) => setConfigValue('cover_overlay', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Очки за повтор
                            <input
                                min={1}
                                max={50}
                                type="number"
                                value={draft.word_gain}
                                onChange={(event) => setConfigValue('word_gain', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Очки нового слова
                            <input
                                min={1}
                                max={50}
                                type="number"
                                value={draft.first_word_points}
                                onChange={(event) => setConfigValue('first_word_points', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Затухание в секунду
                            <input
                                min={0}
                                max={5}
                                step={0.01}
                                type="number"
                                value={draft.decay_per_second}
                                onChange={(event) => setConfigValue('decay_per_second', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Максимум очков
                            <input
                                min={5}
                                max={500}
                                type="number"
                                value={draft.max_points}
                                onChange={(event) => setConfigValue('max_points', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Порог анимации
                            <input
                                min={1}
                                max={500}
                                type="number"
                                value={draft.shake_threshold}
                                onChange={(event) => setConfigValue('shake_threshold', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Максимум слов
                            <input
                                min={5}
                                max={500}
                                type="number"
                                value={draft.max_words}
                                onChange={(event) => setConfigValue('max_words', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Длина слова
                            <input
                                min={2}
                                max={80}
                                type="number"
                                value={draft.max_word_length}
                                onChange={(event) => setConfigValue('max_word_length', Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Cooldown, сек.
                            <input
                                min={0}
                                max={3600}
                                type="number"
                                value={draft.cooldown_seconds}
                                onChange={(event) => setConfigValue('cooldown_seconds', Number(event.target.value))}
                            />
                        </label>
                    </div>

                    <div className="AdminPage__toggles">
                        <label>
                            <input
                                checked={draft.one_submission_per_round}
                                type="checkbox"
                                onChange={(event) =>
                                    setConfigValue('one_submission_per_round', event.target.checked)
                                }
                            />
                            Одно слово на раунд
                        </label>
                        <label>
                            <input
                                checked={draft.show_stats}
                                type="checkbox"
                                onChange={(event) => setConfigValue('show_stats', event.target.checked)}
                            />
                            Показывать статистику на экране
                        </label>
                        <label>
                            <input
                                checked={draft.show_qr_hint}
                                type="checkbox"
                                onChange={(event) => setConfigValue('show_qr_hint', event.target.checked)}
                            />
                            Показывать ссылку отправки
                        </label>
                    </div>

                    <div className="AdminPage__roomActions">
                        <button disabled={isBusy} onClick={onNewRound} type="button">
                            Новый раунд
                        </button>
                        <button disabled={isBusy} onClick={onClearWords} type="button">
                            Очистить слова
                        </button>
                    </div>
                </section>

                <section className="AdminPage__panel AdminPage__panel_testing">
                    <h2>Тестирование</h2>
                    <div className="AdminPage__testControls">
                        <label>
                            Количество слов
                            <input
                                min={1}
                                max={500}
                                type="number"
                                value={testWordsCount}
                                onChange={(event) => setTestWordsCount(Number(event.target.value))}
                            />
                        </label>
                        <label>
                            Баллов у каждого
                            <input
                                min={0}
                                max={draft.max_points}
                                type="number"
                                value={testWordsPoints}
                                onChange={(event) => setTestWordsPoints(Number(event.target.value))}
                            />
                        </label>
                        <label className="AdminPage__testToggle">
                            <input
                                checked={replaceTestWords}
                                type="checkbox"
                                onChange={(event) => setReplaceTestWords(event.target.checked)}
                            />
                            Заменить текущие слова
                        </label>
                        <button disabled={isBusy} type="button" onClick={onGenerateTestWords}>
                            Сгенерировать
                        </button>
                    </div>
                </section>

                <section className="AdminPage__panel AdminPage__panel_scenarios">
                    <div className="AdminPage__sectionHeader">
                        <h2>Сценарии</h2>
                        <button
                            type="button"
                            onClick={() =>
                                setDraft((current) =>
                                    current
                                        ? { ...current, scenarios: [...current.scenarios, defaultScenario()] }
                                        : current,
                                )
                            }
                        >
                            Добавить
                        </button>
                    </div>
                    <div className="AdminPage__scenarios">
                        {draft.scenarios.map((scenario) => (
                            <div key={scenario.id} className="AdminPage__scenario">
                                <label>
                                    Название
                                    <input
                                        value={scenario.name}
                                        onChange={(event) =>
                                            updateScenario(scenario.id, { name: event.target.value })
                                        }
                                    />
                                </label>
                                <label>
                                    Триггер
                                    <select
                                        value={scenario.trigger}
                                        onChange={(event) =>
                                            updateScenario(scenario.id, {
                                                trigger: event.target.value as ScenarioTrigger,
                                            })
                                        }
                                    >
                                        {Object.entries(triggerLabels).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Сообщение
                                    <input
                                        value={scenario.message}
                                        onChange={(event) =>
                                            updateScenario(scenario.id, { message: event.target.value })
                                        }
                                    />
                                </label>
                                <label>
                                    Бонус
                                    <input
                                        min={0}
                                        max={100}
                                        type="number"
                                        value={scenario.boost}
                                        onChange={(event) =>
                                            updateScenario(scenario.id, { boost: Number(event.target.value) })
                                        }
                                    />
                                </label>
                                <label className="AdminPage__scenarioToggle">
                                    <input
                                        checked={scenario.active}
                                        type="checkbox"
                                        onChange={(event) =>
                                            updateScenario(scenario.id, { active: event.target.checked })
                                        }
                                    />
                                    Активен
                                </label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDraft((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      scenarios: current.scenarios.filter(
                                                          (item) => item.id !== scenario.id,
                                                      ),
                                                  }
                                                : current,
                                        )
                                    }
                                >
                                    Удалить
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </section>
        </main>
    );
});
