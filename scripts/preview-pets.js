#!/usr/bin/env node

const RESET = '\x1b[0m';
function hexToAnsiBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[48;2;${r};${g};${b}m`;
}

function renderColor(title, frame, palette) {
  console.log('\n' + '='.repeat(50));
  console.log(`  [${title}]`);
  console.log('='.repeat(50));
  for (const row of frame.pixels) {
    let line = '  ';
    for (const char of row) {
      const color = palette[char];
      if (!color || color === 'transparent') {
        line += '  ';
      } else {
        line += hexToAnsiBg(color) + '  ' + RESET;
      }
    }
    console.log(line);
  }
}

function renderAscii(title, frame, palette) {
  console.log('\n' + '='.repeat(50));
  console.log(`  [${title}]`);
  console.log('='.repeat(50));
  const symbolMap = {};
  let symIdx = 0;
  const symbols = ['@', '#', '*', '=', '+', '~', '%'];
  for (const row of frame.pixels) {
    let line = '  ';
    for (const char of row) {
      const color = palette[char];
      if (!color || color === 'transparent') {
        line += '  ';
      } else {
        if (!symbolMap[color]) {
          symbolMap[color] = symbols[symIdx % symbols.length];
          symIdx++;
        }
        line += symbolMap[color] + symbolMap[color];
      }
    }
    console.log(line);
  }
  const entries = Object.entries(symbolMap);
  if (entries.length) {
    const names = {
      '#1a1a1a': '黑', '#ff6b6b': '红', '#ffffff': '白',
      '#f4a261': '橙', '#f9c74f': '黄', '#ff8fa3': '粉',
      '#1d3557': '蓝', '#d68c45': '棕', '#e94560': '玫红',
      '#ffb4b4': '浅粉', '#0f3460': '藏青', '#2d2d2d': '深灰',
    };
    console.log('  图例: ' + entries.map(([c, s]) => `${s}=${names[c] || c}`).join(', '));
  }
}

const supportsColor = process.stdout.isTTY;
const render = supportsColor ? renderColor : renderAscii;

// ============================================================
// Style A: 极简几何 12×12 — 正脸，尖耳朵+眼睛+粉鼻
// ============================================================
const geometricPalette = {
  '.': 'transparent', 'B': '#2d2d2d', 'W': '#ffffff', 'P': '#ff6b6b',
};
const geometricCat = {
  width: 12, height: 12,
  pixels: [
    '............',
    '..BB....BB..',
    '.BBBB..BBBB.',
    '.BBBBBBBBBB.',
    '.BBBBBBBBBB.',
    '.BBWBBBBWBB.',
    '.BBWBBBBWBB.',
    '.BBBBBBBBBB.',
    '..BBBBPBBB..',
    '..BBBBBBBB..',
    '..BBBBBBBB..',
    '............',
  ],
};

// ============================================================
// Style B: 8-bit 侧面 16×16 — 耳朵+眼睛+尾巴，像游戏精灵
// ============================================================
const retroPalette = {
  '.': 'transparent', 'F': '#f4a261', 'D': '#d68c45', 'W': '#ffffff',
  'B': '#1d3557', 'P': '#ff8fa3',
};
const retroCat = {
  width: 16, height: 16,
  pixels: [
    '................',
    '.....DD.........',
    '....FFFF........',
    '....FFFFFF......',
    '....FFFFFF......',
    '....FWFFFF......',
    '....FWBFFF......',
    '....FFFFFF......',
    '.....FFFFF......',
    '.....FFFFFF.....',
    '....FFFFFFFF....',
    '....FFFFFFFF....',
    '...FFFFFFFFF....',
    '...FFFF.........',
    '...FFF..........',
    '................',
  ],
};

// ============================================================
// Style C: 大像素正脸 24×24 — 圆润脑袋+明显五官+双腿
// ============================================================
const bigPixelPalette = {
  '.': 'transparent', 'F': '#e94560', 'D': '#ff6b6b', 'W': '#ffffff',
  'B': '#0f3460', 'P': '#ffb4b4',
};
const bigPixelCat = {
  width: 24, height: 24,
  pixels: [
    '........................',
    '........................',
    '........................',
    '........DD.....DD.......',
    '.......FFFF...FFFF......',
    '.......FFFFF.FFFFF......',
    '.......FFFFFFFFFFFF.....',
    '.......FFFFFFFFFFFF.....',
    '.......FFFFFFFFFFFF.....',
    '.......FFWFFFFFFWFFF....',
    '.......FFWBFFFFWBFFF....',
    '.......FFFFFFFFFFFF.....',
    '........FFFFPFFFFF......',
    '........FFFFFFFFFF......',
    '........FFFFFFFFFF......',
    '.......FFFFFFFFFFFF.....',
    '.......FFFFFFFFFFFF.....',
    '.......FFFFFFFFFFFF.....',
    '......FFFFFFFFFFFFFF....',
    '......FFFFFFFFFFFFFF....',
    '.....FFFFF.....FFFFF....',
    '.....FFFFF.....FFFFF....',
    '.....FFFFF.....FFFFF....',
    '........................',
  ],
};

console.log('\n');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║     SparkBin 像素宠物 - 重绘版（更像猫）          ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('\n提示: 本地终端运行可看到彩色方块。');

render('A. 极简几何 12×12 (正脸)', geometricCat, geometricPalette);
render('B. 8-bit 侧面 16×16 (有尾巴)', retroCat, retroPalette);
render('C. 大像素正脸 24×24 (圆润)', bigPixelCat, bigPixelPalette);

console.log('\n' + '='.repeat(50));
console.log('  A = 极简正脸  |  B = 8-bit 侧面  |  C = 大像素正脸');
console.log('  或回复 "都不行"');
console.log('='.repeat(50) + '\n');
