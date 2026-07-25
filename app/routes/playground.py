import re
import secrets

import psycopg2
from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy.engine import make_url

from app.db import COOKIE_SECURE, DATABASE_URL
from app.schemas import PlaygroundQueryRequest, PlaygroundQueryResponse, SimpleOk

router = APIRouter(prefix="/api/playground")

_url = make_url(DATABASE_URL)
_PG_HOST = _url.host
_PG_PORT = _url.port or 5432
_PG_DB = _url.database
_ADMIN_USER = _url.username
_ADMIN_PASSWORD = _url.password

# valida antes de interpolar em ddl, cookie do cliente nao e confiavel
ROLE_RE = re.compile(r"^play_[0-9a-f]{12}$")

PESSOAS_SEED = [
    (1, "Camila Torres", "67991112233", "Rua Bahia, 210", "Jardim dos Estados", "CGA9B12", "Dev"),
    (2, "Eduardo Nascimento", "67997654321", "Rua 14 de Julho, 500", "Centro", "MSV2C88", "Segurança (prédio vizinho)"),
    (3, "Beatriz Rocha", "67998887766", "Rua Espírito Santo, 88", "Vila Progresso", "PTM5D44", "Marketing"),
    (4, "Rafael Almeida Souza", "67991234567", "Rua Piratininga, 145", "Chácara Cachoeira", "HNT4E21", "Dev"),
    (5, "Vinícius Duarte", "67996665544", "Avenida Mato Grosso, 900", "Monte Castelo", "HNT4E27", "Dev"),
    (6, "Larissa Prado", "67993332211", "Rua Dom Aquino, 320", "Amambaí", "CGB1F09", "Dev"),
    (7, "Gustavo Ferreira", "67994443322", "Rua Pernambuco, 77", "Tiradentes", "MSU7G31", "Dev"),
    (8, "Juliana Martins", "67995556677", "Rua Bahia, 455", "Jardim dos Estados", "PTN3H62", "Design"),
    (9, "Pedro Henrique Lima", "67996667788", "Avenida Afonso Pena, 1200", "Centro", "CGC8J14", "Gestão de Projetos"),
    (10, "Ana Beatriz Cardoso", "67997778899", "Rua Rio Grande do Norte, 33", "Vila Progresso", "MSD2K55", "Financeiro"),
    (11, "Thiago Barros", "67998889900", "Avenida Mato Grosso, 410", "Monte Castelo", "PTL6M23", "Dev"),
    (12, "Fernanda Ribeiro", "67999990011", "Rua Marechal Rondon, 90", "Amambaí", "CGD4N77", "Marketing"),
    (13, "Lucas Gabriel Nunes", "67991010101", "Rua Padre João Crippa, 150", "Centro", "MSE9P08", "Dev"),
    (14, "Mariana Costa", "67992020202", "Rua Piratininga, 300", "Chácara Cachoeira", "PTF1Q66", "RH"),
    (15, "Bruno Teixeira", "67993030303", "Rua Pernambuco, 210", "Tiradentes", "CGG5R91", "Dev"),
    (16, "Isabela Farias", "67994040404", "Rua Bahia, 60", "Jardim dos Estados", "MSH3S48", "Design"),
    (17, "Diego Camargo", "67995050505", "Avenida Mato Grosso, 700", "Monte Castelo", "PTJ7T15", "Financeiro"),
    (18, "Rodrigo Almeida", "67997070707", "Avenida Afonso Pena, 980", "Centro", "CGK6U29", "Presidência"),
]


def _admin_conn():
    conn = psycopg2.connect(
        host=_PG_HOST, port=_PG_PORT, dbname=_PG_DB, user=_ADMIN_USER, password=_ADMIN_PASSWORD
    )
    conn.autocommit = True
    return conn


def _role_conn(role: str, password: str):
    conn = psycopg2.connect(host=_PG_HOST, port=_PG_PORT, dbname=_PG_DB, user=role, password=password)
    conn.autocommit = True
    return conn


def _new_role_name() -> str:
    return "play_" + secrets.token_hex(6)


