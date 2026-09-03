/* =========================================================================
 * 英文口语陪练（多角色）
 * 纯前端静态应用：接 OpenAI 兼容接口的 LLM，扮演会打断追问的 AI 陪练。
 * 角色：产品经理 Dave / 面试官 / 客户 / 雅思口语考官。
 * 数据（设置 / 历史 / 收藏）都存在浏览器 localStorage。
 * ========================================================================= */

'use strict';

/* ----------------------------- 角色定义 ------------------------------ */
const PERSONAS = [
  {
    id: 'dave',
    label: 'Dave',
    icon: 'D',
    name: 'Dave · 产品经理',
    subtitle: '爱打断、会追问的 PM',
    focusDims: '打断时机 / 观点表达 / 反对妥协 / 澄清',
    promptBody: [
      'You are "Dave", a senior Product Manager who has worked at US tech companies for 12 years.',
      'You are in a 30-minute online meeting in English with the user (their engineer/collaborator).',
      'Your personality: direct, fast-talking, loves to interrupt, always pushes with "why" and "what if".',
      'Your ONLY job: push the user into a real meeting state where they must interject, push back, clarify, and compromise in English.',
      '',
      'Challenge moves:',
      '- Interrupt and challenge: every 3-5 user turns, cut them off with a new question, a new requirement, or an objection to force them to react.',
      '- Use phrases like: "Why do you think that?", "What if the deadline moves up to this Friday?", "That\'s not what the client asked for.", "Can you explain that in simpler terms?", "I don\'t buy it. Convince me."',
    ].join('\n'),
    scenarios: [
      {
        id: 'schedule',
        name: '排期冲突 · 提前交付',
        opening: "Alright, let's get started. Bad news first — the client just pulled the deadline forward. Talk to me: what's the impact?",
        desc: '客户突然要求提前交付',
      },
      {
        id: 'scope',
        name: '需求变更 · 临时加需求',
        opening: "Alright, quick one. The boss dropped a new requirement this morning. I need you to walk me through the impact before lunch.",
        desc: '老板临时加需求，评估影响',
      },
      {
        id: 'incident',
        name: '线上故障 · 产品出 bug',
        opening: "Alright, let's not waste time. Production's down and the client's on the line. What happened, and what are you doing about it?",
        desc: '产品出 bug，解释原因和方案',
      },
      {
        id: 'resource',
        name: '资源争夺 · 抢人力',
        opening: "Alright, I've got three projects and one engineer. You want them on yours? Convince me why yours wins.",
        desc: '多项目抢同一人力，争取',
      },
      {
        id: 'retro',
        name: '复盘会议 · 上周总结',
        opening: "Alright, walk me through last week. What did we ship, what slipped, and why should I care?",
        desc: '总结上周进度并回答质疑',
      },
    ],
  },

  {
    id: 'interviewer',
    label: 'Interviewer',
    icon: 'I',
    name: '面试官 · 英文面试',
    subtitle: '专业、追问细节的招聘官',
    focusDims: '具体细节(量化/STAR) / 观点表达 / 澄清 / 自信接招',
    promptBody: [
      'You are an interviewer at a US tech company running a real English job interview with the user (the candidate).',
      'Your style: professional, probing, a bit skeptical. You never let a vague answer slide — you push for specifics, numbers, and concrete examples (the STAR method).',
      'Your ONLY job: make the user defend their answers under pressure, so they get comfortable being questioned in a real interview.',
      '',
      'Challenge moves:',
      '- "That sounds impressive — but what exactly did YOU do?"',
      '- "Can you give me a concrete number or metric?"',
      '- "What would you do differently if you could redo that project?"',
      '- "Why should we hire you over someone with more experience?"',
      '- Interrupt politely to go deeper: "Sorry to cut you off — let me push on that point."',
    ].join('\n'),
    scenarios: [
      {
        id: 'self-intro',
        name: '自我介绍',
        opening: "Alright, thanks for joining. To start, tell me about yourself.",
        desc: '背景与经历概述',
      },
      {
        id: 'behavioral',
        name: '行为面试 · 冲突',
        opening: "Tell me about a time you had a conflict with a teammate. What happened, and what did you do?",
        desc: 'STAR 法讲冲突处理',
      },
      {
        id: 'project',
        name: '项目深挖',
        opening: "Walk me through the most impactful project on your resume. What was YOUR role, specifically?",
        desc: '深挖项目里的个人贡献',
      },
      {
        id: 'motivation',
        name: '跳槽动机',
        opening: "Why do you want to leave your current job — and why this company?",
        desc: '动机与匹配度',
      },
      {
        id: 'counter',
        name: '反问 / 薪资',
        opening: "We're almost done. Do you have any questions for me? And what are your salary expectations?",
        desc: '反问环节与薪资预期',
      },
    ],
  },

  {
    id: 'client',
    label: 'Client',
    icon: 'C',
    name: '客户 · 商务沟通',
    subtitle: '挑剔、催进度、砍价的甲方',
    focusDims: '妥协与承诺 / 观点表达 / 反对与坚持 / 澄清需求',
    promptBody: [
      'You are a client of a software agency/vendor, on a business call in English with the user (the vendor\'s account manager or engineer).',
      'Your style: demanding, price- and deadline-conscious, easily annoyed. You care about cost, timeline, and quality, and you push for concrete commitments.',
      'Your ONLY job: pressure the user to justify scope, cost, and delays, and get them to commit to concrete dates and numbers.',
      '',
      'Challenge moves:',
      '- "I\'m not happy with the progress — what am I paying for?"',
      '- "Can we get it sooner? What would it take to ship by Friday?"',
      '- "That\'s over budget. What can you cut?"',
      '- "This isn\'t what we agreed on."',
      '- "Give me a firm date. Don\'t tell me \'soon\'."',
    ].join('\n'),
    scenarios: [
      {
        id: 'deadline',
        name: '催促交付',
        opening: "I saw the demo. It's behind schedule. When exactly will it be ready — and why is it late?",
        desc: '客户催进度',
      },
      {
        id: 'budget',
        name: '预算谈判',
        opening: "Your new quote is 20% higher than last quarter. I'm not paying that. What can you do?",
        desc: '砍价与价格谈判',
      },
      {
        id: 'complaint',
        name: '质量投诉',
        opening: "The feature we got isn't what I asked for. This is a real problem. How are you going to fix it?",
        desc: '投诉交付质量',
      },
      {
        id: 'scope',
        name: '需求加码',
        opening: "We need to add two more pages before launch. Don't tell me it's impossible — tell me the impact and the new date.",
        desc: '临发布加需求',
      },
      {
        id: 'renewal',
        name: '续约谈判',
        opening: "Our contract is up next month. Give me one reason we shouldn't switch vendors.",
        desc: '争取续约',
      },
    ],
  },

  {
    id: 'ielts',
    label: 'Examiner',
    icon: 'E',
    name: '雅思口语考官',
    subtitle: '中立、正式、追问展开的考官',
    focusDims: '流利与连贯 / 词汇 / 语法准确度 / 拓展回答',
    promptBody: [
      'You are an IELTS Speaking examiner conducting a real IELTS Speaking test in English with the user (the candidate).',
      'Your style: neutral, polite, formal. You ask the questions exactly as an examiner would, and you push for longer, more developed answers.',
      'Your ONLY job: get the user to speak at length and fluently, and to handle follow-up questions naturally.',
      '',
      'Challenge moves:',
      '- "Why do you say that?"',
      '- "Can you give me a specific example?"',
      '- "Do you think that will change in the future?"',
      '- "Some people disagree with that. What would you say to them?"',
      '- "Let\'s move on." (switch topic once they have spoken enough)',
    ].join('\n'),
    scenarios: [
      {
        id: 'part1-home',
        name: 'Part 1 · 家乡日常',
        opening: "Let's begin. Where are you from, and what do you like most about living there?",
        desc: '日常问答',
      },
      {
        id: 'part1-work',
        name: 'Part 1 · 工作学习',
        opening: "Do you work or are you a student? And what do you enjoy most about it?",
        desc: '工作/学习话题',
      },
      {
        id: 'part2',
        name: 'Part 2 · 话题卡',
        opening: "Now I'm going to give you a topic. You have one minute to prepare. Talk about a skill you learned recently. You should say: what it is, how you learned it, why you learned it, and how you feel about it. You have one to two minutes.",
        desc: '2 分钟独白',
      },
      {
        id: 'part3',
        name: 'Part 3 · 抽象讨论',
        opening: "Let's discuss this further. Do you think adults learn new skills more easily than children? Why or why not?",
        desc: '深入讨论',
      },
    ],
  },

  {
    id: 'travel',
    label: 'Travel',
    icon: '✈',
    name: '旅行 · 实景口语',
    subtitle: '机场/海关/餐厅/酒店全场景',
    focusDims: '信息确认 / 数字与时间 / 礼貌表达 / 应急处理',
    promptBody: [
      'You play the other party in a real travel situation in English with the user (a B1 traveler).',
      'Switch identity and tone by the current scenario: airport check-in agent (Delta), customs officer, airline service desk (United), restaurant server, or hotel front desk.',
      'Airport/customs/airline staff: formal, polite, a bit brisk. Restaurant server: warm and casual. Hotel desk: professional and helpful.',
      'Your personality: polite, but you always chase details — names, numbers, times, bag counts, dates, room types, dietary needs. You occasionally create small problems (seat unavailable, bag overweight, wrong room type, delayed flight / gate change) so the user must confirm facts and state what they want.',
      'Your ONLY job: push the user to confirm information, numbers, times, and requests in clear American English at a normal speaking pace. Do not teach during the roleplay.',
      '',
      'Challenge moves:',
      '- "Could you confirm that for me?"',
      '- "How many bags are you checking?"',
      '- "Unfortunately, that seat is taken — window or aisle?"',
      '- "The flight is delayed by 40 minutes. What would you like to do?"',
      '- "I\'m sorry, we only have a twin room left tonight."',
      '- "Is there anything you can\'t eat?"',
    ].join('\n'),
    scenarios: [
      {
        id: 'checkin',
        name: '机场值机 · Check-in',
        opening: "Good morning! Welcome to Delta Air Lines. May I see your passport and ticket, please? Any bags to check today?",
        desc: '托运/护照/座位/登机牌',
      },
      {
        id: 'customs',
        name: '海关入境 · Customs',
        opening: "Good afternoon. What is the purpose of your visit, and how long will you be staying?",
        desc: '目的/时长/住宿',
      },
      {
        id: 'flight',
        name: '航班询问 · Flight Info',
        opening: "You've reached United Airlines service desk. How may I help you today?",
        desc: '登机口/延误/中转',
      },
      {
        id: 'restaurant',
        name: '餐厅点餐 · Ordering',
        opening: "Hi there, welcome to Blue Door Grill! Here's the menu. Can I start you off with something to drink?",
        desc: '菜单/忌口/结账',
      },
      {
        id: 'hotel',
        name: '酒店预订入住 · Hotel',
        opening: "Good evening, welcome to the Grandview Hotel. How can I help you today?",
        desc: '房型/日期/价格/设施',
      },
    ],
  },
];

/* ------------------------- 通用输出格式（拼接） ----------------------- */
function getIndustryPack() {
  const packs = typeof INDUSTRY_PACKS !== 'undefined' ? INDUSTRY_PACKS : {};
  return packs[config.industry] || packs.none || { id: 'none', label: '通用', jargon: [] };
}

function buildSystemPrompt(persona, scenarioName, scenarioDesc) {
  const pack = getIndustryPack();
  const jargonLines = (pack.jargon || []).slice(0, 6).map((j) => '- ' + j.en);
  const industryBlock = jargonLines.length
    ? [
        '',
        'Industry flavor (' + pack.label + '): you MAY naturally use some of these phrases when they fit, but do NOT force jargon into every reply:',
        ...jargonLines,
      ]
    : [];

  const strict = !!config.strict;
  const outputLine = strict
    ? '{"reply":"your short in-character English reply (1-3 sentences, spoken style)","correction":"① 你说的是：<the user\'s exact last English sentence>\\n② 更地道的是：<corrected natural spoken English>\\n③ 为什么：<one short line explaining the fix>","errors":["短中文标签1","短中文标签2"],"focus":"one short Chinese line on the single most important improvement this round among: ' + persona.focusDims + '"}'
    : '{"reply":"your short in-character English reply (1-3 sentences, spoken style)","correction":"① 你说的是：<the user\'s exact last English sentence>\\n② 更地道的是：<corrected natural spoken English>\\n③ 为什么：<one short line explaining the fix and a more natural phrasing>","focus":"one short Chinese line on the single most important improvement this round among: ' + persona.focusDims + '"}';

  const correctionRules = strict
    ? [
        'STRICT correction mode is ON:',
        '- Mark EVERY grammar / word-choice / tense / article / preposition problem you can find in the user\'s last message.',
        '- Put short Chinese error labels in "errors" (e.g. "主谓一致","介词","时态","冠词","用词不地道"). 1-5 items. If truly clean, use ["基本正确"] and still polish ②.',
        '- In ① quote the user\'s exact words; in ② give a fully natural spoken rewrite; in ③ explain the main fix in one Chinese line.',
        '- Keep "reply" strictly in character — never teach inside "reply".',
      ]
    : [
        'For "correction": quote the user\'s actual last English message as <原文>. If it was already fine, still pick the weakest part. Keep ② in natural spoken English and ③ to one line.',
        'Keep "reply" strictly in character — do not put teaching or correction inside "reply".',
      ];

  return [
    persona.promptBody,
    '',
    'Current scenario: ' + scenarioName + ' (' + scenarioDesc + ').',
    ...(function () {
      const lesson = session && session.lessonId ? getLessonById(session.lessonId) : (lessonState.active ? getActiveLesson() : null);
      if (!lesson) return [];
      const goals = (lesson.goals || []).slice(0, 4).map((g, i) => (i + 1) + ') ' + g);
      const chunks = (lesson.chunks || []).slice(0, 4).map((c) => '- ' + (c.example || c.en || ''));
      return [
        '',
        'Lesson goals for this meeting drill (nudge the user to practice these, without teaching in reply):',
        ...goals,
        'Target chunks to elicit when natural:',
        ...chunks,
      ];
    })(),
    ...industryBlock,
    '',
    'Rules:',
    '1. ALWAYS stay in character and speak English in the "reply" field. Use clear American English at a normal speaking pace. The user is B1 level.',
    '2. You only play the other party in this conversation. Do NOT teach and do NOT give answers during the roleplay.',
    '',
    'Output format — respond with ONLY a JSON object, no markdown fences, no extra text:',
    outputLine,
    '',
    ...correctionRules,
  ].join('\n');
}

/* ----------------------------- 存储工具 ------------------------------ */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  },
};

let lastStoreWarn = 0;
function notifyStoreFail() {
  const now = Date.now();
  if (now - lastStoreWarn < 4000) return;
  lastStoreWarn = now;
  addMessage('system', '⚠️ 本机存储已满或被禁用，这次改动只留在当前页面，刷新可能丢失。', null, null);
}

function persistOrWarn(key, val) {
  if (store.set(key, val)) return true;
  notifyStoreFail();
  return false;
}

const DEFAULT_CONFIG = {
  base: 'https://api.deepseek.com/v1',
  key: '',
  model: 'deepseek-chat',
  temp: 0.7,
  json: true,
  stream: true,
  handsfree: false,
  strict: false,
  threeSecond: false,
  deferCorrection: false,
  industry: 'none',
  ttsRate: 0.95,
  ttsPitch: 1,
  speakThenListen: true,
  asrContinuous: true,
  asrSilenceMs: 1400,
  asrInterim: true,
  voiceEngine: 'browser',
  voiceKey: '',
  voiceAppId: '',
  voiceCluster: 'volcano_tts',
  ttsVoice: 'Cherry',
  ttsModel: 'qwen3-tts-flash',
  asrModel: 'fun-asr-flash',
};

const MAX_TOKENS = 800;
const HISTORY_MSG_CAP = 40;
const HISTORY_TEXT_CAP = 1800;
const HISTORY_CORR_CAP = 800;

/* ------------------------------ 状态 -------------------------------- */
let config = { ...DEFAULT_CONFIG, ...store.get('dave_config', {}) };
if (!config.industry || (typeof INDUSTRY_PACKS !== 'undefined' && !INDUSTRY_PACKS[config.industry])) {
  config.industry = 'none';
}
let currentPersona = PERSONAS[0];
let session = null; // { id, persona, scenario, messages: [{role,text,correction?,focus?}] }
let phrases = sanitizePhraseList(store.get('dave_phrasebook', []));
let history = sanitizeHistoryList(store.get('dave_history', []));
let turnBusy = false;
let requestGen = 0;

const shadowState = {
  active: false,
  mode: 'shadow', // 'shadow' 跟读 | 'reflex' 语块反射 | 'pause' 半句暂停
  index: 0,
  lines: [],
  listening: false,
  answered: false,
  hits: 0,
  timerRaf: null,
  timerGen: 0,
};
let restoring = false;
let resayTarget = null; // recast 重说目标句
let coachTopicId = '';

/* ------------------------- 今日训练进度（本机） ---------------------- */
const PROGRESS_KEY = 'dave_progress';
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function loadProgress() {
  const raw = store.get(PROGRESS_KEY, null);
  const today = todayKey();
  if (raw && raw.date === today) {
    return {
      date: today,
      shadow: !!raw.shadow,
      reflex: !!raw.reflex,
      coach: !!raw.coach,
      lesson: !!raw.lesson,
      turns: Number(raw.turns) || 0,
      review: !!raw.review,
      streak: Number(raw.streak) || 0,
    };
  }
  // 跨天：昨天完成过 review 才延续 streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
  const streak = raw && raw.date === yKey && raw.review ? (Number(raw.streak) || 0) : 0;
  return { date: today, shadow: false, reflex: false, coach: false, lesson: false, turns: 0, review: false, streak };
}
let progress = loadProgress();
const PLAN_TURNS_GOAL = 5;

