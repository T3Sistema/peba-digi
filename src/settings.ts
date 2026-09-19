/** Caminho onde o sistema fica acessível. Qualquer outro redireciona. */
export const LOGIN_PATH = '/login';

/**
 * Destino usado quando nada foi configurado ou quando o Supabase não
 * responde. Serve de rede de segurança: numa falha de leitura o visitante
 * é mandado embora em vez de o sistema ficar exposto.
 */
export const DEFAULT_REDIRECT_URL = 'https://www.youtube.com';

/** Chave na tabela `app_settings` que guarda o destino do redirecionamento. */
export const REDIRECT_SETTINGS_KEY = 'redirect_url';

/**
 * Valida uma URL de redirecionamento vinda do banco ou digitada no painel.
 *
 * Só aceita http/https. Isso importa porque o valor vai direto para
 * `location.replace()`: um `javascript:` gravado na tabela viraria execução
 * de código arbitrário na página.
 *
 * @returns a URL normalizada, ou null se não for utilizável.
 */
export function sanitizeRedirectUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  return parsed.toString();
}

/**
 * O sistema só se revela em LOGIN_PATH. O hash é aceito como alternativa
 * para hospedagens que não reescrevem rotas de SPA e responderiam 404 em
 * /login.
 */
export function isSystemEntryPoint(location: Location = window.location): boolean {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  return path === LOGIN_PATH || location.hash === `#${LOGIN_PATH}`;
}
