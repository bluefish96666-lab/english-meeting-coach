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
  industry: 'none',
};

const MAX_TOKENS = 800;
const HISTORY_MSG_CAP = 40;
const HISTORY_TEXT_CAP = 1800;
const HISTORY_CORR_CAP = 800;

/* ------------------------------ 状态 -------------------------------- */
let config = { ...DEFAULT_CONFIG, ...store.get('dave_config', {}) };
let currentPersona = PERSONAS[0];
let session = null; // { id, persona, scenario, messages: [{role,text,correction?,focus?}] }
let phrases = sanitizePhraseList(store.get('dave_phrasebook', []));
let history = sanitizeHistoryList(store.get('dave_history', []));
let turnBusy = false;
let requestGen = 0;

const shadowState = {
  active: false,
  index: 0,
  lines: [],
  listening: false,
};

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
  return {
    en,
    scenarioName: String(p.scenarioName == null ? '' : p.scenarioName),
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
    '<button type="button" class="btn btn-primary" id="btn-start-shadow">跟读 · 会议节奏</button>' +
    '</div>' +
    '<p class="welcome-note">对练前可先打开侧栏「句型」热身；设置里可开 3 秒开口 / 严格纠错。</p>' +
    '<ul class="welcome-list"></ul>';
  const list = welcomeEl.querySelector('.welcome-list');
  currentPersona.scenarios.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${i + 1}.</strong> ${escapeHtml(s.name)} <span style="color:var(--muted);font-size:12px">— ${escapeHtml(s.desc)}</span>`;
    li.addEventListener('click', () => startSession(s.id));
    list.appendChild(li);
  });
  const shadowBtn = welcomeEl.querySelector('#btn-start-shadow');
  if (shadowBtn) shadowBtn.addEventListener('click', startShadowing);
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

  if (correction) {
    wrap.appendChild(buildCorrectionCard(correction, focus, errors));
  }
  chatEl.appendChild(wrap);
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
  if (correction) {
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
  if (shadowState.active) return;
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
    const { reply, correction, focus, errors } = picked;

    if (streamUi) {
      finalizeStreamingDave(streamUi, reply, correction, focus, errors);
    } else {
      addMessage('dave', reply, correction, focus, errors);
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
  clearChallenge();
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

function makeUtterance(text, opts) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  const v = cachedVoice || pickVoice();
  if (v) u.voice = v;
  const rate = opts && opts.rate != null ? Number(opts.rate) : 1.0;
  u.rate = Number.isFinite(rate) && rate > 0 ? rate : 1.0;
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

function speak(text, opts) {
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
          const u = makeUtterance(text, opts);
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
    if (err === 'aborted' || err === 'not-allowed') {
      shadowState.listening = false;
      return;
    }
    if (shadowState.active && micSource === 'shadow') {
      shadowState.listening = false;
      handleShadowTranscript(spoken, err);
      return;
    }
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
  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    addMessage('system', '当前浏览器不支持语音识别（Web Speech API），请用 Chrome / Edge，并走 localhost 或 HTTPS。', null, null);
    return;
  }
  if (source !== 'shadow') markChallengeOpened();
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
    card.innerHTML = `<div class="en">${escapeHtml(p.en)}</div>`;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${escapeHtml(p.scenarioName || '')}</span>`;
    const actions = document.createElement('span');
    const spk = document.createElement('button');
    spk.className = 'speak'; spk.textContent = '🔊'; spk.title = '朗读';
    spk.addEventListener('click', () => speak(p.en));
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '删除';
    del.addEventListener('click', () => {
      phrases.splice(idx, 1);
      persistOrWarn('dave_phrasebook', phrases);
      renderPhrasebook();
      updateSpeakAllBtn();
    });
    actions.appendChild(spk); actions.appendChild(del);
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
  if ($('cfg-industry')) $('cfg-industry').value = config.industry || 'none';
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
  config.strict = $('cfg-strict') ? $('cfg-strict').checked : false;
  config.threeSecond = $('cfg-threesecond') ? $('cfg-threesecond').checked : false;
  config.industry = $('cfg-industry') ? ($('cfg-industry').value || 'none') : 'none';
  persistOrWarn('dave_config', config);
  closeSettings();
  updateMicStatus();
  renderTemplates();
  addMessage('system', '✅ 设置已保存（Key 仅存本机浏览器）。', null, null);
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
    industry: $('cfg-industry') ? ($('cfg-industry').value || 'none') : config.industry,
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
  const actions = document.createElement('div');
  actions.className = 'tpl-actions';
  const fill = document.createElement('button');
  fill.type = 'button';
  fill.textContent = '填入';
  fill.addEventListener('click', () => insertIntoInput(item.en));
  const shadowOne = document.createElement('button');
  shadowOne.type = 'button';
  shadowOne.textContent = '跟读';
  shadowOne.addEventListener('click', () => speak(item.en, { rate: 0.95 }));
  actions.appendChild(fill);
  actions.appendChild(shadowOne);
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

function renderShadowLine() {
  const total = shadowState.lines.length || 1;
  const idx = Math.min(shadowState.index, total - 1);
  const line = shadowState.lines[idx] || { en: '', zh: '' };
  $('shadow-step-label').textContent = (idx + 1) + ' / ' + total;
  $('shadow-progress-fill').style.width = (((idx + 1) / total) * 100).toFixed(1) + '%';
  $('shadow-zh').textContent = line.zh || '';
  $('shadow-en').textContent = line.en || '';
  setShadowFeedback('', null);
}

function startShadowing() {
  clearChallenge();
  pauseHandsfree();
  session = null;
  resetChatView(false);
  welcomeEl.classList.add('hidden');
  if (chatEl) chatEl.classList.add('hidden');
  const panel = $('shadow-panel');
  if (panel) panel.classList.remove('hidden');
  shadowState.active = true;
  shadowState.index = 0;
  shadowState.listening = false;
  shadowState.lines = (typeof SHADOWING_LINES !== 'undefined' ? SHADOWING_LINES : []).slice();
  if (!shadowState.lines.length) {
    setShadowFeedback('跟读句子未加载。', 'bad');
    return;
  }
  renderShadowLine();
  inputEl.value = '';
  autoResize();
}

function exitShadowing(opts) {
  const wasActive = shadowState.active;
  shadowState.active = false;
  shadowState.listening = false;
  shadowState.index = 0;
  const panel = $('shadow-panel');
  if (panel) panel.classList.add('hidden');
  if (chatEl) chatEl.classList.remove('hidden');
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
  setShadowFeedback('正在听你跟读…', null);
  startMic('shadow');
}

function handleShadowTranscript(spoken, err) {
  if (!shadowState.active) return;
  const line = shadowState.lines[shadowState.index];
  if (!line) return;
  if (!spoken) {
    setShadowFeedback(err === 'no-speech' ? '没听清，再来一遍。' : '没听到内容，点「跟读」再试。', 'bad');
    return;
  }
  const result = scoreShadow(line.en, spoken);
  if (result.score >= 0.7) {
    setShadowFeedback(
      '跟上了（约 ' + Math.round(result.score * 100) + '% 词命中）。可以下一句。',
      'ok'
    );
  } else {
    const miss = result.missing.length ? '漏了：' + result.missing.join(', ') : '节奏偏了';
    setShadowFeedback(
      '再跟一遍。命中约 ' + Math.round(result.score * 100) + '%。' + miss,
      'bad'
    );
  }
  inputEl.value = '';
  autoResize();
}

function nextShadowLine() {
  if (!shadowState.active) return;
  if (shadowState.index >= shadowState.lines.length - 1) {
    setShadowFeedback('本组跟读完成。可以退出，或点「再来一遍」从第一句重练。', 'ok');
    return;
  }
  shadowState.index += 1;
  renderShadowLine();
}

function retryShadowLine() {
  if (!shadowState.active) return;
  if (shadowState.index >= shadowState.lines.length - 1 &&
      $('shadow-feedback') && /完成/.test($('shadow-feedback').textContent || '')) {
    shadowState.index = 0;
  }
  renderShadowLine();
  playShadowLine();
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
