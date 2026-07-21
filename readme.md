# Word of Day

Проект переписан под комнаты: FastAPI + Redis на backend и React/Vite на frontend.

## Запуск

1. Redis:

```bash
docker compose -f infra/docker-compose.yml up -d
```

2. Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8010
```

3. Frontend:

```bash
cd frontend
npm install
npm run start
```

Frontend работает под `/words/`, API проксируется на `http://localhost:8010`.

## Основные маршруты

- `/words/` - создание комнаты.
- `/words/room/:roomId` - экран со всеми словами.
- `/words/room/:roomId/send` - форма отправки слова.
- `/words/room/:roomId/admin` - админ-панель с входом по паролю.

Комната хранится в Redis и получает TTL на 3 дня. Любой запрос к комнате продлевает TTL; если запросов нет 3 дня, Redis удалит ключи комнаты.

## Push Docker

```bash
docker tag <local-image> <your-username>/<local-image>:<tag>
docker push <your-username>/<local-image>:<tag>
```
