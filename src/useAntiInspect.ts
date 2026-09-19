import { useEffect, useState } from 'react';

/**
 * Códigos de tecla (independentes de layout) usados pelos atalhos de
 * inspeção: DevTools (I/J/C) e "ver código-fonte" (U).
 */
const DEVTOOLS_CODES = new Set(['KeyI', 'KeyJ', 'KeyC', 'KeyU']);

/**
 * Dispara o bloqueio quando o usuário tenta inspecionar a página:
 * clique com o botão direito, F12 ou os atalhos de DevTools
 * (Ctrl/Cmd+Shift+I/J/C, Cmd+Option+I/J/C no macOS e Ctrl/Cmd+U).
 *
 * Importante: isso é apenas dissuasão. Não impede que alguém abra o
 * DevTools antes de carregar a página, use `view-source:` ou desative o
 * JavaScript — nenhuma proteção de verdade pode viver no cliente.
 */
export function useAntiInspect(): boolean {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // Uma vez bloqueado, não há mais o que escutar.
    if (isBlocked) return;

    const trigger = (event: Event) => {
      event.preventDefault();
      setIsBlocked(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      const isInspectShortcut =
        event.key === 'F12' ||
        (modifier && (event.shiftKey || event.altKey) && DEVTOOLS_CODES.has(event.code)) ||
        (modifier && event.code === 'KeyU');

      if (isInspectShortcut) trigger(event);
    };

    window.addEventListener('contextmenu', trigger);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', trigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBlocked]);

  return isBlocked;
}
