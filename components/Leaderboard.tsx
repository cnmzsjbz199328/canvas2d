import React, { useEffect, useState } from 'react';
import { SavedGame } from '../types';
import { fetchLeaderboard, likeGame } from '../services/dbService';
import { Play, Heart, Loader2, Calendar, Trophy, User } from 'lucide-react';

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

  if (loading && games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <Loader2 className="animate-spin mb-2" size={24} />
        <p className="text-xs">ACCESSING MAINFRAME...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
            <p>{error}</p>
            <button onClick={loadData} className="mt-4 text-xs bg-zinc-800 px-3 py-1 rounded hover:bg-zinc-700 text-zinc-300">RETRY</button>
        </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#141414] overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
            <Trophy className="text-amber-500" size={24} />
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">GLOBAL LEADERBOARD</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <div 
                key={game.id} 
                className="group bg-[#1e1e1e] border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-all hover:shadow-xl flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-zinc-200 truncate pr-2 flex-1" title={game.title}>{game.title}</h3>
                <div className="flex items-center gap-1 text-xs text-zinc-500 bg-black/30 px-2 py-1 rounded-full">
                   <Heart size={10} className="text-rose-500 fill-rose-500" />
                   {game.likes}
                </div>
              </div>
              
              <p className="text-xs text-zinc-500 mb-4 line-clamp-3 flex-1 h-12 leading-relaxed">
                {game.description}
              </p>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                 <div className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(game.createdAt).toLocaleDateString()}
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={(e) => handleLike(game.id, e)}
                        className={`p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-500 transition-colors ${liking === game.id ? 'opacity-50 cursor-wait' : ''}`}
                        title="Like this game"
                    >
                        <Heart size={14} />
                    </button>
                    <button 
                        onClick={() => onPlay(game.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-100 hover:bg-white text-black text-xs font-bold transition-colors"
                    >
                        <Play size={12} className="fill-black" />
                        PLAY
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
        
        {games.length === 0 && !loading && (
            <div className="text-center text-zinc-600 mt-20">
                <p>No games archived in the database yet.</p>
                <p className="text-sm mt-2">Be the first to publish!</p>
            </div>
        )}
      </div>
    </div>
  );
};
