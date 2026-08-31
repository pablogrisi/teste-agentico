/**
 * Defaults de ambiente para os testes e2e, aplicados só quando a variável
 * ainda não está definida. `DATABASE_URL` NÃO entra aqui — quem define é o
 * globalSetup (PostgreSQL embutido, ou banco externo via E2E_EXTERNAL_DB).
 */
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  ANALISTA_ATUAL_ID: 'analista-teste',
  ANALISTA_ATUAL_NOME: 'Analista de Teste',
  IA_ADAPTER: 'stub',
  ARMAZENAMENTO_PDF_DIR: './var/pdfs-test',
};

for (const [chave, valor] of Object.entries(defaults)) {
  if (!process.env[chave]) {
    process.env[chave] = valor;
  }
}
