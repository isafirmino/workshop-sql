const { createApp } = Vue;
const { createVuetify } = Vuetify;

const vuetify = createVuetify({
  theme: {
    defaultTheme: "patoDaMega",
    themes: {
      patoDaMega: {
        dark: true,
        colors: {
          background: "#14181f",
          surface: "#1c222c",
          primary: "#e8a33d",
          secondary: "#c1502e",
          error: "#e57373",
          info: "#64b5f6",
          success: "#81c784",
          warning: "#ffb74d",
        },
      },
    },
  },
});

const SCHEMA_HINTS = [
  {
    titulo: "Quais tabelas existem?",
    sql: "SELECT table_name FROM information_schema.tables\nWHERE table_schema = 'public';",
  },
  {
    titulo: "Quais colunas tem uma tabela?",
    sql: "SELECT column_name, data_type FROM information_schema.columns\nWHERE table_name = 'nome_da_tabela';",
  },
];

const SQL_CHEATSHEET = [
  { termo: "WHERE", uso: "filtra linhas por uma condição", exemplo: "WHERE bairro = 'Centro'" },
  { termo: "LIKE", uso: "busca texto parcial (% = qualquer coisa)", exemplo: "WHERE rua LIKE '%Julho%'" },
  { termo: "AND / OR", uso: "combina mais de uma condição", exemplo: "WHERE bairro = 'Centro' AND hora > '22:00'" },
  { termo: "BETWEEN", uso: "intervalo de valores (datas, horas, números)", exemplo: "WHERE hora BETWEEN '23:00' AND '23:10'" },
  { termo: "ORDER BY", uso: "ordena o resultado", exemplo: "ORDER BY data DESC" },
  { termo: "LIMIT", uso: "limita quantas linhas voltam", exemplo: "LIMIT 5" },
  { termo: "JOIN ... ON", uso: "junta duas tabelas por uma coluna em comum", exemplo: "JOIN pessoas ON pessoas.id = pix.pessoa_id" },
];

const PLAYGROUND_SCHEMA_HINTS = [
  {
    titulo: "Quais tabelas existem?",
    sql: "SELECT table_name FROM information_schema.tables\nWHERE table_schema = current_schema();",
  },
  {
    titulo: "Quais colunas tem uma tabela?",
    sql: "SELECT column_name, data_type FROM information_schema.columns\nWHERE table_name = 'pessoas';",
  },
];

const PLAYGROUND_CHEATSHEET = [
  ...SQL_CHEATSHEET,
  { termo: "CREATE TABLE", uso: "cria uma tabela nova", exemplo: "CREATE TABLE clientes (id SERIAL PRIMARY KEY, nome TEXT);" },
  { termo: "INSERT INTO", uso: "insere uma linha", exemplo: "INSERT INTO pessoas (nome, telefone) VALUES ('Ana', '67900000000');" },
  { termo: "UPDATE", uso: "atualiza linhas existentes", exemplo: "UPDATE pessoas SET bairro = 'Centro' WHERE id = 1;" },
  { termo: "DELETE FROM", uso: "remove linhas", exemplo: "DELETE FROM pessoas WHERE id = 1;" },
  { termo: "DROP TABLE", uso: "apaga uma tabela inteira", exemplo: "DROP TABLE clientes;" },
];

const CASE_BRIEF =
  'Durante a confraternização de fim de semestre da empresa júnior Mega, o mascote ' +
  'da equipe, conhecido como "Pato da Mega", foi furtado da sala de reuniões por ' +
  "volta das 23h15 de sexta-feira, no escritório da Avenida Afonso Pena, Centro de " +
  "Campo Grande. Testemunhas relatam ter visto uma pessoa saindo apressada pela " +
  "porta dos fundos poucos minutos antes do sumiço ser notado. Um segurança do " +
  "prédio vizinho afirma ter visto um carro saindo em alta velocidade da rua ao " +
  "lado por volta do mesmo horário. Vasculhe os registros da empresa e da polícia " +
  "para descobrir quem — e por quê — levou o pato.";

