import { BAD_WORDS } from '@/shared/const/badWords';

const CHAR_REPLACEMENTS: Record<string, string[]> = {
    а: ['а', 'a', '@'],
    б: ['б', '6', 'b'],
    в: ['в', 'b', 'v'],
    г: ['г', 'r', 'g'],
    д: ['д', 'd'],
    е: ['е', 'e'],
    ё: ['ё', 'e'],
    ж: ['ж', 'zh', '*'],
    з: ['з', '3', 'z'],
    и: ['и', 'u', 'i'],
    й: ['й', 'u', 'i'],
    к: ['к', 'k', 'i{', '|{'],
    л: ['л', 'l', 'ji'],
    м: ['м', 'm'],
    н: ['н', 'h', 'n'],
    о: ['о', 'o', '0'],
    п: ['п', 'n', 'p'],
    р: ['р', 'r', 'p'],
    с: ['с', 'c', 's'],
    т: ['т', 'm', 't'],
    у: ['у', 'y', 'u'],
    ф: ['ф', 'f'],
    х: ['х', 'x', 'h', '}{'],
    ц: ['ц', 'c', 'u,'],
    ч: ['ч', 'ch'],
    ш: ['ш', 'sh'],
    щ: ['щ', 'sch'],
    ь: ['ь', 'b'],
    ы: ['ы', 'bi'],
    ъ: ['ъ'],
    э: ['э', 'e'],
    ю: ['ю', 'io'],
    я: ['я', 'ya'],
};

// Создаем обратный словарь для быстрого поиска
const REVERSE_CHAR_MAP: Record<string, string> = {};

for (const [normalChar, variants] of Object.entries(CHAR_REPLACEMENTS)) {
    for (const variant of variants) {
        REVERSE_CHAR_MAP[variant] = normalChar;
    }
}

// Функция для нормализации текста (приведение к стандартным символам)
function normalizeText(text: string): string {
    let normalized = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i].toLowerCase();
        // Пытаемся найти замену для текущего символа
        const replacement = REVERSE_CHAR_MAP[char] || char;
        normalized += replacement;

        // Проверяем многобуквенные комбинации
        if (i < text.length - 1) {
            const twoChars = text.substring(i, i + 2).toLowerCase();
            if (REVERSE_CHAR_MAP[twoChars]) {
                normalized = normalized.slice(0, -1) + REVERSE_CHAR_MAP[twoChars];
                i++; // Пропускаем следующий символ, так как мы его уже обработали
            } else if (i < text.length - 2) {
                const threeChars = text.substring(i, i + 3).toLowerCase();
                if (REVERSE_CHAR_MAP[threeChars]) {
                    normalized = normalized.slice(0, -1) + REVERSE_CHAR_MAP[threeChars];
                    i += 2; // Пропускаем два следующих символа
                }
            }
        }
    }

    return normalized;
}

export function hasBadWords(text: string): boolean {
    const normalizedText = normalizeText(text.toLowerCase());
    return BAD_WORDS.some((badWord) => normalizedText.includes(badWord.toLowerCase()));
}
