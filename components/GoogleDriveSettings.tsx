import React, { useState, useCallback } from 'react';
// Fix: Update import path for GDriveSettings to resolve type errors.
import { GDriveSettings } from '../services/googleDriveService';
import * as GDriveService from '../services/googleDriveService';

interface GoogleDriveSettingsProps {
    settings: GDriveSettings;
    onSettingsChange: (newSettings: GDriveSettings) => void;
}

const InfoIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
);

const REQUIRED_ORIGIN = window.location.origin;


export const GoogleDriveSettings: React.FC<GoogleDriveSettingsProps> = ({ settings, onSettingsChange }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [copyStatus, setCopyStatus] = useState('Copiar');
    const [isTroubleshootingOpen, setIsTroubleshootingOpen] = useState(false);

    const handleCopyOrigin = () => {
        navigator.clipboard.writeText(REQUIRED_ORIGIN).then(() => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar'), 2000);
        });
    };
    
    const handleSettingsFieldChange = (field: keyof GDriveSettings, value: any) => {
        onSettingsChange({ ...settings, [field]: value });
    };

    const handleAuthCallback = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
        if (tokenResponse.error) {
            setErrorMessage(`Erro de autenticação: ${tokenResponse.error_description || tokenResponse.error}. Por favor, siga o guia de solução de problemas.`);
            setStatus('error');
            setIsTroubleshootingOpen(true);
            return;
        }
        try {
            setStatus('loading');
            const profile = await GDriveService.getUserProfile(tokenResponse.access_token);
            onSettingsChange({
                ...settings,
                user: profile,
                token: tokenResponse,
            });
            setStatus('idle');
        } catch (error: any) {
            setErrorMessage(`Falha ao buscar perfil: ${error.message}`);
            setStatus('error');
        }
    }, [onSettingsChange, settings]);

    const handleConnect = () => {
        setErrorMessage('');
        if (!settings.clientId) {
            setErrorMessage('Por favor, insira um ID de Cliente OAuth do Google.');
            setStatus('error');
            return;
        }
        GDriveService.initTokenClient(settings.clientId, handleAuthCallback, settings.loginHint);
        GDriveService.requestToken();
    };
    
    const handleDisconnect = () => {
        GDriveService.revokeToken(settings.token?.access_token ?? null);
        onSettingsChange({
            ...settings,
            user: null,
            folder: null,
            token: null,
        });
    };

    const handleSelectFolder = async () => {
        if (!settings.token) {
            setErrorMessage('Não autenticado. Por favor, conecte novamente.');
            setStatus('error');
            return;
        }
        try {
            setStatus('loading');
            const folder = await GDriveService.showFolderPicker(settings.token.access_token);
            onSettingsChange({ ...settings, folder: folder });
            setStatus('idle');
        } catch (error: any) {
             if(error.message.includes('cancelled')){
                 console.log("Folder selection cancelled by user.");
             } else {
                setErrorMessage(`Erro ao selecionar pasta: ${error.message}`);
                setStatus('error');
             }
        } finally {
             setStatus('idle');
        }
    };

    const renderTroubleshooting = () => (
        <div className="mt-4 bg-red-900/20 border border-red-700/50 p-4 rounded-lg text-sm space-y-3">
            <h4 className="font-bold text-red-300">Plano Final: Criar uma Nova Credencial</h4>
            <p className="text-red-200/90">
                Se você seguiu os passos de configuração e ainda vê o erro `invalid_request`, a causa mais provável é que a sua credencial atual está em um estado inconsistente nos servidores do Google. Isso não é um erro seu.
            </p>
            <p className="font-bold text-white">A solução definitiva é criar uma credencial totalmente nova. Siga estes passos:</p>
            <ol className="list-decimal list-inside space-y-3 text-red-200/90">
                <li>No menu do Google Cloud, vá para <strong className="text-white">APIs e Serviços &gt; Credenciais</strong>.</li>
                <li>Clique em <strong className="text-white">+ CRIAR CREDENCIAIS</strong> na parte superior e selecione <strong className="text-white">ID do cliente OAuth</strong>.</li>
                <li>Em "Tipo de aplicativo", escolha <strong className="text-white">Aplicativo da Web</strong>. Dê um novo nome (ex: "Assistente Consulta v2").</li>
                <li>Em "Origens JavaScript autorizadas", clique em "+ ADICIONAR URI" e cole a URL abaixo.</li>
                <li>Em "URIs de redirecionamento autorizados", clique em "+ ADICIONAR URI" e cole <strong className="text-white">exatamente a mesma URL novamente</strong>.</li>
                 <li>
                    <div className="flex items-center gap-2 mt-1 p-2 bg-red-500/20 rounded">
                        <code className="text-xs text-white break-all">{REQUIRED_ORIGIN}</code>
                        <button onClick={handleCopyOrigin} className="ml-auto text-xs font-semibold text-white bg-red-500/30 px-2 py-1 rounded hover:bg-red-500/50">{copyStatus}</button>
                    </div>
                </li>
                <li>Clique em <strong className="text-white">CRIAR</strong> e copie o novo "ID do cliente" gerado.</li>
                <li>Cole este novo ID no campo "ID do Cliente OAuth 2.0" acima e tente conectar novamente.</li>
                <li><strong className="text-white">Verificação Final:</strong> Na "Tela de consentimento OAuth", certifique-se de que o status de publicação é "Testando" e que o seu e-mail está adicionado na lista de "Usuários de teste".</li>
            </ol>
        </div>
    );

    return (
        <div>
            <h3 className="text-lg font-semibold mb-2 text-primary">Google Drive</h3>
            <p className="text-sm text-secondary mb-4">
                Salve automaticamente a transcrição e a anamnese de cada sessão em uma pasta do seu Google Drive.
            </p>

            <div className="bg-primary/50 border border-secondary rounded-md p-4">
                {!settings.user ? (
                    <div className="space-y-4">
                        <div className="space-y-3 bg-primary p-4 rounded-lg border border-primary">
                            <h4 className='font-semibold text-accent'>Passo 1: Configurar no Google Cloud</h4>
                            <ol className="list-decimal list-inside text-sm text-secondary space-y-2">
                                <li>Abra o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">painel de Credenciais do Google Cloud</a>.</li>
                                <li>Clique em <span className='font-semibold text-primary'>+ CRIAR CREDENCIAIS</span> e selecione <span className='font-semibold text-primary'>ID do cliente OAuth</span>.</li>
                                <li>Selecione <span className='font-semibold text-primary'>Aplicativo da Web</span> como tipo de aplicativo.</li>
                                <li>Na seção <span className='font-semibold text-primary'>Origens JavaScript autorizadas</span>, adicione o seguinte URI:
                                    <div className="flex items-center gap-2 mt-1 p-2 bg-primary/50 border border-secondary rounded">
                                        <code className="text-xs text-primary break-all">{REQUIRED_ORIGIN}</code>
                                        <button onClick={handleCopyOrigin} className="ml-auto text-xs font-semibold text-primary bg-slate-600/50 px-2 py-1 rounded hover:bg-slate-500/50">{copyStatus}</button>
                                    </div>
                                </li>
                                <li>Na seção <span className='font-semibold text-primary'>URIs de redirecionamento autorizados</span>, adicione <span className='font-bold text-accent'>exatamente o mesmo URI</span> acima.</li>
                                <li>Clique em <span className='font-semibold text-primary'>CRIAR</span> e copie o <span className='font-semibold text-primary'>ID do cliente</span> gerado.</li>
                            </ol>
                        </div>

                         <div className="space-y-3 bg-primary p-4 rounded-lg border border-primary">
                            <h4 className='font-semibold text-accent'>Passo 2: Conectar o Aplicativo</h4>
                             <div>
                                <label htmlFor="gdrive-client-id" className="block text-sm font-medium text-secondary mb-1">
                                    Cole o ID do Cliente OAuth 2.0 aqui
                                </label>
                                <input
                                    id="gdrive-client-id"
                                    type="text"
                                    placeholder="Seu-ID-de-Cliente.apps.googleusercontent.com"
                                    value={settings.clientId}
                                    onChange={(e) => handleSettingsFieldChange('clientId', e.target.value)}
                                    className="w-full bg-primary border border-secondary rounded-md p-2.5 text-sm text-primary focus:ring-2 focus-ring focus:border-accent"
                                />
                            </div>
                             <div>
                                <label htmlFor="gdrive-login-hint" className="block text-sm font-medium text-secondary mb-1">
                                    E-mail para Login (Opcional)
                                </label>
                                <input
                                    id="gdrive-login-hint"
                                    type="email"
                                    placeholder="seu-email@gmail.com"
                                    value={settings.loginHint}
                                    onChange={(e) => handleSettingsFieldChange('loginHint', e.target.value)}
                                    className="w-full bg-primary border border-secondary rounded-md p-2.5 text-sm text-primary focus:ring-2 focus-ring focus:border-accent"
                                />
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={!settings.clientId || status === 'loading'}
                                className="px-4 py-2 btn-primary text-white font-bold rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? 'Conectando...' : 'Conectar com Google Drive'}
                            </button>
                        </div>
                        
                        <div className="mt-4">
                            <button onClick={() => setIsTroubleshootingOpen(prev => !prev)} className="flex items-center gap-2 text-sm font-semibold text-yellow-300 hover:text-yellow-200">
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isTroubleshootingOpen ? 'rotate-180' : ''}`} />
                                Ainda com erro? Guia de Solução de Problemas
                            </button>
                             {isTroubleshootingOpen && renderTroubleshooting()}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-primary p-3 rounded-md">
                            <img src={settings.user.picture} alt="Foto do perfil" className="w-12 h-12 rounded-full" />
                            <div>
                                <p className="font-semibold text-primary">{settings.user.name}</p>
                                <p className="text-sm text-secondary">{settings.user.email}</p>
                            </div>
                             <button onClick={handleDisconnect} className="ml-auto px-3 py-1 text-xs font-semibold text-secondary rounded-md hover:bg-slate-500/20 transition-colors">
                                Desconectar
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={handleSelectFolder}
                                disabled={status === 'loading'}
                                className="px-4 py-2 btn-secondary text-white font-bold rounded-md transition-colors"
                            >
                                {status === 'loading' ? 'Abrindo...' : 'Selecionar Pasta de Destino'}
                            </button>
                             {settings.folder && (
                                <p className="text-sm text-secondary mt-2">
                                    Pasta selecionada: <span className="font-semibold text-primary">{settings.folder.name}</span>
                                </p>
                            )}
                        </div>
                    </div>
                )}
                 {status === 'error' && (
                    <p className="text-sm text-red-400 mt-3">{errorMessage}</p>
                 )}
                 {settings.user && !settings.folder && (
                     <div className="flex items-center gap-2 text-sm text-yellow-400 mt-4 p-3 bg-yellow-900/20 rounded-md border border-yellow-700/50">
                        <InfoIcon className="w-5 h-5 flex-shrink-0" />
                        <span>Ação necessária: Selecione uma pasta para ativar o salvamento automático.</span>
                    </div>
                 )}
            </div>
        </div>
    );
};