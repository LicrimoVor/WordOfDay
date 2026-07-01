import { FC, memo, useCallback, useState } from 'react';

import './AdminPage.css';
import { Button, Card, Checkbox, Text, TextInput } from '@gravity-ui/uikit';
import { useGlobalContext } from '@/shared/contex/contex';
import { TConfig } from '@/shared/types/config';

/** Главная страница */
export const AdminPage: FC = memo(() => {
    const { state } = useGlobalContext();
    const [config, setConfig] = useState<TConfig>({
        t_updated: 0,
        is_singleton: false,
    });

    const onClear = useCallback(() => {
        if (state.client == undefined) return;
        state.client.publish('words/data', JSON.stringify({}), { retain: true });
    }, [state]);

    const onUpdate = useCallback(() => {
        if (state.client == undefined) return;
        const config_now = {
            ...config,
            t_updated: Date.now(),
        };
        state.client.publish('words/config', JSON.stringify(config_now), { retain: true });
        setConfig(config_now);
    }, [state, config, setConfig]);

    const onSetSingletone = useCallback(
        (flag: boolean) => {
            if (state.client == undefined) return;
            const config_now = {
                ...config,
                is_singleton: flag,
            };
            state.client.publish('words/config', JSON.stringify(config_now), { retain: true });
            setConfig(config_now);
        },
        [state, config, setConfig],
    );

    return (
        <div className="AdminPage">
            <Card className="AdminPageCard">
                <Text variant="header-1">Админочка</Text>
                <Button size="xl" type="submit" onClick={onClear}>
                    Очистить
                </Button>
                <Button size="xl" type="submit" onClick={onUpdate}>
                    Обновить
                </Button>
                <Checkbox onUpdate={onSetSingletone}>Однократно</Checkbox>
            </Card>
        </div>
    );
});
