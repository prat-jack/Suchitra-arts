import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js'
import { Font } from 'three/addons/loaders/FontLoader.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GrainVignetteShader } from './SignScene'
import { buildStillRows, type StillRowSpec } from './letters'

/**
 * DEV-ONLY concept-sign renderer. Loaded via dynamic import behind an
 * import.meta.env.DEV guard, so none of this ships in production.
 *
 * v3: the gallery set follows six client-supplied reference photos
 * (re-rendered as our own fictional marques — the references were real
 * brands' signs and other people's photographs, unusable directly):
 * skeleton script on ribbed steel (day), retro channel script on pink
 * plaster (day), open wireframe letters over a painted ghost on timber
 * (day), a panel roundel on brick (night), a backlit stencil roundel
 * (night), and monoline neon script on subway tile (night).
 *
 * Realism kit carried from v2: baked per-letter halo with occluded cores
 * (night walls), real contact shadows, IBL on letter materials only,
 * seamless 9-offset wall textures, slight camera roll, half grain.
 *
 * Usage: /?still=<id> on a dev server, e.g. /?still=sunday
 */

type WallKind = 'stone' | 'plaster' | 'brick' | 'charcoal' | 'ribbed' | 'planks' | 'tile'

interface StillCfg {
  rows: StillRowSpec[]
  font: string
  /** day = sun + hard shadows, no halo rig; night = the v2 workshop rig */
  mode?: 'day' | 'night'
  wall: WallKind
  /** base color override for tintable walls (plaster/ribbed) */
  wallBase?: string
  halo: number
  /** strip intensity override — cool colors read hotter under ACES (default 2.2) */
  haloI?: number
  face: number
  /** letter return color (default near-black trim) */
  side?: number
  metal: number
  rough: number
  faceGlow: number
  /** opaque panel behind the letters (roundel / plaque) */
  panel?: { kind: 'disc' | 'round-rect'; color: number; pad: number; ring?: number }
  /** backlit spill: radial glow bleeding out from behind the panel */
  spill?: boolean
  /** bake the per-letter halo onto the panel face (neon-on-plaque look) */
  bakeOnPanel?: boolean
  /** painted echo of the letters on the wall (offset, like a ghost coat) */
  ghost?: { color: string; dx: number; dy: number; alpha: number }
  cam: { xOff: number; y: number; ty: number; fov: number; fit: number; roll?: number }
  bloom: number
  centerY: number
}

const F_BIG = 'fonts/BigShoulders-ExtraBold.ttf'
const F_POPPINS = 'fonts/Poppins-SemiBold.ttf'
const F_PACIFICO = 'fonts/Pacifico-Regular.ttf'
const F_YELLOWTAIL = 'fonts/Yellowtail-Regular.ttf'
const F_SACRAMENTO = 'fonts/Sacramento-Regular.ttf'
const F_STENCIL = 'fonts/AllertaStencil-Regular.ttf'

