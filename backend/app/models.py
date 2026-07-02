from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


def model_to_dict(model: BaseModel) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


ScenarioTrigger = Literal["secret_word", "time", "first_message", "word_score"]
ScenarioEffectType = Literal["main_image", "main_text", "form_text"]


class Scenario(BaseModel):
    id: str = Field(..., min_length=1, max_length=40)
    name: str = Field(..., min_length=1, max_length=80)
    trigger: ScenarioTrigger = "secret_word"
    effect: ScenarioEffectType = "main_text"
    message: str = Field(default="", max_length=220)
    image_url: str | None = Field(default=None, max_length=500)
    secret_word: str | None = Field(default=None, max_length=80)
    seconds_after_start: int = Field(default=30, ge=0, le=86400)
    score_threshold: float = Field(default=30, ge=0, le=500)
    duration_seconds: int = Field(default=10, ge=1, le=3600)
    active: bool = True


def default_scenarios() -> list[Scenario]:
    return [
        Scenario(
            id="warmup",
            name="Первое слово",
            trigger="first_message",
            effect="main_text",
            message="Первое слово отправлено",
            duration_seconds=8,
            active=True,
        )
    ]


class RoomConfig(BaseModel):
    title: str = Field(default="Слово дня", min_length=1, max_length=80)
    cover_url: str | None = Field(default=None, max_length=500)
    cover_overlay: float = Field(default=0.35, ge=0, le=0.9)
    background_color: str = Field(default="#f6fbf7", min_length=4, max_length=32)
    word_color_min: str = Field(default="#3867d6", min_length=4, max_length=32)
    word_color_mid: str = Field(default="#f6c85f", min_length=4, max_length=32)
    word_color_max: str = Field(default="#d64045", min_length=4, max_length=32)
    letter_scale: float = Field(default=1.0, ge=0.3, le=3.0)
    word_gain: int = Field(default=5, ge=1, le=50)
    first_word_points: int = Field(default=1, ge=1, le=50)
    decay_per_second: float = Field(default=0.06, ge=0, le=5)
    max_points: int = Field(default=60, ge=5, le=500)
    shake_threshold: int = Field(default=30, ge=1, le=500)
    max_words: int = Field(default=80, ge=5, le=500)
    max_word_length: int = Field(default=24, ge=2, le=80)
    cooldown_seconds: int = Field(default=5, ge=0, le=3600)
    one_submission_per_round: bool = False
    round_id: int = Field(default=1, ge=1)
    is_finished: bool = False
    show_stats: bool = False
    show_qr_hint: bool = True
    scenarios: list[Scenario] = Field(default_factory=default_scenarios)


class RoomConfigUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=80)
    cover_url: str | None = Field(default=None, max_length=500)
    cover_overlay: float | None = Field(default=None, ge=0, le=0.9)
    background_color: str | None = Field(default=None, min_length=4, max_length=32)
    word_color_min: str | None = Field(default=None, min_length=4, max_length=32)
    word_color_mid: str | None = Field(default=None, min_length=4, max_length=32)
    word_color_max: str | None = Field(default=None, min_length=4, max_length=32)
    letter_scale: float | None = Field(default=None, ge=0.3, le=3.0)
    word_gain: int | None = Field(default=None, ge=1, le=50)
    first_word_points: int | None = Field(default=None, ge=1, le=50)
    decay_per_second: float | None = Field(default=None, ge=0, le=5)
    max_points: int | None = Field(default=None, ge=5, le=500)
    shake_threshold: int | None = Field(default=None, ge=1, le=500)
    max_words: int | None = Field(default=None, ge=5, le=500)
    max_word_length: int | None = Field(default=None, ge=2, le=80)
    cooldown_seconds: int | None = Field(default=None, ge=0, le=3600)
    one_submission_per_round: bool | None = None
    round_id: int | None = Field(default=None, ge=1)
    is_finished: bool | None = None
    show_stats: bool | None = None
    show_qr_hint: bool | None = None
    scenarios: list[Scenario] | None = None


class CreateRoomRequest(BaseModel):
    password: str = Field(..., min_length=4, max_length=128)
    title: str = Field(default="Слово дня", min_length=1, max_length=80)


class AdminLoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=128)


class GenerateTestWordsRequest(BaseModel):
    count: int = Field(default=20, ge=1, le=500)
    points: float = Field(default=20, ge=0, le=500)
    replace_existing: bool = False


class SubmitWordRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=120)


class RoomLinks(BaseModel):
    screen: str
    submit: str
    admin: str


class CreateRoomResponse(BaseModel):
    id: str
    links: RoomLinks


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: float


class WordView(BaseModel):
    id: str
    text: str
    score: float
    raw_score: float
    updated_at: float


class RoomEffect(BaseModel):
    id: str
    scenario_id: str
    effect: ScenarioEffectType
    text: str = ""
    image_url: str | None = None
    created_at: float
    expires_at: float


class RoomStats(BaseModel):
    requests: int = 0
    total_submissions: int = 0
    accepted_submissions: int = 0
    bad_word_attempts: int = 0
    rejected_cooldown: int = 0
    rejected_round: int = 0
    unique_users: int = 0
    active_users: int = 0


class RoomPublic(BaseModel):
    id: str
    created_at: float
    last_activity_at: float
    config: RoomConfig
    words: list[WordView]
    stats: RoomStats
    active_effects: list[RoomEffect] = Field(default_factory=list)


class RoomAdmin(RoomPublic):
    links: RoomLinks


class SubmitWordResponse(BaseModel):
    accepted: bool
    message: str
    words: list[WordView]
    stats: RoomStats
    active_effects: list[RoomEffect] = Field(default_factory=list)
