import { FC, ReactNode, memo, useReducer } from 'react';

import { GlobalState, globalReducer, GlobalContext } from '@/shared/contex/contex';

interface ContextProviderProps {
    children: ReactNode;
}

const initialState: GlobalState = {
    statusMqtt: 'connecting',
    theme: 'light',
};

/** Провайдер глобального контекста */
export const ContextProvider: FC<ContextProviderProps> = memo((props) => {
    const { children } = props;

    const [state, dispatch] = useReducer(globalReducer, initialState);

    return <GlobalContext.Provider value={{ state, dispatch }}>{children}</GlobalContext.Provider>;
});
