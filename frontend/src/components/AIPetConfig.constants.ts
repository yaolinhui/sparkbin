// 宠物配置 - 使用大 Emoji + 个性台词
export const PET_OPTIONS = [
  {
    id: 'cat',
    name: '喵仔',
    emoji: '🐱',
    color: '#fbbf24',
    greeting: '喵～要抱抱！',
    traits: '爱撒娇、爱睡觉、治愈系'
  },
  {
    id: 'robot',
    name: '铁蛋',
    emoji: '🤖',
    color: '#60a5fa',
    greeting: '哔哔！铁蛋为你服务！',
    traits: '靠谱、幽默、科技感'
  },
  {
    id: 'panda',
    name: '滚滚',
    emoji: '🐼',
    color: '#a3a3a3',
    greeting: '嗯嗯～竹子真好吃～',
    traits: '佛系、呆萌、慢节奏'
  },
  {
    id: 'fox',
    name: '阿狸',
    emoji: '🦊',
    color: '#f97316',
    greeting: '嘿嘿～今天也很聪明哦！',
    traits: '机灵、调皮、小聪明'
  },
  {
    id: 'dog',
    name: '旺仔',
    emoji: '🐶',
    color: '#d97706',
    greeting: '汪汪！今天也要加油！',
    traits: '忠诚、热情、元气满满'
  },
  {
    id: 'rabbit',
    name: '跳跳',
    emoji: '🐰',
    color: '#f9a8d4',
    greeting: '蹦蹦～有什么新点子吗？',
    traits: '活泼、好奇、点子多'
  },
  {
    id: 'owl',
    name: '博士',
    emoji: '🦉',
    color: '#8b5cf6',
    greeting: '咕咕～深夜学习也要注意休息。',
    traits: '博学、沉稳、夜猫子'
  },
  {
    id: 'dragon',
    name: '小龙',
    emoji: '🐲',
    color: '#ef4444',
    greeting: '吼～准备好大干一场了吗！',
    traits: '霸气、冲劲、领导力'
  },
  {
    id: 'unicorn',
    name: '彩彩',
    emoji: '🦄',
    color: '#ec4899',
    greeting: '嘤～今天也要闪闪发光！',
    traits: '梦幻、创意、乐观派'
  },
  {
    id: 'hamster',
    name: '仓仓',
    emoji: '🐹',
    color: '#84cc16',
    greeting: '吱～一口一口吃掉大目标！',
    traits: '勤劳、囤积、细水长流'
  },
];

export const PERSONALITY_OPTIONS = [
  { id: 'gentle', name: '温柔', desc: '鼓励型，语气柔和', emoji: '🌸', color: '#f472b6' },
  { id: 'rational', name: '理性', desc: '高效分析，逻辑清晰', emoji: '📊', color: '#60a5fa' },
  { id: 'zen', name: '佛系', desc: '慢节奏，不着急', emoji: '🧘', color: '#a78bfa' },
  { id: 'sharp', name: '犀利', desc: '直接挑战，指出问题', emoji: '⚡', color: '#fbbf24' },
];

export const VERBOSITY_OPTIONS = [
  { id: 'quiet', name: '安静', desc: '只在必要时发言', emoji: '🤫' },
  { id: 'moderate', name: '适中', desc: '适度主动建议', emoji: '💬' },
  { id: 'chatty', name: '话痨', desc: '经常主动提示', emoji: '🗣️' },
];

// 基础台词库
export const PET_DIALOGUES: Record<string, string[]> = {
  cat: ['喵～', '蹭蹭～', '呼噜呼噜...', '要小鱼干嘛～', '今天阳光真好喵～'],
  robot: ['正在思考...', '铁蛋明白！', '数据分析中...', '哔哔！', '系统运行正常'],
  panda: ['嗯嗯～', '竹子真香～', '困困...', '抱抱～', '再睡一回合...'],
  fox: ['嘿嘿～', '我聪明吧！', '今天也超棒！', '摸摸头～', '有新的计划吗？'],
  dog: ['汪汪！', '主人最棒！', '一起去散步吧～', '收到！马上执行！', '今天也要元气满满！'],
  rabbit: ['蹦蹦～', '胡萝卜时间到！', '耳朵竖起来听你说～', '新点子新点子！', '快告诉我好消息！'],
  owl: ['咕咕～', '知识就是力量', '夜深了，注意休息', '这个问题很有趣', '让我思考一下...'],
  dragon: ['吼～', '燃烧吧小宇宙！', '前方有挑战，上！', '龙焰准备就绪', '今天也要征服世界'],
  unicorn: ['嘤～', '彩虹出现啦～', '相信自己，你超棒的！', '魔法时刻到了', '闪闪发光吧～'],
  hamster: ['吱～', '又囤了一颗瓜子', '小步前进也是进步', '累了就歇歇吧', '积累起来就很多啦'],
};

