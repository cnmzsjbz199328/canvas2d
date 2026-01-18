import React, { useState } from 'react';
import { GamePreview } from './components/GamePreview';
import { CodeEditor } from './components/CodeEditor';
import { ChatPanel } from './components/ChatPanel';
import { Leaderboard } from './components/Leaderboard';
import { SaveGameModal } from './components/SaveGameModal';
import { IntroSequence } from './components/IntroSequence';
import { orchestrateGameGeneration, iterateGameCode } from './services/geminiService';
import { Message, TabOption, GameState, OrchestrationStage } from './types';
import { Code, Play, Terminal, Cpu, Sparkles, X, Trophy, Save, Layers, PenTool, Ruler } from 'lucide-react';

const INITIAL_GAME_CODE = `
// Constants
const SPEED = 200;
const COLOR = '#00ffff';

// Helper function defined OUTSIDE the return object
function createParticle(x, y) {
  return {
    x: x, y: y,
    vx: (Math.random()-0.5)*50, 
    vy: (Math.random()-0.5)*50,
    life: 1.0
  };
}

return {
  init: (state, width, height) => {
    state.width = width;
    state.height = height;
    state.player = { x: width/2, y: height/2, size: 20, color: COLOR };
    state.particles = [];
    state.score = 0;
    state.gameOver = false;
  },
  
  update: (state, input, dt) => {
    // Restart Logic
    if (state.gameOver) {
        if (input.isDown) {
            state.gameOver = false;
            state.score = 0;
            state.particles = [];
            state.player.x = state.width / 2;
            state.player.y = state.height / 2;
        }
        return;
    }
  
    // Movement
    if (input.keys['ArrowUp'] || input.keys['KeyW']) state.player.y -= SPEED * dt;
    if (input.keys['ArrowDown'] || input.keys['KeyS']) state.player.y += SPEED * dt;
    if (input.keys['ArrowLeft'] || input.keys['KeyA']) state.player.x -= SPEED * dt;
    if (input.keys['ArrowRight'] || input.keys['KeyD']) state.player.x += SPEED * dt;
    
    // Use Helper Function
    if (Math.random() < 0.5) {
      state.particles.push(createParticle(state.player.x, state.player.y));
    }
    
    // Update particles
    state.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2;
    });
    state.particles = state.particles.filter(p => p.life > 0);
  },
  
  draw: (state, ctx, width, height) => {
    // TRANSPARENCY: Clear rect instead of filling black 
    // This allows the Holo-Grid background to show through!
    ctx.clearRect(0, 0, width, height);
    
    state.particles.forEach(p => {
      ctx.fillStyle = \`rgba(0, 255, 255, \${p.life})\`;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    
    if (!state.gameOver) {
        ctx.fillStyle = state.player.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = state.player.color;
        ctx.fillRect(state.player.x - 10, state.player.y - 10, 20, 20);
        ctx.shadowBlur = 0;
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    if (state.gameOver) {
        ctx.fillText('GAME OVER - CLICK TO RESET', 20, 40);
    } else {
        ctx.fillText('SYSTEM READY. WASD TO MOVE.', 20, 40);
    }
  }
};`;

