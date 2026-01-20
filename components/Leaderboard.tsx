import React, { useEffect, useState } from 'react';
import { SavedGame } from '../types';
import { fetchLeaderboard, likeGame } from '../services/dbService';
import { Play, Heart, Loader2, Crown, Medal, Trophy } from 'lucide-react';

interface LeaderboardProps {
  onPlay: (code: string) => void;
  active: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onPlay, active }) => {
  const [games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liking, setLiking] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLeaderboard();
      setGames(data);
    } catch (err) {
      setError('Failed to load leaderboard. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadData();
    }
  }, [active]);

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(id);
    try {
        const newLikes = await likeGame(id);
        setGames(prev => prev.map(g => g.id === id ? { ...g, likes: newLikes } : g));
    } catch (err) {
        console.error(err);
    } finally {
        setLiking(null);
    }
  };

  // Helper for rank styling
  const getRankStyle = (index: number) => {
    switch(index) {
        case 0: return {
            container: "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)] scale-[1.02]",
            rankBadge: "text-amber-400 bg-amber-500/20 border-amber-500/50",
            icon: <Crown className="w-5 h-5 text-amber-400 fill-amber-400/20" />,
            titleColor: "text-amber-100",
            isTop: true
        };
        case 1: return {
            container: "border-zinc-400/30 bg-gradient-to-r from-zinc-400/10 to-transparent",
            rankBadge: "text-zinc-300 bg-zinc-400/20 border-zinc-400/50",
            icon: <Medal className="w-5 h-5 text-zinc-300" />,
            titleColor: "text-zinc-100",
            isTop: true
        };
        case 2: return {
            container: "border-orange-700/30 bg-gradient-to-r from-orange-700/10 to-transparent",
            rankBadge: "text-orange-400 bg-orange-700/20 border-orange-700/50",
            icon: <Medal className="w-5 h-5 text-orange-400" />,
            titleColor: "text-orange-100",
            isTop: true
        };
        default: return {
            container: "border-zinc-800/60 bg-[#111] hover:bg-[#161616] hover:border-zinc-700",
            rankBadge: "text-zinc-500 bg-zinc-800 border-zinc-700 font-mono text-xs",
            icon: <span className="font-bold">#{index + 1}</span>,
            titleColor: "text-zinc-300",
            isTop: false
        };
    }
  };

  if (loading && games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <Loader2 className="animate-spin mb-2" size={24} />
        <p className="text-xs font-mono tracking-widest">FETCHING_DATA...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-red-400">
            <p className="mb-4">{error}</p>
            <button onClick={loadData} className="text-xs border border-zinc-700 px-4 py-2 rounded hover:bg-zinc-800 transition-colors text-zinc-300">
                RETRY CONNECTION
            </button>
        </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#050505] overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto py-12 px-6">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-16 relative">
             <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
             <h2 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase mb-4 drop-shadow-lg text-center">
                Leaderboard
             </h2>
             <p className="text-xs text-emerald-400 font-mono tracking-[0.4em] uppercase">
                Season 1 Rankings
             </p>
        </div>

        {/* List Section */}
        <div className="space-y-3">
          {games.map((game, index) => {
             const style = getRankStyle(index);
             
             return (
                <div 
                    key={game.id} 
                    className={`
                        relative flex items-center p-4 md:p-5 rounded-xl border transition-all duration-300 group
                        ${style.container}
                    `}
                >
                    {/* Rank Indicator */}
                    <div className={`
                        flex-shrink-0 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border mr-5 md:mr-8
                        ${style.rankBadge}
                    `}>
                        {style.icon}
                    </div>
                    
                    {/* Game Info */}
                    <div className="flex-1 min-w-0 mr-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className={`text-lg md:text-xl font-bold truncate ${style.titleColor}`}>
                                {game.title}
                            </h3>
                        </div>
                        <p className="text-xs text-zinc-500 truncate font-mono max-w-md">
                            {game.description || "No description provided."}
                        </p>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-4 md:gap-8">
                        {/* Likes */}
                        <div className="flex flex-col items-center min-w-[40px]">
                             <button 
                                onClick={(e) => handleLike(game.id, e)} 
                                className="group/like p-2 -m-2"
                             >
                                <Heart 
                                    size={18} 
                                    className={`
                                        transition-all duration-300 
                                        ${liking === game.id ? 'animate-ping' : ''} 
                                        ${index < 3 ? 'fill-rose-500/20 text-rose-500' : 'text-zinc-600 group-hover/like:text-rose-500'}
                                    `} 
                                />
                             </button>
                             <span className={`text-[10px] font-bold mt-1 ${index < 3 ? 'text-rose-400' : 'text-zinc-600'}`}>
                                {game.likes}
                             </span>
                        </div>
                        
                        {/* Play Button */}
                        <button 
                            onClick={() => onPlay(game.code)}
                            className={`
                                opacity-0 group-hover:opacity-100 transition-all duration-300
                                translate-x-2 group-hover:translate-x-0
                                flex items-center gap-2 px-5 py-2 rounded-full 
                                font-bold text-xs shadow-lg active:scale-95
                                ${index === 0 
                                    ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-500/20' 
                                    : 'bg-white text-black hover:bg-zinc-200'
                                }
                            `}
                        >
                            <Play size={12} className="fill-current" />
                            <span className="hidden md:inline">PLAY</span>
                        </button>
                    </div>
                </div>
             )
          })}
        </div>
        
        {games.length === 0 && !loading && (
            <div className="text-center text-zinc-700 mt-20 font-mono text-sm border border-zinc-800 border-dashed rounded-lg p-12">
                <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                <p>DATABASE EMPTY</p>
                <p className="text-xs mt-2 opacity-50">INITIATE FIRST DEPLOYMENT</p>
            </div>
        )}
      </div>
    </div>
  );
};
