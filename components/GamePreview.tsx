import React from 'react';

interface GamePreviewProps {
  code: string;
}

export const GamePreview: React.FC<GamePreviewProps> = ({ code }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm">
      <div className="w-full h-full relative">
        <iframe
          title="Game Preview"
          srcDoc={code}
          className="w-full h-full border-none block"
          sandbox="allow-scripts allow-modals allow-pointer-lock"
        />
        <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
          <span className="text-xs text-zinc-500 bg-black/80 px-2 py-1 rounded border border-zinc-800">
            Click to focus
          </span>
        </div>
      </div>
    </div>
  );
};