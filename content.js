/* =========================================================================
 * 会议语块 / 行业行话 / 跟读文本（静态内容）
 * 语块（chunk）= 可以整块调取的固定表达。每张卡：模板 + 中文 + 例句 + 变形句。
 * ========================================================================= */

'use strict';

const MEETING_TEMPLATES = [
  {
    id: 'help',
    label: '求助',
    en: "I'm trying to... but could you help me with...?",
    zh: '说明自己在做什么，并请求对方帮一把',
    example: "I'm trying to fix the login bug, but could you help me with the token flow?",
    variant: "I'm stuck on the token flow — could you take a quick look?",
    cue: '你在修登录 bug，想请对方帮你看 token 流程',
  },
  {
    id: 'opinion',
    label: '观点',
    en: 'Actually, I think... because...',
    zh: '先表态，再给一个简短理由',
    example: 'Actually, I think we should cut scope, because the timeline is already tight.',
    variant: "Honestly, I'd cut scope first — the timeline is too tight.",
    cue: '表态：应该先砍范围，因为时间已经很紧',
  },
  {
    id: 'suggest',
    label: '建议',
    en: 'What if we...? That way we can...',
    zh: '提出方案，并点出好处',
    example: 'What if we ship an MVP on Friday? That way we can get feedback sooner.',
    variant: 'How about an MVP on Friday, so we get feedback sooner?',
    cue: '建议周五先上 MVP，这样能更早拿到反馈',
  },
  {
    id: 'experience',
    label: '经验',
    en: 'From my experience,...',
    zh: '用过往经验支撑判断',
    example: 'From my experience, rushing the launch creates more support load later.',
    variant: "In my experience, a rushed launch just means more support tickets.",
    cue: '用经验说：赶着上线后面会有更多支持负担',
  },
  {
    id: 'rebuttal',
    label: '礼貌反驳',
    en: "Correct me if I'm wrong, but...",
    zh: '温和地提出不同看法',
    example: "Correct me if I'm wrong, but the client asked for reliability, not more features.",
    variant: "I might be missing something, but wasn't reliability the ask?",
    cue: '礼貌反驳：客户要的是可靠性，不是更多功能',
  },
  {
    id: 'align',
    label: '对齐',
    en: "Just to make sure we're aligned — are we saying...?",
    zh: '确认双方理解一致',
    example: "Just to make sure we're aligned — are we saying Monday is the hard date?",
    variant: 'So to confirm: Monday is the hard deadline, right?',
    cue: '确认对齐：周一是硬截止日期吗',
  },
  {
    id: 'delay',
    label: '延期',
    en: "We're going to need more time. The blocker is..., so the new date would be...",
    zh: '说明卡点，并给出新日期',
    example: "We're going to need more time. The blocker is the vendor API, so the new date would be Thursday.",
    variant: "We'll need until Thursday — the vendor API is blocking us.",
    cue: '说明需要延期：卡在供应商 API，新日期周四',
  },
  {
    id: 'clarify',
    label: '澄清',
    en: 'Can I clarify that for a second? What I meant was...',
    zh: '打断后重新说清楚自己的意思',
    example: 'Can I clarify that for a second? What I meant was we pause, not cancel.',
    variant: 'Let me rephrase — I meant pause, not cancel.',
    cue: '澄清：我的意思是暂停，不是取消',
  },
  {
    id: 'commit',
    label: '承诺',
    en: "I'll own that. You'll have an update by...",
    zh: '认领事项并给出时间点',
    example: "I'll own that. You'll have an update by 4pm today.",
    variant: "That's on me — I'll update you by 4pm.",
    cue: '认领任务，承诺今天 4 点前给更新',
  },
  {
    id: 'pushback',
    label: '推回',
    en: 'I hear you, but if we do that, we risk.... Can we prioritize... instead?',
    zh: '承认对方关切，再提出替代方案',
    example: 'I hear you, but if we do that, we risk breaking checkout. Can we prioritize the fix instead?',
    variant: 'Fair point, but that could break checkout — can the fix go first?',
    cue: '推回：那样会有弄坏结账的风险，能否先做修复',
  },
];

