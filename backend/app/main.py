from __future__ import annotations

from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from .config import settings
from .models import (
    AdminLoginRequest,
    AdminLoginResponse,
    CreateRoomRequest,
    CreateRoomResponse,
    GenerateTestWordsRequest,
    RoomAdmin,
    RoomConfigUpdate,
    RoomPublic,
    SubmitWordRequest,
    SubmitWordResponse,
)
from .security import create_admin_token, verify_admin_token, verify_password
from .storage import (
    build_admin_room,
    build_public_room,
    clean_client_id,
    clear_words,
    create_room,
    finish_room,
    generate_test_words,
    get_room_meta,
    start_new_round,
    submit_word,
    touch_room,
    update_config,
)

app = FastAPI(title="Word of Day API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await app.state.redis.aclose()


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def require_admin_token(
    room_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> None:
    verify_admin_token(authorization, room_id)


@app.get("/api/health")
async def health(redis: Redis = Depends(get_redis)) -> dict[str, str]:
    await redis.ping()
    return {"status": "ok"}


@app.post("/api/rooms", response_model=CreateRoomResponse, status_code=201)
async def api_create_room(
    payload: CreateRoomRequest,
    redis: Redis = Depends(get_redis),
) -> CreateRoomResponse:
    return await create_room(redis, payload)


@app.get("/api/rooms/{room_id}", response_model=RoomPublic)
async def api_get_room(
    room_id: str,
    request: Request,
    redis: Redis = Depends(get_redis),
    x_client_id: str | None = Header(default=None, alias="X-Client-Id"),
) -> RoomPublic:
    meta = await get_room_meta(redis, room_id)
    public_room = await build_public_room(redis, room_id, meta)
    await touch_room(redis, room_id, public_room.config, clean_client_id(request, x_client_id))
    meta = await get_room_meta(redis, room_id)
    return await build_public_room(redis, room_id, meta)


@app.post("/api/rooms/{room_id}/words", response_model=SubmitWordResponse)
async def api_submit_word(
    room_id: str,
    payload: SubmitWordRequest,
    request: Request,
    redis: Redis = Depends(get_redis),
    x_client_id: str | None = Header(default=None, alias="X-Client-Id"),
) -> SubmitWordResponse:
    return await submit_word(redis, room_id, payload, clean_client_id(request, x_client_id))


@app.post("/api/rooms/{room_id}/auth", response_model=AdminLoginResponse)
async def api_admin_login(
    room_id: str,
    payload: AdminLoginRequest,
    redis: Redis = Depends(get_redis),
) -> AdminLoginResponse:
    meta = await get_room_meta(redis, room_id)
    if not verify_password(payload.password, meta["password_salt"], meta["password_hash"]):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный пароль")

    token, expires_at = create_admin_token(room_id)
    config = (await build_public_room(redis, room_id, meta)).config
    await touch_room(redis, room_id, config, None)
    return AdminLoginResponse(access_token=token, expires_at=expires_at)


@app.get(
    "/api/rooms/{room_id}/admin",
    response_model=RoomAdmin,
    dependencies=[Depends(require_admin_token)],
)
async def api_get_admin_room(
    room_id: str,
    request: Request,
    redis: Redis = Depends(get_redis),
    x_client_id: str | None = Header(default=None, alias="X-Client-Id"),
) -> RoomAdmin:
    meta = await get_room_meta(redis, room_id)
    admin_room = await build_admin_room(redis, room_id, meta)
    await touch_room(redis, room_id, admin_room.config, clean_client_id(request, x_client_id))
    meta = await get_room_meta(redis, room_id)
    return await build_admin_room(redis, room_id, meta)


@app.patch(
    "/api/rooms/{room_id}/admin/config",
    response_model=RoomAdmin,
    dependencies=[Depends(require_admin_token)],
)
async def api_update_config(
    room_id: str,
    payload: RoomConfigUpdate,
    redis: Redis = Depends(get_redis),
) -> RoomAdmin:
    return await update_config(redis, room_id, payload)


@app.post(
    "/api/rooms/{room_id}/admin/clear",
    response_model=RoomAdmin,
    dependencies=[Depends(require_admin_token)],
)
async def api_clear_words(room_id: str, redis: Redis = Depends(get_redis)) -> RoomAdmin:
    return await clear_words(redis, room_id)


@app.post(
    "/api/rooms/{room_id}/admin/new-round",
    response_model=RoomAdmin,
    dependencies=[Depends(require_admin_token)],
)
async def api_start_new_round(room_id: str, redis: Redis = Depends(get_redis)) -> RoomAdmin:
    return await start_new_round(redis, room_id)


@app.post(
    "/api/rooms/{room_id}/admin/finish",
    response_model=RoomAdmin,
    dependencies=[Depends(require_admin_token)],
)
async def api_finish_room(room_id: str, redis: Redis = Depends(get_redis)) -> RoomAdmin:
    return await finish_room(redis, room_id)


@app.post(
    "/api/rooms/{room_id}/admin/generate-test-words",
    response_model=RoomAdmin,
    dependencies=[Depends(require_admin_token)],
)
async def api_generate_test_words(
    room_id: str,
    payload: GenerateTestWordsRequest,
    redis: Redis = Depends(get_redis),
) -> RoomAdmin:
    return await generate_test_words(redis, room_id, payload)
