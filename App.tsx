import React from 'react';
import { Layers, Mic2 } from 'lucide-react';
import VoiceClone from './components/VoiceClone';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 font-sans selection:bg-indigo-500/40">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-500" />
              MiniMax Voice Clone
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Clone voice từ video/audio ngắn và tạo TTS đa ngôn ngữ.
            </p>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <Mic2 className="w-4 h-4" /> Voice Clone
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="transition-all duration-300 ease-in-out">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <VoiceClone />
          </div>
        </div>

      </div>
    </div>
  );
}
