import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import './NotFoundPage.css';

export const NotFoundPage = memo(() => {
    const location = useLocation();

    return (
        <main className="NotFoundPage">
            <section className="NotFoundPage__content">
                <p className="NotFoundPage__code" aria-hidden="true">
                    404
                </p>
                <p className="NotFoundPage__eyebrow">Страница не найдена</p>
                <h1>Здесь ничего нет</h1>
                <p className="NotFoundPage__description">
                    Адрес <code>{location.pathname}</code> не существует или страница была
                    перемещена.
                </p>
            </section>

            <div className="NotFoundPage__wordCloud" aria-hidden="true">
                <span>слово</span>
                <span>идея</span>
                <span>команда</span>
                <span>404</span>
                <span>обсуждение</span>
            </div>
        </main>
    );
});
