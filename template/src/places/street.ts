// street.ts: WORKED EXAMPLE place (validation fixture) - a Norman-era town
// street by day. Three layers: foreground clutter, midground houses and
// stall, background castle silhouette in the fog band (far = silhouette +
// fog, not texture). Practical: the sun disc in the clouded sky.
import type {Kit, Place} from './kit';

const house = (k: Kit, x: number, z: number, side: 1 | -1, storeys: number, wall: string, i: number) => {
  const w = 5.0, d = 5.5, sh = 3.1;
  const fx = x - side * (d / 2); // street-facing wall plane
  k.box(d, sh * storeys, w, wall, [x, 0, z], {tex: 'plaster', solid: true});
  // timber frame on the street face
  for (let s = 0; s <= storeys; s++) k.box(0.12, 0.18, w + 0.1, '#3a2416', [fx - side * 0.04, s * sh - 0.05, z]);
  for (let j = -2; j <= 2; j++) k.box(0.1, sh * storeys, 0.16, '#3a2416', [fx - side * 0.04, 0, z + j * 1.2]);
  k.box(0.1, sh * 0.9, 0.12, '#3a2416', [fx - side * 0.05, sh * 0.05, z - 1.8]).rotation.x = 0.5 * side;
  // door 2.1 x 0.9, windows with shutters (sill 0.9)
  k.box(0.08, 2.1, 0.9, '#4a2c18', [fx - side * 0.05, 0, z - 0.6], {tex: 'planks', prop: i % 2 ? 'door' : undefined});
  for (let s = 0; s < storeys; s++) {
    const wy = s * sh + (s ? 0.7 : 0.9);
    k.box(0.06, 1.0, 0.8, '#2a3040', [fx - side * 0.05, wy, z + 1.1]);
    k.box(0.05, 1.0, 0.4, '#5a6a3a', [fx - side * 0.1, wy, z + 1.75], {tex: 'planks'});
  }
  k.roof(d + 0.8, 2.2, w + 0.4, i % 2 ? '#6a4a2a' : '#7a3a2a', [x, sh * storeys, z], {tex: i % 2 ? 'thatch' : 'tiles', rotY: Math.PI / 2});
};

