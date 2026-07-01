import { ReactNode } from 'react';

import { MainPage } from '@/page/MainPage';
import { FormPage } from '@/page/FormPage';
import { AdminPage } from '@/page/AdminPage';

interface Route {
    path: string;
    element: ReactNode;
}

const enum AppPages {
    MAIN = 'MAIN',
    FORM = 'FORM',
    ADMIN = 'ADMIN',

    NOT_FOUND = 'NOT_FOUND',
}

export const AppRoutes: Record<AppPages, string> = {
    [AppPages.MAIN]: '/',
    [AppPages.FORM]: '/add/',
    [AppPages.ADMIN]: '/admin_123/',

    [AppPages.NOT_FOUND]: '/*',
};

export const routeConfig: Record<AppPages, Route> = {
    [AppPages.MAIN]: {
        path: AppRoutes.MAIN,
        element: <MainPage />,
    },
    [AppPages.FORM]: {
        path: AppRoutes.FORM,
        element: <FormPage />,
    },
    [AppPages.ADMIN]: {
        path: AppRoutes.ADMIN,
        element: <AdminPage />,
    },

    [AppPages.NOT_FOUND]: {
        path: AppRoutes.NOT_FOUND,
        element: <>Нечего шариться!</>,
    },
};
