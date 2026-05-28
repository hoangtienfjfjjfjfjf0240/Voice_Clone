import { MiniMaxVoice, MiniMaxVoiceCategory, VoiceSettings } from '../types';

const MINIMAX_API_BASE = (import.meta as any).env?.VITE_MINIMAX_API_BASE || '/api/minimax';
const DEFAULT_MODEL = 'speech-2.8-hd';

export type MiniMaxLanguageBoost =
  | 'Chinese'
  | 'Chinese,Yue'
  | 'English'
  | 'Arabic'
  | 'Russian'
  | 'Spanish'
  | 'French'
  | 'Portuguese'
  | 'German'
  | 'Turkish'
  | 'Dutch'
  | 'Ukrainian'
  | 'Vietnamese'
  | 'Indonesian'
  | 'Japanese'
  | 'Italian'
  | 'Korean'
  | 'Thai'
  | 'Polish'
  | 'Romanian'
  | 'Greek'
  | 'Czech'
  | 'Finnish'
  | 'Hindi'
  | 'Bulgarian'
  | 'Danish'
  | 'Hebrew'
  | 'Malay'
  | 'Persian'
  | 'Slovak'
  | 'Swedish'
  | 'Croatian'
  | 'Filipino'
  | 'Hungarian'
  | 'Norwegian'
  | 'Slovenian'
  | 'Catalan'
  | 'Nynorsk'
  | 'Tamil'
  | 'Afrikaans'
  | 'auto';

const LANGUAGE_BOOST_BY_CODE: Record<string, MiniMaxLanguageBoost> = {
  auto: 'auto',
  zh: 'Chinese',
  yue: 'Chinese,Yue',
  vi: 'Vietnamese',
  en: 'English',
  ar: 'Arabic',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  tr: 'Turkish',
  nl: 'Dutch',
  uk: 'Ukrainian',
  id: 'Indonesian',
  ja: 'Japanese',
  it: 'Italian',
  ko: 'Korean',
  th: 'Thai',
  pl: 'Polish',
  ro: 'Romanian',
  el: 'Greek',
  cs: 'Czech',
  fi: 'Finnish',
  hi: 'Hindi',
  bg: 'Bulgarian',
  da: 'Danish',
  he: 'Hebrew',
  ms: 'Malay',
  fa: 'Persian',
  sk: 'Slovak',
  sv: 'Swedish',
  hr: 'Croatian',
  fil: 'Filipino',
  hu: 'Hungarian',
  no: 'Norwegian',
  sl: 'Slovenian',
  ca: 'Catalan',
  nn: 'Nynorsk',
  ta: 'Tamil',
  af: 'Afrikaans',
};

function buildUrl(path: string) {
  const normalizedBase = MINIMAX_API_BASE.replace(/\/$/, '');
  return `${normalizedBase}${path}`;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.base_resp?.status_msg || data?.error?.message || data?.message || res.statusText);
  }
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(data.base_resp.status_msg || `MiniMax error ${data.base_resp.status_code}`);
  }
  return data as T;
}

async function minimaxJson<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(res);
}

async function minimaxForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    body: formData,
  });
  return parseJsonResponse<T>(res);
}

function normalizeVoice(
  voice: any,
  category: MiniMaxVoiceCategory,
): MiniMaxVoice {
  return {
    voice_id: String(voice.voice_id),
    name: voice.voice_name || voice.name || voice.voice_id,
    category,
    created_time: voice.created_time,
    description: Array.isArray(voice.description) ? voice.description : [],
  };
}

function hexToBlob(hex: string, mimeType = 'audio/mpeg') {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return new Blob([bytes], { type: mimeType });
}

export function getLanguageBoost(languageCode: string): MiniMaxLanguageBoost {
  return LANGUAGE_BOOST_BY_CODE[languageCode] || 'auto';
}

export function buildVoiceId(prefix = 'AutoClone') {
  return `${prefix}_${Date.now()}`;
}

export const MiniMaxApi = {
  model: DEFAULT_MODEL,

  async uploadCloneAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('purpose', 'voice_clone');
    formData.append('file', audioBlob, 'clone_source.wav');

    const data = await minimaxForm<{ file?: { file_id?: number | string } }>(
      '/v1/files/upload',
      formData,
    );
    const fileId = data.file?.file_id;
    if (!fileId) throw new Error('MiniMax did not return file_id.');
    return Number(fileId);
  },

  async cloneVoice(
    params: {
      fileId: number;
      voiceId: string;
      languageCode: string;
      needNoiseReduction: boolean;
      needVolumeNormalization: boolean;
    },
  ) {
    await minimaxJson('/v1/voice_clone', {
      file_id: params.fileId,
      voice_id: params.voiceId,
      language_boost: getLanguageBoost(params.languageCode),
      need_noise_reduction: params.needNoiseReduction,
      need_volume_normalization: params.needVolumeNormalization,
    });
    return params.voiceId;
  },

  async textToSpeech(
    params: {
      voiceId: string;
      text: string;
      languageCode: string;
      settings: VoiceSettings;
    },
  ) {
    const data = await minimaxJson<{
      data?: { audio?: string; status?: number };
      extra_info?: { audio_length?: number; audio_format?: string };
    }>('/v1/t2a_v2', {
      model: DEFAULT_MODEL,
      text: params.text,
      stream: false,
      language_boost: getLanguageBoost(params.languageCode),
      voice_setting: {
        voice_id: params.voiceId,
        speed: params.settings.speed,
        vol: params.settings.volume,
        pitch: params.settings.pitch,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    });

    const audioHex = data.data?.audio;
    if (!audioHex) throw new Error('MiniMax did not return audio data.');
    return {
      blob: hexToBlob(audioHex, 'audio/mpeg'),
      lengthMs: data.extra_info?.audio_length,
      format: data.extra_info?.audio_format || 'mp3',
    };
  },

  async getVoices(voiceType: 'system' | 'voice_cloning' | 'voice_generation' | 'all' = 'all') {
    const data = await minimaxJson<{
      system_voice?: any[];
      voice_cloning?: any[];
      voice_generation?: any[];
    }>('/v1/get_voice', { voice_type: voiceType });

    return [
      ...(data.system_voice || []).map((voice) => normalizeVoice(voice, 'system')),
      ...(data.voice_cloning || []).map((voice) => normalizeVoice(voice, 'voice_cloning')),
      ...(data.voice_generation || []).map((voice) => normalizeVoice(voice, 'voice_generation')),
    ];
  },

  async deleteVoice(voiceId: string, category: MiniMaxVoiceCategory = 'voice_cloning') {
    if (category === 'system') {
      throw new Error('System voices cannot be deleted.');
    }

    await minimaxJson('/v1/delete_voice', {
      voice_type: category,
      voice_id: voiceId,
    });
  },
};