export const STILLS: Record<string, StillCfg> = {
  // Ref: "thrift shop" — skeleton script, standoffs, hard sun on ribbed steel
  sunday: {
    rows: [{ text: 'second sunday', size: 0.55, whole: true }],
    font: F_PACIFICO,
    mode: 'day',
    wall: 'ribbed',
    wallBase: '#8fbca6',
    halo: 0xfff2d8,
    face: 0xe6d8bc,
    side: 0xb8a888,
    metal: 0.25,
    rough: 0.55,
    faceGlow: 0,
    cam: { xOff: -0.6, y: 2.05, ty: 2.08, fov: 34, fit: 1.2, roll: -0.4 },
    bloom: 0.05,
    centerY: 2.1,
  },
  // Ref: "Capri" — 50s channel script, deep green on pink plaster
  malabar: {
    rows: [{ text: 'malabar', size: 0.95, whole: true }],
    font: F_YELLOWTAIL,
    mode: 'day',
    wall: 'plaster',
    wallBase: '#f4ac92',
    halo: 0xfff2d8,
    face: 0x14574a,
    side: 0x0d3f36,
    metal: 0.55,
    rough: 0.32,
    faceGlow: 0,
    cam: { xOff: 0.7, y: 2.0, ty: 2.12, fov: 36, fit: 1.18, roll: 0.5 },
    bloom: 0.1,
    centerY: 2.15,
  },
  // Ref: "THE GALLERY" — open wireframe letters over a painted ghost, timber
  kala: {
    rows: [
      { text: 'KALA', size: 0.72, whole: true },
      { text: 'HOUSE', size: 0.72, whole: true },
    ],
    font: F_POPPINS,
    mode: 'day',
    wall: 'planks',
    halo: 0xfff2d8,
    face: 0x177c8c,
    side: 0x0f5a66,
    metal: 0.35,
    rough: 0.42,
    faceGlow: 0,
    ghost: { color: '#e2d232', dx: 0.13, dy: -0.1, alpha: 0.62 },
    cam: { xOff: 0.9, y: 2.1, ty: 2.15, fov: 36, fit: 1.35, roll: -0.5 },
    bloom: 0.1,
    centerY: 2.15,
  },
  // Ref: Nando's blade — reinterpreted as a flush panel roundel on brick
  hen: {
    rows: [
      { text: 'HEN', size: 0.5, whole: true },
      { text: 'HOUSE', size: 0.5, whole: true },
    ],
    font: F_BIG,
    mode: 'night',
    wall: 'brick',
    halo: 0xff8a4a,
    face: 0xd8342a,
    metal: 0.35,
    rough: 0.4,
    faceGlow: 0.12,
    panel: { kind: 'disc', color: 0x121110, pad: 0.52, ring: 0xe8e2d4 },
    cam: { xOff: -0.7, y: 2.0, ty: 2.1, fov: 36, fit: 2.05, roll: -0.5 },
    bloom: 0.22,
    centerY: 2.15,
  },
  // Ref: chicken roundel — stencil-cut disc, light bleeding through and out
  biryani: {
    rows: [
      { text: 'THE', size: 0.17, whole: true },
      { text: 'BIRYANI', size: 0.38, whole: true },
      { text: 'ROOM', size: 0.38, whole: true },
    ],
    font: F_STENCIL,
    mode: 'night',
    wall: 'brick',
    halo: 0xffb347,
    face: 0xffc87a,
    metal: 0,
    rough: 0.6,
    faceGlow: 0.85,
    panel: { kind: 'disc', color: 0x0d0c0a, pad: 0.5 },
    spill: true,
    cam: { xOff: 0.9, y: 1.9, ty: 2.1, fov: 36, fit: 2.1, roll: 0.6 },
    bloom: 0.4,
    centerY: 2.15,
  },
  // Ref: Goddess and the Baker — monoline neon script on subway tile
  kaapi: {
    rows: [
      { text: 'filter', size: 0.34, whole: true },
      { text: 'kaapi', size: 0.62, whole: true },
    ],
    font: F_SACRAMENTO,
    mode: 'night',
    wall: 'tile',
    halo: 0xffe9c4,
    face: 0xfff3d8,
    metal: 0,
    rough: 0.5,
    faceGlow: 0.55,
    panel: { kind: 'round-rect', color: 0x0e0d0c, pad: 0.42 },
    bakeOnPanel: true,
    cam: { xOff: -0.6, y: 2.0, ty: 2.15, fov: 36, fit: 1.7, roll: -0.4 },
    bloom: 0.3,
    centerY: 2.15,
  },
}

