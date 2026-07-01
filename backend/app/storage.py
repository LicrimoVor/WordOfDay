from __future__ import annotations

import json
import re
import secrets
import string
import time
from typing import Any

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis

from .bad_words import has_bad_words
from .config import settings
from .models import (
    CreateRoomRequest,
    CreateRoomResponse,
    GenerateTestWordsRequest,
    RoomAdmin,
    RoomConfig,
    RoomConfigUpdate,
    RoomLinks,
    RoomPublic,
    RoomStats,
    SubmitWordResponse,
    WordView,
    model_to_dict,
)
from .security import hash_password

ROOM_ID_ALPHABET = string.ascii_lowercase + string.digits
ROOM_ID_RE = re.compile(r"^[a-z0-9]{6,12}$")
STAT_FIELDS = (
    "requests",
    "total_submissions",
    "accepted_submissions",
    "bad_word_attempts",
    "rejected_cooldown",
    "rejected_round",
)


def key(room_id: str, suffix: str) -> str:
    return f"room:{room_id}:{suffix}"


def room_links(room_id: str) -> RoomLinks:
    return RoomLinks(
        screen=f"/room/{room_id}",
        submit=f"/room/{room_id}/send",
        admin=f"/room/{room_id}/admin",
    )


def normalize_word(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    normalized = normalized.replace("ё", "е")
    normalized = re.sub(r"[^0-9a-zа-я -]+", "", normalized)
    return normalized.strip()


def clean_client_id(request: Request, header_value: str | None) -> str:
    raw_value = header_value or (request.client.host if request.client else "anonymous")
    return re.sub(r"[^0-9a-zA-Z_.:-]+", "-", raw_value)[:80] or "anonymous"


def _serialize_config(config: RoomConfig) -> str:
    return json.dumps(model_to_dict(config), ensure_ascii=False, separators=(",", ":"))


def _parse_config(meta: dict[str, str]) -> RoomConfig:
    raw_value = meta.get("config")
    if not raw_value:
        return RoomConfig()
    return RoomConfig(**json.loads(raw_value))


async def expire_room_keys(redis: Redis, room_id: str, config: RoomConfig | None = None) -> None:
    ttl = settings.room_ttl_seconds
    keys = [
        key(room_id, "meta"),
        key(room_id, "words"),
        key(room_id, "stats"),
        key(room_id, "users"),
        key(room_id, "clients"),
    ]
    if config is not None:
        keys.append(key(room_id, f"round:{config.round_id}:users"))
    pipe = redis.pipeline()
    for redis_key in keys:
        pipe.expire(redis_key, ttl)
    await pipe.execute()


async def get_room_meta(redis: Redis, room_id: str) -> dict[str, str]:
    if not ROOM_ID_RE.match(room_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    meta = await redis.hgetall(key(room_id, "meta"))
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена")
    return meta


async def touch_room(redis: Redis, room_id: str, config: RoomConfig, client_id: str | None) -> None:
    now = time.time()
    pipe = redis.pipeline()
    pipe.hset(key(room_id, "meta"), mapping={"last_activity_at": now})
    pipe.hincrby(key(room_id, "stats"), "requests", 1)
    if client_id:
        pipe.sadd(key(room_id, "users"), client_id)
        pipe.zadd(key(room_id, "clients"), {client_id: now})
    await pipe.execute()
    await expire_room_keys(redis, room_id, config)


async def touch_admin_action(redis: Redis, room_id: str, config: RoomConfig) -> None:
    now = time.time()
    pipe = redis.pipeline()
    pipe.hset(key(room_id, "meta"), mapping={"last_activity_at": now})
    pipe.hincrby(key(room_id, "stats"), "requests", 1)
    await pipe.execute()
    await expire_room_keys(redis, room_id, config)


async def build_stats(redis: Redis, room_id: str) -> RoomStats:
    now = time.time()
    stats_key = key(room_id, "stats")
    clients_key = key(room_id, "clients")
    await redis.zremrangebyscore(clients_key, 0, now - settings.active_user_window_seconds)

    raw_stats = await redis.hgetall(stats_key)
    data = {field: int(raw_stats.get(field, 0)) for field in STAT_FIELDS}
    data["unique_users"] = int(await redis.scard(key(room_id, "users")))
    data["active_users"] = int(await redis.zcard(clients_key))
    return RoomStats(**data)


def effective_score(word: dict[str, Any], config: RoomConfig, now: float) -> float:
    raw_score = float(word.get("score", 0))
    updated_at = float(word.get("updated_at", now))
    decayed = raw_score - max(0, now - updated_at) * config.decay_per_second
    return round(min(max(decayed, 0), config.max_points), 2)


async def collect_words(
    redis: Redis,
    room_id: str,
    config: RoomConfig,
    *,
    cleanup: bool = False,
) -> list[WordView]:
    now = time.time()
    raw_words = await redis.hgetall(key(room_id, "words"))
    result: list[WordView] = []
    stale_ids: list[str] = []

    for word_id, raw_value in raw_words.items():
        try:
            word = json.loads(raw_value)
            score = effective_score(word, config, now)
        except (json.JSONDecodeError, TypeError, ValueError):
            stale_ids.append(word_id)
            continue

        if score <= 0:
            if cleanup:
                stale_ids.append(word_id)
            continue

        result.append(
            WordView(
                id=word_id,
                text=str(word.get("text", "")),
                score=score,
                raw_score=float(word.get("score", score)),
                updated_at=float(word.get("updated_at", now)),
            )
        )

    result.sort(key=lambda item: item.score, reverse=True)
    overflow = result[config.max_words :]
    result = result[: config.max_words]
    stale_ids.extend(item.id for item in overflow)

    if cleanup and stale_ids:
        await redis.hdel(key(room_id, "words"), *stale_ids)

    return result


async def build_public_room(redis: Redis, room_id: str, meta: dict[str, str]) -> RoomPublic:
    config = _parse_config(meta)
    words = await collect_words(redis, room_id, config, cleanup=True)
    stats = await build_stats(redis, room_id)
    return RoomPublic(
        id=room_id,
        created_at=float(meta.get("created_at", time.time())),
        last_activity_at=float(meta.get("last_activity_at", time.time())),
        config=config,
        words=words,
        stats=stats,
    )


async def build_admin_room(redis: Redis, room_id: str, meta: dict[str, str]) -> RoomAdmin:
    public_room = await build_public_room(redis, room_id, meta)
    return RoomAdmin(**model_to_dict(public_room), links=room_links(room_id))


async def create_room(redis: Redis, payload: CreateRoomRequest) -> CreateRoomResponse:
    room_id = "".join(secrets.choice(ROOM_ID_ALPHABET) for _ in range(8))
    while await redis.exists(key(room_id, "meta")):
        room_id = "".join(secrets.choice(ROOM_ID_ALPHABET) for _ in range(8))

    now = time.time()
    salt, password_hash = hash_password(payload.password)
    config = RoomConfig(title=payload.title)

    await redis.hset(
        key(room_id, "meta"),
        mapping={
            "id": room_id,
            "password_salt": salt,
            "password_hash": password_hash,
            "created_at": now,
            "last_activity_at": now,
            "config": _serialize_config(config),
        },
    )
    await redis.hset(key(room_id, "stats"), mapping={field: 0 for field in STAT_FIELDS})
    await expire_room_keys(redis, room_id, config)
    return CreateRoomResponse(id=room_id, links=room_links(room_id))


async def update_config(redis: Redis, room_id: str, payload: RoomConfigUpdate) -> RoomAdmin:
    meta = await get_room_meta(redis, room_id)
    current_config = _parse_config(meta)
    if hasattr(payload, "model_dump"):
        patch = payload.model_dump(exclude_unset=True)
    else:
        patch = payload.dict(exclude_unset=True)
    merged = {**model_to_dict(current_config), **patch}
    new_config = RoomConfig(**merged)

    await redis.hset(key(room_id, "meta"), mapping={"config": _serialize_config(new_config)})
    await touch_admin_action(redis, room_id, new_config)
    updated_meta = await get_room_meta(redis, room_id)
    return await build_admin_room(redis, room_id, updated_meta)


async def clear_words(redis: Redis, room_id: str) -> RoomAdmin:
    await redis.delete(key(room_id, "words"))
    meta = await get_room_meta(redis, room_id)
    config = _parse_config(meta)
    await touch_admin_action(redis, room_id, config)
    meta = await get_room_meta(redis, room_id)
    return await build_admin_room(redis, room_id, meta)


async def start_new_round(redis: Redis, room_id: str) -> RoomAdmin:
    meta = await get_room_meta(redis, room_id)
    config = _parse_config(meta)
    config.round_id += 1
    await redis.hset(key(room_id, "meta"), mapping={"config": _serialize_config(config)})
    await touch_admin_action(redis, room_id, config)
    updated_meta = await get_room_meta(redis, room_id)
    return await build_admin_room(redis, room_id, updated_meta)


async def generate_test_words(redis: Redis, room_id: str, payload: GenerateTestWordsRequest) -> RoomAdmin:
    meta = await get_room_meta(redis, room_id)
    config = _parse_config(meta)
    now = time.time()
    words_key = key(room_id, "words")
    adjectives = [
        "bright",
        "calm",
        "fresh",
        "fast",
        "green",
        "smart",
        "warm",
        "wide",
        "clear",
        "sharp",
    ]
    nouns = [
        "idea",
        "team",
        "start",
        "event",
        "pulse",
        "focus",
        "skill",
        "route",
        "signal",
        "result",
    ]

    if payload.replace_existing:
        await redis.delete(words_key)

    score = min(max(float(payload.points), 0), float(config.max_points))
    mapping: dict[str, str] = {}
    for index in range(payload.count):
        random_part = secrets.token_hex(3)
        text = f"{adjectives[index % len(adjectives)]}-{nouns[(index // len(adjectives)) % len(nouns)]}-{random_part}"
        word_id = normalize_word(text)
        mapping[word_id] = json.dumps(
            {
                "text": text[: config.max_word_length],
                "score": score,
                "updated_at": now,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )

    if mapping:
        await redis.hset(words_key, mapping=mapping)
    await touch_admin_action(redis, room_id, config)
    updated_meta = await get_room_meta(redis, room_id)
    return await build_admin_room(redis, room_id, updated_meta)


async def submit_word(
    redis: Redis,
    room_id: str,
    payload: Any,
    client_id: str,
) -> SubmitWordResponse:
    meta = await get_room_meta(redis, room_id)
    config = _parse_config(meta)
    await touch_room(redis, room_id, config, client_id)

    text = re.sub(r"\s+", " ", payload.text.strip())
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Введите слово")
    if len(text) > config.max_word_length:
        text = text[: config.max_word_length].rstrip()

    await redis.hincrby(key(room_id, "stats"), "total_submissions", 1)

    if has_bad_words(text):
        await redis.hincrby(key(room_id, "stats"), "bad_word_attempts", 1)
        stats = await build_stats(redis, room_id)
        words = await collect_words(redis, room_id, config, cleanup=True)
        return SubmitWordResponse(
            accepted=False,
            message="Слово отклонено фильтром",
            words=words,
            stats=stats,
        )

    if config.cooldown_seconds > 0:
        cooldown_key = key(room_id, f"cooldown:{client_id}")
        if await redis.exists(cooldown_key):
            await redis.hincrby(key(room_id, "stats"), "rejected_cooldown", 1)
            stats = await build_stats(redis, room_id)
            words = await collect_words(redis, room_id, config, cleanup=True)
            return SubmitWordResponse(
                accepted=False,
                message=f"Подождите {config.cooldown_seconds} сек. перед следующей отправкой",
                words=words,
                stats=stats,
            )

    if config.one_submission_per_round:
        round_key = key(room_id, f"round:{config.round_id}:users")
        if await redis.sismember(round_key, client_id):
            await redis.hincrby(key(room_id, "stats"), "rejected_round", 1)
            stats = await build_stats(redis, room_id)
            words = await collect_words(redis, room_id, config, cleanup=True)
            return SubmitWordResponse(
                accepted=False,
                message="Вы уже отправляли слово в этом раунде",
                words=words,
                stats=stats,
            )
        await redis.sadd(round_key, client_id)
        await redis.expire(round_key, settings.room_ttl_seconds)

    word_id = normalize_word(text)
    if not word_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Введите слово")

    now = time.time()
    raw_word = await redis.hget(key(room_id, "words"), word_id)
    if raw_word:
        current_word = json.loads(raw_word)
        current_score = effective_score(current_word, config, now)
        next_score = min(current_score + config.word_gain, config.max_points)
    else:
        next_score = min(config.first_word_points, config.max_points)

    await redis.hset(
        key(room_id, "words"),
        word_id,
        json.dumps(
            {
                "text": text,
                "score": next_score,
                "updated_at": now,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
    )
    if config.cooldown_seconds > 0:
        await redis.set(key(room_id, f"cooldown:{client_id}"), "1", ex=config.cooldown_seconds)
    await redis.hincrby(key(room_id, "stats"), "accepted_submissions", 1)
    await expire_room_keys(redis, room_id, config)

    words = await collect_words(redis, room_id, config, cleanup=True)
    stats = await build_stats(redis, room_id)
    return SubmitWordResponse(accepted=True, message="Слово принято", words=words, stats=stats)
