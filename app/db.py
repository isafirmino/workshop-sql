import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"variavel de ambiente {name} nao foi definida")
    return value


DATABASE_URL = _require_env("DATABASE_URL")
INVESTIGADOR_DATABASE_URL = _require_env("INVESTIGADOR_DATABASE_URL")

# false em http local, senao o navegador nao reenvia o cookie
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"

# nunca roda sql vindo do participante
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# roda o sql do participante, role investigador (somente select)
investigador_engine = create_engine(
    INVESTIGADOR_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"options": "-c statement_timeout=5000"},
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
