
export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface TTSInput {
  id: number;
  text: string;
  language: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  audioUrl?: string;
  audioDuration?: number;
  settings: VoiceSettings;
}

export interface Log {
  time: string;
  msg: string;
  type: 'info' | 'success' | 'error' | 'process';
}

export enum AppMode {
  VOICE_CLONE = 'VOICE_CLONE',
  GEMINI_LIVE = 'GEMINI_LIVE',
  GEMINI_CHAT = 'GEMINI_CHAT'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  groundingMetadata?: any;
  isThinking?: boolean;
}

export enum ChatMode {
  STANDARD = 'STANDARD',
  SEARCH = 'SEARCH',
  THINKING = 'THINKING'
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
}
