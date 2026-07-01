import { ReactNode } from 'react';

import { AdminPage } from '@/page/AdminPage';
import { CreateRoomPage } from '@/page/CreateRoomPage';
import { FormPage } from '@/page/FormPage';
import { MainPage } from '@/page/MainPage';

interface Route {
    path: string;
    element: ReactNode;
}

const enum AppPages {
    CREATE = 'CREATE',
    MAIN = 'MAIN',
    FORM = 'FORM',
    ADMIN = 'ADMIN',
    NOT_FOUND = 'NOT_FOUND',
}

export const AppRoutes: Record<AppPages, string> = {
    [AppPages.CREATE]: '/',
    [AppPages.MAIN]: '/room/:roomId',
    [AppPages.FORM]: '/room/:roomId/send',
    [AppPages.ADMIN]: '/room/:roomId/admin',
    [AppPages.NOT_FOUND]: '/*',
};

export const routeConfig: Record<AppPages, Route> = {
    [AppPages.CREATE]: {
        path: AppRoutes.CREATE,
        element: <CreateRoomPage />,
    },
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
        element: <CreateRoomPage />,
    },
};
