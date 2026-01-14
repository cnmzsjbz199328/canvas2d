export interface Message {
  role: 'user' | 'system';
  content: string;
}

export interface GameState {
  code: string;
  isGenerating: boolean;
  version: number;
}

export type TabOption = 'preview' | 'code';