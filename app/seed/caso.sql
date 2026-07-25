-- ============================================================================
-- O Sumiço do Pato da Mega — banco do caso (Campo Grande, MS)
-- Executado automaticamente pelo container do Postgres na primeira subida.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

CREATE TABLE pessoas (
    id            SERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    telefone      TEXT NOT NULL,
    endereco      TEXT NOT NULL,
    bairro        TEXT NOT NULL,
    placa_carro   TEXT NOT NULL,
    cargo         TEXT NOT NULL
);

CREATE TABLE ocorrencia (
    id          SERIAL PRIMARY KEY,
    data        DATE NOT NULL,
    hora        TIME NOT NULL,
    bairro      TEXT NOT NULL,
    rua         TEXT NOT NULL,
    descricao   TEXT NOT NULL
);

CREATE TABLE depoimentos (
    id              SERIAL PRIMARY KEY,
    ocorrencia_id   INTEGER NOT NULL REFERENCES ocorrencia(id),
    pessoa_id       INTEGER NOT NULL REFERENCES pessoas(id),
    transcricao     TEXT NOT NULL
);

CREATE TABLE ligacoes (
    id                  SERIAL PRIMARY KEY,
    numero_origem       TEXT NOT NULL,
    numero_destino      TEXT NOT NULL,
    data                DATE NOT NULL,
    hora                TIME NOT NULL,
    duracao_segundos    INTEGER NOT NULL
);

CREATE TABLE pix (
    id          SERIAL PRIMARY KEY,
    pessoa_id   INTEGER NOT NULL REFERENCES pessoas(id),
    valor       NUMERIC(10, 2) NOT NULL,
    data        DATE NOT NULL,
    hora        TIME NOT NULL,
    descricao   TEXT NOT NULL
);

CREATE TABLE passagens (
    id          SERIAL PRIMARY KEY,
    pessoa_id   INTEGER NOT NULL REFERENCES pessoas(id),
    empresa     TEXT NOT NULL,
    origem      TEXT NOT NULL,
    destino     TEXT NOT NULL,
    data        DATE NOT NULL,
    hora_saida  TIME NOT NULL
);

CREATE TABLE cameras (
    id              SERIAL PRIMARY KEY,
    local           TEXT NOT NULL,
    placa_carro     TEXT NOT NULL,
    data            DATE NOT NULL,
    hora            TIME NOT NULL
);

-- ---------------------------------------------------------------------------
-- Pessoas (18 pessoas fictícias: testemunhas, suspeito e colegas de trabalho)
-- ---------------------------------------------------------------------------

INSERT INTO pessoas (nome, telefone, endereco, bairro, placa_carro, cargo) VALUES
('Camila Torres',          '67991112233', 'Rua Bahia, 210',              'Jardim dos Estados', 'CGA9B12', 'Dev'),
('Eduardo Nascimento',     '67997654321', 'Rua 14 de Julho, 500',        'Centro',              'MSV2C88', 'Segurança (prédio vizinho)'),
('Beatriz Rocha',          '67998887766', 'Rua Espírito Santo, 88',      'Vila Progresso',      'PTM5D44', 'Marketing'),
('Rafael Almeida Souza',   '67991234567', 'Rua Piratininga, 145',        'Chácara Cachoeira',   'HNT4E21', 'Dev'),
('Vinícius Duarte',        '67996665544', 'Avenida Mato Grosso, 900',    'Monte Castelo',       'HNT4E27', 'Dev'),
('Larissa Prado',          '67993332211', 'Rua Dom Aquino, 320',         'Amambaí',             'CGB1F09', 'Dev'),
('Gustavo Ferreira',       '67994443322', 'Rua Pernambuco, 77',          'Tiradentes',          'MSU7G31', 'Dev'),
('Juliana Martins',        '67995556677', 'Rua Bahia, 455',              'Jardim dos Estados',  'PTN3H62', 'Design'),
('Pedro Henrique Lima',    '67996667788', 'Avenida Afonso Pena, 1200',   'Centro',              'CGC8J14', 'Gestão de Projetos'),
('Ana Beatriz Cardoso',    '67997778899', 'Rua Rio Grande do Norte, 33', 'Vila Progresso',      'MSD2K55', 'Financeiro'),
('Thiago Barros',          '67998889900', 'Avenida Mato Grosso, 410',    'Monte Castelo',       'PTL6M23', 'Dev'),
('Fernanda Ribeiro',       '67999990011', 'Rua Marechal Rondon, 90',     'Amambaí',             'CGD4N77', 'Marketing'),
('Lucas Gabriel Nunes',    '67991010101', 'Rua Padre João Crippa, 150',  'Centro',              'MSE9P08', 'Dev'),
('Mariana Costa',          '67992020202', 'Rua Piratininga, 300',        'Chácara Cachoeira',   'PTF1Q66', 'RH'),
('Bruno Teixeira',         '67993030303', 'Rua Pernambuco, 210',         'Tiradentes',          'CGG5R91', 'Dev'),
('Isabela Farias',         '67994040404', 'Rua Bahia, 60',               'Jardim dos Estados',  'MSH3S48', 'Design'),
('Diego Camargo',          '67995050505', 'Avenida Mato Grosso, 700',    'Monte Castelo',       'PTJ7T15', 'Financeiro'),
('Rodrigo Almeida',        '67997070707', 'Avenida Afonso Pena, 980',    'Centro',              'CGK6U29', 'Presidência');

