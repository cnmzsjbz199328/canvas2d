import React, { useState, useEffect } from 'react';

interface IntroSequenceProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  "INITIALIZING KERNEL...",
  "LOADING NEURAL MODULES [OK]",
  "ESTABLISHING UPLINK TO GEMINI CLUSTER...",
  "ALLOCATING VRAM FOR CANVAS RENDERER...",
  "MOUNTING VIRTUAL DOM...",
  "SYSTEM INTEGRITY CHECK: 100%",
  "BOOT SEQUENCE COMPLETE."
];

export const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<'logging' | 'title' | 'exit'>('logging');
  const [progress, setProgress] = useState(0);

  // Phase 1: Logging
  useEffect(() => {
    let logIndex = 0;
    
    const interval = setInterval(() => {
      if (logIndex >= BOOT_LOGS.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('title'), 200); // Wait briefly before showing title
        return;
      }
      setLogs(prev => [...prev, BOOT_LOGS[logIndex]]);
      logIndex++;
    }, 150); // Speed of logs

    return () => clearInterval(interval);
  }, []);

  // Phase 2: Title & Progress Bar
  useEffect(() => {
    if (phase === 'title') {
      const startTime = Date.now();
      const duration = 2000; // 2 seconds for progress bar

      const anim = requestAnimationFrame(function step() {
        const now = Date.now();
        const elapsed = now - startTime;
        const pct = Math.min((elapsed / duration) * 100, 100);
        
        setProgress(pct);

        if (pct < 100) {
          requestAnimationFrame(step);
        } else {
          setTimeout(() => setPhase('exit'), 500); // Wait at 100%
        }
      });

      return () => cancelAnimationFrame(anim);
    }
  }, [phase]);

  // Phase 3: Exit
  useEffect(() => {
    if (phase === 'exit') {
      const timer = setTimeout(() => {
        onComplete();
      }, 800); // Time for the curtain to split/fade
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  if (phase === 'exit') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-all duration-700 pointer-events-none opacity-0 scale-110 blur-sm">
         {/* Fading out state */}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black font-mono flex flex-col items-center justify-center select-none cursor-wait">
      <div className="w-full max-w-4xl px-8">
        
        {/* LOGS AREA */}
        {phase === 'logging' && (
          <div className="h-80 flex flex-col justify-end items-start mb-8 text-sm md:text-xl text-zinc-500 font-bold tracking-wider space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-emerald-900 font-black">{`>`}</span>
                <span className={i === logs.length - 1 ? "text-emerald-400" : "text-zinc-600"}>
                  {log}
                </span>
              </div>
            ))}
            <div className="animate-pulse text-emerald-500 text-2xl">_</div>
          </div>
        )}

        {/* TITLE AREA */}
        {phase === 'title' && (
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
            <h1 
              className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-12 glitch-wrapper text-center leading-tight"
              data-text="CANVAS 2D GENERATOR"
            >
              CANVAS 2D GENERATOR
            </h1>

            {/* PROGRESS BAR */}
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden relative max-w-2xl">
              <div 
                className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="mt-4 flex justify-between w-full max-w-2xl text-xs md:text-base text-zinc-500 font-bold uppercase tracking-[0.2em]">
                <span>System Loading</span>
                <span className="text-emerald-500">{Math.floor(progress)}%</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Decoration */}
      <div className="absolute bottom-12 text-xs md:text-sm text-zinc-800 uppercase tracking-[0.4em] font-bold">
        Proprietary Neural Interface v2.0
      </div>
    </div>
  );
};