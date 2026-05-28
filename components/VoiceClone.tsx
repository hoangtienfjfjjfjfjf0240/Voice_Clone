/// <reference lib="dom" />
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AudioWaveform,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  List,
  Mic2,
  Play,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Square,
  Trash2,
  Upload,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { AudioService } from '../utils/audioUtils';
import { buildVoiceId, getLanguageBoost, MiniMaxApi } from '../utils/minimaxApi';
import { Log, MiniMaxVoice, TTSInput, VoiceSettings } from '../types';

interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string;
  defaultText: string;
}

const LANG_OPTIONS: LanguageOption[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'Tự nhận diện', defaultText: 'Xin chào, đây là giọng nói AI đã được clone bằng MiniMax.' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', defaultText: '你好，这是用 MiniMax 克隆生成的 AI 声音。' },
  { code: 'yue', name: 'Cantonese', nativeName: '粵語', defaultText: '你好，呢個係用 MiniMax 複製生成嘅 AI 聲音。' },
  { code: 'en', name: 'English', nativeName: 'English', defaultText: 'Hello, this is my cloned AI voice generated with MiniMax.' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', defaultText: 'مرحبا، هذا صوتي المستنسخ بالذكاء الاصطناعي باستخدام MiniMax.' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', defaultText: 'Здравствуйте, это мой клонированный ИИ-голос, созданный с MiniMax.' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', defaultText: 'Hola, esta es mi voz de IA clonada con MiniMax.' },
  { code: 'fr', name: 'French', nativeName: 'Français', defaultText: 'Bonjour, ceci est ma voix clonée par MiniMax.' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', defaultText: 'Olá, esta é minha voz de IA clonada com MiniMax.' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', defaultText: 'Hallo, das ist meine mit MiniMax geklonte KI-Stimme.' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', defaultText: 'Merhaba, bu MiniMax ile klonlanmış yapay zeka sesim.' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', defaultText: 'Hallo, dit is mijn met MiniMax gekloonde AI-stem.' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', defaultText: 'Вітаю, це мій клонований ШІ-голос, створений за допомогою MiniMax.' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', defaultText: 'Xin chào, đây là giọng nói AI đã được clone bằng MiniMax.' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', defaultText: 'Halo, ini adalah suara AI kloning yang dibuat dengan MiniMax.' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', defaultText: 'こんにちは。これはMiniMaxで生成されたクローン音声です。' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', defaultText: '안녕하세요. 이것은 MiniMax로 생성한 복제 음성입니다.' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', defaultText: 'สวัสดี นี่คือเสียง AI ที่โคลนด้วย MiniMax' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', defaultText: 'Cześć, to mój głos AI sklonowany za pomocą MiniMax.' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', defaultText: 'Salut, aceasta este vocea mea AI clonată cu MiniMax.' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', defaultText: 'Γεια σας, αυτή είναι η κλωνοποιημένη φωνή AI μου με το MiniMax.' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', defaultText: 'Dobrý den, toto je můj klonovaný AI hlas vytvořený pomocí MiniMax.' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', defaultText: 'Hei, tämä on MiniMaxilla kloonattu tekoälyääneni.' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', defaultText: 'नमस्ते, यह MiniMax से बनाई गई मेरी क्लोन AI आवाज़ है।' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', defaultText: 'Здравейте, това е моят AI глас, клониран с MiniMax.' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', defaultText: 'Hej, dette er min AI-stemme klonet med MiniMax.' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', defaultText: 'שלום, זהו קול ה-AI המשוכפל שלי שנוצר עם MiniMax.' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', defaultText: 'Hai, ini ialah suara AI saya yang diklon dengan MiniMax.' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', defaultText: 'سلام، این صدای هوش مصنوعی شبیه سازی شده من با MiniMax است.' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', defaultText: 'Dobrý deň, toto je môj AI hlas naklonovaný pomocou MiniMax.' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', defaultText: 'Hej, det här är min AI-röst klonad med MiniMax.' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', defaultText: 'Pozdrav, ovo je moj AI glas kloniran pomoću MiniMaxa.' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', defaultText: 'Kumusta, ito ang aking AI voice na na-clone gamit ang MiniMax.' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', defaultText: 'Szia, ez a MiniMax segítségével klónozott AI hangom.' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', defaultText: 'Hei, dette er AI-stemmen min klonet med MiniMax.' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', defaultText: 'Pozdravljeni, to je moj AI glas, kloniran z MiniMax.' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', defaultText: 'Hola, aquesta és la meva veu d’IA clonada amb MiniMax.' },
  { code: 'nn', name: 'Nynorsk', nativeName: 'Nynorsk', defaultText: 'Hei, dette er AI-røysta mi klona med MiniMax.' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', defaultText: 'வணக்கம், இது MiniMax மூலம் உருவாக்கப்பட்ட என் குளோன் AI குரல்.' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', defaultText: 'Hallo, dit is my AI-stem wat met MiniMax gekloon is.' },
];

const DEFAULT_SETTINGS: VoiceSettings = {
  speed: 1,
  volume: 1,
  pitch: 0,
};

function getLanguageOption(code: string): LanguageOption {
  return LANG_OPTIONS.find((lang) => lang.code === code) || LANG_OPTIONS[0];
}

function isDefaultLanguageText(text: string) {
  return LANG_OPTIONS.some((lang) => lang.defaultText === text);
}

function getAudioDuration(audioUrl: string, fallbackMs?: number) {
  if (fallbackMs) return Promise.resolve(fallbackMs / 1000);
  const tempAudio = new Audio(audioUrl);
  return new Promise<number>((resolve) => {
    tempAudio.onloadedmetadata = () => resolve(Number.isFinite(tempAudio.duration) ? tempAudio.duration : 0);
    tempAudio.onerror = () => resolve(0);
    setTimeout(() => resolve(0), 2000);
  });
}

function LanguageSelect({
  value,
  onChange,
  className = '',
  dropdownClassName = '',
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  dropdownClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = getLanguageOption(value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = LANG_OPTIONS.filter((lang) => {
    if (!normalizedQuery) return true;
    return [
      lang.name,
      lang.nativeName || '',
      lang.code,
      getLanguageBoost(lang.code),
    ].some((text) => text.toLowerCase().includes(normalizedQuery));
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectLanguage = (code: string) => {
    onChange(code);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full bg-black border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none flex items-center justify-between gap-2"
      >
        <span className="min-w-0 flex items-center gap-2">
          <span className="truncate font-medium">{selected.name}</span>
          {selected.nativeName && selected.nativeName !== selected.name && (
            <span className="hidden sm:inline text-slate-500 truncate">{selected.nativeName}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-2 z-50 w-[min(320px,calc(100vw-48px))] rounded-lg border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50 ${dropdownClassName}`}>
          <div className="p-2 border-b border-slate-800">
            <div className="flex items-center gap-2 rounded bg-black border border-slate-800 px-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                placeholder="Tìm ngôn ngữ, code, boost..."
                className="w-full bg-transparent py-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-500">Không tìm thấy ngôn ngữ phù hợp.</div>
            )}
            {filteredOptions.map((lang) => {
              const isSelected = lang.code === value;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => selectLanguage(lang.code)}
                  className={`w-full rounded px-2.5 py-2 text-left text-xs flex items-center justify-between gap-3 hover:bg-slate-800 ${
                    isSelected ? 'bg-indigo-600/20 text-indigo-200' : 'text-slate-300'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{lang.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {[lang.nativeName, lang.code, getLanguageBoost(lang.code)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VoiceClone() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [syncTtsLanguage, setSyncTtsLanguage] = useState(true);
  const [needNoiseReduction, setNeedNoiseReduction] = useState(true);
  const [needVolumeNormalization, setNeedVolumeNormalization] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string>('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [openSettingsId, setOpenSettingsId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const [voiceList, setVoiceList] = useState<MiniMaxVoice[]>([]);
  const [showVoiceList, setShowVoiceList] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'mine'>('mine');

  const [inputs, setInputs] = useState<TTSInput[]>([
    { id: 1, text: getLanguageOption('vi').defaultText, language: 'vi', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 2, text: getLanguageOption('vi').defaultText, language: 'vi', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 3, text: getLanguageOption('vi').defaultText, language: 'vi', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 4, text: getLanguageOption('vi').defaultText, language: 'vi', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
    { id: 5, text: getLanguageOption('vi').defaultText, language: 'vi', status: 'idle', settings: { ...DEFAULT_SETTINGS } },
  ]);

  const addLog = (msg: string, type: Log['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [{ time, msg, type }, ...prev]);
  };

  useEffect(() => {
    return () => {
      if (playingId) {
        const audioEl = document.getElementById(`audio-${playingId}`) as HTMLAudioElement;
        audioEl?.pause();
      }
    };
  }, [playingId]);

  const applyLanguageToInputs = (language: string) => {
    const defaultText = getLanguageOption(language).defaultText;
    setInputs((prev) =>
      prev.map((inp) => ({
        ...inp,
        language,
        text: isDefaultLanguageText(inp.text) ? defaultText : inp.text,
      })),
    );
  };

  const handleSourceLanguageChange = (language: string) => {
    setSourceLanguage(language);
    if (syncTtsLanguage) applyLanguageToInputs(language);
  };

  const handleSyncModeChange = (enabled: boolean) => {
    setSyncTtsLanguage(enabled);
    if (enabled) applyLanguageToInputs(sourceLanguage);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const selected = target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setClonedVoiceId('');
    const objectUrl = URL.createObjectURL(selected);
    const audio = document.createElement('audio');
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
      addLog(`Đã nhận file: ${selected.name} (${(audio.duration || 0).toFixed(1)}s)`, 'info');
      if (audio.duration < 60) {
        addLog('Video/audio ngắn sẽ được tự loop lên khoảng 60 giây trước khi upload.', 'process');
      }
      URL.revokeObjectURL(objectUrl);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      addLog('Không đọc được metadata file. Tôi vẫn sẽ thử decode khi clone.', 'process');
    };
  };

  const fetchVoices = async () => {
    setIsLoadingList(true);
    try {
      const voices = await MiniMaxApi.getVoices('all');
      setVoiceList(voices);
      setShowVoiceList(true);
      addLog(`Đã tải ${voices.length} voice từ MiniMax. Voice clone mới chỉ hiện sau lần TTS đầu tiên.`, 'success');
    } catch (e: any) {
      addLog(`Lỗi tải danh sách voice: ${e.message}`, 'error');
    } finally {
      setIsLoadingList(false);
    }
  };

  const deleteVoiceApi = async (voice: MiniMaxVoice) => {
    await MiniMaxApi.deleteVoice(voice.voice_id, voice.category);
  };

  const onSingleDelete = async (e: React.MouseEvent, voice: MiniMaxVoice) => {
    e.stopPropagation();
    e.preventDefault();

    if (voice.category === 'system') return window.alert('System voice của MiniMax không thể xóa.');
    if (!window.confirm(`Xóa vĩnh viễn voice:\n"${voice.name}"?\n\nMiniMax không cho tái sử dụng lại voice_id đã xóa.`)) return;

    setDeletingId(voice.voice_id);
    try {
      addLog(`Đang xóa voice: ${voice.name}...`, 'process');
      await deleteVoiceApi(voice);
      setVoiceList((prev) => prev.filter((item) => item.voice_id !== voice.voice_id));
      if (clonedVoiceId === voice.voice_id) setClonedVoiceId('');
      addLog(`Đã xóa voice: ${voice.name}`, 'success');
    } catch (error: any) {
      addLog(`Xóa thất bại: ${error.message}`, 'error');
      window.alert(`Không thể xóa voice này.\nLỗi: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteOldest = async () => {
    if (!voiceList.length) return;

    const candidates = voiceList
      .filter((voice) => voice.category === 'voice_cloning' && voice.voice_id.startsWith('AutoClone_'))
      .sort((a, b) => Number(a.voice_id.split('_')[1] || 0) - Number(b.voice_id.split('_')[1] || 0))
      .slice(0, 5);

    if (!candidates.length) {
      return window.alert('Không tìm thấy voice AutoClone nào để xóa.');
    }
    if (!window.confirm(`Xóa ${candidates.length} voice AutoClone cũ nhất?`)) return;

    setIsDeleting(true);
    addLog(`Đang xóa ${candidates.length} voice AutoClone cũ nhất...`, 'process');
    try {
      for (const voice of candidates) {
        await deleteVoiceApi(voice);
        setVoiceList((prev) => prev.filter((item) => item.voice_id !== voice.voice_id));
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      addLog('Đã dọn xong voice AutoClone cũ.', 'success');
    } catch (e: any) {
      addLog(`Có lỗi khi xóa hàng loạt: ${e.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloneVoice = async () => {
    if (!file) return window.alert('Vui lòng chọn file video/audio trước.');

    setIsCloning(true);
    addLog('Bắt đầu xử lý nguồn clone...', 'process');

    try {
      addLog('1. Decode audio từ file video/audio...', 'process');
      const buffer = await AudioService.decodeAudio(file);

      addLog('2. Lọc nhẹ, chuẩn hóa mono 32kHz và loop nếu file ngắn...', 'process');
      const processedBlob = await AudioService.processForCloning(buffer);
      const sizeMb = processedBlob.size / 1024 / 1024;
      if (sizeMb > 20) throw new Error(`File sau xử lý ${sizeMb.toFixed(2)}MB, vượt giới hạn 20MB của MiniMax.`);
      addLog(`Audio clone sẵn sàng: ${sizeMb.toFixed(2)}MB`, 'success');

      addLog('3. Upload source audio lên MiniMax...', 'process');
      const fileId = await MiniMaxApi.uploadCloneAudio(processedBlob);
      addLog(`MiniMax file_id: ${fileId}`, 'success');

      const voiceId = buildVoiceId();
      addLog(`4. Clone voice_id ${voiceId} với language_boost=${getLanguageBoost(sourceLanguage)}...`, 'process');
      await MiniMaxApi.cloneVoice({
        fileId,
        voiceId,
        languageCode: sourceLanguage,
        needNoiseReduction,
        needVolumeNormalization,
      });

      setClonedVoiceId(voiceId);
      setVoiceList((prev) => [
        {
          voice_id: voiceId,
          name: voiceId,
          category: 'voice_cloning',
          created_time: new Date().toISOString().slice(0, 10),
          description: ['Created locally from current session'],
        },
        ...prev.filter((voice) => voice.voice_id !== voiceId),
      ]);
      addLog(`Clone thành công. Voice ID: ${voiceId}`, 'success');
    } catch (error: any) {
      addLog(`Lỗi clone: ${error.message}`, 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const generateSingleVoice = async (index: number) => {
    if (!clonedVoiceId.trim()) {
      addLog('Chưa có Voice ID để TTS.', 'error');
      return;
    }

    const item = inputs[index];
    const languageCode = syncTtsLanguage ? sourceLanguage : item.language;
    if (!item.text.trim()) {
      addLog(`Kênh ${index + 1}: nội dung trống.`, 'error');
      return;
    }

    setInputs((prev) => prev.map((inp, i) => (i === index ? { ...inp, status: 'generating' } : inp)));

    try {
      addLog(`Tạo kênh ${index + 1} (${getLanguageBoost(languageCode)})...`, 'process');
      const result = await MiniMaxApi.textToSpeech({
        voiceId: clonedVoiceId.trim(),
        text: item.text,
        languageCode,
        settings: item.settings,
      });

      const audioUrl = URL.createObjectURL(result.blob);
      const audioDuration = await getAudioDuration(audioUrl, result.lengthMs);
      setInputs((prev) =>
        prev.map((inp, i) =>
          i === index ? { ...inp, status: 'done', audioUrl, audioDuration } : inp,
        ),
      );
      addLog(`Kênh ${index + 1} hoàn tất (${audioDuration ? audioDuration.toFixed(1) : '?'}s).`, 'success');
    } catch (e: any) {
      setInputs((prev) => prev.map((inp, i) => (i === index ? { ...inp, status: 'error' } : inp)));
      addLog(`Kênh ${index + 1} thất bại: ${e.message}`, 'error');
    }
  };

  const generateBatch = async () => {
    if (!clonedVoiceId.trim()) {
      addLog('Vui lòng clone hoặc chọn Voice ID trước.', 'error');
      return;
    }
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].text.trim()) {
        await generateSingleVoice(i);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  };

  const updateInput = (id: number, field: keyof TTSInput, value: any) => {
    setInputs((prev) =>
      prev.map((inp) => {
        if (inp.id !== id) return inp;
        const updated = { ...inp, [field]: value };
        if (field === 'language') {
          updated.text = getLanguageOption(value).defaultText;
        }
        return updated;
      }),
    );
  };

  const updateSettings = (id: number, field: keyof VoiceSettings, value: number) => {
    setInputs((prev) =>
      prev.map((inp) =>
        inp.id === id
          ? {
              ...inp,
              settings: {
                ...inp.settings,
                [field]: value,
              },
            }
          : inp,
      ),
    );
  };

  const toggleAudio = (id: number) => {
    const audioEl = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (!audioEl) return;

    if (playingId === id) {
      audioEl.pause();
      audioEl.currentTime = 0;
      setPlayingId(null);
      return;
    }

    if (playingId !== null) {
      const prevEl = document.getElementById(`audio-${playingId}`) as HTMLAudioElement;
      if (prevEl) {
        prevEl.pause();
        prevEl.currentTime = 0;
      }
    }
    audioEl.play().catch((e) => addLog(`Không thể phát audio: ${e.message}`, 'error'));
    setPlayingId(id);
  };

  const filteredVoices = voiceList.filter((voice) => (filterType === 'mine' ? voice.category !== 'system' : true));
  const isGenerating = inputs.some((input) => input.status === 'generating');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="bg-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
            Cấu hình MiniMax
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Ngôn ngữ trước khi clone</label>
              <LanguageSelect
                value={sourceLanguage}
                onChange={handleSourceLanguageChange}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Model</label>
              <div className="w-full bg-black border border-slate-700 rounded px-3 py-2 text-xs text-green-400 mt-1">
                {MiniMaxApi.model}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 bg-black border border-slate-800 rounded px-3 py-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={needNoiseReduction}
                  onChange={(e) => setNeedNoiseReduction(e.target.checked)}
                  className="accent-indigo-500"
                />
                Khử nhiễu
              </label>
              <label className="flex items-center gap-2 bg-black border border-slate-800 rounded px-3 py-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={needVolumeNormalization}
                  onChange={(e) => setNeedVolumeNormalization(e.target.checked)}
                  className="accent-indigo-500"
                />
                Cân âm lượng
              </label>
            </div>

            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={handleFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  file ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                {file ? (
                  <div className="text-indigo-400">
                    <AudioWaveform className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-indigo-300/70">
                      {duration ? `${duration.toFixed(1)}s` : 'ready'}
                      {duration > 0 && duration < 60 && <span className="text-yellow-400 ml-1">(Auto-loop)</span>}
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

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">Voice ID đang dùng</label>
              <input
                type="text"
                value={clonedVoiceId}
                onChange={(e) => setClonedVoiceId(e.target.value)}
                placeholder="Clone xong sẽ tự điền hoặc paste voice_id có sẵn"
                className="w-full bg-black border border-slate-700 rounded px-3 py-2 text-xs focus:border-green-500 outline-none mt-1 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleCloneVoice}
            disabled={isCloning || !file}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
          >
            {isCloning ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isCloning ? 'Đang clone...' : 'Xử lý & Clone bằng MiniMax'}
          </button>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                if (!showVoiceList) fetchVoices();
                else setShowVoiceList(false);
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded flex items-center justify-center gap-2"
            >
              {showVoiceList ? <X className="w-3 h-3" /> : <List className="w-3 h-3" />}
              {showVoiceList ? 'Đóng thư viện' : 'Quản lý voice MiniMax'}
            </button>
          </div>
        </div>

        {showVoiceList && (
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 animate-in slide-in-from-top-4 flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Thư viện ({filteredVoices.length})</h3>
              <button onClick={fetchVoices} disabled={isLoadingList} className="text-slate-500 hover:text-white">
                <RefreshCw className={`w-3 h-3 ${isLoadingList ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex bg-black rounded p-1 mb-3 border border-slate-800">
              <button
                onClick={() => setFilterType('mine')}
                className={`flex-1 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 ${
                  filterType === 'mine' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <User className="w-3 h-3" /> Của tôi
              </button>
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 ${
                  filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <List className="w-3 h-3" /> Tất cả
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 custom-scrollbar">
              {filteredVoices.length === 0 && !isLoadingList && (
                <p className="text-[10px] text-slate-500 italic text-center py-2">Không có voice phù hợp.</p>
              )}
              {filteredVoices.map((voice) => (
                <div
                  key={`${voice.category}-${voice.voice_id}`}
                  onClick={() => {
                    setClonedVoiceId(voice.voice_id);
                    addLog(`Đã chọn voice: ${voice.name}`, 'info');
                  }}
                  className={`group relative flex items-center justify-between p-2 rounded bg-slate-950 border cursor-pointer transition-all ${
                    clonedVoiceId === voice.voice_id ? 'border-green-500/50 bg-green-900/10' : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="overflow-hidden flex-1 mr-2">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs truncate font-medium ${clonedVoiceId === voice.voice_id ? 'text-green-400' : 'text-slate-300'}`}>
                        {voice.name}
                      </p>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 rounded border border-indigo-500/30">
                        {voice.category}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-600 truncate font-mono">{voice.voice_id}</p>
                  </div>
                  <div className="flex items-center gap-2 z-20">
                    {clonedVoiceId === voice.voice_id && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {voice.category !== 'system' && (
                      <button
                        type="button"
                        onClick={(e) => onSingleDelete(e, voice)}
                        className="p-2 bg-slate-900 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded border border-slate-800 hover:border-red-500/50 transition-all cursor-pointer shadow-sm"
                        title="Xóa voice này"
                      >
                        {deletingId === voice.voice_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
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
                {isDeleting ? 'Đang dọn...' : 'Xóa 5 voice AutoClone cũ nhất'}
              </button>
            )}
          </div>
        )}

        <div className="bg-black rounded-xl border border-slate-800 p-3 h-[200px] overflow-hidden flex flex-col">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Nhật ký hệ thống</div>
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px]">
            {logs.length === 0 && <span className="text-slate-700 italic">Waiting for action...</span>}
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'success'
                      ? 'text-green-400'
                      : log.type === 'process'
                        ? 'text-yellow-400'
                        : 'text-slate-400'
                }`}
              >
                <span className="opacity-50">[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="bg-green-500 w-6 h-6 rounded-full flex items-center justify-center text-xs text-black font-bold">2</span>
              Tạo voice đầu ra
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-black rounded p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSyncModeChange(true)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${
                    syncTtsLanguage ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Tự nhận diện
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncModeChange(false)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${
                    !syncTtsLanguage ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Đa ngôn ngữ
                </button>
              </div>
              {clonedVoiceId ? (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Voice ID sẵn sàng
                </span>
              ) : (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Chưa chọn voice
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {inputs.map((inp, index) => (
              <div
                key={inp.id}
                className={`bg-black/40 rounded-lg border transition-all duration-300 ${
                  openSettingsId === inp.id ? 'border-indigo-500 bg-slate-900/80' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="p-3 flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex md:flex-col items-center gap-2 mt-1 min-w-[30px]">
                    <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    {inp.status === 'generating' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    {inp.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {inp.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className={`flex items-center gap-2 ${syncTtsLanguage ? 'justify-end' : 'justify-between'}`}>
                      {!syncTtsLanguage && (
                        <LanguageSelect
                          value={inp.language}
                          onChange={(value) => updateInput(inp.id, 'language', value)}
                          className="w-40"
                          dropdownClassName="md:w-80"
                        />
                      )}
                      <button
                        onClick={() => setOpenSettingsId(openSettingsId === inp.id ? null : inp.id)}
                        className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                          openSettingsId === inp.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-400 bg-slate-800/50'
                        }`}
                      >
                        <Settings className="w-3 h-3" /> Cấu hình
                      </button>
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
                      disabled={inp.status === 'generating' || !clonedVoiceId.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1.5 w-full justify-center transition-colors"
                    >
                      {inp.status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Tạo giọng
                    </button>

                    {inp.audioUrl && (
                      <div className="flex flex-col gap-2 w-full">
                        <audio src={inp.audioUrl} className="hidden" id={`audio-${inp.id}`} onEnded={() => setPlayingId(null)} />
                        <div className="flex gap-1 w-full">
                          <button
                            onClick={() => toggleAudio(inp.id)}
                            className={`flex-1 rounded py-1 flex items-center justify-center transition-colors ${
                              playingId === inp.id ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-800 hover:bg-slate-700 text-green-400'
                            }`}
                          >
                            {playingId === inp.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3" />}
                          </button>
                          <a
                            href={inp.audioUrl}
                            download={`minimax_voice_${syncTtsLanguage ? sourceLanguage : inp.language}_${index + 1}.mp3`}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded py-1 flex items-center justify-center"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                        {!!inp.audioDuration && (
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
                  <div className="border-t border-slate-700/50 p-4 bg-slate-950/30 rounded-b-lg grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                        <span>Speed</span>
                        <span>{inp.settings.speed.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.05"
                        value={inp.settings.speed}
                        onChange={(e) => updateSettings(inp.id, 'speed', parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                        <span>Volume</span>
                        <span>{inp.settings.volume.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={inp.settings.volume}
                        onChange={(e) => updateSettings(inp.id, 'volume', parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                        <span>Pitch</span>
                        <span>{inp.settings.pitch}</span>
                      </div>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={inp.settings.pitch}
                        onChange={(e) => updateSettings(inp.id, 'pitch', parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Mic2 className="w-3 h-3" />
              {syncTtsLanguage
                ? `Các kênh dùng language_boost=${getLanguageBoost(sourceLanguage)}.`
                : 'Mỗi kênh tự dùng language_boost theo ngôn ngữ đã chọn.'}
            </p>
            <button
              onClick={generateBatch}
              disabled={isGenerating || !clonedVoiceId.trim()}
              className="bg-white hover:bg-indigo-50 disabled:bg-slate-700 disabled:text-slate-500 text-black px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-white/10"
            >
              <Sparkles className="w-4 h-4" />
              Tạo tất cả kênh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
