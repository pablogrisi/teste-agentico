/**
 * Tipos mínimos para `embedded-postgres`.
 *
 * O pacote é ESM-only e declara `exports` sem `types`, então o
 * `moduleResolution: node` (clássico) do tsconfig não acha os `.d.ts` dele.
 * Em runtime, o Node 20+ resolve o `require` normalmente; aqui só declaramos
 * a superfície que os globalSetup/globalTeardown usam.
 */
declare module 'embedded-postgres' {
  export interface EmbeddedPostgresOptions {
    databaseDir: string;
    port: number;
    user: string;
    password: string;
    persistent: boolean;
    authMethod?: 'scram-sha-256' | 'password' | 'md5';
    initdbFlags?: string[];
    postgresFlags?: string[];
  }

  export default class EmbeddedPostgres {
    constructor(options?: Partial<EmbeddedPostgresOptions>);
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    createDatabase(name: string): Promise<void>;
    dropDatabase(name: string): Promise<void>;
  }
}
