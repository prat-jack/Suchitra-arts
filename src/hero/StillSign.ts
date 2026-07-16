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
 * Renders a single halo-lit (reverse-channel) sign — the premium look of
 * modern Indian café/boutique signage: dark dimensional letters lifted off a
 * textured wall, lit from behind so the wall glows around them. Screenshots
 * of these configs become the Work gallery's prototype images.
 *
 * Photorealism notes (v2, after client feedback "looks like art"):
 * - The halo is BAKED per letter: an orthographic silhouette snapshot is
 *   blurred into a glow cloud, then the sharp letterform is multiplied back
 *   in as a dark core — each letter blocks its own LED wash, hot rim hugs
 *   the edges. A uniform light strip reads airbrushed; this reads like a
 *   photo. A dim RectAreaLight strip remains for broad physical wash.
 * - Shadow maps on: the downlight drops real contact shadows under letters.
 * - RoomEnvironment IBL so metal faces reflect like metal at night.
 * - Walls carry low-frequency mottling + weathering streaks, not just noise.
 * - Slight camera roll for a candid, handheld framing; grain halved.
 *
 * Usage: /?still=<id> on a dev server, e.g. /?still=kanaka
 */

type WallKind = 'stone' | 'plaster' | 'brick' | 'charcoal'

interface StillCfg {
  rows: StillRowSpec[]
  font: string
  wall: WallKind
  halo: number
  /** strip intensity override — cool colors read hotter under ACES (default 2.2) */
  haloI?: number
  face: number
  metal: number
  rough: number
  faceGlow: number
  /** xOff shifts the camera sideways for a candid angle; fit scales the
   *  auto-computed distance (1 = sign exactly fills the safe width);
   *  roll tilts the frame in degrees like a handheld shot */
  cam: { xOff: number; y: number; ty: number; fov: number; fit: number; roll?: number }
  bloom: number
  centerY: number
}

const F_BIG = 'fonts/BigShoulders-ExtraBold.ttf'
const F_PLAYFAIR = 'fonts/PlayfairDisplay-Bold.ttf'
const F_POPPINS = 'fonts/Poppins-SemiBold.ttf'

export const STILLS: Record<string, StillCfg> = {
  kanaka: {
    rows: [{ text: 'KANAKA & CO', size: 0.62, track: 0.22 }],
    font: F_PLAYFAIR,
    wall: 'stone',
    halo: 0xffb347,
    face: 0x4a3413,
    metal: 0.85,
    rough: 0.32,
    faceGlow: 0.09,
    cam: { xOff: -1.1, y: 1.9, ty: 2.05, fov: 36, fit: 1.18, roll: 0.6 },
    bloom: 0.32,
    centerY: 2.1,
  },
  marigold: {
    rows: [
      { text: 'MARIGOLD', size: 0.72, track: 0.14 },
      { text: 'CAFE & BAKERY', size: 0.2, track: 0.34 },
    ],
    font: F_POPPINS,
    wall: 'plaster',
    halo: 0xffc76e,
    face: 0x2b241c,
    metal: 0.4,
    rough: 0.5,
    faceGlow: 0.035,
    cam: { xOff: 0.7, y: 1.8, ty: 2.1, fov: 38, fit: 1.22, roll: -0.5 },
    bloom: 0.3,
    centerY: 2.1,
  },
  basava: {
    rows: [{ text: 'BASAVA SILKS', size: 0.6, track: 0.16 }],
    font: F_BIG,
    wall: 'charcoal',
    halo: 0xffab3d,
    face: 0x6e5416,
    metal: 0.9,
    rough: 0.28,
    faceGlow: 0.07,
    cam: { xOff: 0, y: 2.0, ty: 2.1, fov: 34, fit: 1.16, roll: 0.4 },
    bloom: 0.36,
    centerY: 2.1,
  },
  bakehouse: {
    rows: [{ text: 'THE BAKEHOUSE', size: 0.52, track: 0.18 }],
    font: F_POPPINS,
    wall: 'brick',
    halo: 0xffe2b8,
    face: 0x211c17,
    metal: 0.35,
    rough: 0.55,
    faceGlow: 0.03,
    cam: { xOff: -0.8, y: 1.95, ty: 2.05, fov: 38, fit: 1.2, roll: -0.7 },
    bloom: 0.28,
    centerY: 2.05,
  },
  veda: {
    rows: [
      { text: 'VEDA', size: 0.95, track: 0.2 },
      { text: 'WELLNESS SPA', size: 0.2, track: 0.4 },
    ],
    font: F_PLAYFAIR,
    wall: 'plaster',
    halo: 0x9fe8f5,
    haloI: 1.35,
    face: 0x1c272b,
    metal: 0.5,
    rough: 0.45,
    faceGlow: 0.04,
    cam: { xOff: 0.9, y: 1.9, ty: 2.15, fov: 36, fit: 1.25, roll: 0.5 },
    bloom: 0.3,
    centerY: 2.15,
  },
  cubbon: {
    rows: [{ text: 'CUBBON HOUSE', size: 0.58, track: 0.2 }],
    font: F_PLAYFAIR,
    wall: 'stone',
    halo: 0xff9a3d,
    face: 0x33261a,
    metal: 0.6,
    rough: 0.4,
    faceGlow: 0.06,
    cam: { xOff: 0.6, y: 2.0, ty: 2.05, fov: 37, fit: 1.14, roll: -0.4 },
    bloom: 0.33,
    centerY: 2.05,
  },
}

