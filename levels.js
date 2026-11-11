/**
 * levels.js —— 关卡配置
 *
 * type:
 *   tutorial  教学：依次比出目标手势
 *   rps       对决：与电脑猜拳，先到 target 分
 *   sequence  记忆：记住并复现手势序列
 */

const LEVELS = [
  {
    id: 1,
    name: '初见',
    type: 'tutorial',
    goal: '依次比出 ✊ 石头、✋ 布、✌ 剪刀',
    intro: '对着摄像头做出目标手势，保持约 1 秒即可锁定。三种手势各做对一次就能过关。',
    clearText: '你已经掌握全部三种手势，接下来和对手真刀真枪比一场。',
  },
  {
    id: 2,
    name: '三局两胜',
    type: 'rps',
    target: 2,
    goal: '先赢 2 局',
    intro: '和电脑同时出拳，先赢 2 局即可过关。本关没有时间限制，可以慢慢想。',
    clearText: '不错！从下一关开始，出拳要限时了。',
  },
  {
    id: 3,
    name: '限时对决',
    type: 'rps',
    target: 3,
    limit: 4,
    goal: '4 秒内出拳，先赢 3 局',
    intro: '每回合只有 4 秒，超时直接算你输一局。手要快，心要稳。',
    clearText: '反应真快！下一关考验的是记忆力。',
  },
  {
    id: 4,
    name: '记忆序列',
    type: 'sequence',
    length: 4,
    viewTime: 3200,
    goal: '记住并依次比出 4 个手势',
    intro: '屏幕会短暂显示一串手势，记住顺序后按顺序比出来。最多允许错 1 次，错 2 次重来。',
    clearText: '记忆力满分！最后一关，对手会读心。',
  },
  {
    id: 5,
    name: '读心者',
    type: 'rps',
    target: 3,
    boss: true,
    goal: '先赢 3 局',
    intro: 'BOSS 记得你上一局出过什么，有 45% 的概率直接出克制你的拳。想赢就别太规律。',
    clearText: '你战胜了读心者，恭喜通关！',
  },
];

const POOL = ['rock', 'paper', 'scissors'];

// 用于判定胜负：COUNTER[手势] = 能打败它的手势
const COUNTER = { rock: 'paper', paper: 'scissors', scissors: 'rock' };
