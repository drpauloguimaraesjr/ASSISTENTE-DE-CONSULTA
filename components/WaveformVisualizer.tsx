import React, { useRef, useEffect } from 'react';

export type WaveformStyle = 'line' | 'bars' | 'traktor';

interface WaveformVisualizerProps {
    stream: MediaStream;
    isListening: boolean;
    style: WaveformStyle;
}

const getThemeColor = (variableName: string, fallback: string): string => {
    return getComputedStyle(document.body).getPropertyValue(variableName).trim() || fallback;
};

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ stream, isListening, style }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameId = useRef<number>(0);

    // Buffer for the scrolling waveform (Traktor style)
    // Stores RMS (amplitude) values
    const waveformBufferRef = useRef<number[]>([]);
    const maxBufferPoints = 1000; // Adjust for scroll speed/density

    useEffect(() => {
        if (!isListening || !stream) {
            // Clean up if stopped
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            // Clear canvas
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.smoothingTimeConstant = 0.1; // Fast response for Traktor style
        analyser.fftSize = 2048;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        // Initialize buffer
        if (waveformBufferRef.current.length === 0) {
            waveformBufferRef.current = new Array(maxBufferPoints).fill(0);
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const draw = () => {
            if (!analyserRef.current || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Handle high-DPI displays safely inside the loop or pre-calculate
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            // Only resize if dimensions match (avoids flickering, but simple check is needed)
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
            }
            const width = rect.width;
            const height = rect.height;

            // Clear with a slight fade effect for strict line/bar modes, or full clear for scrolling
            ctx.clearRect(0, 0, width, height);

            // Get Colors
            const accentColor = getThemeColor('--color-text-accent', '#00d4ff');
            const peakColor = getThemeColor('--color-waveform-peak', '#ffffff');
            const gridColor = 'rgba(255, 255, 255, 0.1)';

            if (style === 'traktor') {
                // --- TRAKTOR STYLE SCROLLING WAVEFORM ---
                analyserRef.current.getByteTimeDomainData(dataArray);

                // Calculate RMS (Root Mean Square) for this frame to get a solid amplitude value
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const sample = (dataArray[i] - 128) / 128.0;
                    sum += sample * sample;
                }
                const rms = Math.sqrt(sum / dataArray.length);

                // Amplify a bit for visual impact
                const value = Math.min(1.0, rms * 5.0);

                // Update Buffer: Shift Left, Push New
                waveformBufferRef.current.shift();
                waveformBufferRef.current.push(value);

                // Draw Grid/Center Line
                ctx.beginPath();
                ctx.strokeStyle = gridColor;
                ctx.lineWidth = 1;
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.stroke();

                // Draw Waveform
                // Create gradient based on height
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, accentColor);     // Top
                gradient.addColorStop(0.5, peakColor); // Center (Hot)
                gradient.addColorStop(1, accentColor);     // Bottom

                ctx.fillStyle = gradient;

                // Draw Mirrored Bars (creating a solid shape)
                const buffer = waveformBufferRef.current;
                const barWidth = width / maxBufferPoints; // Ensure it fills the screen

                // Optimisation: Begin a path and fill it
                ctx.beginPath();
                ctx.moveTo(0, height / 2);

                // Top Half
                for (let i = 0; i < buffer.length; i++) {
                    const amplitude = buffer[i] * (height / 2);
                    // Smooth curve approach
                    const x = i * barWidth;
                    const y = (height / 2) - amplitude;
                    ctx.lineTo(x, y);
                }

                // Bottom Half (Mirrored)
                for (let i = buffer.length - 1; i >= 0; i--) {
                    const amplitude = buffer[i] * (height / 2);
                    const x = i * barWidth;
                    const y = (height / 2) + amplitude;
                    ctx.lineTo(x, y);
                }

                ctx.closePath();
                ctx.fill();

                // Optional: Add a "Playhead" line at the right
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(width - 2, 0);
                ctx.lineTo(width - 2, height);
                ctx.stroke();

            } else if (style === 'bars') {
                // Classic Bars
                analyserRef.current.getByteFrequencyData(dataArray);
                const barWidth = (width / dataArray.length) * 2.5;
                let x = 0;

                const gradient = ctx.createLinearGradient(0, height, 0, 0);
                gradient.addColorStop(0, accentColor);
                gradient.addColorStop(1, peakColor);
                ctx.fillStyle = gradient;

                for (let i = 0; i < dataArray.length; i++) {
                    const barHeight = (dataArray[i] / 255) * height;
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }

            } else {
                // Oscilloscope Line
                analyserRef.current.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 2;
                ctx.strokeStyle = accentColor;
                ctx.beginPath();

                const sliceWidth = width / dataArray.length;
                let x = 0;

                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * height / 2;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    x += sliceWidth;
                }
                ctx.lineTo(width, height / 2);
                ctx.stroke();
            }

            animationFrameId.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };

    }, [isListening, stream, style]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};