/* ------------------------- 弱项自动收集（本机） ---------------------- */
const WEAK_KEY = 'dave_weak_spots';
function loadWeakSpots() {
  const raw = store.get(WEAK_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map((w) => {
    if (!w || typeof w !== 'object') return null;
    const en = String(w.en || '').trim();
    if (!en) return null;
    return {
      en,
      zh: String(w.zh || ''),
      cue: String(w.cue || ''),
      source: String(w.source || ''),
      fails: Math.max(1, Number(w.fails) || 1),
      resolved: !!w.resolved,
      updatedAt: Number(w.updatedAt) || Date.now(),
    };
  }).filter(Boolean);
}
let weakSpots = loadWeakSpots();

function persistWeakSpots() {
  persistOrWarn(WEAK_KEY, weakSpots.slice(0, 80));
}

function upsertWeakSpot(en, meta) {
  const textEn = String(en || '').trim();
  if (!textEn || textEn.length < 4) return;
  const info = meta || {};
  const existing = weakSpots.find((w) => w.en.toLowerCase() === textEn.toLowerCase());
  if (existing) {
    existing.fails = (existing.fails || 1) + 1;
    existing.resolved = false;
    existing.updatedAt = Date.now();
    if (info.zh) existing.zh = info.zh;
    if (info.cue) existing.cue = info.cue;
    if (info.source) existing.source = info.source;
  } else {
    weakSpots.unshift({
      en: textEn,
      zh: info.zh || '',
      cue: info.cue || '',
      source: info.source || '',
      fails: 1,
      resolved: false,
      updatedAt: Date.now(),
    });
  }
  weakSpots = weakSpots.slice(0, 80);
  persistWeakSpots();
}

function resolveWeakSpot(en) {
  const textEn = String(en || '').trim().toLowerCase();
  if (!textEn) return;
  const existing = weakSpots.find((w) => w.en.toLowerCase() === textEn);
  if (!existing) return;
  existing.fails = Math.max(0, (existing.fails || 1) - 1);
  if (existing.fails <= 0) existing.resolved = true;
  existing.updatedAt = Date.now();
  persistWeakSpots();
}

function getOpenWeakSpots(limit) {
  const n = Number(limit) || 6;
  return weakSpots
    .filter((w) => !w.resolved && w.fails > 0)
    .sort((a, b) => (b.fails - a.fails) || (b.updatedAt - a.updatedAt))
    .slice(0, n);
}

/* ------------------------- 会议课卡状态 ---------------------------- */
const LESSON_STEPS = [
  { id: 'goals', label: 'Goals' },
  { id: 'warmup', label: 'Warm-up' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'practice', label: 'Practice' },
  { id: 'roleplay', label: 'Roleplay' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'further', label: 'Further' },
];
const lessonState = {
  active: false,
  lessonId: '',
  stepIndex: 0,
  returnAfterShadow: false,
  filterIndustry: 'all',
  filterLevel: 'all',
};

function getLessonById(id) {
  const list = typeof MEETING_LESSONS !== 'undefined' ? MEETING_LESSONS : [];
  return list.find((l) => l.id === id) || null;
}

function getActiveLesson() {
  return getLessonById(lessonState.lessonId);
}

function bumpProgress(key, value) {
  if (progress.date !== todayKey()) progress = loadProgress();
  if (key === 'turns') progress.turns = Math.max(progress.turns, Number(value) || 0);
  else progress[key] = true;
  if (key === 'review' && !progress._streakCounted) {
    progress.streak = (progress.streak || 0) + 1;
    progress._streakCounted = true;
  }
  store.set(PROGRESS_KEY, progress);
  renderTodayPlan();
}

function sanitizeHistoryItem(h) {
  if (!h || typeof h !== 'object') return null;
  const id = Number(h.id);
  if (!Number.isFinite(id)) return null;
  const ts = Number(h.ts);
  const countRaw = Number(h.count);
  const count = Number.isFinite(countRaw) && countRaw >= 0 ? Math.min(Math.floor(countRaw), 9999) : 0;
  const messages = Array.isArray(h.messages)
    ? h.messages.filter((m) => m && typeof m === 'object' && typeof m.role === 'string').map((m) => ({
        role: String(m.role),
        text: String(m.text == null ? '' : m.text),
        correction: m.correction ? String(m.correction) : '',
        focus: m.focus ? String(m.focus) : '',
        errors: Array.isArray(m.errors) ? m.errors.map((e) => String(e)).filter(Boolean).slice(0, 6) : [],
      }))
    : [];
  return {
    id,
    persona: String(h.persona || ''),
    personaLabel: String(h.personaLabel || ''),
    scenario: String(h.scenario || ''),
    scenarioName: String(h.scenarioName || ''),
    ts: Number.isFinite(ts) ? ts : id,
    count: messages.length || count,
    messages,
  };
}

function sanitizeHistoryList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeHistoryItem).filter(Boolean);
}

function sanitizePhraseItem(p) {
  if (!p || typeof p !== 'object') return null;
  const en = String(p.en == null ? '' : p.en).trim();
  if (!en) return null;
  const ts = Number(p.ts);
  const mastery = String(p.mastery || '');
  return {
    en,
    scenarioName: String(p.scenarioName == null ? '' : p.scenarioName),
    zh: String(p.zh == null ? '' : p.zh),
    cue: String(p.cue == null ? '' : p.cue),
    mastery: /^(active|cued|need)$/.test(mastery) ? mastery : '',
    ts: Number.isFinite(ts) ? ts : Date.now(),
  };
}

function sanitizePhraseList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizePhraseItem).filter(Boolean);
}

/* ----------------------------- DOM 引用 ------------------------------ */
const $ = (id) => document.getElementById(id);
const chatEl = $('chat');
const inputEl = $('input');
const personaSelect = $('persona-select');
const scenarioSelect = $('scenario-select');
const welcomeEl = $('welcome');

/* ---------------------------- 工具函数 ------------------------------ */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtTime(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function scrollToBottom() {
  chatEl.scrollTop = chatEl.scrollHeight;
}

/* ---------------------------- 角色 / 场景 ---------------------------- */
function renderPersonaOptions() {
  personaSelect.innerHTML = '';
  PERSONAS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.icon} ${p.name}`;
    personaSelect.appendChild(opt);
  });
  personaSelect.value = currentPersona.id;
}

function renderScenarioOptions() {
  scenarioSelect.innerHTML = '<option value="">— 选择场景 —</option>';
  currentPersona.scenarios.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${i + 1}. ${s.name}`;
    scenarioSelect.appendChild(opt);
  });
}

