export const getShakingPos = (
    value: number,
    frames = 80, // 80 кадров ≈ 6–8 секунд
): { x: number[]; y: number[] } => {
    const generateAxis = () => {
        const axis: number[] = [];
        let prev = 0;

        for (let i = 0; i < frames; i++) {
            // маленькое отклонение от предыдущего значения
            const delta = (Math.random() - 0.5) * value * 0.4;
            const next = prev + delta;
            axis.push(next);
            prev = next;
        }

        axis[0] = 0;
        axis.push(0); // возврат в центр
        return axis;
    };

    return {
        x: generateAxis(),
        y: generateAxis(),
    };
};
