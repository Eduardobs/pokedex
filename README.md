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

Requer Node.js 22 ou superior.

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
