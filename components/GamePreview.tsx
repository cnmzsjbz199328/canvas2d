import React, { useMemo, useRef, useEffect } from 'react';
import { createHostHTML } from '../engine/hostBuilder';

interface GamePreviewProps {
  code: string;
}

export const GamePreview: React.FC<GamePreviewProps> = ({ code }) => {
  const srcDoc = useMemo(() => createHostHTML(code), [code]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-focus when code changes (new game generated)
  useEffect(() => {
    const focusIframe = () => {
      if (iframeRef.current) {
        iframeRef.current.focus();
        // Also try to focus internal window
        iframeRef.current.contentWindow?.focus();
      }
    };
    
    // Slight delay to ensure DOM is ready
    const timer = setTimeout(focusIframe, 100);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="w-full h-full relative holo-container bg-black group">
      {/* 1. HOLO GRID FLOOR */}
      <div className="holo-floor z-0 opacity-40"></div>
      
      {/* 2. ATMOSPHERIC GLOW */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-emerald-900/20 via-transparent to-transparent pointer-events-none"></div>

      {/* 3. IFRAME (Transparent background allows grid to show through) */}
      <div className="w-full h-full relative z-10">
        <iframe
          ref={iframeRef}
          title="Game Preview"
          srcDoc={srcDoc}
          className="w-full h-full border-none block"
          style={{ background: 'transparent' }} 
          sandbox="allow-scripts allow-modals allow-pointer-lock allow-same-origin"
        />
        
        {/* Overlay hint */}
        <div className="absolute top-4 left-4 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
           <div className="flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 bg-black/80 px-2 py-1 rounded border border-zinc-800 backdrop-blur-sm">
                ENGINE: SANDBOX 2.0
              </span>
              <span className="text-[10px] text-emerald-500 bg-black/80 px-2 py-1 rounded border border-emerald-500/20 animate-pulse backdrop-blur-sm">
                CLICK TO FOCUS
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};