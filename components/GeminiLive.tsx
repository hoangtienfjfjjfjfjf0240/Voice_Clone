/// <reference lib="dom" />
import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, StopCircle, Radio, Volume2, AlertTriangle } from 'lucide-react';
import { base64ToBytes, bytesToBase64, decodeAudioData } from '../utils/audioUtils';

const SAMPLE_RATE_INPUT = 16000;
const SAMPLE_RATE_OUTPUT = 24000;

export default function GeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for audio handling
  const audioContextInput = useRef<AudioContext | null>(null);
  const audioContextOutput = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTime = useRef<number>(0);
  const sessionPromise = useRef<Promise<any> | null>(null);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputProcessor = useRef<ScriptProcessorNode | null>(null);
  
  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (inputProcessor.current) {
      inputProcessor.current.disconnect();
      inputProcessor.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    sources.current.forEach(source => source.stop());
    sources.current.clear();

    if (sessionPromise.current) {
       sessionPromise.current.then(session => {
         try { session.close(); } catch(e) {}
       });
       sessionPromise.current = null;
    }

    if (audioContextInput.current) {
      audioContextInput.current.close();
      audioContextInput.current = null;
    }
    if (audioContextOutput.current) {
      audioContextOutput.current.close();
      audioContextOutput.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
    nextStartTime.current = 0;
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 250)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const connect = async () => {
    try {
      setError(null);
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing in process.env");

      const ai = new GoogleGenAI({ apiKey });

      // 1. Setup Audio Contexts
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextInput.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_INPUT });
      audioContextOutput.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_OUTPUT });
      
      // Visualizer setup
      analyserRef.current = audioContextOutput.current!.createAnalyser();
      analyserRef.current.fftSize = 256;

      // 2. Get Microphone Stream
      const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Live API
      sessionPromise.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            // Process Microphone Input
            if (!audioContextInput.current || !streamRef.current) return;
            
            const source = audioContextInput.current.createMediaStreamSource(streamRef.current);
            const processor = audioContextInput.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to PCM Int16
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = inputData[i] * 32768;
              }
              // Convert to Base64
              const base64 = bytesToBase64(new Uint8Array(pcmData.buffer));
              
              // Send
              sessionPromise.current?.then(session => {
                session.sendRealtimeInput({
                   media: {
                     mimeType: 'audio/pcm;rate=16000',
                     data: base64
                   }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioContextInput.current.destination);
            inputProcessor.current = processor;
            
            // Start visualizer
            visualize();
          },
          onmessage: async (msg: LiveServerMessage) => {
             if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                setIsSpeaking(true);
                const base64Audio = msg.serverContent.modelTurn.parts[0].inlineData.data;
                const audioData = base64ToBytes(base64Audio);
                
                if (audioContextOutput.current) {
                   const buffer = await decodeAudioData(audioData, audioContextOutput.current, SAMPLE_RATE_OUTPUT);
                   
                   const source = audioContextOutput.current.createBufferSource();
                   source.buffer = buffer;
                   source.connect(audioContextOutput.current.destination);
                   
                   // Connect to analyzer for visualization
                   if (analyserRef.current) source.connect(analyserRef.current);

                   nextStartTime.current = Math.max(nextStartTime.current, audioContextOutput.current.currentTime);
                   source.start(nextStartTime.current);
                   nextStartTime.current += buffer.duration;
                   
                   sources.current.add(source);
                   source.onended = () => {
                     sources.current.delete(source);
                     if (sources.current.size === 0) setIsSpeaking(false);
                   };
                }
             }
          },
          onclose: () => {
            setIsConnected(false);
          },
          onerror: (err: any) => {
            console.error(err);
            setError("Connection error occurred");
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "You are a helpful and witty conversational AI assistant.",
        }
      });

    } catch (e: any) {
      setError(e.message);
      cleanup();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[500px] bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden animate-fade-in">
      {/* Visualizer Background */}
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={400} 
        className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
      />
      
      <div className="z-10 flex flex-col items-center gap-8">
        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? 'bg-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.3)]' : 'bg-slate-800'}`}>
          {isConnected ? (
             <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-20"></div>
          ) : null}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${isConnected ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            {isConnected ? <Radio className="w-10 h-10 animate-pulse" /> : <Mic className="w-10 h-10" />}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {isConnected ? 'Live Conversation Active' : 'Start Conversation'}
          </h2>
          <p className="text-slate-400 max-w-md">
            {isConnected 
              ? isSpeaking ? "Gemini is speaking..." : "Listening..." 
              : "Connect to Gemini 2.5 Native Audio for a real-time, low-latency voice chat experience."}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={isConnected ? cleanup : connect}
          className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 ${
            isConnected 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/30' 
              : 'bg-white hover:bg-indigo-50 text-black shadow-lg shadow-white/10'
          }`}
        >
          {isConnected ? (
            <>
              <StopCircle className="w-6 h-6" /> End Session
            </>
          ) : (
            <>
              <Mic className="w-6 h-6" /> Connect Live
            </>
          )}
        </button>
      </div>
    </div>
  );
}