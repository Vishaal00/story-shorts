// shade.ts: light ON the 2D card. Warm key side / cool shade side gradient,
// rim light from the key's opposite edge, practical (candle/lamp) warmth, and
// the soft cap just below the glow trigger (LOOK.charCap < LOOK.bloomThreshold),
// so bloom never touches a character and the face is not flattened.
//
// NAME COLLISION (known trap): there are two "untone" helpers. The TS
// function `untone()` below (strips the drawn tone from a palette colour)
// and the GLSL helper inside CARD_FRAG, which MUST stay named `untone_gl`.
// postprocessing also injects colour helpers into merged shaders; a GLSL
// function named `untone` (or `linearToSRGB`/`sRGBToLinear`) in our chunks
// collides at compile time. Never rename `untone_gl` to `untone`.
import * as THREE from 'three';

export const untone = (hex: string, k = 0.12): string => {
  const c = new THREE.Color(hex);
  const l = (c.r + c.g + c.b) / 3;
  c.r += (l - c.r) * k; c.g += (l - c.g) * k; c.b += (l - c.b) * k;
  return '#' + c.getHexString();
};

export const CARD_VERT = /* glsl */ `
varying vec2 vUv;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const CARD_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uRim;
uniform vec3 uPract;
uniform float uSide;   // +1 = key on screen-right of the card, -1 = left
uniform float uSat;
uniform float uCap;
uniform float uFlip;
uniform float uKey;
uniform vec2 uTexel;
varying vec2 vUv;
#include <common>
#include <fog_pars_fragment>
float luma_gl(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 untone_gl(vec3 c, float cap) {
  float L = luma_gl(c);
  float knee = cap * 0.82;
  if (L <= knee) return c;
  float Lc = knee + (cap - knee) * (1.0 - exp(-(L - knee) / (cap - knee)));
  return c * (Lc / L);
}
void main() {
  vec2 uv = vec2(uFlip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
  vec4 t = texture2D(map, uv);
  if (t.a < 0.5) discard;
  float sx = (vUv.x - 0.5) * 2.0 * uSide;
  float g = smoothstep(-0.85, 0.85, sx);          // gradient across the card
  float vy = smoothstep(0.05, 0.95, vUv.y);       // top a little brighter
  vec3 light = uShade + uLit * uKey * mix(0.34, 1.0, g) * mix(0.8, 1.0, vy) + uPract;
  vec3 c = t.rgb * light;
  // rim: edge pixels whose neighbour on the key-opposite side is empty
  float side = -uSide * (uFlip > 0.5 ? -1.0 : 1.0);
  float a1 = texture2D(map, uv + vec2(side * uTexel.x * 7.0, 0.0)).a;
  float a2 = texture2D(map, uv + vec2(side * uTexel.x * 3.5, uTexel.y * 3.0)).a;
  float rim = (1.0 - min(a1, a2));
  c += uRim * rim * 0.55 * t.rgb + uRim * rim * 0.08;
  float L = luma_gl(c);
  c = mix(vec3(L), c, uSat);
  c = untone_gl(c, uCap);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export const makeCardMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: CARD_VERT,
    fragmentShader: CARD_FRAG,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        map: {value: null},
        uLit: {value: new THREE.Vector3(1, 1, 1)},
        uShade: {value: new THREE.Vector3(0.3, 0.3, 0.3)},
        uRim: {value: new THREE.Vector3(0.5, 0.6, 0.8)},
        uPract: {value: new THREE.Vector3(0, 0, 0)},
        uSide: {value: 1},
        uSat: {value: 1},
        uCap: {value: 0.95},
        uFlip: {value: 0},
        uKey: {value: 0.85},
        uTexel: {value: new THREE.Vector2(1 / 512, 1 / 1024)},
      },
    ]),
  });

// Mask material for the ink prepass: writes depth (alpha-tested silhouette)
// and alpha 0 = "do not ink here" so world lines never cross a character.
export const makeCardMask = () =>
  new THREE.ShaderMaterial({
    uniforms: {map: {value: null}, uFlip: {value: 0}},
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uFlip; varying vec2 vUv;
      void main(){ vec2 uv = vec2(uFlip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
        if (texture2D(map, uv).a < 0.5) discard; gl_FragColor = vec4(0.0); }`,
  });
