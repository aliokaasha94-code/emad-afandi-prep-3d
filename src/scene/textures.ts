import * as THREE from 'three';
import type { FloorStyle, WallStyle } from './types';

export interface TextureBundle {
  subwayColor: THREE.CanvasTexture;
  subwayBump: THREE.CanvasTexture;
  floorCreamColor: THREE.CanvasTexture;
  floorCreamBump: THREE.CanvasTexture;
  floorPorcelainColor: THREE.CanvasTexture;
  floorTerrazzoColor: THREE.CanvasTexture;
  floorCharcoalColor: THREE.CanvasTexture;
  terracottaBrickColor: THREE.CanvasTexture;
  concreteColor: THREE.CanvasTexture;
  oakColor: THREE.CanvasTexture;
  oakBump: THREE.CanvasTexture;
  brushedStainlessColor: THREE.CanvasTexture;
  brushedMetalBump: THREE.CanvasTexture;
  stickerRollColor: THREE.CanvasTexture;
  samsungAcColor: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): TextureBundle {
  // 1. White Beveled Subway Brick Tile (Color + Bump)
  const [subC, subCtx] = makeCanvas(512, 512);
  const [subB, subBCtx] = makeCanvas(512, 512);

  subCtx.fillStyle = '#cfc5b7'; // warm grout
  subCtx.fillRect(0, 0, 512, 512);
  subBCtx.fillStyle = '#252525'; // recessed grout
  subBCtx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 4;
  const tileH = 512 / rows;
  const tileW = 512 / cols;
  const gap = 4;

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 1 ? tileW * 0.5 : 0;
    for (let c = -1; c <= cols; c++) {
      const x = c * tileW + offset + gap * 0.5;
      const y = r * tileH + gap * 0.5;
      const w = tileW - gap;
      const h = tileH - gap;

      // Subtle warm ivory-cream glazed tile variance
      const shade = 236 + ((r * 7 + c * 13) % 8);
      subCtx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 18})`;
      subCtx.fillRect(x, y, w, h);

      // Glossy bevel inner highlight
      const grad = subCtx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, 'rgba(255,252,245,0.72)');
      grad.addColorStop(0.18, 'rgba(255,252,245,0.0)');
      grad.addColorStop(0.84, 'rgba(0,0,0,0.0)');
      grad.addColorStop(1, 'rgba(128,116,102,0.26)');
      subCtx.fillStyle = grad;
      subCtx.fillRect(x, y, w, h);

      // Bump: beveled raised plateau
      subBCtx.fillStyle = '#b8b8b8';
      subBCtx.fillRect(x, y, w, h);
      subBCtx.fillStyle = '#f2f2f2';
      subBCtx.fillRect(x + 6, y + 6, w - 12, h - 12);
    }
  }

  const subwayColor = finalizeTexture(subC, true, maxAnisotropy);
  const subwayBump = finalizeTexture(subB, false, maxAnisotropy);

  // 2. 60x60cm Cream Ceramic Floor Tiles
  const [flC, flCtx] = makeCanvas(512, 512);
  const [flB, flBCtx] = makeCanvas(512, 512);

  flCtx.fillStyle = '#b4ada2'; // grout
  flCtx.fillRect(0, 0, 512, 512);
  flBCtx.fillStyle = '#303030';
  flBCtx.fillRect(0, 0, 512, 512);

  const fCount = 2;
  const fSize = 512 / fCount;
  for (let r = 0; r < fCount; r++) {
    for (let c = 0; c < fCount; c++) {
      const x = c * fSize + 3;
      const y = r * fSize + 3;
      const s = fSize - 6;
      flCtx.fillStyle = (r + c) % 2 === 0 ? '#e3ded5' : '#dfd9cf';
      flCtx.fillRect(x, y, s, s);
      flBCtx.fillStyle = '#e5e5e5';
      flBCtx.fillRect(x, y, s, s);

      // Subtle mineral speckles
      for (let i = 0; i < 140; i++) {
        const sx = x + ((i * 73 + r * 31) % (s - 4));
        const sy = y + ((i * 47 + c * 59) % (s - 4));
        flCtx.fillStyle = i % 2 === 0 ? 'rgba(155,148,138,0.18)' : 'rgba(255,255,255,0.22)';
        flCtx.fillRect(sx, sy, 2, 2);
      }
    }
  }

  const floorCreamColor = finalizeTexture(flC, true, maxAnisotropy);
  const floorCreamBump = finalizeTexture(flB, false, maxAnisotropy);

  // 3. Light Gray Porcelain Floor
  const [porC, porCtx] = makeCanvas(512, 512);
  porCtx.fillStyle = '#9aa0a6';
  porCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      porCtx.fillStyle = (r + c) % 2 === 0 ? '#cfd4da' : '#c8cdd4';
      porCtx.fillRect(c * 256 + 3, r * 256 + 3, 250, 250);
    }
  }
  const floorPorcelainColor = finalizeTexture(porC, true, maxAnisotropy);

  // 4. Terrazzo Floor
  const [terC, terCtx] = makeCanvas(512, 512);
  terCtx.fillStyle = '#e4e0d8';
  terCtx.fillRect(0, 0, 512, 512);
  const chipColors = ['#a89f91', '#5f656b', '#c68b59', '#7d8a7e', '#d6cfc4'];
  for (let i = 0; i < 320; i++) {
    const cx = (i * 97) % 512;
    const cy = (i * 163) % 512;
    const rad = 2 + (i % 6);
    terCtx.fillStyle = chipColors[i % chipColors.length];
    terCtx.beginPath();
    terCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    terCtx.fill();
  }
  const floorTerrazzoColor = finalizeTexture(terC, true, maxAnisotropy);

  // 5. Warm Concrete
  const [conC, conCtx] = makeCanvas(512, 512);
  conCtx.fillStyle = '#c5bfb5';
  conCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) {
    const x = (i * 53) % 512;
    const y = (i * 89) % 512;
    conCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(60,55,50,0.08)';
    conCtx.fillRect(x, y, 6, 6);
  }
  const concreteColor = finalizeTexture(conC, true, maxAnisotropy);

  // 6. Warm Butcher-Block Oak Wood (Color + Bump)
  const [oakC, oakCtx] = makeCanvas(512, 512);
  const [oakB, oakBCtx] = makeCanvas(512, 512);
  oakCtx.fillStyle = '#c9883b';
  oakCtx.fillRect(0, 0, 512, 512);
  oakBCtx.fillStyle = '#888888';
  oakBCtx.fillRect(0, 0, 512, 512);

  const strips = 8;
  const stripH = 512 / strips;
  for (let s = 0; s < strips; s++) {
    const y = s * stripH;
    const tone = s % 3 === 0 ? '#cb8b3e' : s % 3 === 1 ? '#be7c31' : '#d39448';
    oakCtx.fillStyle = tone;
    oakCtx.fillRect(0, y, 512, stripH - 1);
    oakCtx.fillStyle = 'rgba(70,38,12,0.22)';
    oakCtx.fillRect(0, y + stripH - 1, 512, 1);

    for (let g = 0; g < 18; g++) {
      const gy = y + ((g * 13) % (stripH - 3));
      oakCtx.fillStyle = g % 2 === 0 ? 'rgba(92,48,14,0.14)' : 'rgba(245,200,130,0.12)';
      oakCtx.fillRect(0, gy, 512, 1.5);
      oakBCtx.fillStyle = g % 2 === 0 ? '#707070' : '#a8a8a8';
      oakBCtx.fillRect(0, gy, 512, 1.5);
    }
  }
  const oakColor = finalizeTexture(oakC, true, maxAnisotropy);
  const oakBump = finalizeTexture(oakB, false, maxAnisotropy);

  // 7. Brushed 304 Food-Grade Stainless Steel (High-Definition Satin Grain + Micro Bump)
  const [metC, metCCtx] = makeCanvas(512, 512);
  const [metB, metBCtx] = makeCanvas(512, 512);
  const sGrad = metCCtx.createLinearGradient(0, 0, 512, 512);
  sGrad.addColorStop(0, '#d2d9e0');
  sGrad.addColorStop(0.3, '#f1f5f9');
  sGrad.addColorStop(0.5, '#cbd5e1');
  sGrad.addColorStop(0.7, '#e2e8f0');
  sGrad.addColorStop(1, '#bcc5cf');
  metCCtx.fillStyle = sGrad;
  metCCtx.fillRect(0, 0, 512, 512);
  metBCtx.fillStyle = '#808080';
  metBCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const alphaHigh = 0.08 + ((y * 17) % 7) * 0.015;
    metCCtx.fillStyle = y % 4 === 0 ? `rgba(255,255,255,${alphaHigh})` : 'rgba(51,65,85,0.06)';
    metCCtx.fillRect(0, y, 512, 1);
    metBCtx.fillStyle = y % 4 === 0 ? '#b0b0b0' : '#606060';
    metBCtx.fillRect(0, y, 512, 1);
  }
  const brushedStainlessColor = finalizeTexture(metC, true, maxAnisotropy);
  const brushedMetalBump = finalizeTexture(metB, false, maxAnisotropy);

  // 8. Branded Sticker Roll Sheet Texture
  const [stC, stCtx] = makeCanvas(256, 256);
  stCtx.fillStyle = '#f5f2ec';
  stCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 8; c++) {
      stCtx.fillStyle = r < 2 ? '#1e2126' : '#e6e2da';
      stCtx.beginPath();
      stCtx.arc(16 + c * 32, 22 + r * 40, 11, 0, Math.PI * 2);
      stCtx.fill();
      if (r < 2) {
        stCtx.strokeStyle = '#c89b54';
        stCtx.lineWidth = 1.2;
        stCtx.stroke();
      }
    }
  }
  const stickerRollColor = finalizeTexture(stC, true, maxAnisotropy);

  // 9. Soft Radial Contact Shadow
  const [shC, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  shGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shC);
  contactShadow.needsUpdate = true;

  // 9b. Terracotta Exposed Brick
  const [brC, brCtx] = makeCanvas(512, 512);
  brCtx.fillStyle = '#9e958b';
  brCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 8; r++) {
    const offset = r % 2 === 1 ? 64 : 0;
    for (let c = -1; c <= 4; c++) {
      const shade = 148 + ((r * 11 + c * 17) % 28);
      brCtx.fillStyle = `rgb(${shade}, ${Math.round(shade * 0.48)}, ${Math.round(shade * 0.36)})`;
      brCtx.fillRect(c * 128 + offset + 3, r * 64 + 3, 122, 58);
    }
  }
  const terracottaBrickColor = finalizeTexture(brC, true, maxAnisotropy);

  // 9c. Charcoal Matte Tile Floor
  const [chC, chCtx] = makeCanvas(512, 512);
  chCtx.fillStyle = '#1f242c';
  chCtx.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      chCtx.fillStyle = (r + c) % 2 === 0 ? '#2f3540' : '#2b303b';
      chCtx.fillRect(c * 256 + 3, r * 256 + 3, 250, 250);
    }
  }
  const floorCharcoalColor = finalizeTexture(chC, true, maxAnisotropy);

  // 9d. Samsung Split AC Front Fascia Texture
  const [acC, acCtx] = makeCanvas(512, 192);
  const acGrad = acCtx.createLinearGradient(0, 0, 0, 192);
  acGrad.addColorStop(0, '#f8fafc');
  acGrad.addColorStop(0.55, '#f1f5f9');
  acGrad.addColorStop(0.85, '#e2e8f0');
  acGrad.addColorStop(1, '#cbd5e1');
  acCtx.fillStyle = acGrad;
  acCtx.fillRect(0, 0, 512, 192);
  // Crisp horizontal seam line
  acCtx.fillStyle = 'rgba(15, 23, 42, 0.14)';
  acCtx.fillRect(14, 134, 484, 3);
  // Subtle curved shadow at bottom vent edge
  acCtx.fillStyle = '#0f172a';
  acCtx.fillRect(24, 148, 464, 34);
  acCtx.fillStyle = '#64748b';
  acCtx.fillRect(28, 162, 456, 4);
  // SAMSUNG centered wordmark
  acCtx.fillStyle = '#1e293b';
  acCtx.font = 'bold 20px Inter, system-ui, sans-serif';
  acCtx.textAlign = 'center';
  acCtx.textBaseline = 'middle';
  acCtx.fillText('SAMSUNG', 256, 108);
  // Digital temp readout on right
  acCtx.fillStyle = '#0f172a';
  acCtx.fillRect(428, 92, 34, 20);
  acCtx.fillStyle = '#38bdf8';
  acCtx.font = 'bold 12px monospace';
  acCtx.fillText('22°', 445, 102);
  const samsungAcColor = finalizeTexture(acC, true, maxAnisotropy);

  return {
    subwayColor,
    subwayBump,
    floorCreamColor,
    floorCreamBump,
    floorPorcelainColor,
    floorTerrazzoColor,
    floorCharcoalColor,
    terracottaBrickColor,
    concreteColor,
    oakColor,
    oakBump,
    brushedStainlessColor,
    brushedMetalBump,
    stickerRollColor,
    samsungAcColor,
    contactShadow,
    dispose() {
      subwayColor.dispose();
      subwayBump.dispose();
      floorCreamColor.dispose();
      floorCreamBump.dispose();
      floorPorcelainColor.dispose();
      floorTerrazzoColor.dispose();
      floorCharcoalColor.dispose();
      terracottaBrickColor.dispose();
      concreteColor.dispose();
      oakColor.dispose();
      oakBump.dispose();
      brushedStainlessColor.dispose();
      brushedMetalBump.dispose();
      stickerRollColor.dispose();
      samsungAcColor.dispose();
      contactShadow.dispose();
    },
  };
}

export function getWallMaterialProps(style: WallStyle, tex: TextureBundle, repeatX: number, repeatY: number) {
  switch (style) {
    case 'subway_white': {
      const map = tex.subwayColor.clone();
      map.repeat.set(repeatX, repeatY);
      map.needsUpdate = true;
      const bumpMap = tex.subwayBump.clone();
      bumpMap.repeat.set(repeatX, repeatY);
      bumpMap.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.016,
        roughness: 0.18,
        metalness: 0.04,
      };
    }
    case 'matte_cream':
      return {
        color: 0xf1ebe0,
        map: null,
        bumpMap: null,
        bumpScale: 0,
        roughness: 0.82,
        metalness: 0.0,
      };
    case 'warm_concrete': {
      const map = tex.concreteColor.clone();
      map.repeat.set(repeatX, repeatY);
      map.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap: null,
        bumpScale: 0,
        roughness: 0.88,
        metalness: 0.02,
      };
    }
    case 'dark_slate':
      return {
        color: 0x30363f,
        map: null,
        bumpMap: null,
        bumpScale: 0,
        roughness: 0.72,
        metalness: 0.08,
      };
    case 'terracotta_brick': {
      const map = tex.terracottaBrickColor.clone();
      map.repeat.set(repeatX, repeatY);
      map.needsUpdate = true;
      const bumpMap = tex.subwayBump.clone();
      bumpMap.repeat.set(repeatX, repeatY);
      bumpMap.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.012,
        roughness: 0.82,
        metalness: 0.02,
      };
    }
  }
}

export function getFloorMaterialProps(style: FloorStyle, tex: TextureBundle, repeatX: number, repeatZ: number) {
  switch (style) {
    case 'cream_ceramic': {
      const map = tex.floorCreamColor.clone();
      map.repeat.set(repeatX, repeatZ);
      map.needsUpdate = true;
      const bumpMap = tex.floorCreamBump.clone();
      bumpMap.repeat.set(repeatX, repeatZ);
      bumpMap.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.006,
        roughness: 0.26,
        metalness: 0.05,
      };
    }
    case 'light_porcelain': {
      const map = tex.floorPorcelainColor.clone();
      map.repeat.set(repeatX, repeatZ);
      map.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap: null,
        bumpScale: 0,
        roughness: 0.34,
        metalness: 0.05,
      };
    }
    case 'oak_plank': {
      const map = tex.oakColor.clone();
      map.repeat.set(repeatX * 1.4, repeatZ * 1.4);
      map.needsUpdate = true;
      const bumpMap = tex.oakBump.clone();
      bumpMap.repeat.set(repeatX * 1.4, repeatZ * 1.4);
      bumpMap.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap,
        bumpScale: 0.008,
        roughness: 0.56,
        metalness: 0.02,
      };
    }
    case 'terrazzo': {
      const map = tex.floorTerrazzoColor.clone();
      map.repeat.set(repeatX * 1.6, repeatZ * 1.6);
      map.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap: null,
        bumpScale: 0,
        roughness: 0.36,
        metalness: 0.04,
      };
    }
    case 'charcoal_tile': {
      const map = tex.floorCharcoalColor.clone();
      map.repeat.set(repeatX, repeatZ);
      map.needsUpdate = true;
      return {
        color: 0xffffff,
        map,
        bumpMap: null,
        bumpScale: 0,
        roughness: 0.46,
        metalness: 0.06,
      };
    }
  }
}
