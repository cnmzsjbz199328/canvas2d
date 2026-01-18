import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, OrchestrationStage } from '../types';
import { ChevronRight, Terminal as TerminalIcon, Loader2, ArrowRight, PenTool, Ruler, Cpu } from 'lucide-react';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  loadingStatus?: string;
  stage: OrchestrationStage;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading, loadingStatus, stage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, loadingStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  // Define role-based styling for markdown components
  const getMarkdownComponents = (role?: string) => {
    const themes = {
      designer: {
        h: 'text-blue-400',
        strong: 'text-blue-200',
        marker: 'marker:text-blue-500',
        border: 'border-blue-500/20',
        bg: 'bg-blue-500/5',
        code: 'text-blue-300 bg-blue-900/20'
      },
      architect: {
        h: 'text-purple-400',
        strong: 'text-purple-200',
        marker: 'marker:text-purple-500',
        border: 'border-purple-500/20',
        bg: 'bg-purple-500/5',
        code: 'text-purple-300 bg-purple-900/20'
      },
      engineer: {
        h: 'text-emerald-400',
        strong: 'text-emerald-200',
        marker: 'marker:text-emerald-500',
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/5',
        code: 'text-emerald-300 bg-emerald-900/20'
      },
      default: {
        h: 'text-zinc-200',
        strong: 'text-zinc-50',
        marker: 'marker:text-zinc-600',
        border: 'border-zinc-700',
        bg: 'bg-zinc-800/10',
        code: 'text-zinc-300 bg-zinc-800/50'
      }
    };

    const t = themes[role as keyof typeof themes] || themes.default;

    return {
      h1: ({...props}) => <h1 className={`${t.h} text-xs font-bold uppercase tracking-wider mt-4 mb-2 pb-1 border-b ${t.border}`} {...props} />,
      h2: ({...props}) => <h2 className={`${t.h} text-xs font-bold uppercase tracking-wider mt-4 mb-2`} {...props} />,
      h3: ({...props}) => <h3 className={`${t.h} text-xs font-bold uppercase tracking-wider mt-3 mb-1`} {...props} />,
      ul: ({...props}) => <ul className={`list-disc pl-4 space-y-1 my-2 ${t.marker}`} {...props} />,
      ol: ({...props}) => <ol className={`list-decimal pl-4 space-y-1 my-2 ${t.marker}`} {...props} />,
      li: ({...props}) => <li className="pl-1" {...props} />,
      strong: ({...props}) => <strong className={`${t.strong} font-bold`} {...props} />,
      p: ({...props}) => <p className="leading-relaxed mb-2 last:mb-0" {...props} />,
      blockquote: ({...props}) => <blockquote className={`border-l-2 ${t.border} pl-3 italic text-zinc-500 my-2`} {...props} />,
      code: ({node, inline, className, children, ...props}: any) => {
        return inline 
           ? <code className={`${t.code} px-1.5 py-0.5 rounded text-[11px] font-mono`} {...props}>{children}</code>
           : <code className={`block ${t.bg} p-2 rounded text-xs font-mono text-zinc-400 my-2 whitespace-pre-wrap border ${t.border}`} {...props}>{children}</code>;
      }
    };
  };

  const renderSystemMessage = (msg: Message) => {
    let borderColor = 'border-zinc-800';
    let titleColor = 'text-emerald-500';
    let icon = <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
    let label = 'SYSTEM';

    if (msg.agentRole === 'designer') {
        borderColor = 'border-blue-500/30';
        titleColor = 'text-blue-400';
        icon = <PenTool size={10} />;
        label = 'DESIGNER';
    } else if (msg.agentRole === 'architect') {
        borderColor = 'border-purple-500/30';
        titleColor = 'text-purple-400';
        icon = <Ruler size={10} />;
        label = 'ARCHITECT';
    } else if (msg.agentRole === 'engineer') {
        borderColor = 'border-emerald-500/30';
        titleColor = 'text-emerald-400';
        icon = <Cpu size={10} />;
        label = 'ENGINEER';
    }

    return (
        <div className={`pl-6 border-l-2 ${borderColor} ml-1.5 py-1`}>
            <div className={`flex items-center gap-2 ${titleColor} mb-2`}>
                {icon}
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-zinc-400 text-xs">
              <ReactMarkdown components={getMarkdownComponents(msg.agentRole)}>
                {msg.content}
              </ReactMarkdown>
            </div>
        </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0c] border-r border-zinc-800 font-mono text-sm">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 text-zinc-400">
        <TerminalIcon size={14} />
        <span className="text-xs font-bold tracking-wider">MULTI-AGENT TERMINAL</span>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
            {msg.role === 'user' ? (
              <div className="flex items-start gap-2 text-blue-400">
                <span className="select-none font-bold mt-0.5">➜</span>
                <span className="select-none font-bold mt-0.5">~</span>
                <div className="text-zinc-100 font-medium w-full">
                  {/* User messages typically plain text, but rendering markdown supports code snippets too */}
                  <ReactMarkdown components={getMarkdownComponents('default')}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              renderSystemMessage(msg)
            )}
          </div>
        ))}
        
        {/* Active Stage Indicator */}
        {isLoading && (
          <div className="pl-6 border-l-2 border-amber-500/50 ml-1.5 py-1 animate-pulse">
             <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">
                    {stage === 'designing' && 'DESIGNER AGENT'}
                    {stage === 'architecting' && 'ARCHITECT AGENT'}
                    {stage === 'coding' && 'ENGINEER AGENT'}
                    {stage === 'refining' && 'ENGINEER AGENT'}
                    {stage === 'idle' && 'SYSTEM BUSY'}
                </span>
             </div>
             <div className="space-y-1 text-zinc-500 text-xs">
                <div className="flex items-center gap-2">
                   <ArrowRight size={10} />
                   <span>{loadingStatus || 'Processing...'}</span>
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
            placeholder="Describe your game idea..."
            className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-600 font-mono text-sm"
            autoFocus
            disabled={isLoading}
          />
          {isLoading && <span className="text-[10px] text-zinc-600 uppercase font-bold px-2">BUSY</span>}
        </form>
        <div className="flex justify-between mt-2 px-1 text-[10px] text-zinc-600">
           <span>Gemini 2.5 Flash Lite + 3 Flash</span>
           <span>v2.0 Orchestrator</span>
        </div>
      </div>
    </div>
  );
};