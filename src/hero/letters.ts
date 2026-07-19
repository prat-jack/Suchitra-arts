import * as THREE from 'three'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import type { Font } from 'three/addons/loaders/FontLoader.js'
import { PALETTE } from './palette'

export interface SignLetter {
  char: string
  group: THREE.Group
  mesh: THREE.Mesh
  faceMat: THREE.MeshStandardMaterial
  sideMat: THREE.MeshStandardMaterial
  slot: THREE.Vector3
  width: number
  height: number
  /** Timeline-driven emissive level; render() is the only writer of faceMat.emissiveIntensity */
  glow: { v: number }
}

export const FLAT_Z = 0.02

// Trim-cap look: near-black returns, like the aluminum edge on real channel letters
const sideMatProto = new THREE.MeshStandardMaterial({
  color: 0x191410,
  metalness: 0.78,
  roughness: 0.32,
})

/** Radial gradient — LED modules behind an acrylic face read brighter at center. */
function makeLedTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 88)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.6, '#d9d9d9')
  g.addColorStop(1, '#8f8f8f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

function buildLetter(char: string, font: Font, size: number, ledTex: THREE.Texture): SignLetter {
  const geometry = new TextGeometry(char, {
    font,
    size,
    depth: 0.24,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.018,
    bevelSegments: 2,
  })
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const width = bb.max.x - bb.min.x
  const height = bb.max.y - bb.min.y
  // Origin at TOP-center: the group pivots where the cable attaches, so a
  // hanging letter swings like a real suspended load
  geometry.translate(-bb.min.x - width / 2, -bb.min.y - height, -bb.min.z)

  // TextGeometry UVs are raw glyph coordinates; normalize so the LED
  // gradient spans each letter's own face
  const faceLed = ledTex.clone()
  faceLed.repeat.set(1 / width, 1 / height)
  faceLed.offset.set(-bb.min.x / width, -bb.min.y / height)
  const faceMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bone,
    emissive: PALETTE.neon,
    emissiveIntensity: 0,
    emissiveMap: faceLed,
    metalness: 0.1,
    roughness: 0.6,
  })
  const sideMat = sideMatProto.clone()
  const mesh = new THREE.Mesh(geometry, [faceMat, sideMat])
  mesh.scale.z = FLAT_Z

  const group = new THREE.Group()
  group.add(mesh)
  group.visible = false

  return { char, group, mesh, faceMat, sideMat, slot: new THREE.Vector3(), width, height, glow: { v: 0 } }
}

export interface SignRows {
  letters: SignLetter[]
  suchitra: SignLetter[]
  arts: SignLetter[]
}

// ─── Still-render support (dev-only concept renders for the Work gallery) ───

export interface StillRowSpec {
  text: string
  size: number
  /** letter gap as a fraction of size (default 0.16) */
  track?: number
  /** build the whole row as ONE TextGeometry — required for cursive/script
   *  fonts, whose letters connect through glyph advances; per-character
   *  placement severs the joins */
  whole?: boolean
}

export interface StillRow {
  y: number
  minX: number
  maxX: number
}

/**
 * Word-per-row sign builder with caller-supplied materials — used by the
 * dev-only StillSign renderer to produce gallery concept images. Rows are
 * centered on x and stacked around centerY. Spaces produce gaps, not meshes.
 */
export function buildStillRows(
  font: Font,
  rows: StillRowSpec[],
  parent: THREE.Object3D,
  faceMat: THREE.MeshStandardMaterial,
  sideMat: THREE.MeshStandardMaterial,
  centerY: number,
  depth = 0.12,
): StillRow[] {
  const rowGap = rows[0].size * 0.42
  const built: { meshes: THREE.Mesh[]; xs: number[]; widths: number[]; size: number }[] = []

  const geomOpts = (size: number) => ({
    font,
    size,
    depth,
    curveSegments: 10,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
  })

  for (const row of rows) {
    if (row.whole) {
      const geometry = new TextGeometry(row.text, geomOpts(row.size))
      geometry.computeBoundingBox()
      const bb = geometry.boundingBox!
      const w = bb.max.x - bb.min.x
      const h = bb.max.y - bb.min.y
      geometry.translate(-bb.min.x - w / 2, -bb.min.y - h / 2, -bb.min.z)
      const mesh = new THREE.Mesh(geometry, [faceMat, sideMat])
      built.push({ meshes: [mesh], xs: [0], widths: [w], size: row.size })
      continue
    }
    const gap = row.size * (row.track ?? 0.16)
    const meshes: THREE.Mesh[] = []
    const widths: number[] = []
    let cursor = 0
    const positions: number[] = []
    for (const ch of row.text) {
      if (ch === ' ') {
        cursor += row.size * 0.42
        continue
      }
      const geometry = new TextGeometry(ch, geomOpts(row.size))
      geometry.computeBoundingBox()
      const bb = geometry.boundingBox!
      const w = bb.max.x - bb.min.x
      const h = bb.max.y - bb.min.y
      geometry.translate(-bb.min.x - w / 2, -bb.min.y - h / 2, -bb.min.z)
      const mesh = new THREE.Mesh(geometry, [faceMat, sideMat])
      meshes.push(mesh)
      widths.push(w)
      positions.push(cursor + w / 2)
      cursor += w + gap
    }
    const total = cursor - gap
    built.push({ meshes, xs: positions.map((p) => p - total / 2), widths, size: row.size })
  }

  const totalH =
    built.reduce((s, r) => s + r.size, 0) + rowGap * (built.length - 1)
  let y = centerY + totalH / 2
  const out: StillRow[] = []
  for (const row of built) {
    const rowY = y - row.size / 2
    let minX = Infinity
    let maxX = -Infinity
    row.meshes.forEach((m, i) => {
      m.position.set(row.xs[i], rowY, 0)
      parent.add(m)
      minX = Math.min(minX, row.xs[i] - row.widths[i] / 2)
      maxX = Math.max(maxX, row.xs[i] + row.widths[i] / 2)
    })
    out.push({ y: rowY, minX, maxX })
    y -= row.size + rowGap
  }
  return out
}

export function buildSign(font: Font, parent: THREE.Object3D): SignRows {
  const ledTex = makeLedTexture()
  const suchitra = [...'SUCHITRA'].map((c) => buildLetter(c, font, 0.85, ledTex))
  const arts = [...'ARTS'].map((c) => buildLetter(c, font, 0.46, ledTex))

  const layoutRow = (row: SignLetter[], gap: number, y: number) => {
    const total = row.reduce((w, l) => w + l.width, 0) + gap * (row.length - 1)
    let x = -total / 2
    for (const l of row) {
      l.slot.set(x + l.width / 2, y, 0.02)
      x += l.width + gap
    }
  }
  layoutRow(suchitra, 0.14, 2.75)
  layoutRow(arts, 0.34, 1.85)

  const letters = [...suchitra, ...arts]
  for (const l of letters) {
    // slot is the letter's visual center; the group origin is its top edge
    l.group.position.set(l.slot.x, l.slot.y + l.height / 2, l.slot.z)
    parent.add(l.group)
  }
  return { letters, suchitra, arts }
}
