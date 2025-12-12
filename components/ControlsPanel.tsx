import React from 'react';
import { WaveformVisualizer, WaveformStyle } from './WaveformVisualizer';

interface ControlsPanelProps {
    isListening: boolean;
    statusMessage: string;
    currentTranscription: string | string[];
    onToggleListening: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
    audioDevices: MediaDeviceInfo[];
    selectedDeviceId?: string;
    onDeviceChange: (deviceId: string) => void;
    mediaStream: MediaStream | null;
    waveformStyle: WaveformStyle;
    activeBufferIndex?: number;
}

const MicrophoneIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85l-.01.12v.03c0 2.76-2.24 5-5 5s-5-2.24-5-5v-.03c0-.55.45-1 1-1s1 .45 1 1v.03c0 1.65 1.35 3 3 3s3-1.35 3-3v-.03a1 1 0 0 1 .99-1.12l.12-.01z"></path>
        <path d="M12 19c-3.31 0-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8h-2c0 3.31-2.69 6-6 6z"></path>
    </svg>
);

const VolumeUpIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
    </svg>
);

const VolumeOffIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path>
    </svg>
);


export const ControlsPanel: React.FC<ControlsPanelProps> = ({ isListening, statusMessage, currentTranscription, onToggleListening, isMuted, onToggleMute, audioDevices, selectedDeviceId, onDeviceChange, mediaStream, waveformStyle, activeBufferIndex = 0 }) => {
    const renderLiveBuffers = () => {
        if (Array.isArray(currentTranscription)) {
            // Calcula estado visual de cada buffer baseado no ciclo
            const getBufferState = (index: number) => {
                const activeIdx = activeBufferIndex;
                const diff = (index - activeIdx + 3) % 3;
                
                if (diff === 0) {
                    // Buffer ativo - destacado e brilhante
                    return { opacity: 1, scale: 1, brightness: 1.2 };
                } else if (diff === 1) {
                    // Buffer anterior - menos intenso mas visível
                    return { opacity: 0.5, scale: 0.98, brightness: 0.7 };
                } else {
                    // Buffer mais antigo - desaparece completamente quando terceiro é acionado
                    return { opacity: 0, scale: 0.95, brightness: 0.2 };
                }
            };

            return (
                <div className="w-full min-h-[150px] mt-auto relative">
                    <div className="relative min-h-[120px]">
                        {currentTranscription.map((buf, i) => {
                            const state = getBufferState(i);
                            const isEmpty = !buf.trim();
                            
                            // Não renderiza se está invisível (opacity 0) ou vazio (exceto o ativo)
                            if (state.opacity === 0 || (isEmpty && i !== activeBufferIndex)) {
                                return null;
                            }
                            
                            return (
                                <div
                                    key={i}
                                    className="absolute inset-0 transition-all duration-700 ease-in-out whitespace-pre-wrap break-words"
                                    style={{
                                        opacity: state.opacity,
                                        transform: `scale(${state.scale})`,
                                        filter: `brightness(${state.brightness})`,
                                        zIndex: i === activeBufferIndex ? 10 : 5 - i,
                                        pointerEvents: i === activeBufferIndex ? 'auto' : 'none'
                                    }}
                                >
                                    <span 
                                        className={`inline-block ${
                                            i === activeBufferIndex 
                                                ? 'text-primary font-medium text-base' 
                                                : 'text-secondary text-sm'
                                        }`}
                                    >
                                        {buf}
                                    </span>
                                </div>
                            );
                        })}
                        {/* Placeholder quando tudo está vazio */}
                        {currentTranscription.every(b => !b.trim()) && (
                            <div className="text-tertiary text-sm">Aguardando fala...</div>
                        )}
                    </div>
                </div>
            );
        }
        return (
            <div className="w-full min-h-[150px] mt-auto">
                <p className="text-primary whitespace-pre-wrap">
                    {currentTranscription || <span className="text-tertiary">Aguardando fala...</span>}
                </p>
            </div>
        );
    };
    const getStatusColor = () => {
        if (statusMessage.includes('Erro') || statusMessage.includes('falhou')) return 'text-error-500 dark:text-error-400';
        if (statusMessage.includes('Conectando') || statusMessage.includes('Aguardando')) return 'text-warning-500 dark:text-warning-400';
        if (statusMessage.includes('Ouvindo') || statusMessage.includes('Transcrevendo')) return 'text-success-500 dark:text-success-400';
        return 'text-gray-600 dark:text-gray-400';
    };

    return (
        <div className="card h-full flex flex-col items-center justify-between">
            <div className="card-body w-full text-center">
                <h2 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90 mb-2">Controle de Áudio</h2>
                <div className="flex items-center justify-center gap-2 h-10">
                    {isListening && (
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
                        </span>
                    )}
                    <p className={`text-theme-sm font-medium ${getStatusColor()}`}>{statusMessage}</p>
                </div>
            </div>

            <div className="w-full max-w-sm my-4 px-6">
                <label htmlFor="audio-device-select" className="block text-theme-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Microfone
                </label>
                <select 
                    id="audio-device-select"
                    value={selectedDeviceId || ''}
                    onChange={(e) => onDeviceChange(e.target.value)}
                    disabled={audioDevices.length === 0 || isListening}
                    className="input disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {audioDevices.length > 0 ? (
                        audioDevices.map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Microfone ${device.deviceId.substring(0, 8)}`}
                            </option>
                        ))
                    ) : (
                        <option value="">
                            {`Inicie a escuta para detectar microfones.`}
                        </option>
                    )}
                </select>
            </div>

            {isListening ? (
                <>
                    <div className="w-full h-28 my-4 relative px-6">
                        {mediaStream && <WaveformVisualizer stream={mediaStream} isListening={isListening} style={waveformStyle} />}
                    </div>
                    <div className="flex items-center justify-center gap-6 pb-6">
                        <button
                            onClick={onToggleListening}
                            className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus-ring btn-danger shadow-theme-md hover:scale-105"
                            aria-label="Parar de ouvir"
                        >
                            <MicrophoneIcon className="w-10 h-10" />
                        </button>
                        <button
                            onClick={onToggleMute}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus-ring shadow-theme-md hover:scale-105
                                ${isMuted
                                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-700'
                                    : 'btn-secondary'
                                }
                            `}
                            aria-label={isMuted ? "Ativar som do agente" : "Desativar som do agente"}
                        >
                            {isMuted ? <VolumeOffIcon className="w-10 h-10" /> : <VolumeUpIcon className="w-10 h-10" />}
                        </button>
                    </div>
                </>
            ) : (
                <div className="my-4 flex items-center justify-center flex-grow pb-6">
                    <button
                        onClick={onToggleListening}
                        className="relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus-ring btn-primary shadow-theme-lg hover:scale-105"
                        aria-label="Começar a ouvir"
                    >
                        <MicrophoneIcon className="w-16 h-16" />
                    </button>
                </div>
            )}


            {renderLiveBuffers()}
        </div>
    );
};