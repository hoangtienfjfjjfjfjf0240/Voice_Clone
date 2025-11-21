import React, { useState } from 'react';
import { Layers, Mic2, MessageSquare, Cpu } from 'lucide-react';
import VoiceClone from './components/VoiceClone';
import GeminiLive from './components/GeminiLive';
import GeminiChat from './components/GeminiChat';
import { AppMode } from './types';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.VOICE_CLONE);

  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 font-sans selection:bg-indigo-500/40">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-500" />
              Gemini Omni-Tool
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Next-Gen Multi-modal AI Workspace
            </p>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 backdrop-blur-sm">
            <button
              onClick={() => setMode(AppMode.VOICE_CLONE)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                mode === AppMode.VOICE_CLONE 
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mic2 className="w-4 h-4" /> Voice Clone
            </button>
            <button
              onClick={() => setMode(AppMode.GEMINI_LIVE)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                mode === AppMode.GEMINI_LIVE 
                  ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4" /> Live API
            </button>
            <button
              onClick={() => setMode(AppMode.GEMINI_CHAT)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                mode === AppMode.GEMINI_CHAT 
                  ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat & Search
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="transition-all duration-300 ease-in-out">
          {mode === AppMode.VOICE_CLONE && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <VoiceClone />
            </div>
          )}
          {mode === AppMode.GEMINI_LIVE && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <GeminiLive />
            </div>
          )}
          {mode === AppMode.GEMINI_CHAT && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <GeminiChat />
             </div>
          )}
        </div>

      </div>
    </div>
  );
}