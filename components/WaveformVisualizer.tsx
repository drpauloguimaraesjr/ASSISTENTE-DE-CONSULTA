import React, { useRef, useEffect } from 'react';

export type WaveformStyle = 'line' | 'bars';

interface WaveformVisualizerProps {
    stream: MediaStream;
    isListening: boolean;
    style: WaveformStyle;
}

const getThemeColor = (variableName: string): string => {
    return getComputedStyle(document.body).getPropertyValue(variableName).trim() || '#ffffff';
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const interpolateColor = (color1: string, color2: string, factor: number) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return color1;

    const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
    const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
    const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));

    return rgbToHex(r, g, b);
};


export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ stream, isListening, style }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        if (isListening && stream) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0.8;
            
            if (style === 'bars') {
                analyser.fftSize = 256;
            } else { // line
                analyser.fftSize = 2048;
            }

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceRef.current = source;
            dataArrayRef.current = dataArray;

            const draw = () => {
                if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;
                
                const canvas = canvasRef.current;
                const canvasCtx = canvas.getContext('2d');
                if (!canvasCtx) return;

                const { width, height } = canvas;
                canvasCtx.clearRect(0, 0, width, height);

                const accentColor = getThemeColor('--color-text-accent');
                const peakColor = getThemeColor('--color-waveform-peak');
                const gradient = canvasCtx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, accentColor);
                gradient.addColorStop(1, getThemeColor('--color-gradient-to'));

                if (style === 'bars') {
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                    const barWidth = (width / bufferLength) * 1.5;
                    let barHeight;
                    let x = 0;

                    for (let i = 0; i < bufferLength; i++) {
                        barHeight = dataArrayRef.current[i] * (height / 255);
                        canvasCtx.fillStyle = gradient;
                        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
                        x += barWidth + 2; // Add 2 for gap
                    }
                } else { // line
                    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
                    
                    let sum = 0;
                    for(let i = 0; i < bufferLength; i++) {
                        sum += Math.abs(dataArrayRef.current[i] - 128);
                    }
                    const avg = sum / bufferLength;
                    const intensity = Math.min(1, avg / 30); // Normalize and cap intensity
                    const dynamicColor = interpolateColor(accentColor, peakColor, intensity);

                    canvasCtx.lineWidth = 3;
                    canvasCtx.strokeStyle = dynamicColor;
                    canvasCtx.beginPath();
                    
                    const sliceWidth = width * 1.0 / bufferLength;
                    let x = 0;

                    for (let i = 0; i < bufferLength; i++) {
                        const v = dataArrayRef.current[i] / 128.0; // Normalize to 0-2 range
                        const y = v * height / 2;

                        if (i === 0) {
                            canvasCtx.moveTo(x, y);
                        } else {
                            canvasCtx.lineTo(x, y);
                        }
                        x += sliceWidth;
                    }
                    canvasCtx.lineTo(canvas.width, canvas.height / 2);
                    canvasCtx.stroke();
                }
                
                animationFrameId.current = requestAnimationFrame(draw);
            };

            draw();

        }

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
            if(sourceRef.current){
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
        };

    }, [isListening, stream, style]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};