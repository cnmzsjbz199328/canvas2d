import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { ChevronRight, Terminal as TerminalIcon, Check, Loader2, ArrowRight } from 'lucide-react';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0c] border-r border-zinc-800 font-mono text-sm">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 text-zinc-400">
        <TerminalIcon size={14} />
        <span className="text-xs font-bold tracking-wider">AGENT TERMINAL</span>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
            {msg.role === 'user' ? (
              <div className="flex items-start gap-2 text-blue-400">
                <span className="select-none font-bold mt-0.5">➜</span>
                <span className="select-none font-bold mt-0.5">~</span>
                <div className="text-zinc-100 font-medium whitespace-pre-wrap">{msg.content}</div>
              </div>
            ) : (
              <div className="pl-6 border-l-2 border-zinc-800 ml-1.5 py-1">
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Response</span>
                </div>
                <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Agentic Loading State (Simulating Plan -> Act) */}
        {isLoading && (
          <div className="pl-6 border-l-2 border-indigo-500/50 ml-1.5 py-1 animate-pulse">
             <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Claude Code Agent</span>
             </div>
             <div className="space-y-1 text-zinc-500 text-xs">
                <div className="flex items-center gap-2">
                  <Check size={10} className="text-zinc-600" />
                  <span>Reading context...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={10} className="text-zinc-600" />
                  <span>Analyzing requirements...</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <ArrowRight size={10} />
                  <span>Generating solution...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CLI Input */}
      <div className="p-3 bg-[#0c0c0c] border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2.5 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600 transition-all">
          <ChevronRight size={16} className="text-blue-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-600 font-mono text-sm"
            autoFocus
            disabled={isLoading}
          />
          {isLoading && <span className="text-[10px] text-zinc-600 uppercase font-bold px-2">Busy</span>}
        </form>
        <div className="flex justify-between mt-2 px-1">
           <span className="text-[10px] text-zinc-600">Model: Gemini 3 Pro (Preview)</span>
           <span className="text-[10px] text-zinc-600">Mode: Auto-Edit</span>
        </div>
      </div>
    </div>
  );
};