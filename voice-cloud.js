/* Cloud TTS / ASR helpers for Aliyun DashScope & Volcengine OpenSpeech.
   Keys stay in the page (same trust model as the LLM key). */
(function (global) {
  'use strict';

  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBase64(dataUrl) {
    const i = String(dataUrl || '').indexOf('base64,');
    return i >= 0 ? dataUrl.slice(i + 7) : String(dataUrl || '');
  }

  async function playUrlOrBase64(audioEl, { url, base64, mime }) {
    return new Promise((resolve, reject) => {
      let objectUrl = '';
      const cleanup = () => {
        audioEl.onended = null;
        audioEl.onerror = null;
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) { /* ignore */ }
          objectUrl = '';
        }
      };
      audioEl.onended = () => { cleanup(); resolve(); };
      audioEl.onerror = () => {
        cleanup();
        reject(new Error('音频播放失败'));
      };
      try {
        if (url) {
          audioEl.src = url;
        } else if (base64) {
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime || 'audio/mpeg' }));
          audioEl.src = objectUrl;
        } else {
          reject(new Error('没有可播放的音频'));
          return;
        }
        const p = audioEl.play();
        if (p && typeof p.then === 'function') p.catch(reject);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  }

  async function aliyunTts(text, cfg, audioEl) {
    const key = (cfg.voiceKey || cfg.key || '').trim();
    if (!key) throw new Error('请填写阿里云百炼 API Key（语音 Key，可与对话 Key 相同）');
    const model = (cfg.ttsModel || 'qwen3-tts-flash').trim();
    const voice = (cfg.ttsVoice || 'Cherry').trim();
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          text: String(text || '').slice(0, 600),
          voice,
          language_type: 'English',
        },
      }),
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      throw new Error('阿里 TTS 返回非 JSON：' + raw.slice(0, 160));
    }
    if (!res.ok || data.code) {
      throw new Error(data.message || data.code || ('HTTP ' + res.status));
    }
    const audio = (data.output && data.output.audio) || {};
    if (audio.url) return playUrlOrBase64(audioEl, { url: audio.url });
    if (audio.data) return playUrlOrBase64(audioEl, { base64: audio.data, mime: 'audio/wav' });
    throw new Error('阿里 TTS 未返回音频');
  }

  function extractAsrText(data) {
    if (!data) return '';
    if (typeof data.output === 'string') return data.output;
    if (data.output && typeof data.output.text === 'string') return data.output.text;
    const choices = data.output && data.output.choices;
    if (Array.isArray(choices) && choices[0]) {
      const msg = choices[0].message || choices[0];
      const content = msg.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content.map((c) => (typeof c === 'string' ? c : (c.text || c.transcript || ''))).join(' ').trim();
      }
      if (msg.text) return msg.text;
    }
    if (data.result && data.result.text) return data.result.text;
    if (data.text) return data.text;
    return '';
  }

  async function aliyunAsr(blob, cfg) {
    const key = (cfg.voiceKey || cfg.key || '').trim();
    if (!key) throw new Error('请填写阿里云百炼 API Key');
    const model = (cfg.asrModel || 'fun-asr-flash').trim();
    const dataUrl = await blobToDataUrl(blob);
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [{ audio: dataUrl }],
            },
          ],
        },
        parameters: {
          asr_options: {
            language: 'en',
            enable_itn: true,
          },
        },
      }),
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      throw new Error('阿里 ASR 返回非 JSON：' + raw.slice(0, 160));
    }
    if (!res.ok || (data.code && data.code !== 'Success')) {
      throw new Error(data.message || data.code || ('HTTP ' + res.status));
    }
    const text = extractAsrText(data).trim();
    if (!text) throw new Error('阿里 ASR 未识别出文本');
    return text;
  }

  async function volcTts(text, cfg, audioEl) {
    const appId = String(cfg.voiceAppId || '').trim();
    const token = String(cfg.voiceKey || cfg.voiceToken || '').trim();
    if (!appId || !token) throw new Error('火山语音需要 AppId + Access Token');
    const voice = (cfg.ttsVoice || 'en_female_sarah_mars_bigtts').trim();
    const cluster = (cfg.voiceCluster || 'volcano_tts').trim();
    const speed = Number(cfg.ttsRate);
    const body = {
      app: { appid: appId, token, cluster },
      user: { uid: 'meeting-coach' },
      audio: {
        voice_type: voice,
        encoding: 'mp3',
        speed_ratio: Number.isFinite(speed) ? Math.min(2, Math.max(0.5, speed)) : 1,
      },
      request: {
        reqid: uuid(),
        text: String(text || '').slice(0, 1000),
        operation: 'query',
      },
    };
    const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer;' + token,
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      throw new Error('火山 TTS 返回非 JSON（可能被 CORS 拦截）：' + raw.slice(0, 120));
    }
    if (!res.ok || (data.code !== undefined && Number(data.code) !== 3000 && Number(data.code) !== 0)) {
      throw new Error(data.message || ('火山 TTS 错误 ' + (data.code || res.status)));
    }
    const b64 = data.data || (data.audio && data.audio.data);
    if (!b64) throw new Error('火山 TTS 未返回音频');
    return playUrlOrBase64(audioEl, { base64: b64, mime: 'audio/mpeg' });
  }

  async function volcAsr(blob, cfg) {
    const appId = String(cfg.voiceAppId || '').trim();
    const token = String(cfg.voiceKey || cfg.voiceToken || '').trim();
    if (!appId || !token) throw new Error('火山语音需要 AppId + Access Token');
    const dataUrl = await blobToDataUrl(blob);
    const b64 = dataUrlToBase64(dataUrl);
    const res = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-App-Key': appId,
        'X-Api-Access-Key': token,
        'X-Api-Resource-Id': cfg.asrResourceId || 'volc.bigasr.auc_turbo',
        'X-Api-Request-Id': uuid(),
      },
      body: JSON.stringify({
        user: { uid: 'meeting-coach' },
        audio: { data: b64 },
        request: { model_name: 'bigmodel' },
      }),
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      throw new Error('火山 ASR 返回非 JSON（可能被 CORS 拦截）：' + raw.slice(0, 120));
    }
    if (!res.ok) throw new Error(data.message || ('HTTP ' + res.status));
    const text =
      (data.result && (data.result.text || data.result.utterances && data.result.utterances.map((u) => u.text).join(' '))) ||
      data.text ||
      extractAsrText(data);
    const out = String(text || '').trim();
    if (!out) throw new Error('火山 ASR 未识别出文本');
    return out;
  }

  async function synthesize(text, cfg, audioEl) {
    const engine = cfg.voiceEngine || 'browser';
    if (engine === 'aliyun') return aliyunTts(text, cfg, audioEl);
    if (engine === 'volc') return volcTts(text, cfg, audioEl);
    throw new Error('未知语音引擎');
  }

  async function transcribe(blob, cfg) {
    const engine = cfg.voiceEngine || 'browser';
    if (engine === 'aliyun') return aliyunAsr(blob, cfg);
    if (engine === 'volc') return volcAsr(blob, cfg);
    throw new Error('未知语音引擎');
  }

  function usesCloud(cfg) {
    const e = (cfg && cfg.voiceEngine) || 'browser';
    return e === 'aliyun' || e === 'volc';
  }

  global.VoiceCloud = {
    synthesize,
    transcribe,
    usesCloud,
    blobToDataUrl,
    playUrlOrBase64,
  };
})(window);
