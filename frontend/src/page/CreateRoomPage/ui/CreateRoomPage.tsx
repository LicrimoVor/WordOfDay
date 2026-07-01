import { FormEvent, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createRoom, loginAdmin } from '@/shared/api/client';

import './CreateRoomPage.css';

export const CreateRoomPage = memo(() => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('Слово дня');
    const [password, setPassword] = useState('');
    const [roomToOpen, setRoomToOpen] = useState('');
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const onCreate = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setIsCreating(true);

        try {
            const room = await createRoom({ title, password });
            const auth = await loginAdmin(room.id, password);
            localStorage.setItem(`word-of-day-admin-token:${room.id}`, auth.access_token);
            navigate(`/room/${room.id}/admin`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось создать комнату');
        } finally {
            setIsCreating(false);
        }
    };

    const onOpenRoom = (event: FormEvent) => {
        event.preventDefault();
        const normalizedRoom = roomToOpen.trim().toLowerCase();
        if (normalizedRoom) {
            navigate(`/room/${normalizedRoom}`);
        }
    };

    return (
        <main className="CreateRoomPage">
            <section className="CreateRoomPage__intro">
                <p className="CreateRoomPage__eyebrow">Word of day</p>
                <h1>Комнаты для живого облака слов</h1>
                <p>
                    Создайте комнату, откройте экран со словами, раздайте ссылку на отправку и
                    управляйте сценарием из админ-панели.
                </p>
            </section>

            <section className="CreateRoomPage__workspace">
                <form className="CreateRoomPage__panel" onSubmit={onCreate}>
                    <h2>Новая комната</h2>
                    <label>
                        Название
                        <input
                            value={title}
                            maxLength={80}
                            onChange={(event) => setTitle(event.target.value)}
                        />
                    </label>
                    <label>
                        Пароль админа
                        <input
                            value={password}
                            type="password"
                            minLength={4}
                            maxLength={128}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>
                    <button disabled={isCreating || password.length < 4} type="submit">
                        {isCreating ? 'Создание...' : 'Создать комнату'}
                    </button>
                    {error && <p className="CreateRoomPage__error">{error}</p>}
                </form>

                <form className="CreateRoomPage__panel CreateRoomPage__panel_secondary" onSubmit={onOpenRoom}>
                    <h2>Открыть существующую</h2>
                    <label>
                        ID комнаты
                        <input
                            value={roomToOpen}
                            placeholder="например, a1b2c3d4"
                            onChange={(event) => setRoomToOpen(event.target.value)}
                        />
                    </label>
                    <button type="submit">Открыть экран</button>
                </form>
            </section>
        </main>
    );
});