const INDUSTRY_PACKS = {
  none: {
    id: 'none',
    label: '通用（不注入行话）',
    jargon: [],
  },
  it: {
    id: 'it',
    label: 'IT / 工程',
    jargon: [
      {
        en: "Let's circle back to the pain points and align the deliverables.",
        zh: '回到痛点，对齐交付物',
      },
      {
        en: "We're blocked on the API contract — can we unlock that today?",
        zh: '卡在接口约定上，今天能否解开',
      },
      {
        en: "I'll ship a hotfix first, then we refactor the root cause.",
        zh: '先热修，再改根因',
      },
      {
        en: "That's a dependency risk. What's our fallback if the vendor slips?",
        zh: '有依赖风险，供应商延期时的兜底是什么',
      },
      {
        en: 'Can we spike this for half a day before we commit to the estimate?',
        zh: '先花半天摸底再给估时',
      },
      {
        en: "Let's put that on the backlog and keep the scope tight for this sprint.",
        zh: '先放 backlog，本迭代保持范围紧凑',
      },
      {
        en: "I'll pair with you on the regression before we merge.",
        zh: '合并前一起过回归',
      },
      {
        en: 'The latency spike correlates with the cache miss rate.',
        zh: '延迟飙升和缓存未命中相关',
      },
    ],
  },
  product: {
    id: 'product',
    label: '产品',
    jargon: [
      {
        en: "What's the user problem we're actually solving here?",
        zh: '我们真正要解决的用户问题是什么',
      },
      {
        en: 'If we cut this, does it still deliver the core value?',
        zh: '砍掉这块后，核心价值还在吗',
      },
      {
        en: "Let's validate with a quick usability test before we build more.",
        zh: '先做一轮可用性验证再继续做',
      },
      {
        en: "I'd rather ship an MVP and iterate than wait for a perfect launch.",
        zh: '宁愿先上 MVP 再迭代',
      },
      {
        en: 'The success metric should be activation, not just feature completion.',
        zh: '成功指标应是激活，而不只是功能做完',
      },
      {
        en: 'Can we timebox discovery to two days and then decide?',
        zh: '发现阶段限两天，然后拍板',
      },
      {
        en: "That's a nice-to-have. Let's protect the must-have path.",
        zh: '那是锦上添花，先保住必做路径',
      },
      {
        en: "I'll write a one-pager so engineering and design stay aligned.",
        zh: '写一页纸让工程和设计对齐',
      },
    ],
  },
  business: {
    id: 'business',
    label: '商务',
    jargon: [
      {
        en: "What's the commercial impact if we miss this date?",
        zh: '错过日期的商业影响是什么',
      },
      {
        en: 'We can meet the timeline if we descope X or add budget for Y.',
        zh: '砍掉 X 或加 Y 的预算，才能赶上时间',
      },
      {
        en: "I'll come back with a revised quote by end of day.",
        zh: '今天结束前给你修订报价',
      },
      {
        en: "Let's lock the scope in writing so we don't reopen it every week.",
        zh: '把范围书面锁定，避免每周重开',
      },
      {
        en: "I'm happy to be flexible on price if we can get a longer commitment.",
        zh: '若能拉长合作期，价格上可以灵活',
      },
      {
        en: 'Before we proceed, can we confirm decision-makers and next steps?',
        zh: '推进前确认决策人和下一步',
      },
      {
        en: "That's outside the original SOW — here's the change request.",
        zh: '超出原 SOW，这是变更请求',
      },
      {
        en: "We'll protect your launch date, but we'll need a firm go/no-go by Friday.",
        zh: '可以保上线日，但周五前要明确 go/no-go',
      },
    ],
  },
};

/* 跟读句：每句 8–12 词、口语语气，一组约 1 分钟 */
const SHADOWING_LINES = [
  {
    en: "Let's get started. What's the impact of the new deadline?",
    zh: '会议开场：先问新截止日期的影响',
  },
  {
    en: 'Actually, I think we should cut scope first.',
    zh: '用「观点语块」先表态',
  },
  {
    en: 'What if we ship an MVP this Friday?',
    zh: '用「建议语块」推进方案',
  },
  {
    en: "Correct me if I'm wrong, but they asked for reliability.",
    zh: '用「礼貌反驳」拉回重点',
  },
  {
    en: "Just to make sure we're aligned — Monday is the hard date?",
    zh: '对齐确认硬截止日期',
  },
  {
    en: "I'll own that. You'll have an update by four.",
    zh: '承诺事项与时间点',
  },
  {
    en: "Let's circle back to the pain points after lunch.",
    zh: 'IT 行话：稍后回到痛点',
  },
  {
    en: 'From my experience, rushing the launch costs more later.',
    zh: '用经验支撑判断',
  },
];

