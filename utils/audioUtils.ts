/// <reference lib="dom" />
// Helper: AudioBuffer to WAV Blob (Simplified)
export function audioBufferToWavSimple(buffer: AudioBuffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const result = buffer.getChannelData(0); // Always mono for clone
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const bufferArr = new ArrayBuffer(44 + result.length * bytesPerSample);
  const view = new DataView(bufferArr);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + result.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, 1, true); // Force Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, result.length * bytesPerSample, true);
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

export const AudioService = {
  decodeAudio: async (file: File): Promise<AudioBuffer> => {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    return await ctx.decodeAudioData(arrayBuffer);
  },

  processForCloning: async (originalBuffer: AudioBuffer): Promise<Blob> => {
    const ctx = new OfflineAudioContext(
      1, // Force Mono
      originalBuffer.duration * originalBuffer.sampleRate * 10, // Max buffer
      originalBuffer.sampleRate
    );

    const TARGET_DURATION = 60;
    let loopCount = Math.ceil(TARGET_DURATION / originalBuffer.duration);
    if (loopCount < 1) loopCount = 1;
    
    const totalSamples = originalBuffer.length * loopCount;
    
    const renderCtx = new OfflineAudioContext(
      1, 
      totalSamples, 
      originalBuffer.sampleRate
    );

    const compressor = renderCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const highPass = renderCtx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 150;
    
    const lowPass = renderCtx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 8000;

    for (let i = 0; i < loopCount; i++) {
      const source = renderCtx.createBufferSource();
      source.buffer = originalBuffer;
      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(compressor);
      compressor.connect(renderCtx.destination);
      source.start(i * originalBuffer.duration);
    }

    const processedBuffer = await renderCtx.startRendering();
    return audioBufferToWavSimple(processedBuffer);
  }
};

// Live API Utils
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}