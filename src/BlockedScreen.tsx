/**
 * Tela exibida quando uma tentativa de inspeção é detectada.
 * Cobre toda a viewport e não pode ser dispensada sem recarregar a página.
 */
export default function BlockedScreen() {
  return (
    <div className="blocked-screen" role="alert" aria-live="assertive">
      {/* Malha de cruzes + brilho central */}
      <div className="blocked-grid" aria-hidden="true" />
      <div className="blocked-glow" aria-hidden="true" />

      {/* Linha de varredura vertical */}
      <div className="blocked-scan" aria-hidden="true" />

      <div className="blocked-content">
        {/* Ondas concêntricas atrás do ícone */}
        <div className="blocked-emblem" aria-hidden="true">
          <span className="blocked-ring" />
          <span className="blocked-ring blocked-ring--delay-1" />
          <span className="blocked-ring blocked-ring--delay-2" />

          <svg className="blocked-icon" viewBox="0 0 120 106" fill="none">
            <path
              d="M60 8 112 98H8L60 8Z"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinejoin="round"
            />
            <path
              d="M60 42v26"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="60" cy="83" r="6" fill="currentColor" />
          </svg>
        </div>

        <h1 className="blocked-title" data-text="ACESSO BLOQUEADO">
          ACESSO BLOQUEADO
        </h1>
        <p className="blocked-subtitle">Esta página é monitorada 24 horas por dia.</p>
      </div>

      {/* Régua inferior */}
      <div className="blocked-rule" aria-hidden="true" />
    </div>
  );
}
