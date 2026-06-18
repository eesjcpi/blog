const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export default {
    async fetch(request, env) {
        try {
            const url = new URL(request.url);

            if (url.pathname === "/") {
                return json({
                    service: "EE São José - autenticação do painel",
                    status: "online",
                });
            }

            if (url.pathname === "/auth") {
                return startAuthorization(url, env);
            }

            if (url.pathname === "/callback") {
                return finishAuthorization(request, url, env);
            }

            return new Response("Não encontrado", { status: 404 });
        } catch (error) {
            return htmlPage(`Erro de configuração: ${escapeHtml(error.message)}`, 500);
        }
    },
};

function startAuthorization(url, env) {
    requireEnvironment(env);

    const state = crypto.randomUUID();
    const callbackUrl = `${url.origin}/callback`;
    const scope = env.GITHUB_SCOPE || "public_repo,user:email";
    const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);

    authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
    authorizeUrl.searchParams.set("scope", scope);
    authorizeUrl.searchParams.set("state", state);

    return new Response(null, {
        status: 302,
        headers: {
            Location: authorizeUrl.toString(),
            "Set-Cookie": [
                `oauth_state=${encodeURIComponent(state)}`,
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                "Path=/",
                "Max-Age=600",
            ].join("; "),
            "Cache-Control": "no-store",
        },
    });
}

async function finishAuthorization(request, url, env) {
    requireEnvironment(env);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = readCookie(request.headers.get("Cookie") || "", "oauth_state");

    if (!code || !state || !savedState || state !== savedState) {
        return htmlPage("Autenticação inválida ou expirada.", 400);
    }

    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "ee-sao-jose-decap-oauth",
        },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${url.origin}/callback`,
        }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
        const message = tokenData.error_description || tokenData.error || "O GitHub não forneceu um token.";
        return htmlPage(`Falha na autenticação: ${escapeHtml(message)}`, 502);
    }

    return oauthSuccessPage(tokenData.access_token, allowedOrigins(env), {
        "Set-Cookie": "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    });
}

function oauthSuccessPage(token, origins, extraHeaders = {}) {
    const payload = JSON.stringify({
        provider: "github",
        token,
    }).replaceAll("<", "\\u003c");
    const allowed = JSON.stringify(origins).replaceAll("<", "\\u003c");

    const body = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Login concluído</title></head>
<body>
<p>Autenticação concluída. Esta janela será fechada automaticamente.</p>
<script>
(() => {
    const allowedOrigins = ${allowed};
    const successMessage = "authorization:github:success:" + ${JSON.stringify(payload)};

    function respond(event) {
        if (!window.opener || !allowedOrigins.includes(event.origin)) return;
        window.opener.postMessage(successMessage, event.origin);
        window.close();
    }

    window.addEventListener("message", respond, false);
    if (window.opener) {
        window.opener.postMessage("authorizing:github", "*");
    }
})();
</script>
</body>
</html>`;

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';",
            ...extraHeaders,
        },
    });
}

function allowedOrigins(env) {
    const configured = (env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean);

    if (!configured.length) {
        throw new Error("Configure ALLOWED_ORIGINS no Worker.");
    }

    return configured;
}

function requireEnvironment(env) {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        throw new Error("Configure GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET no Worker.");
    }
}

function readCookie(cookieHeader, name) {
    for (const entry of cookieHeader.split(";")) {
        const [key, ...valueParts] = entry.trim().split("=");
        if (key === name) {
            return decodeURIComponent(valueParts.join("="));
        }
    }
    return "";
}

function htmlPage(message, status) {
    return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body><p>${message}</p></body></html>`, {
        status,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

function json(value) {
    return new Response(JSON.stringify(value), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
