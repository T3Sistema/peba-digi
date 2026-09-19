import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Loader2, X, ExternalLink } from 'lucide-react';
import {
  DEFAULT_REDIRECT_URL,
  LOGIN_PATH,
  REDIRECT_SETTINGS_KEY,
  sanitizeRedirectUrl,
} from './settings';

type Feedback = { type: 'ok' | 'erro'; message: string };

/**
 * Grava o destino do redirecionamento.
 *
 * Faz UPDATE e, se nenhuma linha correspondeu, INSERT. Evita depender de
 * `upsert`, que exigiria uma restrição de unicidade na coluna `key`.
 */
async function saveRedirectUrl(value: string): Promise<void> {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ value })
    .eq('key', REDIRECT_SETTINGS_KEY)
    .select('id');

  if (error) throw error;

  if (!data || data.length === 0) {
    const { error: insertError } = await supabase
      .from('app_settings')
      .insert({ key: REDIRECT_SETTINGS_KEY, value });

    if (insertError) throw insertError;
  }
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Carrega o valor atual
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', REDIRECT_SETTINGS_KEY)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) setUrl(data?.value ?? '');
      } catch (err) {
        console.error('Erro ao carregar o destino do redirecionamento:', err);
        if (!cancelled) {
          setFeedback({ type: 'erro', message: 'Não foi possível carregar a configuração atual.' });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Esc fecha
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const sanitized = sanitizeRedirectUrl(url);
    if (!sanitized) {
      setFeedback({
        type: 'erro',
        message: 'Informe um endereço completo começando com http:// ou https://',
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveRedirectUrl(sanitized);
      setUrl(sanitized);
      setFeedback({ type: 'ok', message: 'Destino salvo. Já vale para os próximos visitantes.' });
    } catch (err: any) {
      console.error('Erro ao salvar o destino do redirecionamento:', err);
      setFeedback({
        type: 'erro',
        message:
          err?.message ??
          'Não foi possível salvar. Verifique as permissões de escrita na tabela app_settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        className="w-full max-w-lg rounded-2xl bg-[#11151D] border border-white/10 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* noValidate: a validação nativa do type="url" abortaria o envio com um
            balão do navegador, impedindo as mensagens próprias abaixo. */}
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="redirect-url"
              className="block text-[11px] font-bold text-white/60 uppercase tracking-widest"
            >
              Redirecionar visitantes para
            </label>
            <p className="text-sm text-white/50 leading-relaxed">
              Quem abrir o site fora de{' '}
              <code className="text-white/80 bg-white/10 px-1.5 py-0.5 rounded">{LOGIN_PATH}</code>{' '}
              é enviado para este endereço.
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-white/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <input
                id="redirect-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={DEFAULT_REDIRECT_URL}
                className="w-full px-4 py-3 bg-black/40 border border-white/15 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all outline-none"
              />
            )}

            <p className="text-xs text-white/35">
              Se ficar vazio ou o banco não responder, o destino usado é{' '}
              {DEFAULT_REDIRECT_URL}.
            </p>
          </div>

          {feedback && (
            <div
              className={`p-3 text-sm rounded-xl font-medium ${
                feedback.type === 'ok'
                  ? 'text-emerald-300 bg-emerald-500/10'
                  : 'text-red-300 bg-red-500/10'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {sanitizeRedirectUrl(url) ? (
              <a
                href={sanitizeRedirectUrl(url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white/80 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Testar destino
              </a>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || isSaving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-white text-[#0B0E14] hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
