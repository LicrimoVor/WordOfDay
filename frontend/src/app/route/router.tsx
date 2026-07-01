import { FC } from 'react';
import { Route, Routes } from 'react-router-dom';

import { routeConfig } from '@/shared/route/route';

/** Роутер */
export const Router: FC = () => {
    return (
        <Routes>
            { Object.values(routeConfig).map((route) => {
                return (
                    <Route
                        path={route.path}
                        element={route.element}
                        key={route.path}
                    />
                );
            })}
        </Routes>
    );
};
