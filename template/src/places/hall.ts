// hall.ts: WORKED EXAMPLE place (validation fixture) - a Norman-era great
// hall, warm interior, golden light. Practicals: candle on the table (casts
// the character's candle shadow) + hearth fire. Cool window on the right =
// fill + rim + a dusty light shaft aligned to the window.
// Governing reference for a real video: refs/REFERENCES.md (fixture: setting
// brief only, no reference supplied - say so at the stills gate).
import * as THREE from 'three';
import type {Kit, Place} from './kit';

export const hall: Place = {
  id: 'hall',
  kind: 'interior',
  practical: {pos: [0.35, 1.2, -2.35], color: '#ffad55', power: 3.5, flicker: true, shadow: true, label: 'candle'},
  key: [-0.85, 0.5, 0.35], // hearth side = warm key
  dust: {center: [1.5, 1.6, -2.5], size: [5, 3, 5]},
  fog: {color: '#3a2618', near: 7, far: 26},
  inkFade: [8, 22],
  draw: (k: Kit) => {
    const W = '#8a7a66', B = '#4a2e1c', P = '#a0703f';
    // shell: floor, walls, ceiling, beams (human scale: 4 m to ceiling)
    k.box(8.4, 0.1, 11, '#7a5232', [0, -0.1, -1], {tex: 'planks', rep: [4, 6], rough: 0.45});
    k.box(8.4, 4.2, 0.4, W, [0, 0, -6.2], {tex: 'stone', rep: [4, 2], solid: true, cast: false});
    k.box(0.4, 4.2, 11, W, [-4.2, 0, -1], {tex: 'stone', rep: [5, 2], solid: true, cast: false});
    k.box(0.4, 4.2, 11, W, [4.2, 0, -1], {tex: 'stone', rep: [5, 2], solid: true, cast: false});
    k.box(8.4, 0.12, 11, '#3d2818', [0, 4.1, -1], {cast: false});
    for (let z = -5.5; z <= 3; z += 1.6) k.box(8.2, 0.26, 0.24, B, [0, 3.7, z], {tex: 'bark', cast: false});
    // hearth on the left wall + fire + hood + cauldron
    k.box(0.7, 1.7, 2.2, '#6f6458', [-3.7, 0, -2.4], {tex: 'stone', prop: 'hearth', solid: true});
    k.box(0.3, 1.0, 1.4, '#140c08', [-3.36, 0.12, -2.4]);
    k.box(0.9, 2.3, 2.4, '#5e554b', [-3.75, 1.7, -2.4], {tex: 'stone', prop: 'hearth hood'});
    for (const [dz, h] of [[-0.3, 0.55], [0.05, 0.75], [0.35, 0.5]] as const)
      k.cyl(0.0, 0.16, h, '#ff9a3a', [-3.3, 0.2, -2.4 + dz], {emissive: '#ff7a1a', glow: 3.2, cast: false});
    k.cyl(0.07, 0.07, 1.1, '#3a2414', [-3.3, 0.16, -2.4], {rotY: Math.PI / 2, prop: 'logs'}).rotation.x = Math.PI / 2;
    k.ball(0.26, '#2a2622', [-3.25, 0.95, -2.4], {metal: 0.6, rough: 0.4, prop: 'cauldron'});
    // window (cool daylight) on the right wall, shutters open
    k.box(0.05, 1.4, 1.0, '#9fc3e6', [3.98, 1.0, -3.0], {emissive: '#9fc3e6', glow: 1.6, cast: false, prop: 'window'});
    for (const dz of [-0.55, 0.55]) k.box(0.08, 1.45, 0.08, B, [3.95, 0.98, -3.0 + dz]);
    k.box(0.08, 0.08, 1.2, B, [3.95, 1.68, -3.0]);
    k.box(0.08, 0.08, 1.2, B, [3.95, 0.92, -3.0]);
    k.box(0.04, 1.4, 0.5, '#5a3a22', [3.9, 1.0, -3.85], {rotY: 0.6, tex: 'planks', prop: 'shutter'});
    k.box(0.04, 1.4, 0.5, '#5a3a22', [3.9, 1.0, -2.15], {rotY: -0.6, tex: 'planks', prop: 'shutter'});
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 1.3, 0.9),
      new THREE.MeshBasicMaterial({color: '#bcd3ee', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}),
    );
    shaft.position.set(1.7, 0.75, -3.0); shaft.rotation.z = 0.38; // aligned to the window
    k.g.add(k.noink(shaft));
    // long table + benches + throne
    k.compound('table', [0, 0, -2.5], 0, (p) => {
      k.box(2.6, 0.08, 0.95, P, [0, 0.7, 0], {tex: 'planks'}, p);
      for (const [x, z] of [[-1.15, -0.38], [1.15, -0.38], [-1.15, 0.38], [1.15, 0.38]]) k.box(0.1, 0.7, 0.1, B, [x, 0, z], {}, p);
    });
    k.compound('bench', [0, 0, -1.65], 0, (p) => { k.box(2.4, 0.06, 0.32, P, [0, 0.42, 0], {}, p); for (const x of [-1.05, 1.05]) k.box(0.08, 0.42, 0.28, B, [x, 0, 0], {}, p); });
    k.compound('bench', [0, 0, -3.35], 0, (p) => { k.box(2.4, 0.06, 0.32, P, [0, 0.42, 0], {}, p); for (const x of [-1.05, 1.05]) k.box(0.08, 0.42, 0.28, B, [x, 0, 0], {}, p); });
    k.compound('throne', [0, 0, -4.2], 0, (p) => {
      k.box(0.7, 0.45, 0.6, '#5a2a1a', [0, 0, 0], {}, p); k.box(0.7, 1.5, 0.1, '#5a2a1a', [0, 0.45, -0.28], {}, p);
      k.box(0.6, 0.06, 0.5, '#8a2030', [0, 0.45, 0], {tex: 'cloth'}, p);
    });
    // on the table: candle (practical), cups, bowl, bread, jug, platter, scroll
    k.cyl(0.035, 0.035, 0.22, '#efe3c4', [0.35, 0.78, -2.35], {prop: 'candle'});
    k.cyl(0.0, 0.025, 0.06, '#ffd36b', [0.35, 1.0, -2.35], {emissive: '#ffb040', glow: 4, cast: false});
    k.cyl(0.05, 0.04, 0.1, '#8a5a32', [-0.5, 0.78, -2.3], {prop: 'cup'});
    k.cyl(0.05, 0.04, 0.1, '#8a5a32', [0.9, 0.78, -2.6], {prop: 'cup'});
    k.cyl(0.16, 0.09, 0.08, '#6a4428', [-0.1, 0.78, -2.6], {prop: 'bowl'});
    k.ball(0.11, '#c48a44', [-0.95, 0.84, -2.45], {prop: 'bread'}).scale.set(1.5, 0.7, 1);
    k.cyl(0.07, 0.1, 0.26, '#7a6a5a', [0.65, 0.78, -2.25], {prop: 'jug'});
    k.cyl(0.24, 0.24, 0.02, '#9a9a9a', [-0.3, 0.78, -2.25], {metal: 0.7, rough: 0.35, prop: 'platter'});
    k.cyl(0.035, 0.035, 0.42, '#eadbb4', [0.1, 0.8, -2.15], {prop: 'scroll'}).rotation.z = Math.PI / 2;
    // back wall: tapestry (pattern, no text), shelves + jars, door, torches
    k.box(2.2, 2.0, 0.04, '#7a2238', [-1.2, 1.3, -5.98], {tex: 'cloth', prop: 'tapestry'});
    k.box(1.6, 1.2, 0.03, '#d9b44a', [-1.2, 1.7, -5.95], {tex: 'cloth'});
    k.compound('shelves', [2.4, 0, -5.8], 0, (p) => { for (const y of [0.9, 1.5, 2.1]) k.box(1.6, 0.05, 0.35, P, [0, y, 0], {}, p); k.box(0.06, 2.2, 0.35, B, [-0.78, 0, 0], {}, p); k.box(0.06, 2.2, 0.35, B, [0.78, 0, 0], {}, p); });
    for (const [x, y, c] of [[1.9, 0.95, '#8a6a4a'], [2.3, 0.95, '#5a7a6a'], [2.7, 1.55, '#9a5a3a'], [2.1, 1.55, '#c8b896'], [2.8, 2.15, '#6a5a8a']] as const)
      k.cyl(0.08, 0.1, 0.24, c, [x, y, -5.75], {prop: 'jar'});
    k.box(0.95, 2.1, 0.1, '#4a2c18', [0.9, 0, -6.0], {tex: 'planks', prop: 'door'});
    for (const y of [0.4, 1.6]) k.box(0.9, 0.06, 0.02, '#2a2a2a', [0.9, y, -5.94], {metal: 0.7});
    for (const x of [-3.0, 3.2]) {
      k.box(0.08, 0.3, 0.12, '#2a2a2a', [x, 1.9, -5.95], {prop: 'torch sconce'});
      k.cyl(0.0, 0.07, 0.2, '#ffb040', [x, 2.22, -5.92], {emissive: '#ff8a2a', glow: 3, cast: false});
    }
    // floor clutter: chest, barrels, firewood, bucket, broom, rug, stool
    k.box(0.9, 0.55, 0.5, '#6a3e22', [-2.9, 0, -5.4], {tex: 'planks', prop: 'chest', solid: true});
    for (const [x, z] of [[3.4, -4.6], [3.55, -4.0]]) k.cyl(0.3, 0.26, 0.85, '#7a4a2a', [x, 0, z], {tex: 'planks', prop: 'barrel', solid: true});
    for (let i = 0; i < 4; i++) k.cyl(0.07, 0.07, 0.9, '#5a3a22', [-3.5, 0.08 + i * 0.13, -0.8 + (i % 2) * 0.05], {prop: i === 0 ? 'firewood' : undefined, tex: 'bark'}).rotation.x = Math.PI / 2;
    k.cyl(0.18, 0.14, 0.32, '#6a5a4a', [-3.2, 0, -0.1], {prop: 'bucket', solid: true});
    const broom = k.cyl(0.02, 0.02, 1.4, '#8a6a3a', [3.7, 0, -1.2], {prop: 'broom'}); broom.rotation.z = 0.15;
    k.box(3.2, 0.01, 2.2, '#8a3a2a', [0, 0.005, -2.5], {tex: 'cloth', prop: 'rug', cast: false});
    k.cyl(0.18, 0.2, 0.45, '#6a4428', [-2.4, 0, 0.6], {prop: 'stool', solid: true});
    k.box(0.6, 0.9, 0.04, '#d9c79a', [-3.98, 1.4, 0.8], {tex: 'cloth', prop: 'hanging cloth', rotY: Math.PI / 2});
    // more lived-in detail near the acting area (15-40 props in every frame)
    for (const [x, z] of [[-0.7, -2.6], [-0.62, -2.5], [-0.75, -2.45]]) k.ball(0.045, '#b8302a', [x, 0.8, z], {prop: 'apple'});
    k.box(0.22, 0.015, 0.03, '#b0b0b0', [0.45, 0.78, -2.65], {metal: 0.8, rough: 0.3, prop: 'knife', rotY: 0.4});
    k.cyl(0.06, 0.05, 0.05, '#e8e0d0', [-1.05, 0.78, -2.7], {prop: 'salt dish'});
    k.cyl(0.03, 0.06, 0.32, '#8a7a50', [-1.1, 0.78, -2.3], {metal: 0.6, rough: 0.4, prop: 'candlestick'});
    k.cyl(0.035, 0.035, 0.18, '#efe3c4', [-1.1, 1.1, -2.3]);
    k.cyl(0.0, 0.02, 0.05, '#ffd36b', [-1.1, 1.28, -2.3], {emissive: '#ffb040', glow: 3.5, cast: false});
    k.cyl(0.42, 0.42, 0.05, '#6a4a7a', [-2.6, 2.1, -5.95], {prop: 'shield', rotY: 0}).rotation.x = Math.PI / 2;
    for (const x of [-2.2, -1.9, -1.6]) k.cyl(0.05, 0.02, 0.35, '#6a7a3a', [x + 4.5, 2.6, -5.9], {prop: 'herbs'});
    k.ball(0.16, '#7a5a3a', [1.3, 0.85, -2.7], {prop: 'wine skin'}).scale.set(1.4, 0.8, 1);
    k.box(0.5, 0.35, 0.35, '#7a5232', [-1.8, 0, -0.2], {tex: 'planks', prop: 'small chest', solid: true});
    k.cyl(0.12, 0.1, 0.3, '#9a8a6a', [1.9, 0, -0.4], {prop: 'jug', solid: true});
    k.box(0.6, 0.04, 0.4, '#c8b896', [1.6, 0.0, 0.3], {tex: 'cloth', prop: 'dropped cloth', cast: false});
  },
  update: (k, f, sec) => {
    void k; void f; void sec; // fire flicker is driven in world.ts from the practical
  },
};
