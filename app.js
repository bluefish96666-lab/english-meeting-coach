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
function buildSystemPrompt(persona, scenarioName, scenarioDesc) {
  const level = (learner && learner.level) || 'intermediate';
  const levelHint = level === 'beginner'
    ? 'The user is A2–B1 (beginner). Use shorter sentences, high-frequency words, and slightly slower spoken style. Still stay in character.'
    : 'The user is B1–B2 (intermediate). Use clear American English at a normal speaking pace. Challenge them a bit.';
  return [
    persona.promptBody,
    '',
    'Current scenario: ' + scenarioName + ' (' + scenarioDesc + ').',
    '',
    'Rules:',
    '1. ALWAYS stay in character and speak English in the "reply" field. ' + levelHint,
    '2. You only play the other party in this conversation. Do NOT teach and do NOT give answers during the roleplay.',
    '',
    'Output format — respond with ONLY a JSON object, no markdown fences, no extra text:',
    '{"reply":"your short in-character English reply (1-3 sentences, spoken style)","correction":"① 你说的是：<the user\'s exact last English sentence>\\n② 更地道的是：<how a native speaker would actually say it>\\n③ 为什么：<one short Chinese line: what was wrong + why the native version is better>","focus":"one short Chinese line on the single most important improvement this round among: ' + persona.focusDims + '"}',
    '',
    'For "correction": quote the user\'s actual last English message. If it was already fine, still polish the weakest part toward native spoken English. Keep ② natural and spoken; keep ③ to one line in Chinese.',
    'Keep "reply" strictly in character — do not put teaching or correction inside "reply".',
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
};

const DEFAULT_LEARNER = {
  level: 'intermediate', // beginner | intermediate
  goal: 'work', // work | conversation | travel
  plan: null,
  coreByGoal: {}, // goal -> { items: [...], ts }
  habit: { streak: 0, lastDate: '', todayDone: false },
};

const GOAL_META = {
  work: { label: '工作', personaIds: ['dave', 'client', 'interviewer'], coreHint: '英文工作会议 / 商务沟通 / 面试' },
  conversation: { label: '会话', personaIds: ['dave', 'ielts'], coreHint: '日常英文会话与流利表达' },
  travel: { label: '旅行', personaIds: ['travel'], coreHint: '机场、海关、餐厅、酒店等旅行场景' },
};

const LEVEL_LABEL = { beginner: '初级', intermediate: '中级' };

const MAX_TOKENS = 800;
const HISTORY_MSG_CAP = 40;
const HISTORY_TEXT_CAP = 1800;
const HISTORY_CORR_CAP = 800;

/* ------------------------------ 状态 -------------------------------- */
let config = { ...DEFAULT_CONFIG, ...store.get('dave_config', {}) };
let learner = sanitizeLearner(store.get('dave_learner', DEFAULT_LEARNER));
let currentPersona = PERSONAS[0];
let session = null; // { id, persona, scenario, messages: [{role,text,correction?,focus?}] }
let phrases = sanitizePhraseList(store.get('dave_phrasebook', []));
let history = sanitizeHistoryList(store.get('dave_history', []));
let turnBusy = false;
let requestGen = 0;
let coachSpeakText = '';

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function sanitizeLearner(raw) {
  const base = { ...DEFAULT_LEARNER, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (base.level !== 'beginner' && base.level !== 'intermediate') base.level = 'intermediate';
  if (!GOAL_META[base.goal]) base.goal = 'work';
  if (!base.coreByGoal || typeof base.coreByGoal !== 'object') base.coreByGoal = {};
  const habit = base.habit && typeof base.habit === 'object' ? base.habit : {};
  base.habit = {
    streak: Number(habit.streak) || 0,
    lastDate: typeof habit.lastDate === 'string' ? habit.lastDate : '',
    todayDone: !!habit.todayDone,
  };
  const today = todayKey();
  if (base.habit.lastDate !== today) base.habit.todayDone = false;
  return base;
}

function persistLearner() {
  persistOrWarn('dave_learner', learner);
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
  return {
    en,
    scenarioName: String(p.scenarioName == null ? '' : p.scenarioName),
    mnemonic: p.mnemonic ? String(p.mnemonic) : '',
    note: p.note ? String(p.note) : '',
    ts: Number.isFinite(ts) ? ts : Date.now(),
    card: sanitizeFsrsCard(p.card, ts),
  };
}

function sanitizeFsrsCard(raw, fallbackTs) {
  const now = new Date(Number.isFinite(fallbackTs) ? fallbackTs : Date.now());
  const base = ensureFsrsApi()
    ? window.tsfsrs.createEmptyCard(now)
    : {
        due: now,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: undefined,
      };
  if (!raw || typeof raw !== 'object') return serializeFsrsCard(base);
  return serializeFsrsCard({
    due: raw.due ? new Date(raw.due) : base.due,
    stability: Number(raw.stability) || 0,
    difficulty: Number(raw.difficulty) || 0,
    elapsed_days: Number(raw.elapsed_days) || 0,
    scheduled_days: Number(raw.scheduled_days) || 0,
    reps: Number(raw.reps) || 0,
    lapses: Number(raw.lapses) || 0,
    state: Number(raw.state) || 0,
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  });
}

function serializeFsrsCard(card) {
  return {
    due: card.due instanceof Date ? card.due.toISOString() : String(card.due),
    stability: Number(card.stability) || 0,
    difficulty: Number(card.difficulty) || 0,
    elapsed_days: Number(card.elapsed_days) || 0,
    scheduled_days: Number(card.scheduled_days) || 0,
    reps: Number(card.reps) || 0,
    lapses: Number(card.lapses) || 0,
    state: Number(card.state) || 0,
    last_review: card.last_review
      ? (card.last_review instanceof Date ? card.last_review.toISOString() : String(card.last_review))
      : undefined,
  };
}

function hydrateFsrsCard(stored) {
  const c = sanitizeFsrsCard(stored);
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

function ensureFsrsApi() {
  return !!(window.tsfsrs && window.tsfsrs.scheduler && window.tsfsrs.Rating);
}

function waitForFsrs(timeoutMs) {
  if (ensureFsrsApi()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      window.removeEventListener('tsfsrs-ready', onReady);
      resolve(ensureFsrsApi());
    }, timeoutMs || 4000);
    function onReady() {
      clearTimeout(t);
      window.removeEventListener('tsfsrs-ready', onReady);
      resolve(ensureFsrsApi());
    }
    window.addEventListener('tsfsrs-ready', onReady);
  });
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
  welcomeEl.innerHTML = '<p class="welcome-title">Pick a lane. Say a number.</p><ul class="welcome-list"></ul>';
  const list = welcomeEl.querySelector('.welcome-list');
  currentPersona.scenarios.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${i + 1}.</strong> ${escapeHtml(s.name)} <span style="color:var(--muted);font-size:12px">— ${escapeHtml(s.desc)}</span>`;
    li.addEventListener('click', () => startSession(s.id));
    list.appendChild(li);
  });
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
  pauseHandsfree();
  const s = currentPersona.scenarios.find((x) => x.id === scenarioId) || currentPersona.scenarios[0];
  session = {
    id: Date.now(),
    persona: currentPersona.id,
    scenario: s.id,
    messages: [],
  };
  scenarioSelect.value = s.id;
  resetChatView(false);
  addMessage('dave', s.opening, null, null);
  if (opts.deferListen) speak(s.opening);
  else speakThenMaybeListen(s.opening);
  inputEl.focus();
}

function resetToWelcome() {
  requestGen += 1;
  turnBusy = false;
  pauseHandsfree();
  session = null;
  resetChatView(true);
  renderWelcome();
  scenarioSelect.value = '';
  const scn = currentPersona.scenarios[0];
  if (scn) scenarioSelect.value = scn.id;
}

function addMessage(role, text, correction, focus) {
  if (session) {
    session.messages.push({ role, text, correction, focus });
  }
  renderMessage(role, text, correction, focus);
  scrollToBottom();
}

function renderMessage(role, text, correction, focus) {
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

  if (correction) {
    wrap.appendChild(buildCorrectionCard(correction, focus));
  }
  chatEl.appendChild(wrap);
}

function buildCorrectionCard(correction, focus) {
  const card = document.createElement('div');
  card.className = 'correction';

  const head = document.createElement('div');
  head.className = 'corr-head';
  head.innerHTML = '<span>📝 纠错 · 母语者说法</span>';
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
      phrases.unshift({
        en: better,
        scenarioName: scn ? scn.name : currentPersona.name,
        ts: Date.now(),
        card: serializeFsrsCard(
          ensureFsrsApi() ? window.tsfsrs.createEmptyCard(new Date()) : { due: new Date(), stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0 }
        ),
      });
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

  if (focus) {
    const f = document.createElement('div');
    f.className = 'focus';
    f.textContent = '🎯 ' + focus;
    card.appendChild(f);
  }

  const better = extractBetter(correction);
  const orig = extractOrig(correction);
  const actions = document.createElement('div');
  actions.className = 'corr-actions';
  const mk = (label, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  actions.appendChild(mk('语法讲人话', '用简单中文讲清语法点', () => coachGrammar(orig, better, correction)));
  actions.appendChild(mk('练发音', '拆音素 + 易错点', () => coachPronunciation(better || orig)));
  actions.appendChild(mk('记忆法', '故事/画面帮你记住', () => coachMnemonic(better || orig)));
  if (better) {
    actions.appendChild(mk('🔊 地道版', '朗读母语者说法', () => speak(better)));
  }
  card.appendChild(actions);
  return card;
}

function extractBetter(correction) {
  const m = String(correction).match(/②[^：:]*[：:]\s*(.+)/);
  if (m) return m[1].trim();
  const line = String(correction).split('\n').find((l) => l.includes('②'));
  return line ? line.replace(/^.*?[：:]/, '').trim() : '';
}

function extractOrig(correction) {
  const m = String(correction).match(/①[^：:]*[：:]\s*(.+)/);
  if (m) return m[1].trim();
  const line = String(correction).split('\n').find((l) => l.includes('①'));
  return line ? line.replace(/^.*?[：:]/, '').trim() : '';
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

function applyTokenLimit(body, model, maxTokens) {
  const name = String(model || '');
  const n = Number(maxTokens) > 0 ? Number(maxTokens) : MAX_TOKENS;
  if (/grok|gpt-5|^o[1-9]|o-mini|o3/i.test(name)) {
    body.max_completion_tokens = n;
  } else {
    body.max_tokens = n;
  }
}

function buildChatBody(messages, systemPrompt, cfg, opts, stream) {
  const body = {
    model: cfg.model,
    temperature: Number(cfg.temp ?? 0.7),
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  };
  applyTokenLimit(body, cfg.model, opts && opts.maxTokens);
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
    };
  }
  const text = String(raw || '').trim();
  if (!text) return null;
  if (text.charAt(0) === '{' && !parsed) return null;
  return { reply: text, correction: '', focus: '' };
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

function finalizeStreamingDave(ui, reply, correction, focus) {
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
  if (correction) {
    ui.wrap.appendChild(buildCorrectionCard(correction, focus));
  }
  if (session) {
    session.messages.push({ role: 'dave', text: reply, correction, focus });
  }
  scrollToBottom();
}

async function handleUserTurn() {
  const text = inputEl.value.trim();
  if (!text || turnBusy) return;
  turnBusy = true;
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
    const sys = buildSystemPrompt(currentPersona, scenario.name, scenario.desc);
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
    const { reply, correction, focus } = picked;

    if (streamUi) {
      finalizeStreamingDave(streamUi, reply, correction, focus);
    } else {
      addMessage('dave', reply, correction, focus);
    }
    turnBusy = false;
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
  const gen = requestGen;
  pauseHandsfree();
  const typing = showTyping();
  try {
    const transcript = session.messages
      .filter((m) => m.role === 'user' || m.role === 'dave')
      .map((m) => `${m.role === 'user' ? 'You' : currentPersona.label}: ${m.text}`)
      .join('\n');
    const sys = [
      '你是英语口语教练。根据下面这段英文口语练习对话，用中文写一段复盘。',
      '只输出一个 JSON：{"review":"..."}',
      'review 用三小段（可换行）：',
      '① 今日复盘：一句话概括今天练得怎么样（点出 1 个亮点 + 1 个问题）。',
      '② 明天重点：给 1-2 条具体可执行的练习建议。',
      '③ 最该补的一个表达：给出一个英文表达 + 一句中文说明为什么重要、怎么用。',
      '直接给内容，不要寒暄。',
    ].join('\n');
    const raw = await chatCompletion(
      [{ role: 'user', content: '练习对话：\n' + transcript }],
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
    card.appendChild(box);
    chatEl.appendChild(card);
    scrollToBottom();
  } catch (err) {
    if (gen !== requestGen) return;
    addMessage('system', '⚠️ 复盘失败：' + err.message, null, null);
  } finally {
    if (typing.parentNode) typing.remove();
    if (gen === requestGen) turnBusy = false;
  }
}

/* ---------------------- 教练加深：语法 / 发音 / 记忆法 ---------------------- */
function ensureApiKey() {
  if (config.key) return true;
  addMessage('system', '请先到「⚙ 设置」填入 API Key，再使用学习 / 教练功能。', null, null);
  openSettings();
  return false;
}

function openCoachModal(title, bodyText, speakEn) {
  coachSpeakText = speakEn || '';
  $('coach-title').textContent = title;
  $('coach-body').textContent = bodyText;
  const speakBtn = $('btn-coach-speak');
  if (speakBtn) speakBtn.style.display = coachSpeakText ? '' : 'none';
  $('coach-overlay').classList.remove('hidden');
}

function closeCoachModal() {
  $('coach-overlay').classList.add('hidden');
}

async function runCoachPrompt(title, systemPrompt, userContent, speakEn) {
  if (!ensureApiKey()) return '';
  if (turnBusy) {
    addMessage('system', '对方还在回复，请稍后再用教练功能。', null, null);
    return '';
  }
  turnBusy = true;
  openCoachModal(title, '正在生成…', speakEn);
  try {
    const raw = await chatCompletion(
      [{ role: 'user', content: userContent }],
      systemPrompt,
      { json: true, maxTokens: 1000 }
    );
    const parsed = parseJson(raw);
    const text = (parsed && (parsed.explain || parsed.text || parsed.tip)) || (raw || '').trim();
    openCoachModal(title, text, speakEn);
    return text;
  } catch (err) {
    openCoachModal(title, '生成失败：' + err.message, speakEn);
    return '';
  } finally {
    turnBusy = false;
  }
}

function coachGrammar(orig, better, correction) {
  const sys = [
    '你是英语语法教练。用简单中文讲人话，不要术语堆砌。',
    '只输出 JSON：{"explain":"..."}',
    'explain 结构：',
    '1) 一句话点明语法点',
    '2) 给 3 个清楚英文例句（每句后括号中文意思）',
    '3) 补 1 个中国学习者最常见的坑',
    '直接给内容，不要寒暄。',
  ].join('\n');
  const user = '原文：' + (orig || '（无）') + '\n更地道：' + (better || '（无）') + '\n纠错卡：\n' + (correction || '');
  return runCoachPrompt('语法讲人话', sys, user, better || orig);
}

function coachPronunciation(phrase) {
  if (!phrase) {
    addMessage('system', '没有可练发音的英文。', null, null);
    return Promise.resolve('');
  }
  const sys = [
    '你是英语发音教练，面向中文母语者。',
    '只输出 JSON：{"explain":"..."}',
    'explain 结构：',
    '1) 目标词/短语 + 简易音标（可用近似拼读）',
    '2) 按音节/音素拆开，告诉嘴型与气流',
    '3) 指出英语学习者（尤其中文母语）最容易发错的地方',
    '4) 给一句跟读小技巧',
    '直接给内容，不要寒暄。',
  ].join('\n');
  return runCoachPrompt('专治发音', sys, '帮我改进发音：' + phrase, phrase);
}

function coachMnemonic(phrase) {
  if (!phrase) {
    addMessage('system', '没有可做记忆法的英文。', null, null);
    return Promise.resolve('');
  }
  const sys = [
    '你是记忆法教练。给英文词/短语做好记、难忘的记忆钩子。',
    '只输出 JSON：{"explain":"..."}',
    'explain 用中文，含：一个小故事或画面 + 一句谐音/联想（可选）+ 一句使用场景提醒。',
    '要好记，不要学术。',
  ].join('\n');
  return runCoachPrompt('一次记住', sys, '给这个表达做记忆法：' + phrase, phrase);
}

/* ------------------------------ 学习中心 -------------------------------- */
function setLearnerLevel(level) {
  if (level !== 'beginner' && level !== 'intermediate') return;
  learner.level = level;
  persistLearner();
  renderLearnCenter();
}

function setLearnerGoal(goal) {
  if (!GOAL_META[goal]) return;
  learner.goal = goal;
  persistLearner();
  renderLearnCenter();
}

function renderLearnCenter() {
  document.querySelectorAll('#level-seg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.level === learner.level);
  });
  document.querySelectorAll('#goal-seg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.goal === learner.goal);
  });

  const habitEl = $('habit-status');
  if (habitEl) {
    const streak = learner.habit.streak || 0;
    const done = learner.habit.todayDone;
    habitEl.innerHTML = done
      ? '今日 20 分钟：<strong>已完成</strong> · 连续 <strong>' + streak + '</strong> 天'
      : '今日 20 分钟：未完成 · 连续 <strong>' + streak + '</strong> 天 · 点上方按钮开练';
  }

  renderPlanView();
  renderCoreView();
}

function renderPlanView() {
  const el = $('plan-view');
  if (!el) return;
  const plan = learner.plan;
  if (!plan) {
    el.innerHTML = '<div class="empty">还没有 4 周计划。选好水平/目标后点「生成 4 周计划」。</div>';
    return;
  }
  const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];
  let html = '<div class="plan-card"><h4>📋 4 周计划 · ' + escapeHtml(LEVEL_LABEL[learner.level] || '') + ' · ' + escapeHtml((GOAL_META[learner.goal] || {}).label || '') + '</h4>';
  if (plan.summary) html += '<div>' + escapeHtml(plan.summary) + '</div>';
  weeks.forEach((w, i) => {
    html += '<div class="plan-week"><div class="w-title">第 ' + (w.week || i + 1) + ' 周 · ' + escapeHtml(w.focus || '') + '</div>';
    html += '<div>' + escapeHtml(w.tasks || w.detail || '') + '</div>';
    if (w.scenarioHint) html += '<div style="margin-top:4px;color:var(--muted)">推荐场景：' + escapeHtml(w.scenarioHint) + '</div>';
    html += '</div>';
  });
  if (plan.dailyHabit) {
    html += '<div style="margin-top:8px;color:var(--muted)">每日习惯：' + escapeHtml(plan.dailyHabit) + '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

function renderCoreView() {
  const el = $('core-view');
  if (!el) return;
  const pack = learner.coreByGoal[learner.goal];
  if (!pack || !Array.isArray(pack.items) || !pack.items.length) {
    el.innerHTML = '<div class="empty">还没有核心词表。点「核心 100 词」按你的目标生成。</div>';
    return;
  }
  const byScene = {};
  pack.items.forEach((it) => {
    const sc = it.scene || '通用';
    if (!byScene[sc]) byScene[sc] = [];
    byScene[sc].push(it);
  });
  let html = '<div class="core-card"><h4>⭐ 核心表达 · ' + escapeHtml((GOAL_META[learner.goal] || {}).label || '') + '（' + pack.items.length + '）</h4>';
  Object.keys(byScene).forEach((sc) => {
    html += '<div class="core-scene-title">' + escapeHtml(sc) + '</div>';
    byScene[sc].slice(0, 40).forEach((it, idx) => {
      html += '<div class="core-item" data-en="' + escapeHtml(it.en || '') + '">';
      html += '<span class="pri">' + (it.priority || idx + 1) + '</span>';
      html += '<div style="flex:1;min-width:0"><div class="en">' + escapeHtml(it.en || '') + '</div>';
      if (it.zh) html += '<div class="zh">' + escapeHtml(it.zh) + '</div>';
      html += '</div>';
      html += '<div class="core-acts">';
      html += '<button type="button" data-act="speak" title="朗读">🔊</button>';
      html += '<button type="button" data-act="pron" title="发音">🎤</button>';
      html += '<button type="button" data-act="memo" title="记忆法">🧠</button>';
      html += '<button type="button" data-act="save" title="收藏">☆</button>';
      html += '</div></div>';
    });
  });
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('.core-item').forEach((row) => {
    const en = row.dataset.en;
    row.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'speak') speak(en);
        else if (act === 'pron') coachPronunciation(en);
        else if (act === 'memo') coachMnemonic(en);
        else if (act === 'save') saveCorePhrase(en, row.querySelector('.zh') && row.querySelector('.zh').textContent);
      });
    });
  });
}

function saveCorePhrase(en, zh) {
  if (!en) return;
  if (phrases.some((p) => p.en === en)) return;
  phrases.unshift({
    en,
    scenarioName: '核心100 · ' + ((GOAL_META[learner.goal] || {}).label || ''),
    mnemonic: '',
    note: zh || '',
    ts: Date.now(),
    card: serializeFsrsCard(
      ensureFsrsApi() ? window.tsfsrs.createEmptyCard(new Date()) : { due: new Date(), stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0 }
    ),
  });
  persistOrWarn('dave_phrasebook', phrases);
  renderPhrasebook();
  updateSpeakAllBtn();
}

async function generateFourWeekPlan() {
  if (!ensureApiKey()) return;
  if (turnBusy) return;
  turnBusy = true;
  const btn = $('btn-gen-plan');
  if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
  try {
    const goal = GOAL_META[learner.goal];
    const sys = [
      '你是英语私人导师。根据学员水平和目标，制定一份可执行的 4 周口语计划。',
      '只输出 JSON：',
      '{"summary":"一句话总目标","dailyHabit":"每天20分钟怎么安排（说/听/读/复习）","weeks":[{"week":1,"focus":"...","tasks":"本周具体练什么","scenarioHint":"推荐本应用里的角色或场景类型"}]}',
      'weeks 必须正好 4 项。tasks 用中文，具体可执行。scenarioHint 要能对应工作会议/面试/客户/雅思/旅行等。',
    ].join('\n');
    const user = '水平：' + (LEVEL_LABEL[learner.level] || learner.level) + '\n目标：' + (goal ? goal.label + '（' + goal.coreHint + '）' : learner.goal);
    const raw = await chatCompletion([{ role: 'user', content: user }], sys, { json: true, maxTokens: 1200 });
    const parsed = parseJson(raw);
    if (!parsed || !Array.isArray(parsed.weeks)) throw new Error('计划格式无效，请重试');
    learner.plan = {
      summary: String(parsed.summary || ''),
      dailyHabit: String(parsed.dailyHabit || ''),
      weeks: parsed.weeks.slice(0, 4).map((w, i) => ({
        week: Number(w.week) || i + 1,
        focus: String(w.focus || ''),
        tasks: String(w.tasks || w.detail || ''),
        scenarioHint: String(w.scenarioHint || ''),
      })),
      ts: Date.now(),
      level: learner.level,
      goal: learner.goal,
    };
    persistLearner();
    renderLearnCenter();
    addMessage('system', '✅ 4 周计划已生成，打开侧栏「学习」查看。接下来可用「今日 20 分钟」开练。', null, null);
  } catch (err) {
    addMessage('system', '⚠️ 生成计划失败：' + err.message, null, null);
  } finally {
    turnBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = '生成 4 周计划'; }
  }
}

async function generateCore100(force) {
  if (!ensureApiKey()) return;
  if (!force && learner.coreByGoal[learner.goal] && learner.coreByGoal[learner.goal].items && learner.coreByGoal[learner.goal].items.length) {
    renderCoreView();
    switchSidebarTab('learn');
    return;
  }
  if (turnBusy) return;
  turnBusy = true;
  const btn = $('btn-gen-core');
  if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
  try {
    const goal = GOAL_META[learner.goal];
    const sys = [
      '你是英语词汇教练。按学员目标列出最有用的英文词和短语（优先短语）。',
      '只输出 JSON：{"items":[{"en":"...","zh":"中文","scene":"场景名","priority":1}]}',
      '要求：大约 100 条（90-100）；按场景分组；priority 从 1 起表示优先级（越小越先学）；en 要地道口语；面向 ' + (LEVEL_LABEL[learner.level] || '中级') + ' 学员。',
    ].join('\n');
    const user = '目标：' + (goal ? goal.label + ' — ' + goal.coreHint : learner.goal) + '\n请给出最有用的约 100 个词/短语。';
    const raw = await chatCompletion([{ role: 'user', content: user }], sys, { json: true, maxTokens: 4500 });
    const parsed = parseJson(raw);
    const items = parsed && Array.isArray(parsed.items) ? parsed.items : null;
    if (!items || !items.length) throw new Error('词表为空，请重试');
    learner.coreByGoal[learner.goal] = {
      items: items.slice(0, 100).map((it, i) => ({
        en: String(it.en || '').trim(),
        zh: String(it.zh || '').trim(),
        scene: String(it.scene || '通用').trim(),
        priority: Number(it.priority) || i + 1,
      })).filter((it) => it.en),
      ts: Date.now(),
    };
    persistLearner();
    renderLearnCenter();
    switchSidebarTab('learn');
    addMessage('system', '✅ 已生成「' + (goal ? goal.label : '') + '」核心表达 ' + learner.coreByGoal[learner.goal].items.length + ' 条。', null, null);
  } catch (err) {
    addMessage('system', '⚠️ 生成核心词失败：' + err.message, null, null);
  } finally {
    turnBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = '核心 100 词'; }
  }
}

function pickHabitPersonaScenario() {
  const meta = GOAL_META[learner.goal] || GOAL_META.work;
  const ids = meta.personaIds || ['dave'];
  let persona = PERSONAS.find((p) => p.id === ids[0]) || PERSONAS[0];
  // rotate by day among allowed personas
  const day = Math.floor(Date.now() / 86400000);
  persona = PERSONAS.find((p) => p.id === ids[day % ids.length]) || persona;
  const scn = persona.scenarios[day % persona.scenarios.length];
  return { persona, scenario: scn };
}

function markHabitDone() {
  const today = todayKey();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();
  if (learner.habit.lastDate === today && learner.habit.todayDone) {
    // already counted
  } else if (learner.habit.lastDate === yesterday) {
    learner.habit.streak = (learner.habit.streak || 0) + 1;
  } else if (learner.habit.lastDate !== today) {
    learner.habit.streak = 1;
  }
  learner.habit.lastDate = today;
  learner.habit.todayDone = true;
  persistLearner();
  renderLearnCenter();
}

async function startDailyHabit() {
  if (!ensureApiKey()) return;
  switchSidebarTab('learn');

  // ensure core phrases exist (use cache if any)
  let pack = learner.coreByGoal[learner.goal];
  if (!pack || !pack.items || !pack.items.length) {
    addMessage('system', '先为你生成今日要用的核心表达…', null, null);
    await generateCore100(true);
    pack = learner.coreByGoal[learner.goal];
  }

  const items = (pack && pack.items) ? pack.items.slice().sort((a, b) => (a.priority || 0) - (b.priority || 0)).slice(0, 5) : [];
  const { persona, scenario } = pickHabitPersonaScenario();
  const planHint = learner.plan && learner.plan.dailyHabit ? learner.plan.dailyHabit : '说 8 分钟 · 听 5 分钟 · 读/跟读 4 分钟 · 复习收藏 3 分钟';

  // show habit card in chat
  const card = document.createElement('div');
  card.className = 'msg system';
  const box = document.createElement('div');
  box.className = 'habit-card';
  let body = '<h4>⏱ 今日 20 分钟习惯</h4>';
  body += '<div>水平 ' + escapeHtml(LEVEL_LABEL[learner.level] || '') + ' · 目标 ' + escapeHtml((GOAL_META[learner.goal] || {}).label || '') + '</div>';
  body += '<ul class="habit-steps">';
  body += '<li><b>0–3 分 · 听读</b>：跟读下面 5 个高优先级表达</li>';
  const dueN = getReviewStats().due;
  body += '<li><b>复习</b>：收藏里 FSRS 待复习 <b>' + dueN + '</b> 张' + (dueN ? '（点「开始复习」）' : '') + '</li>';
  body += '<li><b>3–15 分 · 真对话</b>：进入「' + escapeHtml(persona.name) + ' · ' + escapeHtml(scenario.name) + '」立刻纠错</li>';
  body += '<li><b>15–20 分 · 复盘</b>：点「结束复盘」巩固今日表达</li>';
  body += '</ul>';
  body += '<div style="margin-top:8px;color:var(--muted)">建议节奏：' + escapeHtml(planHint) + '</div>';
  if (items.length) {
    body += '<div style="margin-top:10px"><b>今日 5 词</b></div>';
    items.forEach((it, i) => {
      body += '<div class="core-item" style="border:none;padding:4px 0"><span class="pri">' + (i + 1) + '</span><div><div class="en">' + escapeHtml(it.en) + '</div><div class="zh">' + escapeHtml(it.zh || '') + '</div></div></div>';
    });
  }
  box.innerHTML = body;
  const actions = document.createElement('div');
  actions.className = 'corr-actions';
  const speakWarm = document.createElement('button');
  speakWarm.type = 'button';
  speakWarm.className = 'mini-btn';
  speakWarm.textContent = '🔊 跟读今日 5 词';
  speakWarm.addEventListener('click', () => {
    items.forEach((it) => { if (it.en) speakQueue.push(it.en); });
    if (!speakingAll) drainSpeakQueueFromHabit();
  });
  const goPractice = document.createElement('button');
  goPractice.type = 'button';
  goPractice.className = 'mini-btn';
  goPractice.textContent = '开始真对话 →';
  goPractice.addEventListener('click', () => {
    personaSelect.value = persona.id;
    currentPersona = persona;
    $('brand-avatar').textContent = persona.icon;
    renderScenarioOptions();
    startSession(scenario.id);
    markHabitDone();
  });
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'mini-btn';
  doneBtn.textContent = '标记今日完成';
  doneBtn.addEventListener('click', () => {
    markHabitDone();
    addMessage('system', '✅ 今日 20 分钟已记上。连续 ' + learner.habit.streak + ' 天。', null, null);
  });
  actions.appendChild(speakWarm);
  actions.appendChild(goPractice);
  actions.appendChild(doneBtn);
  box.appendChild(actions);
  card.appendChild(box);
  if (welcomeEl) welcomeEl.classList.add('hidden');
  chatEl.appendChild(card);
  scrollToBottom();
  closeMobileDrawer();
}

function drainSpeakQueueFromHabit() {
  if (!speakQueue.length || !window.speechSynthesis) return;
  speakListenId += 1;
  cancelHandsfreeListen();
  ttsGen += 1;
  const gen = ttsGen;
  speakingAll = true;
  updateSpeakAllBtn();
  startTtsWatchdog();
  try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  setTimeout(() => drainSpeakQueue(gen), 80);
}

/* ---------------------------- 语音输出 ------------------------------ */
let cachedVoice = null;
function pickVoice() {
  const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /female|samantha|zira|google us english/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
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
let currentSpeakPromise = null;

function makeUtterance(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  const v = cachedVoice || pickVoice();
  if (v) u.voice = v;
  u.rate = 1.0;
  return u;
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
    if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      speechSynthesis.resume();
    }
  }, 8000);
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
  stopTtsWatchdog();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  updateSpeakAllBtn();
}

function drainSpeakQueue(gen) {
  if (gen !== ttsGen) return;
  if (!speakQueue.length) {
    speakingAll = false;
    stopTtsWatchdog();
    updateSpeakAllBtn();
    return;
  }
  const text = speakQueue.shift();
  try {
    const u = makeUtterance(text);
    u.onend = () => { if (gen === ttsGen) setTimeout(() => drainSpeakQueue(gen), 280); };
    u.onerror = () => { if (gen === ttsGen) setTimeout(() => drainSpeakQueue(gen), 280); };
    speechSynthesis.speak(u);
  } catch (e) {
    if (gen === ttsGen) setTimeout(() => drainSpeakQueue(gen), 280);
  }
}

function speakAllPhrases() {
  if (speakingAll) {
    stopSpeakAll();
    return;
  }
  if (!phrases.length || !window.speechSynthesis) return;
  speakListenId += 1;
  cancelHandsfreeListen();
  ttsGen += 1;
  ttsActive = false;
  const gen = ttsGen;
  speakingAll = true;
  speakQueue = phrases.map((p) => p.en).filter(Boolean);
  updateSpeakAllBtn();
  startTtsWatchdog();
  try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  // cancel 在部分浏览器是异步的，稍后再排队
  setTimeout(() => drainSpeakQueue(gen), 80);
}

function stopTTS() {
  ttsGen += 1;
  ttsActive = false;
  speakQueue = [];
  speakingAll = false;
  stopTtsWatchdog();
  updateSpeakAllBtn();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

function isTtsPlaying() {
  if (ttsActive) return true;
  try {
    return !!(window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending));
  } catch (e) {
    return false;
  }
}

function speak(text) {
  const p = new Promise((resolve) => {
    let settled = false;
    let safety = null;
    let gen = ttsGen;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (safety) clearTimeout(safety);
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
    speakQueue = [];
    speakingAll = false;
    stopTtsWatchdog();
    updateSpeakAllBtn();
    safety = setTimeout(finish, Math.min(60000, 2500 + String(text).length * 70));
    try {
      speechSynthesis.cancel();
      setTimeout(() => {
        if (gen !== ttsGen) { finish(); return; }
        try {
          const u = makeUtterance(text);
          u.onend = finish;
          u.onerror = finish;
          speechSynthesis.speak(u);
        } catch (e) { finish(); }
      }, 60);
    } catch (e) { finish(); }
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
  if (isRecording && recognition) {
    try { recognition.stop(); } catch (e) { /* ignore */ }
  }
}

function scheduleHandsfreeListen() {
  if (!config.handsfree || turnBusy) return;
  cancelHandsfreeListen();
  handsfreeTimer = setTimeout(() => {
    handsfreeTimer = null;
    if (!config.handsfree || turnBusy || isRecording) return;
    startMic('handsfree');
  }, 450);
}

async function speakThenMaybeListen(text) {
  const id = ++speakListenId;
  await speak(text);
  if (id !== speakListenId) return;
  if (config.handsfree && !turnBusy && !isRecording) scheduleHandsfreeListen();
}

function updateMicStatus() {
  const el = $('mic-status');
  const btn = $('btn-mic');
  if (btn) btn.classList.toggle('handsfree-on', !!config.handsfree);
  if (!el) return;
  if (config.handsfree) {
    el.textContent = isRecording ? '免提中 · 正在听你说…' : '免提模式已开 · 对方说完会自动听你说';
  } else {
    el.textContent = '点击 🎤 开始说话（需要 localhost 或 HTTPS）';
  }
}

/* ---------------------------- 语音输入 ------------------------------ */
let recognition = null;
let isRecording = false;
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    let final = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    inputEl.value = (final + ' ' + interim).trim();
    autoResize();
  };
  r.onend = () => {
    isRecording = false;
    $('btn-mic').classList.remove('recording');
    updateMicStatus();
    const err = lastRecError;
    lastRecError = '';
    const spoken = inputEl.value.trim();
    if (err === 'aborted' || err === 'not-allowed') return;
    if (spoken) {
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
  };
  r.onerror = (e) => {
    lastRecError = e.error || '';
    isRecording = false;
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

function startMic(source) {
  if (turnBusy) {
    if (source !== 'handsfree') {
      addMessage('system', '对方还在回复，请稍后再说。', null, null);
    }
    return;
  }
  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    addMessage('system', '当前浏览器不支持语音识别（Web Speech API），请用 Chrome / Edge，并走 localhost 或 HTTPS。', null, null);
    return;
  }
  speakListenId += 1;
  cancelHandsfreeListen();
  stopTTS();
  if (!recognition) recognition = setupRecognition();
  if (isRecording) return;
  micSource = source || 'manual';
  isRecording = true;
  $('btn-mic').classList.add('recording');
  updateMicStatus();
  try { recognition.start(); } catch (e) {
    isRecording = false;
    $('btn-mic').classList.remove('recording');
    updateMicStatus();
  }
}

function toggleMic() {
  if (isRecording) {
    speakListenId += 1;
    cancelHandsfreeListen();
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
  messages.forEach((m) => {
    session.messages.push({
      role: m.role,
      text: m.text,
      correction: m.correction,
      focus: m.focus,
    });
    renderMessage(m.role, m.text, m.correction, m.focus);
  });
  scrollToBottom();
  inputEl.focus();
}

/* ---------------------------- FSRS 复习 ------------------------------ */
let reviewQueue = [];
let reviewIdx = 0;
let reviewActive = false;

function phraseDueDate(p) {
  const c = hydrateFsrsCard(p.card);
  return c.due;
}

function isPhraseDue(p, now) {
  const due = phraseDueDate(p);
  return due.getTime() <= (now || Date.now());
}

function isPhraseNew(p) {
  const c = hydrateFsrsCard(p.card);
  return (c.state === 0 && c.reps === 0) || (window.tsfsrs && c.state === window.tsfsrs.State.New && c.reps === 0);
}

function getReviewStats() {
  const now = Date.now();
  let due = 0;
  let neu = 0;
  phrases.forEach((p) => {
    if (isPhraseNew(p)) neu += 1;
    if (isPhraseDue(p, now)) due += 1;
  });
  return { due, neu, total: phrases.length };
}

function formatDueLabel(p) {
  const c = hydrateFsrsCard(p.card);
  if (isPhraseNew(p)) return { text: '新卡 · 待学', cls: 'due-new' };
  const now = Date.now();
  const diffMs = c.due.getTime() - now;
  if (diffMs <= 0) return { text: '到期 · 该复习了', cls: 'due-now' };
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return { text: mins + ' 分钟后', cls: '' };
  const hours = Math.round(mins / 60);
  if (hours < 48) return { text: hours + ' 小时后', cls: '' };
  const days = Math.round(hours / 24);
  return { text: days + ' 天后', cls: '' };
}

function buildDueQueue() {
  const now = Date.now();
  return phrases
    .map((p, idx) => ({ p, idx, due: phraseDueDate(p).getTime() }))
    .filter((x) => x.due <= now)
    .sort((a, b) => a.due - b.due);
}

function updateReviewStatsUi() {
  const el = $('review-stats');
  const btn = $('btn-start-review');
  if (!el) return;
  const s = getReviewStats();
  el.innerHTML = '待复习 <strong>' + s.due + '</strong> · 新卡 ' + s.neu + ' · 共 ' + s.total;
  if (btn) {
    btn.disabled = s.due === 0;
    btn.textContent = reviewActive ? '结束复习' : (s.due ? '开始复习 (' + s.due + ')' : '暂无到期');
  }
}

function stopReviewSession() {
  reviewActive = false;
  reviewQueue = [];
  reviewIdx = 0;
  const stage = $('review-stage');
  if (stage) {
    stage.classList.add('hidden');
    stage.innerHTML = '';
  }
  updateReviewStatsUi();
}

function startReviewSession() {
  if (!ensureFsrsApi()) {
    addMessage('system', 'FSRS 还在加载，请稍后再点「开始复习」。', null, null);
    return;
  }
  if (reviewActive) {
    stopReviewSession();
    return;
  }
  reviewQueue = buildDueQueue();
  if (!reviewQueue.length) {
    addMessage('system', '今天没有到期卡片。先收藏几句地道表达，或稍后再来。', null, null);
    updateReviewStatsUi();
    return;
  }
  reviewActive = true;
  reviewIdx = 0;
  switchSidebarTab('phrasebook');
  renderCurrentReviewCard();
  updateReviewStatsUi();
}

function renderCurrentReviewCard() {
  const stage = $('review-stage');
  if (!stage) return;
  if (!reviewActive || reviewIdx >= reviewQueue.length) {
    stopReviewSession();
    addMessage('system', '✅ 本轮复习完成。', null, null);
    renderPhrasebook();
    return;
  }
  const item = reviewQueue[reviewIdx];
  const p = phrases[item.idx];
  if (!p) {
    reviewIdx += 1;
    renderCurrentReviewCard();
    return;
  }
  const card = hydrateFsrsCard(p.card);
  const preview = window.tsfsrs.scheduler.repeat(card, new Date());
  const Rating = window.tsfsrs.Rating;
  const dueHint = (rating) => {
    const next = preview[rating].card;
    const mins = Math.max(0, Math.round((next.due.getTime() - Date.now()) / 60000));
    if (mins < 60) return mins + ' 分钟后';
    const h = Math.round(mins / 60);
    if (h < 48) return h + ' 小时后';
    return Math.round(h / 24) + ' 天后';
  };

  stage.classList.remove('hidden');
  stage.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'rv-label';
  label.textContent = 'FSRS 复习 ' + (reviewIdx + 1) + ' / ' + reviewQueue.length +
    (isPhraseNew(p) ? ' · 新卡' : ' · 复习');
  const en = document.createElement('div');
  en.className = 'rv-en';
  en.textContent = p.en;
  const meta = document.createElement('div');
  meta.className = 'rv-meta';
  meta.textContent = (p.scenarioName || '') + (p.note ? ' · ' + p.note : '');
  stage.appendChild(label);
  stage.appendChild(en);
  stage.appendChild(meta);
  if (p.mnemonic) {
    const hint = document.createElement('div');
    hint.className = 'rv-hint';
    hint.textContent = '🧠 ' + p.mnemonic;
    stage.appendChild(hint);
  }
  const speakRow = document.createElement('div');
  speakRow.style.marginBottom = '10px';
  const spk = document.createElement('button');
  spk.type = 'button';
  spk.className = 'btn btn-ghost';
  spk.textContent = '🔊 朗读 / 跟读';
  spk.addEventListener('click', () => speak(p.en));
  speakRow.appendChild(spk);
  stage.appendChild(speakRow);

  const grades = document.createElement('div');
  grades.className = 'review-grades';
  const mk = (cls, title, sub, rating) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'g-btn ' + cls;
    b.innerHTML = title + '<small>' + sub + ' · ' + dueHint(rating) + '</small>';
    b.addEventListener('click', () => rateCurrentReview(rating));
    return b;
  };
  grades.appendChild(mk('g-again', 'Again 忘记', '重来', Rating.Again));
  grades.appendChild(mk('g-hard', 'Hard 勉强', '有点难', Rating.Hard));
  grades.appendChild(mk('g-good', 'Good 记得', '正常', Rating.Good));
  grades.appendChild(mk('g-easy', 'Easy 太熟', '轻松', Rating.Easy));
  stage.appendChild(grades);
  speak(p.en);
}

function rateCurrentReview(rating) {
  if (!reviewActive || !ensureFsrsApi()) return;
  const item = reviewQueue[reviewIdx];
  if (!item) return;
  const p = phrases[item.idx];
  if (!p) return;
  const now = new Date();
  const current = hydrateFsrsCard(p.card);
  const result = window.tsfsrs.scheduler.next(current, now, rating);
  p.card = serializeFsrsCard(result.card);
  persistOrWarn('dave_phrasebook', phrases);
  reviewIdx += 1;
  renderPhrasebook();
  renderCurrentReviewCard();
}

function renderPhrasebook() {
  const el = $('phrasebook-list');
  updateSpeakAllBtn();
  updateReviewStatsUi();
  if (!phrases.length) {
    el.innerHTML = '<div class="empty">还没有收藏。点纠错卡片的 ☆ 收藏地道表达，再用 FSRS 复习。</div>';
    return;
  }
  el.innerHTML = '';
  // due first
  const ordered = phrases
    .map((p, idx) => ({ p, idx, due: phraseDueDate(p).getTime() }))
    .sort((a, b) => a.due - b.due);

  ordered.forEach(({ p, idx }) => {
    const card = document.createElement('div');
    card.className = 'phrase-card';
    card.innerHTML = `<div class="en">${escapeHtml(p.en)}</div>`;
    if (p.note) {
      const note = document.createElement('div');
      note.className = 'zh';
      note.style.cssText = 'color:var(--muted);font-size:12px;margin-top:2px';
      note.textContent = p.note;
      card.appendChild(note);
    }
    if (p.mnemonic) {
      const mem = document.createElement('div');
      mem.className = 'mnemonic';
      mem.textContent = '🧠 ' + p.mnemonic;
      card.appendChild(mem);
    }
    const due = formatDueLabel(p);
    const dueEl = document.createElement('div');
    dueEl.className = 'due ' + due.cls;
    dueEl.textContent = '📅 ' + due.text;
    card.appendChild(dueEl);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${escapeHtml(p.scenarioName || '')}</span>`;
    const actions = document.createElement('span');
    actions.className = 'p-acts';
    const spk = document.createElement('button');
    spk.className = 'speak'; spk.textContent = '🔊'; spk.title = '朗读';
    spk.addEventListener('click', () => speak(p.en));
    const pron = document.createElement('button');
    pron.textContent = '发音'; pron.title = '练发音';
    pron.addEventListener('click', () => coachPronunciation(p.en));
    const memo = document.createElement('button');
    memo.textContent = '记忆法'; memo.title = '一次记住';
    memo.addEventListener('click', async () => {
      const tip = await coachMnemonic(p.en);
      if (tip && !tip.startsWith('生成失败')) {
        phrases[idx].mnemonic = tip.slice(0, 280);
        persistOrWarn('dave_phrasebook', phrases);
        renderPhrasebook();
      }
    });
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '删除';
    del.addEventListener('click', () => {
      phrases.splice(idx, 1);
      persistOrWarn('dave_phrasebook', phrases);
      if (reviewActive) stopReviewSession();
      renderPhrasebook();
      updateSpeakAllBtn();
    });
    actions.appendChild(spk);
    actions.appendChild(pron);
    actions.appendChild(memo);
    actions.appendChild(del);
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
function openSettings() {
  $('cfg-base').value = config.base;
  $('cfg-key').value = config.key;
  $('cfg-model').value = config.model;
  $('cfg-temp').value = config.temp;
  $('cfg-json').checked = config.json;
  if ($('cfg-stream')) $('cfg-stream').checked = config.stream !== false;
  if ($('cfg-handsfree')) $('cfg-handsfree').checked = !!config.handsfree;
  $('settings-overlay').classList.remove('hidden');
}
function closeSettings() { $('settings-overlay').classList.add('hidden'); }

function saveSettings() {
  const prevHandsfree = !!config.handsfree;
  config.base = $('cfg-base').value.trim();
  config.key = $('cfg-key').value.trim();
  config.model = $('cfg-model').value.trim();
  config.temp = Number($('cfg-temp').value);
  config.json = $('cfg-json').checked;
  config.stream = $('cfg-stream') ? $('cfg-stream').checked : true;
  config.handsfree = $('cfg-handsfree') ? $('cfg-handsfree').checked : false;
  persistOrWarn('dave_config', config);
  closeSettings();
  updateMicStatus();
  addMessage('system', '✅ 设置已保存（Key 仅存本机浏览器）。', null, null);
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
  };
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
  inputEl.addEventListener('input', autoResize);

  $('btn-mic').addEventListener('click', toggleMic);
  $('btn-new').addEventListener('click', () => { startSession(scenarioSelect.value || currentPersona.scenarios[0].id); });
  $('btn-review').addEventListener('click', endReview);
  if ($('btn-habit')) $('btn-habit').addEventListener('click', () => startDailyHabit());

  $('btn-settings').addEventListener('click', openSettings);
  $('btn-close-settings').addEventListener('click', closeSettings);
  $('btn-save').addEventListener('click', saveSettings);
  $('btn-test').addEventListener('click', testConnection);

  $('settings-overlay').addEventListener('click', (e) => {
    if (e.target === $('settings-overlay')) closeSettings();
  });

  if ($('btn-close-coach')) $('btn-close-coach').addEventListener('click', closeCoachModal);
  if ($('btn-close-coach-2')) $('btn-close-coach-2').addEventListener('click', closeCoachModal);
  if ($('coach-overlay')) {
    $('coach-overlay').addEventListener('click', (e) => {
      if (e.target === $('coach-overlay')) closeCoachModal();
    });
  }
  if ($('btn-coach-speak')) {
    $('btn-coach-speak').addEventListener('click', () => {
      if (coachSpeakText) speak(coachSpeakText);
    });
  }

  document.querySelectorAll('#level-seg .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLearnerLevel(btn.dataset.level));
  });
  document.querySelectorAll('#goal-seg .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLearnerGoal(btn.dataset.goal));
  });
  if ($('btn-gen-plan')) $('btn-gen-plan').addEventListener('click', () => generateFourWeekPlan());
  if ($('btn-gen-core')) $('btn-gen-core').addEventListener('click', () => generateCore100(false));
  if ($('btn-start-habit')) $('btn-start-habit').addEventListener('click', () => startDailyHabit());
  if ($('btn-start-review')) $('btn-start-review').addEventListener('click', () => startReviewSession());

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
}

function switchSidebarTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  if ($('tab-learn')) $('tab-learn').classList.toggle('hidden', name !== 'learn');
  $('tab-phrasebook').classList.toggle('hidden', name !== 'phrasebook');
  $('tab-history').classList.toggle('hidden', name !== 'history');
  document.querySelectorAll('.dock-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.openTab === name);
  });
  if (name === 'learn') renderLearnCenter();
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
  renderLearnCenter();
  renderPhrasebook();
  renderHistory();
  bindEvents();
  updateSpeakAllBtn();
  updateMicStatus();
  waitForFsrs(5000).then((ok) => {
    if (ok) {
      // re-hydrate any cards that were created before FSRS loaded
      phrases = sanitizePhraseList(phrases);
      persistOrWarn('dave_phrasebook', phrases);
      renderPhrasebook();
    }
  });
  if (!config.key) {
    addMessage('system', '👋 欢迎。先点右上角「⚙ 设置」填入 API Key，再到侧栏「学习」定级/定目标，或直接选场景开练。', null, null);
  } else if (!learner.plan) {
    addMessage('system', '💡 打开侧栏「学习」：选水平与目标 → 生成 4 周计划 → 用「今日 20 分钟」开练。收藏表达可用 FSRS 间隔复习。', null, null);
  }
}

init();
