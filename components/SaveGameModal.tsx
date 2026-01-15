import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { saveGame } from '../services/dbService';

interface SaveGameModalProps {
  code: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SaveGameModal: React.FC<SaveGameModalProps> = ({ code, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and Description are required.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await saveGame({
        title,
        description,
        author,
        code
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to save game. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] bg-[#1e1e1e] border border-zinc-800 rounded-lg shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-zinc-100 font-bold flex items-center gap-2">
            <Save size={16} className="text-emerald-500" />
            SAVE GAME
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Game Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/50 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 placeholder-zinc-700"
              placeholder="e.g. Neon Space Invaders"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Author Name (Optional)</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-black/50 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 placeholder-zinc-700"
              placeholder="e.g. RetroCoder"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-black/50 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 resize-none placeholder-zinc-700"
              placeholder="Describe the gameplay..."
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !description.trim()}
            className="px-4 py-2 rounded text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                SAVING...
              </>
            ) : (
              'PUBLISH TO DATABASE'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