export default function App() {
  const [showIntro, setShowIntro] = useState(true); // Default to true to show animation
  const [activeTab, setActiveTab] = useState<TabOption>('preview');
  const [gameState, setGameState] = useState<GameState>({
    code: INITIAL_GAME_CODE,
    isGenerating: false,
    version: 0
  });
  const [orchStage, setOrchStage] = useState<OrchestrationStage>('idle');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Engine Core initialized.\nMulti-Agent System Online: Designer (Flash Lite) -> Architect (3-Flash) -> Engineer (3-Flash).' }
  ]);

  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [optimizeInput, setOptimizeInput] = useState('');

  // --- HANDLER 1: NEW GAME CREATION (Chat Panel) ---
  const handleCreateNewGame = async (input: string) => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setGameState(prev => ({ ...prev, isGenerating: true }));
    setOrchStage('designing');
    setProcessingStatus('Designer Agent is brainstorming...');

    try {
        const newCode = await orchestrateGameGeneration(input, (stage, content) => {
            if (stage === 'designing') {
                setOrchStage('designing');
                setProcessingStatus('Drafting mechanics & lore...');
            } else if (stage === 'design_complete') {
                setMessages(prev => [...prev, { role: 'system', content: `DESIGN DOC:\n${content}`, agentRole: 'designer' }]);
            } else if (stage === 'architecting') {
                setOrchStage('architecting');
                setProcessingStatus('Architect Agent is planning structure...');
            } else if (stage === 'architect_complete') {
                setMessages(prev => [...prev, { role: 'system', content: `TECH SPEC:\n${content}`, agentRole: 'architect' }]);
            } else if (stage === 'coding') {
                setOrchStage('coding');
                setProcessingStatus('Engineer Agent is writing code...');
            } else if (stage === 'coding_status') {
                setProcessingStatus(content || 'Coding...');
            }
        });

      setGameState(prev => ({
        code: newCode,
        isGenerating: false,
        version: prev.version + 1
      }));

      setOrchStage('idle');
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `> New Project Build Successful.\n> Engine hot-reloaded.`,
        agentRole: 'engineer'
      }]);
      
      setActiveTab('preview');
      setProcessingStatus('');

    } catch (error) {
      console.error(error);
      setGameState(prev => ({ ...prev, isGenerating: false }));
      setOrchStage('idle');
      setProcessingStatus('');
      setMessages(prev => [...prev, { role: 'system', content: 'Error: Agent Pipeline Failure.\nCheck console for trace.' }]);
    }
  };

  // --- HANDLER 2: OPTIMIZATION (Optimize Modal) ---
  const handleOptimizeRequest = async (input: string) => {
      const userMsg: Message = { role: 'user', content: `[OPTIMIZE REQUEST] ${input}` };
      setMessages(prev => [...prev, userMsg]);
      
      setGameState(prev => ({ ...prev, isGenerating: true }));
      setOrchStage('refining');
      setProcessingStatus('Engineer Agent is optimizing...');

      try {
        const newCode = await iterateGameCode(gameState.code, input, (status) => setProcessingStatus(status));
        
        setGameState(prev => ({
            code: newCode,
            isGenerating: false,
            version: prev.version + 1
        }));

        setOrchStage('idle');
        setMessages(prev => [...prev, { 
            role: 'system', 
            content: `> Optimization Applied.\n> Engine hot-reloaded.`,
            agentRole: 'engineer'
        }]);
        
        setActiveTab('preview');
        setProcessingStatus('');

      } catch (error) {
        console.error(error);
        setGameState(prev => ({ ...prev, isGenerating: false }));
        setOrchStage('idle');
        setProcessingStatus('');
        setMessages(prev => [...prev, { role: 'system', content: 'Error: Optimization Failed.' }]);
      }
  };

  const handleManualCodeChange = (newCode: string) => {
    setGameState(prev => ({ ...prev, code: newCode }));
  };

  const handleOptimizeSubmit = () => {
    if (!optimizeInput.trim()) return;
    handleOptimizeRequest(optimizeInput);
    setOptimizeInput('');
    setShowOptimizeModal(false);
  };

  const handleLoadGame = (code: string) => {
    setGameState(prev => ({
        ...prev,
        code: code,
        version: prev.version + 1
    }));
    setActiveTab('preview');
    setMessages(prev => [...prev, { role: 'system', content: '> Loaded game from database archive.' }]);
  };

  return (
    <div className="relative flex h-screen w-full bg-black text-zinc-300 font-mono overflow-hidden selection:bg-emerald-500/30">
      
      {/* 0. INTRO SEQUENCE */}
      {showIntro && <IntroSequence onComplete={() => setShowIntro(false)} />}
      
      {/* 1. BACKGROUND LAYERS */}
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid z-0 opacity-40 pointer-events-none"></div>
      
      {/* Vignette (Corner Shadows) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
      
      {/* CRT Scanline (Subtle) */}
      <div className="scanline"></div>

      {/* 2. MAIN APP CONTENT (With Reveal Animation) */}
      <div className={`relative z-10 flex w-full h-full transition-all duration-1000 ease-out transform ${
        showIntro ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'
      }`}>
        
        {/* Sidebar - Terminal Agent (Glassmorphism) */}
        <div className="w-[450px] flex flex-col border-r border-zinc-800/50 bg-[#0c0c0c]/90 backdrop-blur-md shadow-2xl animate-in slide-in-from-left duration-700 delay-300">
          <ChatPanel 
            messages={messages} 
            onSendMessage={handleCreateNewGame} 
            isLoading={gameState.isGenerating} 
            loadingStatus={processingStatus}
            stage={orchStage}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          
          {/* Top Navigation Bar (Glassmorphism) */}
          <div className="h-12 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-[#141414]/80 backdrop-blur-md animate-in slide-in-from-top duration-700 delay-500 z-20">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-zinc-500">
                 <Cpu size={16} />
                 <span className="text-xs font-bold tracking-wider">ENGINE_V{gameState.version}</span>
               </div>
               <div className="h-4 w-[1px] bg-zinc-700/50 mx-2"></div>
               
               {/* Tabs */}
               <div className="flex bg-black/40 p-1 rounded border border-zinc-800/50">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-all ${
                      activeTab === 'preview' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Play size={12} /> PREVIEW
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-all ${
                      activeTab === 'code' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Code size={12} /> CODE
                  </button>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-all ${
                      activeTab === 'leaderboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
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
                          : 'text-amber-500 hover:text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
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
                          : 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                   >
                      <Save size={12} /> SAVE
                   </button>
               </div>
            </div>
            
            {/* Orchestration Status Indicators */}
            <div className="flex items-center gap-3 text-xs">
              <div className={`flex items-center gap-1 ${orchStage === 'designing' ? 'text-blue-400 font-bold animate-pulse shadow-blue-500/50' : 'text-zinc-700'}`}>
                  <PenTool size={10} />
                  <span>DESIGN</span>
              </div>
              <span className="text-zinc-800">→</span>
              <div className={`flex items-center gap-1 ${orchStage === 'architecting' ? 'text-purple-400 font-bold animate-pulse shadow-purple-500/50' : 'text-zinc-700'}`}>
                  <Ruler size={10} />
                  <span>ARCHITECT</span>
              </div>
              <span className="text-zinc-800">→</span>
              <div className={`flex items-center gap-1 ${orchStage === 'coding' ? 'text-emerald-400 font-bold animate-pulse shadow-emerald-500/50' : 'text-zinc-700'}`}>
                  <Terminal size={10} />
                  <span>ENGINEER</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-700">
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
      </div>

      {/* Optimize Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[500px] bg-[#1e1e1e]/90 border border-zinc-700 rounded-lg shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200 backdrop-blur-md">
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
                    Describe how you want to improve the current game. The Engineer agent will modify the code directly.
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
                    placeholder="E.g. Add a trailing effect to the player..."
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