function wallTexture(kind: WallKind): {
  map: THREE.CanvasTexture
  bump: THREE.CanvasTexture
} {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!

  // Draw every feature at all 9 wrap offsets so the texture tiles seamlessly
  // (the RepeatWrapping seams read as grid lines on the wall otherwise)
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

  // Large soft tonal patches — real walls are never one value across a metre
  const mottle = () => {
    ctx.save()
    ctx.filter = 'blur(46px)'
    for (let i = 0; i < 10; i++) {
      const lighten = Math.random() > 0.5
      const v = lighten ? 60 + Math.random() * 34 : 6 + Math.random() * 14
      ctx.fillStyle = `rgba(${v},${v * 0.92},${v * 0.8},${0.03 + Math.random() * 0.03})`
      dot(Math.random() * S, Math.random() * S, 90 + Math.random() * 190)
    }
    ctx.restore()
  }

  // Vertical weathering streaks running down from random heights
  const streaks = () => {
    ctx.save()
    ctx.filter = 'blur(7px)'
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * S
      const y = Math.random() * S * 0.6
      const w = 8 + Math.random() * 26
      const h = 180 + Math.random() * 420
      ctx.fillStyle = `rgba(6,5,4,${0.04 + Math.random() * 0.05})`
      rect(x, y, w, h)
    }
    ctx.restore()
  }

  if (kind === 'stone') {
    ctx.fillStyle = '#171310'
    ctx.fillRect(0, 0, S, S)
    mottle()
    noise(0.16, 520, 20, 92, 16, 52)
    noise(0.2, 2800, 2, 10, 8, 60)
    streaks()
  } else if (kind === 'charcoal') {
    ctx.fillStyle = '#151210'
    ctx.fillRect(0, 0, S, S)
    mottle()
    noise(0.1, 640, 12, 52, 14, 40)
    streaks()
  } else if (kind === 'plaster') {
    ctx.fillStyle = '#2a231b'
    ctx.fillRect(0, 0, S, S)
    mottle()
    noise(0.09, 840, 8, 44, 26, 66)
    noise(0.12, 3600, 2, 6, 20, 70)
    streaks()
  } else {
    // brick: running-bond courses with mortar and per-brick tint jitter.
    // bw and bh divide S exactly so the bond pattern tiles without a seam.
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
        // darkened lower edge per brick — mortar shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fillRect(x * bw + off + 4, row * bh + bh - 12, bw - 8, 8)
      }
    }
    mottle()
    noise(0.14, 2800, 2, 8, 10, 50)
    streaks()
  }

  const map = new THREE.CanvasTexture(c)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(1.6, 1.6)
  const bump = map.clone()
  return { map, bump }
}

/**
 * Bake the reverse-channel halo for one sign: orthographic silhouette of the
 * letters → stacked blurred copies (hot rim → wide falloff) → the sharp
 * letterform multiplied back in as a dark core (a letter blocks its own LED
 * wash). Returned as an additive plane hugging the wall.
 */
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
  const bw = maxX - minX + m * 2
  const bh = maxY - minY + m * 2
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

  // GPU pixels are bottom-up; flip while writing into the canvas
  const sil = document.createElement('canvas')
  sil.width = W
  sil.height = H
  const sctx = sil.getContext('2d')!
  const img = sctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4)
  }
  sctx.putImageData(img, 0, 0)

  // letters-as-white mask for the glow passes
  const mask = document.createElement('canvas')
  mask.width = W
  mask.height = H
  const mctx = mask.getContext('2d')!
  mctx.filter = 'invert(1)'
  mctx.drawImage(sil, 0, 0)
  mctx.filter = 'none'

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
  // dark core: the letter body blocks its own wash
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

const minXAll = (rows: { minX: number }[]) => Math.min(...rows.map((r) => r.minX))
const maxXAll = (rows: { maxX: number }[]) => Math.max(...rows.map((r) => r.maxX))

