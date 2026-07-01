import { FC } from 'react';

import LogoImg from '@/shared/assets/cifra.png';

import './Logo.css';

type LogoProps = {
    className?: string;
};

/** Логотип */
export const Logo: FC<LogoProps> = (props) => {
    const { className = '' } = props;

    return <img className={`Logo ${className}`} alt="Логотип" src={LogoImg} />;
};
