# Atlas Pokémon

Uma Pokédex moderna e responsiva construída com React, TypeScript e a [PokéAPI](https://pokeapi.co/). O projeto é totalmente estático e pode ser publicado gratuitamente no GitHub Pages.

## Recursos

- Pokédex Nacional paginada, com busca e filtro por tipo;
- páginas detalhadas com atributos, biologia, habilidades, variantes shiny, formas regionais, Mega Evoluções, Gigantamax, linha evolutiva, golpes e áreas de encontro;
- catálogo dedicado exclusivamente a variações regionais, Mega Formas e Gigantamax;
- favoritos persistidos no navegador;
- explorador de todas as coleções documentadas da PokéAPI v2, incluindo itens, berries, movimentos, regiões, versões, concursos e evoluções;
- layout responsivo, estados de carregamento/erro e suporte a movimento reduzido;
- testes, lint, build TypeScript e deploy automatizado no GitHub Actions.

> A PokéAPI é uma API comunitária, pública e gratuita. Pokémon e os nomes dos personagens são marcas de seus respectivos proprietários.

## Desenvolvimento

Requer Node.js 22.22.2 ou superior.

```bash
npm install
npm run dev
```

Validação local:

```bash
npm test
npm run lint
npm run build
```

Ou execute todas as verificações com `npm run check`.

## Arquitetura

O código segue fronteiras simples para manter mudanças localizadas:

- `src/config`: configuração imutável da aplicação, rede e persistência;
- `src/lib/api-client.ts`: transporte HTTP, política de origem, timeout, cache LRU com TTL e deduplicação;
- `src/lib/api.ts`: fachada estável e transformações específicas do domínio Pokémon;
- `src/hooks` e `src/contexts`: estado assíncrono e estado compartilhado da interface;
- `src/pages` e `src/components`: composição de telas e apresentação, sem acesso direto à rede.

As páginas secundárias são carregadas sob demanda. Requisições simultâneas para a mesma URL compartilham o transporte, mas cada consumidor mantém cancelamento independente.

## Segurança e confiabilidade

- somente os endpoints HTTPS fixos da PokéAPI REST e GraphQL são aceitos pelos clientes de dados;
- a Content Security Policy limita scripts, conexões, imagens, fontes e formulários às origens necessárias;
- parâmetros de rota são codificados antes de compor URLs;
- dados persistidos no navegador são validados e têm limites de tamanho;
- falhas de renderização são contidas por uma barreira global;
- dependências usam versões exatas e o Dependabot acompanha atualizações;
- lint, testes e build TypeScript são obrigatórios no workflow de publicação.

## Publicação no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) executa testes, gera o build e publica a pasta `dist` a cada push para `main` ou `master`.

No repositório do GitHub, acesse **Settings → Pages** e selecione **GitHub Actions** em **Build and deployment**. Depois, faça push para a branch principal ou execute o workflow manualmente na aba **Actions**.

O app usa `HashRouter` e caminhos relativos, portanto funciona tanto em `usuario.github.io` quanto em `usuario.github.io/nome-do-repositorio` sem configuração adicional.

## Tecnologias

- React, TypeScript e Vite
- React Router
- Lucide Icons
- Vitest e Testing Library
- GitHub Actions e GitHub Pages

## Licença

MIT — consulte [LICENSE](LICENSE).