// Same filmic pass as the hero, at half the grain — a still reads noisier
// than a moving frame, and heavy grain is itself an "art filter" tell
const StillGrainShader = {
  ...GrainVignetteShader,
  fragmentShader: GrainVignetteShader.fragmentShader.replace('* 0.022', '* 0.011'),
}

export function mountStill(canvas: HTMLCanvasElement, id: string): () => void {
  const cfg = STILLS[id] ?? STILLS.kanaka
  const w = canvas.clientWidth || window.innerWidth
  const h = canvas.clientHeight || window.innerHeight

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0c0a08)
  scene.fog = new THREE.Fog(0x0c0a08, 10, 22)

  // IBL for the letter materials ONLY (assigned per-material below) — putting
  // it on scene.environment floods the matte night wall/floor with light
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

  const { map, bump } = wallTexture(cfg.wall)
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  // No roughnessMap: the color canvas is dark, and roughness reads the green
  // channel — a dark map drives roughness toward 0 and turns the wall into
  // a mirror. Matte walls want a plain high roughness.
  const wallMat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 1.6,
    roughness: 0.96,
  })
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), wallMat)
  wall.position.set(0, 4, 0)
  wall.receiveShadow = true
  scene.add(wall)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 12),
    new THREE.MeshStandardMaterial({ color: 0x0e0b09, roughness: 0.9 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, 4)
  scene.add(floor)

  scene.add(new THREE.AmbientLight(0xffe0bb, 0.3))
  const graze = new THREE.SpotLight(0xffdcae, 15, 0, 1.05, 0.9, 1.5)
  graze.position.set(-5, 7.5, 3)
  graze.target.position.set(1, 2, 0)
  scene.add(graze, graze.target)

  let disposed = false
  new TTFLoader().loadAsync(`${import.meta.env.BASE_URL}${cfg.font}`).then((ttf) => {
    if (disposed) return
    const font = new Font(ttf)
    const faceMat = new THREE.MeshStandardMaterial({
      color: cfg.face,
      metalness: cfg.metal,
      roughness: cfg.rough,
      emissive: cfg.halo,
      emissiveIntensity: cfg.faceGlow,
      envMap: envTex,
      envMapIntensity: 0.6,
    })
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x14100c,
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

    // The visible halo: baked per-letter glow on the wall. Meshes sit at
    // z 0.15 in front of the wall; the bake only cares about x/y outlines.
    scene.add(
      bakeHalo(
        renderer,
        letterMeshes,
        minXAll(rows),
        maxXAll(rows),
        Math.min(...rows.map((r, i) => r.y - cfg.rows[i].size / 2)),
        Math.max(...rows.map((r, i) => r.y + cfg.rows[i].size / 2)),
        cfg.halo,
      ),
    )

    // A dim LED-strip RectAreaLight per row keeps a broad physical wash on
    // the wall and lights the letter returns (the bake carries the shape)
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

    // A faint camera-side fill so the letter faces read as material, not holes
    const fill = new THREE.PointLight(0xffe4c0, 0.7, 14, 1.8)
    fill.position.set(cfg.cam.xOff, cfg.cam.y + 0.6, 4.2)
    scene.add(fill)

    // Downlight from above the sign — the single warm spot most premium
    // installs use; drops real contact shadows under the letters
    // Low-res shadow map on purpose: PCF blur at 512px reads as the soft
    // penumbra a real downlight throws; 2048 gave hard letter-shaped ghosts
    const down = new THREE.SpotLight(0xffd9a6, 4.5, 0, 0.55, 1.0, 1.7)
    down.position.set((minXAll(rows) + maxXAll(rows)) / 2, cfg.centerY + 3.4, 1.2)
    down.target.position.set((minXAll(rows) + maxXAll(rows)) / 2, cfg.centerY, 0)
    down.castShadow = true
    down.shadow.mapSize.set(512, 512)
    down.shadow.bias = -0.0006
    down.shadow.camera.near = 1
    down.shadow.camera.far = 12
    scene.add(down, down.target)

    // Auto-fit: pull the camera back until the widest row occupies the safe
    // width at this fov/aspect, then apply the config's framing bias
    const minX = minXAll(rows)
    const maxX = maxXAll(rows)
    const span = maxX - minX
    const halfH = Math.atan(Math.tan((cfg.cam.fov * Math.PI) / 360) * camera.aspect)
    const dist = ((span / 2) * cfg.cam.fit) / Math.tan(halfH)
    camera.position.set(cfg.cam.xOff, cfg.cam.y, dist + 0.15)
    camera.lookAt((minX + maxX) / 2, cfg.cam.ty, 0)
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
