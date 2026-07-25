# O Sumiço do Pato da Mega

Workshop de SQL da MegaJr — um mistério estilo CS50 Fiftyville,
ambientado em Campo Grande/MS. Cada participante entra com o nome, investiga o
banco de dados do caso escrevendo queries reais, e é cronometrado até acusar o
culpado certo. Ranking ao vivo em `/ranking` pra projetar no telão.

## Rodando localmente

```bash
cp .env.example .env   # ajuste se quiser trocar usuário/senha do Postgres
docker compose up -d --build
```

Isso sobe o Postgres (com o banco do caso já populado via
`app/seed/caso.sql`) e a API FastAPI, servindo tudo em `http://localhost:8000`.

- Tela do jogo: `http://localhost:8000/`
- Ranking pra projetar: `http://localhost:8000/ranking`

Pra rodar numa rede local (ex: projetor + celulares dos participantes na
mesma rede), troque `localhost` pelo IP da máquina que estiver rodando o
servidor. Pra expor na internet, qualquer reverse proxy/túnel serve (Caddy,
nginx, ngrok, Cloudflare Tunnel etc.) — é só apontar pra porta `8000`.

## Rodando sem Docker (Postgres já existente)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Rode o app/seed/caso.sql manualmente no seu Postgres antes de subir a API
psql "$SEU_DATABASE_URL" -f app/seed/caso.sql

export DATABASE_URL="postgresql+psycopg2://usuario:senha@host:5432/pato_da_mega"
export INVESTIGADOR_DATABASE_URL="postgresql+psycopg2://investigador:investigador_ro_2026@host:5432/pato_da_mega"

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Como funciona

- Cada participante loga só com o nome (`POST /api/signup`), que grava
  `started_at` e seta um cookie de sessão — o cronômetro é sempre calculado a
  partir do servidor, então dá pra recarregar a página sem perder o tempo.
- As queries do participante (`POST /api/query`) rodam numa conexão separada,
  autenticada como a role `investigador` — que só tem `GRANT SELECT` nas
  tabelas do caso (nunca escreve nada, tem timeout de 5s e só aceita um
  `SELECT`/`WITH` por vez). As tabelas internas do workshop
  (participantes/ranking) ficam numa conexão totalmente separada, invisível
  pra esse SQL.
- `POST /api/solve` compara a resposta (ignorando maiúsculas/acentos) e grava
  o horário de resolução na primeira vez que acertar.
- `GET /api/ranking` lista quem já resolveu, ordenado por tempo (empate:
  menos queries) — é isso que a tela `/ranking` fica atualizando a cada 3s.
- Tem também um **playground livre** (`/api/playground/*`), sem cronômetro
  nem pontuação, pra quem quiser testar `INSERT`/`UPDATE`/`DELETE`/
  `CREATE TABLE`/`DROP TABLE` à vontade. Cada participante que entra no
  playground ganha uma role e um schema Postgres só dele, criados na hora —
  então dá pra "quebrar" o próprio banco sem afetar ninguém: um `DROP TABLE`
  ali derruba só a cópia isolada de quem rodou.

## Reiniciar o caso entre turmas

Pra zerar participantes e ranking sem perder o banco do caso:

```bash
docker compose exec db psql -U workshop -d pato_da_mega -c "TRUNCATE participantes RESTART IDENTITY;"
```
