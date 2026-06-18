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
3. Crie uma postagem.
4. Escolha a categoria.
5. Preencha imagem ou link do Instagram quando necessário.
6. Marque `Publicado`.
7. Salve.

Somente contas com permissão de escrita no repositório `eesjcpi/blog`
conseguirão publicar.
