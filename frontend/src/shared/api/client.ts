export type ScenarioTrigger = 'secret_word' | 'time' | 'first_message' | 'word_score';

export type ScenarioEffect = 'main_image' | 'main_text' | 'form_text';

export type Scenario = {
    id: string;
    name: string;
    trigger: ScenarioTrigger;
    effect: ScenarioEffect;
    message: string;
    image_url: string | null;
    secret_word: string | null;
    seconds_after_start: number;
    score_threshold: number;
    duration_seconds: number;
    active: boolean;
};

export type RoomConfig = {
    title: string;
    cover_url: string | null;
    cover_overlay: number;
    background_color: string;
    word_color_min: string;
    word_color_mid: string;
    word_color_max: string;
    letter_scale: number;
    word_gain: number;
    first_word_points: number;
    decay_per_second: number;
    max_points: number;
    shake_threshold: number;
    max_words: number;
    max_word_length: number;
    cooldown_seconds: number;
    one_submission_per_round: boolean;
    round_id: number;
    is_finished: boolean;
    show_stats: boolean;
    show_qr_hint: boolean;
    scenarios: Scenario[];
};

export type WordView = {
    id: string;
    text: string;
    score: number;
    raw_score: number;
    updated_at: number;
};

export type RoomEffect = {
    id: string;
    scenario_id: string;
    effect: ScenarioEffect;
    text: string;
    image_url: string | null;
    created_at: number;
    expires_at: number;
};

export type RoomStats = {
    requests: number;
    total_submissions: number;
    accepted_submissions: number;
    bad_word_attempts: number;
    rejected_cooldown: number;
    rejected_round: number;
    unique_users: number;
    active_users: number;
};

export type RoomLinks = {
    screen: string;
    submit: string;
    admin: string;
};

export type RoomPublic = {
    id: string;
    created_at: number;
    last_activity_at: number;
    config: RoomConfig;
    words: WordView[];
    stats: RoomStats;
    active_effects: RoomEffect[];
};

export type RoomAdmin = RoomPublic & {
    links: RoomLinks;
};

export type SubmitWordResult = {
    accepted: boolean;
    message: string;
    words: WordView[];
    stats: RoomStats;
    active_effects: RoomEffect[];
};

type RequestOptions = {
    method?: string;
    body?: unknown;
    token?: string | null;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const CLIENT_ID_KEY = 'word-of-day-client-id';

function getClientId(): string {
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
        return stored;
    }

    const browserCrypto = window.crypto as Crypto & { randomUUID?: () => string };
    const value =
        typeof browserCrypto?.randomUUID === 'function'
            ? browserCrypto.randomUUID()
            : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, value);
    return value;
}

async function readError(response: Response): Promise<string> {
    try {
        const payload = await response.json();
        if (typeof payload.detail === 'string') {
            return payload.detail;
        }
        if (Array.isArray(payload.detail) && payload.detail.length > 0) {
            return payload.detail[0].msg || response.statusText;
        }
    } catch {
        return response.statusText;
    }
    return response.statusText;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Id': getClientId(),
    };

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
        throw new Error(await readError(response));
    }

    return response.json() as Promise<T>;
}

export function createRoom(payload: { title: string; password: string }) {
    return request<{ id: string; links: RoomLinks }>('/rooms', {
        method: 'POST',
        body: payload,
    });
}

export function getRoom(roomId: string) {
    return request<RoomPublic>(`/rooms/${roomId}`);
}

export function submitWord(roomId: string, text: string) {
    return request<SubmitWordResult>(`/rooms/${roomId}/words`, {
        method: 'POST',
        body: { text },
    });
}

export function loginAdmin(roomId: string, password: string) {
    return request<{ access_token: string; token_type: string; expires_at: number }>(
        `/rooms/${roomId}/auth`,
        {
            method: 'POST',
            body: { password },
        },
    );
}

export function getAdminRoom(roomId: string, token: string) {
    return request<RoomAdmin>(`/rooms/${roomId}/admin`, { token });
}

export function updateRoomConfig(roomId: string, token: string, config: Partial<RoomConfig>) {
    return request<RoomAdmin>(`/rooms/${roomId}/admin/config`, {
        method: 'PATCH',
        token,
        body: config,
    });
}

export function clearRoomWords(roomId: string, token: string) {
    return request<RoomAdmin>(`/rooms/${roomId}/admin/clear`, {
        method: 'POST',
        token,
    });
}

export function startNewRound(roomId: string, token: string) {
    return request<RoomAdmin>(`/rooms/${roomId}/admin/new-round`, {
        method: 'POST',
        token,
    });
}

export function finishRoom(roomId: string, token: string) {
    return request<RoomAdmin>(`/rooms/${roomId}/admin/finish`, {
        method: 'POST',
        token,
    });
}

export function generateTestWords(
    roomId: string,
    token: string,
    payload: { count: number; points: number; replace_existing: boolean },
) {
    return request<RoomAdmin>(`/rooms/${roomId}/admin/generate-test-words`, {
        method: 'POST',
        token,
        body: payload,
    });
}