// 项目状态相关台词
export function getContextDialogue(
  petId: string,
  personality: string,
  context: {
    currentStage?: string;
    stageName?: string;
    isStageEmpty?: boolean;
    completedStages?: number;
    totalStages?: number;
    projectStatus?: 'active' | 'paused' | 'archived';
    hasWarnings?: boolean;
  }
): string {
  const { currentStage, stageName, isStageEmpty, completedStages = 0, totalStages = 6, projectStatus, hasWarnings } = context;

  // 项目状态优先
  if (projectStatus === 'paused') {
    if (personality === 'sharp') return '项目都暂停了，你还在看？快去想想怎么破局。';
    if (personality === 'rational') return '项目当前处于暂停状态，建议梳理阻塞点后再继续。';
    return '项目睡着了，我们一起叫醒它吧～';
  }
  if (projectStatus === 'archived') {
    if (personality === 'sharp') return '这项目都进档案馆了，别念旧了，开新项目吧。';
    return '这个项目已经归档啦， memories stay ~';
  }

  // 完成度庆祝
  if (completedStages >= totalStages) {
    if (personality === 'sharp') return '全阶段完成！别骄傲，后面还有运营呢。';
    return '太厉害了！所有阶段都点亮了！🎉';
  }
  if (completedStages >= 3) {
    const msgs: Record<string, string> = {
      sharp: `已经完成 ${completedStages} 个阶段了，进度不错，但别在 ${stageName || '当前阶段'} 墨迹。`,
      rational: `项目已完成 ${completedStages}/${totalStages} 个阶段，整体推进良好。`,
      zen: `已经走了 ${completedStages} 步啦，慢慢来，稳稳的。`,
      gentle: `哇！你已经完成了 ${completedStages} 个阶段，超级棒！继续加油～`,
    };
    return msgs[personality] || msgs.gentle;
  }

  // 空内容警告
  if (isStageEmpty) {
    const msgs: Record<string, string> = {
      sharp: `${stageName || '当前阶段'} 还是一片空白，你打算靠意念创业吗？`,
      rational: `当前 ${stageName || '阶段'} 缺少内容记录，建议补充后再推进。`,
      zen: `${stageName || '这个阶段'} 还有点空，不急，慢慢填。`,
      gentle: `${stageName || '当前阶段'} 还在等你写下第一笔呢，加油～`,
    };
    return msgs[personality] || msgs.gentle;
  }

  // 有风险警告
  if (hasWarnings) {
    const msgs: Record<string, string> = {
      sharp: '项目有些隐患，我劝你先回头看看基础阶段。',
      rational: '检测到部分前置阶段基础薄弱，建议优先补强。',
      zen: '有些地方还需要修补，慢慢来啦。',
      gentle: '我注意到有些地方还需要关爱一下哦，我们一起加油～',
    };
    return msgs[personality] || msgs.gentle;
  }

  // 默认按阶段给建议
  const stageMsgs: Record<string, Record<string, string>> = {
    idea: {
      sharp: '想法阶段要够痛，别自嗨。',
      rational: '建议明确目标用户和核心痛点。',
      zen: '想法可以慢慢想，不着急。',
      gentle: '每个伟大的产品都从一个好点子开始～',
    },
    validate: {
      sharp: '没用户反馈就别往下走，这是血淋淋的教训。',
      rational: '验证阶段建议收集至少 3-5 个真实用户反馈。',
      zen: '验证验证，慢工出细活。',
      gentle: '去听听用户的声音吧，他们会给你力量的～',
    },
    prototype: {
      sharp: '原型不用完美，能跑就行。',
      rational: '建议聚焦核心功能，先做出可演示的版本。',
      zen: '原型嘛，够用就好。',
      gentle: '把想法变成看得见的样子，超有成就感的！',
    },
    ship: {
      sharp: '该发就发，别做完美主义者。',
      rational: '发布前确保核心链路可用， checklist 逐项核对。',
      zen: '船到桥头自然直，发就是了。',
      gentle: '准备向世界展示你的作品了吗？好激动！',
    },
    grow: {
      sharp: '增长不靠烧钱，靠内容和渠道。',
      rational: '建议建立 2-3 个核心增长渠道，持续输出内容。',
      zen: '增长是马拉松，不是百米冲刺。',
      gentle: '让更多人认识你，你值得被看见～',
    },
    monetize: {
      sharp: '变现前先确认有人愿意付钱。',
      rational: '建议通过小规模付费测试验证商业模式。',
      zen: '钱嘛，该来的时候自然会来。',
      gentle: '让喜欢你的人为你的作品买单，这是最幸福的事～',
    },
  };

  if (currentStage && stageMsgs[currentStage]) {
    const pMsg = stageMsgs[currentStage][personality];
    if (pMsg) return pMsg;
  }

  // fallback to random base dialogue
  const base = PET_DIALOGUES[petId] || ['嗨！'];
  return base[Math.floor(Math.random() * base.length)];
}
