import { FC, memo, useCallback, useMemo } from 'react';
import { Text, Icon } from '@gravity-ui/uikit';
import { Sun, Moon } from '@gravity-ui/icons';

import { useGlobalContext } from '@/shared/contex/contex';
import { Button } from '@/shared/ui/Button';

import './Header.css';
import { Logo } from '@/shared/ui/Logo';

interface HeaderProps {
    className?: string;
}

/** Шапка сайта */
export const Header: FC<HeaderProps> = memo((props: HeaderProps) => {
    const { className = '' } = props;

    const { dispatch, state } = useGlobalContext();
    const IconTheme = useMemo(() => {
        if (state.theme == 'dark') return <Icon data={Moon} size={20} />;
        if (state.theme == 'light') return <Icon data={Sun} size={20} />;
        return <Icon data={Sun} size={18} />;
    }, [state]);

    const onThemeHandler = useCallback(() => {
        dispatch({ type: 'changeTheme', payload: state.theme == 'dark' ? 'light' : 'dark' });
    }, [dispatch, state]);

    return (
        <div className={'Header ' + className}>
            <Logo className="headerCenter" />
            <Button className="headerRigth" view="outlined" size="m" onClick={onThemeHandler}>
                {IconTheme}
            </Button>
        </div>
    );
});
