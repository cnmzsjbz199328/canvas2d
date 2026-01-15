export interface Message {
  role: 'user' | 'system';
  content: string;
}

export interface GameState {
  code: string;
  isGenerating: boolean;
  version: number;
}

export type TabOption = 'preview' | 'code' | 'leaderboard';

export interface SavedGame {
  id: string;
  title: string;
  description: string;
  code: string;
  likes: number;
  createdAt: string; // ISO timestamp
}