function wallTexture(
  kind: WallKind,
  base?: string,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; rough: number } {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  let roughness = 0.96

  // Draw every feature at all 9 wrap offsets so the texture tiles seamlessly
  const OFF = [-S, 0, S]
  const dot = (x: number, y: number, r: number) => {
    for (const ox of OFF)
      for (const oy of OFF) {
        ctx.beginPath()
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2)
        ctx.fill()
      }
  }
  const rect = (x: number, y: number, w: number, h: number) => {
    for (const ox of OFF) for (const oy of OFF) ctx.fillRect(x + ox, y + oy, w, h)
  }

  const noise = (
    alpha: number,
    count: number,
    rMin: number,
    rMax: number,
    vMin: number,
    vMax: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const v = vMin + Math.floor(Math.random() * (vMax - vMin))
      ctx.fillStyle = `rgba(${v},${v * 0.93},${v * 0.82},${alpha})`
      dot(Math.random() * S, Math.random() * S, rMin + Math.random() * (rMax - rMin))
    }
  }

  const mottle = (light = 60, dark = 6) => {
    ctx.save()
    ctx.filter = 'blur(46px)'
    for (let i = 0; i < 10; i++) {
      const lighten = Math.random() > 0.5
      const v = lighten ? light + Math.random() * 34 : dark + Math.random() * 14
      ctx.fillStyle = `rgba(${v},${v * 0.92},${v * 0.8},${0.03 + Math.random() * 0.03})`
      dot(Math.random() * S, Math.random() * S, 90 + Math.random() * 190)
    }
    ctx.restore()
  }

  const streaks = (alpha = 0.05) => {
    ctx.save()
    ctx.filter = 'blur(7px)'
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * S
      const y = Math.random() * S * 0.6
      const w = 8 + Math.random() * 26
      const h = 180 + Math.random() * 420
      ctx.fillStyle = `rgba(6,5,4,${alpha * (0.7 + Math.random() * 0.6)})`
      rect(x, y, w, h)
    }
    ctx.restore()
  }

  if (kind === 'stone' || kind === 'charcoal') {
    ctx.fillStyle = kind === 'stone' ? '#171310' : '#151210'
    ctx.fillRect(0, 0, S, S)
    mottle()
    noise(0.14, 520, 16, 72, 14, 50)
    streaks()
  } else if (kind === 'plaster') {
    ctx.fillStyle = base ?? '#2a231b'
    ctx.fillRect(0, 0, S, S)
    if (base) {
      // tint the speckle toward the base hue, not the default warm brown
      const br = parseInt(base.slice(1, 3), 16)
      const bg = parseInt(base.slice(3, 5), 16)
      const bb = parseInt(base.slice(5, 7), 16)
      for (let i = 0; i < 840; i++) {
        const k = 0.82 + Math.random() * 0.36
        ctx.fillStyle = `rgba(${Math.min(255, br * k)},${Math.min(255, bg * k)},${Math.min(255, bb * k)},0.07)`
        dot(Math.random() * S, Math.random() * S, 8 + Math.random() * 36)
      }
      streaks(0.02)
    } else {
      mottle()
      noise(0.07, 840, 8, 44, 26, 66)
      streaks()
    }
  } else if (kind === 'brick') {
    ctx.fillStyle = '#241a14'
    ctx.fillRect(0, 0, S, S)
    const bh = 64
    const bw = 128
    for (let row = 0; row < S / bh; row++) {
      const off = row % 2 ? bw / 2 : 0
      for (let x = -1; x < S / bw + 1; x++) {
        const v = 42 + Math.floor(Math.random() * 26)
        ctx.fillStyle = `rgb(${v},${Math.floor(v * 0.62)},${Math.floor(v * 0.46)})`
        ctx.fillRect(x * bw + off + 4, row * bh + 4, bw - 8, bh - 8)
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fillRect(x * bw + off + 4, row * bh + bh - 12, bw - 8, 8)
      }
    }
    mottle()
    noise(0.14, 2800, 2, 8, 10, 50)
    streaks()
  } else if (kind === 'ribbed') {
    // vertical corrugated cladding: alternating lit/shadow flutes
    const b = base ?? '#96b3a4'
    ctx.fillStyle = b
    ctx.fillRect(0, 0, S, S)
    const flute = 16 // 1024/16 = 64 flutes — tiles cleanly
    for (let x = 0; x < S; x += flute) {
      const g = ctx.createLinearGradient(x, 0, x + flute, 0)
      g.addColorStop(0, 'rgba(255,255,255,0.16)')
      g.addColorStop(0.35, 'rgba(255,255,255,0.02)')
      g.addColorStop(0.55, 'rgba(0,0,0,0.16)')
      g.addColorStop(0.8, 'rgba(0,0,0,0.05)')
      g.addColorStop(1, 'rgba(255,255,255,0.14)')
      ctx.fillStyle = g
      ctx.fillRect(x, 0, flute, S)
    }
    mottle(220, 90)
    noise(0.05, 500, 3, 14, 120, 220)
    streaks(0.03)
    roughness = 0.6
  } else if (kind === 'planks') {
    // whitewashed horizontal boards with grain and seams
    ctx.fillStyle = '#c9c2b4'
    ctx.fillRect(0, 0, S, S)
    const ph = 128 // 8 boards — tiles cleanly
    for (let row = 0; row < S / ph; row++) {
      const v = 188 + Math.floor(Math.random() * 34)
      ctx.fillStyle = `rgb(${v},${Math.floor(v * 0.965)},${Math.floor(v * 0.905)})`
      ctx.fillRect(0, row * ph + 2, S, ph - 4)
      ctx.fillStyle = 'rgba(60,50,40,0.5)'
      ctx.fillRect(0, row * ph + ph - 3, S, 3)
      // wood grain: long thin horizontal strokes
      for (let i = 0; i < 26; i++) {
        const gy = row * ph + 6 + Math.random() * (ph - 12)
        const gx = Math.random() * S
        const gw = 120 + Math.random() * 400
        ctx.fillStyle = `rgba(105,88,70,${0.05 + Math.random() * 0.07})`
        rect(gx, gy, gw, 1 + Math.random() * 2)
      }
    }
    mottle(235, 150)
    streaks(0.03)
    roughness = 0.85
  } else {
    // tile: glossy white subway courses with darker grout
    ctx.fillStyle = '#b6b2aa'
    ctx.fillRect(0, 0, S, S)
    const th = 64
    const tw = 128
    for (let row = 0; row < S / th; row++) {
      const off = row % 2 ? tw / 2 : 0
      for (let x = -1; x < S / tw + 1; x++) {
        const v = 222 + Math.floor(Math.random() * 20)
        ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`
        ctx.fillRect(x * tw + off + 3, row * th + 3, tw - 6, th - 6)
        // bevel highlight along the top edge of each tile
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillRect(x * tw + off + 3, row * th + 3, tw - 6, 4)
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.fillRect(x * tw + off + 3, row * th + th - 8, tw - 6, 5)
      }
    }
    roughness = 0.45
  }

  const map = new THREE.CanvasTexture(c)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(1.6, 1.6)
  const bump = map.clone()
  return { map, bump, rough: roughness }
}

/** Orthographic silhouette of the letter meshes → canvas (white letters on
 *  black), shared by the halo bake and the painted-ghost bake. */
function bakeSilhouette(
  renderer: THREE.WebGLRenderer,
  meshes: THREE.Mesh[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  margin: number,
): { mask: HTMLCanvasElement; sil: HTMLCanvasElement; bw: number; bh: number; cx: number; cy: number; W: number; H: number } {
  const bw = maxX - minX + margin * 2
  const bh = maxY - minY + margin * 2
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const W = 1024
  const H = Math.max(128, Math.round((W * bh) / bw))

  const silScene = new THREE.Scene()
  silScene.background = new THREE.Color(0xffffff)
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 })
  for (const mesh of meshes) {
    const clone = new THREE.Mesh(mesh.geometry, black)
    clone.position.copy(mesh.position)
    silScene.add(clone)
  }
  const cam = new THREE.OrthographicCamera(-bw / 2, bw / 2, bh / 2, -bh / 2, 0.1, 20)
  cam.position.set(cx, cy, 5)
  cam.lookAt(cx, cy, 0)

  const rt = new THREE.WebGLRenderTarget(W, H)
  const prevRT = renderer.getRenderTarget()
  renderer.setRenderTarget(rt)
  renderer.render(silScene, cam)
  const px = new Uint8Array(W * H * 4)
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, px)
  renderer.setRenderTarget(prevRT)
  rt.dispose()
  black.dispose()

  const sil = document.createElement('canvas')
  sil.width = W
  sil.height = H
  const sctx = sil.getContext('2d')!
  const img = sctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4)
  }
  sctx.putImageData(img, 0, 0)

  const mask = document.createElement('canvas')
  mask.width = W
  mask.height = H
  const mctx = mask.getContext('2d')!
  mctx.filter = 'invert(1)'
  mctx.drawImage(sil, 0, 0)
  mctx.filter = 'none'

  return { mask, sil, bw, bh, cx, cy, W, H }
}

/** v2 halo: stacked blurred copies of the mask (hot rim → wide falloff),
 *  sharp letterform multiplied back in as a dark occluded core. */
function bakeHalo(
  renderer: THREE.WebGLRenderer,
  meshes: THREE.Mesh[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  halo: number,
): THREE.Mesh {
  const m = Math.max(maxX - minX, maxY - minY) * 0.14 + 0.4
  const { mask, sil, bw, bh, cx, cy, W, H } = bakeSilhouette(
    renderer, meshes, minX, maxX, minY, maxY, m,
  )

  const glow = document.createElement('canvas')
  glow.width = W
  glow.height = H
  const g = glow.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'lighter'
  const passes: [number, number][] = [
    [3, 0.8],
    [8, 0.55],
    [18, 0.42],
    [38, 0.3],
    [72, 0.2],
  ]
  for (const [blur, alpha] of passes) {
    g.globalAlpha = alpha
    g.filter = `blur(${blur}px)`
    g.drawImage(mask, 0, 0)
  }
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = 0.9
  g.filter = 'blur(2px)'
  g.drawImage(sil, 0, 0)
  g.filter = 'none'
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(glow)
  tex.colorSpace = THREE.SRGBColorSpace
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(bw, bh),
    new THREE.MeshBasicMaterial({
      map: tex,
      color: halo,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  plane.position.set(cx, cy, 0.012)
  return plane
}

/** Painted ghost of the letters on the wall — big soft tinted echo, offset
 *  like an old coat of paint behind the metal letters. */
function bakeGhost(
  renderer: THREE.WebGLRenderer,
  meshes: THREE.Mesh[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  ghost: { color: string; dx: number; dy: number; alpha: number },
): THREE.Mesh {
  const m = Math.max(maxX - minX, maxY - minY) * 0.2 + 0.4
  const { mask, bw, bh, cx, cy, W, H } = bakeSilhouette(
    renderer, meshes, minX, maxX, minY, maxY, m,
  )

  const paint = document.createElement('canvas')
  paint.width = W
  paint.height = H
  const p = paint.getContext('2d')!
  // The silhouette canvas is fully opaque (letters white on black), so the
  // letterform must become the ALPHA channel — composite ops alone can't do
  // it. Blur for a painted edge, then luminance → alpha, tinted.
  p.filter = 'blur(3px)'
  p.drawImage(mask, 0, 0)
  p.filter = 'none'
  const img = p.getImageData(0, 0, W, H)
  const gr = parseInt(ghost.color.slice(1, 3), 16)
  const gg = parseInt(ghost.color.slice(3, 5), 16)
  const gb = parseInt(ghost.color.slice(5, 7), 16)
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = img.data[i]
    img.data[i] = gr
    img.data[i + 1] = gg
    img.data[i + 2] = gb
    img.data[i + 3] = lum
  }
  p.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(paint)
  tex.colorSpace = THREE.SRGBColorSpace
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(bw, bh),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: ghost.alpha,
      depthWrite: false,
    }),
  )
  plane.position.set(cx + ghost.dx, cy + ghost.dy, 0.006)
  return plane
}

/** Radial glow ring bleeding out from behind a backlit panel. */
function makeSpill(r: number, cx: number, cy: number, halo: number): THREE.Mesh {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.33, S / 2, S / 2, S * 0.5)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.26)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.07)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  const size = r * 2.4
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: tex,
      color: halo,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  plane.position.set(cx, cy, 0.03)
  return plane
}

function roundRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

const minXAll = (rows: { minX: number }[]) => Math.min(...rows.map((r) => r.minX))
const maxXAll = (rows: { maxX: number }[]) => Math.max(...rows.map((r) => r.maxX))

// Same filmic pass as the hero, at half the grain
const StillGrainShader = {
  ...GrainVignetteShader,
  fragmentShader: GrainVignetteShader.fragmentShader.replace('* 0.022', '* 0.011'),
}

export function mountStill(canvas: HTMLCanvasElement, id: string): () => void {
  const cfg = STILLS[id] ?? STILLS.sunday
  const day = cfg.mode === 'day'
  const w = canvas.clientWidth || window.innerWidth
  const h = canvas.clientHeight || window.innerHeight

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = day ? 1.04 : 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(day ? 0x8c8478 : 0x0c0a08)
  if (!day) scene.fog = new THREE.Fog(0x0c0a08, 10, 22)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const camera = new THREE.PerspectiveCamera(cfg.cam.fov, w / h, 0.1, 50)
  camera.position.set(cfg.cam.xOff, cfg.cam.y, 6)
  camera.lookAt(0, cfg.cam.ty, 0)

  const target = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), cfg.bloom, 0.5, 0.42))
  const grain = new ShaderPass(StillGrainShader)
  composer.addPass(grain)

  const { map, bump, rough } = wallTexture(cfg.wall, cfg.wallBase)
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const wallMat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: cfg.wall === 'tile' ? 0.6 : 1.6,
    roughness: rough,
  })
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), wallMat)
  wall.position.set(0, 4, 0)
  wall.receiveShadow = true
  scene.add(wall)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 12),
    new THREE.MeshStandardMaterial({ color: day ? 0x6e675c : 0x0e0b09, roughness: 0.9 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, 4)
  scene.add(floor)

  if (day) {
    // Open-air rig: sky ambient + one hard sun with real shadows
    scene.add(new THREE.AmbientLight(0xf2e9de, 0.55))
    const sun = new THREE.DirectionalLight(0xfff1d8, 1.9)
    sun.position.set(-6, 9, 5)
    sun.target.position.set(1, 2, 0)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0005
    const sc = sun.shadow.camera
    sc.near = 2
    sc.far = 24
    sc.left = -7
    sc.right = 7
    sc.top = 7
    sc.bottom = -7
    scene.add(sun, sun.target)
  } else {
    scene.add(new THREE.AmbientLight(0xffe0bb, 0.3))
    const graze = new THREE.SpotLight(0xffdcae, 15, 0, 1.05, 0.9, 1.5)
    graze.position.set(-5, 7.5, 3)
    graze.target.position.set(1, 2, 0)
    scene.add(graze, graze.target)
  }

  let disposed = false
  new TTFLoader().loadAsync(`${import.meta.env.BASE_URL}${cfg.font}`).then((ttf) => {
    if (disposed) return
    const font = new Font(ttf)
    const faceMat = new THREE.MeshStandardMaterial({
      color: cfg.face,
      metalness: cfg.metal,
      roughness: cfg.rough,
      emissive: cfg.faceGlow > 0 ? cfg.halo : 0x000000,
      emissiveIntensity: cfg.faceGlow,
      envMap: envTex,
      envMapIntensity: day ? 0.35 : 0.6,
    })
    const sideMat = new THREE.MeshStandardMaterial({
      color: cfg.side ?? 0x14100c,
      metalness: 0.7,
      roughness: 0.35,
      envMap: envTex,
      envMapIntensity: 0.35,
    })
    const group = new THREE.Group()
    group.position.z = 0.15
    scene.add(group)
    const rows = buildStillRows(font, cfg.rows, group, faceMat, sideMat, cfg.centerY)
    const letterMeshes: THREE.Mesh[] = []
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true
        letterMeshes.push(o)
      }
    })

    const minX = minXAll(rows)
    const maxX = maxXAll(rows)
    const minY = Math.min(...rows.map((r, i) => r.y - cfg.rows[i].size / 2))
    const maxY = Math.max(...rows.map((r, i) => r.y + cfg.rows[i].size / 2))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    // Panel (roundel / plaque) behind the letters
    let panelR = 0
    if (cfg.panel) {
      const spanX = maxX - minX
      const spanY = maxY - minY
      let panelGeo: THREE.BufferGeometry
      if (cfg.panel.kind === 'disc') {
        panelR = Math.max(spanX, spanY) / 2 + cfg.panel.pad
        panelGeo = new THREE.CircleGeometry(panelR, 96)
      } else {
        const pw = spanX + cfg.panel.pad * 2
        const ph = spanY + cfg.panel.pad * 2
        panelR = Math.max(pw, ph) / 2
        panelGeo = new THREE.ShapeGeometry(roundRectShape(pw, ph, 0.16))
      }
      const panel = new THREE.Mesh(
        panelGeo,
        new THREE.MeshStandardMaterial({ color: cfg.panel.color, metalness: 0.1, roughness: 0.78 }),
      )
      panel.position.set(cx, cy, 0.09)
      panel.receiveShadow = true
      scene.add(panel)
      if (cfg.panel.ring) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(panelR * 0.92, 0.014, 12, 128),
          new THREE.MeshStandardMaterial({
            color: cfg.panel.ring,
            emissive: cfg.panel.ring,
            emissiveIntensity: 0.35,
            metalness: 0.4,
            roughness: 0.4,
          }),
        )
        ring.position.set(cx, cy, 0.1)
        scene.add(ring)
      }
      if (cfg.spill) scene.add(makeSpill(panelR, cx, cy, cfg.halo))
    }

    // Painted ghost echo on the wall
    if (cfg.ghost) {
      scene.add(bakeGhost(renderer, letterMeshes, minX, maxX, minY, maxY, cfg.ghost))
    }

    // Night wall treatments: baked per-letter halo + dim physical strips —
    // skipped when a panel carries the glow instead (unless the halo is
    // asked to sit ON the panel face, the neon-on-plaque look)
    if (!day && (!cfg.panel || cfg.bakeOnPanel)) {
      const haloPlane = bakeHalo(renderer, letterMeshes, minX, maxX, minY, maxY, cfg.halo)
      haloPlane.position.z = cfg.panel ? 0.096 : 0.012
      scene.add(haloPlane)
    }
    if (!day && !cfg.panel) {
      RectAreaLightUniformsLib.init()
      for (const [ri, row] of rows.entries()) {
        const span = row.maxX - row.minX
        const rowH = cfg.rows[ri].size
        const strip = new THREE.RectAreaLight(
          cfg.halo,
          (cfg.haloI ?? 2.2) * 0.32,
          span + rowH * 0.25,
          rowH * 1.05,
        )
        strip.position.set((row.minX + row.maxX) / 2, row.y, 0.07)
        strip.lookAt((row.minX + row.maxX) / 2, row.y, 0)
        scene.add(strip)
      }
    }

    if (!day) {
      const fill = new THREE.PointLight(0xffe4c0, 0.7, 14, 1.8)
      fill.position.set(cfg.cam.xOff, cfg.cam.y + 0.6, 4.2)
      scene.add(fill)

      const down = new THREE.SpotLight(0xffd9a6, 4.5, 0, 0.55, 1.0, 1.7)
      down.position.set(cx, cfg.centerY + 3.4, 1.2)
      down.target.position.set(cx, cfg.centerY, 0)
      down.castShadow = true
      down.shadow.mapSize.set(512, 512)
      down.shadow.bias = -0.0006
      down.shadow.camera.near = 1
      down.shadow.camera.far = 12
      scene.add(down, down.target)

      // Backlit panels throw a warm pool on the wall below (the reference's
      // key light cue) — a soft point tucked at the panel's lower edge
      if (cfg.panel && cfg.spill) {
        const pool = new THREE.PointLight(cfg.halo, 1.1, panelR * 3, 2)
        pool.position.set(cx, cy - panelR * 0.85, 0.35)
        scene.add(pool)
      }
    }

    // Auto-fit camera distance from the widest extent (panel included)
    const fitSpan = cfg.panel ? Math.max(maxX - minX, panelR * 2) : maxX - minX
    const halfH = Math.atan(Math.tan((cfg.cam.fov * Math.PI) / 360) * camera.aspect)
    const dist = ((fitSpan / 2) * cfg.cam.fit) / Math.tan(halfH)
    camera.position.set(cfg.cam.xOff, cfg.cam.y, dist + 0.15)
    camera.lookAt(cx, cfg.cam.ty, 0)
    camera.rotation.z += ((cfg.cam.roll ?? 0) * Math.PI) / 180
  })

  let raf = 0
  const loop = () => {
    grain.uniforms.uTime.value = (performance.now() / 1000) % 1
    composer.render()
    raf = requestAnimationFrame(loop)
  }
  loop()

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const m = Array.isArray(o.material) ? o.material : [o.material]
        m.forEach((x) => x.dispose())
      }
    })
    pmrem.dispose()
    composer.dispose()
    renderer.dispose()
  }
}