function renderWelcome() {
  welcomeEl.innerHTML =
    '<p class="welcome-title">Pick a lane. Say a number.</p>' +
    '<div class="welcome-actions">' +
    '<button type="button" class="btn btn-primary" id="btn-start-lesson">会议课 · 情景课卡</button>' +
    '<button type="button" class="btn btn-primary" id="btn-start-shadow">跟读 · 会议节奏</button>' +
    '<button type="button" class="btn btn-primary" id="btn-start-reflex">语块反射 · 3 秒</button>' +
    '<button type="button" class="btn btn-primary" id="btn-start-pause">半句暂停</button>' +
    '<button type="button" class="btn btn-primary" id="btn-start-coach">语块教练 · 15 分钟</button>' +
    '</div>' +
    '<div class="today-plan" id="today-plan"></div>' +
    '<div class="materials-browser" id="materials-browser"></div>' +
    '<p class="welcome-note">课卡闭环：Goals → Warm-up → Dialogue → Practice → Roleplay → Discussion / Further。弱项会自动进今日优先。</p>' +
    '<ul class="welcome-list"></ul>';
  const list = welcomeEl.querySelector('.welcome-list');
  currentPersona.scenarios.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${i + 1}.</strong> ${escapeHtml(s.name)} <span style="color:var(--muted);font-size:12px">— ${escapeHtml(s.desc)}</span>`;
    li.addEventListener('click', () => startSession(s.id));
    list.appendChild(li);
  });
  const lessonBtn = welcomeEl.querySelector('#btn-start-lesson');
  if (lessonBtn) lessonBtn.addEventListener('click', () => {
    const lessons = typeof MEETING_LESSONS !== 'undefined' ? MEETING_LESSONS : [];
    if (lessons[0]) startLesson(lessons[0].id);
  });
  const shadowBtn = welcomeEl.querySelector('#btn-start-shadow');
  if (shadowBtn) shadowBtn.addEventListener('click', () => startShadowing('shadow'));
  const reflexBtn = welcomeEl.querySelector('#btn-start-reflex');
  if (reflexBtn) reflexBtn.addEventListener('click', () => startShadowing('reflex'));
  const pauseBtn = welcomeEl.querySelector('#btn-start-pause');
  if (pauseBtn) pauseBtn.addEventListener('click', () => startShadowing('pause'));
  const coachBtn = welcomeEl.querySelector('#btn-start-coach');
  if (coachBtn) coachBtn.addEventListener('click', startCoachSession);
  renderTodayPlan();
  renderMaterialsBrowser();
}

function renderTodayPlan() {
  const el = $('today-plan');
  if (!el) return;
  if (progress.date !== todayKey()) progress = loadProgress();
  const steps = [
    { key: 'lesson', label: '会议课 1 节', done: progress.lesson, sub: '情景课卡', act: () => {
      const lessons = typeof MEETING_LESSONS !== 'undefined' ? MEETING_LESSONS : [];
      if (lessons[0]) startLesson(lessons[0].id);
    } },
    { key: 'shadow', label: '跟读 1 组', done: progress.shadow, sub: '约 1 分钟', act: () => startShadowing('shadow') },
    { key: 'reflex', label: '语块反射', done: progress.reflex, sub: '弱项优先', act: () => startShadowing('reflex') },
    { key: 'coach', label: '语块教练', done: progress.coach, sub: '15 分钟 / 3 块', act: () => startCoachSession() },
    { key: 'turns', label: '对练 ' + PLAN_TURNS_GOAL + ' 轮', done: progress.turns >= PLAN_TURNS_GOAL, sub: progress.turns + '/' + PLAN_TURNS_GOAL, act: () => startSession(scenarioSelect.value || currentPersona.scenarios[0].id) },
    { key: 'review', label: '复盘诊断', done: progress.review, sub: '提炼缺失语块', act: () => { if (session) endReview(); else startSession(scenarioSelect.value || currentPersona.scenarios[0].id); } },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  el.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'today-plan-head';
  head.innerHTML = '<strong>今日训练 ' + doneCount + '/' + steps.length + '</strong><span>连续 ' + (progress.streak || 0) + ' 天 · 课卡→提取→对练→回收</span>';
  el.appendChild(head);
  const row = document.createElement('div');
  row.className = 'today-steps';
  steps.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'today-step' + (s.done ? ' done' : '');
    b.innerHTML = '<span class="mark">' + (s.done ? '✓' : '○') + '</span><span>' + escapeHtml(s.label) + '</span><span class="sub">' + escapeHtml(s.sub) + '</span>';
    b.addEventListener('click', s.act);
    row.appendChild(b);
  });
  el.appendChild(row);
  renderWeakStrip(el);
}

function renderWeakStrip(parent) {
  const open = getOpenWeakSpots(4);
  if (!open.length || !parent) return;
  const strip = document.createElement('div');
  strip.className = 'weak-strip';
  strip.innerHTML = '<strong>弱项优先 · ' + open.length + ' 条待练</strong>';
  const ul = document.createElement('ul');
  open.forEach((w) => {
    const li = document.createElement('li');
    li.textContent = w.en + (w.source ? ' · ' + w.source : '') + ' ×' + w.fails;
    ul.appendChild(li);
  });
  strip.appendChild(ul);
  const actions = document.createElement('div');
  actions.className = 'weak-actions';
  const drill = document.createElement('button');
  drill.type = 'button';
  drill.className = 'btn btn-primary';
  drill.textContent = '用弱项做反射';
  drill.addEventListener('click', startWeakReflex);
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn btn-ghost';
  clear.textContent = '清理已解决';
  clear.addEventListener('click', () => {
    weakSpots = weakSpots.filter((w) => !w.resolved);
    persistWeakSpots();
    renderWelcome();
  });
  actions.appendChild(drill);
  actions.appendChild(clear);
  strip.appendChild(actions);
  parent.appendChild(strip);
}

function industryLabel(id) {
  const packs = typeof INDUSTRY_PACKS !== 'undefined' ? INDUSTRY_PACKS : {};
  if (packs[id] && packs[id].label) return packs[id].label;
  return id || '通用';
}

function filteredLessons() {
  const list = typeof MEETING_LESSONS !== 'undefined' ? MEETING_LESSONS : [];
  return list.filter((l) => {
    if (lessonState.filterIndustry !== 'all' && l.industry !== lessonState.filterIndustry) return false;
    if (lessonState.filterLevel !== 'all' && l.level !== lessonState.filterLevel) return false;
    return true;
  });
}

function renderMaterialsBrowser() {
  const el = $('materials-browser');
  if (!el) return;
  const lessons = typeof MEETING_LESSONS !== 'undefined' ? MEETING_LESSONS : [];
  const industries = Array.from(new Set(lessons.map((l) => l.industry).filter(Boolean)));
  const levels = Array.from(new Set(lessons.map((l) => l.level).filter(Boolean)));
  el.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'materials-head';
  head.innerHTML = '<strong>教材浏览 · 会议课卡</strong><span>' + filteredLessons().length + ' / ' + lessons.length + '</span>';
  el.appendChild(head);
  const filters = document.createElement('div');
  filters.className = 'materials-filters';
  const ind = document.createElement('select');
  ind.innerHTML = '<option value="all">行业：全部</option>' +
    industries.map((id) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(industryLabel(id)) + '</option>').join('');
  ind.value = lessonState.filterIndustry;
  ind.addEventListener('change', () => {
    lessonState.filterIndustry = ind.value;
    renderMaterialsBrowser();
  });
  const lvl = document.createElement('select');
  lvl.innerHTML = '<option value="all">难度：全部</option>' +
    levels.map((lv) => '<option value="' + escapeHtml(lv) + '">' + escapeHtml(lv) + '</option>').join('');
  lvl.value = lessonState.filterLevel;
  lvl.addEventListener('change', () => {
    lessonState.filterLevel = lvl.value;
    renderMaterialsBrowser();
  });
  filters.appendChild(ind);
  filters.appendChild(lvl);
  el.appendChild(filters);
  const list = document.createElement('div');
  list.className = 'materials-list';
  const shown = filteredLessons();
  shown.forEach((lesson) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'material-card';
    btn.innerHTML =
      '<span class="title">' + escapeHtml(lesson.title) + '</span>' +
      '<span class="meta">' + escapeHtml(industryLabel(lesson.industry)) + ' · ' + escapeHtml(lesson.level || '') +
      ' · ' + ((lesson.goals || []).length) + ' goals</span>';
    btn.addEventListener('click', () => startLesson(lesson.id));
    list.appendChild(btn);
  });
  if (!shown.length) {
    const empty = document.createElement('p');
    empty.className = 'welcome-note';
    empty.textContent = '没有匹配的课卡，换个筛选试试。';
    list.appendChild(empty);
  }
  el.appendChild(list);
}

function hideLessonChrome() {
  const panel = $('lesson-panel');
  if (panel) panel.classList.add('hidden');
  const rail = $('lesson-rail');
  if (rail) rail.classList.add('hidden');
}

function showLessonRail(label) {
  const rail = $('lesson-rail');
  if (!rail) return;
  rail.classList.remove('hidden');
  const lab = $('lesson-rail-label');
  if (lab) lab.textContent = label || '会议课进行中';
}

function startLesson(lessonId) {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    addMessage('system', '课卡未找到。', null, null);
    return;
  }
  exitShadowing({ silent: true });
  clearChallenge();
  pauseHandsfree();
  session = null;
  lessonState.active = true;
  lessonState.lessonId = lesson.id;
  lessonState.stepIndex = 0;
  lessonState.returnAfterShadow = false;
  resetChatView(false);
  welcomeEl.classList.add('hidden');
  if (chatEl) chatEl.classList.add('hidden');
  const panel = $('lesson-panel');
  if (panel) panel.classList.remove('hidden');
  const rail = $('lesson-rail');
  if (rail) rail.classList.add('hidden');
  $('lesson-title').textContent = lesson.title;
  $('lesson-sub').textContent = industryLabel(lesson.industry) + ' · ' + (lesson.level || '') + ' · Goals → Further';
  renderLesson();
}

function exitLesson(opts) {
  const was = lessonState.active;
  lessonState.active = false;
  lessonState.returnAfterShadow = false;
  lessonState.stepIndex = 0;
  hideLessonChrome();
  if (chatEl) chatEl.classList.remove('hidden');
  if (was && !(opts && opts.silent)) resetToWelcome();
}

function renderLessonSteps() {
  const el = $('lesson-steps');
  if (!el) return;
  el.innerHTML = '';
  LESSON_STEPS.forEach((step, idx) => {
    const pill = document.createElement('span');
    pill.className = 'lesson-step-pill' + (idx === lessonState.stepIndex ? ' active' : '') + (idx < lessonState.stepIndex ? ' done' : '');
    pill.textContent = (idx + 1) + '. ' + step.label;
    pill.setAttribute('role', 'listitem');
    el.appendChild(pill);
  });
}

function renderLesson() {
  const lesson = getActiveLesson();
  if (!lesson) return;
  renderLessonSteps();
  const body = $('lesson-body');
  const back = $('btn-lesson-back');
  const next = $('btn-lesson-next');
  if (back) back.disabled = lessonState.stepIndex <= 0;
  if (next) next.textContent = lessonState.stepIndex >= LESSON_STEPS.length - 1 ? '完成课卡' : '下一步';
  const step = LESSON_STEPS[lessonState.stepIndex];
  body.innerHTML = '';
  if (!step) return;

  if (step.id === 'goals') {
    body.innerHTML = '<h3>Learning Goals</h3><p>这节课练完，你应能在会议里用上这些表达。</p>';
    const ul = document.createElement('ul');
    ul.className = 'lesson-goal-list';
    (lesson.goals || []).forEach((g) => {
      const li = document.createElement('li');
      li.textContent = g;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  } else if (step.id === 'warmup') {
    body.innerHTML = '<h3>Warm-up · 语块</h3><p>先听例句，再跟说。点「练跟读」可整组练习。</p>';
    const list = document.createElement('div');
    list.className = 'lesson-chunk-list';
    (lesson.chunks || []).forEach((c) => {
      const card = document.createElement('div');
      card.className = 'lesson-chunk';
      card.innerHTML =
        '<div class="when">' + escapeHtml(c.when || '') + '</div>' +
        '<div class="en">' + escapeHtml(c.example || c.en || '') + '</div>' +
        '<div class="zh">' + escapeHtml(c.zh || '') + (c.en ? ' · 模板：' + escapeHtml(c.en) : '') + '</div>';
      const actions = document.createElement('div');
      actions.className = 'lesson-inline-actions';
      const hear = document.createElement('button');
      hear.type = 'button';
      hear.className = 'btn btn-ghost';
      hear.textContent = '听例句';
      hear.addEventListener('click', () => speak(c.example || c.en || ''));
      actions.appendChild(hear);
      card.appendChild(actions);
      list.appendChild(card);
    });
    body.appendChild(list);
    const actions = document.createElement('div');
    actions.className = 'lesson-inline-actions';
    const drill = document.createElement('button');
    drill.type = 'button';
    drill.className = 'btn btn-primary';
    drill.textContent = '练跟读（本组语块）';
    drill.addEventListener('click', () => startLessonPractice('shadow'));
    actions.appendChild(drill);
    body.appendChild(actions);
  } else if (step.id === 'dialogue') {
    body.innerHTML = '<h3>Model Dialogue</h3><p>先听整段示范，注意 You 的语块怎么接。</p>';
    const list = document.createElement('div');
    list.className = 'lesson-dialogue';
    (lesson.dialogue || []).forEach((line) => {
      const row = document.createElement('div');
      row.className = 'lesson-line';
      row.innerHTML = '<div class="role">' + escapeHtml(line.role || '') + '</div><div class="en">' + escapeHtml(line.en || '') + '</div>';
      list.appendChild(row);
    });
    body.appendChild(list);
    const actions = document.createElement('div');
    actions.className = 'lesson-inline-actions';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'btn btn-primary';
    play.textContent = '听整段对话';
    play.addEventListener('click', playLessonDialogue);
    const shadow = document.createElement('button');
    shadow.type = 'button';
    shadow.className = 'btn btn-ghost';
    shadow.textContent = '跟读 You 的句子';
    shadow.addEventListener('click', () => startLessonPractice('shadow-you'));
    actions.appendChild(play);
    actions.appendChild(shadow);
    body.appendChild(actions);
  } else if (step.id === 'practice') {
    body.innerHTML = '<h3>Practice</h3><p>用跟读或 3 秒反射把语块调出来，再进角色扮演。</p>';
    const actions = document.createElement('div');
    actions.className = 'lesson-inline-actions';
    const shadow = document.createElement('button');
    shadow.type = 'button';
    shadow.className = 'btn btn-primary';
    shadow.textContent = '跟读练习';
    shadow.addEventListener('click', () => startLessonPractice('shadow'));
    const reflex = document.createElement('button');
    reflex.type = 'button';
    reflex.className = 'btn btn-ghost';
    reflex.textContent = '语块反射';
    reflex.addEventListener('click', () => startLessonPractice('reflex'));
    actions.appendChild(shadow);
    actions.appendChild(reflex);
    body.appendChild(actions);
  } else if (step.id === 'roleplay') {
    body.innerHTML = '<h3>Roleplay</h3><p>用这节课的语块进入真实对练。练完点「下一环节」进入 Discussion。</p>';
    const actions = document.createElement('div');
    actions.className = 'lesson-inline-actions';
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn btn-primary';
    go.textContent = '开始角色扮演';
    go.addEventListener('click', startLessonRoleplay);
    actions.appendChild(go);
    body.appendChild(actions);
  } else if (step.id === 'discussion') {
    body.innerHTML = '<h3>Discussion</h3><p>围绕本课内容讨论（Engoo 风格）。可先听题，再口头/打字回答。</p>';
    renderQuestionList(body, lesson.discussion || [], 'discussion');
  } else if (step.id === 'further') {
    body.innerHTML = '<h3>Further Discussion</h3><p>迁移到你自己的真实工作场景。</p>';
    renderQuestionList(body, lesson.further || [], 'further');
  }
}

function renderQuestionList(body, questions, kind) {
  const ol = document.createElement('ol');
  ol.className = 'lesson-q-list';
  (questions || []).forEach((q, idx) => {
    const li = document.createElement('li');
    li.textContent = q;
    const actions = document.createElement('div');
    actions.className = 'lesson-inline-actions';
    const hear = document.createElement('button');
    hear.type = 'button';
    hear.className = 'btn btn-ghost';
    hear.textContent = '听题';
    hear.addEventListener('click', () => speak(q));
    const ans = document.createElement('button');
    ans.type = 'button';
    ans.className = 'btn btn-primary';
    ans.textContent = '开口答';
    ans.addEventListener('click', () => {
      speak(q).then(() => {
        if (!isRecording) startMic('lesson-' + kind + '-' + idx);
      });
    });
    actions.appendChild(hear);
    actions.appendChild(ans);
    li.appendChild(actions);
    ol.appendChild(li);
  });
  body.appendChild(ol);
}

async function playLessonDialogue() {
  const lesson = getActiveLesson();
  if (!lesson) return;
  for (const line of (lesson.dialogue || [])) {
    if (!lessonState.active) return;
    await speak((line.role ? line.role + '. ' : '') + (line.en || ''));
  }
}

function startLessonPractice(kind) {
  const lesson = getActiveLesson();
  if (!lesson) return;
  let lines = [];
  if (kind === 'shadow-you') {
    lines = (lesson.dialogue || [])
      .filter((l) => /you/i.test(l.role || ''))
      .map((l) => ({ en: l.en, zh: 'Model line · You' }));
  } else if (kind === 'reflex') {
    lines = (lesson.chunks || []).map((c) => ({
      zh: (c.when ? '【' + c.when + '】' : '') + (c.zh || ''),
      en: c.example || c.en,
      stem: String(c.en || c.example || '').replace(/\.\.\./g, ' '),
      variant: '',
    }));
  } else {
    lines = (lesson.chunks || []).map((c) => ({
      en: c.example || c.en,
      zh: (c.when ? '【' + c.when + '】' : '') + (c.zh || ''),
    }));
  }
  lines = lines.filter((l) => l.en);
  if (!lines.length) return;
  const panel = $('lesson-panel');
  if (panel) panel.classList.add('hidden');
  lessonState.returnAfterShadow = true;
  showLessonRail(lesson.title + ' · Practice');
  startShadowing(kind === 'reflex' ? 'reflex' : 'shadow');
  shadowState.lines = lines;
  shadowState.index = 0;
  shadowState.hits = 0;
  renderShadowLine();
}

function startLessonRoleplay() {
  const lesson = getActiveLesson();
  if (!lesson) return;
  const hint = lesson.personaHint || 'dave';
  const persona = PERSONAS.find((p) => p.id === hint) || currentPersona;
  currentPersona = persona;
  personaSelect.value = persona.id;
  $('brand-avatar').textContent = persona.icon;
  renderScenarioOptions();
  const scenarioId = lesson.roleplayScenarioId || (persona.scenarios[0] && persona.scenarios[0].id);
  const panel = $('lesson-panel');
  if (panel) panel.classList.add('hidden');
  if (chatEl) chatEl.classList.remove('hidden');
  showLessonRail(lesson.title + ' · Roleplay');
  startSession(scenarioId, { lessonId: lesson.id, lessonOpening: lesson.opening || '' });
}

function startWeakReflex() {
  const open = getOpenWeakSpots(8);
  if (!open.length) {
    addMessage('system', '当前没有待练弱项。', null, null);
    return;
  }
  startShadowing('reflex');
  shadowState.lines = open.map((w) => ({
    zh: (w.cue ? w.cue + ' · ' : '') + (w.zh || '调出这个自然表达'),
    en: w.en,
    stem: w.en,
    variant: '',
  }));
  shadowState.index = 0;
  shadowState.hits = 0;
  renderShadowLine();
}

function lessonNext() {
  if (!lessonState.active) return;
  if (lessonState.stepIndex >= LESSON_STEPS.length - 1) {
    bumpProgress('lesson');
    addMessage('system', '✅ 会议课卡完成：' + ((getActiveLesson() || {}).title || '') + '。弱项已记入今日优先。', null, null);
    exitLesson({ silent: true });
    resetToWelcome();
    return;
  }
  lessonState.stepIndex += 1;
  // if advancing into roleplay from practice while chat hidden, just render
  const panel = $('lesson-panel');
  if (panel) panel.classList.remove('hidden');
  if (chatEl) chatEl.classList.add('hidden');
  const rail = $('lesson-rail');
  if (rail) rail.classList.add('hidden');
  renderLesson();
}

function lessonBack() {
  if (!lessonState.active || lessonState.stepIndex <= 0) return;
  lessonState.stepIndex -= 1;
  const panel = $('lesson-panel');
  if (panel) panel.classList.remove('hidden');
  if (chatEl) chatEl.classList.add('hidden');
  const rail = $('lesson-rail');
  if (rail) rail.classList.add('hidden');
  renderLesson();
}

function resumeLessonFromRail() {
  if (!lessonState.active) return;
  exitShadowing({ silent: true });
  if (chatEl) chatEl.classList.add('hidden');
  const panel = $('lesson-panel');
  if (panel) panel.classList.remove('hidden');
  const rail = $('lesson-rail');
  if (rail) rail.classList.add('hidden');
  renderLesson();
}


/* ---------------------------- 会话管理 ------------------------------ */
function resetChatView(showWelcome) {
  chatEl.innerHTML = '';
  chatEl.appendChild(welcomeEl);
  welcomeEl.classList.toggle('hidden', !showWelcome);
}

function startSession(scenarioId, opts = {}) {
  if (!opts.continueTurn) {
    requestGen += 1;
    turnBusy = false;
  }
  exitShadowing({ silent: true });
  clearChallenge();
  pauseHandsfree();
  const s = currentPersona.scenarios.find((x) => x.id === scenarioId) || currentPersona.scenarios[0];
  const opening = opts.lessonOpening || s.opening;
  session = {
    id: Date.now(),
    persona: currentPersona.id,
    scenario: s.id,
    messages: [],
    lessonId: opts.lessonId || (lessonState.active ? lessonState.lessonId : ''),
  };
  scenarioSelect.value = s.id;
  resetChatView(false);
  addMessage('dave', opening, null, null);
  if (opts.deferListen) speak(opening);
  else speakThenMaybeListen(opening);
  inputEl.focus();
}

function resetToWelcome() {
  requestGen += 1;
  turnBusy = false;
  exitShadowing({ silent: true });
  clearChallenge();
  pauseHandsfree();
  session = null;
  resetChatView(true);
  renderWelcome();
  scenarioSelect.value = '';
  const scn = currentPersona.scenarios[0];
  if (scn) scenarioSelect.value = scn.id;
}

function addMessage(role, text, correction, focus, errors) {
  if (session) {
    session.messages.push({ role, text, correction, focus, errors });
  }
  renderMessage(role, text, correction, focus, errors);
  scrollToBottom();
}

function renderMessage(role, text, correction, focus, errors) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = role === 'user' ? 'You' : role === 'dave' ? currentPersona.label : '系统';
  wrap.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  if (role === 'dave') {
    const spk = document.createElement('button');
    spk.className = 'speak-btn';
    spk.textContent = '🔊';
    spk.title = '朗读';
    spk.addEventListener('click', () => speak(text));
    bubble.appendChild(spk);
  }
  wrap.appendChild(bubble);

  if (correction && !shouldDeferCorrection()) {
    wrap.appendChild(buildCorrectionCard(correction, focus, errors));
  }
  chatEl.appendChild(wrap);
}

function shouldDeferCorrection() {
  return !!config.deferCorrection && !restoring;
}

function normalizeErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((e) => String(e || '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

function buildCorrectionCard(correction, focus, errors) {
  const card = document.createElement('div');
  card.className = 'correction' + (config.strict ? ' strict' : '');

  const head = document.createElement('div');
  head.className = 'corr-head';
  head.innerHTML = config.strict ? '<span>📝 严格纠错</span>' : '<span>📝 纠错</span>';
  const star = document.createElement('button');
  star.className = 'star-btn';
  star.textContent = '☆';
  star.title = '收藏地道表达';
  star.addEventListener('click', () => {
    const better = extractBetter(correction);
    if (!better) return;
    const already = phrases.some((p) => p.en === better);
    const scn = currentPersona.scenarios.find((s) => s.id === session.scenario);
    if (already) {
      star.textContent = '☆';
      star.classList.remove('starred');
      phrases = phrases.filter((p) => p.en !== better);
    } else {
      star.textContent = '★';
      star.classList.add('starred');
      phrases.unshift({ en: better, scenarioName: scn ? scn.name : currentPersona.name, ts: Date.now() });
    }
    persistOrWarn('dave_phrasebook', phrases);
    renderPhrasebook();
    updateSpeakAllBtn();
  });
  head.appendChild(star);
  card.appendChild(head);

  const lines = String(correction).split('\n').map((l) => l.trim()).filter(Boolean);
  lines.forEach((line) => {
    const div = document.createElement('div');
    if (line.startsWith('①')) { div.className = 'line orig'; div.innerHTML = '<b>①</b> ' + escapeHtml(line.slice(1).replace(/^[：:]\s*/, '')); }
    else if (line.startsWith('②')) { div.className = 'line better'; div.innerHTML = '<b>②</b> ' + escapeHtml(line.slice(1).replace(/^[：:]\s*/, '')); }
    else if (line.startsWith('③')) { div.className = 'line why'; div.innerHTML = '<b>③</b> ' + escapeHtml(line.slice(1).replace(/^[：:]\s*/, '')); }
    else { div.className = 'line'; div.textContent = line; }
    card.appendChild(div);
  });

  const errs = normalizeErrors(errors);
  if (errs.length) {
    const chips = document.createElement('div');
    chips.className = 'error-chips';
    errs.forEach((label) => {
      const chip = document.createElement('span');
      chip.className = 'error-chip';
      chip.textContent = label;
      chips.appendChild(chip);
    });
    card.appendChild(chips);
  }

  if (focus) {
    const f = document.createElement('div');
    f.className = 'focus';
    f.textContent = '🎯 ' + focus;
    card.appendChild(f);
  }

  const better = extractBetter(correction);
  if (better) {
    upsertWeakSpot(better, { source: '纠错', cue: focus || '' });
    const actions = document.createElement('div');
    actions.className = 'corr-actions';
    const hear = document.createElement('button');
    hear.type = 'button';
    hear.textContent = '听自然版';
    hear.addEventListener('click', () => speak(better));
    const resay = document.createElement('button');
    resay.type = 'button';
    resay.className = 'primary';
    resay.textContent = '立刻重说';
    resay.title = 'Recast：听完后马上自己再说一遍';
    resay.addEventListener('click', () => startResayDrill(better));
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = '收进语块库';
    save.addEventListener('click', () => upsertPhrase(better, '纠错重说', '', '', 'cued'));
    actions.appendChild(hear);
    actions.appendChild(resay);
    actions.appendChild(save);
    card.appendChild(actions);
  }
  return card;
}

function extractBetter(correction) {
  const m = String(correction).match(/②[^：:]*[：:]\s*(.+)/);
  if (m) return m[1].trim();
  const line = String(correction).split('\n').find((l) => l.includes('②'));
  return line ? line.trim() : '';
}

/* ---------------------------- LLM 调用 ------------------------------ */
function friendlyApiError(status, errText) {
  const map = {
    401: 'API Key 无效/未授权',
    403: 'API Key 无效/未授权',
    404: '模型名或 Base URL 不对',
    429: '触发限流，稍后再试',
  };
  const hint = map[status];
  const extra = String(errText || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (hint) return extra ? `${hint}（HTTP ${status}）` : `${hint}（HTTP ${status}）`;
  return extra ? `API ${status}: ${extra}` : `API ${status}`;
}

function applyTokenLimit(body, model) {
  const name = String(model || '');
  if (/grok|gpt-5|^o[1-9]|o-mini|o3/i.test(name)) {
    body.max_completion_tokens = MAX_TOKENS;
  } else {
    body.max_tokens = MAX_TOKENS;
  }
}

function buildChatBody(messages, systemPrompt, cfg, opts, stream) {
  const body = {
    model: cfg.model,
    temperature: Number(cfg.temp ?? 0.7),
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  };
  applyTokenLimit(body, cfg.model);
  if (cfg.json && opts.json !== false) {
    body.response_format = { type: 'json_object' };
  }
  if (stream) body.stream = true;
  return body;
}

function extractPartialReply(raw) {
  const s = String(raw || '');
  const m = /"reply"\s*:\s*"/.exec(s);
  if (!m) return '';
  let i = m.index + m[0].length;
  let out = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '"') break;
    if (c === '\\') {
      if (i + 1 >= s.length) break;
      const n = s[i + 1];
      if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else if (n === 't') out += '\t';
      else if (n === '"') out += '"';
      else if (n === '\\') out += '\\';
      else if (n === '/') out += '/';
      else if (n === 'u' && i + 5 < s.length && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
        out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      } else break;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function pickChoiceContent(data) {
  const ch = data && data.choices && data.choices[0];
  if (!ch) return '';
  if (ch.delta && ch.delta.content) return ch.delta.content;
  if (ch.message && ch.message.content) return ch.message.content;
  return '';
}

function markHttpError(status, errText) {
  const err = new Error(friendlyApiError(status, errText));
  if (status === 401 || status === 403 || status === 404 || status === 429) {
    err.noFallback = true;
  }
  return err;
}

async function chatCompletionOnce(messages, systemPrompt, cfg, opts) {
  const base = (cfg.base || '').replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(buildChatBody(messages, systemPrompt, cfg, opts, false)),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw markHttpError(res.status, errText);
  }
  const data = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
}

function processSseLine(line, acc) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith(':')) return;
  if (!trimmed.startsWith('data:')) return;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return;
  try {
    const json = JSON.parse(payload);
    const piece = pickChoiceContent(json);
    if (piece) acc.full += piece;
  } catch (e) { /* 半包 JSON，丢给下一行 */ }
}

async function chatCompletionStream(messages, systemPrompt, cfg, opts) {
  const base = (cfg.base || '').replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(buildChatBody(messages, systemPrompt, cfg, opts, true)),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw markHttpError(res.status, errText);
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json') && !ct.includes('event-stream')) {
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
    if (!content) throw new Error('empty-stream');
    if (!isCompleteStreamPayload(content, opts, cfg)) throw new Error('truncated-stream');
    if (opts.onDelta) opts.onDelta(content, extractPartialReply(content) || content);
    return content;
  }
  if (!res.body || !res.body.getReader) {
    throw new Error('no-stream-body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const acc = { full: '' };
  const emit = () => {
    if (!opts.onDelta || !acc.full) return;
    const replyPart = extractPartialReply(acc.full);
    const shown = replyPart || (acc.full.indexOf('"reply"') === -1 ? acc.full : '');
    if (shown) opts.onDelta(acc.full, shown);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (let i = 0; i < lines.length; i++) processSseLine(lines[i], acc);
    emit();
  }
  buffer += decoder.decode();
  if (buffer.trim()) processSseLine(buffer, acc);
  if (!acc.full && buffer.trim().charAt(0) === '{') {
    try {
      const data = JSON.parse(buffer.trim());
      acc.full = pickChoiceContent(data) || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    } catch (e) { /* ignore */ }
  }
  emit();
  if (!acc.full) throw new Error('empty-stream');
  if (!isCompleteStreamPayload(acc.full, opts, cfg)) throw new Error('truncated-stream');
  return acc.full;
}

const MAX_COMPLETION_TRIES = 3;

async function chatCompletion(messages, systemPrompt, opts = {}) {
  const cfg = opts.config || config;
  const useStream = !!(opts.stream && typeof opts.onDelta === 'function');
  let lastErr = null;
  let tries = 0;

  if (useStream) {
    tries += 1;
    try {
      return await chatCompletionStream(messages, systemPrompt, cfg, opts);
    } catch (err) {
      if (err && err.noFallback) throw err;
      lastErr = err;
      if (opts.onStreamFallback) {
        try { opts.onStreamFallback(err); } catch (e) { /* ignore */ }
      }
    }
  }

  if (tries < MAX_COMPLETION_TRIES) {
    tries += 1;
    try {
      const raw = await chatCompletionOnce(messages, systemPrompt, cfg, opts);
      if (useStream && !isCompleteStreamPayload(raw, opts, cfg)) {
        throw new Error('invalid-json-once');
      }
      return raw;
    } catch (err) {
      if (err && err.noFallback) throw err;
      lastErr = err;
    }
  }

  if (tries < MAX_COMPLETION_TRIES && opts.json !== false && cfg.json) {
    tries += 1;
    return await chatCompletionOnce(messages, systemPrompt, cfg, { ...opts, json: false });
  }

  throw lastErr || new Error('调用失败');
}

function parseJson(text) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(t.slice(start, end + 1)); } catch (e2) { /* ignore */ }
    }
    return null;
  }
}

function isCompleteStreamPayload(raw, opts, cfg) {
  const text = String(raw || '').trim();
  if (!text) return false;
  const wantJson = opts.json !== false && (cfg || config).json;
  if (!wantJson) return true;
  const parsed = parseJson(text);
  return !!(parsed && typeof parsed.reply === 'string' && parsed.reply.trim());
}

function pickReplyFromRaw(raw) {
  const parsed = parseJson(raw);
  if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
    return {
      reply: parsed.reply,
      correction: parsed.correction ? String(parsed.correction) : '',
      focus: parsed.focus ? String(parsed.focus) : '',
      errors: normalizeErrors(parsed.errors),
    };
  }
  const text = String(raw || '').trim();
  if (!text) return null;
  if (text.charAt(0) === '{' && !parsed) return null;
  return { reply: text, correction: '', focus: '', errors: [] };
}

function buildApiMessages() {
  return (session ? session.messages : [])
    .filter((m) => m.role === 'user' || m.role === 'dave')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
}

function beginStreamingDave() {
  const wrap = document.createElement('div');
  wrap.className = 'msg dave streaming';
  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = currentPersona.label;
  wrap.appendChild(meta);
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const textNode = document.createElement('span');
  textNode.className = 'stream-text';
  bubble.appendChild(textNode);
  wrap.appendChild(bubble);
  chatEl.appendChild(wrap);
  scrollToBottom();
  return { wrap, bubble, textNode };
}

function updateStreamingDave(ui, text) {
  ui.textNode.textContent = text;
  scrollToBottom();
}

function finalizeStreamingDave(ui, reply, correction, focus, errors) {
  ui.wrap.classList.remove('streaming');
  ui.textNode.textContent = reply || '';
  if (!ui.bubble.querySelector('.speak-btn')) {
    const spk = document.createElement('button');
    spk.className = 'speak-btn';
    spk.textContent = '🔊';
    spk.title = '朗读';
    spk.addEventListener('click', () => speak(reply));
    ui.bubble.appendChild(spk);
  }
  if (correction && !shouldDeferCorrection()) {
    ui.wrap.appendChild(buildCorrectionCard(correction, focus, errors));
  }
  if (session) {
    session.messages.push({ role: 'dave', text: reply, correction, focus, errors });
  }
  scrollToBottom();
}

async function handleUserTurn() {
  const text = inputEl.value.trim();
  if (!text || turnBusy) return;
  if (shadowState.active) {
    inputEl.value = '';
    autoResize();
    handleShadowTranscript(text, '');
    return;
  }
  turnBusy = true;
  markChallengeOpened();
  clearChallenge();
  cancelHandsfreeListen();
  if (!session) {
    startSession(scenarioSelect.value || currentPersona.scenarios[0].id, { deferListen: true, continueTurn: true });
  }
  const gen = requestGen;
  inputEl.value = '';
  autoResize();

  addMessage('user', text);
  const typing = showTyping();
  let streamUi = null;

  const onDelta = (_full, shown) => {
    if (gen !== requestGen || !shown) return;
    if (typing.parentNode) typing.remove();
    if (!streamUi) streamUi = beginStreamingDave();
    updateStreamingDave(streamUi, shown);
  };

  try {
    const scenario = currentPersona.scenarios.find((s) => s.id === session.scenario) || currentPersona.scenarios[0];
    const sys = session.mode === 'coach'
      ? buildCoachSystemPrompt(session.coachTopic || '')
      : buildSystemPrompt(currentPersona, scenario.name, scenario.desc);
    const messages = buildApiMessages();
    const raw = await chatCompletion(messages, sys, {
      stream: !!config.stream,
      onDelta: config.stream ? onDelta : undefined,
    });
    if (gen !== requestGen) {
      if (streamUi && streamUi.wrap && streamUi.wrap.parentNode) streamUi.wrap.remove();
      if (typing.parentNode) typing.remove();
      return;
    }
    if (typing.parentNode) typing.remove();
    const picked = pickReplyFromRaw(raw);
    if (!picked) throw new Error('回复不完整或无法解析，请重试');
    const { reply, correction, focus, errors } = picked;

    if (streamUi) {
      finalizeStreamingDave(streamUi, reply, correction, focus, errors);
    } else {
      addMessage('dave', reply, correction, focus, errors);
    }
    turnBusy = false;
    if (session.mode === 'coach') {
      const userTurns = session.messages.filter((m) => m.role === 'user').length;
      if (userTurns >= 6 || /结束|复盘|done|wrap/i.test(text)) bumpProgress('coach');
    } else {
      bumpProgress('turns', session.messages.filter((m) => m.role === 'user').length);
    }
    await speakThenMaybeListen(reply);
  } catch (err) {
    if (gen !== requestGen) {
      if (streamUi && streamUi.wrap && streamUi.wrap.parentNode) streamUi.wrap.remove();
      if (typing.parentNode) typing.remove();
      return;
    }
    if (streamUi && streamUi.wrap && streamUi.wrap.parentNode) streamUi.wrap.remove();
    if (typing.parentNode) typing.remove();
    addMessage('system', '⚠️ 调用失败：' + err.message + '（请到「⚙ 设置」检查 Base URL / Key / 模型名，或关闭强制 JSON）', null, null);
  } finally {
    if (gen === requestGen) {
      turnBusy = false;
      saveHistory();
    }
  }
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'msg system';
  el.innerHTML = '<div class="bubble typing">对方正在想怎么追问你…</div>';
  chatEl.appendChild(el);
  scrollToBottom();
  return el;
}

/* ---------------------------- 结束复盘 ------------------------------ */
async function endReview() {
  if (turnBusy) {
    addMessage('system', '对方还在回复，请稍后再复盘。', null, null);
    return;
  }
  if (!session || session.messages.length === 0) {
    addMessage('system', '还没有对话，先练几轮再复盘。', null, null);
    return;
  }
  turnBusy = true;
  clearChallenge();
  const gen = requestGen;
  pauseHandsfree();
  const typing = showTyping();
  try {
    const transcript = session.messages
      .filter((m) => m.role === 'user' || m.role === 'dave')
      .map((m) => `${m.role === 'user' ? 'You' : currentPersona.label}: ${m.text}`)
      .join('\n');
    const deferredCards = session.messages.filter((m) => m.role === 'dave' && m.correction);
    const deferred = !!config.deferCorrection && deferredCards.length > 0;
    const corrNotes = deferred
      ? '\n\n逐轮纠错记录：\n' + deferredCards.map((m, i) => `#${i + 1}\n${m.correction}`).join('\n')
      : '';
    const sys = [
      '你是英语口语教练。根据下面这段英文口语练习对话，用中文写一段复盘。',
      '只输出一个 JSON：{"review":"..."}',
      'review 用三小段（可换行）：',
      '① 今日复盘：一句话概括今天练得怎么样（点出 1 个亮点 + 1 个问题）。',
      '② 明天重点：给 1-2 条具体可执行的练习建议。',
      deferred
        ? '③ 最该改的 3 个错误：从纠错记录里挑出最影响沟通的 3 个（合并同类），每条一行：错误 → 正确说法 → 一句中文原因。'
        : '③ 最该补的一个表达：给出一个英文表达 + 一句中文说明为什么重要、怎么用。',
      '直接给内容，不要寒暄。',
    ].join('\n');
    const raw = await chatCompletion(
      [{ role: 'user', content: '练习对话：\n' + transcript + corrNotes }],
      sys,
      { json: true }
    );
    if (gen !== requestGen) return;
    const parsed = parseJson(raw);
    const reviewText = parsed && parsed.review ? parsed.review : raw.trim();
    const card = document.createElement('div');
    card.className = 'msg system';
    const box = document.createElement('div');
    box.className = 'review-card';
    box.innerHTML = '<h3>📋 今日复盘 · 明天重点</h3>' + escapeHtml(reviewText).replace(/\n/g, '<br>');
    if (deferred) {
      const sum = document.createElement('div');
      sum.className = 'deferred-summary';
      sum.innerHTML = '<h4>本次对练的逐轮纠错（' + deferredCards.length + ' 条，点 ☆ 收藏进表达库）</h4>';
      deferredCards.forEach((m) => sum.appendChild(buildCorrectionCard(m.correction, m.focus, m.errors)));
      box.appendChild(sum);
    }
    const actions = document.createElement('div');
    actions.className = 'diagnose-actions';
    const diag = document.createElement('button');
    diag.type = 'button';
    diag.className = 'btn btn-primary';
    diag.textContent = '诊断提炼 3 个缺失语块';
    diag.addEventListener('click', () => diagnoseMissingChunks());
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'btn btn-ghost';
    pauseBtn.textContent = '半句暂停练搭配';
    pauseBtn.addEventListener('click', () => startShadowing('pause'));
    actions.appendChild(diag);
    actions.appendChild(pauseBtn);
    box.appendChild(actions);
    card.appendChild(box);
    chatEl.appendChild(card);
    bumpProgress('review');
    scrollToBottom();
  } catch (err) {
    if (gen !== requestGen) return;
    addMessage('system', '⚠️ 复盘失败：' + err.message, null, null);
  } finally {
    if (typing.parentNode) typing.remove();
    if (gen === requestGen) turnBusy = false;
  }
}