-- ---------------------------------------------------------------------------
-- Ocorrências (boletins da mesma sexta-feira, bairros diferentes)
-- ---------------------------------------------------------------------------

INSERT INTO ocorrencia (data, hora, bairro, rua, descricao) VALUES
('2026-07-17', '02:40:00', 'Amambaí',        'Rua Barão do Rio Branco',
 'Furto de bicicleta reportado em frente a uma padaria durante a madrugada.'),
('2026-07-17', '23:50:00', 'Tiradentes',     'Rua Bahia',
 'Perturbação do sossego: vizinhos reclamaram de som alto até tarde da noite.'),
('2026-07-17', '23:15:00', 'Centro',         'Avenida Afonso Pena',
 'Durante a confraternização de fim de semestre da empresa júnior Mega, o mascote da equipe, conhecido como "Pato da Mega", foi furtado da sala de reuniões por volta das 23h15. Testemunhas relatam ter visto uma pessoa saindo apressada pela porta dos fundos poucos minutos antes do sumiço ser notado. Um segurança do prédio vizinho afirma ter visto um carro saindo em alta velocidade da rua ao lado por volta do mesmo horário.'),
('2026-07-18', '04:10:00', 'Vila Progresso', 'Rua Espírito Santo',
 'Depredação de um ponto de ônibus, sem testemunhas identificadas.');

-- ---------------------------------------------------------------------------
-- Depoimentos (3 relevantes ao caso do Centro + 2 decoys de outras ocorrências)
-- ---------------------------------------------------------------------------

INSERT INTO depoimentos (ocorrencia_id, pessoa_id, transcricao) VALUES
(3, (SELECT id FROM pessoas WHERE nome = 'Camila Torres'),
 'Eu vi uma pessoa saindo pela porta dos fundos por volta das 23h10, estava com um boné vermelho e parecia nervosa. Ouvi ela falar ao telefone algo como "já peguei, preciso correr pro terminal antes da meia-noite".'),
(3, (SELECT id FROM pessoas WHERE nome = 'Eduardo Nascimento'),
 'Eu trabalho na portaria do prédio ao lado. Vi um carro prata saindo em disparada da Rua 14 de Julho por volta das 23h15. Não consegui ver a placa toda, mas começava com "HNT".'),
(3, (SELECT id FROM pessoas WHERE nome = 'Beatriz Rocha'),
 'Recebi uma ligação de menos de um minuto de alguém da empresa por volta das 23h05, mas a pessoa desligou rápido dizendo que me ligaria depois. Achei estranho porque não é do feitio dela.'),
(1, (SELECT id FROM pessoas WHERE nome = 'Larissa Prado'),
 'Não vi nada de estranho, só ouvi um barulho de bicicleta caindo lá pelas 2h40.'),
(2, (SELECT id FROM pessoas WHERE nome = 'Gustavo Ferreira'),
 'O som alto vinha de uma casa duas quadras daqui, não sei dizer de quem é.');

-- ---------------------------------------------------------------------------
-- Ligações telefônicas (15 registros, 1 relevante: chamada curta pro nº da Beatriz)
-- ---------------------------------------------------------------------------

INSERT INTO ligacoes (numero_origem, numero_destino, data, hora, duracao_segundos) VALUES
('67991234567', '67998887766', '2026-07-17', '23:05:12', 45),   -- Rafael -> Beatriz (RELEVANTE)
('67996665544', '67993332211', '2026-07-17', '22:50:00', 320),
('67993332211', '67994443322', '2026-07-17', '18:12:00', 180),
('67995556677', '67996667788', '2026-07-17', '09:05:00', 600),
('67997778899', '67998889900', '2026-07-17', '14:22:00', 90),
('67999990011', '67991010101', '2026-07-17', '20:30:00', 210),
('67992020202', '67993030303', '2026-07-16', '11:00:00', 60),
('67994040404', '67995050505', '2026-07-17', '23:40:00', 500),
('67997070707', '67991112233', '2026-07-17', '08:15:00', 30),
('67998887766', '67991112233', '2026-07-17', '23:07:00', 150),
('67996665544', '67997654321', '2026-07-17', '23:05:40', 200),
('67991234567', '67992020202', '2026-07-15', '16:00:00', 40),
('67993030303', '67994443322', '2026-07-17', '23:05:05', 700),
('67995050505', '67996060606', '2026-07-17', '12:00:00', 55),
('67991010101', '67992020202', '2026-07-17', '23:06:00', 900);

