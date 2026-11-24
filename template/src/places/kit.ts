// kit.ts: building blocks for places. Every set, background and prop is REAL
// 3D geometry in code, at REAL human scale (metres): door 2.1 x 0.9, table top
// 0.75, chair seat 0.45, window sill 0.9, storey 3.0-3.4. y = bottom of the
// object (it sits on the floor). Shapes and proportions come from the
// governing reference in refs/REFERENCES.md; never copy logos, badges, text
// or real likenesses. No AI images, no flat backdrop with a slow zoom.
import * as THREE from 'three';
import {NOINK} from '../engine/ink';
import type {V3} from '../engine/story';

const HAS_DOM = typeof document !== 'undefined';

export type Opts = {rotY?: number; prop?: string; solid?: boolean; cast?: boolean; receive?: boolean; tex?: TexKind; rough?: number; metal?: number; emissive?: string; glow?: number; rep?: [number, number]; far?: boolean};
export type TexKind = 'planks' | 'stone' | 'plaster' | 'cobble' | 'thatch' | 'cloth' | 'bark' | 'tiles';

export type Place = {
  id: string;
  kind: 'interior' | 'exterior';
  practical: {pos: V3; color: string; power: number; flicker?: boolean; shadow?: boolean; label: string};
  key?: V3; // direction TO the key light, if the place's light source sets it
  dust?: {center: V3; size: V3};
  fog?: {color: string; near: number; far: number};
  inkFade?: [number, number];
  draw: (k: Kit) => void;
  update?: (k: Kit, f: number, sec: number) => void;
};

const texCache = new Map<string, THREE.Texture>();
export const makeTex = (kind: TexKind, base: string, rep: [number, number] = [1, 1]): THREE.Texture | null => {
  if (!HAS_DOM) return null;
  const key = kind + base + rep.join('x');
  if (texCache.has(key)) return texCache.get(key)!;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const col = new THREE.Color(base);
  const sh = (d: number) => '#' + col.clone().offsetHSL(0, 0, d).getHexString();
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { g.fillStyle = sh((r() - 0.5) * 0.08); g.globalAlpha = 0.5; g.fillRect(r() * 256, r() * 256, 2 + r() * 6, 2 + r() * 6); }
  g.globalAlpha = 1; g.strokeStyle = sh(-0.16); g.lineWidth = 2;
  if (kind === 'planks') for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 32) % 2 ? 40 : 120; x < 256; x += 160) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  if (kind === 'stone' || kind === 'cobble' || kind === 'tiles') {
    const h = kind === 'stone' ? 42 : 32;
    for (let y = 0; y < 256; y += h) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / h) % 2 ? 0 : 32; x < 256; x += 64 + r() * 10) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.stroke(); } }
  }
  if (kind === 'plaster') for (let i = 0; i < 40; i++) { g.strokeStyle = sh(-0.05); g.beginPath(); g.moveTo(r() * 256, r() * 256); g.lineTo(r() * 256, r() * 256); g.stroke(); }
  if (kind === 'thatch' || kind === 'bark') for (let i = 0; i < 160; i++) { g.strokeStyle = sh((r() - 0.6) * 0.15); const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 20, 256); g.stroke(); }
  if (kind === 'cloth') for (let y = 0; y < 256; y += 6) { g.strokeStyle = sh(-0.04); g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t);
  return t;
};

export class Kit {
  props: THREE.Object3D[] = [];
  solids: {box: THREE.Box3; name: string}[] = [];
  private mats = new Map<string, THREE.Material>();
  constructor(public g: THREE.Group, public place: Place) {}

  mat(color: string, o: Opts = {}) {
    const key = JSON.stringify([color, o.tex, o.rough, o.metal, o.emissive, o.glow, o.rep, o.far]);
    let m = this.mats.get(key);
    if (!m) {
      if (o.far) m = new THREE.MeshBasicMaterial({color, fog: true}); // far band: silhouette + fog
      else m = new THREE.MeshStandardMaterial({
        color: o.tex && HAS_DOM ? '#ffffff' : color,
        map: o.tex ? makeTex(o.tex, color, o.rep ?? [1, 1]) : null,
        roughness: o.rough ?? 0.82, metalness: o.metal ?? 0,
        emissive: o.emissive ?? '#000000', emissiveIntensity: o.glow ?? 0,
      });
      this.mats.set(key, m);
    }
    return m;
  }
  private add(mesh: THREE.Mesh, pos: V3, o: Opts, parent: THREE.Object3D = this.g) {
    mesh.position.set(...pos);
    mesh.rotation.y = o.rotY ?? 0;
    mesh.castShadow = o.cast ?? !o.far;
    mesh.receiveShadow = o.receive ?? !o.far;
    parent.add(mesh);
    if (o.prop) { mesh.name = o.prop; this.props.push(mesh); }
    if (o.solid) { mesh.updateWorldMatrix(true, false); this.solids.push({box: new THREE.Box3().setFromObject(mesh), name: o.prop ?? 'solid'}); }
    return mesh;
  }
  box(w: number, h: number, d: number, color: string, [x, y, z]: V3, o: Opts = {}, parent?: THREE.Object3D) {
    const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
    return this.add(new THREE.Mesh(geo, this.mat(color, o)), [x, y, z], o, parent);
  }
  cyl(rt: number, rb: number, h: number, color: string, [x, y, z]: V3, o: Opts = {}, parent?: THREE.Object3D, seg = 16) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, seg); geo.translate(0, h / 2, 0);
    return this.add(new THREE.Mesh(geo, this.mat(color, o)), [x, y, z], o, parent);
  }
  ball(r: number, color: string, pos: V3, o: Opts = {}, parent?: THREE.Object3D) {
    return this.add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), this.mat(color, o)), pos, o, parent);
  }
  roof(w: number, h: number, d: number, color: string, [x, y, z]: V3, o: Opts = {}, parent?: THREE.Object3D) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: false}); geo.translate(0, 0, -d / 2);
    return this.add(new THREE.Mesh(geo, this.mat(color, o)), [x, y, z], o, parent);
  }
  // A compound prop (chair, cart, stall) counts as ONE prop.
  compound(name: string, [x, y, z]: V3, rotY: number, build: (parent: THREE.Group) => void, solid = true) {
    const grp = new THREE.Group(); grp.name = name; grp.position.set(x, y, z); grp.rotation.y = rotY;
    this.g.add(grp); build(grp); this.props.push(grp);
    if (solid) { grp.updateWorldMatrix(true, true); this.solids.push({box: new THREE.Box3().setFromObject(grp), name}); }
    return grp;
  }
  // Sign: MADE-UP words only. Sign faces stay unlit (readable).
  sign(text: string, w: number, h: number, [x, y, z]: V3, rotY = 0, bg = '#2d4a3a', fg = '#f0dfb0') {
    const board = this.box(w + 0.08, h + 0.08, 0.06, '#4a3020', [x, y - 0.04, z], {rotY});
    let mat: THREE.Material = new THREE.MeshBasicMaterial({color: bg});
    if (HAS_DOM) {
      const c = document.createElement('canvas'); c.width = 512; c.height = Math.round((512 * h) / w);
      const g = c.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = fg; g.font = `bold ${Math.round(c.height * 0.55)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, c.width / 2, c.height / 2);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.MeshBasicMaterial({map: t, toneMapped: false});
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    face.position.set(0, h / 2 + 0.04, 0.035); board.add(face);
    face.layers.set(NOINK);
    this.props.push(board); board.name = 'sign:' + text;
    return board;
  }
  noink(o: THREE.Object3D) { o.traverse((c) => c.layers.set(NOINK)); return o; }
}
