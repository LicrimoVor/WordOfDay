import { MAX_COUNT } from '@/shared/const/settings';

export type Pos = [number, number]; // проценты [left%, top%]

export type DataWordItem = {
    text: string;
    count: number;
    pos: Pos;
    time_st: number;
};

export type DataWord = Record<string, DataWordItem>;

/** Оценка размера слова */
export const getTextSize = (text: string, count: number) => {
    const fontSize = 14 + ((count / MAX_COUNT) * 1920) / 25;
    const width = Math.max(10, text.length * fontSize * 0.6);
    const height = Math.max(10, fontSize * 1.2);
    return { width, height };
};

/** Проверка пересечения */
const rectsOverlap = (r1: DOMRect, r2: DOMRect) =>
    !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);

/**
 * Расставляет слова от центра к краям, избегая overlap.
 */
export const layoutWordsRadial = (
    container: HTMLDivElement,
    words: { key: string; text: string; count: number }[],
): Record<string, Pos> => {
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    // сортируем по count по убыванию
    const sortedWords = [...words].sort((a, b) => b.count - a.count);

    const placedRects: { rect: DOMRect; key: string }[] = [];
    const positions: Record<string, Pos> = {};

    const maxRadiusX = container.clientWidth / 2;
    const maxRadiusY = container.clientHeight / 2;

    sortedWords.forEach((word, index) => {
        const size = getTextSize(word.text, word.count);

        // начальный угол (равномерно распределяем вокруг круга)
        const angle = (index * 137.5 * Math.PI) / 180; // спираль Фибоначчи
        let radiusFactor = 0;

        // ищем радиус, чтобы слово не пересекалось с предыдущими
        let found = false;
        let attempts = 0;

        while (!found && attempts < 100) {
            attempts++;
            radiusFactor += 0.02; // постепенно от центра к краю
            const x = centerX + Math.cos(angle) * radiusFactor * maxRadiusX - size.width / 2;
            const y = centerY + Math.sin(angle) * radiusFactor * maxRadiusY - size.height / 2;

            const rect = new DOMRect(x, y, size.width, size.height);

            found = true;
            for (const placed of placedRects) {
                if (rectsOverlap(rect, placed.rect)) {
                    found = false;
                    break;
                }
            }

            if (found) {
                placedRects.push({ rect, key: word.key });
                positions[word.key] = [
                    (x / container.clientWidth) * 100,
                    (y / container.clientHeight) * 100,
                ];
                break;
            }
        }

        // fallback на центр, если не удалось найти
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
