
/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  Wand2, 
  Loader2, 
  CheckCircle2, 
  Settings, 
  Play, 
  Square,
  Download, 
  AudioWaveform, 
  AlertCircle,
  List,
  Trash2,
  RefreshCw,
  X,
  Clock,
  Filter,
  User
} from 'lucide-react';
import { AudioService } from '../utils/audioUtils';
import { TTSInput, Log, VoiceSettings, ElevenLabsVoice } from '../types';

const LANG_OPTIONS = [
  { code: 'vi', name: 'Vietnamese', defaultText: 'Xin chào, đây là giọng nói AI của tôi đã được nhân bản.' },
  { code: 'en', name: 'English', defaultText: 'Hello, this is my cloned AI voice generated automatically.' },
  { code: 'ja', name: 'Japanese', defaultText: 'こんにちは、これは私のクローンAI音声です。' },
  { code: 'es', name: 'Spanish', defaultText: 'Hola, esta es mi voz de IA clonada.' },
  { code: 'fr', name: 'French', defaultText: 'Bonjour, ceci est ma voix clonée par IA.' },
  { code: 'de', name: 'German', defaultText: 'Hallo, das ist meine geklonte KI-Stimme.' },
  { code: 'zh', name: 'Chinese', defaultText: '你好，这是我的克隆 AI 声音。' },
];

const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true
};

