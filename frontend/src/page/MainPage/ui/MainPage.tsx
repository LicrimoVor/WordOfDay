import { FC, memo } from 'react';
import { useParams } from 'react-router-dom';

import { WordsBackground } from '@/features/WordsBackground';

export const MainPage: FC = memo(() => {
    const { roomId } = useParams();

    if (!roomId) {
        return null;
    }

    return <WordsBackground roomId={roomId} />;
});
