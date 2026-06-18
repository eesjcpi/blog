# Worker de autenticação

Este Worker guarda o segredo OAuth do GitHub e devolve ao Decap CMS um token
temporário da pessoa que fez login.

## Configuração

1. Na OAuth App do GitHub, configure:

   - Homepage URL: `https://eesjcpi.github.io/blog/`
   - Authorization callback URL:
     `https://NOME-DO-WORKER.workers.dev/callback`

2. Dentro desta pasta, instale o Wrangler:

   ```powershell
   npm install
   ```

3. Salve os segredos sem colocá-los no Git:

   ```powershell
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

4. Publique:

   ```powershell
   npm run deploy
   ```

5. Copie a URL exibida pelo Wrangler para `admin/config.yml`, em `base_url`.

Se o site utilizar domínio próprio, acrescente sua origem em
`ALLOWED_ORIGINS`, separada por vírgula. Origem não inclui caminho:
`https://www.exemplo.com`.
