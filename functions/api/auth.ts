/*
 * Cloudflare Pages Function for Decap CMS GitHub OAuth.
 * Handles both the initial redirect to GitHub and the callback that exchanges
 * the authorization code for an access token before posting the result back to
 * the CMS popup window.
 */

const COOKIE_NAME = 'gh_oauth_state';
const COOKIE_MAX_AGE_SECONDS = 10 * 60; // 10 minutes

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  CMS_ALLOWED_RETURN_ORIGINS?: string;
}

interface OAuthState {
  nonce: string;
  origin?: string | null;
}

interface GithubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const url = new URL(request.url);
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response('GitHub OAuth is not configured.', { status: 500 });
  }

  const code = url.searchParams.get('code');
  const incomingState = url.searchParams.get('state');

  if (!code) {
    return beginAuthorization({ request, url, clientId });
  }

  return completeAuthorization({ request, url, clientId, clientSecret, incomingState, env });
};

function beginAuthorization({
  request,
  url,
  clientId,
}: {
  request: Request;
  url: URL;
  clientId: string;
}): Response {
  const origin = deriveRequestOrigin({ request, fallback: url.origin });
  const stateValue = encodeState({ nonce: crypto.randomUUID(), origin });
  const redirectUri = `${url.origin}${url.pathname}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user:email',
    state: stateValue,
    allow_signup: 'false',
  });

  const authorizeUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  const response = new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      'Cache-Control': 'no-store',
    },
  });

  response.headers.append(
    'Set-Cookie',
    createCookieHeader({
      name: COOKIE_NAME,
      value: stateValue,
      path: url.pathname,
      maxAge: COOKIE_MAX_AGE_SECONDS,
    }),
  );

  return response;
}

async function completeAuthorization({
  request,
  url,
  clientId,
  clientSecret,
  incomingState,
  env,
}: {
  request: Request;
  url: URL;
  clientId: string;
  clientSecret: string;
  incomingState: string | null;
  env: Env;
}): Promise<Response> {
  const cookies = parseCookies(request.headers.get('cookie'));
  const storedStateRaw = cookies[COOKIE_NAME];
  const storedState = decodeState(storedStateRaw);
  const incomingStateData = decodeState(incomingState);

  if (!storedState || !incomingStateData || storedState.nonce !== incomingStateData.nonce) {
    return oauthError({ url, env, message: 'state_mismatch', requestedOrigin: storedState?.origin });
  }

  const token = await exchangeCode({
    code: url.searchParams.get('code')!,
    clientId,
    clientSecret,
    redirectUri: `${url.origin}${url.pathname}`,
    state: incomingState!,
  });

  if ('error' in token) {
    return oauthError({
      url,
      env,
      message: token.error_description ?? token.error ?? 'oauth_error',
      requestedOrigin: storedState.origin,
    });
  }

  return oauthSuccess({ url, env, token: token.access_token ?? '', origin: storedState.origin });
}

async function exchangeCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  state,
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  state: string;
}): Promise<GithubTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });

  let payload: GithubTokenResponse;
  try {
    payload = (await response.json()) as GithubTokenResponse;
  } catch (error) {
    return { error: 'invalid_response', error_description: `Unable to parse GitHub response: ${String(error)}` };
  }

  if (!response.ok || payload.error || !payload.access_token) {
    return payload.error
      ? payload
      : { error: 'invalid_token', error_description: 'GitHub response did not include an access token.' };
  }

  return payload;
}

function oauthSuccess({
  url,
  env,
  token,
  origin,
}: {
  url: URL;
  env: Env;
  token: string;
  origin?: string | null;
}): Response {
  const html = buildPostMessagePage({
    origins: resolveAllowedOrigins({ requestedOrigin: origin, url, env }),
    payload: JSON.stringify({ token }),
    provider: 'github',
    error: null,
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': createCookieHeader({ name: COOKIE_NAME, value: '', path: url.pathname, maxAge: 0 }),
    },
  });
}

function oauthError({
  url,
  env,
  message,
  requestedOrigin,
}: {
  url: URL;
  env: Env;
  message: string;
  requestedOrigin?: string | null;
}): Response {
  const html = buildPostMessagePage({
    origins: resolveAllowedOrigins({ requestedOrigin, url, env }),
    payload: JSON.stringify({ message }),
    provider: 'github',
    error: message,
  });

  return new Response(html, {
    status: 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': createCookieHeader({ name: COOKIE_NAME, value: '', path: url.pathname, maxAge: 0 }),
    },
  });
}

function buildPostMessagePage({
  origins,
  payload,
  provider,
  error,
}: {
  origins: string[];
  payload: string;
  provider: string;
  error: string | null;
}): string {
  const status = error ? 'error' : 'success';
  const handshakePayload = `authorizing:${provider}`;
  const postMessagePayload = `authorization:${provider}:${status}:${payload}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OAuth Complete</title>
  </head>
  <body>
    <script>
      (function() {
        const candidateOrigins = ${JSON.stringify(origins)};
        const handshakeMessage = ${JSON.stringify(handshakePayload)};
        const authorizationMessage = ${JSON.stringify(postMessagePayload)};

        function hasOpener() {
          return typeof window !== 'undefined' && !!window.opener;
        }

        function start() {
          if (!hasOpener()) {
            return;
          }

          const reachableOrigins = [];
          let resolvedOrigin = null;
          let completed = false;

          const finalize = (origin) => {
            if (completed) {
              return;
            }
            completed = true;
            const triedTargets = new Set();
            const tryPost = (target) => {
              if (!target || triedTargets.has(target)) {
                return false;
              }
              triedTargets.add(target);
              try {
                window.opener.postMessage(authorizationMessage, target);
                return true;
              } catch (error) {
                console.warn('Failed to post OAuth message to opener:', target, error);
                return false;
              }
            };

            const preferredTargets = [origin, resolvedOrigin, ...reachableOrigins, ...candidateOrigins];
            let delivered = preferredTargets.some((target) => tryPost(target));

            if (!delivered) {
              delivered = tryPost('*');
            }

            if (!delivered) {
              console.warn('OAuth popup could not deliver authorization message to opener.');
            }

            setTimeout(() => {
              try {
                window.close();
              } catch (error) {
                console.warn('Unable to close OAuth popup:', error);
              }
            }, 0);
          };

          const onMessage = (event) => {
            if (!candidateOrigins.includes(event.origin)) {
              return;
            }
            if (event.data === handshakeMessage) {
              resolvedOrigin = event.origin;
              window.removeEventListener('message', onMessage);
              finalize(event.origin);
            }
          };

          window.addEventListener('message', onMessage);

          const sendHandshakes = () => {
            if (!hasOpener()) {
              return;
            }
            for (const origin of candidateOrigins) {
              try {
                window.opener.postMessage(handshakeMessage, origin);
                if (!reachableOrigins.includes(origin)) {
                  reachableOrigins.push(origin);
                }
              } catch (error) {
                console.warn('OAuth handshake not allowed for origin:', origin, error);
              }
            }
            try {
              window.opener.postMessage(handshakeMessage, '*');
            } catch (error) {
              console.warn('Wildcard OAuth handshake failed:', error);
            }
          };

          sendHandshakes();
          setTimeout(() => {
            if (!completed) {
              sendHandshakes();
            }
          }, 150);

          setTimeout(() => {
            window.removeEventListener('message', onMessage);
            finalize(resolvedOrigin);
          }, 600);
        }

        if (document.readyState === 'complete') {
          start();
        } else {
          window.addEventListener('load', start);
        }
      })();
    </script>
    <p>Authentication ${error ? 'failed' : 'succeeded'}. You can close this window.</p>
  </body>
</html>`;
}

function resolveAllowedOrigins({
  requestedOrigin,
  url,
  env,
}: {
  requestedOrigin?: string | null;
  url: URL;
  env: Env;
}): string[] {
  const normalise = (value: string): string => {
    try {
      return new URL(value).origin;
    } catch (_error) {
      return new URL(value, url.origin).origin;
    }
  };

  const orderedOrigins: string[] = [];
  const append = (value?: string | null) => {
    if (!value) {
      return;
    }
    const origin = normalise(value);
    if (!orderedOrigins.includes(origin)) {
      orderedOrigins.push(origin);
    }
  };

  append(requestedOrigin);

  env.CMS_ALLOWED_RETURN_ORIGINS
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => append(entry));

  append(url.origin);

  return orderedOrigins.length > 0 ? orderedOrigins : [normalise(url.origin)];
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) {
    return cookies;
  }

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) continue;
    const name = rawName;
    const value = rawValue.join('=');
    cookies[name] = decodeURIComponent(value ?? '');
  }

  return cookies;
}

function createCookieHeader({
  name,
  value,
  path,
  maxAge,
}: {
  name: string;
  value: string;
  path: string;
  maxAge: number;
}): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path || '/'}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  if (maxAge > 0) {
    attributes.push(`Max-Age=${maxAge}`);
  } else {
    attributes.push('Max-Age=0');
    attributes.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  return attributes.join('; ');
}

function encodeState(state: OAuthState): string {
  const base64 = btoa(JSON.stringify(state));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeState(raw: string | null | undefined): OAuthState | null {
  if (!raw) {
    return null;
  }

  let base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }

  try {
    const json = atob(base64);
    const parsed = JSON.parse(json) as OAuthState;
    if (parsed && typeof parsed.nonce === 'string') {
      return parsed;
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function deriveRequestOrigin({ request, fallback }: { request: Request; fallback: string }): string {
  const explicitOrigin = request.headers.get('origin');
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (_error) {
      /* noop */
    }
  }

  return fallback;
}