def _provision(role: str, password: str):
    admin = _admin_conn()
    try:
        with admin.cursor() as cur:
            cur.execute(f'CREATE ROLE "{role}" LOGIN PASSWORD %s CONNECTION LIMIT 5', (password,))
            cur.execute(f'ALTER ROLE "{role}" SET statement_timeout = %s', ("15s",))
            cur.execute(f'CREATE SCHEMA AUTHORIZATION "{role}"')
            cur.execute(f'ALTER ROLE "{role}" SET search_path = %s', (role,))
    finally:
        admin.close()

    rconn = _role_conn(role, password)
    try:
        with rconn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE pessoas (
                    id INTEGER PRIMARY KEY,
                    nome TEXT,
                    telefone TEXT,
                    endereco TEXT,
                    bairro TEXT,
                    placa_carro TEXT,
                    cargo TEXT
                )
                """
            )
            cur.executemany(
                "INSERT INTO pessoas (id, nome, telefone, endereco, bairro, placa_carro, cargo) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                PESSOAS_SEED,
            )
    finally:
        rconn.close()


def _drop_role(role: str):
    admin = _admin_conn()
    try:
        with admin.cursor() as cur:
            cur.execute(f'DROP SCHEMA IF EXISTS "{role}" CASCADE')
            cur.execute(f'DROP ROLE IF EXISTS "{role}"')
    finally:
        admin.close()


def _set_playground_cookies(response: Response, role: str, password: str):
    response.set_cookie(
        "play_role", role, httponly=True, samesite="lax", secure=COOKIE_SECURE, max_age=60 * 60 * 12
    )
    response.set_cookie(
        "play_pw", password, httponly=True, samesite="lax", secure=COOKIE_SECURE, max_age=60 * 60 * 12
    )


@router.post("/start", response_model=SimpleOk)
def start(request: Request, response: Response):
    role = request.cookies.get("play_role")
    password = request.cookies.get("play_pw")
    if role and password and ROLE_RE.match(role):
        try:
            conn = _role_conn(role, password)
            conn.close()
            return SimpleOk(ok=True)
        except Exception:
            pass  # sessao invalida, reprovisiona

    role = _new_role_name()
    password = secrets.token_urlsafe(18)
    _provision(role, password)
    _set_playground_cookies(response, role, password)
    return SimpleOk(ok=True)


@router.post("/reset", response_model=SimpleOk)
def reset(request: Request, response: Response):
    old_role = request.cookies.get("play_role")
    if old_role and ROLE_RE.match(old_role):
        _drop_role(old_role)

    role = _new_role_name()
    password = secrets.token_urlsafe(18)
    _provision(role, password)
    _set_playground_cookies(response, role, password)
    return SimpleOk(ok=True)


@router.post("/query", response_model=PlaygroundQueryResponse)
def query(payload: PlaygroundQueryRequest, request: Request):
    role = request.cookies.get("play_role")
    password = request.cookies.get("play_pw")
    if not role or not password:
        raise HTTPException(401, "Playground não iniciado.")

    sql = payload.sql.strip()
    if not sql:
        return PlaygroundQueryResponse(error="A query está vazia.")

    try:
        conn = _role_conn(role, password)
    except Exception:
        raise HTTPException(401, "Sessão do playground expirou, recarregue a página.")

    columns: list[str] = []
    rows: list[list] = []
    truncated = False
    message = None
    error = None
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            if cur.description is not None:
                columns = [d[0] for d in cur.description]
                fetched = cur.fetchmany(201)
                truncated = len(fetched) > 200
                rows = [list(r) for r in fetched[:200]]
            elif cur.rowcount is not None and cur.rowcount >= 0:
                message = f"OK — {cur.rowcount} linha(s) afetada(s)."
            else:
                message = "Comando executado com sucesso."
    except Exception as e:
        error = str(e).strip()
    finally:
        conn.close()

    return PlaygroundQueryResponse(
        columns=columns, rows=rows, truncated=truncated, error=error, message=message
    )
