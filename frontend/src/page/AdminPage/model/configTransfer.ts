import { RoomConfig, Scenario, ScenarioEffect, ScenarioTrigger } from '@/shared/api/client';

const SETTINGS_FORMAT = 'word-of-day-settings';
const SETTINGS_VERSION = 1;

export type RoomSettings = Omit<RoomConfig, 'round_id' | 'is_finished'>;

type SettingsFile = {
    format: typeof SETTINGS_FORMAT;
    version: typeof SETTINGS_VERSION;
    exported_at: string;
    settings: RoomSettings;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(field: string): never {
    throw new Error(`Некорректное поле «${field}»`);
}

function stringValue(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string' || value.length < min || value.length > max) {
        fail(field);
    }
    return value;
}

function nullableString(value: unknown, field: string, max: number): string | null {
    if (value === null) {
        return null;
    }
    return stringValue(value, field, 0, max);
}

function numberValue(value: unknown, field: string, min: number, max: number, integer = false): number {
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (integer && !Number.isInteger(value))
    ) {
        fail(field);
    }
    return value;
}

function booleanValue(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') {
        fail(field);
    }
    return value;
}

function colorValue(value: unknown, field: string): string {
    const color = stringValue(value, field, 4, 32);
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
        fail(field);
    }
    return color;
}

function scenarioValue(value: unknown, index: number): Scenario {
    if (!isRecord(value)) {
        fail(`scenarios[${index}]`);
    }

    const prefix = `scenarios[${index}]`;
    const trigger = value.trigger;
    const effect = value.effect;
    const triggers: ScenarioTrigger[] = ['secret_word', 'time', 'first_message', 'word_score'];
    const effects: ScenarioEffect[] = ['main_image', 'main_text', 'form_text'];

    if (typeof trigger !== 'string' || !triggers.includes(trigger as ScenarioTrigger)) {
        fail(`${prefix}.trigger`);
    }
    if (typeof effect !== 'string' || !effects.includes(effect as ScenarioEffect)) {
        fail(`${prefix}.effect`);
    }

    return {
        id: stringValue(value.id, `${prefix}.id`, 1, 40),
        name: stringValue(value.name, `${prefix}.name`, 1, 80),
        trigger: trigger as ScenarioTrigger,
        effect: effect as ScenarioEffect,
        message: stringValue(value.message, `${prefix}.message`, 0, 220),
        image_url: nullableString(value.image_url, `${prefix}.image_url`, 500),
        secret_word: nullableString(value.secret_word, `${prefix}.secret_word`, 80),
        seconds_after_start: numberValue(value.seconds_after_start, `${prefix}.seconds_after_start`, 0, 86400, true),
        score_threshold: numberValue(value.score_threshold, `${prefix}.score_threshold`, 0, 500),
        duration_seconds: numberValue(value.duration_seconds, `${prefix}.duration_seconds`, 1, 3600, true),
        active: booleanValue(value.active, `${prefix}.active`),
    };
}

function settingsValue(value: unknown): RoomSettings {
    if (!isRecord(value)) {
        throw new Error('В файле отсутствует объект настроек');
    }
    if (!Array.isArray(value.scenarios)) {
        fail('scenarios');
    }

    const scenarios = value.scenarios.map(scenarioValue);
    if (new Set(scenarios.map((scenario) => scenario.id)).size !== scenarios.length) {
        throw new Error('Идентификаторы сценариев не должны повторяться');
    }

    return {
        title: stringValue(value.title, 'title', 1, 80),
        cover_url: nullableString(value.cover_url, 'cover_url', 500),
        cover_overlay: numberValue(value.cover_overlay, 'cover_overlay', 0, 0.9),
        background_color: colorValue(value.background_color, 'background_color'),
        word_color_min: colorValue(value.word_color_min, 'word_color_min'),
        word_color_mid: colorValue(value.word_color_mid, 'word_color_mid'),
        word_color_max: colorValue(value.word_color_max, 'word_color_max'),
        letter_scale: numberValue(value.letter_scale, 'letter_scale', 0.3, 3),
        word_gain: numberValue(value.word_gain, 'word_gain', 1, 50, true),
        first_word_points: numberValue(value.first_word_points, 'first_word_points', 1, 50, true),
        decay_per_second: numberValue(value.decay_per_second, 'decay_per_second', 0, 5),
        max_points: numberValue(value.max_points, 'max_points', 5, 500, true),
        shake_threshold: numberValue(value.shake_threshold, 'shake_threshold', 1, 500, true),
        max_words: numberValue(value.max_words, 'max_words', 5, 500, true),
        max_word_length: numberValue(value.max_word_length, 'max_word_length', 2, 80, true),
        cooldown_seconds: numberValue(value.cooldown_seconds, 'cooldown_seconds', 0, 3600, true),
        one_submission_per_round: booleanValue(value.one_submission_per_round, 'one_submission_per_round'),
        show_stats: booleanValue(value.show_stats, 'show_stats'),
        show_qr_hint: booleanValue(value.show_qr_hint, 'show_qr_hint'),
        scenarios,
    };
}

export function serializeRoomSettings(config: RoomConfig): string {
    const { round_id: _roundId, is_finished: _isFinished, ...settings } = config;
    const file: SettingsFile = {
        format: SETTINGS_FORMAT,
        version: SETTINGS_VERSION,
        exported_at: new Date().toISOString(),
        settings,
    };
    return JSON.stringify(file, null, 2);
}

export function parseRoomSettings(text: string): RoomSettings {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new Error('Файл не является корректным JSON');
    }

    if (!isRecord(value) || value.format !== SETTINGS_FORMAT) {
        throw new Error('Это не файл настроек Word of Day');
    }
    if (value.version !== SETTINGS_VERSION) {
        throw new Error(`Версия файла настроек не поддерживается: ${String(value.version)}`);
    }
    return settingsValue(value.settings);
}