/* ---------------------------- 语音输出 ------------------------------ */
let cachedVoice = null;

function scoreVoice(voice) {
  const name = voice.name || '';
  const lang = voice.lang || '';
  let score = 0;
  if (/^en-US/i.test(lang)) score += 50;
  else if (/^en-GB/i.test(lang)) score += 35;
  else if (/^en/i.test(lang)) score += 20;
  if (/Google|Microsoft|Natural|Neural|Enhanced|Premium/i.test(name)) score += 30;
  if (/Samantha|Jenny|Aria|Guy|Davis|Brian|Emma|Olivia|Zira|Susan/i.test(name)) score += 18;
  if (/female|woman/i.test(name)) score += 6;
  if (/compact|eloquence|novelty|whisper/i.test(name)) score -= 25;
  if (voice.localService) score += 4;
  return score;
}

function pickVoice() {
  const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  if (!voices.length) return null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => { cachedVoice = pickVoice(); };
  cachedVoice = pickVoice();
}

let speakQueue = [];
let speakingAll = false;
let ttsGen = 0;
let ttsWatchdog = null;
let ttsActive = false;
let ttsBarrierTimer = null;
let currentSpeakPromise = null;

let cloudAudio = null;
let cloudAsrRecorder = null;
let cloudAsrChunks = [];
let cloudAsrStream = null;
let cloudAsrListening = false;
let cloudAsrMime = 'audio/webm';

function getCloudAudio() {
  if (!cloudAudio) {
    cloudAudio = new Audio();
    cloudAudio.preload = 'auto';
  }
  return cloudAudio;
}

function voiceEngine() {
  return (config.voiceEngine || 'browser').trim() || 'browser';
}

function usesCloudVoice() {
  return typeof VoiceCloud !== 'undefined' && VoiceCloud.usesCloud(config);
}

function stopCloudAudio() {
  if (!cloudAudio) return;
  try {
    cloudAudio.pause();
    cloudAudio.removeAttribute('src');
    cloudAudio.load();
  } catch (e) { /* ignore */ }
}

async function stopCloudAsr(finalize) {
  const rec = cloudAsrRecorder;
  cloudAsrListening = false;
  if (!rec) {
    if (cloudAsrStream) {
      cloudAsrStream.getTracks().forEach((t) => t.stop());
      cloudAsrStream = null;
    }
    return null;
  }
  return new Promise((resolve) => {
    const finish = () => {
      try { if (cloudAsrStream) cloudAsrStream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
      cloudAsrStream = null;
      cloudAsrRecorder = null;
      const type = cloudAsrMime || 'audio/webm';
      const blob = new Blob(cloudAsrChunks, { type });
      cloudAsrChunks = [];
      resolve(finalize ? blob : null);
    };
    rec.onstop = finish;
    try { rec.stop(); } catch (e) { finish(); }
  });
}


function clampRate(rate, fallback) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(1.35, Math.max(0.65, n));
}

function clampPitch(pitch) {
  const n = Number(pitch);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.25, Math.max(0.8, n));
}

function splitForTts(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  let parts = cleaned
    .split(/(?<=[.!?])\s+|(?<=;)\s+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1 && cleaned.length > 160) {
    parts = cleaned
      .split(/(?<=,)\s+|(?<=\s(?:and|but|so|because|which|that)\s)/i)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  // Merge tiny fragments so TTS doesn't chop every comma.
  const merged = [];
  parts.forEach((p) => {
    const prev = merged[merged.length - 1];
    if (prev && prev.length + p.length < 56 && (prev.length < 28 || p.length < 16)) {
      merged[merged.length - 1] = `${prev} ${p}`.trim();
    } else {
      merged.push(p);
    }
  });
  return merged.length ? merged : [cleaned];
}

function makeUtterance(text, opts) {
  const u = new SpeechSynthesisUtterance(text);
  const v = cachedVoice || pickVoice();
  u.lang = (v && v.lang) || 'en-US';
  if (v) u.voice = v;
  const baseRate = opts && opts.rate != null ? opts.rate : config.ttsRate;
  u.rate = clampRate(baseRate, 0.95);
  u.pitch = clampPitch(opts && opts.pitch != null ? opts.pitch : config.ttsPitch);
  return u;
}

function clearTtsBarrier() {
  if (ttsBarrierTimer) {
    clearTimeout(ttsBarrierTimer);
    ttsBarrierTimer = null;
  }
}

function stopTtsWatchdog() {
  if (ttsWatchdog) {
    clearInterval(ttsWatchdog);
    ttsWatchdog = null;
  }
}

function startTtsWatchdog() {
  stopTtsWatchdog();
  // Chrome 连续 TTS 可能卡住，定时 resume
  ttsWatchdog = setInterval(() => {
    if (!window.speechSynthesis) return;
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      try {
        speechSynthesis.pause();
        speechSynthesis.resume();
      } catch (e) { /* ignore */ }
    }
  }, 9000);
}

