import uuid

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db import Base


class Participante(Base):
    __tablename__ = "participantes"

    id = Column(Integer, primary_key=True)
    nome = Column(String, nullable=False)
    session_token = Column(
        String, unique=True, nullable=False, default=lambda: uuid.uuid4().hex
    )
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    solved_at = Column(DateTime(timezone=True), nullable=True)
    query_count = Column(Integer, nullable=False, default=0)
    tentativas = Column(Integer, nullable=False, default=0)
