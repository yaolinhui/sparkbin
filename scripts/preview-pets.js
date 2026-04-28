#!/usr/bin/env node

const RESET = '\x1b[0m';
function hexToAnsiBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[48;2;${r};${g};${b}m`;
}

// ============================================================
// 32×32 Cat — 改进版：明确头颈分界、尖耳朵、大眼睛、带尾巴
// ============================================================
const catPalette = {
  '.': 'transparent',
  'A': '#f4a261', // 主橘色
  'D': '#d68c45', // 深橘阴影
  'L': '#f9c74f', // 浅黄高光
  'W': '#ffffff', // 白色眼睛
  'B': '#1d3557', // 蓝色瞳孔
  'P': '#ff8fa3', // 粉色耳朵/鼻子
};

const catIdle1 = [
  '................................',
  '................................',
  '.........PP........PP.........',
  '........PPPP......PPPP........',
  '........PPAAAAAAAAAAPP........',
  '.......AAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAA.......',
  '......AAAAAAAAAAAAAAAAA.......',
  '.......AAWWAAAAAAAAAAWWAA.......',
  '.......AAWBAAAAAAAAAAWBAA.......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.......AAAAAAAAPAAAAAAA.........',
  '.......AAAAAALLLLLAAAAA.........',
  '........AAAAAAAAAAAAA.........',
  '.........AAAAAAAAAAA..........',
  '........DDDDDDDDDDDDDD.........',
  '.......AAAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAAA.......',
  '......AAAAAALLLLLLAAAAAA.......',
  '......AAAAAAAAAAAAAAAAAA.......',
  '.......AAAAAAAAAAAAAAAA........',
  '........AAAAAAAAAAAAAA.........',
  '.......DDDDD....DDDDD..........',
  '......DDDDDD...DDDDDAAA........',
  '......DDDDDD...DDDDAAA.........',
  '.......DDDD.....DDAAAA.........',
  '........DD.......DAAAAA.........',
  '...................AAAAA........',
  '..................AAAAAA........',
  '.................AAAAAAA........',
  '................................',
];

const catIdle2 = [
  '................................',
  '................................',
  '.........PP........PP.........',
  '........PPPP......PPPP........',
  '........PPAAAAAAAAAAPP........',
  '.......AAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAA.......',
  '......AAAAAAAAAAAAAAAAA.......',
  '.......AAWWAAAAAAAAAAWWAA.......',
  '.......AAWBAAAAAAAAAAWBAA.......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.......AAAAAAAAPAAAAAAA.........',
  '.......AAAAAALLLLLAAAAA.........',
  '........AAAAAAAAAAAAA.........',
  '.........AAAAAAAAAAA..........',
  '.........DDDDDDDDDDD..........',
  '........AAAAAAAAAAAAAA........',
  '.......AAAAAAAAAAAAAAAA.......',
  '.......AAAAAALLLLAAAAAA.......',
  '.......AAAAAAAAAAAAAAAA.......',
  '........AAAAAAAAAAAAAA........',
  '.........AAAAAAAAAAAA.........',
  '........DDDD....DDDD..........',
  '.......DDDDDD..DDDDD..........',
  '.......DDDDDD..DDDDD..........',
  '........DDDD...DDDD...........',
  '...................AAAAA........',
  '..................AAAAAA........',
  '.................AAAAAAA........',
  '................................',
  '................................',
];

const catBlink = [
  '................................',
  '................................',
  '.........PP........PP.........',
  '........PPPP......PPPP........',
  '........PPAAAAAAAAAAPP........',
  '.......AAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAA.......',
  '......AAAAAAAAAAAAAAAAA.......',
  '.......AADDAAAAAAAAAADDAA.......',
  '.......AADDAAAAAAAAAADDAA.......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.......AAAAAAAAPAAAAAAA.........',
  '.......AAAAAALLLLLAAAAA.........',
  '........AAAAAAAAAAAAA.........',
  '.........AAAAAAAAAAA..........',
  '........DDDDDDDDDDDDDD.........',
  '.......AAAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAAA.......',
  '......AAAAAALLLLLLAAAAAA.......',
  '......AAAAAAAAAAAAAAAAAA.......',
  '.......AAAAAAAAAAAAAAAA........',
  '........AAAAAAAAAAAAAA.........',
  '.......DDDDD....DDDDD..........',
  '......DDDDDD...DDDDDAAA........',
  '......DDDDDD...DDDDAAA.........',
  '.......DDDD.....DDAAAA.........',
  '........DD.......DAAAAA.........',
  '...................AAAAA........',
  '..................AAAAAA........',
  '.................AAAAAAA........',
  '................................',
];

const catHappy = [
  '................................',
  '................................',
  '.........PP........PP.........',
  '........PPPP......PPPP........',
  '........PPAAAAAAAAAAPP........',
  '.......AAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAA.......',
  '......AAAAAAAAAAAAAAAAA.......',
  '.......AAWWAAAAAAAAAAWWAA.......',
  '.......AAWBAAAAAAAAAAWBAA.......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.....AAAAAAAAAAAAAAAAAAA......',
  '.......AAAAAAAAPAAAAAAA.........',
  '......AAAALLLLLLLLLLLLAAAA......',
  '........AAAAAAAAAAAAA.........',
  '.........AAAAAAAAAAA..........',
  '........DDDDDDDDDDDDDD.........',
  '.......AAAAAAAAAAAAAAAA........',
  '......AAAAAAAAAAAAAAAAAA.......',
  '......AAAAAALLLLLLAAAAAA.......',
  '......AAAAAAAAAAAAAAAAAA.......',
  '.......AAAAAAAAAAAAAAAA........',
  '........AAAAAAAAAAAAAA.........',
  '.......DDDDD....DDDDD..........',
  '......DDDDDD...DDDDDAAA........',
  '......DDDDDD...DDDDAAA.........',
  '.......DDDD.....DDAAAA.........',
  '........DD.......DAAAAA.........',
  '...................AAAAA........',
  '..................AAAAAA........',
  '.................AAAAAAA........',
  '................................',
];

// ============================================================
// 渲染引擎 — 将 32×32 逻辑像素放大显示
// 水平：每个逻辑像素 → 4 个空格（128 字符宽）
// 垂直：每个逻辑像素 → 2 行（64 行高）
// 终端字符高≈2倍宽，4×2 字符块视觉上接近正方形
// ============================================================
const SCALE_X = 4;
const SCALE_Y = 2;

function renderColor(title, pixels, palette) {
  console.log('\n' + '='.repeat(70));
  console.log(`  [${title}]  画布: 32×32  显示: ~128×64  配色: 暖橘猫`);
  console.log('='.repeat(70));
  for (const row of pixels) {
    let line = '  ';
    for (const char of row) {
      const color = palette[char];
      if (!color || color === 'transparent') {
        line += ' '.repeat(SCALE_X);
      } else {
        line += hexToAnsiBg(color) + ' '.repeat(SCALE_X) + RESET;
      }
    }
    for (let r = 0; r < SCALE_Y; r++) {
      console.log(line);
    }
  }
}

function renderAscii(title, pixels, palette) {
  console.log('\n' + '='.repeat(70));
  console.log(`  [${title}]  ASCII 模式（无颜色终端 fallback）`);
  console.log('='.repeat(70));
  const symbolMap = {};
  let symIdx = 0;
  const symbols = ['@', '#', '*', '=', '+', '~', '%'];
  for (const row of pixels) {
    let line = '  ';
    for (const char of row) {
      const color = palette[char];
      if (!color || color === 'transparent') {
        line += ' '.repeat(SCALE_X);
      } else {
        if (!symbolMap[color]) {
          symbolMap[color] = symbols[symIdx % symbols.length];
          symIdx++;
        }
        line += symbolMap[color].repeat(SCALE_X);
      }
    }
    for (let r = 0; r < SCALE_Y; r++) {
      console.log(line);
    }
  }
  const entries = Object.entries(symbolMap);
  if (entries.length) {
    const names = {
      '#f4a261': '主橘', '#d68c45': '深橘阴影', '#f9c74f': '浅黄高光',
      '#ffffff': '白', '#1d3557': '深蓝瞳孔', '#ff8fa3': '粉',
    };
    console.log('  图例: ' + entries.map(([c, s]) => `${s}=${names[c] || c}`).join(', '));
  }
}

const supportsColor = process.stdout.isTTY;
const render = supportsColor ? renderColor : renderAscii;

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║     SparkBin 像素宠物预览 — 32×32 猫 v2（改进版）                     ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('\n改进点：明确头颈分界 / 尖耳朵 / 2×2 大眼睛 / 带尾巴');
console.log('提示：支持颜色的终端会显示彩色方块。每帧约 130 宽 × 66 行。');

render('Idle Frame 1  (静止帧1)', catIdle1, catPalette);
render('Idle Frame 2  (静止帧2 — 呼吸)', catIdle2, catPalette);
render('Blink Frame   (眨眼)', catBlink, catPalette);
render('Happy Frame   (开心)', catHappy, catPalette);

console.log('\n' + '='.repeat(70));
console.log('  帧说明：');
console.log('  • Idle 1/2：身体微缩差异，idle 循环动画');
console.log('  • Blink   ：闭眼帧，随机触发后回 idle');
console.log('  • Happy   ：大笑嘴，被点击/互动时触发');
console.log('='.repeat(70) + '\n');