export default function VoiceClone() {
  const [apiKey, setApiKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [openSettingsId, setOpenSettingsId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  
  // Voice Management State
  const [voiceList, setVoiceList] = useState<ElevenLabsVoice[]>([]);
  const [showVoiceList, setShowVoiceList] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'mine'>('mine'); // Default to 'mine' based on user preference
  
  const [inputs, setInputs] = useState<TTSInput[]>([
    { id: 1, text: LANG_OPTIONS[0].defaultText, language: 'vi', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 2, text: LANG_OPTIONS[1].defaultText, language: 'en', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 3, text: LANG_OPTIONS[2].defaultText, language: 'ja', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 4, text: LANG_OPTIONS[3].defaultText, language: 'es', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 5, text: LANG_OPTIONS[4].defaultText, language: 'fr', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
  ]);

  const addLog = (msg: string, type: Log['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time, msg, type }, ...prev]);
  };

  // Stop playing audio if component unmounts
  useEffect(() => {
    return () => {
      if (playingId) {
        const audioEl = document.getElementById(`audio-${playingId}`) as HTMLAudioElement;
        if (audioEl) {
            audioEl.pause();
            audioEl.currentTime = 0;
        }
      }
    };
  }, [playingId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const f = target.files[0];
      setFile(f);
      setClonedVoiceId(null);
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(f);
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        addLog(`Đã tải file: ${f.name} (${audio.duration.toFixed(1)}s)`, 'info');
        if (audio.duration < 60) {
          addLog('⚠️ Video ngắn (<60s). Hệ thống tự động lặp để tối ưu clone.', 'process');
        }
      };
    }
  };

  const fetchVoices = async () => {
    if (!apiKey) return window.alert('Vui lòng nhập API Key trước.');
    setIsLoadingList(true);
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      });
      const data = await res.json();
      if (data.voices) {
        setVoiceList(data.voices);
        setShowVoiceList(true);
        addLog(`📚 Đã tải ${data.voices.length} giọng.`, 'success');
      } else {
        throw new Error('Không lấy được danh sách voice.');
      }
    } catch (e: any) {
      addLog(`❌ Lỗi tải danh sách: ${e.message}`, 'error');
    } finally {
      setIsLoadingList(false);
    }
  };

  const deleteVoiceApi = async (id: string) => {
    const res = await fetch(`https://api.elevenlabs.io/v1/voices/${id}`, {
        method: 'DELETE',
        headers: { 
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: { message: res.statusText } }));
        throw new Error(err.detail?.message || 'Lỗi API khi xóa');
    }
    return true;
  };

  const onSingleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); 
    e.preventDefault();

    if (!apiKey) return window.alert("Thiếu API Key.");
    
    if (!window.confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN giọng:\n"${name}"?`)) {
        return;
    }

    setDeletingId(id);
    try {
        addLog(`🗑️ Đang xóa: ${name}...`, 'process');
        await deleteVoiceApi(id);
        setVoiceList(prev => prev.filter(v => v.voice_id !== id));
        if (clonedVoiceId === id) setClonedVoiceId(null);
        addLog(`✅ Đã xóa thành công: ${name}`, 'success');
    } catch (error: any) {
        addLog(`❌ Xóa thất bại: ${error.message}`, 'error');
        window.alert(`Không thể xóa giọng này.\nLỗi: ${error.message}`);
    } finally {
        setDeletingId(null);
    }
  };

  const handleDeleteOldest = async () => {
    if (!voiceList.length) return;
    if (!apiKey) return window.alert('Vui lòng nhập API Key.');
    
    // Filter only generated/cloned voices, ignore premade
    const candidates = voiceList.filter(v => v.category !== 'premade' && v.name.startsWith('AutoClone_'));
    
    if (candidates.length === 0) {
      return window.alert('Không tìm thấy giọng "AutoClone_" nào để xóa (Chỉ xóa được giọng do bạn tạo).');
    }

    candidates.sort((a, b) => {
      const timeA = parseInt(a.name.split('_')[1] || '0');
      const timeB = parseInt(b.name.split('_')[1] || '0');
      return timeA - timeB;
    });

    const toDelete = candidates.slice(0, 5);
    if (!window.confirm(`Tìm thấy ${toDelete.length} giọng AutoClone cũ nhất.\nBạn có chắc muốn xóa chúng?`)) return;

    setIsDeleting(true);
    addLog(`🗑️ Đang xóa ${toDelete.length} giọng cũ nhất...`, 'process');
    
    try {
        for (const voice of toDelete) {
          await deleteVoiceApi(voice.voice_id);
          setVoiceList(prev => prev.filter(v => v.voice_id !== voice.voice_id));
          await new Promise(r => setTimeout(r, 300));
        }
        addLog('✅ Đã hoàn tất dọn dẹp giọng cũ.', 'success');
    } catch (e: any) {
        addLog(`❌ Có lỗi trong quá trình xóa hàng loạt: ${e.message}`, 'error');
    } finally {
        setIsDeleting(false);
    }
  };

  const handleCloneVoice = async () => {
    if (!file || !apiKey) return window.alert('Thiếu File hoặc API Key');
    
    setIsCloning(true);
    addLog('🚀 Bắt đầu quy trình xử lý âm thanh...', 'process');

    try {
      addLog('1. Decoding Audio...', 'process');
      const buffer = await AudioService.decodeAudio(file);

      addLog('2. Lọc ồn & Loop (nếu cần)...', 'process');
      const processedBlob = await AudioService.processForCloning(buffer);
      addLog(`✅ Xử lý xong! Kích thước: ${(processedBlob.size/1024/1024).toFixed(2)}MB`, 'success');

      addLog('3. Đang tải lên ElevenLabs...', 'process');
      const formData = new FormData();
      formData.append('name', `AutoClone_${Date.now()}`);
      formData.append('files', processedBlob, 'sample.wav');
      formData.append('description', 'Auto-processed loop clone');
      
      const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.message || 'Clone thất bại');

      setClonedVoiceId(data.voice_id);
      addLog(`🎉 Clone thành công! Voice ID: ${data.voice_id}`, 'success');
      
      if (showVoiceList) fetchVoices();

    } catch (error: any) {
      addLog(`❌ Lỗi: ${error.message}`, 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const generateSingleVoice = async (index: number) => {
    if (!clonedVoiceId) {
      addLog('⚠️ Chưa chọn Voice ID.', 'error');
      return;
    }
    if (!apiKey) {
       addLog('⚠️ Thiếu API Key.', 'error');
       return;
    }

    const item = inputs[index];
    if (!item.text.trim()) {
       addLog(`⚠️ Kênh ${index + 1}: Nội dung trống.`, 'error');
       return;
    }

    const newInputs = [...inputs];
    newInputs[index].status = 'generating';
    setInputs(newInputs);

    try {
      addLog(`🎙️ Đang tạo kênh ${index + 1} (${item.language})...`, 'process');
        
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${clonedVoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: item.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: item.settings 
        })
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail?.message || 'TTS Failed');
      }
      
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      // Calculate duration before showing
      const tempAudio = new Audio(audioUrl);
      await new Promise((resolve) => {
         tempAudio.onloadedmetadata = () => {
            resolve(true);
         }
         // Fallback if metadata loads instantly or fails
         setTimeout(() => resolve(true), 2000);
      });
      
      setInputs(prev => prev.map((inp, i) => 
        i === index ? { ...inp, status: 'done', audioUrl, audioDuration: tempAudio.duration } : inp
      ));
      
      addLog(`✅ Kênh ${index + 1} hoàn tất (${tempAudio.duration.toFixed(1)}s)`, 'success');

    } catch (e: any) {
      setInputs(prev => prev.map((inp, i) => 
        i === index ? { ...inp, status: 'error' } : inp
      ));
      addLog(`❌ Kênh ${index + 1} thất bại: ${e.message}`, 'error');
    }
  };

  const generateBatch = async () => {
    if (!clonedVoiceId) {
       addLog('⚠️ Vui lòng chọn Voice ID trước.', 'error');
       return;
    }
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].text.trim()) {
        await generateSingleVoice(i);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  };

  const updateInput = (id: number, field: keyof TTSInput, value: any) => {
    setInputs(inputs.map(inp => {
      if (inp.id === id) {
        const updated = { ...inp, [field]: value };
        if (field === 'language') {
           const lang = LANG_OPTIONS.find(l => l.code === value);
           if (lang) updated.text = lang.defaultText;
        }
        return updated;
      }
      return inp;
    }));
  };

  const updateSettings = (id: number, field: keyof VoiceSettings, value: any) => {
    setInputs(inputs.map(inp => {
      if (inp.id === id) {
        return {
          ...inp,
          settings: {
            ...inp.settings,
            [field]: value
          }
        };
      }
      return inp;
    }));
  };

  const toggleAudio = (id: number) => {
    const audioEl = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (!audioEl) return;

    if (playingId === id) {
       // Stop current
       audioEl.pause();
       audioEl.currentTime = 0;
       setPlayingId(null);
    } else {
       // Stop others if any
       if (playingId !== null) {
           const prevEl = document.getElementById(`audio-${playingId}`) as HTMLAudioElement;
           if (prevEl) {
               prevEl.pause();
               prevEl.currentTime = 0;
           }
       }
       // Play new
       audioEl.play().catch(e => addLog(`Không thể phát audio: ${e.message}`, 'error'));
       setPlayingId(id);
    }
  };

  // Filtering logic
  const filteredVoices = voiceList.filter(v => {
    if (filterType === 'mine') return v.category !== 'premade';
    return true; // 'all'
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* SETUP CARD */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="bg-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
            Cấu hình & File
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">ElevenLabs API Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-black border border-slate-700 rounded px-3 py-2 text-xs focus:border-indigo-500 outline-none mt-1"
              />
            </div>

            <div className="relative group cursor-pointer">
              <input type="file" accept="video/*,audio/*" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:bg-slate-800'}`}>
                {file ? (
                  <div className="text-indigo-400">
                    <AudioWaveform className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-indigo-300/70">
                      {duration.toFixed(1)}s 
                      {duration < 60 && <span className="text-yellow-400 ml-1">(Auto-Loop)</span>}
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">Kéo thả video/audio vào đây</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleCloneVoice}
            disabled={isCloning || !file || !apiKey}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
          >
            {isCloning ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isCloning ? 'Đang xử lý...' : 'Xử lý & Clone Giọng'}
          </button>

          {/* VOICE MANAGEMENT TOGGLE */}
          <div className="mt-4 pt-4 border-t border-slate-800">
             <button 
               onClick={() => {
                 if (!showVoiceList) fetchVoices();
                 else setShowVoiceList(false);
               }}
               className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded flex items-center justify-center gap-2"
             >
               {showVoiceList ? <X className="w-3 h-3" /> : <List className="w-3 h-3" />}
               {showVoiceList ? 'Đóng danh sách' : 'Quản lý giọng (Thư viện)'}
             </button>
          </div>
        </div>
        
        {/* VOICE LIST DRAWER */}
        {showVoiceList && (
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 animate-in slide-in-from-top-4 flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-xs font-bold text-white uppercase tracking-wider">Thư viện ({filteredVoices.length})</h3>
               <button onClick={fetchVoices} disabled={isLoadingList} className="text-slate-500 hover:text-white">
                 <RefreshCw className={`w-3 h-3 ${isLoadingList ? 'animate-spin' : ''}`} />
               </button>
            </div>
            
            {/* FILTER TABS */}
            <div className="flex bg-black rounded p-1 mb-3 border border-slate-800">
               <button 
                 onClick={() => setFilterType('mine')}
                 className={`flex-1 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 ${filterType === 'mine' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <User className="w-3 h-3" /> Của tôi
               </button>
               <button 
                 onClick={() => setFilterType('all')}
                 className={`flex-1 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <List className="w-3 h-3" /> Tất cả
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 custom-scrollbar">
               {filteredVoices.length === 0 && !isLoadingList && <p className="text-[10px] text-slate-500 italic text-center py-2">Không tìm thấy giọng phù hợp.</p>}
               {filteredVoices.map(v => (
                 <div 
                    key={v.voice_id} 
                    onClick={() => {
                         setClonedVoiceId(v.voice_id);
                         addLog(`👉 Đã chọn giọng: ${v.name}`, 'info');
                    }}
                    className={`group relative flex items-center justify-between p-2 rounded bg-slate-950 border cursor-pointer transition-all ${clonedVoiceId === v.voice_id ? 'border-green-500/50 bg-green-900/10' : 'border-slate-800 hover:border-slate-600'}`}
                 >
                    <div className="overflow-hidden flex-1 mr-2">
                       <div className="flex items-center gap-2">
                          <p className={`text-xs truncate font-medium ${clonedVoiceId === v.voice_id ? 'text-green-400' : 'text-slate-300'}`}>
                            {v.name}
                          </p>
                          {v.category !== 'premade' && (
                            <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 rounded border border-indigo-500/30">
                              {v.category || 'Custom'}
                            </span>
                          )}
                       </div>
                       <p className="text-[9px] text-slate-600 truncate font-mono">{v.voice_id}</p>
                    </div>
                    <div className="flex items-center gap-2 z-20">
                       {clonedVoiceId === v.voice_id && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                       
                       {/* Hide delete button for premade voices */}
                       {v.category !== 'premade' && (
                           <div 
                             onClick={(e) => onSingleDelete(e, v.voice_id, v.name)}
                             className="p-2 bg-slate-900 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded border border-slate-800 hover:border-red-500/50 transition-all cursor-pointer shadow-sm"
                             title="Xóa giọng này"
                           >
                             {deletingId === v.voice_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                           </div>
                       )}
                    </div>
                 </div>
               ))}
            </div>
            
            {filterType === 'mine' && (
                <button 
                  onClick={handleDeleteOldest}
                  disabled={filteredVoices.length === 0 || isDeleting}
                  className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {isDeleting ? 'Đang dọn dẹp...' : 'Xóa 5 giọng AutoClone cũ nhất'}
                </button>
            )}
          </div>
        )}

        {/* LOGS */}
        <div className="bg-black rounded-xl border border-slate-800 p-3 h-[200px] overflow-hidden flex flex-col">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Nhật ký hệ thống</div>
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px]">
             {logs.length === 0 && <span className="text-slate-700 italic">Waiting for action...</span>}
             {logs.map((log, i) => (
               <div key={i} className={`flex gap-2 ${
                 log.type === 'error' ? 'text-red-400' : 
                 log.type === 'success' ? 'text-green-400' : 
                 log.type === 'process' ? 'text-yellow-400' : 'text-slate-400'
               }`}>
                 <span className="opacity-50">[{log.time}]</span>
                 <span>{log.msg}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-8 space-y-4">
         <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center text-xs text-black font-bold">2</span>
                Bộ tạo giọng 5 kênh
              </h2>
              <div className="flex gap-2">
                {clonedVoiceId ? (
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" /> Voice ID Sẵn sàng
                  </span>
                ) : (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Hãy chọn một giọng để bắt đầu
                  </span>
                )}
              </div>
           </div>

           <div className="grid gap-4">
             {inputs.map((inp, index) => (
               <div key={inp.id} className={`bg-black/40 rounded-lg border transition-all duration-300 ${openSettingsId === inp.id ? 'border-indigo-500 bg-slate-900/80' : 'border-slate-800 hover:border-slate-700'}`}>
                  
                  <div className="p-3 flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex md:flex-col items-center gap-2 mt-1 min-w-[30px]">
                       <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">
                         {index + 1}
                       </span>
                       {inp.status === 'generating' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin"/>}
                       {inp.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                       {inp.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500"/>}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                       <div className="flex items-center justify-between">
                          <select 
                             value={inp.language}
                             onChange={(e) => updateInput(inp.id, 'language', (e.target as HTMLSelectElement).value)}
                             className="bg-slate-950 text-xs text-indigo-300 border border-slate-800 rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                          </select>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => setOpenSettingsId(openSettingsId === inp.id ? null : inp.id)}
                               className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${openSettingsId === inp.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-400 bg-slate-800/50'}`}
                             >
                               <Settings className="w-3 h-3" /> Cấu hình
                             </button>
                          </div>
                       </div>
                       <textarea 
                         value={inp.text}
                         onChange={(e) => updateInput(inp.id, 'text', (e.target as HTMLTextAreaElement).value)}
                         className="w-full bg-transparent text-sm text-slate-300 focus:text-white outline-none resize-none h-12 placeholder:text-slate-700"
                         placeholder={`Nhập nội dung kênh ${index + 1}...`}
                       />
                    </div>

                    <div className="w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-start items-end gap-2 h-full min-w-[120px]">
                       <button
                         onClick={() => generateSingleVoice(index)}
                         disabled={inp.status === 'generating'}
                         className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1.5 w-full justify-center transition-colors"
                       >
                         {inp.status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                         Tạo giọng
                       </button>

                       {inp.audioUrl && (
                         <div className="flex flex-col gap-2 w-full">
                            <audio 
                                src={inp.audioUrl} 
                                className="hidden" 
                                id={`audio-${inp.id}`} 
                                onEnded={() => setPlayingId(null)}
                            />
                            <div className="flex gap-1 w-full">
                                <button 
                                    onClick={() => toggleAudio(inp.id)}
                                    className={`flex-1 rounded py-1 flex items-center justify-center transition-colors ${playingId === inp.id ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-800 hover:bg-slate-700 text-green-400'}`}
                                >
                                    {playingId === inp.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3" />}
                                </button>
                                <a 
                                    href={inp.audioUrl} 
                                    download={`voice_clone_${inp.language}_${index+1}.wav`} 
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded py-1 flex items-center justify-center"
                                >
                                    <Download className="w-3 h-3" />
                                </a>
                            </div>
                            {inp.audioDuration && (
                                <div className="text-[9px] text-center text-slate-500 flex items-center justify-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {inp.audioDuration.toFixed(1)}s
                                </div>
                            )}
                         </div>
                       )}
                    </div>
                  </div>

                  {openSettingsId === inp.id && (
                    <div className="border-t border-slate-700/50 p-4 bg-slate-950/30 rounded-b-lg grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                             <span>Độ ổn định (Stability)</span>
                             <span>{inp.settings.stability}</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01"
                            value={inp.settings.stability}
                            onChange={(e) => updateSettings(inp.id, 'stability', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                             <span>Độ giống (Similarity)</span>
                             <span>{inp.settings.similarity_boost}</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01"
                            value={inp.settings.similarity_boost}
                            onChange={(e) => updateSettings(inp.id, 'similarity_boost', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                             <span>Cường điệu (Style)</span>
                             <span>{inp.settings.style}</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01"
                            value={inp.settings.style}
                            onChange={(e) => updateSettings(inp.id, 'style', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                       </div>
                       <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            id={`boost-${inp.id}`}
                            checked={inp.settings.use_speaker_boost}
                            onChange={(e) => updateSettings(inp.id, 'use_speaker_boost', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor={`boost-${inp.id}`} className="text-xs text-slate-400 cursor-pointer select-none">
                             Tăng cường loa (Speaker Boost)
                          </label>
                       </div>
                    </div>
                  )}
               </div>
             ))}
           </div>

           <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
             <p className="text-xs text-slate-500">
               Điều chỉnh cài đặt từng kênh để có kết quả tốt nhất.
             </p>
             <button
               onClick={generateBatch}
               disabled={inputs.some(i => i.status === 'generating')}
               className="bg-white hover:bg-indigo-50 text-black px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-white/10"
             >
               <Sparkles className="w-4 h-4" />
               Tạo tất cả (Hợp lệ)
             </button>
           </div>
         </div>
      </div>
    </div>
  );
}
