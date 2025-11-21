/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { Send, Search, BrainCircuit, Loader, Bot, User, Globe } from 'lucide-react';
import { ChatMode, Message } from '../types';

export default function GeminiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>(ChatMode.STANDARD);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Config based on mode
      let modelName = 'gemini-2.5-flash';
      let config: any = {};

      if (mode === ChatMode.SEARCH) {
        modelName = 'gemini-2.5-flash';
        config = { tools: [{ googleSearch: {} }] };
      } else if (mode === ChatMode.THINKING) {
        modelName = 'gemini-3-pro-preview';
        config = { thinkingConfig: { thinkingBudget: 32768 } };
      }

      // Create a placeholder for the model response
      setMessages(prev => [...prev, { role: 'model', text: '', isThinking: mode === ChatMode.THINKING }]);

      const result = await ai.models.generateContentStream({
        model: modelName,
        contents: [
          // Simple history for context (last 5 turns)
          ...messages.slice(-5).map(m => ({
             role: m.role,
             parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMsg.text }] }
        ],
        config
      });

      let fullText = '';
      let groundingMetadata: any = null;

      for await (const chunk of result) {
        const chunkText = chunk.text || '';
        fullText += chunkText;
        
        if (chunk.candidates?.[0]?.groundingMetadata) {
            groundingMetadata = chunk.candidates[0].groundingMetadata;
        }

        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          lastMsg.text = fullText;
          if (groundingMetadata) lastMsg.groundingMetadata = groundingMetadata;
          return newMsgs;
        });
      }

    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden animate-fade-in">
      {/* Header / Mode Selector */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setMode(ChatMode.STANDARD)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === ChatMode.STANDARD ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Standard
          </button>
          <button 
            onClick={() => setMode(ChatMode.SEARCH)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === ChatMode.SEARCH ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Search className="w-3 h-3" /> Search
          </button>
          <button 
            onClick={() => setMode(ChatMode.THINKING)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === ChatMode.THINKING ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <BrainCircuit className="w-3 h-3" /> Thinking
          </button>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {mode === ChatMode.THINKING ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash'}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
              <Bot className="w-16 h-16" />
              <p>Select a mode and start chatting.</p>
           </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-indigo-600'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-indigo-900/30 text-slate-100 border border-indigo-500/20'}`}>
               {/* Thinking Indicator */}
               {msg.isThinking && !msg.text && (
                 <div className="flex items-center gap-2 text-purple-400 text-xs mb-2 animate-pulse">
                   <BrainCircuit className="w-3 h-3" /> Thinking Process...
                 </div>
               )}
               
               {/* Message Text */}
               <div className="whitespace-pre-wrap">{msg.text}</div>

               {/* Search Grounding Results */}
               {msg.groundingMetadata?.groundingChunks && (
                 <div className="mt-4 pt-3 border-t border-white/10">
                   <div className="flex items-center gap-2 text-xs text-blue-400 font-bold mb-2">
                     <Globe className="w-3 h-3" /> Sources
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                     {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                        if (chunk.web) {
                          return (
                            <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-blue-400 bg-black/20 p-2 rounded flex items-center justify-between transition-colors">
                               <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                               <Globe className="w-3 h-3 flex-shrink-0" />
                            </a>
                          );
                        }
                        return null;
                     })}
                   </div>
                 </div>
               )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={mode === ChatMode.SEARCH ? "Ask about current events..." : mode === ChatMode.THINKING ? "Ask complex math or coding questions..." : "Type a message..."}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}