async function api(method, url, body) {
  const resp = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data && data.detail ? data.detail : "Erro inesperado.";
    throw new Error(msg);
  }
  return data;
}

createApp({
  data() {
    return {
      stage: "loading",
      schemaHints: SCHEMA_HINTS,
      sqlCheatsheet: SQL_CHEATSHEET,
      playgroundSchemaHints: PLAYGROUND_SCHEMA_HINTS,
      playgroundCheatsheet: PLAYGROUND_CHEATSHEET,
      solutionPath: [],
      caseBrief: CASE_BRIEF,
      motiveReveal: "",

      nomeInput: "",
      nome: "",
      loginError: "",
      loginLoading: false,
      playgroundLoading: false,
      playgroundResetLoading: false,

      pgSql: "",
      pgQueryLoading: false,
      pgError: null,
      pgMessage: null,
      pgColumns: [],
      pgRows: [],
      pgTruncated: false,
      pgHistory: [],

      startedAt: null,
      now: Date.now(),
      timerHandle: null,

      queryCount: 0,
      sql: "",
      queryLoading: false,
      queryError: null,
      columns: [],
      rows: [],
      truncated: false,
      queryHistory: [],

      suspeito: "",
      pessoasNomes: [],
      solveLoading: false,
      tentativasRestantes: 3,

      finalElapsed: null,
      rankingPosicao: null,
      rankingTotal: null,

      snackbar: false,
      snackbarText: "",
      snackbarColor: "error",
    };
  },
  computed: {
    elapsedSeconds() {
      if (this.finalElapsed !== null) return this.finalElapsed;
      if (!this.startedAt) return 0;
      return (this.now - this.startedAt) / 1000;
    },
    elapsedFormatted() {
      return this.formatTime(this.elapsedSeconds);
    },
    tableHeaders() {
      return this.columns.map((c) => ({ title: c, key: c, sortable: false }));
    },
    tableItems() {
      return this.rows.map((r) => {
        const obj = {};
        this.columns.forEach((c, i) => {
          obj[c] = r[i] === null ? "NULL" : r[i];
        });
        return obj;
      });
    },
    sortedQueryHistory() {
      const favoritas = this.queryHistory.filter((h) => h.fav);
      const outras = this.queryHistory.filter((h) => !h.fav);
      return [...favoritas, ...outras];
    },
    pgTableHeaders() {
      return this.pgColumns.map((c) => ({ title: c, key: c, sortable: false }));
    },
    pgTableItems() {
      return this.pgRows.map((r) => {
        const obj = {};
        this.pgColumns.forEach((c, i) => {
          obj[c] = r[i] === null ? "NULL" : r[i];
        });
        return obj;
      });
    },
    sortedPgHistory() {
      const favoritas = this.pgHistory.filter((h) => h.fav);
      const outras = this.pgHistory.filter((h) => !h.fav);
      return [...favoritas, ...outras];
    },
  },
  methods: {
    formatTime(totalSeconds) {
      const s = Math.max(0, Math.floor(totalSeconds));
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    },
    startTimer() {
      if (this.timerHandle) return;
      this.timerHandle = setInterval(() => {
        this.now = Date.now();
      }, 1000);
    },
    notify(text, color = "error") {
      this.snackbarText = text;
      this.snackbarColor = color;
      this.snackbar = true;
    },
    async loadPessoasNomes() {
      try {
        this.pessoasNomes = await api("GET", "/api/pessoas/nomes");
      } catch (e) {}
    },
    async loadRanking() {
      try {
        const lista = await api("GET", "/api/ranking");
        this.rankingTotal = lista.length;
        const entry = lista.find((e) => e.nome === this.nome);
        this.rankingPosicao = entry ? entry.posicao : null;
      } catch (e) {}
    },
    async bootstrap() {
      try {
        const me = await api("GET", "/api/me");
        this.nome = me.nome;
        this.startedAt = new Date(me.started_at).getTime();
        this.queryCount = me.query_count;
        this.tentativasRestantes = me.tentativas_restantes;
        this.loadPessoasNomes();
        if (me.solved) {
          this.finalElapsed = me.elapsed_seconds;
          this.motiveReveal = me.motive_reveal;
          this.solutionPath = me.solution_path || [];
          this.stage = "vitoria";
          this.loadRanking();
        } else {
          this.stage = "game";
          this.startTimer();
        }
      } catch (e) {
        this.stage = "login";
      }
    },
    async login() {
      const nome = this.nomeInput.trim();
      if (!nome) {
        this.loginError = "Digite seu nome pra entrar no caso.";
        return;
      }
      this.loginLoading = true;
      this.loginError = "";
      try {
        const me = await api("POST", "/api/signup", { nome });
        this.nome = me.nome;
        this.startedAt = new Date(me.started_at).getTime();
        this.queryCount = me.query_count;
        this.tentativasRestantes = me.tentativas_restantes;
        this.stage = "game";
        this.startTimer();
        this.loadPessoasNomes();
      } catch (e) {
        this.loginError = e.message;
      } finally {
        this.loginLoading = false;
      }
    },
    async runQuery() {
      if (this.queryLoading || !this.sql.trim()) return;
      this.queryLoading = true;
      const sqlRodado = this.sql;
      try {
        const resp = await api("POST", "/api/query", { sql: sqlRodado });
        this.queryCount = resp.query_count;
        this.queryError = resp.error;
        this.columns = resp.columns;
        this.rows = resp.rows;
        this.truncated = resp.truncated;
        this.queryHistory.unshift({ sql: sqlRodado, ok: !resp.error, fav: false });
        if (this.queryHistory.length > 30) this.queryHistory.length = 30;
      } catch (e) {
        this.queryError = e.message;
      } finally {
        this.queryLoading = false;
      }
    },
    reuseQuery(sql) {
      this.sql = sql;
    },
    toggleFavorite(item) {
      item.fav = !item.fav;
    },
    useHint(sql) {
      this.sql = sql;
    },
    onEditorKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.runQuery();
      }
    },
    async enterPlayground() {
      this.playgroundLoading = true;
      try {
        await api("POST", "/api/playground/start");
        this.stage = "playground";
      } catch (e) {
        this.notify(e.message);
      } finally {
        this.playgroundLoading = false;
      }
    },
    async runPlaygroundQuery() {
      if (this.pgQueryLoading || !this.pgSql.trim()) return;
      this.pgQueryLoading = true;
      const sqlRodado = this.pgSql;
      try {
        const resp = await api("POST", "/api/playground/query", { sql: sqlRodado });
        this.pgError = resp.error;
        this.pgMessage = resp.message;
        this.pgColumns = resp.columns;
        this.pgRows = resp.rows;
        this.pgTruncated = resp.truncated;
        this.pgHistory.unshift({ sql: sqlRodado, ok: !resp.error, fav: false });
        if (this.pgHistory.length > 30) this.pgHistory.length = 30;
      } catch (e) {
        this.pgError = e.message;
      } finally {
        this.pgQueryLoading = false;
      }
    },
    reusePlaygroundQuery(sql) {
      this.pgSql = sql;
    },
    togglePlaygroundFavorite(item) {
      item.fav = !item.fav;
    },
    onPgEditorKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.runPlaygroundQuery();
      }
    },
    async resetPlayground() {
      this.playgroundResetLoading = true;
      try {
        await api("POST", "/api/playground/reset");
        this.pgSql = "";
        this.pgError = null;
        this.pgMessage = null;
        this.pgColumns = [];
        this.pgRows = [];
        this.pgHistory = [];
        this.notify("Playground reiniciado — tabela pessoas de novo do zero!", "success");
      } catch (e) {
        this.notify(e.message);
      } finally {
        this.playgroundResetLoading = false;
      }
    },
    sairDoPlayground() {
      this.bootstrap();
    },
    async acusar() {
      const suspeito = this.suspeito.trim();
      if (!suspeito) {
        this.notify("Escreva o nome de quem você está acusando.");
        return;
      }
      this.solveLoading = true;
      try {
        const resp = await api("POST", "/api/solve", { suspeito });
        if (resp.tentativas_restantes !== null && resp.tentativas_restantes !== undefined) {
          this.tentativasRestantes = resp.tentativas_restantes;
        }
        if (resp.correct) {
          this.finalElapsed = resp.elapsed_seconds;
          this.queryCount = resp.query_count;
          this.motiveReveal = resp.motive_reveal;
          this.solutionPath = resp.solution_path || [];
          clearInterval(this.timerHandle);
          this.stage = "vitoria";
          this.loadRanking();
        } else if (this.tentativasRestantes <= 0) {
          this.notify("Você usou suas 3 tentativas. Continue investigando, mas não dá mais pra acusar.", "error");
        } else {
          this.notify(
            `Não foi essa pessoa — restam ${this.tentativasRestantes} tentativa(s).`,
            "warning"
          );
        }
      } catch (e) {
        this.notify(e.message);
      } finally {
        this.solveLoading = false;
      }
    },
  },
  mounted() {
    this.bootstrap();
  },
  template: `
  <v-app>
    <template v-if="stage === 'loading'">
      <div class="pdm-login-bg">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>
    </template>

    <template v-else-if="stage === 'login'">
      <div class="pdm-login-bg">
        <v-card max-width="440" class="pa-4" elevation="12">
          <v-card-item>
            <div class="pdm-eyebrow mb-2">Empresa Júnior Mega &middot; Campo Grande, MS</div>
            <v-card-title class="pdm-display text-h4">O Sumiço do Pato da Mega</v-card-title>
            <v-card-subtitle class="mt-2" style="white-space: normal;">
              Um mascote desapareceu na confraternização de sexta. Entre com seu nome
              pra abrir o caso — o cronômetro e o contador de queries começam na hora.
            </v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <v-text-field
              v-model="nomeInput"
              label="Seu nome"
              variant="outlined"
              autofocus
              :error-messages="loginError"
              @keydown.enter="login"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn block color="primary" size="large" :loading="loginLoading" @click="login">
              Entrar no caso
            </v-btn>
          </v-card-actions>
          <v-divider class="my-2" />
          <v-card-text class="pt-2">
            <v-btn
              block
              variant="tonal"
              color="secondary"
              :loading="playgroundLoading"
              @click="enterPlayground"
            >
               Praticar no playground livre
            </v-btn>
            <p class="text-caption mt-2 text-center" style="opacity: 0.7;">
              Sem caso pra resolver — só um banco pra você testar SELECT, INSERT,
              UPDATE, DELETE, CREATE TABLE à vontade.
            </p>
          </v-card-text>
        </v-card>
      </div>
    </template>

    <template v-else-if="stage === 'playground'">
      <v-app-bar color="surface" density="comfortable" elevation="2">
        <v-btn icon="mdi-arrow-left" variant="text" class="ml-1" @click="sairDoPlayground" />
        <v-app-bar-title class="pdm-display">
          🧪 Playground SQL
        </v-app-bar-title>
        <v-btn
          variant="tonal"
          color="warning"
          size="small"
          class="mr-4"
          :loading="playgroundResetLoading"
          @click="resetPlayground"
        >
          Recomeçar
        </v-btn>
      </v-app-bar>

      <v-main>
        <v-container class="py-6" style="max-width: 1600px;">
          <v-row>
            <v-col cols="12">
              <div class="pdm-eyebrow mb-1">Banco livre &middot; sem pontuação, sem cronômetro</div>
              <div class="pdm-case-file">
                Aqui já existe uma tabela <strong>pessoas</strong> (mesmas colunas do
                desafio) pronta pra você mexer. Teste SELECT, INSERT, UPDATE, DELETE,
                CREATE TABLE, DROP TABLE — o que quiser. Se bagunçar tudo, é só clicar
                em "Recomeçar" que volta do zero.
              </div>
            </v-col>
          </v-row>

          <v-row class="mt-2">
            <v-col cols="12" md="8">
              <v-card>
                <v-card-title class="text-subtitle-1 pdm-display">Editor SQL</v-card-title>
                <v-card-text>
                  <v-textarea
                    v-model="pgSql"
                    class="pdm-sql-editor"
                    variant="outlined"
                    rows="4"
                    placeholder="SELECT * FROM pessoas LIMIT 5;"
                    @keydown="onPgEditorKeydown"
                  />
                  <div class="d-flex align-center">
                    <v-btn color="primary" :loading="pgQueryLoading" @click="runPlaygroundQuery">
                      Executar (Ctrl+Enter)
                    </v-btn>
                    <v-spacer />
                    <span v-if="pgTruncated" class="text-caption text-warning">
                      Mostrando as primeiras 200 linhas
                    </span>
                  </div>

                  <v-alert v-if="pgError" type="error" variant="tonal" class="mt-4">
                    {{ pgError }}
                  </v-alert>

                  <v-alert v-else-if="pgMessage" type="success" variant="tonal" class="mt-4">
                    {{ pgMessage }}
                  </v-alert>

                  <v-data-table
                    v-if="!pgError && pgColumns.length"
                    class="pdm-results-table mt-4"
                    :headers="pgTableHeaders"
                    :items="pgTableItems"
                    density="compact"
                    items-per-page="10"
                  />
                </v-card-text>
              </v-card>

              <v-card class="mt-4">
                <v-card-title class="text-subtitle-1 pdm-display">Histórico de queries</v-card-title>
                <v-card-text>
                  <p v-if="!pgHistory.length" class="text-body-2" style="opacity: 0.7;">
                    As queries que você executar vão aparecer aqui — clique numa delas
                    pra reusar, ou favorite (⭐) pra deixar fixada no topo.
                  </p>
                  <div v-else style="max-height: 260px; overflow-y: auto;">
                    <v-card
                      v-for="(h, i) in sortedPgHistory"
                      :key="i"
                      variant="tonal"
                      :color="h.ok ? undefined : 'error'"
                      class="mb-2 pa-2 d-flex align-start"
                      style="cursor: pointer;"
                      @click="reusePlaygroundQuery(h.sql)"
                    >
                      <pre class="pdm-mono flex-grow-1" style="white-space: pre-wrap; font-size: 0.75rem; margin: 0;">{{ h.sql }}</pre>
                      <v-btn
                        :icon="h.fav ? 'mdi-star' : 'mdi-star-outline'"
                        size="x-small"
                        variant="text"
                        :color="h.fav ? 'primary' : undefined"
                        @click.stop="togglePlaygroundFavorite(h)"
                      />
                    </v-card>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card>
                <v-card-title class="text-subtitle-1 pdm-display">Como ver as tabelas</v-card-title>
                <v-card-text>
                  <v-card
                    v-for="h in playgroundSchemaHints"
                    :key="h.titulo"
                    variant="tonal"
                    class="mb-3 pa-3"
                  >
                    <div class="text-caption mb-1" style="opacity: 0.8;">{{ h.titulo }}</div>
                    <pre class="pdm-mono" style="white-space: pre-wrap; font-size: 0.78rem; margin: 0;">{{ h.sql }}</pre>
                    <v-btn size="small" variant="text" color="primary" class="mt-1" @click="reusePlaygroundQuery(h.sql)">
                      usar essa query
                    </v-btn>
                  </v-card>
                </v-card-text>
              </v-card>

              <v-card class="mt-4">
                <v-card-title class="text-subtitle-1 pdm-display">Comandos SQL úteis</v-card-title>
                <v-card-text>
                  <div
                    v-for="c in playgroundCheatsheet"
                    :key="c.termo"
                    class="mb-3"
                  >
                    <div>
                      <strong class="pdm-mono" style="color: var(--pdm-amber);">{{ c.termo }}</strong>
                      <span class="text-caption" style="opacity: 0.75;"> — {{ c.uso }}</span>
                    </div>
                    <pre class="pdm-mono" style="white-space: pre-wrap; font-size: 0.75rem; opacity: 0.9; margin: 2px 0 0;">{{ c.exemplo }}</pre>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </template>

    <template v-else-if="stage === 'game'">
      <v-app-bar color="surface" density="comfortable" elevation="2">
        <v-app-bar-title class="pdm-display">
          🔎 O Sumiço do Pato da Mega
        </v-app-bar-title>
        <v-chip class="mr-3 pdm-timer" color="primary" variant="tonal" prepend-icon="mdi-timer-outline">
          {{ elapsedFormatted }}
        </v-chip>
        <v-chip class="mr-4" color="secondary" variant="tonal" prepend-icon="mdi-database-search">
          {{ queryCount }} {{ queryCount === 1 ? 'query' : 'queries' }}
        </v-chip>
      </v-app-bar>

      <v-main>
        <v-container class="py-6" style="max-width: 1600px;">
          <v-row>
            <v-col cols="12">
              <div class="pdm-eyebrow mb-1">Boletim de Ocorrência &middot; Centro, Campo Grande</div>
              <div class="pdm-case-file">{{ caseBrief }}</div>
            </v-col>
          </v-row>

          <v-row class="mt-2">
            <v-col cols="12" md="3">
              <v-card>
                <v-card-title class="text-subtitle-1 pdm-display">Quem foi?</v-card-title>
                <v-card-text>
                  <v-combobox
                    v-model="suspeito"
                    :items="pessoasNomes"
                    label="Nome do suspeito"
                    variant="outlined"
                    density="comfortable"
                    :disabled="tentativasRestantes <= 0"
                  />
                  <v-btn
                    block
                    color="secondary"
                    size="large"
                    :loading="solveLoading"
                    :disabled="tentativasRestantes <= 0"
                    @click="acusar"
                  >
                    Acusar
                  </v-btn>
                  <p class="text-caption mt-2 text-center" style="opacity: 0.75;">
                    {{ tentativasRestantes }} tentativa(s) restante(s)
                  </p>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card>
                <v-card-title class="text-subtitle-1 pdm-display">Editor SQL</v-card-title>
                <v-card-text>
                  <v-textarea
                    v-model="sql"
                    class="pdm-sql-editor"
                    variant="outlined"
                    rows="4"
                    placeholder="SELECT * FROM pessoas LIMIT 5;"
                    @keydown="onEditorKeydown"
                  />
                  <div class="d-flex align-center">
                    <v-btn color="primary" :loading="queryLoading" @click="runQuery">
                      Executar (Ctrl+Enter)
                    </v-btn>
                    <v-spacer />
                    <span v-if="truncated" class="text-caption text-warning">
                      Mostrando as primeiras 200 linhas
                    </span>
                  </div>

                  <v-alert v-if="queryError" type="error" variant="tonal" class="mt-4">
                    {{ queryError }}
                  </v-alert>

                  <v-data-table
                    v-else-if="columns.length"
                    class="pdm-results-table mt-4"
                    :headers="tableHeaders"
                    :items="tableItems"
                    density="compact"
                    items-per-page="10"
                  />
                </v-card-text>
              </v-card>

              <v-card class="mt-4">
                <v-card-title class="text-subtitle-1 pdm-display">Histórico de queries</v-card-title>
                <v-card-text>
                  <p v-if="!queryHistory.length" class="text-body-2" style="opacity: 0.7;">
                    As queries que você executar vão aparecer aqui — clique numa delas
                    pra reusar sem precisar digitar de novo, ou favorite (⭐) pra deixar
                    fixada no topo.
                  </p>
                  <div v-else style="max-height: 260px; overflow-y: auto;">
                    <v-card
                      v-for="(h, i) in sortedQueryHistory"
                      :key="i"
                      variant="tonal"
                      :color="h.ok ? undefined : 'error'"
                      class="mb-2 pa-2 d-flex align-start"
                      style="cursor: pointer;"
                      @click="reuseQuery(h.sql)"
                    >
                      <pre class="pdm-mono flex-grow-1" style="white-space: pre-wrap; font-size: 0.75rem; margin: 0;">{{ h.sql }}</pre>
                      <v-btn
                        :icon="h.fav ? 'mdi-star' : 'mdi-star-outline'"
                        size="x-small"
                        variant="text"
                        :color="h.fav ? 'primary' : undefined"
                        @click.stop="toggleFavorite(h)"
                      />
                    </v-card>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3">
              <v-card>
                <v-card-title class="text-subtitle-1 pdm-display">Como ver as tabelas</v-card-title>
                <v-card-text>
                  <p class="text-body-2 mb-3" style="opacity: 0.85;">
                    Ninguém te entregou um mapa do banco — descubra sozinho(a) quais
                    tabelas existem e o que tem dentro de cada uma:
                  </p>
                  <v-card
                    v-for="h in schemaHints"
                    :key="h.titulo"
                    variant="tonal"
                    class="mb-3 pa-3"
                  >
                    <div class="text-caption mb-1" style="opacity: 0.8;">{{ h.titulo }}</div>
                    <pre class="pdm-mono" style="white-space: pre-wrap; font-size: 0.78rem; margin: 0;">{{ h.sql }}</pre>
                    <v-btn size="small" variant="text" color="primary" class="mt-1" @click="useHint(h.sql)">
                      usar essa query
                    </v-btn>
                  </v-card>
                </v-card-text>
              </v-card>

              <v-card class="mt-4">
                <v-card-title class="text-subtitle-1 pdm-display">Comandos SQL úteis</v-card-title>
                <v-card-text>
                  <div
                    v-for="c in sqlCheatsheet"
                    :key="c.termo"
                    class="mb-3"
                  >
                    <div>
                      <strong class="pdm-mono" style="color: var(--pdm-amber);">{{ c.termo }}</strong>
                      <span class="text-caption" style="opacity: 0.75;"> — {{ c.uso }}</span>
                    </div>
                    <pre class="pdm-mono" style="white-space: pre-wrap; font-size: 0.75rem; opacity: 0.9; margin: 2px 0 0;">{{ c.exemplo }}</pre>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </template>

    <template v-else-if="stage === 'vitoria'">
      <div class="pdm-login-bg">
        <v-card max-width="520" class="pa-4" elevation="12">
          <v-card-item>
            <div class="pdm-eyebrow mb-2">Caso encerrado</div>
            <v-card-title class="pdm-display text-h4">🦆 Caso Resolvido!</v-card-title>
          </v-card-item>
          <v-card-text>
            <p class="mb-4">Parabéns, {{ nome }}! Você desvendou o sumiço do Pato da Mega.</p>

            <v-row dense class="mb-4">
              <v-col cols="6">
                <v-card variant="tonal" color="primary" class="pa-3 text-center">
                  <div class="text-caption">Tempo</div>
                  <div class="text-h5 pdm-timer">{{ elapsedFormatted }}</div>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card variant="tonal" color="secondary" class="pa-3 text-center">
                  <div class="text-caption">Queries</div>
                  <div class="text-h5">{{ queryCount }}</div>
                </v-card>
              </v-col>
            </v-row>

            <v-alert v-if="rankingPosicao" type="success" variant="tonal" class="mb-4">
              Você está na posição #{{ rankingPosicao }} do ranking{{ rankingTotal ? (' de ' + rankingTotal) : '' }}!
            </v-alert>

            <div class="pdm-case-file mb-4">{{ motiveReveal }}</div>

            <v-expansion-panels variant="accordion">
              <v-expansion-panel title="Ver o caminho mais rápido pra resolver">
                <v-expansion-panel-text>
                  <ol style="padding-left: 1.1rem;">
                    <li v-for="(p, i) in solutionPath" :key="i" class="mb-3">
                      <div class="mb-1">{{ p.texto }}</div>
                      <pre class="pdm-mono" style="white-space: pre-wrap; font-size: 0.78rem; opacity: 0.85; margin: 0;">{{ p.sql }}</pre>
                    </li>
                  </ol>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="tonal" color="secondary" :loading="playgroundLoading" @click="enterPlayground">
              Ir pro playground
            </v-btn>
            <v-spacer />
            <v-btn color="primary" href="/ranking" target="_blank">Ver ranking ao vivo</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </template>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
  `,
})
  .use(vuetify)
  .mount("#app");