/* 半句暂停：听前半句，猜/补出后半语块（由例句自动切分时可不用手写） */
const HALF_PAUSE_LINES = (typeof MEETING_TEMPLATES !== 'undefined' ? MEETING_TEMPLATES : [])
  .filter((t) => t.example)
  .map((t) => {
    const words = String(t.example).trim().split(/\s+/);
    const cut = Math.max(2, Math.min(words.length - 2, Math.floor(words.length * 0.45)));
    return {
      zh: (t.label ? '【' + t.label + '】' : '') + (t.cue || t.zh || ''),
      en: t.example,
      stem: String(t.en || '').replace(/\.\.\./g, ' '),
      head: words.slice(0, cut).join(' '),
      tail: words.slice(cut).join(' '),
      variant: t.variant || '',
    };
  });

/* 语块教练可选主题（会议向） */
const COACH_TOPICS = [
  { id: 'workload', label: '工作压力 / 排期', hint: 'snowed under, on my plate, push back' },
  { id: 'alignment', label: '对齐与澄清', hint: "just to make sure we're aligned, what I meant was" },
  { id: 'pushback', label: '礼貌反对 / 砍范围', hint: 'correct me if I\'m wrong, what if we' },
  { id: 'update', label: '进度更新与承诺', hint: "I'll own that, you'll have an update by" },
  { id: 'incident', label: '线上故障沟通', hint: 'root cause, mitigation, next update' },
];

/* =========================================================================
 * 会议课卡（Engoo 骨架 + EchoType 情景目标）
 * 流程：Goals → Warm-up → Model dialogue → Practice → Roleplay → Discussion → Further
 * ========================================================================= */