function updateSpeakAllBtn() {
  const btn = $('btn-speak-all');
  if (!btn) return;
  btn.disabled = !phrases.length && !speakingAll;
  btn.textContent = speakingAll ? '停止朗读' : '朗读全部';
}

function stopSpeakAll() {
  speakListenId += 1;
  cancelHandsfreeListen();
  ttsGen += 1;
  ttsActive = false;
  speakQueue = [];
  speakingAll = false;
  clearTtsBarrier();
  stopTtsWatchdog();
  stopCloudAudio();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  updateSpeakAllBtn();
}

function drainSpeakQueue(gen, opts) {
  if (gen !== ttsGen) return;
  if (!speakQueue.length) {
    speakingAll = false;
    stopTtsWatchdog();
    updateSpeakAllBtn();
    return;
  }
  const text = speakQueue.shift();
  try {
    const u = makeUtterance(text, opts);
    const gap = speakQueue.length ? 220 : 80;
    u.onend = () => { if (gen === ttsGen) setTimeout(() => drainSpeakQueue(gen, opts), gap); };
    u.onerror = () => { if (gen === ttsGen) setTimeout(() => drainSpeakQueue(gen, opts), gap); };
    speechSynthesis.speak(u);
  } catch (e) {
    if (gen === ttsGen) setTimeout(() => drainSpeakQueue(gen, opts), 220);
  }
}

function speakAllPhrases() {
  if (speakingAll) {
    stopSpeakAll();
    return;
  }
  if (!phrases.length) return;
  speakListenId += 1;
  cancelHandsfreeListen();
  speakingAll = true;
  updateSpeakAllBtn();

  if (usesCloudVoice()) {
    const list = phrases.map((p) => p.en).filter(Boolean);
    (async () => {
      try {
        for (const line of list) {
          if (!speakingAll) break;
          await speak(line, { rate: config.ttsRate });
          await new Promise((r) => setTimeout(r, 280));
        }
      } finally {
        speakingAll = false;
        updateSpeakAllBtn();
      }
    })();
    return;
  }

  if (!window.speechSynthesis) {
    speakingAll = false;
    updateSpeakAllBtn();
    return;
  }
  ttsGen += 1;
  ttsActive = false;
  const gen = ttsGen;
  speakQueue = phrases.map((p) => p.en).filter(Boolean);
  startTtsWatchdog();
  try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  setTimeout(() => drainSpeakQueue(gen, { rate: config.ttsRate }), 80);
}

function stopTTS() {
  ttsGen += 1;
  ttsActive = false;
  speakQueue = [];
  speakingAll = false;
  clearTtsBarrier();
  stopTtsWatchdog();
  updateSpeakAllBtn();
  stopCloudAudio();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

function isTtsPlaying() {
  if (ttsActive) return true;
  try {
    if (cloudAudio && !cloudAudio.paused && !cloudAudio.ended) return true;
  } catch (e) { /* ignore */ }
  try {
    return !!(window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending));
  } catch (e) {
    return false;
  }
}

function speakBrowser(text, opts) {
  const p = new Promise((resolve) => {
    let settled = false;
    let safety = null;
    let gen = ttsGen;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (safety) clearTimeout(safety);
      clearTtsBarrier();
      if (gen === ttsGen) ttsActive = false;
      resolve();
    };
    if (!text || !window.speechSynthesis) {
      finish();
      return;
    }
    ttsGen += 1;
    gen = ttsGen;
    ttsActive = true;
    speakingAll = false;
    clearTtsBarrier();
    stopTtsWatchdog();
    updateSpeakAllBtn();
    const chunks = splitForTts(text);
    speakQueue = chunks.slice();
    const est = chunks.reduce((n, c) => n + c.length, 0);
    safety = setTimeout(finish, Math.min(90000, 2800 + est * 75 + chunks.length * 300));
    startTtsWatchdog();
    try {
      speechSynthesis.cancel();
      setTimeout(() => {
        if (gen !== ttsGen) { finish(); return; }
        const drain = () => {
          if (gen !== ttsGen) { finish(); return; }
          if (!speakQueue.length) {
            // End barrier: synthesis often reports end a beat early; give ASR a clean gap.
            const barrier = config.speakThenListen === false ? 90 : 240;
            clearTtsBarrier();
            ttsBarrierTimer = setTimeout(() => {
              ttsBarrierTimer = null;
              finish();
            }, barrier);
            return;
          }
          const next = speakQueue.shift();
          try {
            const u = makeUtterance(next, opts);
            const gap = speakQueue.length ? 180 : 0;
            u.onend = () => {
              if (gen !== ttsGen) { finish(); return; }
              if (gap) setTimeout(drain, gap);
              else drain();
            };
            u.onerror = () => {
              if (gen !== ttsGen) { finish(); return; }
              setTimeout(drain, 120);
            };
            speechSynthesis.speak(u);
            setTimeout(() => {
              try {
                if (speechSynthesis.paused) speechSynthesis.resume();
              } catch (e) { /* ignore */ }
            }, 40);
          } catch (e) {
            setTimeout(drain, 120);
          }
        };
        drain();
      }, 60);
    } catch (e) { finish(); }
  });
  currentSpeakPromise = p;
  return p;
}

function speak(text, opts) {
  if (!text) return Promise.resolve();
  if (!usesCloudVoice()) return speakBrowser(text, opts);

  const p = new Promise(async (resolve) => {
    let settled = false;
    let gen = ttsGen;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTtsBarrier();
      if (gen === ttsGen) ttsActive = false;
      resolve();
    };
    ttsGen += 1;
    gen = ttsGen;
    ttsActive = true;
    speakingAll = false;
    clearTtsBarrier();
    stopTtsWatchdog();
    updateSpeakAllBtn();
    stopCloudAudio();
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }

    const chunks = splitForTts(text);
    const audio = getCloudAudio();
    const rate = clampRate((opts && opts.rate != null) ? opts.rate : config.ttsRate, 0.95);
    // Map UI rate (0.7–1.3) onto provider speed when supported.
    const cfg = { ...config, ttsRate: rate };

    try {
      for (const chunk of chunks) {
        if (gen !== ttsGen) break;
        await VoiceCloud.synthesize(chunk, cfg, audio);
        if (gen !== ttsGen) break;
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 160));
        }
      }
      if (gen === ttsGen) {
        const barrier = config.speakThenListen === false ? 90 : 240;
        clearTtsBarrier();
        ttsBarrierTimer = setTimeout(() => {
          ttsBarrierTimer = null;
          finish();
        }, barrier);
        return;
      }
      finish();
    } catch (err) {
      console.warn('cloud TTS failed, fallback browser', err);
      if (gen === ttsGen) {
        ttsActive = false;
        addMessage('system', '云端 TTS 失败，已回退浏览器朗读：' + (err && err.message ? err.message : err), null, null);
        speakBrowser(text, opts).then(finish);
        return;
      }
      finish();
    }
  });
  currentSpeakPromise = p;
  return p;
}



function waitForTtsThenListen() {
  const snapshot = ttsGen;
  const go = () => {
    if (ttsGen !== snapshot) return;
    if (!config.handsfree || turnBusy || isRecording) return;
    scheduleHandsfreeListen();
  };
  if (currentSpeakPromise && ttsActive) {
    currentSpeakPromise.then(go);
    return;
  }
  if (isTtsPlaying()) {
    const t = setInterval(() => {
      if (ttsGen !== snapshot) { clearInterval(t); return; }
      if (!isTtsPlaying()) { clearInterval(t); go(); }
    }, 200);
    return;
  }
  go();
}

let speakListenId = 0;
let handsfreeTimer = null;
let noSpeechRetries = 0;
let micSource = 'manual';
let lastRecError = '';

function cancelHandsfreeListen() {
  if (handsfreeTimer) {
    clearTimeout(handsfreeTimer);
    handsfreeTimer = null;
  }
}

function pauseHandsfree() {
  speakListenId += 1;
  cancelHandsfreeListen();
  clearAsrSilence();
  if (isRecording && recognition) {
    try { recognition.stop(); } catch (e) { /* ignore */ }
  }
}

function handsfreeGapMs() {
  if (config.speakThenListen === false) return 120;
  return 420;
}

function scheduleHandsfreeListen() {
  if (!config.handsfree || turnBusy) return;
  cancelHandsfreeListen();
  handsfreeTimer = setTimeout(() => {
    handsfreeTimer = null;
    if (!config.handsfree || turnBusy || isRecording) return;
    if (config.speakThenListen !== false && isTtsPlaying()) {
      waitForTtsThenListen();
      return;
    }
    startMic('handsfree');
  }, handsfreeGapMs());
}

async function speakThenMaybeListen(text) {
  const id = ++speakListenId;
  await speak(text);
  if (id !== speakListenId) return;
  if (shadowState.active) return;
  startChallengeCountdown();
  if (config.handsfree && !turnBusy && !isRecording) scheduleHandsfreeListen();
}

/* ---------------------------- 3 秒开口挑战 --------------------------- */
let challengeTimer = null;
let challengeRaf = null;
let challengeGen = 0;
let challengeOpened = false;

function clearChallenge() {
  challengeGen += 1;
  if (challengeTimer) {
    clearTimeout(challengeTimer);
    challengeTimer = null;
  }
  if (challengeRaf) {
    cancelAnimationFrame(challengeRaf);
    challengeRaf = null;
  }
  const bar = $('challenge-bar');
  if (bar) {
    bar.classList.add('hidden');
    bar.classList.remove('passed', 'missed');
  }
  challengeOpened = false;
}

function markChallengeOpened() {
  if (!config.threeSecond) return;
  if (!challengeOpened && $('challenge-bar') && !$('challenge-bar').classList.contains('hidden')) {
    challengeOpened = true;
    const bar = $('challenge-bar');
    bar.classList.remove('missed');
    bar.classList.add('passed');
    $('challenge-label').textContent = '开口成功';
    $('challenge-countdown').textContent = '✓';
    $('challenge-hint').textContent = '先说出来，再补完整句';
  }
}

function startChallengeCountdown() {
  if (!config.threeSecond || turnBusy || shadowState.active) return;
  clearChallenge();
  const bar = $('challenge-bar');
  if (!bar) return;
  const gen = challengeGen;
  const started = performance.now();
  const duration = 3000;
  challengeOpened = false;
  bar.classList.remove('hidden', 'passed', 'missed');
  $('challenge-label').textContent = '3 秒开口';
  $('challenge-countdown').textContent = '3.0';
  $('challenge-hint').textContent = '先开口，哪怕只说 Yes / I think...';

  const tick = (now) => {
    if (gen !== challengeGen) return;
    if (challengeOpened) return;
    const left = Math.max(0, duration - (now - started));
    $('challenge-countdown').textContent = (left / 1000).toFixed(1);
    if (left <= 0) {
      bar.classList.add('missed');
      $('challenge-label').textContent = '超时';
      $('challenge-countdown').textContent = '0.0';
      $('challenge-hint').textContent = '下次先蹦一个词，再补完整句';
      addMessage('system', '⏱ 3 秒开口超时。下次先说 Yes / No / I think...，再说完整句。', null, null);
      challengeTimer = setTimeout(() => {
        if (gen === challengeGen) clearChallenge();
      }, 2200);
      return;
    }
    challengeRaf = requestAnimationFrame(tick);
  };
  challengeRaf = requestAnimationFrame(tick);
}

function updateMicStatus(extra) {
  const el = $('mic-status');
  const btn = $('btn-mic');
  if (btn) btn.classList.toggle('handsfree-on', !!config.handsfree);
  if (!el) return;
  const engine = voiceEngine();
  const tag = engine === 'aliyun' ? '阿里云' : (engine === 'volc' ? '火山' : '浏览器');
  if (extra) {
    el.textContent = '[' + tag + '] ' + extra;
    return;
  }
  if (config.handsfree) {
    el.textContent = (isRecording || cloudAsrListening)
      ? '[' + tag + '] 免提中 · 正在听你说…'
      : '[' + tag + '] 免提已开 · 对方说完会自动听你说';
  } else {
    el.textContent = '[' + tag + '] 点击 🎤 开始说话（需要 localhost 或 HTTPS）';
  }
}

/* ---------------------------- 语音输入 ------------------------------ */
let recognition = null;
let isRecording = false;
let asrFinalParts = [];
let asrInterimText = '';
let asrSilenceTimer = null;
let asrSessionId = 0;
let asrHandled = false;
let asrHadSpeech = false;

function clearAsrSilence() {
  if (asrSilenceTimer) {
    clearTimeout(asrSilenceTimer);
    asrSilenceTimer = null;
  }
}

function cleanupTranscript(text) {
  return String(text || '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([({\[])\s+/g, '$1')
    .replace(/\s+([)}\]])/g, '$1')
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    .trim();
}

function currentAsrText() {
  const finals = asrFinalParts.join(' ').trim();
  const interim = asrInterimText.trim();
  return cleanupTranscript([finals, interim].filter(Boolean).join(' '));
}

function syncAsrInput() {
  if (!inputEl) return;
  inputEl.value = currentAsrText();
  autoResize();
}

function asrSilenceMs() {
  const n = Number(config.asrSilenceMs);
  let base = Number.isFinite(n) ? n : 1400;
  base = Math.min(3200, Math.max(700, base));
  // 跟读 / 重说通常更短，收尾更快。
  if (micSource === 'shadow' || micSource === 'resay') return Math.min(base, 1100);
  return base;
}

function armAsrSilence(session) {
  clearAsrSilence();
  if (!config.asrContinuous) return;
  asrSilenceTimer = setTimeout(() => {
    asrSilenceTimer = null;
    if (session !== asrSessionId || !isRecording || !recognition) return;
    try { recognition.stop(); } catch (e) { /* ignore */ }
  }, asrSilenceMs());
}

function resetAsrBuffer() {
  asrFinalParts = [];
  asrInterimText = '';
  asrHadSpeech = false;
  asrHandled = false;
  clearAsrSilence();
}

function finishAsrTurn(spoken, err) {
  if (asrHandled) return;
  asrHandled = true;
  clearAsrSilence();
  const text = cleanupTranscript(spoken);
  if (inputEl && text) {
    inputEl.value = text;
    autoResize();
  }

  if (err === 'aborted' || err === 'not-allowed') {
    shadowState.listening = false;
    return;
  }
  if (shadowState.active && micSource === 'shadow') {
    shadowState.listening = false;
    handleShadowTranscript(text, err);
    return;
  }
  if (micSource === 'resay') {
    handleResayTranscript(text || '');
    return;
  }
  if (text) {
    noSpeechRetries = 0;
    if (!turnBusy) handleUserTurn();
    return;
  }
  if (config.handsfree && micSource === 'handsfree') {
    if (noSpeechRetries < 1) {
      noSpeechRetries += 1;
      addMessage('system', '没听清，再说一次…', null, null);
      scheduleHandsfreeListen();
    } else {
      noSpeechRetries = 0;
      addMessage('system', '免提：没听到说话，已暂停监听。点 🎤 继续。', null, null);
      updateMicStatus();
    }
  }
}

function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = config.asrInterim !== false;
  r.continuous = !!config.asrContinuous;
  r.maxAlternatives = 3;

  r.onspeechstart = () => {
    asrHadSpeech = true;
    if (shadowState.active && shadowState.mode === 'reflex') markReflexOpened();
    // Barge-in: user started talking while TTS might still be draining.
    if (config.speakThenListen === false && isTtsPlaying()) stopTTS();
  };

  r.onresult = (e) => {
    const session = asrSessionId;
    let bestFinal = '';
    let bestConf = -1;
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const top = result[0];
      if (!top) continue;
      if (result.isFinal) {
        // Prefer higher-confidence alternative when browser provides it.
        let pick = top;
        for (let a = 0; a < result.length; a++) {
          const alt = result[a];
          const conf = typeof alt.confidence === 'number' ? alt.confidence : 0;
          if (!pick || conf > (typeof pick.confidence === 'number' ? pick.confidence : -1)) pick = alt;
        }
        const conf = typeof pick.confidence === 'number' ? pick.confidence : 0.5;
        // Drop extremely low-confidence finals that are often echo/noise.
        if (conf < 0.18 && String(pick.transcript || '').trim().split(/\s+/).length <= 2) continue;
        asrFinalParts.push(String(pick.transcript || ''));
        if (conf > bestConf) {
          bestConf = conf;
          bestFinal = String(pick.transcript || '');
        }
        asrInterimText = '';
        asrHadSpeech = true;
      } else {
        interim += String(top.transcript || '');
      }
    }
    if (interim) {
      asrInterimText = interim;
      asrHadSpeech = true;
    }
    syncAsrInput();
    if (session === asrSessionId && (bestFinal || interim)) armAsrSilence(session);
  };

  r.onend = () => {
    const spoken = currentAsrText();
    isRecording = false;
    $('btn-mic').classList.remove('recording');
    updateMicStatus();
    const err = lastRecError;
    lastRecError = '';
    finishAsrTurn(spoken, err);
  };

  r.onerror = (e) => {
    lastRecError = e.error || '';
    if (e.error === 'no-speech' && config.asrContinuous && asrHadSpeech && currentAsrText()) {
      // Treat trailing silence as end-of-utterance, not a hard failure.
      lastRecError = '';
      try { r.stop(); } catch (err) { /* ignore */ }
      return;
    }
    isRecording = false;
    clearAsrSilence();
    $('btn-mic').classList.remove('recording');
    updateMicStatus();
    if (e.error === 'not-allowed') {
      addMessage('system', '麦克风被拒绝。请在浏览器地址栏允许麦克风权限，并确认通过 localhost 或 HTTPS 访问。', null, null);
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      addMessage('system', '语音识别出错：' + e.error, null, null);
    }
  };
  return r;
}

function invalidateRecognition() {
  clearAsrSilence();
  if (isRecording && recognition) {
    try { recognition.stop(); } catch (e) { /* ignore */ }
  }
  recognition = null;
  isRecording = false;
  const btn = $('btn-mic');
  if (btn) btn.classList.remove('recording');
}

