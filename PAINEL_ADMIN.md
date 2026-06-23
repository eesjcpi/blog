# Painel administrativo

O painel fica em:

`https://blog.eesjv.com.br/admin/`

Ele utiliza o Decap CMS para criar arquivos JSON em `content/postagens`.
Quando uma postagem é salva, o GitHub Actions monta novamente o site e publica
o resultado no GitHub Pages.

## 1. Publicar o Worker

Abra o PowerShell na pasta `cloudflare-worker`:

```powershell
npm install
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npm run deploy
```

O Wrangler exibirá uma URL semelhante a:

`https://ee-sao-jose-blog-auth.usuario.workers.dev`

## 2. Configurar a OAuth App do GitHub

Na OAuth App criada no GitHub:

   - Homepage URL: `https://blog.eesjv.com.br/`
- Authorization callback URL:
  `https://URL-DO-WORKER.workers.dev/callback`

O callback precisa ser exatamente o endereço do Worker seguido de `/callback`.

## 3. Ligar o painel ao Worker

Abra `admin/config.yml` e substitua:

```yaml
base_url: https://SEU-WORKER.workers.dev
```

pela URL real publicada pelo Wrangler, sem `/callback`.

## 4. Configurar o GitHub Pages

Em **Settings > Pages > Build and deployment**, escolha:

`Source: GitHub Actions`

Depois envie os arquivos para a branch `main`. A Action `Publicar site`
montará e publicará a página.

## 5. Publicar conteúdo

1. Acesse `/admin/`.
2. Clique em entrar com GitHub.
3. Escolha diretamente a coleção `Projetos`, `Galeria`, `Instagram` ou
   `Vestibular`. Cada uma mostra somente os campos necessários.
4. Para cadastrar uma viagem, abra a coleção `Viagens` e clique em
   `Novo álbum de viagem`.
5. Preencha os dados. A viagem pode ser salva sem fotos e completada depois.
6. Marque `Publicado`.
7. Salve.

Somente contas com permissão de escrita no repositório `eesjcpi/blog`
conseguirão publicar.

## 6. Excluir conteúdo

Postagens e viagens criadas pela área administrativa podem ser excluídas:

1. Abra a coleção correspondente ou `Viagens`.
2. Abra o item que deseja remover.
3. Use a opção `Excluir entrada` no menu de ações.
4. Confirme a exclusão.

A exclusão cria um commit no GitHub e uma nova publicação do site é iniciada.
As publicações históricas importadas diretamente para a pasta `posts` não
aparecem no painel e, por isso, não podem ser excluídas por ele.
