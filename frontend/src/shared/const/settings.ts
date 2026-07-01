export const MAX_COUNT = 60;
export const THRESHOLD = 30;
export const TIME_STEP = 1 * 1000;

export type Data = Record<
    string,
    {
        text: string;
        count: number;
        pos?: number[];
        shark?: any;
    }
>;
