from datetime import datetime

from pydantic import BaseModel


class SignupRequest(BaseModel):
    nome: str


class MeResponse(BaseModel):
    nome: str
    started_at: datetime
    query_count: int
    solved: bool
    solved_at: datetime | None
    elapsed_seconds: float
    tentativas_restantes: int


class QueryRequest(BaseModel):
    sql: str


class QueryResponse(BaseModel):
    columns: list[str] = []
    rows: list[list] = []
    truncated: bool = False
    error: str | None = None
    query_count: int


class SolveRequest(BaseModel):
    suspeito: str


class SolveResponse(BaseModel):
    correct: bool
    elapsed_seconds: float | None = None
    query_count: int | None = None
    tentativas_restantes: int | None = None


class RankingEntry(BaseModel):
    posicao: int
    nome: str
    elapsed_seconds: float
    query_count: int


class SimpleOk(BaseModel):
    ok: bool = True


class PlaygroundQueryRequest(BaseModel):
    sql: str


class PlaygroundQueryResponse(BaseModel):
    columns: list[str] = []
    rows: list[list] = []
    truncated: bool = False
    error: str | None = None
    message: str | None = None
