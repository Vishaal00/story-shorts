// effects.ts: the custom links of the composer chain.
// LensBlur = custom depth-of-field via dofAt(f) (camera.ts) + real camera
// motion blur from the previous frame's camera (no BokehPass, ever).
// Grade = the GRADES curve + band saturation. Grain = frame-seeded grain.
import * as THREE from 'three';
import {BlendFunction, Effect, EffectAttribute} from 'postprocessing';
import {curveLUT, type GradeRow} from './grade';

const LENS_FRAG = /* glsl */ `
uniform float uFocus;
uniform float uRange;
uniform float uMaxPx;
uniform float uNear;
uniform float uFar;
uniform float uShutter;
uniform mat4 uInvVP;
uniform mat4 uPrevVP;
uniform vec2 uTexel;
float viewZ_lens(float d) {
  float z = d * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float z = viewZ_lens(depth);
  float coc = uMaxPx * smoothstep(0.0, 1.0, abs(z - uFocus) / max(uRange, 0.001));
  vec4 wp = uInvVP * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  wp /= wp.w;
  vec4 pp = uPrevVP * wp;
  vec2 prevUv = pp.xy / pp.w * 0.5 + 0.5;
  vec2 vel = (uv - prevUv) * uShutter;
  float vpx = length(vel / uTexel);
  if (vpx > 40.0) { vel *= 40.0 / vpx; vpx = 40.0; }
  float amt = max(coc, vpx);
  if (amt < 0.6) { outputColor = inputColor; return; }
  vec3 acc = vec3(0.0);
  const int N = 16;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / float(N));
    float a = fi * 2.39996323;
    vec2 disc = vec2(cos(a), sin(a)) * r * coc * uTexel;
    vec2 line = vel * (fi / float(N - 1) - 0.5);
    acc += textureLod(inputBuffer, uv + disc + line, 0.0).rgb;
  }
  vec3 blurred = acc / float(N);
  outputColor = vec4(mix(inputColor.rgb, blurred, smoothstep(0.6, 2.0, amt)), inputColor.a);
}`;

export class LensBlur extends Effect {
  constructor() {
    super('LensBlur', LENS_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uFocus', new THREE.Uniform(3)],
        ['uRange', new THREE.Uniform(6)],
        ['uMaxPx', new THREE.Uniform(4)],
        ['uNear', new THREE.Uniform(0.1)],
        ['uFar', new THREE.Uniform(200)],
        ['uShutter', new THREE.Uniform(0.5)],
        ['uInvVP', new THREE.Uniform(new THREE.Matrix4())],
        ['uPrevVP', new THREE.Uniform(new THREE.Matrix4())],
        ['uTexel', new THREE.Uniform(new THREE.Vector2(1 / 1080, 1 / 1920))],
      ]),
    });
  }
  private h = 1920;
  override setSize(w: number, h: number) {
    this.h = h;
    this.uniforms.get('uTexel')!.value.set(1 / w, 1 / h);
  }
  set(o: {focus: number; range: number; maxPx: number; near: number; far: number; shutter: number; invVP: THREE.Matrix4; prevVP: THREE.Matrix4}) {
    const u = this.uniforms;
    u.get('uFocus')!.value = o.focus; u.get('uRange')!.value = o.range;
    u.get('uMaxPx')!.value = o.maxPx * (this.h / 1920); // same look at every render scale
    u.get('uNear')!.value = o.near; u.get('uFar')!.value = o.far; u.get('uShutter')!.value = o.shutter;
    u.get('uInvVP')!.value.copy(o.invVP); u.get('uPrevVP')!.value.copy(o.prevVP);
  }
}

const GRADE_FRAG = /* glsl */ `
uniform sampler2D tLut;
uniform vec3 uSatBands;
vec3 toDisplay_g(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLinear_g(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 d = toDisplay_g(clamp(inputColor.rgb, 0.0, 1.0));
  d = vec3(texture2D(tLut, vec2(d.r, 0.5)).r, texture2D(tLut, vec2(d.g, 0.5)).r, texture2D(tLut, vec2(d.b, 0.5)).r);
  float L = dot(d, vec3(0.2126, 0.7152, 0.0722));
  float wS = 1.0 - smoothstep(0.15, 0.4, L);
  float wH = smoothstep(0.6, 0.85, L);
  float sat = uSatBands.x * wS + uSatBands.z * wH + uSatBands.y * max(0.0, 1.0 - wS - wH);
  d = mix(vec3(L), d, sat);
  outputColor = vec4(toLinear_g(clamp(d, 0.0, 1.0)), inputColor.a);
}`;

export class Grade extends Effect {
  private lut: THREE.DataTexture;
  constructor(row: GradeRow) {
    const lut = new THREE.DataTexture(new Float32Array(256 * 4), 256, 1, THREE.RGBAFormat, THREE.FloatType);
    lut.magFilter = THREE.LinearFilter; lut.minFilter = THREE.LinearFilter;
    super('Grade', GRADE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['tLut', new THREE.Uniform(lut)],
        ['uSatBands', new THREE.Uniform(new THREE.Vector3(...row.sat))],
      ]),
    });
    this.lut = lut;
    this.setRow(row);
  }
  private key = '';
  setRow(row: GradeRow) {
    const k = JSON.stringify(row);
    if (k === this.key) return;
    this.key = k;
    const v = curveLUT(row.curve);
    const data = this.lut.image.data as Float32Array;
    for (let i = 0; i < 256; i++) data.set([v[i], v[i], v[i], 1], i * 4);
    this.lut.needsUpdate = true;
    this.uniforms.get('uSatBands')!.value.set(...row.sat);
  }
}

const GRAIN_FRAG = /* glsl */ `
uniform float uFrame;
uniform float uAmount;
uniform vec2 uRes;
float hash_gr(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = floor(uv * uRes / max(1.0, uRes.y / 1920.0));
  float n = hash_gr(px + vec2(mod(uFrame, 97.0) * 101.0, mod(uFrame, 89.0) * 57.0)) - 0.5;
  float L = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  outputColor = vec4(max(inputColor.rgb + n * uAmount * (1.0 - 0.6 * L), 0.0), inputColor.a);
}`;

export class Grain extends Effect {
  constructor(amount: number) {
    super('Grain', GRAIN_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uFrame', new THREE.Uniform(0)],
        ['uAmount', new THREE.Uniform(amount)],
        ['uRes', new THREE.Uniform(new THREE.Vector2(1080, 1920))],
      ]),
    });
  }
  override setSize(w: number, h: number) { this.uniforms.get('uRes')!.value.set(w, h); }
  setFrame(f: number) { this.uniforms.get('uFrame')!.value = f; }
}