-- ---------------------------------------------------------------------------
-- Pix (6 registros, 1 relevante: passagem rodoviária pouco antes da meia-noite)
-- ---------------------------------------------------------------------------

INSERT INTO pix (pessoa_id, valor, data, hora, descricao) VALUES
((SELECT id FROM pessoas WHERE nome = 'Rafael Almeida Souza'), 89.90, '2026-07-17', '23:20:00', 'Compra de passagem rodoviária'),
((SELECT id FROM pessoas WHERE nome = 'Larissa Prado'),        32.00, '2026-07-17', '19:45:00', 'Pagamento de Uber'),
((SELECT id FROM pessoas WHERE nome = 'Gustavo Ferreira'),     58.50, '2026-07-17', '21:10:00', 'Compra em aplicativo de comida'),
((SELECT id FROM pessoas WHERE nome = 'Vinícius Duarte'),      15.00, '2026-07-16', '10:00:00', 'Transferência entre amigos'),
((SELECT id FROM pessoas WHERE nome = 'Ana Beatriz Cardoso'), 120.00, '2026-07-17', '10:30:00', 'Pagamento de conta de luz'),
((SELECT id FROM pessoas WHERE nome = 'Diego Camargo'),        45.00, '2026-07-18', '09:00:00', 'Transferência entre amigos');

-- ---------------------------------------------------------------------------
-- Passagens rodoviárias (6 registros, 1 relevante: fuga pra Bonito)
-- ---------------------------------------------------------------------------

INSERT INTO passagens (pessoa_id, empresa, origem, destino, data, hora_saida) VALUES
((SELECT id FROM pessoas WHERE nome = 'Rafael Almeida Souza'), 'Viação Cruzeiro do Sul', 'Campo Grande', 'Bonito',      '2026-07-17', '23:50:00'),
((SELECT id FROM pessoas WHERE nome = 'Thiago Barros'),        'Viação Motta',           'Campo Grande', 'Dourados',    '2026-07-18', '07:00:00'),
((SELECT id FROM pessoas WHERE nome = 'Fernanda Ribeiro'),     'Viação Cruzeiro do Sul', 'Campo Grande', 'Corumbá',     '2026-07-16', '15:00:00'),
((SELECT id FROM pessoas WHERE nome = 'Vinícius Duarte'),      'Viação Motta',           'Campo Grande', 'Ponta Porã',  '2026-07-17', '08:00:00'),
((SELECT id FROM pessoas WHERE nome = 'Isabela Farias'),       'Viação Cruzeiro do Sul', 'Campo Grande', 'Três Lagoas', '2026-07-18', '13:30:00'),
((SELECT id FROM pessoas WHERE nome = 'Bruno Teixeira'),       'Viação Motta',           'Campo Grande', 'Dourados',    '2026-07-14', '06:00:00');

-- ---------------------------------------------------------------------------
-- Câmeras (10 registros, 1 relevante: placa exata na Rua 14 de Julho no horário)
-- ---------------------------------------------------------------------------

INSERT INTO cameras (local, placa_carro, data, hora) VALUES
('Rua 14 de Julho',      'HNT4E21', '2026-07-17', '23:15:00'),  -- RELEVANTE (Rafael)
('Avenida Mato Grosso',  'HNT4E27', '2026-07-17', '20:00:00'),  -- decoy (Vinícius, local/hora diferentes)
('Avenida Afonso Pena',  'CGC8J14', '2026-07-17', '18:00:00'),
('Rua Bahia',            'CGA9B12', '2026-07-17', '22:30:00'),
('Rua Dom Aquino',       'CGB1F09', '2026-07-17', '07:45:00'),
('Rua 14 de Julho',      'MSV2C88', '2026-07-17', '22:00:00'),
('Avenida Mato Grosso',  'PTL6M23', '2026-07-17', '23:15:00'),
('Rua Pernambuco',       'MSU7G31', '2026-07-16', '12:00:00'),
('Rua Marechal Rondon',  'CGD4N77', '2026-07-17', '21:20:00'),
('Avenida Afonso Pena',  'PTM5D44', '2026-07-17', '23:10:00');

-- ---------------------------------------------------------------------------
-- Role somente-leitura usada pelas queries dos participantes
-- ---------------------------------------------------------------------------

CREATE ROLE investigador WITH LOGIN PASSWORD 'investigador_ro_2026';
GRANT CONNECT ON DATABASE pato_da_mega TO investigador;
GRANT USAGE ON SCHEMA public TO investigador;
GRANT SELECT ON pessoas, ocorrencia, depoimentos, ligacoes, pix, passagens, cameras TO investigador;
ALTER ROLE investigador SET statement_timeout = '5s';
