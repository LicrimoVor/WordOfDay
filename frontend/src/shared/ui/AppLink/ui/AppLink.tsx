import { FC, ReactNode, memo } from 'react';
import { Link } from 'react-router-dom';

import './AppLink.css';


interface AppLinkProps {
    className?: string,
    route: string,
    children: ReactNode,
}

/** Ссылочка */
export const AppLink: FC<AppLinkProps> = memo((props: AppLinkProps) => {
    const {
        className='',
        route,
        children,
    } = props;

    return (
        <Link 
            className={`${className} AppLink`}
            to={route}
        >
            {children}
        </Link>
    );
});
