/**
 * Defaults de ambiente para os testes e2e, aplicados só quando a variável
 * ainda não está definida. Permite rodar `npm run test:e2e` apontando para o
 * PostgreSQL do `docker compose` sem um `.env` dedicado.
 */
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://licia:licia@localhost:5432/licia?schema=public',
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
