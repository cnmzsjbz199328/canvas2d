import React, { useState } from 'react';
import { GamePreview } from './components/GamePreview';
import { CodeEditor } from './components/CodeEditor';
import { ChatPanel } from './components/ChatPanel';
import { Leaderboard } from './components/Leaderboard';
import { SaveGameModal } from './components/SaveGameModal';
import { generateGameCode, iterateGameCode } from './services/geminiService';
import { Message, TabOption, GameState } from './types';
import { Code, Play, Terminal, Cpu, Sparkles, X, Trophy, Save } from 'lucide-react';

const INITIAL_GAME_CODE = `<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; color: #0f0; font-family: 'Courier New', monospace; }
  canvas { border: 2px solid #333; }
  .scanline {
    position: fixed; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;
    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
    background-size: 100% 4px;
    z-index: 10;
  }
</style>
</head>
<body>
<div class="scanline"></div>
<div style="text-align: center;">
  <h1>> INITIALIZING_SYSTEM</h1>
  <p>Waiting for user input...</p>
</div>
</body>
</html>`;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabOption>('preview');
  const [gameState, setGameState] = useState<GameState>({
    code: INITIAL_GAME_CODE,
    isGenerating: false,
    version: 0
  });
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Agent initialized. Ready to generate HTML5 Canvas applications.\nType a command to begin (e.g., "create a space shooter").' }
  ]);

  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [optimizeInput, setOptimizeInput] = useState('');

  const handleSendMessage = async (input: string) => {
    if (!input.trim()) return;

    // Add user message
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setGameState(prev => ({ ...prev, isGenerating: true }));

    try {
      let newCode = '';
      const isFirstGeneration = gameState.version === 0;

      if (isFirstGeneration) {
        // Generate new game
        newCode = await generateGameCode(input);
      } else {
        // Iterate on existing game
        newCode = await iterateGameCode(gameState.code, input);
      }

      setGameState({
        code: newCode,
        isGenerating: false,
        version: gameState.version + 1
      });

      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `> Task completed.\n> Generated ${newCode.length} bytes.\n> Updated preview successfully.` 
      }]);
      
      // Auto-switch to preview on update
      setActiveTab('preview');

    } catch (error) {
      console.error(error);
      setGameState(prev => ({ ...prev, isGenerating: false }));
      setMessages(prev => [...prev, { role: 'system', content: 'Error: Failed to execute generation task.\nSee console for details.' }]);
    }
  };

  const handleManualCodeChange = (newCode: string) => {
    setGameState(prev => ({ ...prev, code: newCode }));
  };

  const handleOptimizeSubmit = () => {
    if (!optimizeInput.trim()) return;
    handleSendMessage(`Optimize the game: ${optimizeInput}`);
    setOptimizeInput('');
    setShowOptimizeModal(false);
  };

  const handleLoadGame = (code: string) => {
    setGameState(prev => ({
        ...prev,
        code: code,
        version: prev.version + 1 // Increment version to trigger re-render
    }));
    setActiveTab('preview');
    setMessages(prev => [...prev, { role: 'system', content: '> Loaded game from database archive.' }]);
  };

  return (
    <div className="flex h-screen w-full bg-black text-zinc-300 font-mono overflow-hidden">
      {/* Sidebar - Terminal Agent */}
      <div className="w-[450px] flex flex-col border-r border-zinc-800 z-10 shadow-xl">
        <ChatPanel 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          isLoading={gameState.isGenerating} 
        />
      </div>

      {/* Main Content - Preview & Source */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Top Navigation Bar */}
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#141414]">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-zinc-500">
               <Cpu size={16} />
               <span className="text-xs font-bold">CANVAS_GEN_V{gameState.version}</span>
             </div>
             <div className="h-4 w-[1px] bg-zinc-700 mx-2"></div>
             
             {/* Tabs */}
             <div className="flex bg-black/50 p-1 rounded border border-zinc-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
                    activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Play size={12} /> PREVIEW
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
                    activeTab === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Code size={12} /> CODE
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
                    activeTab === 'leaderboard' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Trophy size={12} /> LEADERBOARD
                </button>
             </div>

             {/* Action Buttons */}
             <div className="flex items-center gap-2">
                 <button
                    onClick={() => setShowOptimizeModal(true)}
                    disabled={gameState.isGenerating || gameState.version === 0}
                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors border ${
                      gameState.isGenerating || gameState.version === 0 
                        ? 'text-zinc-600 border-zinc-800 cursor-not-allowed' 
                        : 'text-amber-500 hover:text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}
                 >
                    <Sparkles size={12} /> OPTIMIZE
                 </button>
                 
                 <button
                    onClick={() => setShowSaveModal(true)}
                    disabled={gameState.isGenerating || gameState.version === 0}
                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors border ${
                      gameState.isGenerating || gameState.version === 0 
                        ? 'text-zinc-600 border-zinc-800 cursor-not-allowed' 
                        : 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}
                 >
                    <Save size={12} /> SAVE
                 </button>
             </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className={`w-2 h-2 rounded-full ${gameState.isGenerating ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span>{gameState.isGenerating ? 'PROCESSING' : 'IDLE'}</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'preview' && (
            <GamePreview code={gameState.code} key={gameState.version} />
          )}
          {activeTab === 'code' && (
             <CodeEditor code={gameState.code} onChange={handleManualCodeChange} />
          )}
          {activeTab === 'leaderboard' && (
             <Leaderboard onPlay={handleLoadGame} active={activeTab === 'leaderboard'} />
          )}
        </div>
      </div>

      {/* Optimize Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[500px] bg-[#1e1e1e] border border-zinc-800 rounded-lg shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-zinc-100 font-bold flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-500" />
                        OPTIMIZE GAME
                    </h3>
                    <button onClick={() => setShowOptimizeModal(false)} className="text-zinc-500 hover:text-zinc-300">
                        <X size={16} />
                    </button>
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                    Describe how you want to improve the current game (e.g., "Add particle effects", "Make movement smoother", "Refactor variable names").
                </p>
                <textarea
                    autoFocus
                    value={optimizeInput}
                    onChange={(e) => setOptimizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleOptimizeSubmit();
                      }
                    }}
                    className="w-full h-32 bg-black/50 border border-zinc-700 rounded p-3 text-sm text-zinc-300 focus:outline-none focus:border-amber-500 mb-4 resize-none placeholder-zinc-700"
                    placeholder="E.g. Improve collision detection accuracy and add a screen shake effect on impact..."
                />
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => setShowOptimizeModal(false)}
                        className="px-4 py-2 rounded text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={handleOptimizeSubmit}
                        disabled={!optimizeInput.trim()}
                        className="px-4 py-2 rounded text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        RUN OPTIMIZATION
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <SaveGameModal 
            code={gameState.code} 
            onClose={() => setShowSaveModal(false)}
            onSuccess={() => {
                setMessages(prev => [...prev, { role: 'system', content: '> Game saved to Global Database successfully.' }]);
            }}
        />
      )}
    </div>
  );
}