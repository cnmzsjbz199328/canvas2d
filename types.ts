export interface Message {
  role: 'user' | 'system';
  content: string;
  agentRole?: 'designer' | 'architect' | 'engineer'; // Optional metadata for UI styling
}

export interface GameState {
  code: string;
  isGenerating: boolean;
  version: number;
}

export type TabOption = 'preview' | 'code' | 'leaderboard';

export type OrchestrationStage = 'idle' | 'designing' | 'architecting' | 'coding' | 'refining';

export interface SavedGame {
  id: string;
  title: string;
  description: string;
  code: string;
  likes: number;
  createdAt: string; // ISO timestamp
}