const MEETING_LESSONS = [
  {
    id: 'it-standup-a2',
    title: 'Standup · blockers',
    industry: 'it',
    level: 'A2',
    scenarioTag: 'standup',
    personaHint: 'dave',
    roleplayScenarioId: 'retro',
    goals: [
      '用一句说清昨天完成了什么',
      '点名 blocker，并礼貌求助',
      '承诺下次更新时间',
    ],
    chunks: [
      {
        when: '报昨日进度',
        en: 'Yesterday I finished...',
        zh: '昨天我完成了…',
        example: 'Yesterday I finished the login fix.',
      },
      {
        when: '说明卡点',
        en: "We're blocked on...",
        zh: '我们卡在…',
        example: "We're blocked on the API contract.",
      },
      {
        when: '请求帮忙',
        en: 'Could you help me with...?',
        zh: '你能帮我看一下…吗？',
        example: 'Could you help me with the token flow?',
      },
      {
        when: '承诺更新',
        en: "I'll update you by...",
        zh: '我会在…前给你更新',
        example: "I'll update you by 3pm.",
      },
    ],
    dialogue: [
      { role: 'PM', en: "Quick standup. What did you ship yesterday?" },
      { role: 'You', en: 'Yesterday I finished the login fix and started on the token flow.' },
      { role: 'PM', en: 'Any blockers?' },
      { role: 'You', en: "We're blocked on the API contract. Could you help me unlock that today?" },
      { role: 'PM', en: 'Okay. When can I get an update?' },
      { role: 'You', en: "I'll own that. You'll have an update by 3pm." },
    ],
    opening: "Quick standup. What did you ship yesterday, and what's blocking you?",
    discussion: [
      'What usually blocks your team in a standup?',
      'How do you ask for help without sounding weak?',
      'Why is a time-boxed update useful for the PM?',
    ],
    further: [
      'Describe a real blocker from your current project in 2–3 sentences.',
      'What will you say in tomorrow\'s standup if you are still blocked?',
    ],
  },
  {
    id: 'it-incident-b1',
    title: 'Incident · root cause',
    industry: 'it',
    level: 'B1',
    scenarioTag: 'incident',
    personaHint: 'dave',
    roleplayScenarioId: 'incident',
    goals: [
      '先报影响，再说根因假设',
      '给出 mitigation 与下一步时间',
      '礼貌推回不合理的立刻修复要求',
    ],
    chunks: [
      {
        when: '先报影响',
        en: 'Users can\'t... right now.',
        zh: '用户现在无法…',
        example: "Users can't check out right now.",
      },
      {
        when: '根因假设',
        en: 'The likely cause is...',
        zh: '可能原因是…',
        example: 'The likely cause is a bad deploy on the payment service.',
      },
      {
        when: '临时缓解',
        en: "We're rolling back / mitigating by...",
        zh: '我们正在回滚 / 用…缓解',
        example: "We're rolling back the last deploy now.",
      },
      {
        when: '推回压力',
        en: 'I hear you, but if we rush that, we risk...',
        zh: '我理解，但若硬赶会有…风险',
        example: 'I hear you, but if we rush a hotfix, we risk breaking refunds.',
      },
    ],
    dialogue: [
      { role: 'PM', en: "Production's down. What happened?" },
      { role: 'You', en: "Users can't check out right now. The likely cause is a bad deploy on payments." },
      { role: 'PM', en: 'Fix it in the next ten minutes.' },
      { role: 'You', en: "We're rolling back now. I hear you, but if we rush a blind hotfix, we risk breaking refunds." },
      { role: 'PM', en: 'Fine. When\'s the next update?' },
      { role: 'You', en: "I'll own the bridge. You'll have an update in fifteen minutes." },
    ],
    opening: "Production's down and the client's on the line. What happened, and what are you doing about it?",
    discussion: [
      'What should you say first in an incident call: impact or root cause?',
      'How do you push back when someone demands an instant fix?',
      'What makes a good status update during an outage?',
    ],
    further: [
      'Retell a real (or imagined) outage using impact → cause → mitigation → next update.',
      'Write one sentence you would say to calm a nervous stakeholder.',
    ],
  },
  {
    id: 'product-scope-b1',
    title: 'Scope cut · MVP',
    industry: 'product',
    level: 'B1',
    scenarioTag: 'scope',
    personaHint: 'dave',
    roleplayScenarioId: 'scope',
    goals: [
      '用「观点语块」主张砍范围',
      '提出 MVP 方案并说出好处',
      '对齐成功指标',
    ],
    chunks: [
      {
        when: '表态',
        en: 'Actually, I think we should...',
        zh: '其实我觉得我们应该…',
        example: 'Actually, I think we should cut scope first.',
      },
      {
        when: '提方案',
        en: 'What if we ship an MVP...?',
        zh: '如果我们先上一个 MVP…？',
        example: 'What if we ship an MVP on Friday?',
      },
      {
        when: '保护必做',
        en: "That's a nice-to-have. Let's protect...",
        zh: '那是锦上添花，先保住…',
        example: "That's a nice-to-have. Let's protect the must-have path.",
      },
      {
        when: '对齐指标',
        en: 'The success metric should be...',
        zh: '成功指标应该是…',
        example: 'The success metric should be activation, not feature completion.',
      },
    ],
    dialogue: [
      { role: 'PM', en: 'The boss wants every feature by Friday. Can we do it?' },
      { role: 'You', en: 'Actually, I think we should cut scope first, because the timeline is already tight.' },
      { role: 'PM', en: 'What would you cut?' },
      { role: 'You', en: "What if we ship an MVP on Friday? That way we can get feedback sooner." },
      { role: 'PM', en: 'And how do we measure success?' },
      { role: 'You', en: 'The success metric should be activation, not just feature completion.' },
    ],
    opening: "The boss wants every feature by Friday. Walk me through the impact — can we really ship it all?",
    discussion: [
      'When is cutting scope better than slipping the date?',
      'How do you explain an MVP to a nervous stakeholder?',
      'What metric would you pick for your current project?',
    ],
    further: [
      'Propose an MVP cut for a feature you are building now.',
      'Practice one polite pushback sentence you would use with your manager.',
    ],
  },
  {
    id: 'business-deadline-b1',
    title: 'Client call · deadline',
    industry: 'business',
    level: 'B1',
    scenarioTag: 'deadline',
    personaHint: 'client',
    roleplayScenarioId: 'deadline',
    goals: [
      '承认关切，再给出可承诺日期',
      '用商业影响解释取舍',
      '锁定下一步与决策人',
    ],
    chunks: [
      {
        when: '承认关切',
        en: 'I hear you on the timeline.',
        zh: '时间点上我理解你的关切',
        example: 'I hear you on the timeline.',
      },
      {
        when: '给新日期',
        en: "We can meet... if we descope X / add Y.",
        zh: '若砍掉 X / 加 Y，我们可以赶上…',
        example: 'We can meet Friday if we descope reporting.',
      },
      {
        when: '商业影响',
        en: "What's the commercial impact if we miss this date?",
        zh: '错过日期的商业影响是什么？',
        example: "What's the commercial impact if we miss this date?",
      },
      {
        when: '锁定下一步',
        en: 'Before we proceed, can we confirm...?',
        zh: '推进前能否确认…？',
        example: 'Before we proceed, can we confirm decision-makers and next steps?',
      },
    ],
    dialogue: [
      { role: 'Client', en: "It's behind schedule. When exactly will it be ready?" },
      { role: 'You', en: 'I hear you on the timeline. We can meet Friday if we descope reporting.' },
      { role: 'Client', en: "I don't want to cut reporting." },
      { role: 'You', en: "What's the commercial impact if we miss this date versus shipping without reporting first?" },
      { role: 'Client', en: 'Fine — but I need a firm plan.' },
      { role: 'You', en: "Before we proceed, can we confirm decision-makers and next steps? I'll send a written scope lock today." },
    ],
    opening: "I saw the demo. It's behind schedule. When exactly will it be ready — and why is it late?",
    discussion: [
      'How do you stay calm when a client sounds angry about delay?',
      'When should you offer a trade-off instead of a bare apology?',
      'Why lock scope in writing after a tense call?',
    ],
    further: [
      'Rewrite a vague promise ("soon") into a firm commitment with a date.',
      'Role-play asking one clarifying question before you commit.',
    ],
  },
  {
    id: 'product-align-a2',
    title: 'Alignment · clarify meaning',
    industry: 'product',
    level: 'A2',
    scenarioTag: 'align',
    personaHint: 'dave',
    roleplayScenarioId: 'scope',
    goals: [
      '用对齐语块确认双方理解',
      '澄清「暂停 ≠ 取消」',
      '确认硬截止日期',
    ],
    chunks: [
      {
        when: '对齐确认',
        en: "Just to make sure we're aligned — are we saying...?",
        zh: '确认一下我们是否对齐——你是说…？',
        example: "Just to make sure we're aligned — are we saying Monday is the hard date?",
      },
      {
        when: '澄清意思',
        en: 'What I meant was...',
        zh: '我的意思是…',
        example: 'What I meant was we pause, not cancel.',
      },
      {
        when: '礼貌反驳',
        en: "Correct me if I'm wrong, but...",
        zh: '如果我理解错了请纠正，不过…',
        example: "Correct me if I'm wrong, but the client asked for reliability, not more features.",
      },
    ],
    dialogue: [
      { role: 'PM', en: 'So we\'re canceling the launch, right?' },
      { role: 'You', en: 'Can I clarify that for a second? What I meant was we pause, not cancel.' },
      { role: 'PM', en: 'Okay — and the date?' },
      { role: 'You', en: "Just to make sure we're aligned — are we saying Monday is the hard date?" },
      { role: 'PM', en: 'Yes. Monday.' },
      { role: 'You', en: "Got it. I'll own the update to the team." },
    ],
    opening: "So we're canceling the launch, right? Talk me through what you meant in the last message.",
    discussion: [
      'Why is "just to make sure we\'re aligned" safer than assuming?',
      'Give an example where pause and cancel would lead to different actions.',
      'How do you check a hard deadline without sounding unsure?',
    ],
    further: [
      'Think of a recent misunderstanding at work. How would you clarify it in one sentence?',
      'Practice confirming one decision from your last meeting.',
    ],
  },
  {
    id: 'it-estimate-b2',
    title: 'Estimate · push back',
    industry: 'it',
    level: 'B2',
    scenarioTag: 'estimate',
    personaHint: 'dave',
    roleplayScenarioId: 'schedule',
    goals: [
      '用 spike / timebox 争取摸底时间',
      '说出依赖风险与兜底',
      '在压力下仍给出可辩护的估时',
    ],
    chunks: [
      {
        when: '先摸底',
        en: 'Can we spike this for half a day before we commit?',
        zh: '承诺前能否先花半天摸底？',
        example: 'Can we spike this for half a day before we commit to the estimate?',
      },
      {
        when: '依赖风险',
        en: "That's a dependency risk. What's our fallback if...?",
        zh: '这是依赖风险。如果…兜底是什么？',
        example: "That's a dependency risk. What's our fallback if the vendor slips?",
      },
      {
        when: '给估时',
        en: "From my experience, this needs...",
        zh: '以我的经验，这需要…',
        example: 'From my experience, this needs three days including regression.',
      },
    ],
    dialogue: [
      { role: 'PM', en: 'I need an estimate by end of day. Two days max, right?' },
      { role: 'You', en: 'Can we spike this for half a day before we commit to the estimate?' },
      { role: 'PM', en: "We don't have time for that." },
      { role: 'You', en: "From my experience, this needs three days including regression. That's a dependency risk on the vendor API." },
      { role: 'PM', en: 'What if the vendor slips?' },
      { role: 'You', en: "What's our fallback if the vendor slips? I'd rather protect the must-have path than promise a fake date." },
    ],
    opening: "Bad news — the client pulled the deadline forward. I need your estimate today. Two days max, right?",
    discussion: [
      'Why is a short spike often cheaper than a wrong estimate?',
      'How do you talk about dependency risk without sounding negative?',
      'What information do you need before committing to a date?',
    ],
    further: [
      'Give an estimate for a real task using: assumption + risk + fallback.',
      'Practice one sentence that refuses a fake deadline politely.',
    ],
  },
];
