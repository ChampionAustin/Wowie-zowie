// story.js: "In this world, every time you laugh, you glow one shade brighter."
// Glow is shown with a warm emissive tint on every block plus an additive halo behind the body (picked up by bloom).
// Dim people are desaturated and darkened. lum(av, level, dim) sets both; fire() is the rule-fires beat.
import * as THREE from 'three';
import { start, shot, frame } from './core.js';
import { makeAvatar } from './avatar.js';
import { SETS, TEX, room, bookshelf, table, chair, windowPane, plant, rug } from './sets.js';
import { makeSparkles, makeBulb, makePuff } from './fx.js';
import { remap, E, lerp, clamp, box, grp, at, sign, canvasTex, mat, glow, PRE } from './util.js';

start(() => {
  // ───────── cast definitions (one look per character for the whole video)
  const DEF = {
    me: { seed: 1, skin: 'light', hair: 'messy', hairColor: '#4a2c18', top: 'hoodie', topColor: '#22b01e', bottom: 'jeans', bottomColor: '#4f79a7' },
    ollie: { seed: 2, skin: 'tan', hair: 'dreads', hairColor: '#17110f', top: 'zip', topColor: '#940c1b', sleeves: 'long', bottom: 'joggers', bottomColor: '#15151a', shoe: '#ffffff' },
    jasper: { seed: 3, skin: 'fair', hair: 'swoop', hairColor: '#f2cf5a', top: 'cardigan', topColor: '#f4f4f4', inner: '#ffcf1f', sleeves: 'long', bottom: 'slacks', bottomColor: '#e9e2d0', shoe: '#ffffff', height: 1.08 },
    teacher: { seed: 4, skin: 'brown', hair: 'bob', hairColor: '#2b1b14', top: 'cardigan', topColor: '#7b3fc4', sleeves: 'long', inner: '#f4f4f4', bottom: 'skirt', bottomColor: '#2b2f38', height: 1.2 },
    suit: { seed: 5, skin: 'tan', hair: 'buzz', hairColor: '#333', top: 'suit', topColor: '#3a3a42', sleeves: 'long', bottom: 'slacks', bottomColor: '#3a3a42', shoe: '#222', sole: '#111', height: 1.25 },
    kidA: { seed: 6, skin: 'brown', hair: 'buns', hairColor: '#1b1210', top: 'tee', topColor: '#ffd23f', bottom: 'shorts', bottomColor: '#2e9e59' },
    kidB: { seed: 7, skin: 'light', hair: 'spiky', hairColor: '#e8632b', top: 'stripes', topColor: '#f4f4f4', bottom: 'jeans', bottomColor: '#274b8f' },
    kidC: { seed: 8, skin: 'fair', hair: 'ponytail', hairColor: '#7a4a2e', top: 'sweater', topColor: '#fba8e8', sleeves: 'long', bottom: 'skirt', bottomColor: '#19a7a0' },
    kidD: { seed: 9, skin: 'tan', hair: 'curly', hairColor: '#17110f', top: 'jersey', topColor: '#2f6fd8', number: '9', bottom: 'joggers', bottomColor: '#1c1c22' },
  };

  // ───────── glow machinery
  const haloTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(128, 128, 6, 128, 128, 128); gr.addColorStop(0, 'rgba(255,244,190,0.95)'); gr.addColorStop(0.35, 'rgba(255,232,140,0.45)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const GOLD = new THREE.Color('#ffe7a0'), GREY = new THREE.Color();
  const prep = av => {
    const ms = new Set(); av.root.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && m.isMeshLambertMaterial && !m.transparent) ms.add(m); }); });
    av.mats = [...ms]; av.mats.forEach(m => { m.userData.c0 = m.color.clone(); });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    halo.position.set(0, 1.4, -0.9); av.hip.add(halo); av.halo = halo; return av;
  };
  // L = glow level (shades, 0..9), dim = 0..1, pulse = short flash on top
  const lum = (av, L, dim = 0, pulse = 0) => {
    for (const m of av.mats) {
      const c0 = m.userData.c0; m.color.copy(c0);
      if (dim > 0) { const l = c0.r * 0.3 + c0.g * 0.59 + c0.b * 0.11; GREY.setRGB(l, l, l); m.color.lerp(GREY, 0.85 * dim).multiplyScalar(1 - 0.32 * dim); }
      m.emissive.copy(GOLD).multiplyScalar(Math.max(0, L) * 0.03 + pulse * 0.3);
    }
    const k = clamp(L / 8) + pulse * 0.6; av.halo.visible = k > 0.02; av.halo.material.opacity = Math.min(1, k) * 0.55; av.halo.material.color.setScalar(1 + k * 0.3);
    const s = 4.6 + L * 0.45 + pulse * 2; av.halo.scale.set(s, s * 1.25, 1); return av;
  };
  const put = (av, x, z, ry = 0, L = 1, dim = 0, y = 0) => lum(av.reset().place(x, z, ry, y), L, dim);
  // rule fires: scream face + arms flare on the trigger word, glow ramps from -> to with overshoot, flash, sparkles; grin at +0.47 s
  const fire = (av, sp, lt, t0, from, to, rest = 'grin', dimFrom = 0) => {
    const dt = lt - t0; if (dt < 0) { lum(av, from, dimFrom); return false; }
    const k = E.back(remap(dt, 0.05, 0.45)), pulse = dt < 0.6 ? Math.sin(remap(dt, 0, 0.6) * Math.PI) * 0.9 : 0;
    lum(av, lerp(from, to, k), dimFrom * (1 - clamp(k)), pulse);
    if (dt < 0.47) { av.setFace('scream'); av.pose({ aL: [20, 70], aR: [20, 70] }, Math.sin(remap(dt, 0, 0.47) * Math.PI)); } else av.setFace(rest);
    sp.at(dt, av.root.position.toArray(), av.baseHeight); return true;
  };
  // laughing body: shake + head back
  const shake = (av, t, amt = 1) => { av.hip.position.y += Math.abs(Math.sin(t * 16)) * 0.08 * amt; av.head.rotation.x -= (0.18 + Math.sin(t * 16) * 0.05) * amt; av.hip.rotation.z += Math.sin(t * 8) * 0.03 * amt; return av; };
  const SEAT = { aL: [14, 8], aR: [14, 8], lL: 76, lR: 76 };
  const after = (lt, c, word, n = 0) => lt >= c.w(word, n);

  // ───────── props
  const hide = o => { o.visible = false; PRE.push(() => { o.visible = false; }); return o; };
  const shades = () => { const m = mat('#0c0c10'); return hide(grp(at(box(0.4, 0.24, 0.06, m, 0.04), 0.22, 0.68, 0.64), at(box(0.4, 0.24, 0.06, m, 0.04), -0.22, 0.68, 0.64), at(box(0.14, 0.05, 0.05, m), 0, 0.72, 0.66))); };
  const specs = () => { const m = mat('#16161a'), g = grp(); for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 20), m); f.position.set(s * 0.22, 0.66, 0.6); f.rotation.y = s * 0.3; g.add(f); } g.add(at(box(0.14, 0.04, 0.04, m), 0, 0.68, 0.64)); return g; };
  const paper = (text, bg = '#fbfbf4', fg = '#d53a2a') => hide(grp(at(sign(text, 1.6, 2.1, { bg, fg, border: '#c9c4b4' }), 0, 0, 0)));
  const holdAt = (o, av, y = 3.5, fwd = 1.9, ry = 0) => { const p = av.root.position, s = av.baseHeight; o.visible = true; o.position.set(p.x + Math.sin(ry) * fwd * s, p.y + y * s, p.z + Math.cos(ry) * fwd * s); o.rotation.set(-0.15, ry, 0); };
  const carryPose = { aL: [50, -8], aR: [50, -8] };

  // ───────── sets
  const front = SETS.schoolFront({ name: 'BRIGHTSIDE SCHOOL' });
  const hall = SETS.hallway({ banner: 'LAUGH\nOUT LOUD', bannerBg: '#ffd23f', locker: '#2f6fd8', poster: 'COMEDY\nCLUB', posterBg: '#e84b6a', door: 'ROOM 4' });
  const cls = SETS.classroom({ board: ['MATH TEST', '7 x 8 = ?'] });
  cls.reset = () => { cls.desks.visible = false; };
  cls.group.add(at(chair('#2e9e59'), 4, 0, 2));
  const cushion = hide(at(box(1.3, 0.22, 1.1, '#ff5fa8', 0.1), 4, 1.71, 2.1)); cls.group.add(cushion);
  const caf = SETS.cafeteria({ menu: 'TODAY: MILK + COOKIES', rule: 'NO\nSPILLS' });
  for (const t of caf.tables) for (let i = 1; i < 5; i++) t.children[i].visible = false;
  const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.2, 16, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.25, 1.0), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  hide(spot); caf.group.add(spot);
  const park = SETS.park();
  const living = SETS.livingRoom();
  const bed = SETS.bedroom({ poster: 'HA\nHA', bed: '#22b01e' });
  const street = SETS.street();
  // library: the dark corner. Night light, muted walls, shelves.
  const lib = { light: 'night', group: room({ floorTex: TEX.wood('#9a6a3a'), tile: 6, wallColor: '#7d7a9c', trim: '#4a3a2a', trimY: 0.6, w: 34, d: 24, lights: 1, ceiling: '#3a3a52' }) };
  for (const x of [-13, -7.5, 7.5, 13]) lib.group.add(at(bookshelf(5, 8), x, 0, -5));
  lib.group.add(at(windowPane(4.6, 5, '#2a3f7a'), 0, 7, -5.85), at(sign('QUIET\nPLEASE', 3.4, 1.8, { bg: '#2b2f38', fg: '#e9eef2' }), 0, 11.2, -5.85), at(plant(), 4, 0, -3.6), at(rug(8, 5, '#5a4a7a'), -4.5, 0, 1.5));

  // ───────── cast per set
  const cast = (set, names) => {
    const c = {}; for (const n of names) { c[n] = prep(makeAvatar(DEF[n])); set.group.add(c[n].root); }
    c.sp = makeSparkles(set.group); c.sp2 = makeSparkles(set.group, 9); c.bulb = makeBulb(set.group); c.puff = makePuff(set.group); return c;
  };
  const Fr = cast(front, ['jasper', 'suit', 'kidA', 'kidB']);
  const H = cast(hall, ['me', 'ollie', 'jasper', 'suit', 'kidA', 'kidB', 'kidC', 'kidD']);
  const K = cast(cls, ['me', 'ollie', 'teacher', 'kidA']);
  K.specs = specs(); K.teacher.head.add(K.specs); K.fly = hide(specs()); cls.group.add(K.fly);
  K.shades = shades(); K.teacher.head.add(K.shades); K.test = paper(['MATH TEST', '', 'F']); cls.group.add(K.test);
  const C = cast(caf, ['me', 'jasper', 'kidA', 'kidB', 'kidC', 'kidD']); C.shades = shades(); C.kidB.head.add(C.shades);
  C.milk = hide(grp(at(box(0.7, 1.0, 0.7, '#ffffff', 0.05), 0, 0, 0), at(box(0.72, 0.3, 0.72, '#3d8ee8'), 0, 0.5, 0))); caf.group.add(C.milk);
  const Pk = cast(park, ['me', 'kidA', 'kidB']);
  const L = cast(living, ['me']);
  const B = cast(bed, ['me']); B.book = paper(['JOKE', 'BOOK', 'HA HA'], '#ffcf1f', '#3a2a00'); bed.group.add(B.book);
  const St = cast(street, ['me']);
  const Li = cast(lib, ['me', 'ollie']);

  // glow levels over the story
  const ME = [1, 2, 3.5, 4.5, 5.5, 6, 6.5], JAS = 7.5, OL_DIM = 0.85;
  const bob = (t, s = 0) => Math.sin(t * 2.4 + s) * 0.1;

  // ═════════ HOOK
  shot({ line: 'In this world,', set: front, sfx: [['whoosh', 0]], cam: { pos: [0, 4.4, 22], look: [0, 5.6, 0], fov: 60, blur: 0.1, push: 0.02 },
    act(lt, c) { put(Fr.jasper, -9 + lt * 5, 3, Math.PI / 2, JAS).walk(c.t, 0.9).setFace('grin'); put(Fr.suit, 6, 0.5, -0.3, 0, 0.85).pose('hips').setFace('serious').idle(c.t);
      put(Fr.kidA, 2, 5, 0.2, 2).setFace('laugh').idle(c.t); shake(Fr.kidA, c.t, 0.6); } });
  shot({ line: 'every time you laugh,', set: front, cam: frame(2, 5, { size: 'close', side: 14 }),
    act(lt, c) { put(Fr.kidA, 2, 5, 0.15, 2).pose('open', 0.6).setFace(lt < c.w('laugh') ? 'smile' : 'laugh').idle(c.t); if (after(lt, c, 'laugh')) shake(Fr.kidA, c.t); put(Fr.kidB, 6, 3, -0.6, 1).setFace('smile').idle(c.t); } });
  shot({ line: 'you glow one shade brighter.', set: front, sfx: [['sparkle', 'glow'], ['rise', 'glow', 0.6]], cam: frame(2.6, 5, { size: 'full', side: -12 }),
    act(lt, c) { put(Fr.kidA, 2, 5, 0.1).setFace('laugh').idle(c.t); shake(Fr.kidA, c.t, 0.6); fire(Fr.kidA, Fr.sp, lt, c.w('glow'), 2, 3.6, 'laugh');
      put(Fr.kidB, 6.5, 3, -0.7, 1).setFace(after(lt, c, 'glow') ? 'shock' : 'smile').lookAt(2, 5); } });
  // ═════════ WORLD
  shot({ line: "That's why funny kids light up whole hallways,", set: hall, cam: { pos: [-8, 3.6, 10], look: [-4, 4.6, 0], fov: 62, blur: 0.25, push: 0, to: { pos: [5, 3.6, 10], look: [4, 4.6, 0] }, ease: 'lin' },
    act(lt, c) { [H.kidA, H.kidB, H.kidC, H.kidD].forEach((a, i) => { put(a, -7 + i * 4.4, i % 2 ? -1 : 1, (i - 1.5) * 0.25, 5 + i * 0.6).pose(['cheer', 'open', 'wave', 'flex'][i]).setFace(i % 2 ? 'laugh' : 'grin').idle(c.t); if (i % 2) shake(a, c.t + i, 0.6); }); } });
  shot({ line: 'and serious people are so dim', set: hall, cam: frame(3, 0, { size: 'medium', h: 1.25, side: -14, low: 0.3 }),
    act(lt, c) { put(H.suit, 3, 0, -0.2, 0, lerp(0.2, 0.9, remap(lt, c.w('dim') - 0.1, c.w('dim') + 0.15))).pose('hips').setFace(lt < c.w('dim') ? 'serious' : 'sus').idle(c.t, 0.4); } });
  shot({ line: 'you bump into them.', set: hall, sfx: [['thud', 'into']], cam: frame(1, 0, { size: 'full', side: 10 }),
    act(lt, c) { const hit = c.w('into'); put(H.suit, 3, 0, -Math.PI / 2, 0, 0.9).setFace(lt < hit ? 'serious' : 'mad').idle(c.t, 0.3);
      if (lt < hit) put(H.kidC, -4 + 5.7 * remap(lt, 0, hit), 0, Math.PI / 2, 5).walk(c.t).setFace('grin');
      else { put(H.kidC, 1.7 - 0.5 * E.out(remap(lt, hit, hit + 0.2)), 0, Math.PI / 2, 5).pose('shrug').setFace('shock'); H.kidC.hip.rotation.x = -0.25; }
      H.puff.at(lt - hit, [2.4, 3.5, 0.5]); } });
  // ═════════ NARRATOR + FRIEND
  shot({ line: 'I was pretty normal.', set: hall, cam: frame(-1, 1, { size: 'medium', side: 8 }),
    act(lt, c) { put(H.me, -1, 1, 0, ME[0]).pose('open').setFace(lt < c.w('normal') ? 'smile' : 'grin').talk(c.t).idle(c.t); put(H.kidD, 5 - lt * 3, -2, -Math.PI / 2, 1).walk(c.t).setFace('neutral'); } });
  shot({ line: 'But my best friend Ollie', set: hall, cam: frame(-6, 1, { size: 'close', side: -12 }),
    act(lt, c) { put(H.ollie, -6, 1, -0.15, 0, OL_DIM).setFace('smile').pose('wave', remap(lt, 0.1, 0.4)).idle(c.t); H.ollie.armR.rotation.z += Math.sin(c.t * 10) * 0.2; } });
  shot({ line: 'was the dimmest kid alive.', set: hall, cam: frame(-6, 1, { size: 'full', side: 14 }),
    act(lt, c) { put(H.ollie, -6, 1, 0.1, 0, OL_DIM).pose('shy').setFace('blank').idle(c.t); put(H.kidA, -1.5, -1, -0.3, 5).pose('cheer').setFace('laugh').idle(c.t); shake(H.kidA, c.t, 0.5); put(H.kidB, -10.5, -1.5, 0.3, 4.5).pose('open').setFace('grin').idle(c.t); } });
  shot({ line: "He'd never laughed once.", set: hall, cam: frame(-6, 1, { size: 'face', side: -8, push: 0.06 }),
    act(lt, c) { put(H.ollie, -6, 1, 0, 0, OL_DIM).setFace(lt < c.w('once') ? 'blank' : 'serious').idle(c.t, 0.3); } });
  shot({ line: 'Our teacher marked him absent', set: cls, cam: frame(-6, 1, { size: 'medium', h: 1.2, side: 18 }),
    act(lt, c) { put(K.teacher, -6, 1, 0.5, 1).pose({ aL: [70, -10], aR: [60, 10] }).setFace(lt < c.w('absent') ? 'neutral' : 'sus').idle(c.t); K.specs.visible = true; holdAt(K.test, K.teacher, 3.6, 1.7, 0.5); K.teacher.lookAt(-2, 3); } });
  shot({ line: 'while he stood right there.', set: cls, cam: frame(-3.5, 2.6, { size: 'full', side: -24 }),
    act(lt, c) { put(K.ollie, -2, 2.6, 0, 0, OL_DIM).pose('wave').setFace(lt < c.w('right') ? 'worried' : 'sad'); K.ollie.armR.rotation.z += Math.sin(c.t * 12) * 0.3;
      put(K.teacher, -7.5, 1, 0.7, 1).pose({ aL: [70, -10], aR: [60, 10] }).setFace('neutral').idle(c.t); K.specs.visible = true; K.teacher.head.rotation.y += 0.9; } });
  // ═════════ FOIL
  shot({ line: 'Meanwhile, Jasper', set: caf, sfx: [['sparkle', 'jasper', 0.5]], cam: frame(0, -1, { size: 'medium', h: 1.08, side: 10, low: 0.45 }),
    act(lt, c) { put(C.jasper, 0, -1, 0, JAS).pose('hips').setFace('smug').idle(c.t); } });
  shot({ line: 'was so bright, you needed sunglasses.', set: caf, cam: { pos: [0.9, 4.4, 9.2], look: [0.7, 4.3, -0.5], fov: 58, blur: 0.4, roll: 4 },
    act(lt, c) { put(C.jasper, -1.2, -1, 0.7, JAS).pose('open').setFace('grin').talk(c.t); put(C.kidB, 2.6, 0, -0.2, 1).setFace(lt < c.w('sunglasses') ? 'worried' : 'smile').idle(c.t); C.shades.visible = after(lt, c, 'sunglasses');
      if (!C.shades.visible) C.kidB.pose({ aR: [150, -30], aL: [150, -30] }); else if (after(lt, c, 'sunglasses')) C.kidB.pose('open').talk(c.t); } });
  // ═════════ INCITING MOMENT
  shot({ line: 'At lunch, he sneezed milk out his nose.', set: caf, sfx: [['pop', 'sneezed'], ['whoosh', 'sneezed', 0.5]], cam: frame(-2.4, 0, { size: 'close', h: 1.08, side: 16 }),
    act(lt, c) { const t0 = c.w('sneezed'); put(C.jasper, -2.4, 0, 0, JAS).pose({ aR: [150, -30], aL: [60, 10] }).setFace(lt < t0 - 0.25 ? 'smile' : lt < t0 ? 'worried' : 'shock');
      if (lt < t0) C.jasper.head.rotation.x = -0.3 * remap(lt, t0 - 0.4, t0); else C.jasper.head.rotation.x = 0.25;
      if (lt < t0) C.milk.visible = true, C.milk.position.set(-2.4 - 1.5 * 1.08 + 0.3, 5.2, 1.2); C.puff.at(lt - t0, [-2.4, 5.0 * 1.08, 1.0]); C.puff.group.scale.setScalar(0.6); } });
  shot({ line: 'I laughed so hard', set: caf, cam: frame(-8, 0, { size: 'close', side: -12 }),
    act(lt, c) { put(C.me, -8, 0, 0, ME[0]).pose({ aL: [40, 10], aR: [100, -20] }).setFace(lt < c.w('laughed') ? 'shock' : 'laugh'); if (after(lt, c, 'laughed')) shake(C.me, c.t); } });
  shot({ line: 'I glowed one shade brighter.', set: caf, sfx: [['sparkle', 'glowed'], ['rise', 'glowed', 0.6]], cam: frame(-6.3, 0, { size: 'full', side: -12, dist: 0.9 }),
    act(lt, c) { put(C.me, -8, 0, 0).setFace('laugh'); shake(C.me, c.t, 0.5); fire(C.me, C.sp, lt, c.w('glowed'), ME[0], ME[1]);
      put(C.kidA, -4.5, 0, -0.3, 3).setFace(after(lt, c, 'glowed') ? 'shock' : 'happy').lookAt(-8, 0); } });
  // ═════════ IDEA
  shot({ line: 'So I had an idea.', set: hall, sfx: [['ding', 'idea']], cam: frame(0, 1, { size: 'close', side: -10 }),
    act(lt, c) { put(H.me, 0, 1, 0, ME[1]).setFace(lt < c.w('idea') ? 'neutral' : 'grin').idle(c.t); H.bulb.at(lt - c.w('idea'), H.me, 0.7); H.bulb.group.position.y -= 0.6; } });
  shot({ line: 'If I laughed at everything,', set: hall, cam: frame(0, 1, { size: 'medium', side: 12 }),
    act(lt, c) { put(H.me, 0, 1, 0, ME[1]).pose('open').setFace('say').talk(c.t).idle(c.t); } });
  shot({ line: "I'd be the brightest kid in school.", set: hall, sfx: [['pop', 'brightest'], ['pop', 'kid'], ['pop', 'school']], cam: frame(0, 1, { size: 'full', side: -6, low: 0.3 }),
    act(lt, c) { put(H.me, 0, 1, 0, ME[1] + 5 * E.out(remap(lt, c.w('brightest'), c.w('brightest') + 0.4))).pose('cheer').setFace('grin').idle(c.t);
      [['brightest', H.kidA, -4.5], ['kid', H.kidB, 4.5], ['school', H.kidC, -8.5]].forEach(([w, a, x]) => { if (after(lt, c, w)) put(a, x, -2.5, x > 0 ? -0.4 : 0.4, 2).pose('cheer').setFace('wow').idle(c.t).jump(remap(lt, c.w(w), c.w(w) + 0.3), 0.6); }); } });
  // ═════════ TWO FAILED TRIES
  shot({ line: 'I fake-laughed', set: cls, cam: frame(1, 1, { size: 'close', side: 10 }),
    act(lt, c) { put(K.me, 1, 1, 0, ME[1]).pose(carryPose).setFace('laugh').idle(c.t); shake(K.me, c.t, 0.5); holdAt(K.test, K.me, 2.75, 1.7); } });
  shot({ line: 'at a math test. Nothing.', set: cls, sfx: [['tick', 'nothing']], cam: frame(1, 1, { size: 'wide', side: -4, dist: 0.8 }),
    act(lt, c) { put(K.me, 1, 1, 0, ME[1]).pose(carryPose).setFace(lt < c.w('nothing') ? 'laugh' : 'blank').idle(c.t); if (lt < c.w('nothing')) shake(K.me, c.t, 0.5); holdAt(K.test, K.me, 2.75, 1.7);
      put(K.kidA, 6 - lt * 3, -1.5, -Math.PI / 2, 2).walk(c.t).setFace('neutral'); } });
  // ═════════ ACCIDENTAL SUCCESS
  shot({ line: 'Then our teacher sat', set: cls, cam: frame(4, 2, { size: 'medium', h: 1.2, side: -12, dist: 1.1 }),
    act(lt, c) { const t0 = c.w('sat'), k = E.inOut(remap(lt, t0 - 0.25, t0 + 0.2)); put(K.teacher, 4, 2, 0, 1).setFace('neutral').idle(c.t); K.specs.visible = true; cushion.visible = true;
      K.teacher.pose('sit', k); K.teacher.hip.position.y = lerp(2, 1.75, k); } });
  shot({ line: 'on a whoopee cushion.', set: cls, sfx: [['boing', 'cushion'], ['pop', 'cushion', 0.7]], cam: frame(4, 2, { size: 'close', h: 1.2, side: 28 }),
    act(lt, c) { const t0 = c.w('cushion'); put(K.teacher, 4, 2, 0, 1).sit(1.25).pose(SEAT).setFace(lt < t0 ? 'neutral' : 'shock').idle(c.t); K.specs.visible = true; cushion.visible = true;
      if (lt >= t0) { K.teacher.jump(remap(lt, t0, t0 + 0.35), 0.5); K.teacher.pose({ aL: [20, 60], aR: [20, 60] }); } K.puff.at(lt - t0, [4, 1.6, 2.6]); } });
  shot({ line: 'I laughed for real,', set: cls, cam: frame(-1, 1, { size: 'close', side: 12 }),
    act(lt, c) { put(K.me, -1, 1, 0.2, ME[1]).pose({ aL: [30, 10], aR: [110, -20] }).setFace(lt < c.w('laughed') ? 'shock' : 'laugh').idle(c.t); if (after(lt, c, 'laughed')) shake(K.me, c.t); } });
  shot({ line: 'and lit up like a lamp.', set: cls, sfx: [['sparkle', 'lit'], ['rise', 'lit', 0.6]], cam: frame(1, 1.5, { size: 'full', side: -8, dist: 1.1 }),
    act(lt, c) { put(K.me, -1, 1, 0.2).setFace('laugh'); shake(K.me, c.t, 0.5); fire(K.me, K.sp, lt, c.w('lit'), ME[1], ME[2], 'laugh');
      put(K.teacher, 4, 2, -0.3, 1).sit(1.25).pose(SEAT).setFace(after(lt, c, 'lit') ? 'shock' : 'sus').idle(c.t); K.specs.visible = true; cushion.visible = true; } });
  // ═════════ MONTAGE
  shot({ line: 'So I hung out with funny kids,', set: park, sfx: [['sparkle', 'funny', 0.5]], cam: frame(-7, 1.5, { size: 'medium', side: 24, dist: 1.35, low: 0 }),
    act(lt, c) { const k = remap(lt, c.w('funny'), c.w('funny') + 0.5); put(Pk.me, -7, 1.5, 0, lerp(ME[2], ME[3], k)).setFace('laugh'); shake(Pk.me, c.t, 0.6);
      put(Pk.kidA, -9.4, 1.5, 0.3, 4).pose({ aL: [150, 20] }).setFace('laugh'); shake(Pk.kidA, c.t + 1, 0.6); put(Pk.kidB, -4.6, 1.5, -0.3, 4.5).setFace('grin').talk(c.t).pose({ aR: [100, 20] }); } });
  shot({ line: 'watched cat videos,', set: living, sfx: [['sparkle', 'videos', 0.5]], cam: frame(-4, -3.2, { size: 'full', side: -28, low: 0, dist: 0.85 }),
    act(lt, c) { put(L.me, -4, -3.2, 0.5, lerp(ME[3], ME[4], remap(lt, c.w('videos'), c.w('videos') + 0.5))).sit(1.75).pose(SEAT).setFace('laugh').pose({ aL: [40, 10], aR: [40, 10] }); shake(L.me, c.t, 0.7); L.me.head.rotation.y += 0.6; } });
  shot({ line: 'read joke books.', set: bed, sfx: [['sparkle', 'books', 0.5]], cam: frame(2, 3, { size: 'close', side: 10 }),
    act(lt, c) { put(B.me, 2, 3, 0, lerp(ME[4], ME[5], remap(lt, c.w('books'), c.w('books') + 0.5))).pose(carryPose).setFace(lt < c.w('books') ? 'smile' : 'laugh').idle(c.t); if (after(lt, c, 'books')) shake(B.me, c.t, 0.5); holdAt(B.book, B.me, 2.75, 1.7); } });
  shot({ line: 'By sunset, I was almost as bright as Jasper.', set: hall, cam: frame(0.4, 1, { size: 'medium', side: 0, dist: 1.25 }),
    act(lt, c) { put(H.me, -1.6, 1, 0.25, ME[6]).pose('hips').setFace('smug').idle(c.t); put(H.jasper, 2.4, 1, -0.25, JAS).pose('hips').setFace(after(lt, c, 'jasper') ? 'sus' : 'smug').idle(c.t); if (after(lt, c, 'jasper')) H.jasper.lookAt(-1.6, 1); } });
  // ═════════ TURN
  shot({ line: 'But then I saw Ollie,', set: hall, cam: frame(-1, 1, { size: 'close', side: 14 }),
    act(lt, c) { put(H.me, -1, 1, 0, ME[6]).setFace(lt < c.w('saw') ? 'grin' : 'worried').idle(c.t); if (after(lt, c, 'saw')) H.me.head.rotation.y += 0.7 * remap(lt, c.w('saw'), c.w('saw') + 0.2); } });
  shot({ line: 'alone in a dark corner.', set: lib, sfx: [['sad', 'alone', 0.7]], cam: { pos: [-1, 5.6, 16], look: [-5, 4, -1.6], fov: 60, blur: 0.05, push: 0.02 },
    act(lt, c) { put(Li.ollie, -6, -1.6, 0, 0, OL_DIM).pose('slump').setFace('sad').idle(c.t, 0.4); } });
  shot({ line: "I'd spent all day", set: hall, cam: frame(-1, 1, { size: 'face', side: -10, push: 0.05 }),
    act(lt, c) { put(H.me, -1, 1, 0, ME[6]).setFace(lt < c.w('all') ? 'worried' : 'sad').idle(c.t, 0.4); } });
  shot({ line: 'ignoring my best friend.', set: hall, cam: frame(-1, 1, { size: 'close', side: 6 }),
    act(lt, c) { put(H.me, -1, 1, 0, ME[6]).pose('slump').setFace(lt < c.w('best') ? 'sad' : 'cry').idle(c.t, 0.4); } });
  // ═════════ MAKING IT RIGHT
  shot({ line: 'So I went over.', set: lib, cam: frame(-4.7, -1.6, { size: 'medium', side: 8, dist: 1.15 }),
    act(lt, c) { const t0 = c.w('over'); put(Li.ollie, -6, -1.6, 0.2, 0, OL_DIM).pose('slump').setFace('sad').idle(c.t, 0.4);
      if (lt < t0) put(Li.me, 0 - 3.4 * remap(lt, 0, t0) - 0, -1.6 + 1.5 * (1 - remap(lt, 0, t0)), -Math.PI / 2, ME[6]).walk(c.t).setFace('worried');
      else put(Li.me, -3.4, -1.6, -0.2, ME[6]).setFace('smile').idle(c.t).lookAt(-6, -1.6); } });
  shot({ line: 'Want to hear the worst joke ever?', set: lib, cam: frame(-3.4, -1.6, { size: 'close', side: -16 }),
    act(lt, c) { put(Li.me, -3.4, -1.6, -0.35, ME[6]).pose({ aL: [40, 20], aR: [60, 20] }).setFace('say').talk(c.t).idle(c.t); } });
  shot({ line: 'Why did the cookie see a doctor?', set: lib, cam: frame(-6, -1.6, { size: 'close', side: 18 }),
    act(lt, c) { put(Li.ollie, -6, -1.6, 0.35, 0, OL_DIM).pose({ aL: [40, 0], aR: [40, 0] }).setFace(lt < c.w('cookie') ? 'sad' : 'sus').idle(c.t, 0.5); } });
  shot({ line: 'It felt crumby.', set: lib, sfx: [['pop', 'crumby']], cam: frame(-3.4, -1.6, { size: 'face', side: -12 }),
    act(lt, c) { put(Li.me, -3.4, -1.6, -0.3, ME[6]).setFace(lt < c.w('crumby') ? 'say' : 'wink').talk(c.t).idle(c.t); } });
  shot({ line: 'Ollie snorted.', set: lib, sfx: [['pop', 'snorted']], cam: frame(-6, -1.6, { size: 'face', side: 10, push: 0.06 }),
    act(lt, c) { put(Li.ollie, -6, -1.6, 0.3, 0, OL_DIM).setFace(lt < c.w('snorted') ? 'sus' : 'smirk').idle(c.t, 0.4); if (after(lt, c, 'snorted')) Li.ollie.head.rotation.x += 0.12 * Math.sin(remap(lt, c.w('snorted'), c.w('snorted') + 0.3) * Math.PI); } });
  shot({ line: 'Then he laughed,', set: lib, cam: frame(-6, -1.6, { size: 'close', side: -6 }),
    act(lt, c) { put(Li.ollie, -6, -1.6, 0.2, 0, OL_DIM * (1 - 0.3 * remap(lt, c.w('laughed'), c.d))).setFace(lt < c.w('laughed') ? 'smirk' : 'laugh').idle(c.t); if (after(lt, c, 'laughed')) shake(Li.ollie, c.t); } });
  shot({ line: 'and for the first time, he glowed.', set: lib, sfx: [['sparkle', 'glowed'], ['rise', 'glowed', 0.6]], cam: frame(-4.7, -1.6, { size: 'medium', side: -4, dist: 1.15 }),
    act(lt, c) { put(Li.ollie, -6, -1.6, 0.2).setFace('laugh'); shake(Li.ollie, c.t, 0.7); fire(Li.ollie, Li.sp, lt, c.w('glowed'), 0, 3.5, 'laugh', OL_DIM * 0.7);
      put(Li.me, -3.4, -1.6, -0.3, ME[6]).setFace(after(lt, c, 'glowed') ? 'wow' : 'grin').idle(c.t).lookAt(-6, -1.6); } });
  shot({ line: 'He laughed until he was brighter than me.', set: lib, sfx: [['sparkle', 'brighter'], ['rise', 'brighter', 0.6]], cam: frame(-4.7, -1.6, { size: 'full', side: 6, dist: 0.9 }),
    act(lt, c) { put(Li.ollie, -6, -1.6, 0.2).setFace('laugh'); shake(Li.ollie, c.t, 0.6); fire(Li.ollie, Li.sp, lt, c.w('brighter'), 3.5, 8.5, 'laugh');
      put(Li.me, -3.4, -1.6, -0.3, ME[6]).setFace(after(lt, c, 'brighter') ? 'shock' : 'grin').idle(c.t).lookAt(-6, -1.6); } });
  // ═════════ BUTTON
  shot({ line: 'Next morning,', set: cls, cam: frame(-1, 2.6, { size: 'wide', side: 0, dist: 0.8 }),
    act(lt, c) { put(K.ollie, -2, 2.6, 0, 8.5).setFace('grin').idle(c.t); put(K.me, 1.5, 2.6, 0, ME[6]).setFace('smile').idle(c.t); put(K.teacher, -7.5, 0, 0.6, 1).setFace('neutral').pose({ aL: [70, -10], aR: [60, 10] }).idle(c.t); K.specs.visible = true; } });
  shot({ line: 'our teacher marked him present.', set: cls, cam: frame(-6, 1, { size: 'medium', h: 1.2, side: 18 }),
    act(lt, c) { put(K.teacher, -6, 1, 0.5, 1).pose({ aL: [70, -10], aR: [60, 10] }).setFace(lt < c.w('present') ? 'neutral' : 'smile').idle(c.t); K.specs.visible = true; holdAt(K.test, K.teacher, 3.6, 1.7, 0.5); K.teacher.lookAt(-2, 3); } });
  shot({ line: 'Then she put on sunglasses.', set: cls, sfx: [['pop', 'sunglasses']], cam: frame(-6, 1, { size: 'close', h: 1.2, side: -8, push: 0.06 }),
    act(lt, c) { const on = after(lt, c, 'sunglasses'); put(K.teacher, -6, 1, 0.3, 1).setFace(on ? 'serious' : 'neutral').idle(c.t, 0.4); K.specs.visible = !on; K.shades.visible = on;
      if (!on) K.teacher.pose({ aR: [150, -30] }, remap(lt, c.w('sunglasses') - 0.3, c.w('sunglasses'))); } });
  shot({ line: 'Worst joke ever.', set: cls, cam: frame(-0.2, 2.6, { size: 'medium', side: -6, dist: 1.25 }),
    act(lt, c) { put(K.ollie, -2, 2.6, 0.3, 8.5).setFace('laugh'); shake(K.ollie, c.t); put(K.me, 1.5, 2.6, -0.3, ME[6]).setFace('laugh'); shake(K.me, c.t + 1); } });
  shot({ line: 'Best day ever.', set: cls, cam: frame(1.5, 2.6, { size: 'close', side: -12, low: 0.32 }),
    act(lt, c) { put(K.me, 1.5, 2.6, -0.1, ME[6]).setFace(lt < c.w('day') ? 'smile' : 'grin').idle(c.t); } });
});