function startMic(source) {
  if (shadowState.active && source !== 'shadow') {
    addMessage('system', '正在跟读模式，请用跟读面板里的麦克风。', null, null);
    return;
  }
  if (turnBusy && source !== 'shadow') {
    if (source !== 'handsfree') {
      addMessage('system', '对方还在回复，请稍后再说。', null, null);
    }
    return;
  }
  if (source !== 'shadow') markChallengeOpened();
  speakListenId += 1;
  cancelHandsfreeListen();

  // 说完再听：免提不打断 TTS；手动点麦仍可抢麦。
  if (source === 'handsfree' && config.speakThenListen !== false && isTtsPlaying()) {
    waitForTtsThenListen();
    return;
  }
  stopTTS();

  if (usesCloudVoice()) {
    startCloudMic(source || 'manual');
    return;
  }

  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    addMessage('system', '当前浏览器不支持语音识别（Web Speech API），请用 Chrome / Edge，并走 localhost 或 HTTPS。', null, null);
    return;
  }
  if (!recognition) recognition = setupRecognition();
  if (isRecording) return;
  micSource = source || 'manual';
  asrSessionId += 1;
  resetAsrBuffer();
  isRecording = true;
  $('btn-mic').classList.add('recording');
  updateMicStatus();
  try {
    recognition.start();
  } catch (e) {
    try {
      recognition = setupRecognition();
      recognition.start();
    } catch (err) {
      isRecording = false;
      $('btn-mic').classList.remove('recording');
      updateMicStatus();
    }
  }
}

async function startCloudMic(source) {
  if (isRecording || cloudAsrListening) return;
  micSource = source || 'manual';
  asrSessionId += 1;
  resetAsrBuffer();
  cloudAsrChunks = [];
  try {
    cloudAsrStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (e) {
    addMessage('system', '无法打开麦克风：' + (e && e.message ? e.message : e), null, null);
    return;
  }
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
  cloudAsrMime = mime || 'audio/webm';
  try {
    cloudAsrRecorder = mime ? new MediaRecorder(cloudAsrStream, { mimeType: mime }) : new MediaRecorder(cloudAsrStream);
  } catch (e) {
    cloudAsrStream.getTracks().forEach((t) => t.stop());
    cloudAsrStream = null;
    addMessage('system', '当前浏览器无法录音（MediaRecorder）：' + (e && e.message ? e.message : e), null, null);
    return;
  }
  cloudAsrRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size) cloudAsrChunks.push(ev.data);
  };
  cloudAsrListening = true;
  isRecording = true;
  $('btn-mic').classList.add('recording');
  updateMicStatus();
  cloudAsrRecorder.start(250);
  // Auto-stop after silence window + hard cap so handsfree can finish a turn.
  const session = asrSessionId;
  const maxMs = Math.max(8000, asrSilenceMs() * 6);
  setTimeout(() => {
    if (session === asrSessionId && cloudAsrListening) stopCloudMicAndTranscribe();
  }, maxMs);
}

async function stopCloudMicAndTranscribe() {
  if (!cloudAsrListening && !cloudAsrRecorder) return;
  const session = asrSessionId;
  const blob = await stopCloudAsr(true);
  isRecording = false;
  $('btn-mic').classList.remove('recording');
  updateMicStatus();
  if (session !== asrSessionId) return;
  if (!blob || blob.size < 800) {
    finishAsrTurn('', 'no-speech');
    return;
  }
  try {
    updateMicStatus('识别中…');
    const text = await VoiceCloud.transcribe(blob, config);
    if (session !== asrSessionId) return;
    if (inputEl && text) {
      inputEl.value = text;
      if (typeof autoResize === 'function') autoResize();
    }
    finishAsrTurn(text || '', '');
  } catch (err) {
    console.warn('cloud ASR failed', err);
    addMessage('system', '云端 ASR 失败：' + (err && err.message ? err.message : err) + '。可改回「浏览器」引擎，或检查 Key / CORS。', null, null);
    finishAsrTurn('', 'network');
  }
}


function toggleMic() {
  if (isRecording || cloudAsrListening) {
    speakListenId += 1;
    cancelHandsfreeListen();
    clearAsrSilence();
    if (usesCloudVoice() && (cloudAsrListening || cloudAsrRecorder)) {
      stopCloudMicAndTranscribe();
      return;
    }
    recognition && recognition.stop();
    return;
  }
  if (turnBusy) {
    addMessage('system', '对方还在回复，请稍后再说。', null, null);
    return;
  }
  startMic('manual');
}

/* ---------------------------- 历史 & 收藏 ---------------------------- */
function compactMessages(messages) {
  return (messages || []).slice(-HISTORY_MSG_CAP).map((m) => ({
    role: m.role,
    text: String(m.text || '').slice(0, HISTORY_TEXT_CAP),
    correction: m.correction ? String(m.correction).slice(0, HISTORY_CORR_CAP) : (m.correction || ''),
    focus: m.focus ? String(m.focus).slice(0, 200) : (m.focus || ''),
    errors: Array.isArray(m.errors) ? m.errors.map((e) => String(e)).filter(Boolean).slice(0, 6) : [],
  }));
}

function persistHistorySafe() {
  if (store.set('dave_history', history)) return true;
  const shrunk = history.map((h, i) => ({
    ...h,
    messages: Array.isArray(h.messages) ? h.messages.slice(i < 8 ? -20 : -6) : h.messages,
  }));
  if (store.set('dave_history', shrunk)) {
    history = shrunk;
    return true;
  }
  const slim = history.slice(0, 20).map((h, i) => (
    i < 5
      ? h
      : {
          id: h.id,
          persona: h.persona,
          personaLabel: h.personaLabel,
          scenario: h.scenario,
          scenarioName: h.scenarioName,
          ts: h.ts,
          count: h.count,
        }
  ));
  if (store.set('dave_history', slim)) {
    history = slim;
    return true;
  }
  notifyStoreFail();
  return false;
}

function saveHistory() {
  if (!session || session.messages.length === 0) return;
  const scn = currentPersona.scenarios.find((s) => s.id === session.scenario);
  const snap = {
    id: session.id,
    persona: currentPersona.id,
    personaLabel: currentPersona.label,
    scenario: session.scenario,
    scenarioName: scn ? scn.name : '',
    ts: session.id,
    count: session.messages.length,
    messages: compactMessages(session.messages),
  };
  history = history.filter((h) => h.id !== snap.id);
  history.unshift(snap);
  if (history.length > 50) history = history.slice(0, 50);
  persistHistorySafe();
  renderHistory();
}

function restoreSession(h) {
  const snap = sanitizeHistoryItem(h);
  if (!snap) return;
  h = snap;
  requestGen += 1;
  turnBusy = false;
  pauseHandsfree();
  const p = PERSONAS.find((x) => x.id === h.persona) || PERSONAS[0];
  currentPersona = p;
  personaSelect.value = p.id;
  $('brand-avatar').textContent = p.icon;
  renderScenarioOptions();
  scenarioSelect.value = h.scenario || '';

  const messages = Array.isArray(h.messages) ? h.messages : [];
  if (!messages.length) {
    startSession(h.scenario);
    return;
  }

  session = {
    id: h.id,
    persona: p.id,
    scenario: h.scenario,
    messages: [],
  };
  resetChatView(false);
  restoring = true;
  messages.forEach((m) => {
    session.messages.push({
      role: m.role,
      text: m.text,
      correction: m.correction,
      focus: m.focus,
      errors: m.errors,
    });
    renderMessage(m.role, m.text, m.correction, m.focus, m.errors);
  });
  restoring = false;
  scrollToBottom();
  inputEl.focus();
}

function renderPhrasebook() {
  const el = $('phrasebook-list');
  updateSpeakAllBtn();
  if (!phrases.length) { el.innerHTML = '<div class="empty">还没有收藏。点纠错卡片的 ☆ 收藏地道表达。</div>'; return; }
  el.innerHTML = '';
  phrases.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'phrase-card';
    const masteryLabel = p.mastery === 'active' ? '主动调用' : (p.mastery === 'cued' ? '需提示' : (p.mastery === 'need' ? '仍需复习' : ''));
    card.innerHTML = '<div class="en">' + escapeHtml(p.en) +
      (masteryLabel ? '<span class="mastery-chip ' + p.mastery + '">' + masteryLabel + '</span>' : '') +
      '</div>';
    if (p.zh || p.cue) {
      const zh = document.createElement('div');
      zh.className = 'zh';
      zh.textContent = p.cue || p.zh;
      card.appendChild(zh);
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = '<span>' + escapeHtml(p.scenarioName || '') + '</span>';
    const actions = document.createElement('span');
    const spk = document.createElement('button');
    spk.className = 'speak'; spk.textContent = '🔊'; spk.title = '朗读';
    spk.addEventListener('click', () => speak(p.en));
    const cycle = document.createElement('button');
    cycle.className = 'speak'; cycle.textContent = '掌握度'; cycle.title = '切换：仍需复习 → 需提示 → 主动调用';
    cycle.addEventListener('click', () => {
      const order = ['need', 'cued', 'active', ''];
      const i = Math.max(0, order.indexOf(p.mastery || ''));
      setPhraseMastery(p.en, order[(i + 1) % order.length]);
    });
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '删除';
    del.addEventListener('click', () => {
      phrases.splice(idx, 1);
      persistOrWarn('dave_phrasebook', phrases);
      renderPhrasebook();
      updateSpeakAllBtn();
    });
    actions.appendChild(spk); actions.appendChild(cycle); actions.appendChild(del);
    meta.appendChild(actions);
    card.appendChild(meta);
    el.appendChild(card);
  });
}

function renderHistory() {
  const el = $('history-list');
  if (!history.length) { el.innerHTML = '<div class="empty">暂无历史记录。</div>'; return; }
  el.innerHTML = '';
  history.forEach((raw, idx) => {
    const h = sanitizeHistoryItem(raw);
    if (!h) return;
    const card = document.createElement('div');
    card.className = 'history-card';
    const title = document.createElement('div');
    title.className = 'h-title';
    title.textContent = (h.personaLabel || '') + ' · ' + (h.scenarioName || '');
    const sub = document.createElement('div');
    sub.className = 'h-sub';
    sub.textContent = fmtTime(h.ts) + ' · ' + h.count + ' 条消息';
    card.appendChild(title);
    card.appendChild(sub);
    card.addEventListener('click', () => {
      restoreSession(h);
      closeMobileDrawer();
    });
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '删除';
    del.addEventListener('click', (ev) => {
      ev.stopPropagation();
      history.splice(idx, 1);
      persistOrWarn('dave_history', history);
      renderHistory();
    });
    card.appendChild(del);
    el.appendChild(card);
  });
}

/* ---------------------------- 设置弹窗 ------------------------------ */
function fillIndustryOptions() {
  const sel = $('cfg-industry');
  if (!sel) return;
  const packs = typeof INDUSTRY_PACKS !== 'undefined' ? INDUSTRY_PACKS : {};
  sel.innerHTML = '';
  Object.keys(packs).forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = packs[id].label;
    sel.appendChild(opt);
  });
}


function syncVoiceCloudFields() {
  const engineEl = $('cfg-voice-engine');
  const engine = engineEl ? engineEl.value : (config.voiceEngine || 'browser');
  const box = $('voice-cloud-fields');
  if (box) box.classList.toggle('hidden', engine === 'browser');
  const appWrap = $('voice-appid-wrap');
  if (appWrap) appWrap.classList.toggle('hidden', engine !== 'volc');
  const voiceInput = $('cfg-tts-voice');
  if (voiceInput && !voiceInput.value.trim()) {
    voiceInput.placeholder = engine === 'volc' ? 'en_female_sarah_mars_bigtts' : 'Cherry';
  }
}

function openSettings() {
  fillIndustryOptions();
  $('cfg-base').value = config.base;
  $('cfg-key').value = config.key;
  $('cfg-model').value = config.model;
  $('cfg-temp').value = config.temp;
  $('cfg-json').checked = config.json;
  if ($('cfg-stream')) $('cfg-stream').checked = config.stream !== false;
  if ($('cfg-handsfree')) $('cfg-handsfree').checked = !!config.handsfree;
  if ($('cfg-strict')) $('cfg-strict').checked = !!config.strict;
  if ($('cfg-threesecond')) $('cfg-threesecond').checked = !!config.threeSecond;
  if ($('cfg-defer')) $('cfg-defer').checked = !!config.deferCorrection;
  if ($('cfg-industry')) $('cfg-industry').value = config.industry || 'none';
  if ($('cfg-tts-rate')) $('cfg-tts-rate').value = clampRate(config.ttsRate, 0.95);
  if ($('cfg-speak-then-listen')) $('cfg-speak-then-listen').checked = config.speakThenListen !== false;
  if ($('cfg-asr-continuous')) $('cfg-asr-continuous').checked = config.asrContinuous !== false;
  if ($('cfg-asr-silence')) $('cfg-asr-silence').value = asrSilenceMs();
  if ($('cfg-asr-interim')) $('cfg-asr-interim').checked = config.asrInterim !== false;
  if ($('cfg-voice-engine')) $('cfg-voice-engine').value = config.voiceEngine || 'browser';
  if ($('cfg-voice-key')) $('cfg-voice-key').value = config.voiceKey || '';
  if ($('cfg-voice-appid')) $('cfg-voice-appid').value = config.voiceAppId || '';
  if ($('cfg-tts-voice')) $('cfg-tts-voice').value = config.ttsVoice || '';
  syncVoiceCloudFields();
  $('settings-overlay').classList.remove('hidden');
}
function closeSettings() { $('settings-overlay').classList.add('hidden'); }

function saveSettings() {
  const prevHandsfree = !!config.handsfree;
  const prevAsr = {
    continuous: !!config.asrContinuous,
    interim: config.asrInterim !== false,
    silence: asrSilenceMs(),
  };
  config.base = $('cfg-base').value.trim();
  config.key = $('cfg-key').value.trim();
  config.model = $('cfg-model').value.trim();
  config.temp = Number($('cfg-temp').value);
  config.json = $('cfg-json').checked;
  config.stream = $('cfg-stream') ? $('cfg-stream').checked : true;
  config.handsfree = $('cfg-handsfree') ? $('cfg-handsfree').checked : false;
  config.strict = $('cfg-strict') ? $('cfg-strict').checked : false;
  config.threeSecond = $('cfg-threesecond') ? $('cfg-threesecond').checked : false;
  config.deferCorrection = $('cfg-defer') ? $('cfg-defer').checked : false;
  config.industry = $('cfg-industry') ? ($('cfg-industry').value || 'none') : 'none';
  config.ttsRate = $('cfg-tts-rate') ? clampRate($('cfg-tts-rate').value, 0.95) : clampRate(config.ttsRate, 0.95);
  config.speakThenListen = $('cfg-speak-then-listen') ? $('cfg-speak-then-listen').checked : true;
  config.asrContinuous = $('cfg-asr-continuous') ? $('cfg-asr-continuous').checked : true;
  config.asrSilenceMs = $('cfg-asr-silence') ? Number($('cfg-asr-silence').value) : 1400;
  config.asrInterim = $('cfg-asr-interim') ? $('cfg-asr-interim').checked : true;
  config.voiceEngine = $('cfg-voice-engine') ? ($('cfg-voice-engine').value || 'browser') : (config.voiceEngine || 'browser');
  config.voiceKey = $('cfg-voice-key') ? $('cfg-voice-key').value.trim() : (config.voiceKey || '');
  config.voiceAppId = $('cfg-voice-appid') ? $('cfg-voice-appid').value.trim() : (config.voiceAppId || '');
  config.ttsVoice = $('cfg-tts-voice') ? $('cfg-tts-voice').value.trim() : (config.ttsVoice || '');
  if (config.voiceEngine === 'aliyun' && !config.ttsVoice) config.ttsVoice = 'Cherry';
  if (config.voiceEngine === 'volc' && !config.ttsVoice) config.ttsVoice = 'en_female_sarah_mars_bigtts';
  // Reuse chat key for Aliyun when voice key left blank.
  if (config.voiceEngine === 'aliyun' && !config.voiceKey && config.key) config.voiceKey = config.key;
  persistOrWarn('dave_config', config);
  closeSettings();
  const asrChanged =
    prevAsr.continuous !== !!config.asrContinuous ||
    prevAsr.interim !== (config.asrInterim !== false) ||
    prevAsr.silence !== asrSilenceMs();
  if (asrChanged) invalidateRecognition();
  updateMicStatus();
  renderTemplates();
  addMessage('system', '✅ 设置已保存（Key 仅存本机浏览器）。语音引擎：' + (config.voiceEngine || 'browser'), null, null);
  if (!config.threeSecond) clearChallenge();
  if (!config.handsfree) {
    pauseHandsfree();
  } else if (!prevHandsfree && session && !turnBusy) {
    waitForTtsThenListen();
  }
}

function readSettingsForm() {
  return {
    ...config,
    base: $('cfg-base').value.trim(),
    key: $('cfg-key').value.trim(),
    model: $('cfg-model').value.trim(),
    temp: Number($('cfg-temp').value),
    json: $('cfg-json').checked,
    stream: $('cfg-stream') ? $('cfg-stream').checked : config.stream,
    handsfree: $('cfg-handsfree') ? $('cfg-handsfree').checked : config.handsfree,
    strict: $('cfg-strict') ? $('cfg-strict').checked : config.strict,
    threeSecond: $('cfg-threesecond') ? $('cfg-threesecond').checked : config.threeSecond,
    deferCorrection: $('cfg-defer') ? $('cfg-defer').checked : config.deferCorrection,
    industry: $('cfg-industry') ? ($('cfg-industry').value || 'none') : config.industry,
    ttsRate: $('cfg-tts-rate') ? clampRate($('cfg-tts-rate').value, 0.95) : clampRate(config.ttsRate, 0.95),
    speakThenListen: $('cfg-speak-then-listen') ? $('cfg-speak-then-listen').checked : config.speakThenListen !== false,
    asrContinuous: $('cfg-asr-continuous') ? $('cfg-asr-continuous').checked : config.asrContinuous !== false,
    asrSilenceMs: $('cfg-asr-silence') ? Number($('cfg-asr-silence').value) : config.asrSilenceMs,
    asrInterim: $('cfg-asr-interim') ? $('cfg-asr-interim').checked : config.asrInterim !== false,
    voiceEngine: $('cfg-voice-engine') ? ($('cfg-voice-engine').value || 'browser') : (config.voiceEngine || 'browser'),
    voiceKey: $('cfg-voice-key') ? $('cfg-voice-key').value.trim() : (config.voiceKey || ''),
    voiceAppId: $('cfg-voice-appid') ? $('cfg-voice-appid').value.trim() : (config.voiceAppId || ''),
    ttsVoice: $('cfg-tts-voice') ? $('cfg-tts-voice').value.trim() : (config.ttsVoice || ''),
  };
}

