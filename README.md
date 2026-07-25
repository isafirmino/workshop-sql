# O Sumiço do Pato da Mega

Workshop de SQL da Empresa Júnior Mega — um mistério estilo CS50 Fiftyville,
ambientado em Campo Grande/MS. Cada participante entra com o nome, investiga o
banco de dados do caso escrevendo queries reais, e é cronometrado até acusar o
culpado certo. Ranking ao vivo em `/ranking` pra projetar no telão.

## Subir com Docker (recomendado)

```bash
cp .env.example .env   # ajuste se quiser trocar usuário/senha do Postgres
docker compose up -d --build
```

Isso sobe o Postgres (com o banco do caso já populado via
`app/seed/caso.sql`) e a API FastAPI, servindo tudo em `http://localhost:8000`.

- Tela do jogo: `http://localhost:8000/`
- Ranking pra projetar: `http://localhost:8000/ranking`

Pra rodar no dia do evento numa rede local, troque `localhost` pelo IP da
máquina que estiver rodando o servidor e libere a porta 8000 no firewall.

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

## Resolvendo o caso (gabarito pros organizadores)

1. `SELECT * FROM ocorrencia WHERE bairro = 'Centro';` → acha o boletim do
   furto do Pato da Mega.
2. `SELECT * FROM depoimentos WHERE ocorrencia_id = 3;` → lê as 3 pistas
   (boné vermelho + "terminal", carro prata placa "HNT..." saindo da Rua 14
   de Julho, ligação curta ~23h05 pra Beatriz).
3. `SELECT * FROM cameras WHERE local LIKE '%14 de Julho%' AND placa_carro LIKE 'HNT%';`
   → placa exata `HNT4E21` (cuidado com o decoy `HNT4E27` de outro local/horário).
4. `SELECT * FROM pessoas WHERE placa_carro = 'HNT4E21';` → **Rafael Almeida
   Souza**.
5. Confirma com `ligacoes` (telefone do Rafael → telefone da Beatriz, <60s,
   ~23h05), `pix` (compra de passagem perto da meia-noite) e `passagens`
   (saída pra Bonito antes da meia-noite).
6. Resposta final: **Rafael Almeida Souza**.

## Reiniciar o caso entre turmas

Pra zerar participantes e ranking sem perder o banco do caso:

```bash
docker compose exec db psql -U workshop -d pato_da_mega -c "TRUNCATE participantes RESTART IDENTITY;"
```
