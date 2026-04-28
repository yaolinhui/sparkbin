#!/usr/bin/env node
/**
 * 转换 Desktop-Pixel-Pet 的 JSON 帧数据到 SparkBin 的 PixelPet.frames.ts 格式
 * 来源：https://github.com/CanFlyhang/Desktop-Pixel-Pet (MIT License)
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const REPO_BASE = 'https://raw.githubusercontent.com/CanFlyhang/Desktop-Pixel-Pet/main/assets/pets';
const OUT_FILE = path.join(__dirname, '..', 'frontend', 'src', 'components', 'PixelPet.frames.ts');

// 排除食物道具
const PET_FILES = [
  'pixel_cat',
  'pixel_dog',
  'pixel_rabbit',
  'pixel_dragon',
  'pixel_trae_slime',
];

// 中文名称映射（从文件名推断）
const NAME_MAP = {
  pixel_boba_tea: '奶茶',
  pixel_bubble_slime: '泡泡史莱姆',
  pixel_capybara: '水豚',
  pixel_cat: '猫',
  pixel_cherry_bunny: '樱桃兔',
  pixel_cyber_cat: '赛博猫',
  pixel_dog: '狗',
  pixel_dragon: '龙',
  pixel_energetic_duck: '活力鸭',
  pixel_fresh_lamb: '小羊',
  pixel_ice_penguin: '企鹅',
  pixel_lucky_koi: '锦鲤',
  pixel_matcha_bear: '抹茶熊',
  pixel_neon_fox: '霓虹狐',
  pixel_pixel_cactus: '像素仙人掌',
  pixel_rabbit: '兔子',
  pixel_rainbow_unicorn: '彩虹独角兽',
  pixel_retro_robot: '复古机器人',
  pixel_star_dragon: '星龙',
  pixel_strawberry_cow: '草莓牛',
  pixel_trae_slime: '特雷史莱姆',
};

function rgbaToHex([r, g, b, a]) {
  if (a === 0) return 'transparent';
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function convertPet(fileName, jsonText) {
  const data = JSON.parse(jsonText);
  const petKey = fileName.replace('.json', '');

  // 为每个颜色名分配单字符
  const palette = {};
  const charMap = {};
  let charIdx = 0;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (const [colorName, rgba] of Object.entries(data.palette)) {
    const hex = rgbaToHex(rgba);
    if (hex === 'transparent') {
      charMap[colorName] = '.';
    } else {
      const char = chars[charIdx++];
      if (!char) throw new Error(`Too many colors in ${petKey}`);
      charMap[colorName] = char;
      palette[char] = hex;
    }
  }

  // 转换帧
  const idle = [];
  const blink = [];
  const happy = [];

  for (const frame of data.frames || []) {
    if (!frame.pixels) continue;

    const pixelStrings = frame.pixels.map((row, rowIdx) => {
      const line = row.map((c) => {
        if (!charMap[c]) throw new Error(`Unknown color "${c}" in ${petKey} ${frame.name} row ${rowIdx}`);
        return charMap[c];
      }).join('');
      if (line.length !== 32) {
        console.warn(`  ⚠️  ${petKey} ${frame.name || '?'} row ${rowIdx}: length ${line.length} (expected 32)`);
      }
      return line;
    });

    const frameObj = { width: 32, height: 32, palette, pixels: pixelStrings };

    const name = (frame.name || '').toLowerCase();
    if (name.includes('idle')) idle.push(frameObj);
    else if (name.includes('blink')) blink.push(frameObj);
    else if (name.includes('happy')) happy.push(frameObj);
    else idle.push(frameObj);
  }

  // 如果 blink/happy 为空，用 idle 第一帧填充（保证动画回退时不消失）
  if (blink.length === 0 && idle.length > 0) blink.push(structuredClone ? structuredClone(idle[0]) : JSON.parse(JSON.stringify(idle[0])));
  if (happy.length === 0 && idle.length > 0) happy.push(structuredClone ? structuredClone(idle[0]) : JSON.parse(JSON.stringify(idle[0])));

  return {
    id: petKey.replace('pixel_', ''),
    name: NAME_MAP[petKey] || petKey,
    idle,
    blink,
    happy,
  };
}

function generateTs(pets) {
  let ts = `export interface PixelPetFrame {
  width: number;
  height: number;
  pixels: string[];
  palette: Record<string, string>;
}

export interface PixelPetFrames {
  id: string;
  name: string;
  idle: PixelPetFrame[];
  blink: PixelPetFrame[];
  happy: PixelPetFrame[];
}

// ============================================================
// Desktop-Pixel-Pet 迁移帧数据
// 来源：https://github.com/CanFlyhang/Desktop-Pixel-Pet (MIT License)
// 由 scripts/convert-desktop-pets.js 自动生成
// ============================================================\n`;

  for (const pet of pets) {
    ts += `\n// --------------------------------------------------------\n// ${pet.name} — ${pet.id}\n// --------------------------------------------------------\n`;

    const paletteEntries = Object.entries(pet.idle[0]?.palette || {});
    ts += `const ${pet.id}Palette: Record<string, string> = {\n`;
    ts += `  '.': 'transparent',\n`;
    for (const [char, hex] of paletteEntries) {
      if (char !== '.') ts += `  '${char}': '${hex}',\n`;
    }
    ts += `};\n`;

    const allFrames = [...pet.idle, ...pet.blink, ...pet.happy];
    const uniqueFrames = [];
    const seen = new Set();
    for (const f of allFrames) {
      const key = f.pixels.join('\n');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFrames.push(f);
      }
    }

    let frameIdx = 0;
    const frameNames = {};
    for (const f of uniqueFrames) {
      const varName = `${pet.id}Frame${frameIdx}`;
      frameNames[f.pixels.join('\n')] = varName;

      ts += `\nconst ${varName}: PixelPetFrame = {\n`;
      ts += `  width: 32,\n`;
      ts += `  height: 32,\n`;
      ts += `  palette: ${pet.id}Palette,\n`;
      ts += `  pixels: [\n`;
      for (const row of f.pixels) {
        ts += `    '${row}',\n`;
      }
      ts += `  ],\n`;
      ts += `};\n`;
      frameIdx++;
    }

    ts += `\nexport const ${pet.id}Frames: PixelPetFrames = {\n`;
    ts += `  id: '${pet.id}',\n`;
    ts += `  name: '${pet.name}',\n`;
    ts += `  idle: [${pet.idle.map((f) => frameNames[f.pixels.join('\n')]).join(', ')}],\n`;
    ts += `  blink: [${pet.blink.map((f) => frameNames[f.pixels.join('\n')]).join(', ')}],\n`;
    ts += `  happy: [${pet.happy.map((f) => frameNames[f.pixels.join('\n')]).join(', ')}],\n`;
    ts += `};\n`;
  }

  ts += `\nexport const PIXEL_PET_CATALOG: Record<string, PixelPetFrames> = {\n`;
  for (const pet of pets) {
    ts += `  ${pet.id}: ${pet.id}Frames,\n`;
  }
  ts += `};\n`;

  return ts;
}

async function main() {
  console.log('开始迁移 Desktop-Pixel-Pet 帧数据...\n');

  const pets = [];
  for (const fileName of PET_FILES) {
    const url = `${REPO_BASE}/${fileName}.json`;
    process.stdout.write(`下载 ${fileName} ... `);
    try {
      const jsonText = await downloadFile(url);
      const pet = convertPet(fileName, jsonText);
      console.log(`✓ ${pet.idle.length} idle, ${pet.blink.length} blink, ${pet.happy.length} happy`);
      pets.push(pet);
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  if (pets.length === 0) {
    console.error('没有成功下载任何宠物数据');
    process.exit(1);
  }

  console.log(`\n共转换 ${pets.length} 只宠物，生成 TypeScript ...`);
  const ts = generateTs(pets);
  fs.writeFileSync(OUT_FILE, ts, 'utf8');
  console.log(`已写入: ${OUT_FILE}`);

  // 同时输出宠物列表供前端 PET_OPTIONS 使用
  const options = pets.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: '🐾',
    color: '#fbbf24',
    greeting: `${p.name}来啦！`,
    traits: '像素小伙伴',
  }));
  console.log('\n建议的 PET_OPTIONS 数组:');
  console.log(JSON.stringify(options, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