/* ---------------------------- 句型 & 行话 ---------------------------- */
function insertIntoInput(text) {
  if (shadowState.active) {
    addMessage('system', '跟读模式中：请用跟读面板练习，或先退出跟读。', null, null);
    return;
  }
  const cur = inputEl.value.trim();
  inputEl.value = cur ? (cur + ' ' + text) : text;
  autoResize();
  markChallengeOpened();
  inputEl.focus();
  closeMobileDrawer();
}

function renderTemplateCard(item, listEl) {
  const card = document.createElement('div');
  card.className = 'template-card';
  if (item.label) {
    const label = document.createElement('div');
    label.className = 'tpl-label';
    label.textContent = item.label;
    card.appendChild(label);
  }
  const en = document.createElement('div');
  en.className = 'en';
  en.textContent = item.en;
  card.appendChild(en);
  if (item.zh) {
    const zh = document.createElement('div');
    zh.className = 'zh';
    zh.textContent = item.zh;
    card.appendChild(zh);
  }
  if (item.example) {
    const ex = document.createElement('div');
    ex.className = 'example';
    ex.innerHTML = '<b>例句</b>' + escapeHtml(item.example);
    card.appendChild(ex);
  }
  if (item.variant) {
    const va = document.createElement('div');
    va.className = 'variant';
    va.innerHTML = '<b>变形</b>' + escapeHtml(item.variant);
    card.appendChild(va);
  }
  const speakText = item.example || item.en;
  const actions = document.createElement('div');
  actions.className = 'tpl-actions';
  const fill = document.createElement('button');
  fill.type = 'button';
  fill.textContent = '填入';
  fill.addEventListener('click', () => insertIntoInput(item.en));
  const shadowOne = document.createElement('button');
  shadowOne.type = 'button';
  shadowOne.textContent = '跟读';
  shadowOne.addEventListener('click', () => speak(speakText, { rate: 0.95 }));
  const save = document.createElement('button');
  save.type = 'button';
  const saved = () => phrases.some((p) => p.en === speakText);
  save.textContent = saved() ? '已收藏' : '收藏';
  save.addEventListener('click', () => {
    if (saved()) {
      phrases = phrases.filter((p) => p.en !== speakText);
    } else {
      phrases.unshift({ en: speakText, scenarioName: '语块 · ' + (item.label || ''), ts: Date.now() });
    }
    persistOrWarn('dave_phrasebook', phrases);
    renderPhrasebook();
    save.textContent = saved() ? '已收藏' : '收藏';
  });
  actions.appendChild(fill);
  actions.appendChild(shadowOne);
  actions.appendChild(save);
  card.appendChild(actions);
  listEl.appendChild(card);
}

function renderTemplates() {
  const tplEl = $('template-list');
  const jarEl = $('jargon-list');
  if (!tplEl || !jarEl) return;
  tplEl.innerHTML = '';
  jarEl.innerHTML = '';
  const templates = typeof MEETING_TEMPLATES !== 'undefined' ? MEETING_TEMPLATES : [];
  templates.forEach((t) => renderTemplateCard(t, tplEl));
  if (!templates.length) {
    tplEl.innerHTML = '<div class="empty">句型库未加载。</div>';
  }
  const pack = getIndustryPack();
  if (!pack.jargon || !pack.jargon.length) {
    jarEl.innerHTML = '<div class="empty">当前为通用模式。到设置里选 IT / 产品 / 商务 可加载行话。</div>';
    return;
  }
  pack.jargon.forEach((j) => renderTemplateCard({ en: j.en, zh: j.zh, label: pack.label }, jarEl));
}


/* ======================== 语块教练 / Recast / 诊断 ======================== */
function upsertPhrase(en, scenarioName, zh, cue, mastery) {
  const text = String(en || '').trim();
  if (!text) return;
  const existing = phrases.find((p) => p.en === text);
  if (existing) {
    if (zh) existing.zh = zh;
    if (cue) existing.cue = cue;
    if (mastery) existing.mastery = mastery;
    if (scenarioName) existing.scenarioName = scenarioName;
  } else {
    phrases.unshift({
      en: text,
      scenarioName: scenarioName || '',
      zh: zh || '',
      cue: cue || '',
      mastery: mastery || 'need',
      ts: Date.now(),
    });
  }
  persistOrWarn('dave_phrasebook', phrases);
  renderPhrasebook();
  updateSpeakAllBtn();
}

function setPhraseMastery(en, mastery) {
  const p = phrases.find((x) => x.en === en);
  if (!p) return;
  p.mastery = mastery;
  persistOrWarn('dave_phrasebook', phrases);
  renderPhrasebook();
}

function buildCoachSystemPrompt(topicLabel) {
  const pack = getIndustryPack();
  const jargon = (pack.jargon || []).slice(0, 4).map((j) => j.en).join(' / ');
  return [
    'You are my Lexical Chunk Speaking Coach for English meetings.',
    'Goal: in one voice-friendly session, train exactly 3 high-frequency, modern, transferable chunks from "I understand them" to "I can retrieve them under pressure".',
    'Do NOT free-chat aimlessly. Do NOT lecture grammar. Prefer recasts over interruptions.',
    '',
    'My settings:',
    '- Level: B1-B2',
    '- Topic: ' + (topicLabel || 'workplace meetings') + (jargon ? ' (flavor: ' + jargon + ')' : ''),
    '- Chunk count: 3',
    '- Accent preference: American English',
    '- Brief Chinese explanations OK when I ask or when stuck; otherwise stay in English',
    '- Correction intensity: light-medium; only fix meaning-breaking / Chinglish / chunk-related errors',
    '',
    'Chunk selection rules:',
    '1) Prefer high-frequency, modern, transferable meeting expressions.',
    '2) No rare slang, outdated idioms, or one-off lines.',
    '3) Teach each chunk as a whole — never as isolated words.',
    '',
    'Follow these stages in order (keep each turn short; one question at a time; wait for me):',
    '1 SOUND: Tell a 40-60s mini story/dialogue that naturally contains the 3 chunks. Do NOT name them yet. Then ask one gist question.',
    '2 NOTICE: Reveal the 3 target chunks. For each: meaning, scene, common collocates, register, one natural example. Read each twice (normal + slightly slower).',
    '3 IMITATE: Drill one chunk at a time with repetition. Flag only clarity-breaking pronunciation/stress/linking issues. If unsure you heard me, say so.',
    '4 CONNECT: Ask one real-life question at a time so I answer WITH the target chunk. Prefer scenes/images over Chinese translation prompts.',
    '5 RETRIEVE: Give a scene and make me recall which chunk fits. Hints order: context → first word → full chunk.',
    '6 ROLEPLAY: 5-8 short turns. One question each time. Make me reuse each chunk in at least 3 different scenes.',
    '7 RECAST: Do not interrupt every small mistake. Say "A more natural way to say that is: ..." then make me repeat immediately. Max one teaching point per turn.',
    '8 SPACED RECALL: After 3-5 other turns, quietly set a new scene for an earlier chunk.',
    '9 BLIND TEST: Give 3 new scenes without showing the chunks. Check active retrieval.',
    '10 WRAP: When I say "结束/复盘/done", summarize in Chinese: the 3 chunks, collocates, my original vs natural versions, status (主动调用/需要提示/仍需复习), and 3 review questions for tomorrow.',
    '',
    'Output ONLY JSON:',
    '{"reply":"your short coach turn (1-4 sentences; spoken style)","correction":"① 你说的是：...\n② 更地道的是：...\n③ 为什么：... (or empty if nothing to fix)","focus":"one short Chinese line on the stage goal or the chunk being trained","errors":[]}',
    'Keep "reply" as coaching dialogue. Put teaching notes in focus/correction, not as a long lecture.',
  ].join('\n');
}

function startCoachSession() {
  exitShadowing({ silent: true });
  clearChallenge();
  pauseHandsfree();
  const topics = typeof COACH_TOPICS !== 'undefined' ? COACH_TOPICS : [];
  const topic = topics[Math.floor(Math.random() * Math.max(topics.length, 1))] || { id: 'workload', label: '工作压力 / 排期' };
  coachTopicId = topic.id || '';
  const scenario = currentPersona.scenarios[0];
  session = {
    id: Date.now(),
    persona: currentPersona.id,
    scenario: scenario ? scenario.id : 'coach',
    mode: 'coach',
    coachTopic: topic.label || 'workplace meetings',
    messages: [],
  };
  if (scenario) scenarioSelect.value = scenario.id;
  resetChatView(false);
  const intro = 'Chunk coach mode · topic: ' + (topic.label || 'meetings') + '. I will train 3 reusable chunks with you. Ready? Say yes, or tell me another meeting topic.';
  addMessage('dave', intro, null, '语块教练：每次只练 3 个可迁移语块。流程：听见→注意→模仿→连接现实→提取→角色扮演→recast→间隔回收→盲测。');
  const badge = document.createElement('div');
  badge.className = 'msg system';
  badge.innerHTML = '<div class="bubble"><span class="coach-badge">语块教练 · 15 分钟</span>主题：' + escapeHtml(topic.label || '') + (topic.hint ? ' · 可迁移方向：' + escapeHtml(topic.hint) : '') + '。随时说「结束」进入文字复盘。</div>';
  chatEl.appendChild(badge);
  speakThenMaybeListen(intro);
  inputEl.focus();
}

async function startResayDrill(text) {
  const target = String(text || '').trim();
  if (!target) return;
  resayTarget = target;
  addMessage('system', '🔁 Recast 重说：先听自然版，然后立刻自己说一遍（可打字或开麦）。\n目标：' + target, null, null);
  await speak(target);
  if (!isRecording) startMic('resay');
}

function handleResayTranscript(spoken) {
  const target = resayTarget;
  resayTarget = null;
  if (!target) return;
  const result = scoreShadow(target, spoken || '');
  const pct = Math.round(result.score * 100);
  if (result.score >= 0.7) {
    addMessage('system', '✅ 重说过关（约 ' + pct + '% 词命中）。这个自然版可以收进语块库。', null, null);
    upsertPhrase(target, 'Recast', '', '', 'cued');
    resolveWeakSpot(target);
  } else {
    const miss = result.missing.length ? '还缺：' + result.missing.join(', ') : '再靠近一点自然版';
    addMessage('system', '再试一次。命中约 ' + pct + '%。' + miss + '。目标：' + target, null, null);
    upsertWeakSpot(target, { source: '重说失败' });
    resayTarget = target;
  }
}

async function diagnoseMissingChunks() {
  if (!session || !session.messages.length) {
    addMessage('system', '还没有对练内容，先聊几轮再诊断。', null, null);
    return;
  }
  const transcript = session.messages
    .filter((m) => m.role === 'user' || m.role === 'dave')
    .map((m) => (m.role === 'user' ? 'You: ' : 'Partner: ') + m.text)
    .join('\n');
  const typing = showTyping();
  try {
    const sys = [
      '你是英语口语诊断教练。根据对话，找出学习者最需要的 3 个会议语块。',
      '只输出 JSON：{"chunks":[{"en":"chunk template or sentence","zh":"中文意思","cue":"中文场景提示","example":"自然例句"}]}',
      '选取原则：高频、可迁移、现代会议英语；针对用户的简单词重复、中式英语、卡住处；不要生僻俚语。',
    ].join('\n');
    const raw = await chatCompletion(
      [{ role: 'user', content: '对话：\n' + transcript }],
      sys,
      { json: true }
    );
    const parsed = parseJson(raw) || {};
    const chunks = Array.isArray(parsed.chunks) ? parsed.chunks.slice(0, 3) : [];
    if (!chunks.length) throw new Error('未解析到语块');
    chunks.forEach((c) => {
      upsertPhrase(c.example || c.en, '诊断提炼', c.zh || '', c.cue || '', 'need');
    });
    const card = document.createElement('div');
    card.className = 'msg system';
    const box = document.createElement('div');
    box.className = 'review-card';
    box.innerHTML = '<h3>🔎 诊断提炼 · 3 个最缺语块</h3>' +
      chunks.map((c, i) => (
        '<div style="margin:8px 0"><b>' + (i + 1) + '. ' + escapeHtml(c.en || '') + '</b><br>' +
        escapeHtml(c.zh || '') + (c.cue ? '<br>场景：' + escapeHtml(c.cue) : '') +
        (c.example ? '<br>例句：' + escapeHtml(c.example) : '') + '</div>'
      )).join('');
    const actions = document.createElement('div');
    actions.className = 'diagnose-actions';
    const drill = document.createElement('button');
    drill.className = 'btn btn-primary';
    drill.type = 'button';
    drill.textContent = '用这 3 个做语块反射';
    drill.addEventListener('click', () => startDiagnoseReflex(chunks));
    const pause = document.createElement('button');
    pause.className = 'btn btn-ghost';
    pause.type = 'button';
    pause.textContent = '半句暂停练习';
    pause.addEventListener('click', () => startShadowing('pause'));
    actions.appendChild(drill);
    actions.appendChild(pause);
    box.appendChild(actions);
    card.appendChild(box);
    chatEl.appendChild(card);
    scrollToBottom();
  } catch (err) {
    addMessage('system', '⚠️ 诊断失败：' + err.message, null, null);
  } finally {
    if (typing.parentNode) typing.remove();
  }
}

function startDiagnoseReflex(chunks) {
  const lines = (chunks || []).map((c) => ({
    zh: (c.cue || c.zh || '用这个语块回应'),
    en: c.example || c.en,
    stem: String(c.en || c.example || '').replace(/\.+\.$/, ' ').replace(/\.\.\./g, ' '),
  })).filter((l) => l.en);
  if (!lines.length) return;
  startShadowing('reflex');
  shadowState.lines = lines;
  shadowState.index = 0;
  shadowState.hits = 0;
  renderShadowLine();
}

