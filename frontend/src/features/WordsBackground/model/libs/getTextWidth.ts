export function getTextWidth(text: string, font: string = '16px Arial'): number {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width; // ширина в пикселях
}