export const street: Place = {
  id: 'street',
  kind: 'exterior',
  practical: {pos: [-30, 38, -70], color: '#fff1d0', power: 0, label: 'sun'},
  fog: {color: '#8d9db2', near: 22, far: 85},
  inkFade: [16, 55],
  draw: (k: Kit) => {
    k.box(40, 0.1, 120, '#8a8478', [0, -0.1, -40], {tex: 'cobble', rep: [10, 30], rough: 0.7});
    k.box(1.0, 0.12, 120, '#6a6458', [-3.4, 0, -40], {tex: 'stone', rep: [1, 40]});
    k.box(1.0, 0.12, 120, '#6a6458', [3.4, 0, -40], {tex: 'stone', rep: [1, 40]});
    const walls = ['#d8c8a8', '#e0d2b6', '#cdb894', '#d6c6a0'];
    for (let i = 0; i < 9; i++) {
      house(k, -6.7, 4 - i * 5.3, -1, 2 + (i % 2), walls[i % 4], i);
      house(k, 6.7, 2 - i * 5.3, 1, 2 + ((i + 1) % 2), walls[(i + 2) % 4], i + 1);
    }
    // far band: castle + church silhouettes in fog
    k.box(14, 10, 6, '#7d8796', [-4, 0, -75], {far: true});
    for (const x of [-10, 2]) k.box(3, 15, 3, '#7d8796', [x, 0, -74], {far: true});
    k.box(4, 13, 4, '#86909e', [12, 0, -68], {far: true});
    k.roof(4.5, 5, 4.5, '#86909e', [12, 13, -68], {far: true});
    k.box(60, 4, 2, '#8e98a6', [0, 0, -90], {far: true});
    // foreground / midground clutter (human scale)
    k.compound('market stall', [2.2, 0, -3.5], -0.2, (p) => {
      k.box(2.2, 0.9, 0.9, '#7a5232', [0, 0, 0], {tex: 'planks'}, p);
      for (const x of [-1.05, 1.05]) k.box(0.08, 2.3, 0.08, '#4a2e1c', [x, 0, -0.4], {}, p);
      k.box(2.4, 0.04, 1.4, '#b8443a', [0, 2.25, 0], {tex: 'cloth'}, p).rotation.x = 0.25;
      for (let j = 0; j < 5; j++) k.ball(0.09, ['#c84a2a', '#e0a030', '#7aa040'][j % 3], [-0.8 + j * 0.4, 0.98, 0.1], {}, p);
    });
    k.sign('BRENNOC', 1.3, 0.45, [2.2, 2.45, -3.2], -0.2);
    k.sign('HALVERY', 1.1, 0.4, [-4.0, 2.7, -9], Math.PI / 2, '#5a2a2a');
    for (const [x, z] of [[3.0, -1.2], [3.3, -0.4]]) k.cyl(0.3, 0.26, 0.85, '#7a4a2a', [x, 0, z], {tex: 'planks', prop: 'barrel', solid: true});
    for (const [x, z, s] of [[-2.9, -2.0, 0.6], [-2.6, -1.3, 0.5], [-2.95, -1.3, 0.45]] as const) k.box(s, s, s, '#8a6a42', [x, z === -1.3 && x === -2.95 ? 0.5 : 0, z], {tex: 'planks', prop: 'crate', solid: true});
    k.compound('cart', [-2.2, 0, -8], 0.3, (p) => {
      k.box(1.2, 0.12, 2.2, '#6a4428', [0, 0.55, 0], {tex: 'planks'}, p);
      for (const x of [-0.65, 0.65]) { const w = k.cyl(0.42, 0.42, 0.08, '#4a2e1c', [x, 0.42, 0.2], {}, p); w.rotation.z = Math.PI / 2; w.position.y = 0.42; }
      k.box(0.08, 0.08, 1.6, '#4a2e1c', [0, 0.5, 1.8], {}, p);
      k.ball(0.3, '#c8a860', [0, 0.85, -0.3], {tex: 'thatch'}, p);
    });
    k.compound('well', [1.6, 0, -11], 0, (p) => {
      k.cyl(0.75, 0.8, 0.8, '#8a8070', [0, 0, 0], {tex: 'stone'}, p);
      for (const x of [-0.7, 0.7]) k.box(0.1, 1.9, 0.1, '#4a2e1c', [x, 0.8, 0], {}, p);
      k.roof(1.8, 0.6, 1.2, '#7a3a2a', [0, 2.6, 0], {tex: 'tiles', rotY: Math.PI / 2}, p);
    });
    k.compound('tree', [-2.8, 0, -15], 0, (p) => {
      k.cyl(0.14, 0.22, 3.2, '#5a3a22', [0, 0, 0], {tex: 'bark'}, p);
      for (const [x, y, z, r] of [[0, 3.6, 0, 1.3], [0.7, 3.2, 0.3, 0.9], [-0.6, 3.3, -0.2, 0.95]]) k.ball(r, '#4f7a3a', [x, y, z], {}, p);
    });
    k.box(0.9, 0.5, 0.5, '#d0b070', [-3.0, 0, 1.2], {tex: 'thatch', prop: 'hay bale', solid: true});
    k.compound('bench', [3.0, 0, -6.2], Math.PI / 2, (p) => { k.box(1.4, 0.06, 0.35, '#7a5232', [0, 0.45, 0], {}, p); for (const x of [-0.6, 0.6]) k.box(0.08, 0.45, 0.3, '#4a2e1c', [x, 0, 0], {}, p); });
    for (const [x, z] of [[-3.0, -4.6], [2.9, -2.4]]) k.cyl(0.22, 0.16, 0.3, '#9a7a4a', [x, 0, z], {tex: 'thatch', prop: 'basket'});
    k.box(0.06, 0.06, 6.6, '#3a2a1a', [0, 4.2, -13], {rotY: Math.PI / 2, prop: 'washing line'});
    for (const [x, c] of [[-1.5, '#d8d0c0'], [-0.4, '#8a5a7a'], [1.0, '#5a7a9a']] as const) k.box(0.7, 0.9, 0.02, c, [x, 3.3, -13], {tex: 'cloth', prop: 'washing'});
    k.box(0.1, 0.3, 0.6, '#2a2a2a', [3.9, 2.4, -5.5], {metal: 0.6, prop: 'lantern bracket'});
    for (const z of [-18, -24]) k.cyl(0.08, 0.1, 1.1, '#4a2e1c', [3.1, 0, z], {prop: 'post', solid: true});
    // more lived-in clutter along both kerbs (15-40 props in every frame)
    for (const [x, z] of [[-3.1, -3.6], [-3.3, -4.1], [2.7, -5.2]]) k.ball(0.28, '#b8a27a', [x, 0.25, z], {tex: 'cloth', prop: 'sack'}).scale.set(1, 1.2, 0.9);
    for (const [x, z, c] of [[3.2, -7.4, '#a0603a'], [3.4, -7.9, '#8a5030'], [-3.2, -6.6, '#9a6a4a']] as const) k.cyl(0.14, 0.2, 0.42, c, [x, 0, z], {prop: 'pot', solid: true});
    const lad = k.box(0.45, 2.6, 0.06, '#7a5a32', [-3.7, 0, -11], {prop: 'ladder'}); lad.rotation.x = -0.25;
    const wh = k.cyl(0.45, 0.45, 0.08, '#4a2e1c', [3.75, 0.45, -9.5], {prop: 'cart wheel'}); wh.rotation.x = Math.PI / 2; wh.rotation.z = 0.2;
    k.cyl(0.16, 0.13, 0.3, '#6a5a4a', [-2.6, 0, -5.6], {prop: 'bucket', solid: true});
    for (let i = 0; i < 3; i++) k.cyl(0.08, 0.08, 1.0, '#5a3a22', [3.4, 0.08 + i * 0.15, -12.5], {prop: i === 0 ? 'woodpile' : undefined, tex: 'bark'}).rotation.x = Math.PI / 2;
    k.compound('hen coop', [-3.2, 0, -12.8], 0.3, (p) => { k.box(0.9, 0.6, 0.6, '#8a6a42', [0, 0, 0], {tex: 'planks'}, p); k.roof(1.0, 0.3, 0.7, '#6a4a2a', [0, 0.6, 0], {}, p); });
    k.box(0.06, 1.3, 0.06, '#7a5a32', [2.6, 0, -1.6], {prop: 'broom'}).rotation.z = 0.2;
    k.box(0.5, 0.4, 0.5, '#8a6a42', [-2.7, 0, 2.6], {tex: 'planks', prop: 'crate', solid: true});
  },
};
