from datetime import datetime

from pydantic import BaseModel


class SignupRequest(BaseModel):
    nome: str


class SolutionStep(BaseModel):
    texto: str
    sql: str


class MeResponse(BaseModel):
    nome: str
    started_at: datetime
    query_count: int
    solved: bool
    solved_at: datetime | None
    elapsed_seconds: float
    tentativas: int
    desistiu: bool = False
    motive_reveal: str | None = None
    solution_path: list[SolutionStep] | None = None


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
    desistiu: bool = False
    elapsed_seconds: float | None = None
    query_count: int | None = None
    tentativas: int | None = None
    motive_reveal: str | None = None
    solution_path: list[SolutionStep] | None = None


class RankingEntry(BaseModel):
    posicao: int | None
    nome: str
    elapsed_seconds: float | None
    query_count: int
    tentativas: int
    desistiu: bool = False


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
