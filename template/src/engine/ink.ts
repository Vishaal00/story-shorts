// ink.ts: InkPass, the first effect in the R3F <EffectComposer> chain
// (InkPass -> LensBlur -> Bloom -> ToneMapping -> Grade -> Grain).
// It is a postprocessing Effect, not a vanilla three.js composer pass.
// Each frame it renders a normal+depth prepass of the world and draws plum
// ink where depth or normals break. Objects on layer NOINK (= 3) are left out
// of the prepass (sky, dust, light shafts, sign faces). Character cards are
// drawn into the prepass with their mask material (alpha 0 = no ink), so
// world lines never cross a character; cards carry their own drawn ink.
import * as THREE from 'three';
import {BlendFunction, Effect, EffectAttribute} from 'postprocessing';
import {LOOK} from './lights';

export const NOINK = 3;

const FRAG = /* glsl */ `
uniform sampler2D tNormal;
uniform sampler2D tPreDepth;
uniform vec3 uInk;
uniform vec2 uTexel;
uniform float uThick;
uniform float uNear;
uniform float uFar;
uniform float uFadeNear;
uniform float uFadeFar;
float viewZ_ink(float d) {
  float z = d * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 n0 = texture2D(tNormal, uv);
  float z0 = viewZ_ink(texture2D(tPreDepth, uv).x);
  float edge = 0.0;
  float skip = step(n0.a, 0.5);
  vec2 o[4];
  o[0] = vec2(uThick, 0.0); o[1] = vec2(-uThick, 0.0); o[2] = vec2(0.0, uThick); o[3] = vec2(0.0, -uThick);
  for (int i = 0; i < 4; i++) {
    vec2 q = uv + o[i] * uTexel;
    vec4 n = texture2D(tNormal, q);
    skip = max(skip, step(n.a, 0.5));
    float z = viewZ_ink(texture2D(tPreDepth, q).x);
    float dz = abs(z - z0) / max(min(z, z0), 0.001);
    float dn = 1.0 - dot(normalize(n.rgb * 2.0 - 1.0), normalize(n0.rgb * 2.0 - 1.0));
    edge = max(edge, max(smoothstep(0.035, 0.07, dz), smoothstep(0.25, 0.45, dn)));
  }
  float fade = 1.0 - 0.85 * smoothstep(uFadeNear, uFadeFar, z0); // far = silhouette + fog
  float a = edge * fade * (1.0 - skip);
  outputColor = vec4(mix(inputColor.rgb, uInk, a), inputColor.a);
}`;

export class InkPass extends Effect {
  private rt: THREE.WebGLRenderTarget;
  private normalMat = new THREE.MeshNormalMaterial();
  constructor(private scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    super('InkPass', FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.NONE,
      uniforms: new Map<string, THREE.Uniform>([
        ['tNormal', new THREE.Uniform(null)],
        ['tPreDepth', new THREE.Uniform(null)],
        ['uInk', new THREE.Uniform(new THREE.Color(LOOK.ink))],
        ['uTexel', new THREE.Uniform(new THREE.Vector2(1 / 1080, 1 / 1920))],
        ['uThick', new THREE.Uniform(1.4)],
        ['uNear', new THREE.Uniform(0.1)],
        ['uFar', new THREE.Uniform(200)],
        ['uFadeNear', new THREE.Uniform(12)],
        ['uFadeFar', new THREE.Uniform(45)],
      ]),
    });
    this.rt = new THREE.WebGLRenderTarget(1080, 1920, {depthTexture: new THREE.DepthTexture(1080, 1920), samples: 0});
    this.uniforms.get('tNormal')!.value = this.rt.texture;
    this.uniforms.get('tPreDepth')!.value = this.rt.depthTexture;
  }
  setFade(near: number, far: number) {
    this.uniforms.get('uFadeNear')!.value = near;
    this.uniforms.get('uFadeFar')!.value = far;
  }
  override setSize(w: number, h: number) {
    this.rt.setSize(w, h);
    this.uniforms.get('uTexel')!.value.set(1 / w, 1 / h);
    this.uniforms.get('uThick')!.value = Math.max(1, 1.4 * (h / 1920)); // same look at every scale
  }
  override update(renderer: THREE.WebGLRenderer) {
    const {scene, camera} = this;
    this.uniforms.get('uNear')!.value = camera.near;
    this.uniforms.get('uFar')!.value = camera.far;
    const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !o.visible) return;
      swapped.push([m, m.material]);
      m.material = (o.userData.inkMask as THREE.Material) ?? this.normalMat;
    });
    const bg = scene.background, fog = scene.fog, autoShadow = renderer.shadowMap.autoUpdate;
    scene.background = null; scene.fog = null; renderer.shadowMap.autoUpdate = false;
    camera.layers.disable(NOINK);
    const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x8080ff, 1);
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(prevClear, prevAlpha);
    camera.layers.enable(NOINK);
    scene.background = bg; scene.fog = fog; renderer.shadowMap.autoUpdate = autoShadow;
    for (const [m, mat] of swapped) m.material = mat;
  }
}
