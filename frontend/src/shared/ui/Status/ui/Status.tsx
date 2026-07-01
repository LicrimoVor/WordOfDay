import { FC, memo } from 'react';

import './Status.css';

interface StatusProps {
    className?: string,
    active?: boolean,
}

/** Статус */
export const Status: FC<StatusProps> = memo((props: StatusProps) => {
    const {
        className,
        active,
    } = props;

    return (
        <div 
            className={`${className? className: ''} status ${active? 'statusActive': 'statusInactive'}`}
        />
    );
});
