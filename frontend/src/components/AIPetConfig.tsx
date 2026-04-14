import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AIPetConfig as Config } from '../types';

interface AIPetConfigProps {
  config: Config | null;
  onSave: (config: Config) => void;
  onClose: () => void;
}

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

const VERBOSITY_OPTIONS = [
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

export function AIPetConfig({ config, onSave, onClose }: AIPetConfigProps) {
  const [form, setForm] = useState<Config>({
    type: config?.type || 'cat',
    name: config?.name || PET_OPTIONS[0].name,
    personality: config?.personality || 'gentle',
    verbosity: config?.verbosity || 'moderate',
  });
  const [dialogue, setDialogue] = useState('');
  const [isBouncing, setIsBouncing] = useState(false);

  const selectedPet = PET_OPTIONS.find(p => p.id === form.type);
  const selectedPersonality = PERSONALITY_OPTIONS.find(p => p.id === form.personality);

  // 切换宠物时更新默认名字和台词
  useEffect(() => {
    const pet = PET_OPTIONS.find(p => p.id === form.type);
    if (pet) {
      setForm(prev => ({ ...prev, name: pet.name }));
      setDialogue(pet.greeting);
    }
  }, [form.type]);

  // 点击宠物互动
  const handlePetClick = () => {
    setIsBouncing(true);
    const random = getContextDialogue(form.type, form.personality, {});
    setDialogue(random);
    setTimeout(() => setIsBouncing(false), 500);
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 z-50 flex items-center justify-center p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brutal-muted font-mono">//</span>
            <span className="text-sm font-mono font-bold">领养你的 AI 小伙伴</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row">
          {/* Left: 宠物展示舞台 */}
          <div className="md:w-2/5 border-b md:border-b-0 md:border-r border-brutal-border bg-gradient-to-b from-brutal-surface to-brutal-bg p-8 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden">
            {/* 背景装饰 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 text-4xl">✨</div>
              <div className="absolute top-20 right-10 text-3xl">⭐</div>
              <div className="absolute bottom-20 left-5 text-2xl">💫</div>
              <div className="absolute bottom-10 right-20 text-3xl">✨</div>
            </div>

            {/* 宠物 Emoji - 大且可点击互动 */}
            <div
              onClick={handlePetClick}
              className={`relative cursor-pointer select-none transition-transform ${
                isBouncing ? 'animate-bounce scale-110' : 'hover:scale-105'
              }`}
              style={{ fontSize: '120px', lineHeight: 1 }}
            >
              {selectedPet?.emoji}
              {/* 表情装饰 */}
              <span className="absolute -top-2 -right-2 text-3xl">
                {selectedPersonality?.emoji}
              </span>
            </div>

            {/* 对话气泡 */}
            {dialogue && (
              <div className="mt-6 relative">
                <div
                  className="px-4 py-3 rounded-2xl text-sm font-mono text-center max-w-[200px]"
                  style={{
                    backgroundColor: selectedPet?.color || '#374151',
                    color: '#fff',
                    border: '2px solid #000',
                    boxShadow: '4px 4px 0px #000',
                  }}
                >
                  {dialogue}
                </div>
                {/* 气泡小尾巴 */}
                <div
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: `10px solid ${selectedPet?.color || '#374151'}`,
                  }}
                />
              </div>
            )}

            <p className="mt-6 text-xs text-brutal-muted font-mono text-center">
              点击宠物和它互动！
            </p>

            {/* 名字输入 */}
            <div className="mt-6 text-center w-full">
              <label className="text-xs text-brutal-muted font-mono block mb-2">给它起个名字</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="text-xl font-mono font-bold text-center bg-brutal-bg border-2 border-brutal-border focus:border-brutal-accent outline-none px-4 py-2 w-full max-w-[180px]"
                style={{ boxShadow: '3px 3px 0px var(--brutal-border)' }}
              />
            </div>

            {/* 宠物特点 */}
            <div className="mt-4 text-center">
              <span className="text-xs text-brutal-muted font-mono">
                特点: {selectedPet?.traits}
              </span>
            </div>
          </div>

          {/* Right: 属性选择 */}
          <div className="md:w-3/5 p-6 space-y-6">
            {/* Pet Selection */}
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">选择小伙伴</label>
              <div className="grid grid-cols-5 gap-2">
                {PET_OPTIONS.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setForm({ ...form, type: pet.id as any })}
                    className={`p-2 border-2 text-center transition-all relative ${
                      form.type === pet.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-3xl block mb-1">{pet.emoji}</span>
                    <span className="text-[10px] font-mono">{pet.name}</span>
                    {form.type === pet.id && (
                      <span className="absolute top-0.5 right-0.5 text-brutal-accent text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Personality Selection */}
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">性格风格</label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITY_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setForm({ ...form, personality: p.id as any })}
                    className={`p-3 border-2 text-left transition-all flex items-center gap-3 ${
                      form.personality === p.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <span className="text-sm font-mono font-bold block">{p.name}</span>
                      <span className="text-xs text-brutal-muted">{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Verbosity Selection */}
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">话痨程度</label>
              <div className="grid grid-cols-3 gap-2">
                {VERBOSITY_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setForm({ ...form, verbosity: v.id as any })}
                    className={`p-3 border-2 text-center transition-all ${
                      form.verbosity === v.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{v.emoji}</span>
                    <span className="text-xs font-mono font-bold block">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-brutal-border bg-brutal-bg">
          <button onClick={onClose} className="flex-1 btn-brutal h-9 py-3">
            再看看
          </button>
          <button onClick={handleSave} className="flex-1 btn-brutal-primary h-9 py-3">
            领养 {form.name}！
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPetConfig;
