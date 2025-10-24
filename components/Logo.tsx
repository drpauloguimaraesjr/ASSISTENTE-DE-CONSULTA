import React from 'react';

interface LogoProps {
    logoDataUrl?: string | null;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ logoDataUrl, size = 24 }) => (
    <div className="flex items-center gap-3" aria-label="Logotipo e nome do Doutor">
        <div className="bg-gradient-accent p-2 rounded-lg flex items-center justify-center">
            {logoDataUrl ? (
                <img 
                    src={logoDataUrl} 
                    alt="Logomarca personalizada"
                    className="object-contain"
                    style={{ width: `${size}px`, height: `${size}px` }}
                />
            ) : (
                <svg 
                    className="text-primary-bg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: `${size}px`, height: `${size}px` }}
                >
                    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            )}
        </div>
        <span className="font-bold text-lg text-primary hidden sm:block">
            Dr. Paulo Guimaraes Jr.
        </span>
    </div>
);