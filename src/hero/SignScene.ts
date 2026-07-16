import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js'
import { Font } from 'three/addons/loaders/FontLoader.js'
import gsap from 'gsap'
import { buildSign, type SignRows } from './letters'
import { PALETTE } from './palette'

const EMISSIVE_ON = 1.6

/** Widen the vertical FOV on narrow/portrait viewports so the sign never crops. */
function computeFov(aspect: number): number {
  return 40 * Math.min(1.9, Math.max(1, Math.sqrt(1.75 / aspect)))
}

/** Film grain (dithers the dark-wall gradient banding) + gentle vignette. */
export const GrainVignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float grain = hash(vUv * 1024.0 + vec2(uTime * 719.0, uTime * 367.0)) - 0.5;
      c.rgb += grain * 0.022;
      float d = distance(vUv, vec2(0.5, 0.46));
      c.rgb *= mix(1.0, 0.74, smoothstep(0.34, 0.88, d));
      gl_FragColor = c;
      #include <colorspace_fragment>
    }
  `,
}
const RAIL_Y = 4.35
const CABLE_TOP = RAIL_Y - 0.07
// Short enough that a carried letter clears the mounted top row during travel
const HANG_LEN = 0.35
const WING = 8.6

interface Trolley {
  group: THREE.Group
  cablePivot: THREE.Group
  cable: THREE.Mesh
  homeX: number
}

export class SignScene {
  private renderer!: THREE.WebGLRenderer
  private composer!: EffectComposer
  private bloomPass!: UnrealBloomPass
  private grainPass!: ShaderPass
  private lampShaft!: THREE.Mesh
  private shaftMat!: THREE.MeshBasicMaterial
  private reflectorCover: THREE.Mesh | null = null
  private reflector: Reflector | null = null
  private shadowBlobs: THREE.Mesh[] = []
  private shake = 0
  private lite = false
  private scene = new THREE.Scene()
  private camera!: THREE.PerspectiveCamera
  private camTarget = new THREE.Vector3(0, 1.7, 0)

  private lamp!: THREE.SpotLight
  private ambient!: THREE.AmbientLight
  private signLight!: THREE.PointLight
  private lever!: THREE.Mesh
  private pilotMat!: THREE.MeshBasicMaterial
  private lastPointerAt = 0
  private driftW = 0
  private argonTube!: THREE.Mesh
  private argonMat!: THREE.MeshStandardMaterial
  private dust!: THREE.Points
  private dustMat!: THREE.PointsMaterial

  private sign!: SignRows
  private rig!: THREE.Group
  private trolleys: Trolley[] = []
  private leverMat!: THREE.MeshStandardMaterial
  private sparkMat!: THREE.PointsMaterial
  private argonGlow = { v: 0 }
  /** Light levels are proxies: playIntro and the scrub timeline both write here,
   *  render() is the only writer of the actual light intensities. */
  private lampLevel = { v: 0 }
  private ambientLevel = { v: 0.14 }

  private idle = false
  private elapsed = 0
  private blinkAt = 5
  private canvas: HTMLCanvasElement

  // FPS governor: exponential moving average of frame time; downgrade-only
  private fpsEma = 60
  private slowSince = -1
  private qualityTier = 0

  private breaker!: THREE.Mesh
  private signOn = true
  private contactAts: number[] = []
  private toggleTweens: gsap.core.Tween[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2(0, 0)
  private pointerSm = new THREE.Vector2(0, 0)
  private idleW = 0
  private tmpV = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement, lite = false) {
    this.canvas = canvas
    this.lite = lite
  }

  async load(): Promise<void> {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    // Bloom at full DPR on very wide screens is the main frame-time cost
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, w > 1920 ? 1.5 : 2))
    this.renderer.setSize(w, h, false)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.scene.background = new THREE.Color(PALETTE.ink)
    this.scene.fog = new THREE.Fog(PALETTE.ink, 12, 26)

    this.camera = new THREE.PerspectiveCamera(computeFov(w / h), w / h, 0.1, 60)
    this.camera.position.set(0, 1.4, 7.6)

    const target = new THREE.WebGLRenderTarget(w, h, {
      samples: 4,
      type: THREE.HalfFloatType,
    })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0, 0.22, 0.75)
    this.composer.addPass(this.bloomPass)
    this.grainPass = new ShaderPass(GrainVignetteShader)
    this.composer.addPass(this.grainPass)

    this.buildEnvironment()
    this.buildRig()

    const ttf = await new TTFLoader().loadAsync(
      `${import.meta.env.BASE_URL}fonts/BigShoulders-ExtraBold.ttf`,
    )
    const font = new Font(ttf)
    const signGroup = new THREE.Group()
    this.scene.add(signGroup)
    this.sign = buildSign(font, signGroup)
    this.buildShadowBlobs()
  }

  /** Soft wall shadows that track letters in flight — a depth cue for the hoists. */
  private buildShadowBlobs(): void {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62)
    g.addColorStop(0, 'rgba(0,0,0,0.9)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c)
    for (const letter of this.sign.letters) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const blob = new THREE.Mesh(
        new THREE.PlaneGeometry(letter.width * 1.7, letter.height * 1.4),
        mat,
      )
      blob.position.z = 0.005
      this.shadowBlobs.push(blob)
      this.scene.add(blob)
    }
  }

  /** Soft mottled noise — plaster tooth for the wall, wear for the floor. */
  private makeSurfaceNoise(): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 240; i++) {
      const r = 6 + Math.random() * 26
      const v = 104 + Math.floor(Math.random() * 48)
      ctx.fillStyle = `rgba(${v},${v},${v},0.10)`
      ctx.beginPath()
      ctx.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2)
      ctx.fill()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
  }

  private buildEnvironment(): void {
    const surfaceNoise = this.makeSurfaceNoise()
    const wallBump = surfaceNoise.clone()
    wallBump.repeat.set(5, 2.2)
    const wallMat = new THREE.MeshStandardMaterial({
      color: PALETTE.charcoal,
      roughness: 0.95,
      bumpMap: wallBump,
      bumpScale: 0.6,
    })
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(34, 14), wallMat)
    wall.position.set(0, 5, -0.02)
    this.scene.add(wall)

    const floorBump = surfaceNoise.clone()
    floorBump.repeat.set(7, 3.6)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x14100b,
      roughness: 0.85,
      bumpMap: floorBump,
      bumpScale: 0.4,
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 18), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, 6)
    this.scene.add(floor)

    this.ambient = new THREE.AmbientLight(0x8a6a44, 0.14)
    this.scene.add(this.ambient)

    this.lamp = new THREE.SpotLight(PALETTE.tungsten, 0, 0, 0.72, 0.65, 1.1)
    this.lamp.position.set(-3.4, 5.4, 4.4)
    this.lamp.target.position.set(0.4, 1.8, 0)
    this.scene.add(this.lamp, this.lamp.target)

    // Fake volumetric shaft from the work lamp — additive cone, gradient alpha
    const shaftCanvas = document.createElement('canvas')
    shaftCanvas.width = 4
    shaftCanvas.height = 128
    const sctx = shaftCanvas.getContext('2d')!
    const grad = sctx.createLinearGradient(0, 0, 0, 128)
    grad.addColorStop(0, 'rgba(255,255,255,0.85)')
    grad.addColorStop(0.55, 'rgba(255,255,255,0.28)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    sctx.fillStyle = grad
    sctx.fillRect(0, 0, 4, 128)
    const shaftTex = new THREE.CanvasTexture(shaftCanvas)
    const lampPos = new THREE.Vector3(-3.4, 5.4, 4.4)
    const lampTgt = new THREE.Vector3(-0.4, 2.4, 1.2)
    const shaftLen = lampPos.distanceTo(lampTgt)
    this.shaftMat = new THREE.MeshBasicMaterial({
      color: PALETTE.tungsten,
      transparent: true,
      opacity: 0,
      alphaMap: shaftTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    })
    this.lampShaft = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, shaftLen, 24, 1, true),
      this.shaftMat,
    )
    this.lampShaft.position.copy(lampPos).add(lampTgt).multiplyScalar(0.5)
    this.lampShaft.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      lampTgt.clone().sub(lampPos).normalize(),
    )
    this.scene.add(this.lampShaft)

    if (!this.lite) {
      this.reflector = new Reflector(new THREE.PlaneGeometry(9.4, 4.6), {
        clipBias: 0.003,
        textureWidth: 256,
        textureHeight: 128,
        color: 0x404040,
      })
      this.reflector.rotation.x = -Math.PI / 2
      this.reflector.position.set(0, 0.001, 1.1)
      this.scene.add(this.reflector)

      this.reflectorCover = new THREE.Mesh(
        new THREE.PlaneGeometry(9.6, 4.8),
        new THREE.MeshStandardMaterial({ color: 0x14100b, roughness: 0.85, transparent: true }),
      )
      this.reflectorCover.rotation.x = -Math.PI / 2
      this.reflectorCover.position.set(0, 0.004, 1.1)
      this.scene.add(this.reflectorCover)
    }

    this.signLight = new THREE.PointLight(PALETTE.neon, 0, 14, 1.6)
    this.signLight.position.set(0, 2.5, 1.4)
    this.scene.add(this.signLight)

    const boxMat = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.5, metalness: 0.6 })
    this.breaker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.44, 0.09), boxMat)
    this.breaker.position.set(4.1, 1.45, 0.05)
    this.scene.add(this.breaker)

    this.leverMat = new THREE.MeshStandardMaterial({
      color: PALETTE.neon,
      roughness: 0.4,
      emissive: PALETTE.neon,
      emissiveIntensity: 0,
    })
    this.lever = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), this.leverMat)
    this.lever.geometry.translate(0, 0.13, 0)
    this.lever.position.set(4.1, 1.45, 0.12)
    this.lever.rotation.z = 0.7
    this.scene.add(this.lever)

    // Pilot LED — a single point of life in the dark before the lamp wakes
    this.pilotMat = new THREE.MeshBasicMaterial({
      color: 0xff3b2f,
      transparent: true,
      opacity: 0.9,
    })
    const pilot = new THREE.Mesh(new THREE.CircleGeometry(0.016, 10), this.pilotMat)
    pilot.position.set(4.02, 1.61, 0.096)
    this.scene.add(pilot)

    const sparkCount = 14
    const sparkPos = new Float32Array(sparkCount * 3)
    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.04 + Math.random() * 0.13
      sparkPos[i * 3] = 4.1 + Math.cos(a) * r
      sparkPos[i * 3 + 1] = 1.6 + Math.sin(a) * r * 0.8
      sparkPos[i * 3 + 2] = 0.16
    }
    const sparkGeo = new THREE.BufferGeometry()
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
    this.sparkMat = new THREE.PointsMaterial({
      color: PALETTE.tungsten,
      size: 0.035,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.scene.add(new THREE.Points(sparkGeo, this.sparkMat))

    this.buildProps()

    this.argonMat = new THREE.MeshStandardMaterial({
      color: PALETTE.charcoal,
      emissive: PALETTE.argon,
      emissiveIntensity: 0,
      roughness: 0.4,
    })
    this.argonTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.6, 10), this.argonMat)
    this.argonTube.rotation.z = Math.PI / 2
    this.argonTube.position.set(0, 1.42, 0.06)
    this.argonTube.visible = false
    this.scene.add(this.argonTube)

    const count = 160
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8
      positions[i * 3 + 1] = 0.4 + Math.random() * 3.6
      positions[i * 3 + 2] = 0.2 + Math.random() * 2.6
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.dustMat = new THREE.PointsMaterial({
      color: PALETTE.tungsten,
      size: 0.018,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.dust = new THREE.Points(dustGeo, this.dustMat)
    this.scene.add(this.dust)
  }

  /** Workshop set dressing — the crew stepped out mid-job. */
  private buildProps(): void {
    const steel = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.55, metalness: 0.5 })
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x241c12, roughness: 0.9 })
    const shadowMat = new THREE.MeshStandardMaterial({ color: 0x191410, roughness: 0.95 })

    const ladder = new THREE.Group()
    const railGeo = new THREE.BoxGeometry(0.05, 2.3, 0.05)
    const railL = new THREE.Mesh(railGeo, steel)
    railL.rotation.z = 0.12
    railL.position.x = -0.24
    const railR = new THREE.Mesh(railGeo, steel)
    railR.rotation.z = -0.12
    railR.position.x = 0.24
    ladder.add(railL, railR)
    for (let i = 0; i < 4; i++) {
      const y = -0.75 + i * 0.5
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.48 - i * 0.055, 0.045, 0.045), steel)
      rung.position.y = y
      ladder.add(rung)
    }
    ladder.position.set(-3.65, 1.16, 0.9)
    this.scene.add(ladder)

    const bench = new THREE.Group()
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.6), darkWood)
    top.position.y = 0.74
    bench.add(top)
    for (const [lx, lz] of [[-0.76, -0.22], [0.76, -0.22], [-0.76, 0.22], [0.76, 0.22]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.07), shadowMat)
      leg.position.set(lx, 0.35, lz)
      bench.add(leg)
    }
    const toolbox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.19, 0.22), steel)
    toolbox.position.set(-0.45, 0.88, 0)
    bench.add(toolbox)
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.17, 12), shadowMat)
    can.position.set(0.35, 0.87, 0.1)
    bench.add(can)
    bench.position.set(3.65, 0, 4.35)
    this.scene.add(bench)

    // Installer's layout marks on the wall: a faint baseline and end ticks
    const markMat = new THREE.MeshBasicMaterial({
      color: 0x6a5f4e,
      transparent: true,
      opacity: 0.22,
    })
    const baseline = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 0.008), markMat)
    baseline.position.set(0, 2.44, 0.001)
    this.scene.add(baseline)
    for (const tx of [-3.05, 3.05]) {
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.14), markMat)
      tick.position.set(tx, 2.44, 0.001)
      this.scene.add(tick)
    }
  }

  private buildRig(): void {
    this.rig = new THREE.Group()
    this.rig.position.set(0, RAIL_Y, 0.3)

    const steel = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.45, metalness: 0.7 })
    const rail = new THREE.Mesh(new THREE.BoxGeometry(19, 0.07, 0.1), steel)
    this.rig.add(rail)

    for (const homeX of [-WING, WING]) {
      const group = new THREE.Group()
      group.position.x = homeX

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.14), steel)
      body.position.y = -0.02
      group.add(body)

      const cablePivot = new THREE.Group()
      cablePivot.position.y = -0.07

      const cableGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 6)
      cableGeo.translate(0, -0.5, 0)
      const cable = new THREE.Mesh(
        cableGeo,
        new THREE.MeshStandardMaterial({ color: 0x0b0906, roughness: 0.6 }),
      )
      cable.scale.y = 0.03
      cablePivot.add(cable)
      group.add(cablePivot)

      this.rig.add(group)
      this.trolleys.push({ group, cablePivot, cable, homeX })
    }

    this.scene.add(this.rig)
  }

  /** Sway keyframes applied identically to the hanging letter and its cable. */
  private addSway(
    tl: gsap.core.Timeline,
    letter: THREE.Object3D,
    pivot: THREE.Object3D,
    at: number,
    dur: number,
    amp: number,
  ): void {
    const beats = [amp, -amp * 0.7, amp * 0.45, -amp * 0.2, 0]
    const seg = dur / beats.length
    for (const target of [letter.rotation, pivot.rotation]) {
      tl.to(
        target,
        { keyframes: beats.map((z) => ({ z, duration: seg, ease: 'sine.inOut' })) },
        at,
      )
    }
  }

  private flickerOn(tl: gsap.core.Timeline, glow: { v: number }, at: number, on: number): void {
    tl.to(
      glow,
      {
        keyframes: [
          { v: on * 0.55, duration: 0.07 },
          { v: 0.04, duration: 0.06 },
          { v: on * 0.8, duration: 0.08 },
          { v: 0.08, duration: 0.09 },
          { v: on, duration: 0.16 },
        ],
        ease: 'none',
      },
      at,
    )
  }

  /** One letter: trolley carries it in along the rail, lowers it onto its slot, releases. */
  private hoist(tl: gsap.core.Timeline, li: number, at: number, dur: number): void {
    const letter = this.sign.letters[li]
    const trolley = this.trolleys[li % 2]
    const side = trolley.homeX > 0 ? 1 : -1
    const wingX = side * WING

    const slotTopY = letter.slot.y + letter.height / 2
    const hangY = CABLE_TOP - HANG_LEN
    const fullLen = CABLE_TOP - slotTopY

    const travel = dur * 0.36
    const descend = dur * 0.34
    const settle = dur * 0.13
    const release = dur * 0.17

    tl.set(letter.group, { visible: true }, at)
    tl.set(letter.group.position, { x: wingX, y: hangY, z: 0.3 }, at)
    tl.set(letter.group.rotation, { z: 0 }, at)
    tl.set(trolley.cable.scale, { y: HANG_LEN }, at)
    tl.set(trolley.cablePivot.rotation, { z: 0 }, at)

    tl.to(letter.group.position, { x: letter.slot.x, duration: travel, ease: 'power1.inOut' }, at)
    tl.to(trolley.group.position, { x: letter.slot.x, duration: travel, ease: 'power1.inOut' }, at)
    this.addSway(tl, letter.group, trolley.cablePivot, at + travel * 0.25, travel * 0.95, 0.055)

    const downAt = at + travel
    this.contactAts.push((downAt + descend) / 100)
    tl.to(
      letter.group.position,
      { y: slotTopY, z: letter.slot.z, duration: descend, ease: 'power2.inOut' },
      downAt,
    )
    tl.to(trolley.cable.scale, { y: fullLen, duration: descend, ease: 'power2.inOut' }, downAt)

    const contactAt = downAt + descend
    tl.fromTo(
      letter.group.scale,
      { x: 1.03, y: 1.03 },
      { x: 1, y: 1, duration: settle, ease: 'back.out(2)', immediateRender: false },
      contactAt,
    )
    // Weight transfers to the wall: the cable goes briefly slack, then recovers
    tl.to(trolley.cable.scale, { y: fullLen * 1.045, duration: 0.12, ease: 'power2.out' }, contactAt)
    tl.to(trolley.cable.scale, { y: fullLen, duration: 0.28, ease: 'back.out(3)' }, contactAt + 0.12)
    const releaseAt = contactAt + settle
    tl.to(trolley.cable.scale, { y: 0.03, duration: release * 0.45, ease: 'power3.in' }, releaseAt)
    // Return trip must finish before this trolley's next hoist starts, or the
    // two x-tweens fight and the trolley visibly stutters
    tl.to(
      trolley.group.position,
      { x: trolley.homeX, duration: release + 1.1, ease: 'power1.inOut' },
      releaseAt + release * 0.25,
    )
  }

  buildTimeline(tl: gsap.core.Timeline): void {
    const cam = this.camera.position
    const tgt = this.camTarget

    // The timeline owns light state outright; the load-time flicker is a
    // render() envelope on top, so no autoplay tween can race the scrub
    tl.set(this.lampLevel, { v: 130 }, 0)
    tl.set(this.ambientLevel, { v: 0.32 }, 0)

    // Beat 0 — camera push while the room wakes up (0–8)
    tl.to(cam, { z: 7.1, y: 1.5, duration: 8, ease: 'power1.inOut' }, 0)

    // Beat 1+2 — rig hoists the letters in (10–63)
    for (let i = 0; i < 8; i++) {
      this.hoist(tl, i, 10 + i * 4.6, 6.5)
    }
    for (let i = 0; i < 4; i++) {
      this.hoist(tl, 8 + i, 47.5 + i * 3.6, 5.2)
    }

    tl.to(cam, { z: 9.2, duration: 12, ease: 'power1.inOut' }, 14)
    tl.to(cam, { x: 0.55, duration: 22, ease: 'sine.inOut' }, 14)
    tl.to(cam, { x: -0.35, duration: 22, ease: 'sine.inOut' }, 36)
    tl.to(tgt, { y: 2.1, duration: 30, ease: 'sine.inOut' }, 20)

    // Beat 3 — inspection (64–72)
    tl.set(this.argonTube, { visible: true }, 64)
    tl.to(cam, { x: 0, y: 1.55, z: 9.6, duration: 7, ease: 'power1.inOut' }, 64)
    tl.to(tgt, { y: 2.3, duration: 7, ease: 'power1.inOut' }, 64)

    tl.set(this.pilotMat.color, { r: 0.35, g: 0.9, b: 0.55 }, 72.3)

    // Beat 4 — the snap (72–80): the mains surge, then the breaker throws itself
    tl.to(
      this.lampLevel,
      {
        keyframes: [
          { v: 32, duration: 0.4 },
          { v: 118, duration: 0.25 },
          { v: 130, duration: 0.3 },
        ],
        ease: 'none',
      },
      70.7,
    )
    tl.to(this.lever.rotation, { z: -0.7, duration: 0.5, ease: 'power4.in' }, 72)
    tl.to(this.leverMat, { emissiveIntensity: 0.9, duration: 0.4, ease: 'power2.out' }, 72.15)
    tl.to(this.sparkMat, { opacity: 1, duration: 0.09, ease: 'power4.in' }, 72.28)
    tl.to(this.sparkMat, { opacity: 0, duration: 0.55, ease: 'power2.out' }, 72.42)
    for (let i = 0; i < this.sign.letters.length; i++) {
      tl.to(
        this.sign.letters[i].mesh.scale,
        { z: 1, duration: 2.4, ease: 'expo.inOut' },
        72.5 + i * 0.07,
      )
    }
    tl.to(cam, { x: 0.8, y: 2.0, z: 11.2, duration: 6, ease: 'expo.inOut' }, 72.4)
    tl.to(tgt, { y: 2.35, duration: 6, ease: 'expo.inOut' }, 72.4)
    tl.to(this.dustMat, { opacity: 0.85, duration: 0.5, ease: 'power2.out' }, 72.7)
    tl.to(this.dustMat, { opacity: 0.3, duration: 2.5, ease: 'power1.out' }, 73.4)

    for (let i = 0; i < this.sign.letters.length; i++) {
      this.flickerOn(tl, this.sign.letters[i].glow, 74.4 + i * 0.34, EMISSIVE_ON)
    }
    tl.to(this.bloomPass, { strength: 0.3, duration: 4.5, ease: 'power2.in' }, 74.4)
    tl.to(this.signLight, { intensity: 12, duration: 4.5, ease: 'power2.in' }, 74.6)
    tl.fromTo(
      this.lampLevel,
      { v: 130 },
      { v: 40, duration: 6, ease: 'power1.inOut', immediateRender: false },
      76,
    )

    // State lock — whatever path the scrub took, the sign ends whole
    for (const letter of this.sign.letters) {
      tl.set(letter.group, { visible: true }, 79.5)
      tl.set(
        letter.group.position,
        { x: letter.slot.x, y: letter.slot.y + letter.height / 2, z: letter.slot.z },
        79.5,
      )
      tl.set(letter.group.rotation, { z: 0 }, 79.5)
      tl.set(letter.group.scale, { x: 1, y: 1 }, 79.5)
      tl.set(letter.mesh.scale, { z: 1 }, 79.5)
      tl.to(letter.glow, { v: EMISSIVE_ON, duration: 0.3 }, 79.4)
    }
    for (const trolley of this.trolleys) {
      tl.set(trolley.cable.scale, { y: 0.03 }, 79.5)
      tl.set(trolley.group.position, { x: trolley.homeX }, 79.5)
      tl.set(trolley.cablePivot.rotation, { z: 0 }, 79.5)
    }

    // Beat 5 — hero settle (80–100); the rig strikes, the crew stays to admire
    tl.to(this.rig.position, { y: RAIL_Y + 2.4, duration: 5, ease: 'power2.inOut' }, 81)
    tl.to(cam, { x: 0, y: 1.78, z: 9.8, duration: 9, ease: 'power2.inOut' }, 81)
    tl.to(tgt, { x: 0, y: 2.32, duration: 9, ease: 'power2.inOut' }, 81)
    this.flickerOn(tl, this.argonGlow, 84.5, 0.55)
    tl.fromTo(
      this.ambientLevel,
      { v: 0.32 },
      { v: 0.16, duration: 8, ease: 'power1.inOut', immediateRender: false },
      82,
    )
    tl.set({}, {}, 100)
  }

  /** Work-lamp warm-up as a pure function of wall-clock time since load. */
  private introEnvelope(): number {
    const pts: Array<[number, number]> = [
      [0.65, 0],
      [0.79, 0.46],
      [0.89, 0.05],
      [1.02, 0.69],
      [1.14, 0.23],
      [1.54, 1],
    ]
    const t = this.elapsed
    if (t <= pts[0][0]) return 0
    if (t >= pts[pts.length - 1][0]) return 1
    for (let i = 1; i < pts.length; i++) {
      if (t < pts[i][0]) {
        const [t0, v0] = pts[i - 1]
        const [t1, v1] = pts[i]
        return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0)
      }
    }
    return 1
  }

  /** Normalized scroll progress (0–1) at which each letter seats onto the wall. */
  get contactProgresses(): number[] {
    return this.contactAts
  }

  get isSignOn(): boolean {
    return this.signOn
  }

  setIdle(active: boolean): void {
    if (!active && !this.signOn) {
      // Leaving the settled frame re-enters the scroll story. The scrub only
      // writes these values when its playhead crosses their tweens (all of
      // which sit below ~82%), so a user-toggled "off" state would otherwise
      // stick — restore the timeline's end-state explicitly.
      this.signOn = true
      this.toggleTweens.forEach((t) => t.kill())
      this.toggleTweens = []
      for (const letter of this.sign.letters) letter.glow.v = EMISSIVE_ON
      this.argonGlow.v = 0.55
      this.lampLevel.v = 40
      this.signLight.intensity = 12
      this.bloomPass.strength = 0.3
      this.lever.rotation.z = -0.7
      this.leverMat.emissiveIntensity = 0.9
    }
    this.idle = active
  }

  setPointer(ndcX: number, ndcY: number): void {
    this.pointer.set(ndcX, ndcY)
    this.lastPointerAt = this.elapsed
  }

  /** True when the pointer is over the breaker while the sign is interactive. */
  pointerOverBreaker(ndcX: number, ndcY: number): boolean {
    if (!this.idle) return false
    this.tmpV.set(ndcX, ndcY, 0)
    this.raycaster.setFromCamera(this.pointer.set(ndcX, ndcY), this.camera)
    return this.raycaster.intersectObjects([this.breaker, this.lever], false).length > 0
  }

  /** Click handler: throw the breaker to kill or relight the finished sign. */
  tryToggle(ndcX: number, ndcY: number): boolean {
    if (!this.pointerOverBreaker(ndcX, ndcY)) return false
    this.toggleTweens.forEach((t) => t.kill())
    this.toggleTweens = []
    this.signOn = !this.signOn
    const T = this.toggleTweens
    if (this.signOn) {
      T.push(gsap.to(this.lever.rotation, { z: -0.7, duration: 0.4, ease: 'power4.in' }))
      T.push(gsap.to(this.leverMat, { emissiveIntensity: 0.9, duration: 0.3, delay: 0.35 }))
      this.sign.letters.forEach((l, i) => {
        T.push(
          gsap.to(l.glow, {
            keyframes: [
              { v: EMISSIVE_ON * 0.55, duration: 0.07 },
              { v: 0.04, duration: 0.06 },
              { v: EMISSIVE_ON * 0.8, duration: 0.08 },
              { v: 0.08, duration: 0.09 },
              { v: EMISSIVE_ON, duration: 0.16 },
            ],
            ease: 'none',
            delay: 0.5 + i * 0.07,
          }),
        )
      })
      T.push(gsap.to(this.argonGlow, { v: 0.55, duration: 0.4, delay: 1.4 }))
      T.push(gsap.to(this.signLight, { intensity: 12, duration: 1.2, delay: 0.55, ease: 'power2.in' }))
      T.push(gsap.to(this.bloomPass, { strength: 0.3, duration: 1.2, delay: 0.55 }))
      T.push(gsap.to(this.lampLevel, { v: 40, duration: 1.6, delay: 0.7, ease: 'power1.inOut' }))
    } else {
      T.push(gsap.to(this.lever.rotation, { z: 0.7, duration: 0.3, ease: 'power3.in' }))
      T.push(gsap.to(this.leverMat, { emissiveIntensity: 0, duration: 0.25 }))
      this.sign.letters.forEach((l) => T.push(gsap.to(l.glow, { v: 0, duration: 0.12, ease: 'power1.in' })))
      T.push(gsap.to(this.argonGlow, { v: 0, duration: 0.1 }))
      T.push(gsap.to(this.signLight, { intensity: 0, duration: 0.25 }))
      T.push(gsap.to(this.bloomPass, { strength: 0, duration: 0.4 }))
      T.push(gsap.to(this.lampLevel, { v: 110, duration: 0.9, ease: 'power1.inOut' }))
    }
    return true
  }

  /** Mobile browsers routinely kill GPU contexts; preventDefault on lost
   *  signals we can restore, and a resize rebuilds the composer targets. */
  attachContextGuards(onLost: () => void, onRestored: () => void): void {
    this.canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault()
        onLost()
      },
      false,
    )
    this.canvas.addEventListener(
      'webglcontextrestored',
      () => {
        this.resize(this.canvas.clientWidth, this.canvas.clientHeight)
        onRestored()
      },
      false,
    )
  }

  /** Kick the camera — letter contacts and the breaker throw. */
  triggerShake(amount: number): void {
    if (this.lite) return
    this.shake = Math.max(this.shake, amount)
  }

  /** If a machine can't hold ~45fps, quietly shed quality instead of janking.
   *  Downgrade-only with a 2s confirmation window so it never oscillates. */
  private govern(dt: number): void {
    if (dt <= 0 || dt > 0.5 || this.qualityTier >= 2) return
    this.fpsEma += (1 / dt - this.fpsEma) * 0.05
    if (this.fpsEma < 45) {
      if (this.slowSince < 0) this.slowSince = this.elapsed
      if (this.elapsed - this.slowSince > 2) {
        this.qualityTier += 1
        this.slowSince = -1
        this.fpsEma = 60
        if (this.qualityTier === 1) {
          this.renderer.setPixelRatio(1)
          this.composer.setPixelRatio(1)
          this.resize(this.canvas.clientWidth, this.canvas.clientHeight)
        } else {
          this.bloomPass.enabled = false
        }
      }
    } else {
      this.slowSince = -1
    }
  }

  render(dt: number): void {
    this.govern(dt)
    this.elapsed += dt
    this.dust.rotation.y = this.elapsed * 0.016
    this.dust.position.y = Math.sin(this.elapsed * 0.35) * 0.06
    this.grainPass.uniforms.uTime.value = this.elapsed % 1

    const env = this.introEnvelope()
    this.lamp.intensity = this.lampLevel.v * env
    this.ambient.intensity = 0.14 + (this.ambientLevel.v - 0.14) * env
    this.shaftMat.opacity = (this.lampLevel.v / 130) * 0.016 * env
    // Pilot LED breathes while the room is dark, holds steady once lit
    this.pilotMat.opacity =
      this.lamp.intensity < 25 ? 0.5 + 0.4 * Math.sin(this.elapsed * 2.6) : 0.95

    if (this.reflector && this.reflectorCover) {
      this.reflector.visible = this.qualityTier < 2 && this.idleW > 0.01
      const coverMat = this.reflectorCover.material as THREE.MeshStandardMaterial
      coverMat.opacity = 1 - this.idleW * 0.72
    }

    if (this.sign) {
      for (let i = 0; i < this.sign.letters.length; i++) {
        const letter = this.sign.letters[i]
        const blob = this.shadowBlobs[i]
        if (!blob) continue
        const z = letter.group.position.z
        const inFlight = letter.group.visible && z > 0.035
        blob.visible = inFlight
        if (inFlight) {
          blob.position.x = letter.group.position.x + 0.09
          blob.position.y = letter.group.position.y - letter.height / 2 - 0.1
          const near = 1 - (z - 0.02) / 0.32
          const s = 1.55 - near * 0.5
          blob.scale.set(s, s, 1)
          ;(blob.material as THREE.MeshBasicMaterial).opacity = 0.08 + near * 0.24
        }
      }
    }

    this.idleW = Math.min(1, Math.max(0, this.idleW + (this.idle ? dt * 1.5 : -dt * 3)))
    this.pointerSm.lerp(this.pointer, Math.min(1, dt * 4.5))

    if (this.sign) {
      const t = this.elapsed
      if (this.idle) this.blinkAt -= dt
      const h = this.sign.suchitra[3]
      const hBlinking =
        this.idle &&
        this.signOn &&
        ((this.blinkAt < 0.22 && this.blinkAt > 0.15) || (this.blinkAt < 0.1 && this.blinkAt > 0.04))
      if (this.blinkAt <= 0) this.blinkAt = 6 + Math.random() * 5

      for (let i = 0; i < this.sign.letters.length; i++) {
        const letter = this.sign.letters[i]
        const breathe = this.idle ? 1 + Math.sin(t * 1.3 + i * 0.7) * 0.055 : 1
        let proximity = 1
        if (this.idleW > 0.01 && this.signOn) {
          this.tmpV.set(letter.slot.x, letter.slot.y, 0.2).project(this.camera)
          const d = Math.hypot(this.tmpV.x - this.pointerSm.x, this.tmpV.y - this.pointerSm.y)
          proximity = 1 + Math.max(0, 1 - d / 0.38) * 0.32 * this.idleW
        }
        letter.faceMat.emissiveIntensity =
          letter === h && hBlinking ? 0.12 : letter.glow.v * breathe * proximity
      }
      this.argonMat.emissiveIntensity = this.argonGlow.v
    }

    // Museum drift: after ~14s without input in the settled frame, the camera
    // sways in a slow arc so the scene never feels frozen
    const still = this.idleW > 0.9 && this.elapsed - this.lastPointerAt > 14
    this.driftW = Math.min(1, Math.max(0, this.driftW + (still ? dt / 5 : -dt * 2)))

    this.camera.lookAt(this.camTarget)
    if (this.idleW > 0.01) {
      this.camera.rotateY(-this.pointerSm.x * 0.02 * this.idleW)
      this.camera.rotateX(this.pointerSm.y * 0.012 * this.idleW)
    }
    if (this.driftW > 0.01) {
      this.camera.rotateY(Math.sin(this.elapsed * 0.1) * 0.022 * this.driftW)
      this.camera.rotateX(Math.cos(this.elapsed * 0.067) * 0.009 * this.driftW)
    }
    if (this.shake > 0.0004) {
      this.camera.rotateX((Math.random() - 0.5) * this.shake)
      this.camera.rotateY((Math.random() - 0.5) * this.shake)
      this.shake *= Math.exp(-dt * 10)
    } else {
      this.shake = 0
    }
    this.composer.render()
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h
    this.camera.fov = computeFov(w / h)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.bloomPass.resolution.set(w, h)
  }

  snapToEnd(tl: gsap.core.Timeline): void {
    this.elapsed = 10
    tl.progress(1)
    this.setIdle(true)
  }

  dispose(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      }
    })
    this.composer.dispose()
    this.renderer.dispose()
  }
}
