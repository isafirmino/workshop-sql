import re
import unicodedata
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import COOKIE_SECURE, get_db, investigador_engine
from app.models import Participante
from app.schemas import (
    MeResponse,
    QueryRequest,
    QueryResponse,
    RankingEntry,
    SignupRequest,
    SolveRequest,
    SolveResponse,
)

router = APIRouter(prefix="/api")

CORRECT_TOKENS = ["rafael", "souza"]
MAX_TENTATIVAS = 3

QUERY_RE = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)


def _normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")
    return s.lower().strip()


def get_participant(
    request: Request, db: Session = Depends(get_db)
) -> Participante:
    token = request.cookies.get("session_token")
    participante = (
        db.query(Participante).filter_by(session_token=token).first()
        if token
        else None
    )
    if not participante:
        raise HTTPException(
            status_code=401, detail="Sessão não encontrada. Faça login novamente."
        )
    return participante


def _me_response(p: Participante) -> MeResponse:
    now = datetime.now(timezone.utc)
    end = p.solved_at or now
    elapsed = (end - p.started_at).total_seconds()
    return MeResponse(
        nome=p.nome,
        started_at=p.started_at,
        query_count=p.query_count,
        solved=p.solved_at is not None,
        solved_at=p.solved_at,
        elapsed_seconds=elapsed,
        tentativas_restantes=max(0, MAX_TENTATIVAS - p.tentativas),
    )


@router.post("/signup", response_model=MeResponse)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    nome = payload.nome.strip()
    if not nome:
        raise HTTPException(400, "Nome não pode ser vazio.")
    if len(nome) > 80:
        raise HTTPException(400, "Nome muito longo.")

    token = uuid.uuid4().hex
    participante = Participante(nome=nome, session_token=token)
    db.add(participante)
    db.commit()
    db.refresh(participante)

    response.set_cookie(
        "session_token",
        token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 12,
    )
    return _me_response(participante)


@router.get("/me", response_model=MeResponse)
def me(participante: Participante = Depends(get_participant)):
    return _me_response(participante)


def _clean_pg_error(msg: str) -> str:
    marker = ")\n"
    if msg.startswith("(psycopg2"):
        idx = msg.find(marker)
        if idx != -1:
            msg = msg[idx + len(marker) :]
    return msg.split("\n[SQL:")[0].strip()


@router.get("/pessoas/nomes", response_model=list[str])
def pessoas_nomes(participante: Participante = Depends(get_participant)):
    # autocomplete, nao conta como query
    with investigador_engine.connect() as conn:
        result = conn.execute(text("SELECT nome FROM pessoas ORDER BY nome"))
        return [row[0] for row in result]


@router.post("/query", response_model=QueryResponse)
def run_query(
    payload: QueryRequest,
    participante: Participante = Depends(get_participant),
    db: Session = Depends(get_db),
):
    sql = payload.sql.strip()

    if participante.solved_at is None:
        participante.query_count += 1
        db.commit()

    error = None
    columns: list[str] = []
    rows: list[list] = []
    truncated = False

    if not sql:
        error = "A query está vazia."
    else:
        stripped = sql[:-1] if sql.endswith(";") else sql
        if ";" in stripped:
            error = "Envie apenas um comando SELECT por vez (sem ';' no meio da query)."
        elif not QUERY_RE.match(stripped):
            error = "Só são permitidas consultas SELECT (ou WITH) nesse caso."
        else:
            try:
                with investigador_engine.connect() as conn:
                    result = conn.execute(text(stripped))
                    columns = list(result.keys())
                    fetched = result.fetchmany(201)
                    truncated = len(fetched) > 200
                    rows = [list(r) for r in fetched[:200]]
            except SQLAlchemyError as exc:
                error = _clean_pg_error(str(exc))

    return QueryResponse(
        columns=columns,
        rows=rows,
        truncated=truncated,
        error=error,
        query_count=participante.query_count,
    )


@router.post("/solve", response_model=SolveResponse)
def solve(
    payload: SolveRequest,
    participante: Participante = Depends(get_participant),
    db: Session = Depends(get_db),
):
    if participante.solved_at is not None:
        m = _me_response(participante)
        return SolveResponse(
            correct=True,
            elapsed_seconds=m.elapsed_seconds,
            query_count=participante.query_count,
            tentativas_restantes=m.tentativas_restantes,
        )

    if participante.tentativas >= MAX_TENTATIVAS:
        raise HTTPException(429, "Você já usou suas 3 tentativas de acusação.")

    norm = _normalize(payload.suspeito)
    correct = all(tok in norm for tok in CORRECT_TOKENS)
    if not correct:
        participante.tentativas += 1
        db.commit()
        db.refresh(participante)
        return SolveResponse(
            correct=False,
            tentativas_restantes=max(0, MAX_TENTATIVAS - participante.tentativas),
        )

    participante.solved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(participante)
    m = _me_response(participante)
    return SolveResponse(
        correct=True,
        elapsed_seconds=m.elapsed_seconds,
        query_count=participante.query_count,
        tentativas_restantes=m.tentativas_restantes,
    )


@router.get("/ranking", response_model=list[RankingEntry])
def ranking(db: Session = Depends(get_db)):
    participantes = (
        db.query(Participante).filter(Participante.solved_at.isnot(None)).all()
    )

    def elapsed(p: Participante) -> float:
        return (p.solved_at - p.started_at).total_seconds()

    participantes.sort(key=lambda p: (elapsed(p), p.query_count))
    return [
        RankingEntry(
            posicao=i + 1,
            nome=p.nome,
            elapsed_seconds=elapsed(p),
            query_count=p.query_count,
        )
        for i, p in enumerate(participantes)
    ]
