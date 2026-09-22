import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { Lock, User, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Presentation, Wallet, LayoutDashboard, HeartPulse, Truck, Building2 } from 'lucide-react';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type ViewKey = 'apresentacao' | 'governabilidade' | 'saude' | 'frota' | 'imoveis' | 'financas';

/**
 * Cada view corresponde a uma linha da tabela `app_settings` do Supabase,
 * onde `settingsKey` é o valor da coluna `key` e a URL do iframe vem da
 * coluna `value`.
 *
 * `overlay` define de que lado fica a faixa que cobre a marca d'água do
 * serviço embutido: o Genially assina no canto inferior esquerdo e o
 * Looker Studio no inferior direito.
 */
const VIEWS = [
  {
    key: 'apresentacao',
    label: 'Apresentação',
    settingsKey: 'iframe_url',
    icon: Presentation,
    overlay: 'left',
  },
  {
    key: 'governabilidade',
    label: 'Painel de Governabilidade',
    settingsKey: 'Painel de Governabilidade',
    icon: LayoutDashboard,
    overlay: 'right',
  },
  {
    key: 'saude',
    label: 'Saúde',
    settingsKey: 'Saúde',
    icon: HeartPulse,
    overlay: 'right',
  },
  {
    key: 'frota',
    label: 'Frota de Veículos',
    settingsKey: 'Frota de Veículos',
    icon: Truck,
    overlay: 'right',
  },
  {
    key: 'imoveis',
    label: 'Locação de Imóveis',
    settingsKey: 'Locação de Imóveis',
    icon: Building2,
    overlay: 'right',
  },
  {
    key: 'financas',
    label: 'Finanças',
    settingsKey: 'Finanças',
    icon: Wallet,
    overlay: 'right',
  },
] as const satisfies readonly {
  key: ViewKey;
  label: string;
  settingsKey: string;
  icon: typeof Presentation;
  overlay: 'left' | 'right';
}[];

/**
 * A coluna `key` do Supabase é preenchida à mão, então a comparação ignora
 * caixa, acentos e espaços extras: 'LOCAÇÃO DE IMÓVEIS' casa com
 * 'Locação de Imóveis'.
 */
const normalizeKey = (key: string) =>
  key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [urls, setUrls] = useState<Partial<Record<ViewKey, string>>>({});
  const [activeView, setActiveView] = useState<ViewKey>('apresentacao');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_LIMIT = 60 * 60 * 1000; // 60 minutos em milissegundos

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('lastActivity');
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    if (isAuthenticated) {
      localStorage.setItem('lastActivity', Date.now().toString());
      inactivityTimerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      // 1. Verificar persistência local e inatividade prévia
      const loggedIn = localStorage.getItem('isLoggedIn');
      const lastActivity = localStorage.getItem('lastActivity');
      
      if (loggedIn === 'true' && lastActivity) {
        const now = Date.now();
        const timeSinceLastActivity = now - parseInt(lastActivity);
        
        if (timeSinceLastActivity > INACTIVITY_LIMIT) {
          logout();
        } else {
          setIsAuthenticated(true);
          resetInactivityTimer();
        }
      } else if (loggedIn === 'true') {
        setIsAuthenticated(true);
        resetInactivityTimer();
      }

      // 2. Buscar a configuração de iframe de todas as views
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key, value');

        if (data) {
          const byKey = new Map<string, string>(
            data.map((row: any) => [normalizeKey(row.key), row.value])
          );

          setUrls(
            Object.fromEntries(
              VIEWS
                .map((view) => [view.key, byKey.get(normalizeKey(view.settingsKey))])
                .filter(([, value]) => Boolean(value))
            )
          );
        }
      } catch (err) {
        console.error('Erro ao buscar URLs dos iframes:', err);
      } finally {
        // 3. Finalizar carregamento inicial
        setIsCheckingAuth(false);
      }
    };

    initApp();

    // Listeners para detectar atividade
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const focusIframe = () => {
        if (iframeRef.current) {
          iframeRef.current.focus();
        }
      };
      const timeoutId = setTimeout(focusIframe, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, activeView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('admin_credentials')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (supabaseError || !data) {
        setError('Credenciais inválidas. Por favor, tente novamente.');
      } else {
        setIsAuthenticated(true);
        localStorage.setItem('isLoggedIn', 'true');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerClick = () => {
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#DBE2E9]">
        <Loader2 className="w-8 h-8 text-[#1A2B3C] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#DBE2E9] p-4 font-sans" style={{ zoom: '90%' }}>
        {/* Logo Container */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden mb-6">
            <img 
              src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-4xl font-bold text-[#1A2B3C] mb-1">Parauapebas</h1>
          <p className="text-xl font-medium text-black">Digital</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[440px] bg-white/80 backdrop-blur-sm p-10 rounded-[40px] shadow-xl border border-white/20">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-black uppercase tracking-widest ml-1">E-MAIL</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0B0C0]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/\s/g, '');
                      setEmail(value);
                    }}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-[#F4F7F9] border border-[#D1D9E0] rounded-2xl text-[#1A2B3C] placeholder-[#A0B0C0] focus:ring-2 focus:ring-[#A0B0C0] focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-black uppercase tracking-widest ml-1">SENHA</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0B0C0]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-4 bg-[#F4F7F9] border border-[#D1D9E0] rounded-2xl text-[#1A2B3C] placeholder-[#A0B0C0] focus:ring-2 focus:ring-[#A0B0C0] focus:border-transparent transition-all outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0B0C0] hover:text-[#6B7C8C] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full py-5 font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg shadow-lg ${
                email && password 
                ? 'bg-[#007AFF] text-white hover:bg-[#0063CC]' 
                : 'bg-[#A0A0A0] text-white opacity-50 cursor-not-allowed'
              }`}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  Entrar <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeConfig = VIEWS.find((view) => view.key === activeView)!;
  const activeUrl = urls[activeView];

  return (
    <div className="fixed inset-0 flex flex-col w-full h-full overflow-hidden bg-black">
      {/* Header Bar */}
      <div className="h-16 bg-[#0B0E14] flex items-center gap-3 px-6 border-b border-white/5 z-[10000] shrink-0">
        {/* Left: Voltar */}
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-1.5 border border-white/20 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Right: Alternar entre as views */}
        <div className="ml-auto flex items-center gap-2 overflow-x-auto">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`flex shrink-0 items-center gap-2 px-4 py-1.5 border rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeView === key
                  ? 'bg-white text-[#0B0E14] border-white font-semibold'
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 relative cursor-pointer"
        onClick={handleContainerClick}
      >
        <div className="iframe-render-area h-full">
          {activeUrl ? (
            <iframe
              key={activeView}
              ref={iframeRef}
              src={activeUrl}
              className="tool-iframe"
              allowFullScreen
              allow="autoplay; fullscreen; clipboard-write"
              title={activeConfig.label}
              tabIndex={0}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <div className={`logo-overlay ${activeConfig.overlay === 'right' ? 'logo-overlay--right' : ''}`}></div>
        </div>
      </div>
    </div>
  );
}
