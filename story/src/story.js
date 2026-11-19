// story.js: "In this town, every lie you tell makes your body twenty pounds heavier."
// Weight is shown as width: W(av, w) scales the body sideways. Telling the truth takes it off again.
import * as THREE from 'three';
import { start, shot, frame } from './core.js';
import { makeAvatar } from './avatar.js';
import { SETS, TEX, floor, sky, tree, bench } from './sets.js';
import { makeSparkles, makeBulb, makePuff } from './fx.js';
import { remap, E, lerp, clamp, box, grp, at, sign, canvasTex, rng, mat, glow, PRE } from './util.js';

start(() => {
  // ───────── cast definitions (one look per character for the whole video)
  const DEF = {
    me: { seed: 1, skin: 'light', hair: 'messy', hairColor: '#4a2c18', top: 'hoodie', topColor: '#22b01e', bottom: 'jeans', bottomColor: '#4f79a7' },
    benny: { seed: 2, skin: 'deep', hair: 'dreads', hairColor: '#17110f', top: 'zip', topColor: '#940c1b', sleeves: 'long', bottom: 'joggers', bottomColor: '#15151a', shoe: '#ffffff' },
    chad: { seed: 3, skin: 'tan', hair: 'swoop', hairColor: '#e8c15a', top: 'jersey', topColor: '#2f6fd8', number: '1', bottom: 'joggers', bottomColor: '#1c1c22', height: 1.1 },
    coach: { seed: 4, skin: 'brown', hair: 'buzz', hairColor: '#111', top: 'shirt', topColor: '#e9e9ef', bottom: 'slacks', bottomColor: '#2b2f38', cap: '#d62c2c', height: 1.15 },
    mom: { seed: 5, skin: 'light', hair: 'bob', hairColor: '#4a2c18', top: 'dress', topColor: '#ff7aa8', bottom: 'skirt', bottomColor: '#ff7aa8', height: 1.2 },
    sis: { seed: 6, skin: 'light', hair: 'buns', hairColor: '#4a2c18', top: 'tee', topColor: '#ffd23f', bottom: 'shorts', bottomColor: '#7b3fc4', height: 0.75 },
    teacher: { seed: 7, skin: 'fair', hair: 'long', hairColor: '#7a4a2e', top: 'cardigan', topColor: '#f4f4f4', sleeves: 'long', bottom: 'skirt', bottomColor: '#2b2f38', glasses: true, height: 1.2 },
    driver: { seed: 8, skin: 'dark', hair: 'short', hairColor: '#111', top: 'shirt', topColor: '#3d6fe0', bottom: 'slacks', bottomColor: '#1c1c22', cap: '#1c1c22', height: 1.15 },
    mailman: { seed: 9, skin: 'tan', hair: 'short', hairColor: '#5a3524', top: 'shirt', topColor: '#7fb2e0', bottom: 'shorts', bottomColor: '#2b4f8f', cap: '#2b4f8f', backpack: '#8a5a34', height: 1.15 },
    kidL: { seed: 10, skin: 'brown', hair: 'spiky', hairColor: '#e8632b', top: 'stripes', topColor: '#f4f4f4', bottom: 'jeans', bottomColor: '#274b8f' },
    suit: { seed: 11, skin: 'fair', hair: 'swoop', hairColor: '#111', top: 'suit', topColor: '#1c1c22', sleeves: 'long', bottom: 'slacks', bottomColor: '#1c1c22', shoe: '#222', sole: '#111', height: 1.2 },
    thin1: { seed: 12, skin: 'fair', hair: 'ponytail', hairColor: '#e8c15a', top: 'sweater', topColor: '#fba8e8', sleeves: 'long', bottom: 'skirt', bottomColor: '#7b3fc4' },
    thin2: { seed: 13, skin: 'tan', hair: 'short', hairColor: '#2b1b14', top: 'tee', topColor: '#19a7a0', bottom: 'jeans', bottomColor: '#4f79a7' },
    thin3: { seed: 14, skin: 'brown', hair: 'curly', hairColor: '#17110f', top: 'vest', topColor: '#f2b01e', sleeves: 'long', bottom: 'cargo', bottomColor: '#6b6f48' },
    big1: { seed: 15, skin: 'light', hair: 'buzz', hairColor: '#7a4a2e', top: 'jersey', topColor: '#d62c2c', number: '44', bottom: 'joggers', bottomColor: '#f4f4f4', stripe: '#d62c2c' },
    big2: { seed: 16, skin: 'dark', hair: 'short', hairColor: '#111', top: 'jersey', topColor: '#d62c2c', number: '88', bottom: 'joggers', bottomColor: '#f4f4f4', stripe: '#d62c2c' },
    extra: { seed: 17, skin: 'tan', hair: 'bob', hairColor: '#2b1b14', top: 'tee', topColor: '#e8632b', bottom: 'jeans', bottomColor: '#3f74c8', backpack: '#2f6fd8' },
  };
  // ───────── props
  const hide = o => { o.visible = false; PRE.push(() => { o.visible = false; }); return o; };
  const potatoTex = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#fbfbf4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9c4b4'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#c8925a'; g.strokeStyle = '#7a4f24'; g.lineWidth = 6; g.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5); g.lineTo(w / 2 + Math.cos(a) * 92 * r, h / 2 + 10 + Math.sin(a) * 118 * r); }
    g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#9c6a38'; for (const [x, y] of [[90, 130], [170, 220], [110, 250], [160, 110]]) { g.beginPath(); g.ellipse(x, y, 7, 5, 0, 0, 7); g.fill(); }
    g.fillStyle = '#111'; for (const x of [105, 150]) { g.beginPath(); g.arc(x, 150, 8, 0, 7); g.fill(); }
    g.lineWidth = 6; g.strokeStyle = '#111'; g.beginPath(); g.arc(128, 175, 26, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.moveTo(40, 190); g.lineTo(10, 160); g.moveTo(216, 190); g.lineTo(246, 160); g.stroke();
    g.fillStyle = '#e0228c'; g.font = '900 48px Montserrat'; g.textAlign = 'center'; g.fillText('ME!', w / 2, 52);
  });
  const makeDrawing = parent => {
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.4), new THREE.MeshLambertMaterial({ map: potatoTex }));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.4), mat('#f4f1e6')); back.rotation.y = Math.PI; back.position.z = -0.01;
    const g = hide(grp(front, back)); parent.add(g);
    return { g, at(x, y, z, ry = 0) { g.visible = true; g.position.set(x, y, z); g.rotation.set(0, ry, 0); } };
  };
  const makeWind = (parent, n = 18, seed = 5) => {
    const g = hide(new THREE.Group()), r = rng(seed), ls = [], m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
    for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.08), m); b.userData = { y: 0.6 + r() * 8.5, z: -1 + r() * 7, len: 1.5 + r() * 2.5, off: r() * 44, sp: 20 + r() * 12 }; g.add(b); ls.push(b); }
    parent.add(g);
    return { at(t, cx, dir = 1, k = 1) { g.visible = true; for (const b of ls) { const u = b.userData, x = ((t * u.sp * k + u.off) % 44) - 22; b.position.set(cx + x * dir, u.y, u.z); b.scale.x = u.len; } } };
  };
  const makeDog = parent => {
    const fur = '#c98f52', dk = '#7a4f24', g = new THREE.Group(), legs = [];
    g.add(at(box(1.3, 1.1, 2.6, fur, 0.2), 0, 1.6, 0), at(box(1.2, 1.1, 1.2, fur, 0.2), 0, 2.5, 1.5), at(box(0.7, 0.5, 0.6, '#e8c08a', 0.12), 0, 2.25, 2.2), at(box(0.25, 0.2, 0.15, '#111', 0.05), 0, 2.5, 2.5));
    for (const s of [-1, 1]) g.add(at(box(0.3, 0.7, 0.4, dk, 0.08), s * 0.62, 2.7, 1.4), at(box(0.18, 0.18, 0.05, '#111'), s * 0.3, 2.75, 2.12));
    for (const [x, z] of [[-0.42, 0.9], [0.42, 0.9], [-0.42, -0.9], [0.42, -0.9]]) { const p = new THREE.Group(); p.position.set(x, 1.2, z); p.add(at(box(0.35, 1.2, 0.35, fur), 0, -0.6, 0)); g.add(p); legs.push(p); }
    const tail = new THREE.Group(); tail.position.set(0, 2, -1.3); tail.add(at(box(0.2, 0.9, 0.2, fur), 0, 0.4, 0)); g.add(tail);
    const paper = at(box(1.4, 0.04, 1.0, '#ffffff'), 0, 2.15, 2.6); paper.rotation.set(0.25, 0, 0.2); g.add(paper);
    hide(g); parent.add(g);
    return { at(t, x, z, ry, walking = true) { g.visible = true; g.position.set(x, 0, z); g.rotation.y = ry; legs.forEach((p, i) => p.rotation.x = walking ? Math.sin(t * 10 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0); tail.rotation.z = Math.sin(t * 14) * 0.5; } };
  };

  // ───────── sets
  const street = SETS.street({ shops: [['BAKERY', '#f8c5c7', '#e84b6a'], ['TOYS', '#bfe3ff', '#2f7de1'], ['DINER', '#fff0b8', '#e8632b'], ['BOOKS', '#d6f2c4', '#2e9e59'], ['FLOWERS', '#e4d0ff', '#7b3fc4']] });
  street.group.add(at(box(0.25, 7, 0.25, '#5c6068'), -12.5, 3.5, 0.6), at(sign('BUS\nSTOP', 2.2, 1.8, { bg: '#2f6fd8', fg: '#fff' }), -12.5, 6.4, 0.75));
  const hall = SETS.hallway({ banner: 'TELL THE\nTRUTH!', bannerBg: '#ffd23f', locker: '#2f6fd8', poster: 'SHARK\nWEEK', posterBg: '#19a7a0', door: 'ROOM 7' });
  const doorPivot = new THREE.Group(); doorPivot.position.set(2.7 - 1.85, 0, -5.5); doorPivot.add(at(box(3.7, 7.8, 0.2, '#b9783f'), 1.85, 3.9, 0)); hall.group.add(doorPivot);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 7.8), glow('#cfeeff', 1.3)); outside.position.set(2.7, 3.9, -5.62); hall.group.add(outside);
  hall.reset = () => { doorPivot.rotation.y = 0; };
  const caf = SETS.cafeteria({ menu: 'TODAY: PIZZA!', rule: 'NO\nFIBBING' });
  const bed = SETS.bedroom({ poster: 'BE\nYOU', bed: '#22b01e' });
  const mess = grp(...[[-2, 4, '#e84b4b'], [2.2, 3.2, '#2f6fd8'], [-4.2, 1.2, '#f2b01e'], [4.4, -2, '#7b3fc4'], [0.5, 6, '#2e9e59'], [-1, -2.5, '#ff7aa8']].map(([x, z, cl], i) => { const b = at(box(1.6, 0.22, 1.1, cl, 0.08), x, 0.11, z); b.rotation.y = i * 0.7; return b; }));
  bed.group.add(mess); bed.reset = () => { mess.visible = true; };
  const bowl = grp(); { const glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), new THREE.MeshLambertMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.35, depthWrite: false })); glass.position.y = 0.95; const water = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), new THREE.MeshLambertMaterial({ color: '#5ab8f0', transparent: true, opacity: 0.5, depthWrite: false })); water.position.y = 0.95; bowl.add(at(box(0.6, 0.35, 0.3, '#ff8a1c', 0.12), 0, 0.95, 0.1), at(box(0.25, 0.4, 0.1, '#ff8a1c'), -0.38, 0.95, 0.1), at(box(0.08, 0.08, 0.05, '#111'), 0.18, 1.02, 0.27), water, glass); }
  bed.group.add(at(bowl, 9, 2.72, 3));
  const cls = SETS.classroom({ board: ['HOMEWORK', 'due TODAY'] });
  const front = SETS.schoolFront({ name: 'OAKWOOD SCHOOL' });
  const park = SETS.park();
  const field = { light: 'outdoor', group: grp(sky(), at(floor(220, 140, TEX.grass('#4fbf6c'), 6), 0, -0.02, -30)) };
  for (let i = -3; i <= 3; i++) field.group.add(at(box(60, 0.03, 0.45, '#ffffff'), 0, 0.02, -24 + i * 6));
  field.group.add(at(box(0.6, 6, 0.6, '#ffd23f'), 0, 3, -26), at(box(14, 0.6, 0.6, '#ffd23f'), 0, 6, -26), at(box(0.6, 12, 0.6, '#ffd23f'), -7, 12, -26), at(box(0.6, 12, 0.6, '#ffd23f'), 7, 12, -26));
  field.group.add(at(box(0.3, 4, 0.3, '#5c6068'), 7.6, 2, -7), at(box(0.3, 4, 0.3, '#5c6068'), 13.4, 2, -7), at(sign(['FOOTBALL', 'TRYOUTS FRIDAY'], 7, 2.6, { bg: '#2f6fd8', fg: '#fff' }), 10.5, 5.2, -6.8));
  for (let s = 0; s < 4; s++) field.group.add(at(box(16, 0.8, 2, s % 2 ? '#b9bec6' : '#d9dde3'), -18, 0.4 + s * 0.8, -12 - s * 2));
  { const r = rng(31); for (let i = 0; i < 10; i++) field.group.add(at(tree(9 + r() * 4), (i - 4.5) * 16 + r() * 4, 0, -40 - r() * 10)); }
  field.group.add(at(bench('#2f6fd8'), -9, 0, -4));

  // ───────── cast per set
  const cast = (set, names, extra = {}) => {
    const c = {}; for (const n of names) { c[n] = makeAvatar(DEF[n]); set.group.add(c[n].root); }
    c.sp = makeSparkles(set.group); c.sp2 = makeSparkles(set.group, 9); c.bulb = makeBulb(set.group); c.puff = makePuff(set.group);
    return c;
  };
  const S = cast(street, ['me', 'kidL', 'thin1', 'thin2', 'suit', 'driver', 'mailman', 'extra']);
  const crown = hide(grp(at(box(1.35, 0.35, 1.35, '#ffcf1f', 0.06), 0, 0, 0), ...[[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [0, 0.62]].map(([x, z]) => at(box(0.26, 0.4, 0.26, '#ffcf1f'), x, 0.35, z)), at(box(0.22, 0.22, 0.05, '#e0228c'), 0, 0.02, 0.68)));
  crown.position.y = 1.32; S.me.head.add(crown);
  const H = cast(hall, ['me', 'benny', 'chad', 'thin1', 'thin2', 'thin3', 'extra']);
  const C = cast(caf, ['chad', 'benny', 'me']); C.draw = makeDrawing(caf.group);
  const Fd = cast(field, ['me', 'coach', 'chad', 'big1', 'big2', 'thin3']);
  { const clip = grp(at(box(0.9, 1.2, 0.08, '#b9783f'), 0, 0, 0), at(box(0.7, 0.9, 0.02, '#ffffff'), 0, -0.05, 0.05)); clip.position.set(0, -0.2, 0.6); clip.rotation.x = -1.2; Fd.coach.handL.add(clip); }
  const B = cast(bed, ['me', 'mom', 'sis']);
  { const broom = grp(at(box(0.18, 3.8, 0.18, '#b9783f'), 0, 0.2, 0), at(box(1.3, 0.6, 0.35, '#f2b01e', 0.05), 0, -1.9, 0)); broom.position.set(0, 0.1, 0.4); B.sis.handR.add(broom); }
  const K = cast(cls, ['me', 'teacher']); K.dog = makeDog(cls.group);
  const Fr = cast(front, ['me', 'benny']); Fr.wind = makeWind(front.group);
  H.wind = makeWind(hall.group, 14, 8);
  const P = cast(park, ['me', 'benny']); P.draw = makeDrawing(park.group);

  // ───────── helpers
  const W = (av, w) => { const h = av.baseHeight; av.root.scale.set(h * w, h, h * (0.65 + 0.35 * w)); av.w = w; return av; };
  const put = (av, x, z, ry = 0, w = 1, y = 0) => W(av.reset().place(x, z, ry, y), w);
  // the rule fires: scream face, arms flare, body widens (or narrows) with overshoot, sparkles. Same frame timings as grow().
  const gain = (av, sp, lt, t0, from, to, rest = 'grin') => {
    const dt = lt - t0; if (dt < 0) { W(av, from); return false; }
    const k = E.back(remap(dt, 0.05, 0.45)); W(av, lerp(from, to, k));
    if (dt < 0.47) { av.setFace('scream'); av.pose({ aL: [20, 70], aR: [20, 70] }, Math.sin(remap(dt, 0, 0.47) * Math.PI)); } else av.setFace(rest);
    sp.at(dt, av.root.position.toArray(), av.baseHeight * Math.max(1, lerp(from, to, k) * 0.75)); return true;
  };
  const after = (lt, c, word) => lt >= c.w(word);
  // Benny clinging to the lamp post (post at x=-6, z=2.4). tilt 0 = upright, ~1.3 = flapping like a flag
  const hug = (av, t, tilt, w = 0.5, flap = 1) => {
    const a = tilt + Math.sin(t * 13) * 0.07 * flap * Math.min(1, tilt * 2), L = 5.6;
    put(av, -6 + L * Math.sin(a) * 0.98, 2.9, 0, w, Math.max(0, 4.2 - L * Math.cos(a))); av.root.rotation.z = a; av.pose('cheer');
    av.legL.rotation.x = Math.sin(t * 17) * 0.4 * flap; av.legR.rotation.x = -Math.sin(t * 17) * 0.4 * flap; return av;
  };
  const head = (tilt, L = 4.5) => [-6 + 5.6 * Math.sin(tilt) * 0.98 - L * Math.sin(tilt), Math.max(0, 4.2 - 5.6 * Math.cos(tilt)) + L * Math.cos(tilt), 2.9];
  const M = [1, 1.3, 1.6, 1.9, 2.2, 2.5];   // my width after each lie

  // ═════════ HOOK
  shot({ line: 'In this town,', set: street, sfx: [['whoosh', 0]], cam: { pos: [0, 4.6, 24], look: [0, 6, 0], fov: 60, blur: 0.1, push: 0.02 },
    act(lt, c) { put(S.suit, -10 + lt * 4.5, 3, Math.PI / 2, 2.6).walk(c.t, 0.8).setFace('smug'); put(S.thin1, 5, 1.5, -0.3, 0.45).pose('wave').setFace('grin').idle(c.t); S.thin1.armR.rotation.z -= Math.sin(c.t * 12) * 0.25;
      put(S.kidL, 1.5, 5.5, 0.2).setFace('smile').idle(c.t); } });
  shot({ line: 'every lie you tell,', set: street, cam: frame(1.5, 5.5, { size: 'close', side: 16 }),
    act(lt, c) { put(S.kidL, 1.5, 5.5, 0.15).pose('open', 0.7).setFace(lt < c.w('lie') ? 'smirk' : 'say').talk(c.t).idle(c.t); put(S.thin2, 5.5, 3.5, -0.7, 0.45).setFace('sus').idle(c.t); } });
  shot({ line: 'your body gets twenty pounds heavier.', set: street, sfx: [['sparkle', 'twenty'], ['thud', 'twenty']], cam: frame(1.5, 5.5, { size: 'full', side: -12 }),
    act(lt, c) { put(S.kidL, 1.5, 5.5, 0.1).pose('open', 0.5).setFace('say').idle(c.t); gain(S.kidL, S.sp, lt, c.w('twenty'), 1, 1.3);
      put(S.thin2, 6, 3.5, -0.7, 0.45).setFace(after(lt, c, 'twenty') ? 'shock' : 'neutral').lookAt(1.5, 5.5); } });
  // ═════════ WORLD
  shot({ line: "That's why honest people are skinny as broomsticks,", set: hall, cam: { pos: [-7, 4.2, 9.5], look: [-3.5, 4.3, 0], fov: 60, blur: 0.3, push: 0, to: { pos: [6, 4.2, 9.5], look: [3.5, 4.3, 0] }, ease: 'lin' },
    act(lt, c) { [H.thin1, H.thin2, H.thin3].forEach((a, i) => put(a, -4.5 + i * 4.5, i % 2 ? -0.8 : 0.6, (1 - i) * 0.25, 0.42).pose(['wave', 'open', 'cheer'][i]).setFace(['grin', 'happy', 'laugh'][i]).idle(c.t)); } });
  shot({ line: "and big liars can't fit through doors.", set: street, sfx: [['thud', 'fit', 0.7], ['thud', 'doors', 0.7]], cam: frame(-33, -0.4, { size: 'full', side: 32, dist: 1.5, h: 1.2 }),
    act(lt, c) { put(S.suit, -33 + Math.sin(c.t * 18) * 0.06, -0.4, Math.PI, 2.6).pose('reach').setFace('worried'); S.suit.hip.rotation.x = 0.12 + Math.sin(c.t * 9) * 0.04; } });
  shot({ line: 'Telling the truth takes it off.', set: street, sfx: [['sparkle', 'takes'], ['fall', 'takes']], cam: frame(-33, 1.5, { size: 'full', h: 1.2, side: 16, dist: 1.25 }),
    act(lt, c) { put(S.suit, -33, 1.5, 0, 2.6).pose('shy').setFace('say').talk(c.t); gain(S.suit, S.sp, lt, c.w('takes'), 2.6, 1.9); } });
  // ═════════ NARRATOR + FRIEND
  shot({ line: 'I was pretty average.', set: hall, cam: frame(0, 0, { size: 'medium', side: 8 }),
    act(lt, c) { put(H.me, 0, 0).pose('open').setFace(lt < c.w('average') ? 'smile' : 'grin').idle(c.t); put(H.extra, 8 - lt * 5, -2.8, -Math.PI / 2).walk(c.t).setFace('neutral'); } });
  shot({ line: 'But my best friend Benny', set: hall, cam: frame(-6, 1, { size: 'close', side: -12 }),
    act(lt, c) { put(H.benny, -6, 1, -0.15, 0.5).setFace('grin').pose('wave', remap(lt, c.w('benny') - 0.3, c.w('benny'))).idle(c.t); H.benny.armR.rotation.z -= Math.sin(c.t * 14) * 0.25 * remap(lt, c.w('benny') - 0.3, c.w('benny')); } });
  shot({ line: 'was the most honest kid alive.', set: hall, sfx: [['ding', 'honest', 0.5]], cam: frame(-6, 1, { size: 'full', side: 16, low: 0.16, dist: 1.1 }),
    act(lt, c) { put(H.benny, -6, 1, 0.15, 0.5).pose('cheer').setFace('laugh').idle(c.t); H.benny.jump(remap(lt, c.w('honest'), c.w('honest') + 0.5), 0.8); } });
  shot({ line: 'Whenever someone opened a door,', set: hall, sfx: [['whoosh', 'opened']], cam: frame(0.8, 0, { size: 'full', side: -12, dist: 1.2 }),
    act(lt, c) { const o = remap(lt, c.w('opened'), c.w('opened') + 0.35); doorPivot.rotation.y = -1.7 * E.out(o);
      if (o > 0.2) put(H.thin3, 3.2, -4.4, 0, 1).walk(c.t, 0.6).setFace('neutral');
      put(H.benny, -1.6, 1.2, 0.3, 0.5).setFace(o > 0 ? 'worried' : 'smile').idle(c.t); if (o > 0) { H.benny.hip.rotation.z = -0.25 * o + Math.sin(c.t * 20) * 0.05; H.wind.at(c.t, 0, -1, 1.2); } } });
  shot({ line: 'he blew down the hallway.', set: hall, sfx: [['whoosh', 0]], cam: { pos: [-5, 4.4, 11.5], look: [-5, 3.6, 0], fov: 60, blur: 0.25, push: 0, to: { pos: [8, 4.4, 11.5], look: [8, 3.6, 0] }, ease: 'lin' },
    act(lt, c) { const x = lerp(-10, 5, lt / c.d); put(H.benny, x, 1.5, 0, 0.5, 3 + Math.sin(c.t * 9) * 0.3).pose('cheer').setFace('shock'); H.benny.root.rotation.z = -Math.PI / 2 + Math.sin(c.t * 7) * 0.15; H.benny.walk(c.t, 2.6, 50); H.benny.pose('cheer');
      H.wind.at(c.t, x, 1, 1.5); put(H.thin1, 2, -2.5, 0.2, 0.42).setFace(lt > c.d * 0.5 ? 'shock' : 'neutral').lookAt(x, 1.5); } });
  // ═════════ THE FOIL
  shot({ line: 'Meanwhile, Chad was the biggest kid around.', set: hall, cam: frame(0, 0, { size: 'full', side: 8, low: 0.18, h: 1.1, dist: 1.4 }),
    act(lt, c) { put(H.chad, 0, 0, 0, 1.9).pose('hips').setFace(lt < c.w('biggest') ? 'smirk' : 'smug').idle(c.t); put(H.thin1, -6.5, 1.5, 0.5, 0.42).setFace('wow').lookAt(0, 0); put(H.extra, 6.5, 1.8, -0.5).setFace('shock').lookAt(0, 0); } });
  shot({ line: 'He said his uncle invented pizza.', set: caf, sfx: [['sparkle', 'pizza'], ['thud', 'pizza']], cam: frame(-8, -1, { size: 'full', side: -8, h: 1.1 }),
    act(lt, c) { put(C.chad, -8, -1, 0.15, 1.9).pose('open').setFace('say').talk(c.t); gain(C.chad, C.sp, lt, c.w('pizza'), 1.9, 2.2, 'smug'); } });
  shot({ line: "That he'd wrestled a shark.", set: hall, sfx: [['sparkle', 'shark'], ['thud', 'shark']], cam: frame(11, 0, { size: 'full', side: 14, h: 1.1, low: 0.2 }),
    act(lt, c) { put(H.chad, 11, 0, -0.2, 2.2).pose('flex').setFace('say').talk(c.t); gain(H.chad, H.sp, lt, c.w('shark'), 2.2, 2.5, 'smug'); } });
  shot({ line: "That he'd never lied.", set: hall, sfx: [['sparkle', 'lied'], ['thud', 'lied']], cam: frame(-3, 0, { size: 'medium', side: -16, low: 0.3, h: 1.1, dist: 1.5 }),
    act(lt, c) { put(H.chad, -3, 0, 0.1, 2.5).pose({ aR: [70, -45], aL: [0, 8], head: [-8, 0, 0] }).setFace('smug').idle(c.t); gain(H.chad, H.sp, lt, c.w('lied'), 2.5, 2.8, 'smug'); } });
  // ═════════ INCITING MOMENT
  shot({ line: 'Coach only picked big kids.', set: field, cam: frame(3, 0, { size: 'wide', side: 4, low: 0.15 }),
    act(lt, c) { put(Fd.coach, -3.5, 1, 0.6).pose('point').setFace('serious').idle(c.t); put(Fd.big1, 4, -1, -0.1, 2.2).pose('flex').setFace('grin').idle(c.t); put(Fd.big2, 11.5, -1.5, -0.3, 2.4).pose('cheer').setFace('laugh').idle(c.t);
      put(Fd.thin3, 1, 3, 0, 0.42).setFace(lt > c.w('big') ? 'sad' : 'smile').idle(c.t); if (lt > c.w('big')) Fd.thin3.pose('slump'); } });
  shot({ line: "He asked if I'd played before.", set: field, cam: frame(-2, 0, { size: 'close', side: -22, h: 1.15 }),
    act(lt, c) { put(Fd.coach, -2, 0, 0.5).pose({ aL: [40, 0], aR: [30, 30] }).setFace('say').talk(c.t); put(Fd.me, 2.6, 1, -0.9).setFace('smile').idle(c.t); } });
  shot({ line: 'I said, tons.', set: field, cam: frame(2.6, 1, { size: 'close', side: 16 }),
    act(lt, c) { put(Fd.me, 2.6, 1, -0.45).pose('open').setFace(lt < c.w('tons') ? 'smile' : 'say').talk(c.t); } });
  shot({ line: 'I got twenty pounds heavier.', set: field, sfx: [['sparkle', 'twenty'], ['thud', 'twenty']], cam: frame(2.6, 1, { size: 'full', side: -6, dist: 1.15 }),
    act(lt, c) { put(Fd.me, 2.6, 1, -0.3).setFace('neutral').idle(c.t); gain(Fd.me, Fd.sp, lt, c.w('twenty'), M[0], M[1]); put(Fd.coach, -3, 0, 0.5).setFace(after(lt, c, 'twenty') ? 'wow' : 'neutral').lookAt(2.6, 1); } });
  shot({ line: "And that's when I had an idea.", set: field, sfx: [['ding', 'idea']], cam: frame(2.6, 1, { size: 'close', side: -12 }),
    act(lt, c) { put(Fd.me, 2.6, 1, -0.1, M[1]).setFace(lt < c.w('idea') ? 'neutral' : 'grin').idle(c.t); Fd.bulb.at(lt - c.w('idea'), Fd.me); } });
  shot({ line: "If I lied enough, I'd make the team.", set: field, sfx: [['pop', 'enough'], ['pop', 'make'], ['pop', 'team']], cam: frame(2.6, 1, { size: 'medium', side: 6, dist: 1.5 }),
    act(lt, c) { put(Fd.me, 2.6, 1, 0, M[1]).pose('open').setFace('grin').talk(c.t);
      [[Fd.big1, 'enough', -3.5, -5, 2.2, 'flex'], [Fd.big2, 'make', 9, -5, 2.4, 'cheer'], [Fd.coach, 'team', 2.6, -8, 1, 'point']].forEach(([a, wd, x, z, w, ps]) => { const k = remap(lt, c.w(wd), c.w(wd) + 0.2); if (k > 0) { put(a, x, z, 0, w).pose(ps).setFace('grin').idle(c.t); a.root.scale.multiplyScalar(Math.max(0.01, E.back(k))); } }); } });
  // ═════════ TWO FAILED TRIES
  shot({ line: "I told Mom I'd cleaned my room.", set: bed, cam: frame(2.6, 1.6, { size: 'full', side: -4, dist: 1.4 }),
    act(lt, c) { put(B.me, -0.5, 2.5, 0.7, M[1]).pose('open').setFace(lt < c.w('cleaned') ? 'say' : 'smile').talk(c.t); put(B.mom, 6, 0.5, -0.8).pose('hips').setFace('sus').idle(c.t); } });
  shot({ line: 'My sister already had.', set: bed, cam: frame(1.5, 1, { size: 'full', h: 0.75, side: 12, dist: 1.4 }),
    act(lt, c) { mess.visible = false; put(B.sis, 1.5, 1, 0.2).pose({ aR: [30, 10], aL: [150, 30] }).setFace('grin').idle(c.t); B.sis.armL.rotation.z += Math.sin(c.t * 12) * 0.2; } });
  shot({ line: 'Nothing happened.', set: bed, cam: frame(-0.5, 2.5, { size: 'close', side: -8, push: 0.06 }),
    act(lt, c) { mess.visible = false; put(B.me, -0.5, 2.5, 0, M[1]).setFace('blank').idle(c.t, 0.4); } });
  shot({ line: 'I told my teacher my dog ate my homework.', set: cls, cam: frame(-0.5, 0.5, { size: 'full', side: 6, dist: 1.45 }),
    act(lt, c) { cls.desks.visible = false; put(K.teacher, -4.5, -1, 0.6).pose('hips').setFace('sus').idle(c.t); put(K.me, 3.5, 1.2, -0.6, M[1]).pose('open').setFace('say').talk(c.t); } });
  shot({ line: 'My dog walked in chewing it.', set: cls, sfx: [['boing', 'chewing', 0.6]], cam: { pos: [-1.5, 1.8, 10], look: [-5, 2.6, 1], fov: 60, blur: 0.3 },
    act(lt, c) { cls.desks.visible = false; K.dog.at(c.t, lerp(-14, -5, Math.min(1, lt / (c.d * 0.8))), 2, Math.PI / 2, lt < c.d * 0.8); put(K.teacher, -4.5, -1.5, 0.5).setFace(lt > c.w('chewing') ? 'shock' : 'sus').lookAt(-6, 2); } });
  shot({ line: 'Still nothing.', set: cls, cam: frame(3.5, 1.2, { size: 'close', side: 14, push: 0.06 }),
    act(lt, c) { cls.desks.visible = false; put(K.me, 3.5, 1.2, -0.2, M[1]).setFace('sus').idle(c.t, 0.4); } });
  // ═════════ ACCIDENTAL SUCCESS
  shot({ line: 'Then Benny showed me his drawing of me,', set: caf, cam: frame(-7.5, 0.5, { size: 'full', side: 0, dist: 1.2 }),
    act(lt, c) { const ry = -0.7; put(C.benny, -4.5, 0, ry, 0.5).pose('carry').setFace('grin').idle(c.t); C.draw.at(-4.5 + Math.sin(ry) * 1.3, 3.6, Math.cos(ry) * 1.3, ry);
      put(C.me, -10.5, 1.2, 0.8, M[1]).setFace('smile').idle(c.t); } });
  shot({ line: 'and I said, I love it.', set: caf, sfx: [['sparkle', 'love'], ['thud', 'love']], cam: frame(-9.5, 1.2, { size: 'close', side: 6 }),
    act(lt, c) { put(C.me, -9.5, 1.2, 0.3, M[1]).pose('open', 0.6).setFace('say').talk(c.t); gain(C.me, C.sp, lt, c.w('love'), M[1], M[2]); } });
  shot({ line: 'It looked like a potato.', set: caf, sfx: [['pop', 0]], cam: { pos: [-7.3, 4.5, 6.4], look: [-7.5, 4.4, 2], fov: 60, blur: 0.7, push: 0.05 },
    act(lt, c) { put(C.benny, -7.5, 0.6, 0, 0.5).pose('carry').setFace('grin').idle(c.t, 0.3); C.draw.at(-7.5, 4.1, 1.9, 0); } });
  // ═════════ MONTAGE
  shot({ line: 'So I started lying everywhere.', set: street, cam: frame(-3, 3, { size: 'wide', side: 4 }),
    act(lt, c) { put(S.me, lerp(-11, 2, lt / c.d), 3, Math.PI / 2, M[2]).walk(c.t, 1.1).setFace('grin'); put(S.extra, 7, 1, -0.4).setFace('neutral').idle(c.t); } });
  shot({ line: 'I told the bus driver I was a prince.', set: street, sfx: [['sparkle', 'prince'], ['thud', 'prince']], cam: frame(-12, 2.8, { size: 'full', side: -12, dist: 1.4 }),
    act(lt, c) { put(S.driver, -15.5, 2, 0.7).setFace('sus').idle(c.t); put(S.me, -9.5, 3.2, -0.6, M[2]).pose('hips').setFace('say').talk(c.t);
      if (gain(S.me, S.sp, lt, c.w('prince'), M[2], M[3], 'smug')) { crown.visible = true; crown.scale.setScalar(E.back(remap(lt, c.w('prince'), c.w('prince') + 0.25)) + 0.001); } } });
  shot({ line: 'I told the mailman I could fly.', set: street, sfx: [['sparkle', 'fly'], ['thud', 'fly']], cam: frame(31, 2.8, { size: 'full', side: 14, dist: 1.4 }),
    act(lt, c) { crown.visible = true; crown.scale.setScalar(1); put(S.mailman, 34, 2, -0.7).setFace('sus').idle(c.t); put(S.me, 28.5, 3.2, 0.6, M[3]).pose('cheer').setFace('say'); S.me.armL.rotation.z += Math.sin(c.t * 16) * 0.4; S.me.armR.rotation.z -= Math.sin(c.t * 16) * 0.4;
      gain(S.me, S.sp, lt, c.w('fly'), M[3], M[4], 'grin'); } });
  shot({ line: 'I told my goldfish he was a dog.', set: bed, sfx: [['sparkle', 'dog'], ['thud', 'dog']], cam: frame(4.6, 3, { size: 'full', side: -12, dist: 1.9 }),
    act(lt, c) { put(B.me, 2.2, 3.6, 0.55, M[4]).pose('point').setFace('say').talk(c.t); gain(B.me, B.sp, lt, c.w('dog'), M[4], M[5]); } });
  shot({ line: 'By Friday, I was almost as big as Chad.', set: field, cam: { pos: [0.3, 5.2, 21], look: [0.3, 4.4, 0], fov: 60, blur: 0.15 },
    act(lt, c) { put(Fd.me, -5, 0.5, 0.3, M[5]).pose('flex').setFace('grin').idle(c.t); put(Fd.chad, 5.5, 0, -0.3, 2.8).pose('hips').setFace(lt > c.w('chad') ? 'shock' : 'smug').idle(c.t); } });
  shot({ line: 'I made the team.', set: field, sfx: [['pop', 'team']], cam: frame(0, 0.5, { size: 'full', side: -10, dist: 1.5 }),
    act(lt, c) { put(Fd.me, 0, 0.5, 0.1, M[5]).pose('cheer').setFace('laugh').idle(c.t); Fd.me.jump(remap(lt, c.w('team'), c.w('team') + 0.5), 1); put(Fd.coach, 8, 1.5, -0.6).pose('point').setFace('grin').idle(c.t); } });
  // ═════════ THE TURN
  shot({ line: 'But then I saw Benny outside,', set: front, sfx: [['sad', 'benny']], cam: { pos: [6, 5, 27], look: [-3, 4.4, 2], fov: 60, blur: 0.05, push: 0.03 },
    act(lt, c) { hug(Fr.benny, c.t, 1.2); Fr.wind.at(c.t, -3, 1, 1); Fr.benny.setFace('worried'); } });
  shot({ line: 'hugging a lamp post in the wind.', set: front, sfx: [['whoosh', 'wind']], cam: { pos: [1.5, 4.6, 14], look: [-4, 4.2, 2.5], fov: 60, blur: 0.25 },
    act(lt, c) { hug(Fr.benny, c.t, 1.25); Fr.wind.at(c.t, -3, 1, 1.2); Fr.benny.setFace('cry'); } });
  shot({ line: "I'd spent all week lying,", set: front, cam: frame(7, 3.5, { size: 'close', side: -12, h: 1 }),
    act(lt, c) { put(Fr.me, 7, 3.5, -0.3, M[5]).setFace('sad').idle(c.t, 0.5); if (lt > c.w('lying')) Fr.me.setFace('cry'); } });
  shot({ line: 'while ignoring my best friend.', set: front, cam: frame(7, 3.5, { size: 'face', side: 10, push: 0.06 }),
    act(lt, c) { put(Fr.me, 7, 3.5, 0, M[5]).pose('slump', 0.5).setFace('cry').idle(c.t, 0.4); } });
  // ═════════ MAKING IT RIGHT
  shot({ line: 'So I told him the truth.', set: front, cam: frame(1, 3.5, { size: 'wide', side: -6 }),
    act(lt, c) { hug(Fr.benny, c.t, 1.2); Fr.benny.setFace('worried'); Fr.wind.at(c.t, -3, 1, 1); const k = Math.min(1, lt / (c.d * 0.85)); put(Fr.me, lerp(9, 3.6, k), 4.2, -Math.PI / 2 * (k < 1 ? 1 : 0.5), M[5]).setFace('serious'); if (k < 1) Fr.me.walk(c.t); } });
  shot({ line: 'Your drawing looks like a potato.', set: front, cam: frame(3.6, 4.2, { size: 'medium', side: 12, dist: 1.7 }),
    act(lt, c) { put(Fr.me, 3.6, 4.2, -0.5, M[5]).pose({ aL: [30, 20], aR: [55, 10] }).setFace('say').talk(c.t); } });
  shot({ line: 'I lost twenty pounds instantly.', set: front, sfx: [['sparkle', 'lost'], ['fall', 'lost']], cam: frame(3.6, 4.2, { size: 'full', side: -8, dist: 1.4 }),
    act(lt, c) { put(Fr.me, 3.6, 4.2, -0.4, M[5]).setFace('neutral').idle(c.t); gain(Fr.me, Fr.sp, lt, c.w('lost'), M[5], M[4]); hug(Fr.benny, c.t, 1.2); Fr.benny.setFace(after(lt, c, 'lost') ? 'wow' : 'worried'); Fr.wind.at(c.t, -3, 1, 1); } });
  shot({ line: "Benny said, it's fine, I'm not mad.", set: front, cam: (() => { const h = head(0.45); return { pos: [h[0] + 2.2, h[1] - 0.6, h[2] + 4.8], look: [h[0], h[1] - 0.4, h[2]], fov: 60, blur: 0.7 }; })(),
    act(lt, c) { hug(Fr.benny, c.t, 0.45, 0.5, 0.5); Fr.benny.setFace(lt < c.w("it's") ? 'laugh' : 'say'); Fr.wind.at(c.t, -3, 1, 0.6); } });
  shot({ line: 'And for the first time,', set: front, cam: (() => { const h = head(0.45); return { pos: [h[0] - 2.6, h[1] - 0.2, h[2] + 4.2], look: [h[0], h[1] - 0.5, h[2]], fov: 60, blur: 0.7, push: 0.05 }; })(),
    act(lt, c) { hug(Fr.benny, c.t, 0.45, 0.5, 0.5); Fr.benny.setFace('neutral'); Fr.wind.at(c.t, -3, 1, 0.6); } });
  shot({ line: 'he got twenty pounds heavier.', set: front, sfx: [['sparkle', 'twenty'], ['thud', 'twenty']], cam: frame(-3, 2.9, { size: 'full', side: 10, dist: 1.25 }),
    act(lt, c) { const t0 = c.w('twenty'); if (lt < t0) { hug(Fr.benny, c.t, 0.45, 0.5, 0.5); Fr.benny.setFace('neutral'); Fr.wind.at(c.t, -3, 1, 0.6); }
      else { put(Fr.benny, -4.6, 2.9, 0, 0.5); gain(Fr.benny, Fr.sp, lt, t0, 0.5, 0.8, 'wow'); }
      put(Fr.me, 3.6, 4.2, -0.6, M[4]).setFace(lt > t0 ? 'shock' : 'neutral').lookAt(-4.6, 2.9); } });
  shot({ line: 'The wind blew,', set: front, sfx: [['whoosh', 0]], cam: frame(-0.5, 3.5, { size: 'wide', side: -4 }),
    act(lt, c) { Fr.wind.at(c.t, 0, 1, 1.6); put(Fr.benny, -4.6, 2.9, 0, 0.8).pose('hips').setFace('grin').idle(c.t); put(Fr.me, 3.6, 4.2, -0.4, M[4]).pose('shy').setFace('worried'); Fr.me.hip.rotation.z = -0.1 + Math.sin(c.t * 14) * 0.04; } });
  shot({ line: "and he didn't move an inch.", set: front, sfx: [['pop', 'inch']], cam: frame(-4.6, 2.9, { size: 'close', side: -14, low: 0.3 }),
    act(lt, c) { Fr.wind.at(c.t, -4, 1, 1.6); put(Fr.benny, -4.6, 2.9, 0.1, 0.8).pose('hips').setFace(lt < c.w('inch') ? 'smug' : 'laugh').idle(c.t); } });
  // ═════════ RETURN
  shot({ line: 'So I told everyone the truth.', set: street, cam: frame(2, 3, { size: 'wide', side: -4 }),
    act(lt, c) { put(S.me, lerp(9, -4, lt / c.d), 3, -Math.PI / 2, M[4]).walk(c.t, 1).setFace('serious'); crown.visible = true; crown.scale.setScalar(1); } });
  shot({ line: 'I was not a prince.', set: street, sfx: [['sparkle', 'not'], ['fall', 'not']], cam: frame(-11, 2.6, { size: 'medium', side: 18, dist: 1.6 }),
    act(lt, c) { put(S.driver, -15, 2, 0.6).setFace(lt > c.w('prince') ? 'laugh' : 'sus').idle(c.t); put(S.me, -9.5, 3.2, -0.6, M[4]).pose('shy').setFace('say').talk(c.t);
      if (!gain(S.me, S.sp, lt, c.w('not'), M[4], M[3], 'smile')) { crown.visible = true; crown.scale.setScalar(1); } else S.puff.at(lt - c.w('not'), [-9.5, 6.5 * 1, 3.2]); } });
  shot({ line: 'I could not fly.', set: street, sfx: [['sparkle', 'not'], ['fall', 'not']], cam: frame(31, 2.8, { size: 'medium', side: -18, dist: 1.6 }),
    act(lt, c) { put(S.mailman, 34, 2, -0.7).setFace('smirk').idle(c.t); put(S.me, 28.5, 3.2, 0.6, M[3]).pose('shrug').setFace('say').talk(c.t); gain(S.me, S.sp, lt, c.w('not'), M[3], M[2], 'smile'); } });
  shot({ line: 'The goldfish was a fish.', set: bed, sfx: [['sparkle', 'fish', 0.9], ['fall', 'fish']], cam: frame(6.5, 3, { size: 'full', side: 24, dist: 1.1 }),
    act(lt, c) { put(B.me, 3.4, 3.6, 0.9, M[2]).pose('shy').setFace('say').talk(c.t); gain(B.me, B.sp, lt, c.w('fish'), M[2], M[1], 'smile'); } });
  shot({ line: 'Coach kicked me off the team. Worth it.', set: field, sfx: [['sad', 'team', 0.6], ['pop', 'worth', 0.6]], cam: frame(0, 0.5, { size: 'full', side: -8, dist: 1.3, push: 0.05 }),
    act(lt, c) { const w = lt >= c.w('worth'); put(Fd.coach, -3.5, 0, 0.5).pose({ aR: [90, 50], aL: [0, 6] }).setFace('serious').idle(c.t); put(Fd.me, 2.5, 1, w ? 0 : -0.3, M[1]).pose(w ? 'shrug' : 'slump').setFace(w ? 'grin' : 'sad').idle(c.t); } });
  // ═════════ BUTTON
  shot({ line: 'Then Benny asked,', set: park, cam: frame(-0.5, 1.5, { size: 'full', side: 0, dist: 1.15 }),
    act(lt, c) { put(P.me, -3.6, 1.5, 0.5, M[1]).setFace('smile').idle(c.t); put(P.benny, 2.4, 1.5, -0.5, 0.8).pose('carry').setFace('say').talk(c.t); P.draw.at(2.4 + Math.sin(-0.5) * 1.4, 3.6, 1.5 + Math.cos(-0.5) * 1.4, -0.5); } });
  shot({ line: 'does it look like a potato?', set: park, cam: frame(2.4, 1.5, { size: 'close', side: -24 }),
    act(lt, c) { put(P.benny, 2.4, 1.5, -0.5, 0.8).pose('carry').setFace('say').talk(c.t); P.draw.at(2.4 + Math.sin(-0.5) * 1.4, 3.3, 1.5 + Math.cos(-0.5) * 1.4, -0.5); } });
  shot({ line: 'I stared at it.', set: park, cam: frame(-3.6, 1.5, { size: 'face', side: 18, push: 0.07 }),
    act(lt, c) { put(P.me, -3.6, 1.5, 0.3, M[1]).setFace('sus').idle(c.t, 0.3); } });
  shot({ line: 'I said no.', set: park, sfx: [['sparkle', 'no'], ['thud', 'no']], cam: frame(-0.5, 1.5, { size: 'full', side: -10, dist: 1.2 }),
    act(lt, c) { put(P.me, -3.6, 1.5, 0.5, M[1]).setFace('say'); gain(P.me, P.sp, lt, c.w('no'), M[1], M[2], 'laugh'); put(P.benny, 2.4, 1.5, -0.5, 0.8).pose('carry').setFace(lt > c.w('no') + 0.3 ? 'laugh' : 'smile').idle(c.t); P.draw.at(2.4 + Math.sin(-0.5) * 1.4, 3.6, 1.5 + Math.cos(-0.5) * 1.4, -0.5); } });
  shot({ line: 'Some lies are worth the weight.', set: park, cam: frame(-3.6, 1.5, { size: 'close', side: -12, low: 0.32 }),
    act(lt, c) { put(P.me, -3.6, 1.5, 0.1, M[2]).pose('open', 0.5).setFace(lt < c.w('weight') ? 'smile' : 'grin').idle(c.t); } });
});
