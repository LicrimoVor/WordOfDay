import { FC, ReactNode, memo, useEffect } from 'react';
import mqtt from 'mqtt';

import { MqqtOptions } from '@/shared/const/mqtt';
import { useGlobalContext } from '@/shared/contex/contex';

interface ConnectMqttProviderProps {
    children?: ReactNode;
}

/** Провайдер для подключения к mqtt-серверу */
export const ConnectMqttProvider: FC<ConnectMqttProviderProps> = memo((props) => {
    const { children } = props;

    const { dispatch } = useGlobalContext();

    useEffect(() => {
        const client = mqtt.connect(MqqtOptions);
        dispatch({ type: 'createClient', payload: client });

        return () => {
            client.end(true);
        };
    }, [dispatch]);

    return <>{children}</>;
});