/* ---------------------------- 跟读模式 ------------------------------ */
function tokenizeEn(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreShadow(target, spoken) {
  const a = tokenizeEn(target);
  const b = tokenizeEn(spoken);
  if (!a.length) return { score: 0, missing: [], heard: [] };
  if (!b.length) return { score: 0, missing: a.slice(0, 6), heard: [] };
  const setB = new Set(b);
  const missing = a.filter((w) => !setB.has(w));
  const hit = a.length - missing.length;
  const score = hit / a.length;
  return {
    score,
    missing: missing.slice(0, 6),
    heard: b.slice(0, 12),
  };
}

function setShadowFeedback(text, kind) {
  const el = $('shadow-feedback');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('ok', 'bad');
  if (kind) el.classList.add(kind);
}

const REFLEX_SECONDS = 3;
const REFLEX_PASS = 0.6;
const SHADOW_PASS = 0.7;

function isReflex() {
  return shadowState.mode === 'reflex';
}
function isPause() {
  return shadowState.mode === 'pause';
}

/* 语块反射的题目：用中文场景 cue 触发，对答案的「语块骨架」计分 */
function buildReflexLines() {
  const templates = typeof MEETING_TEMPLATES !== 'undefined' ? MEETING_TEMPLATES : [];
  const fromTemplates = templates
    .filter((t) => t.example)
    .map((t) => ({
      zh: (t.label ? '【' + t.label + '】' : '') + (t.cue || t.cue || t.zh || ''),
      en: t.example,
      stem: String(t.en || '').replace(/\.\.\./g, ' '),
      variant: t.variant || t.variant || '',
    }));
  const weak = getOpenWeakSpots(6).map((w) => ({
    zh: (w.cue ? w.cue + ' · ' : '') + (w.zh || '调出这个自然表达'),
    en: w.en,
    stem: w.en,
    variant: '',
  }));
  const seen = new Set();
  const merged = [];
  weak.concat(fromTemplates).forEach((line) => {
    const key = String(line.en || '').toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(line);
  });
  return merged;
}

function stopReflexTimer() {
  shadowState.timerGen += 1;
  if (shadowState.timerRaf) {
    cancelAnimationFrame(shadowState.timerRaf);
    shadowState.timerRaf = null;
  }
}

function setReflexTimerState(cls, num) {
  const t = $('shadow-timer');
  if (!t) return;
  t.classList.remove('passed', 'missed');
  if (cls) t.classList.add(cls);
  if (num != null) $('shadow-timer-num').textContent = num;
}

function startReflexTimer() {
  stopReflexTimer();
  const gen = shadowState.timerGen;
  const started = performance.now();
  const duration = REFLEX_SECONDS * 1000;
  setReflexTimerState(null, REFLEX_SECONDS.toFixed(1));
  const tick = (now) => {
    if (gen !== shadowState.timerGen || !shadowState.active) return;
    const left = Math.max(0, duration - (now - started));
    $('shadow-timer-num').textContent = (left / 1000).toFixed(1);
    if (left <= 0) {
      setReflexTimerState('missed', '0.0');
      if (!shadowState.answered) {
        setShadowFeedback('超时。先蹦出语块开头（如 "Actually, I think..."），再补内容。可以「看答案」或直接说完。', 'bad');
      }
      return;
    }
    shadowState.timerRaf = requestAnimationFrame(tick);
  };
  shadowState.timerRaf = requestAnimationFrame(tick);
}

function markReflexOpened() {
  if (!shadowState.active || !isReflex() || shadowState.answered) return;
  const t = $('shadow-timer');
  if (t && !t.classList.contains('missed')) {
    stopReflexTimer();
    setReflexTimerState('passed', '✓');
  }
}

function revealShadowAnswer() {
  const en = $('shadow-en');
  const line = shadowState.lines[shadowState.index];
  if (en && line) {
    en.classList.remove('masked');
    en.textContent = line.en || '';
  }
  const btn = $('btn-shadow-reveal');
  if (btn) btn.classList.add('hidden');
  const hintBtn = $('btn-shadow-hint');
  if (hintBtn) hintBtn.classList.add('hidden');
}

function renderShadowLine() {
  const total = shadowState.lines.length || 1;
  const idx = Math.min(shadowState.index, total - 1);
  const line = shadowState.lines[idx] || { en: '', zh: '' };
  const reflex = isReflex();
  const pause = isPause();
  shadowState.answered = false;
  $('shadow-step-label').textContent = (idx + 1) + ' / ' + total;
  $('shadow-progress-fill').style.width = (((idx + 1) / total) * 100).toFixed(1) + '%';
  $('shadow-zh').textContent = line.zh || '';
  const en = $('shadow-en');
  if (pause) {
    en.innerHTML = escapeHtml(line.head || '') + ' <span class="pause-gap">……</span>';
    en.classList.remove('masked');
  } else {
    en.textContent = line.en || '';
    en.classList.toggle('masked', reflex);
  }
  $('shadow-timer').classList.toggle('hidden', !reflex);
  $('btn-shadow-reveal').classList.toggle('hidden', !(reflex || pause));
  const hintBtn = $('btn-shadow-hint');
  if (hintBtn) hintBtn.classList.toggle('hidden', !pause);
  $('shadow-rate-wrap').classList.toggle('hidden', reflex);
  $('btn-shadow-play').classList.toggle('hidden', reflex);
  $('btn-shadow-play').textContent = pause ? '▶ 听前半句' : '▶ 听示范';
  $('btn-shadow-mic').textContent = reflex ? '🎤 说出来' : (pause ? '🎤 补全' : '🎤 跟读');
  $('btn-shadow-next').textContent = reflex || pause ? '下一题' : '下一句';
  const score = $('shadow-score-label');
  score.classList.toggle('hidden', !(reflex || pause));
  score.textContent = shadowState.hits + ' 命中';
  setShadowFeedback(reflex ? '看中文提示，' + REFLEX_SECONDS + ' 秒内开口说出对应语块。' : (pause ? '先点「听前半句」，然后补出后半句或整句。' : ''), null);
  if (reflex) startReflexTimer();
  else stopReflexTimer();
}

function startShadowing(mode) {
  clearChallenge();
  pauseHandsfree();
  stopTTS();
  session = null;
  resetChatView(false);
  welcomeEl.classList.add('hidden');
  if (chatEl) chatEl.classList.add('hidden');
  const panel = $('shadow-panel');
  if (panel) panel.classList.remove('hidden');
  shadowState.mode = mode === 'reflex' ? 'reflex' : (mode === 'pause' ? 'pause' : 'shadow');
  shadowState.active = true;
  shadowState.index = 0;
  shadowState.hits = 0;
  shadowState.listening = false;
  const reflex = isReflex();
  const pause = isPause();
  $('shadow-title').textContent = reflex ? '语块反射 · 3 秒' : (pause ? '半句暂停 · 补全语块' : '跟读 · 会议节奏');
  $('shadow-sub').textContent = reflex
    ? '看中文场景 → 3 秒内说出对应英文语块。练的是「不经思考就调取」，说出语块骨架即算命中。'
    : (pause
      ? '先听前半句，暂停后补出后半语块（或整句）。猜对说明搭配已进系统；猜错也有预测误差记忆。'
      : '听一句 → 马上跟说（每句 8–12 词）。比的是用词和节奏，不是发音打分。');
  shadowState.lines = reflex
    ? buildReflexLines()
    : (pause
      ? (typeof HALF_PAUSE_LINES !== 'undefined' ? HALF_PAUSE_LINES : []).slice()
      : (typeof SHADOWING_LINES !== 'undefined' ? SHADOWING_LINES : []).slice());
  if (!shadowState.lines.length) {
    setShadowFeedback('练习内容未加载。', 'bad');
    return;
  }
  renderShadowLine();
  inputEl.value = '';
  autoResize();
  inputEl.focus();
}

function exitShadowing(opts) {
  const wasActive = shadowState.active;
  stopReflexTimer();
  shadowState.active = false;
  shadowState.listening = false;
  shadowState.index = 0;
  const panel = $('shadow-panel');
  if (panel) panel.classList.add('hidden');
  if (chatEl) chatEl.classList.remove('hidden');
  if (wasActive && lessonState.active && lessonState.returnAfterShadow) {
    lessonState.returnAfterShadow = false;
    if (chatEl) chatEl.classList.add('hidden');
    const lessonPanel = $('lesson-panel');
    if (lessonPanel) lessonPanel.classList.remove('hidden');
    const rail = $('lesson-rail');
    if (rail) rail.classList.add('hidden');
    // advance to next step after practice when user exits
    if (LESSON_STEPS[lessonState.stepIndex] && LESSON_STEPS[lessonState.stepIndex].id === 'practice') {
      // stay on practice so user can choose roleplay via next
    }
    renderLesson();
    return;
  }
  if (wasActive && !(opts && opts.silent)) {
    resetToWelcome();
  }
}

async function playShadowLine() {
  if (!shadowState.active) return;
  const line = shadowState.lines[shadowState.index];
  if (!line) return;
  const rateEl = $('shadow-rate');
  const rate = rateEl ? Number(rateEl.value) : 1;
  if (isPause()) {
    setShadowFeedback('听前半句…', null);
    await speak(line.head || line.en, { rate: rate || 1 });
    if (shadowState.active) setShadowFeedback('暂停。请补出后半语块（或整句）。', null);
    return;
  }
  setShadowFeedback('听示范…', null);
  await speak(line.en, { rate: rate || 1 });
  if (shadowState.active) setShadowFeedback('轮到你了，点「跟读」或直接开麦。', null);
}

function startShadowMic() {
  if (!shadowState.active) return;
  const line = shadowState.lines[shadowState.index];
  if (!line) return;
  inputEl.value = '';
  autoResize();
  shadowState.listening = true;
  setShadowFeedback(isReflex() ? '正在听…直接说出语块。' : '正在听你跟读…', null);
  startMic('shadow');
}

function handleShadowTranscript(spoken, err) {
  if (!shadowState.active) return;
  const line = shadowState.lines[shadowState.index];
  if (!line) return;
  if (!spoken) {
    setShadowFeedback(err === 'no-speech' ? '没听清，再来一遍。' : '没听到内容，点麦克风或在下方打字。', 'bad');
    return;
  }
  const reflex = isReflex();
  const pause = isPause();
  const target = reflex ? (line.stem || line.en) : line.en;
  const result = scoreShadow(target, spoken);
  const pct = Math.round(result.score * 100);
  const pass = result.score >= (reflex || pause ? REFLEX_PASS : SHADOW_PASS);

  if (pause) {
    revealShadowAnswer();
    if (pass) {
      if (!shadowState.answered) shadowState.hits += 1;
      shadowState.answered = true;
      $('shadow-score-label').textContent = shadowState.hits + ' 命中';
      setShadowFeedback('补全成功（约 ' + pct + '%）。搭配开始进系统了 → 下一题', 'ok');
      resolveWeakSpot(line.en);
    } else {
      shadowState.answered = true;
      const miss = result.missing.length ? '还缺：' + result.missing.join(', ') : '';
      setShadowFeedback('再猜/再说一遍。命中约 ' + pct + '%。' + miss + ' 完整句：' + line.en, 'bad');
      upsertWeakSpot(line.en, { source: '半句暂停', cue: line.zh || '' });
    }
    inputEl.value = '';
    autoResize();
    return;
  }

  if (reflex) {
    markReflexOpened();
    revealShadowAnswer();
    const timedOut = $('shadow-timer').classList.contains('missed');
    if (pass) {
      if (!shadowState.answered) shadowState.hits += 1;
      shadowState.answered = true;
      $('shadow-score-label').textContent = shadowState.hits + ' 命中';
      setShadowFeedback(
        (timedOut ? '语块对了，但慢了。' : '命中！') + '骨架词 ' + pct + '%。' +
        (line.variant ? ' 变形句：' + line.variant : '') + ' → 下一题',
        timedOut ? null : 'ok'
      );
      resolveWeakSpot(line.en);
    } else {
      shadowState.answered = true;
      const miss = result.missing.length ? '缺：' + result.missing.join(', ') : '';
      setShadowFeedback('没调出这个语块。' + miss + ' 对照答案再说一遍，再点下一题。', 'bad');
      upsertWeakSpot(line.en, { source: '语块反射', cue: line.zh || '' });
    }
  } else if (pass) {
    setShadowFeedback('跟上了（约 ' + pct + '% 词命中）。可以下一句。', 'ok');
    resolveWeakSpot(line.en);
  } else {
    const miss = result.missing.length ? '漏了：' + result.missing.join(', ') : '节奏偏了';
    setShadowFeedback('再跟一遍。命中约 ' + pct + '%。' + miss, 'bad');
    upsertWeakSpot(line.en, { source: '跟读', cue: line.zh || '' });
  }
  inputEl.value = '';
  autoResize();
}

function finishShadowSet() {
  stopReflexTimer();
  if (isReflex() || isPause()) {
    const total = shadowState.lines.length;
    const rate = total ? Math.round((shadowState.hits / total) * 100) : 0;
    const verdict = rate >= 80 ? '这组语块基本成条件反射了。' : rate >= 50 ? '一半能调出来，明天再刷一遍。' : '还在「想」而不是「调」，建议先跟读一组再回来。';
    setShadowFeedback('本组完成：' + shadowState.hits + '/' + total + '（' + rate + '%）。' + verdict + ' 点「再来一遍」重刷，或退出去对练。', 'ok');
    bumpProgress(isPause() ? 'shadow' : 'reflex');
  } else {
    setShadowFeedback('本组跟读完成。可以退出去对练，或点「再来一遍」从第一句重练。', 'ok');
    bumpProgress('shadow');
  }
}

function nextShadowLine() {
  if (!shadowState.active) return;
  if (shadowState.index >= shadowState.lines.length - 1) {
    finishShadowSet();
    return;
  }
  shadowState.index += 1;
  renderShadowLine();
}

function retryShadowLine() {
  if (!shadowState.active) return;
  const fb = $('shadow-feedback');
  if (shadowState.index >= shadowState.lines.length - 1 && fb && /完成/.test(fb.textContent || '')) {
    shadowState.index = 0;
    shadowState.hits = 0;
  }
  renderShadowLine();
  if (!isReflex()) playShadowLine();
}

async function testConnection() {
  const trial = readSettingsForm();
  try {
    const raw = await chatCompletion(
      [{ role: 'user', content: 'Reply with the single word: pong' }],
      'You are a connection test. Output JSON: {"reply":"pong"}',
      { json: true, config: trial }
    );
    const preview = raw ? String(raw).slice(0, 80) : '';
    addMessage('system', '✅ 连接成功，记得点保存' + (preview ? '。返回：' + preview : '。'), null, null);
  } catch (err) {
    addMessage('system', '❌ 连接失败：' + err.message, null, null);
  }
}

/* ---------------------------- 事件绑定 ------------------------------ */
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
}

function bindEvents() {
  personaSelect.addEventListener('change', () => {
    const p = PERSONAS.find((x) => x.id === personaSelect.value) || PERSONAS[0];
    currentPersona = p;
    $('brand-avatar').textContent = p.icon;
    renderScenarioOptions();
    resetToWelcome();
  });

  scenarioSelect.addEventListener('change', () => {
    if (scenarioSelect.value) startSession(scenarioSelect.value);
  });

  $('btn-send').addEventListener('click', handleUserTurn);
  inputEl.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserTurn();
    }
  });
  inputEl.addEventListener('input', () => {
    autoResize();
    if (inputEl.value.trim()) markChallengeOpened();
  });

  $('btn-mic').addEventListener('click', toggleMic);
  $('btn-new').addEventListener('click', () => {
    exitShadowing({ silent: true });
    startSession(scenarioSelect.value || currentPersona.scenarios[0].id);
  });
  $('btn-review').addEventListener('click', endReview);

  $('btn-settings').addEventListener('click', openSettings);
  $('btn-close-settings').addEventListener('click', closeSettings);
  $('btn-save').addEventListener('click', saveSettings);
  if ($('cfg-voice-engine')) $('cfg-voice-engine').addEventListener('change', syncVoiceCloudFields);
  $('btn-test').addEventListener('click', testConnection);

  $('settings-overlay').addEventListener('click', (e) => {
    if (e.target === $('settings-overlay')) closeSettings();
  });

  document.querySelectorAll('.preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('cfg-base').value = btn.dataset.base;
      $('cfg-model').value = btn.dataset.model;
    });
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchSidebarTab(tab.dataset.tab);
    });
  });

  const speakAllBtn = $('btn-speak-all');
  if (speakAllBtn) speakAllBtn.addEventListener('click', speakAllPhrases);

  document.querySelectorAll('.dock-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggleMobileDrawer(btn.dataset.openTab));
  });
  const closeDrawer = $('btn-close-drawer');
  if (closeDrawer) closeDrawer.addEventListener('click', () => closeMobileDrawer());
  const backdrop = $('drawer-backdrop');
  if (backdrop) backdrop.addEventListener('click', () => closeMobileDrawer());
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMobileDrawer();
  });

  const exitShadow = $('btn-shadow-exit');
  if (exitShadow) exitShadow.addEventListener('click', () => exitShadowing());
  const playShadow = $('btn-shadow-play');
  if (playShadow) playShadow.addEventListener('click', playShadowLine);
  const micShadow = $('btn-shadow-mic');
  if (micShadow) micShadow.addEventListener('click', startShadowMic);
  const nextShadow = $('btn-shadow-next');
  if (nextShadow) nextShadow.addEventListener('click', nextShadowLine);
  const retryShadow = $('btn-shadow-retry');
  if (retryShadow) retryShadow.addEventListener('click', retryShadowLine);
  const revealShadow = $('btn-shadow-reveal');
  if (revealShadow) revealShadow.addEventListener('click', () => {
    revealShadowAnswer();
    shadowState.answered = true;
    stopReflexTimer();
    setShadowFeedback('看完答案，照着说一遍再点下一题（本题不计命中）。', null);
  });
  const hintShadow = $('btn-shadow-hint');
  if (hintShadow) hintShadow.addEventListener('click', () => {
    if (!shadowState.active || !isPause()) return;
    const line = shadowState.lines[shadowState.index];
    if (!line) return;
    setShadowFeedback('开头提示：' + (line.head || '') + ' …', null);
    speak(line.head || '');
  });

  const lessonExit = $('btn-lesson-exit');
  if (lessonExit) lessonExit.addEventListener('click', () => exitLesson());
  const lessonBackBtn = $('btn-lesson-back');
  if (lessonBackBtn) lessonBackBtn.addEventListener('click', lessonBack);
  const lessonNextBtn = $('btn-lesson-next');
  if (lessonNextBtn) lessonNextBtn.addEventListener('click', lessonNext);
  const lessonResume = $('btn-lesson-resume');
  if (lessonResume) lessonResume.addEventListener('click', resumeLessonFromRail);
  const lessonAdvance = $('btn-lesson-advance');
  if (lessonAdvance) lessonAdvance.addEventListener('click', () => {
    // from roleplay rail → jump to discussion
    if (!lessonState.active) return;
    const idx = LESSON_STEPS.findIndex((s) => s.id === 'discussion');
    if (idx >= 0) lessonState.stepIndex = idx;
    resumeLessonFromRail();
  });
}

function switchSidebarTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  const panels = ['templates', 'phrasebook', 'history'];
  panels.forEach((n) => {
    const el = $('tab-' + n);
    if (el) el.classList.toggle('hidden', n !== name);
  });
  document.querySelectorAll('.dock-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.openTab === name);
  });
}

function openMobileDrawer(tabName) {
  if (tabName) switchSidebarTab(tabName);
  const sidebar = document.querySelector('.sidebar');
  const backdrop = $('drawer-backdrop');
  if (sidebar) sidebar.classList.add('drawer-open');
  if (backdrop) backdrop.classList.remove('hidden');
}

function closeMobileDrawer() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = $('drawer-backdrop');
  if (sidebar) sidebar.classList.remove('drawer-open');
  if (backdrop) backdrop.classList.add('hidden');
  document.querySelectorAll('.dock-btn').forEach((b) => b.classList.remove('active'));
}

function toggleMobileDrawer(tabName) {
  const sidebar = document.querySelector('.sidebar');
  const open = sidebar && sidebar.classList.contains('drawer-open');
  const current = document.querySelector('.tab.active');
  if (open && current && current.dataset.tab === tabName) {
    closeMobileDrawer();
    return;
  }
  openMobileDrawer(tabName);
}

/* ------------------------------ 启动 -------------------------------- */
function init() {
  renderPersonaOptions();
  renderScenarioOptions();
  renderWelcome();
  renderTemplates();
  renderPhrasebook();
  renderHistory();
  bindEvents();
  updateSpeakAllBtn();
  updateMicStatus();
  // 未配置 Key 时给个提示（欢迎列表仍可见）
  if (!config.key) {
    addMessage('system', '👋 欢迎。先点右上角「⚙ 设置」填入你的 API Key（DeepSeek / OpenAI 均可），再选角色和场景开始。', null, null);
  }
}

init();
