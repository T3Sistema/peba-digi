import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  DEFAULT_REDIRECT_URL,
  REDIRECT_SETTINGS_KEY,
  isSystemEntryPoint,
  sanitizeRedirectUrl,
} from './settings';

export type GateStatus = 'checking' | 'allowed' | 'redirecting';

/**
 * Decide se o visitante pode ver o sistema.
 *
 * Fora de LOGIN_PATH, busca o destino configurado em `app_settings` e manda
 * a pessoa para lá. Se a leitura falhar ou o valor for inválido, cai no
 * destino padrão — um erro de rede nunca deve resultar em o sistema
 * aparecer para quem chegou pela raiz.
 *
 * Enquanto decide, o retorno é 'checking', para que a tela de login não
 * pisque antes do redirecionamento.
 */
export function useAccessGate(): GateStatus {
  const [status, setStatus] = useState<GateStatus>(() =>
    isSystemEntryPoint() ? 'allowed' : 'checking'
  );

  useEffect(() => {
    if (status !== 'checking') return;

    let cancelled = false;

    const redirect = async () => {
      let destination = DEFAULT_REDIRECT_URL;

      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', REDIRECT_SETTINGS_KEY)
          .maybeSingle();

        destination = sanitizeRedirectUrl(data?.value) ?? DEFAULT_REDIRECT_URL;
      } catch (err) {
        console.error('Erro ao buscar o destino do redirecionamento:', err);
      }

      if (cancelled) return;

      setStatus('redirecting');
      // replace() para que o botão "voltar" não traga a pessoa de volta.
      window.location.replace(destination);
    };

    redirect();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return status;
}
