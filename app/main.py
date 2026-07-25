from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.db import Base, engine
from app.routes.game import router as game_router
from app.routes.playground import router as playground_router

Base.metadata.create_all(bind=engine)

# create_all() so cria tabela nova, nao adiciona coluna em tabela que ja
# existe — IF NOT EXISTS deixa isso idempotente em qualquer ambiente
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE participantes ADD COLUMN IF NOT EXISTS desistiu_at timestamptz"))

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="O Sumiço do Pato da Mega")
app.include_router(game_router)
app.include_router(playground_router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.middleware("http")
async def no_cache(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    elif path.startswith("/static/") or path in ("/", "/ranking"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/ranking")
def ranking_page():
    return FileResponse(STATIC_DIR / "ranking.html")
