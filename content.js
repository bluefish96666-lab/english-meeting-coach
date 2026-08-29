/* =========================================================================
 * 会议句型 / 行业行话 / 跟读文本（静态内容）
 * ========================================================================= */

'use strict';

const MEETING_TEMPLATES = [
  {
    id: 'help',
    label: '求助',
    en: "I'm trying to... but could you help me with...?",
    zh: '说明自己在做什么，并请求对方帮一把',
  },
  {
    id: 'opinion',
    label: '观点',
    en: 'Actually, I think... because...',
    zh: '先表态，再给一个简短理由',
  },
  {
    id: 'suggest',
    label: '建议',
    en: 'What if we...? That way we can...',
    zh: '提出方案，并点出好处',
  },
  {
    id: 'experience',
    label: '经验',
    en: 'From my experience,...',
    zh: '用过往经验支撑判断',
  },
  {
    id: 'rebuttal',
    label: '礼貌反驳',
    en: "Correct me if I'm wrong, but...",
    zh: '温和地提出不同看法',
  },
  {
    id: 'align',
    label: '对齐',
    en: "Just to make sure we're aligned — are we saying...?",
    zh: '确认双方理解一致',
  },
  {
    id: 'delay',
    label: '延期',
    en: "We're going to need more time. The blocker is..., so the new date would be...",
    zh: '说明卡点，并给出新日期',
  },
  {
    id: 'clarify',
    label: '澄清',
    en: 'Can I clarify that for a second? What I meant was...',
    zh: '打断后重新说清楚自己的意思',
  },
  {
    id: 'commit',
    label: '承诺',
    en: "I'll own that. You'll have an update by...",
    zh: '认领事项并给出时间点',
  },
  {
    id: 'pushback',
    label: '推回',
    en: "I hear you, but if we do that, we risk.... Can we prioritize... instead?",
    zh: '承认对方关切，再提出替代方案',
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
        en: "Can we timebox discovery to two days and then decide?",
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
        en: "We can meet the timeline if we descope X or add budget for Y.",
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

const SHADOWING_LINES = [
  {
    en: "Alright, let's get started. What's the impact if we pull the deadline forward?",
    zh: '会议开场：先问提前交付的影响',
  },
  {
    en: "Actually, I think we should cut scope first, because the critical path is already tight.",
    zh: '用「观点句型」表态并给理由',
  },
  {
    en: "What if we ship an MVP this Friday? That way we can collect feedback sooner.",
    zh: '用「建议句型」推进方案',
  },
  {
    en: "Correct me if I'm wrong, but the client asked for reliability, not more features.",
    zh: '用「礼貌反驳」拉回重点',
  },
  {
    en: "Just to make sure we're aligned — are we saying Monday is the hard date?",
    zh: '对齐确认硬截止日期',
  },
  {
    en: "I'll own the status update. You'll have a written summary by 4pm.",
    zh: '承诺事项与时间点',
  },
  {
    en: "Let's circle back to the pain points and align the deliverables.",
    zh: 'IT 行话：回到痛点并对齐交付',
  },
  {
    en: "From my experience, rushing the launch usually creates more support load later.",
    zh: '用经验支撑判断',
  },
];
