import React from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-[#1e1e1e] text-zinc-300 font-mono text-sm p-4 resize-none focus:outline-none border-none leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
};