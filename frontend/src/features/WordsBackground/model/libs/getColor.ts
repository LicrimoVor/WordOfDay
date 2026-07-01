export const getColor = (value: number, min: number, max: number): string => {
    const ratio = (value - min) / (max - min || 1);
    const r = Math.round(255 * ratio);
    const g = 0;
    const b = Math.round(255 * (1 - ratio));
    return `rgba(${r},${g},${b}, ${Math.max(0.4, (value / max) * 1.5)})`;
};
