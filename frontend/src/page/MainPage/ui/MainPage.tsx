import { FC, memo } from 'react';

import { WordsBackground } from '@/features/WordsBackground';

import './MainPage.css';

/** Главная страница */
export const MainPage: FC = memo(() => {
    return <WordsBackground />;
});
