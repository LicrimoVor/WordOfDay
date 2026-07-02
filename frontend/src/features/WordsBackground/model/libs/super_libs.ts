import { MAX_COUNT } from '@/shared/const/settings';

export type Pos = [number, number];

export type DataWordItem = {
    text: string;
    count: number;
    pos: Pos;
    time_st: number;
};

export type DataWord = Record<string, DataWordItem>;

export const getTextSize = (text: string, count: number, maxCount = MAX_COUNT, letterScale = 1) => {
    const safeMax = Math.max(1, maxCount);
    const fontSize = (14 + ((count / safeMax) * 1920) / 25) * letterScale;
    const width = Math.max(10, text.length * fontSize * 0.6);
    const height = Math.max(10, fontSize * 1.2);
    return { width, height };
};

const rectsOverlap = (r1: DOMRect, r2: DOMRect) =>
    !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);

export const layoutWordsRadial = (
    container: HTMLDivElement,
    words: { key: string; text: string; count: number }[],
    maxCount = MAX_COUNT,
    letterScale = 1,
): Record<string, Pos> => {
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const sortedWords = [...words].sort((a, b) => b.count - a.count);
    const placedRects: { rect: DOMRect; key: string }[] = [];
    const positions: Record<string, Pos> = {};
    const maxRadiusX = container.clientWidth / 2;
    const maxRadiusY = container.clientHeight / 2;

    sortedWords.forEach((word, index) => {
        const size = getTextSize(word.text, word.count, maxCount, letterScale);
        const angle = (index * 137.5 * Math.PI) / 180;
        let radiusFactor = 0;
        let found = false;
        let attempts = 0;

        while (!found && attempts < 100) {
            attempts++;
            radiusFactor += 0.02;
            const x = centerX + Math.cos(angle) * radiusFactor * maxRadiusX - size.width / 2;
            const y = centerY + Math.sin(angle) * radiusFactor * maxRadiusY - size.height / 2;
            const rect = new DOMRect(x, y, size.width, size.height);

            found = !placedRects.some((placed) => rectsOverlap(rect, placed.rect));

            if (found) {
                placedRects.push({ rect, key: word.key });
                positions[word.key] = [
                    (x / container.clientWidth) * 100,
                    (y / container.clientHeight) * 100,
                ];
            }
        }

        if (!found) {
            const x = centerX - size.width / 2;
            const y = centerY - size.height / 2;
            positions[word.key] = [
                (x / container.clientWidth) * 100,
                (y / container.clientHeight) * 100,
            ];
        }
    });

    return positions;
};
