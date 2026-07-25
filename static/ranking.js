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

const MEDALS = ["🥇", "🥈", "🥉"];

createApp({
  data() {
    return {
      entries: [],
      pollHandle: null,
    };
  },
  methods: {
    formatTime(totalSeconds) {
      const s = Math.max(0, Math.floor(totalSeconds));
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    },
    medalFor(posicao) {
      return MEDALS[posicao - 1] || "";
    },
    async refresh() {
      try {
        const resp = await fetch("/api/ranking");
        this.entries = await resp.json();
      } catch (e) {}
    },
  },
  mounted() {
    this.refresh();
    this.pollHandle = setInterval(this.refresh, 3000);
  },
  beforeUnmount() {
    clearInterval(this.pollHandle);
  },
  template: `
  <v-app>
    <v-main>
      <v-container class="py-10" style="max-width: 900px;">
        <div class="text-center mb-8">
          <div class="pdm-eyebrow mb-2">Empresa Júnior Mega &middot; Campo Grande, MS</div>
          <h1 class="pdm-display text-h3">🦆 Ranking &mdash; O Sumiço do Pato da Mega</h1>
        </div>

        <v-alert v-if="!entries.length" type="info" variant="tonal" class="text-center">
          Ninguém resolveu o caso ainda... quem vai ser o primeiro?
        </v-alert>

        <v-card v-else>
          <v-table class="pdm-mono">
            <thead>
              <tr>
                <th class="text-h6">#</th>
                <th class="text-h6">Investigador(a)</th>
                <th class="text-h6 text-right">Tempo</th>
                <th class="text-h6 text-right">Queries</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in entries" :key="e.posicao">
                <td class="text-h6">{{ medalFor(e.posicao) || e.posicao }}</td>
                <td class="text-h6">{{ e.nome }}</td>
                <td class="text-h6 text-right pdm-timer">{{ formatTime(e.elapsed_seconds) }}</td>
                <td class="text-h6 text-right">{{ e.query_count }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
  `,
})
  .use(vuetify)
  .mount("#app");
