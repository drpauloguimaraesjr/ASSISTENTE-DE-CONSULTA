import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface LoginScreenProps {
    onLogin: () => Promise<any>;
    isConfigured: boolean;
    onOpenSettings: () => void;
    onContinueAsGuest: () => void;
}

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 19">
    <path fillRule="evenodd" d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z" clipRule="evenodd"/>
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isConfigured, onOpenSettings, onContinueAsGuest }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState<{ code?: string; message: string } | null>(null);
    const [copyStatus, setCopyStatus] = useState('Copiar');
    const [hostname, setHostname] = useState('');

    useEffect(() => {
        // Set hostname after component mounts to ensure window object is available.
        setHostname(window.location.hostname);
    }, []);

    useEffect(() => {
        if (!isConfigured) {
            onOpenSettings();
        }
    }, [isConfigured, onOpenSettings]);

    const handleLogin = async () => {
        setIsLoading(true);
        setLoginError(null);
        try {
            await onLogin();
            // Auth state change will handle the rest
        } catch (error: any) {
            console.error("Firebase Auth Error:", error);
            setLoginError({ code: error.code, message: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopyHostname = () => {
        if (!hostname) return;
        navigator.clipboard.writeText(hostname).then(() => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar'), 2000);
        });
    };

    if (!isConfigured) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center p-4 text-center">
                 <div className="mb-8">
                    <Logo logoDataUrl={null} size={48} />
                </div>
                <h1 className="text-3xl font-bold text-yellow-400 mb-4">Configuração Necessária</h1>
                <p className="text-lg text-secondary max-w-2xl mb-10">
                    O aplicativo precisa ser conectado a um projeto Firebase para funcionar. O painel de configurações foi aberto para você. Por favor, siga as instruções na aba 'Firebase'.
                </p>
                 <div className="mt-10 flex flex-col items-center gap-4">
                    <button
                        disabled
                        className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-700 text-slate-400 font-bold text-lg rounded-full cursor-not-allowed"
                    >
                        <GoogleIcon />
                        <span>Entrar com Google (Aguardando configuração)</span>
                    </button>
                    <button
                        onClick={onContinueAsGuest}
                        className="inline-flex items-center justify-center px-8 py-4 btn-secondary text-white font-bold text-lg rounded-full transition-transform transform hover:scale-105"
                    >
                        Acessar App (Modo Convidado)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-8">
                <Logo logoDataUrl={null} size={48} />
            </div>
            <h1 className="text-4xl font-bold text-primary mb-2">Assistente de Consulta</h1>
            <p className="text-lg text-secondary mb-10">Faça login para salvar e carregar suas sessões.</p>
            <div className="flex flex-col items-center gap-4">
                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-800 font-bold text-lg rounded-full transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-slate-300 disabled:cursor-wait"
                >
                    {isLoading ? (
                        'Entrando...'
                    ) : (
                        <>
                            <GoogleIcon />
                            <span>Entrar com Google</span>
                        </>
                    )}
                </button>
                 <button
                    onClick={onContinueAsGuest}
                    className="text-sm text-secondary hover:text-primary underline"
                >
                    Ou, continuar sem login
                </button>
            </div>
            {loginError && (
                <div className="mt-6">
                    {loginError.code === 'auth/unauthorized-domain' ? (
                         <div className="p-4 max-w-2xl bg-red-900/30 border border-red-700/50 rounded-lg text-left">
                            <h3 className="font-bold text-red-300">Erro: Domínio Não Autorizado</h3>
                            <p className="text-sm text-red-200/90 mt-2">
                                Para corrigir, adicione o domínio deste site à lista de permissões no seu projeto Firebase.
                            </p>
                            <ol className="list-decimal list-inside text-sm text-red-200/90 mt-3 space-y-1">
                                <li>Vá para o seu projeto no <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-200">Firebase Console</a>.</li>
                                <li>Navegue até <strong>Authentication &gt; Settings &gt; Authorized domains</strong>.</li>
                                <li>Clique em <strong>"Add domain"</strong> e cole o domínio abaixo:</li>
                            </ol>
                            <div className="flex items-center gap-2 mt-3 p-2 bg-red-500/20 rounded">
                                <code className="text-xs text-white">{hostname || 'carregando...'}</code>
                                <button onClick={handleCopyHostname} className="ml-auto text-xs font-semibold text-white bg-red-500/30 px-2 py-1 rounded hover:bg-red-500/50">{copyStatus}</button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-400">{`Falha no login: ${loginError.message}`}</p>
                    )}
                </div>
            )}
        </div>
    );
};