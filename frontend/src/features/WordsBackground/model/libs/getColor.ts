type Rgb = {
    r: number;
    g: number;
    b: number;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function parseHexColor(value: string, fallback: Rgb): Rgb {
    const normalized = value.trim().replace('#', '');

    if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
        return {
            r: parseInt(normalized[0] + normalized[0], 16),
            g: parseInt(normalized[1] + normalized[1], 16),
            b: parseInt(normalized[2] + normalized[2], 16),
        };
    }

    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16),
        };
    }

    return fallback;
}

function mixColor(from: Rgb, to: Rgb, ratio: number): Rgb {
    return {
        r: Math.round(from.r + (to.r - from.r) * ratio),
        g: Math.round(from.g + (to.g - from.g) * ratio),
        b: Math.round(from.b + (to.b - from.b) * ratio),
    };
}

export const getColor = (
    value: number,
    min: number,
    max: number,
    minColor = '#3867d6',
    midColor = '#f6c85f',
    maxColor = '#d64045',
): string => {
    const ratio = clamp((value - min) / (max - min || 1), 0, 1);
    const start = parseHexColor(minColor, { r: 56, g: 103, b: 214 });
    const middle = parseHexColor(midColor, { r: 246, g: 200, b: 95 });
    const end = parseHexColor(maxColor, { r: 214, g: 64, b: 69 });
    const color = ratio <= 0.5 ? mixColor(start, middle, ratio * 2) : mixColor(middle, end, (ratio - 0.5) * 2);
    const alpha = clamp(0.45 + ratio * 0.55, 0.45, 1);

    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
};
