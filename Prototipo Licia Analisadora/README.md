# LicIA — Analisadora

Protótipo de interface da **LicIA Analisadora**, ferramenta de apoio à análise de
processos licitatórios. A aplicação permite cadastrar uma nova análise (NUP, objeto
da contratação e upload do PDF) e revisar o processo em um painel com checklist,
filtros por parecer, alteração de pareceres e visualização do documento.

> Protótipo de front-end. Não há back-end: os dados são de demonstração e o upload
> não é persistido.

## Tecnologias

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) (dev server e build)
- [React Router](https://reactrouter.com/) (navegação entre telas)
- CSS Modules + tokens de tema (`src/theme`)

## Pré-requisitos

- [Node.js](https://nodejs.org/) **18 ou superior** (recomendado 20+)
- npm (acompanha o Node)

Confira sua versão:

```bash
node -v
```

## Como rodar localmente

1. Clone o repositório e entre na pasta do projeto:

   ```bash
   git clone <url-do-repositorio>
   cd licia-1
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abra o endereço exibido no terminal (por padrão **http://localhost:5173**).

O Vite recarrega a página automaticamente a cada alteração no código.

## Scripts disponíveis

| Comando             | Descrição                                              |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Sobe o servidor de desenvolvimento com hot reload      |
| `npm run build`     | Verifica os tipos e gera a versão de produção em `dist/` |
| `npm run preview`   | Serve localmente o conteúdo de `dist/` para conferência |
| `npm run typecheck` | Roda apenas a checagem de tipos do TypeScript          |

## Gerar e visualizar a build de produção

```bash
npm run build
npm run preview
```

O `build` gera os arquivos estáticos em `dist/`, prontos para publicação em qualquer
host estático (Vercel, Netlify, GitHub Pages, etc.).

## Estrutura do projeto

```
src/
├── assets/        # Recursos estáticos (marca, etc.)
├── components/    # Componentes compartilhados (ícones, Topbar)
├── data/          # Dados de demonstração e modelos de domínio
├── routes/        # Telas da aplicação
│   ├── HomePage/      # Lista de análises + modal "Nova análise"
│   └── AnalysisPage/  # Visor de PDF + painel de análise
└── theme/         # Tokens de cor, tipografia, espaçamento e raios
```

### Rotas

- `/` — lista de análises (página inicial)
- `/analise/:id` — tela de análise de um processo
