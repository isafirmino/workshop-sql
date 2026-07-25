import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://workshop:workshop@localhost:5432/pato_da_mega",
)
INVESTIGADOR_DATABASE_URL = os.environ.get(
    "INVESTIGADOR_DATABASE_URL",
    "postgresql+psycopg2://investigador:investigador_ro_2026@localhost:5432/pato_da_mega",
)

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
