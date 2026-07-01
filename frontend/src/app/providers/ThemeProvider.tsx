import { FC, ReactNode, memo } from 'react';
import { ThemeProvider as UiThemeProvider } from '@gravity-ui/uikit';

import { useGlobalContext } from '@/shared/contex/contex';

interface ThemeProviderProps {
    children?: ReactNode;
}

/** Провайдер для тем стилей */
export const ThemeProvider: FC<ThemeProviderProps> = memo((props) => {
    const { children } = props;

    const { state } = useGlobalContext();

    return <UiThemeProvider theme={state.theme}>{children}</UiThemeProvider>;
});
