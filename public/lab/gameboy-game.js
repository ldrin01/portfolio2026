// The handheld's game: a jog through Metro Manila. Plain script, used by the 3D lab and the About page.
// window.GBGame.create() returns { canvas, step(ms), press(k), release(k), setPower(on), isOn() }. The canvas is 800 x 720: the 160 x 144 screen
// drawn five times bigger with the pixel grid and LCD ghosting. It boots with the DRINWORKS logo, then the jogger runs by itself.
//
// The run: a jogger on the sidewalk. Behind him, from far to near: the Makati skyline, the LRT on its pillars (a train now and then),
// electric posts with spaghetti wires, and the traffic: the bus carousel (three buses, a gap, three more), jeepneys, delivery riders
// with their insulated boxes, and a fishball cart with its steam. On the sidewalk: trash bags, boxes, tires, a man doing squats, and
// dogs trotting toward you.
// The weather turns: sun and heat, then rain (ULAN), then the flood (BAHA!) rises and he swims, diving under what floats by: trash,
// planks, boxes, a bike, a car, and a lola in a basin. Then the water drains and he runs again.
// Along the way a sign for each EDSA stop slides past, from Monumento down to Taft Ave., the finish at 21.09 KM (a half marathon).
// Reach it in a real run (you pressed) and the prizes slide in one by one like a carousel: the PANALO jeepney signboard, the
// Micromatic payong (closed, then it pops open in the rain), and the golden kikiam on a stick. Then PANALO KA! and PRESS A.
// The input is easy on purpose: as something comes up, an "A" pops over him (early, and it stays up a while). Press anything and the
// right move (big jump, hop, or dive) happens by itself at the right moment; a press a bit early counts for the next thing, and once
// booked nothing can hurt you. You only lose if you never press for something. Without you it plays itself.
//
// Dark theme: the old handheld, and a different game: ZOMBIE EDSA. The picture flips (a dark street, light figures) and EDSA has
// fallen: burning towers and wrecks, a derailed LRT car, smoke, a chopper sweeping its searchlight, TULONG barricades, a blood moon.
// You are a survivor running to the evac point at Taft. The press still does the right thing at the right time, now it attacks:
// the itak first (they split in half), then each AYUDA! airdrop brings the next weapon: pistola (face first), shotgun (a spread of pellets, blown back,
// two at a time), armalayt (crowds that stagger back), machine gun (pushed back, limbs flying), kalibre .50 (thrown through the
// air), bazooka (groups blown up) and the tangke (a whole batallion goes up). Zombie dogs come low, so he aims down. Get caught and
// the screen goes to pieces: PATAY KA! Waves of the dead (DUMATING NA SILA!) and brownouts, where only his headlamp shows the way.
// At Taft the rescue chopper lands, he climbs in and it lifts off under flares; the prizes are a survival kit.
// The screen itself is worn too: burn-in from the logo and the score, dead pixels and a dead column, and weak batteries that now
// and then fade the picture (and dim the power light: led()).
// Light theme: a brand new unit and the sunny jog: crisp, quick LCD, no wear.
window.GBGame = {
  create() {
    const PALETTE = ['#8a8d26', '#727720', '#3d4619', '#1c2410']   // the unlit DMG screen: dull olive, like the Front photo
    const FONT = {
      0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
      5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
      H: '101101111101101', I: '111010010010111', P: '111101111100100', R: '110101110101101', E: '111100110100111', S: '111100111001111', A: '010101111101101',
      G: '111100101101111', M: '101111111101101', O: '111101101101111', V: '101101101101010', ' ': '000000000000000', '.': '000000000000010',
      D: '110101101101110', N: '110101101101101', W: '101101101111101', K: '101101110101101', U: '101101101101111', X: '101101010101101', L: '100100100100111',
      T: '111010010010010', C: '111100100100111', B: '110101110101110', '!': '010010010000010',
      F: '111100110100100', '-': '000000111000000', J: '001001001101111', Q: '111101101111001', Y: '101101010010010', Z: '111001010100111'
    }

    // ── sprites: '.' clear, 1–3 shades (3 darkest). Everything you can hit uses the darkest shade so it stands out from the city behind ──
    // the jogger, thicker: headband, tank top, shorts, two-pixel arms and legs; facing right, 11 x 14
    const TOP = ['....333....', '...33333...', '...22222...', '...22232...', '....222....', '...33333...', '..3333333..']
    const JOG = [
      [...TOP, '.223333322.', '22.33333.22', '...33333...', '...22222...', '..222.222..', '.222...222.', '222.....22.'],
      [...TOP, '..3333322..', '..333332...', '..333333...', '...22222...', '....222....', '....2222...', '...22.22...'],
      [...TOP, '..2333332..', '.2.33333.22', '2..33333...', '...22222...', '...22.22...', '..22...22..', '.22.....22.'],
      [...TOP, '..3333322..', '..333332...', '..333333...', '...22222...', '....222....', '...2222....', '...22.22...']
    ]
    const JUMP = ['....333....', '...33333...', '...22222...', '...22232...', '22..222..22', '.2.33333.2.', '..3333333..', '..3333333..', '...33333...', '...22222...', '..222.222..', '.222...222.', '...........', '...........']
    // swimming: a thick body and head (to the right), legs kicking, and the arms going round in a front-crawl stroke (four frames)
    const SWIM = (() => {
      const arms = [
        [[12, 2], [13, 1], [14, 1], [15, 0], [16, 0], [17, 0], [4, 6], [5, 6], [6, 6], [7, 6]],         // reaching forward over the head, other arm trailing
        [[11, 2], [11, 1], [11, 0], [12, 0], [8, 6], [9, 6], [10, 6], [11, 7], [12, 7]],                // up and over, other arm pulling under
        [[17, 3], [17, 4], [17, 5], [16, 6], [3, 2], [4, 1], [5, 1], [6, 0]],                            // into the water ahead, other arm coming back over
        [[10, 6], [11, 6], [12, 7], [13, 7], [6, 2], [7, 1], [8, 0], [9, 0]]                             // pulling under the body, other arm over the top
      ]
      return arms.map((arm, f) => {
        const g = Array.from({ length: 8 }, () => Array(18).fill('.'))
        for (let r = 3; r <= 5; r++) for (let c = 3; c <= 12; c++) g[r][c] = '3'                       // the body, three rows thick
        for (let c = 13; c <= 16; c++) g[2][c] = '3'                                                     // hair
        for (let r = 3; r <= 5; r++) { g[r][13] = '3'; for (let c = 14; c <= 16; c++) g[r][c] = '2' }   // the face
        g[3][15] = '3'
        const k = f % 2; for (let r = 3 + k; r <= 4 + k; r++) for (let c = 0; c <= 2; c++) g[r][c] = '3'   // kicking legs
        arm.forEach(([c, r]) => { g[r][c] = '2'; if (r + 1 < 8 && g[r + 1][c] === '.') g[r + 1][c] = '2' })   // two pixels thick
        return g.map(row => row.join(''))
      })
    })()
    const BAG = ['...33...', '..3..3..', '...33...', '.333333.', '33333333', '33323333', '33333333', '.333333.']
    const BOX = ['33333333', '32222223', '32322323', '32233223', '32233223', '32322323', '32222223', '33333333']
    const TIRE = [['..3333..', '.333333.', '33.22.33', '332..233', '332..233', '33.22.33', '.333333.', '..3333..'],
      ['..3333..', '.333333.', '332..233', '33.22.33', '33.22.33', '332..233', '.333333.', '..3333..']]
    const SQUAT = [
      ['...333...', '..33333..', '..22222..', '...222...', '2.3333..2', '.233332..', '..3333...', '..3333...', '..2222...', '.22..22..', '.2....2..', '.2....2..', '22....22.'],
      ['.........', '.........', '.........', '.........', '...333...', '..33333..', '..22222..', '...222...', '223333322', '..3333...', '.222222..', '.2....2..', '22....22.']
    ]
    const DOG = [   // facing left: pointy ear, snout, tail up at the back
      ['.3.........', '333.......3', '3333.....3.', '.333333333.', '..3333333..', '..3.3..3.3.', '..3.3..3.3.'],
      ['.3.........', '333.......3', '3333.....3.', '.333333333.', '..3333333..', '.3..3.3..3.', '3...3.3...3']]
    // floating things in the flood (the sub numbers are no longer used: they all hang just under the wave)
    const FLOAT = {
      trash: { rows: ['..3.33..', '.333333.', '33.33.33', '.33333..', '..333...'], sub: 3 },
      wood: { rows: ['3333333333333333', '3333333333333333', '3333333333333333', '.33333333333333.'], sub: 3 },
      fbox: { rows: ['33333333', '33333333', '33.33.33', '333..333', '333..333', '33.33.33', '33333333', '33333333'], sub: 5 },
      bike: { rows: ['.....33....3...', '......3...3....', '...33333333....', '..3..3...3.33..', '.3..3.3.3.3..3.', '3..3.3...3.3..3', '3...333..333..3', '.3..3.3..3.3.3.', '..33.....33.3..'], sub: 6 },
      car: { rows: ['.......333333333333.........', '......3.....3.....33........', '.....3......3......3........', '.33333333333333333333333333.', '3333333333333333333333333333',
        '3333333333333333333333333333', '.33333333333333333333333333.', '...333...............333....', '..3...3.............3...3...', '...333...............333....'], sub: 7 },
      lola: { rows: ['....333.....', '...33333....', '...22222....', '...2.2.2....', '....222.....', '..3333333...', '.333333333..', '33333333333.', '.333333333..', '..3333333...'], sub: 3 }
    }
    const KINDS = {   // w, h (how tall, for the jump) or dive (floats), and how it is drawn
      bag: { w: 8, h: 8, draw: (o, x) => px(BAG, x, GROUND - 8) },
      box: { w: 8, h: 8, draw: (o, x) => px(BOX, x, GROUND - 8) },
      boxes: { w: 8, h: 16, draw: (o, x) => { px(BOX, x, GROUND - 8); px(BOX, x, GROUND - 16) } },
      tire: { w: 8, h: 8, draw: (o, x) => px(TIRE[Math.floor(dist / 4) % 2], x, GROUND - 8) },
      squat: { w: 9, h: 13, draw: (o, x) => px(SQUAT[Math.floor(frame / 24) % 2], x, GROUND - 13) },
      dog: { w: 11, h: 7, draw: (o, x) => px(DOG[Math.floor(frame / 5) % 2], x, GROUND - 7) },
      // ZOMBIE EDSA: n of them, gap apart
      zombie: { w: 11, h: 14, zombie: true, draw: (o, x) => { for (let k = 0; k < o.n; k++) px(ZOMBIE[(Math.floor((frame + o.seed) / 14) + k) % 2], x + k * o.gap, GROUND - 14) } },
      zdog: { w: 11, h: 6, zombie: true, low: true, draw: (o, x) => { for (let k = 0; k < o.n; k++) px(ZDOG[(Math.floor(frame / 4) + k) % 2], x + k * o.gap, GROUND - 6) } }
    }
    // they drift just UNDER the wave (not on it), so they read clearly; sub = how far down from the surface they reach
    const FLOAT_DROP = 4
    Object.entries(FLOAT).forEach(([k, f]) => { KINDS[k] = { w: f.rows[0].length, sub: f.rows.length + FLOAT_DROP, dive: true, draw: (o, x) => px(f.rows, x, waterY + FLOAT_DROP + bob(o)) } })

    // night (the dark theme): the scene's shades are flipped (inv), and the night's own things are drawn in real shades (raw)
    const isNight = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    let night = isNight(), inv = false
    const S = sh => (inv ? 3 - sh : sh)
    // ── ZOMBIE EDSA: the dead shamble toward you (facing left, arms out), dead dogs come low and quick ──
    const ZOMBIE = [
      ['...333.....', '..33333....', '..32323....', '..33333....', '...333.....', '3333333....', '...33333...', '...333333..', '...33333...', '...22222...', '...22.22...', '..22...22..', '.22....22..', '.2......2..'],
      ['...333.....', '..33333....', '..32323....', '..33333....', '...333.....', '.333333....', '3..33333...', '...333333..', '...33333...', '...22222...', '...22.22...', '...22.22...', '...2..22...', '..22...2...']]
    const NOARMS = ZOMBIE[0].map((r, i) => (i === 5 || i === 6 ? '...' + r.slice(3) : r))
    const ZDOG = [['33.........', '3333.....3.', '.33333333.3', '..3333333..', '..3.3..3.3.', '.3..3..3..3'], ['33.........', '3333......3', '.333333333.', '..3333333..', '..3.3..3.3.', '..3.3..3.3.']]
    const rotL = rows => Array.from({ length: rows[0].length }, (_, i) => rows.map(r => r[rows[0].length - 1 - i]).join(''))   // fell forward: head to the left
    const rotR = rows => Array.from({ length: rows[0].length }, (_, i) => rows.map(r => r[i]).reverse().join(''))           // fell back: head to the right
    const flipV = rows => [...rows].reverse()
    // the arsenal: each AYUDA! airdrop brings the next one. range = how far ahead it hits, crowd = the biggest group that comes at you
    const WEAPONS = [
      { name: 'ITAK', range: 14, crowd: 1, kill: 'slice', gun: { rows: ['.....3', '....3.', '...3..', '..3...', '33....', '3.....'], dx: 8, dy: 1 } },
      { name: 'PISTOLA', range: 52, crowd: 1, kill: 'face', gun: { rows: ['3333', '33..', '3...'], dx: 9, dy: 7 } },
      { name: 'SHOTGUN', range: 44, crowd: 2, kill: 'back', gun: { rows: ['33333333', '.2233...', '.2......'], dx: 6, dy: 7 } },
      { name: 'ARMALAYT', range: 60, crowd: 3, kill: 'stagger', gun: { rows: ['333333333', '.333.3...', '..3..3...'], dx: 5, dy: 7 } },
      { name: 'MACHINE GUN', range: 64, crowd: 4, kill: 'shred', gun: { rows: ['33333333333', '.33333.3...', '.3..3......', '.3.........'], dx: 4, dy: 7 } },
      { name: 'KALIBRE .50', range: 70, crowd: 4, kill: 'fly', gun: { rows: ['3333333333333', '.33333333....', '..3.3........'], dx: 3, dy: 7 } },
      { name: 'BAZOOKA', range: 76, crowd: 5, kill: 'boom', gun: { rows: ['333333333333', '333333333333', '...2........'], dx: -1, dy: 3 } },
      { name: 'TANGKE', range: 84, crowd: 7, kill: 'mega', gun: null }
    ]
    const TANK = [['........333...................', '.......33333..................', '......3333333333333333333333..', '......33333333................', '..3333333333333333333.........', '.333333333333333333333........', '33333333333333333333333.......', '3222222222222222222222223.....', '32.3.3.3.3.3.3.3.3.3.3.23.....', '3222222222222222222222223.....', '.33333333333333333333333......'],
      ['........333...................', '.......33333..................', '......3333333333333333333333..', '......33333333................', '..3333333333333333333.........', '.333333333333333333333........', '33333333333333333333333.......', '3222222222222222222222223.....', '323.3.3.3.3.3.3.3.3.3.3.3.....', '3222222222222222222222223.....', '.33333333333333333333333......']]
    const CRATE = ['33333333', '32222223', '32333323', '32322323', '32333323', '32222223', '33333333']
    const CHUTE = ['..3333333333..', '.322222222223.', '32222222222223', '3.3...33...3.3', '.3....33....3.', '..3...33...3..', '...3..33..3...', '....3.33.3....', '.....3333.....']
    const HELI = ['.......3333333333333333.......', '..............33..............', '....33333333333333333.........', '..33322222333333333333333333..', '.3332222233333333333333...33..', '333333333333333333333......333', '.3333333333333333333..........', '...3........3.................', '.33333333333333...............']
    const SC = 5
    const canvas = document.createElement('canvas'); canvas.width = 160 * SC; canvas.height = 144 * SC
    const out = canvas.getContext('2d')
    const mk = () => { const c = document.createElement('canvas'); c.width = 160; c.height = 144; return c }
    const buf = mk(), ghost = mk(), back = mk(), gctx = ghost.getContext('2d'), bctx = back.getContext('2d')
    let ctx = buf.getContext('2d')                                  // swapped to bctx while the faint background layer is drawn
    const GROUND = 124, LANE = 119, KX = 22, KW = 11
    const BIG = 4.4, HOP = 3.3, G = 0.3, DIVE = 1.4                       // jump speeds, gravity, and how fast he dives (per frame)
    const down = { a: false, b: false }

    // the Makati skyline, built once (repeats every 240 px)
    const SKY_W = 240, skyline = []
    { let x = 0, seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
      while (x < SKY_W) { const w = 10 + Math.floor(rnd() * 14), h = 18 + Math.floor(rnd() * 34); skyline.push({ x, w, h, cap: rnd() < 0.3 }); x += w + 1 + Math.floor(rnd() * 3) } }

    // the EDSA run: a sign for each stop slides past as you reach it; Taft Ave. is the finish (and the best you can do)
    const STOPS = ['MONUMENTO', 'BALINTAWAK', 'ROYAL', 'MUNOZ', 'SM NORTH', 'TRINOMA', 'PHILAM', 'CENTRIS', 'KAMUNING', 'NEPA Q MART',
      'CUBAO', 'SANTOLAN', 'ORTIGAS', 'SHAW BLVD.', 'BONI AVE.', 'GUADALUPE', 'BUENDIA', 'AYALA', 'MAGALLANES', 'TAFT AVE.']
    const TOTAL = 21090                                          // Taft Ave. is at 21.09 KM, a half marathon
    const FIRST_STOP = 60, STOP_EVERY = (TOTAL - FIRST_STOP) / (STOPS.length - 1)   // metres to the first sign, then between signs
    const stopAt = i => FIRST_STOP + i * STOP_EVERY
    const SIGN_PACE = 0.5                                        // the signs drift by slower than the street (like something further back), so you can read them
    // the 21.09 KM is a story, not a real distance: a run from Monumento to Taft takes about two and a quarter minutes
    const MPX = 1.95                                             // metres covered per pixel the street moves (the street itself scrolls calmly)
    // the weather: each phase runs this many frames, then the next one
    const PHASES = [['sun', 1500], ['rain', 360], ['rise', 160], ['swim', 1100], ['drain', 160]]
    const NIGHT_PHASES = [['night', 900], ['horde', 600], ['night', 700], ['brownout', 600], ['lit', 400]]
    const PH = () => (night ? NIGHT_PHASES : PHASES)
    const DRY_P = ['sun', 'night', 'brownout', 'lit', 'horde']
    const WATER_TOP = 98, DRY = 152                    // the flood rises to just under the LRT, so the city still shows above it

    let kidY = 0, vy = 0, speed = 1, dist = 0, metres = 0, hi = 0, frame = 0
    let obs = [], sinceSpawn = 0, nextGap = 90, train = null, trainIn = 200
    let lane = [], laneGap = 0, convoy = 0
    let phase = 0, phaseT = 0, waterY = DRY, cover = 0, swimY = 2, dive = null, banner = null
    let manual = false, over = 0, mode = 'boot', bootT = 0, acc = 0, target = null
    let signs = [], nextStop = 0, lastStop = '', finish = 0, credit = false
    let kidX = KX, celT = 0, crowd = [], confetti = [], flashT = 0           // the finish: where he stops, the party, the fans
    let fireworks = []                                                      // at night the finish gets flares
    // ZOMBIE EDSA: the weapon (its index in WEAPONS), the airdrop on its way, the bodies and bits flying, explosions, the shot
    // being fired, the itak's swipe, screen shake, splatter on the glass, the rescue chopper (and whether he has climbed in), and
    // the chaos round him: a chopper overhead with its searchlight, and paper blowing past
    let tier = 0, airdrop = null, dropsTaken = 0, gore = [], bits = [], booms = [], shot = null, swipe = 0, shake = 0, splats = [], heli = null, boarded = false
    let smoke = [], recoil = 0                                              // the tangke's muzzle smoke, and how far it has rocked back
    let flyover = null, flyIn = 400
    const debris = Array.from({ length: 7 }, (_, i) => ({ x: i * 25, y: 30 + i * 11, ph: i }))
    // the night sky: stars that twinkle, fixed in place
    const stars = Array.from({ length: 34 }, (_, i) => ({ x: (i * 47 + 13) % 160, y: 3 + ((i * 37 + 11) % 61), ph: i * 17 }))
    const hash = (a, b, c) => { let h = (a * 374761 + b * 668265 + c * 2147483) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295 }
    const rain = Array.from({ length: 46 }, () => ({ x: Math.random() * 170, y: Math.random() * 144 }))
    const reset = () => {
      kidY = 0; vy = 0; speed = 1; dist = 0; metres = 0; obs = []; sinceSpawn = 0; nextGap = 90; target = null; over = 0
      phase = 0; phaseT = 0; waterY = DRY; cover = 0; swimY = 2; dive = null; banner = null; lane = []; laneGap = 0; convoy = 0
      signs = []; nextStop = 0; lastStop = ''; finish = 0; credit = false
      kidX = KX; celT = 0; crowd = []; confetti = []; flashT = 0; hearts = []; fireworks = []
      tier = 0; airdrop = null; dropsTaken = 0; gore = []; bits = []; booms = []; shot = null; swipe = 0; shake = 0; splats = []; heli = null; boarded = false; smoke = []; recoil = 0
      if (night) banner = { t: 'TAKBO!', f: 90 }
    }
    // the power switch: off blanks the LCD (it fades out through the ghosting); on boots again from the logo, with a fresh game
    const setPower = (on) => {
      if (!on) { mode = 'off'; return }
      if (mode !== 'off') return
      mode = 'boot'; bootT = 0; frame = 0; manual = false; reset()
    }

    const px = (rows, x, y) => rows.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== '.' && c !== '0') { ctx.fillStyle = PALETTE[S(+c)]; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1) }
    }))
    const text = (s, x, y, shade = 3, sc = 1) => {
      ctx.fillStyle = PALETTE[S(shade)]
      ;[...s].forEach((ch, k) => [...(FONT[ch] || FONT[' '])].forEach((b, n) => { if (b === '1') ctx.fillRect(x + (k * 4 + (n % 3)) * sc, y + Math.floor(n / 3) * sc, sc, sc) }))
    }
    const rect = (x, y, w, h, shade) => { ctx.fillStyle = PALETTE[S(shade)]; ctx.fillRect(Math.round(x), Math.round(y), w, h) }
    const raw = (x, y, w, h, shade) => { ctx.fillStyle = PALETTE[shade]; ctx.fillRect(Math.round(x), Math.round(y), w, h) }   // a real shade, night or day (lights)
    const clear = () => rect(0, 0, 160, 144, 0)
    const bob = o => Math.round(Math.sin((frame + o.seed) * 0.08))
    const phaseName = () => PH()[phase][0]
    const swimming = () => waterY < GROUND - 8

    // ── the easy input: whatever is next gets a window; a press inside it books the move, which then fires on its own ──
    const relSpeed = o => (KINDS[o.type].dive ? speed * 0.9 : speed) - o.vx
    const timeTo = o => (o.x + o.w / 2 - (KX + KW / 2)) / relSpeed(o)
    const leadOf = o => KINDS[o.type].zombie ? (WEAPONS[tier].range + o.w / 2 + KW / 2) / relSpeed(o) : KINDS[o.type].dive ? (KINDS[o.type].sub + 2) / DIVE + (o.w + 14) / (2 * relSpeed(o)) + 2 : (o.h > 9 ? BIG : HOP) / G
    const WINDOW = 80, GRACE = 5                                  // the "A" shows early and stays up a long time

    const press = (k) => {
      if (down[k]) return; down[k] = true
      if (mode === 'prize') { pressPrize(); return }
      if (mode !== 'play' || over || finish) return
      if (!manual) { manual = true; metres = 0 }
      if (target && !target.ok) target.ok = true
      else credit = true                                            // pressed early: it counts for the next thing that comes
    }
    const release = (k) => { down[k] = false }

    // the dead: alone or in a crowd (as big as the weapon can take, bigger in a wave), or dead dogs
    const spawnZ = () => {
      const W = WEAPONS[tier], dog = Math.random() < 0.25, horde = phaseName() === 'horde'
      const n = dog ? (tier >= 3 ? 2 : 1) : 1 + Math.floor(Math.random() * (horde ? W.crowd + 1 : W.crowd)), gap = dog ? 13 : 8
      obs.push({ type: dog ? 'zdog' : 'zombie', n, gap, x: 168, w: 11 + (n - 1) * gap, h: dog ? 6 : 14, vx: dog ? -0.7 : -0.25, ok: false, done: false, seed: Math.random() * 100 })
    }
    const spawn = () => {
      const floods = swimming()
      if (night && !floods) { spawnZ(); return }
      const pool = floods ? ['trash', 'trash', 'wood', 'fbox', 'bike', 'car', 'lola']
        : ['bag', 'box', 'box', 'boxes', 'tire', 'tire', 'squat', 'dog', 'dog', 'bag']
      const type = pool[Math.floor(Math.random() * pool.length)], K = KINDS[type]
      obs.push({ type, x: 168, w: K.w, h: K.h || 0, vx: type === 'dog' ? -0.5 : 0, ok: false, done: false, seed: Math.random() * 100 })
    }
    // the traffic behind: the bus carousel comes three at a time; jeepneys, riders and the odd fishball cart in between
    const spawnLane = () => {
      let type
      if (night) {   // EDSA at night: nothing moves in the lane, just wrecks and barricades
        type = ['wjeep', 'wcar', 'wcar', 'wbus', 'barri'][Math.floor(Math.random() * 5)]
        const W = { wjeep: 28, wcar: 22, wbus: 34, barri: 28 }[type]
        lane.push({ type, x: 166, w: W, f: 0.86, seed: Math.random() * 100 })
        laneGap = W + 14 + Math.random() * 50
        return
      }
      if (convoy > 0) { type = 'bus'; convoy-- } else {
        const r = Math.random()
        type = r < 0.22 ? 'bus' : r < 0.55 ? 'jeep' : r < 0.85 ? 'rider' : 'cart'
        if (type === 'bus') convoy = 2
      }
      const W = { bus: 34, jeep: 28, rider: 15, cart: 22 }[type]
      lane.push({ type, x: 166, w: W, f: { bus: 0.86, jeep: 0.84, rider: 0.5, cart: 1 }[type] })
      laneGap = type === 'bus' && convoy > 0 ? W + 3 : W + 10 + Math.random() * 40
    }

    const nextPhase = () => {
      phase = (phase + 1) % PH().length; phaseT = 0
      const p = phaseName()
      if (p === 'brownout') banner = { t: 'BROWNOUT!', f: 120 }
      if (p === 'lit') banner = { t: 'MAY ILAW NA!', f: 120 }
      if (p === 'horde') banner = { t: 'DUMATING NA SILA!', f: 130 }
      if (p === 'rain') banner = { t: 'ULAN', f: 90 }
      if (p === 'rise') { banner = { t: 'BAHA!', f: 110 }; }
      if (p === 'drain') obs = obs.filter(o => !KINDS[o.type].dive || o.x < KX + 30)
    }

    // ── the finish at Taft: the world slows to a stop, he jogs to the middle and jumps for joy, the fans rush in
    //    (a reporter with a mic, photographers flashing, an IDOL sign), confetti, then the circle closes on him ──
    const FIN_X = 70, CROWD_AT = 60, IRIS_AT = 380, IRIS_LEN = 45, FIN_END = IRIS_AT + IRIS_LEN + 12
    const HEART = ['33.33', '33333', '.333.', '..3..']
    let hearts = []
    const CHEER = ['2...333...2', '2..33333..2', '.2.22222.2.', '.2.22232.2.', '..2.222.2..', '..2333332..', '...33333...', '...33333...', '...33333...', '...22222...', '..222.222..', '..22...22..', '.22.....22.', '...........']
    const FAN = {   // the crowd: a shade lighter than him, so he stays the star. All face right; the ones on his right are mirrored
      up: ['2.333.2', '2.222.2', '2.222.2', '.23332.', '..333..', '..333..', '..222..', '..2.2..', '.2...2.', '.2...2.'],
      out: ['..333..', '..222..', '..222..', '2233322', '..333..', '..333..', '..222..', '..2.2..', '.2...2.', '.2...2.'],
      walk: [['..333..', '..222..', '..222..', '.23332.', '2.333.2', '..333..', '..222..', '.2..2..', '.2...2.', '2....2.'],
        ['..333..', '..222..', '..222..', '.23332.', '.23332.', '..333..', '..222..', '..22...', '..2.2..', '..2..2.']],
      cam: ['..333...', '..22333.', '..22333.', '..2333..', '.23322..', '..333...', '..222...', '..2.2...', '.2...2..', '.2...2..'],
      mic: ['..333....', '..222....', '..222..33', '..3332222', '..333....', '..333....', '..222....', '..2.2....', '.2...2...', '.2...2...']
    }
    const flip = rows => rows.map(r => [...r].reverse().join(''))
    const spawnCrowd = () => {
      const L = ['mic', 'fan', 'cam', 'sign'], R = ['cam', 'fan', 'sign', 'fan', 'fan']
      crowd = [
        ...L.map((kind, i) => ({ kind, side: -1, x: -12 - i * 18, tx: kidX - 10 - i * 11, ph: i * 7, flash: 0, hp: i * 14 + 5 })),
        ...R.map((kind, i) => ({ kind, side: 1, x: 168 + i * 18, tx: kidX + 13 + i * 11, ph: i * 5 + 3, flash: 0, hp: i * 11 + 2 }))
      ]
    }
    // ZOMBIE EDSA's finish: the rescue chopper comes down at Taft, he runs to it and climbs in, and it lifts off under flares
    const updateRescue = () => {
      finish++
      speed = Math.max(0, speed - 0.03)
      if (!celT && speed === 0) celT = 1
      if (!celT) return false
      celT++
      if (!heli) heli = { x: 168, y: -20 }
      const HX = 72
      if (celT < 110) { heli.x += (HX - heli.x) * 0.04; heli.y += (GROUND - 30 - heli.y) * 0.04 }
      else if (!boarded) { kidX += 0.8; if (kidX >= HX + 10) boarded = true }
      else { const u = celT - (heli.up = heli.up || celT); heli.y -= u * 0.025; heli.x += u * 0.035 }
      if (boarded && celT % 16 === 0) fireworks.push({ x: 20 + Math.random() * 120, y: 14 + Math.random() * 36, t: 0, n: 8 + Math.floor(Math.random() * 5), ph: Math.random() * 6 })
      fireworks.forEach(f => f.t++); fireworks = fireworks.filter(f => f.t < 40)
      if (celT >= FIN_END) { if (manual) startPrize(); else { manual = false; reset() } return true }
      return false
    }
    const updateFinish = () => {
      if (night) return updateRescue()
      finish++
      speed = Math.max(0, speed - 0.03)
      if (!swimming() && kidX < FIN_X) kidX = Math.min(FIN_X, kidX + 0.7)
      if (!celT && speed === 0 && kidX >= FIN_X && !swimming()) celT = 1
      if (!celT) return false
      celT++
      if (kidY === 0 && celT % 32 === 0 && celT < IRIS_AT + 20) vy = 2.8          // hop, hop, hop
      if (celT === CROWD_AT) spawnCrowd()
      crowd.forEach(f => {
        if (Math.abs(f.tx - f.x) > 0.6) { f.x += Math.sign(f.tx - f.x) * 1.2; f.walk = true } else { f.x = f.tx; f.walk = false }
        if (f.flash) f.flash--
        if (!f.walk && f.kind === 'cam' && (celT + f.ph * 3) % 40 === 0) { f.flash = 6; flashT = 2 }
        if (!f.walk && f.kind !== 'cam' && (celT + f.hp) % 55 === 0) hearts.push({ x: f.x + 1 + (f.tx < kidX ? 3 : -3), y: GROUND - 16, t: 0 })   // the fans send him love
      })
      hearts.forEach(h => { h.t++; h.y -= 0.5; h.x += Math.sin(h.t * 0.15) * 0.4 + (kidX + 3 - h.x) * 0.015 })   // drifting up and toward him
      hearts = hearts.filter(h => h.t < 70)
      if (night && celT > CROWD_AT + 20 && celT % 22 === 0) fireworks.push({ x: 18 + Math.random() * 124, y: 16 + Math.random() * 40, t: 0, n: 10 + Math.floor(Math.random() * 6), ph: Math.random() * 6 })
      fireworks.forEach(f => f.t++); fireworks = fireworks.filter(f => f.t < 40)
      if (!night && celT > CROWD_AT + 30) for (let k = 0; k < 2; k++) if (confetti.length < 90) confetti.push({ x: Math.random() * 170, y: -2, vx: Math.random() * 0.6 - 0.3, s: 1 + Math.floor(Math.random() * 3) })
      confetti.forEach(c => { c.y += 0.8; c.x += c.vx + Math.sin((frame + c.x) * 0.1) * 0.3 })
      confetti = confetti.filter(c => c.y < GROUND)
      if (celT >= FIN_END) { if (manual) startPrize(); else { manual = false; reset() } return true }
      return false
    }
    const drawCrowd = () => {
      crowd.forEach(f => {
        let rows, bounce = 0
        if (f.walk) rows = FAN.walk[Math.floor((frame + f.ph) / 6) % 2]
        else if (f.kind === 'cam') rows = FAN.cam
        else if (f.kind === 'mic') rows = FAN.mic
        else { rows = f.kind === 'sign' || Math.floor((frame + f.ph) / 10) % 2 ? FAN.up : FAN.out; bounce = -Math.abs(Math.round(Math.sin((frame + f.ph) * 0.18) * 2)) }
        const s = f.side > 0 ? flip(rows) : rows, x = Math.round(f.x), y = GROUND - rows.length + bounce
        px(s, x, y)
        if (night && !f.walk && (f.kind === 'fan' || f.kind === 'mic') && Math.floor((frame + f.ph * 5) / 12) % 3) raw(x + (f.side > 0 ? 5 : 1), y - 1 + bounce * 0, 1, 1, 0)   // phone lights up in the air
        if (f.kind === 'sign' && !f.walk) { const bx = x - 5, by = y - 8; rect(bx, by, 17, 8, 3); rect(bx + 1, by + 1, 15, 6, 0); text('IDOL', bx + 1, by + 2, 3) }
        if (f.flash) {                                                  // the camera flash: a bright burst with dark rays
          const lx = f.side > 0 ? x + 1 : x + 6, ly = y + 1, r = f.flash > 3 ? 4 : 3
          rect(lx - r, ly, r * 2 + 1, 1, 3); rect(lx, ly - r, 1, r * 2 + 1, 3)
          rect(lx - 2, ly - 2, 1, 1, 3); rect(lx + 2, ly - 2, 1, 1, 3); rect(lx - 2, ly + 2, 1, 1, 3); rect(lx + 2, ly + 2, 1, 1, 3)
          rect(lx - 1, ly - 1, 3, 3, 0)
        }
      })
    }
    // the circle closing in on him (and later opening on the prizes): everything outside the radius goes dark
    const iris = (cx, cy, r) => {
      for (let y = 0; y < 144; y++) {
        const d = r * r - (y - cy) ** 2
        if (d <= 0) { raw(0, y, 160, 1, 3); continue }
        const dx = Math.sqrt(d), x1 = Math.max(0, Math.round(cx - dx)), x2 = Math.round(cx + dx)
        if (x1 > 0) raw(0, y, x1, 1, 3)
        if (x2 < 160) raw(x2, y, 160 - x2, 1, 3)
      }
    }

    const update = () => {
      if (over) { if (--over === 0) { manual = false; reset() } return }
      if (finish && updateFinish()) return
      dist += speed; if (!finish) speed = Math.min(1.5, speed + 0.00015)   // easy to follow: it picks up a little, never races
      if (!finish) { metres = Math.min(TOTAL, metres + speed * MPX); if (manual) hi = Math.max(hi, metres) }   // it holds at 21.09 until the Taft sign reaches him
      // the stop signs: each one appears ahead so that it passes you right at its distance
      if (nextStop < STOPS.length && metres >= stopAt(nextStop) - (168 - KX) * MPX / SIGN_PACE) { const n = STOPS[nextStop]; signs.push({ x: 168, name: n, w: n.length * 8 + 7, last: nextStop === STOPS.length - 1 }); nextStop++ }
      signs.forEach(sg => {
        sg.x -= speed * SIGN_PACE
        if (!sg.passed && sg.x + sg.w / 2 < KX + KW / 2) {
          sg.passed = true; lastStop = sg.name
          if (sg.last) {
            finish = 1; celT = 0; banner = { t: night ? 'LIGTAS KA!' : 'FINISH!', f: 220 }; obs = []; metres = TOTAL; if (manual) hi = Math.max(hi, metres)
            if (['rise', 'swim'].includes(phaseName())) { phase = PH().findIndex(x => x[0] === 'drain'); phaseT = 0 }   // in the flood: the water drains first, then he can celebrate
          }
        }
      })
      signs = signs.filter(sg => sg.x > -sg.w - 4)
      // weather
      if (!(finish && !['rise', 'swim', 'drain'].includes(phaseName())) && ++phaseT > PH()[phase][1]) nextPhase()   // at the finish the weather holds (no flood on his big moment)
      if (flashT) flashT--
      const p = phaseName()
      const wet = !DRY_P.includes(p)
      cover += ((wet ? 1 : 0) - cover) * 0.02
      if (p === 'rise') waterY = DRY + (WATER_TOP - DRY) * Math.min(1, phaseT / 160)
      else if (p === 'drain') waterY = WATER_TOP + (DRY - WATER_TOP) * Math.min(1, phaseT / 160)
      else waterY = p === 'swim' ? WATER_TOP : DRY
      if (banner && --banner.f <= 0) banner = banner.next || null
      rain.forEach(r => { r.y += 3.2; r.x -= 1.4 + speed * 0.3; if (r.y > 144) { r.y = -4; r.x = Math.random() * 190 } if (r.x < -4) r.x += 180 })

      // the world moves left (dogs trot toward you a little faster)
      obs.forEach(o => { o.x += -(KINDS[o.type].dive ? speed * 0.9 : speed) + o.vx })
      obs = obs.filter(o => o.x > -30)
      // spawning follows the weather: things on the sidewalk while dry (stopping before the flood), floating things while swimming
      const canGround = DRY_P.includes(p) || (p === 'rain' && phaseT < 300)
      const canFloat = p === 'swim' && phaseT > 60 && phaseT < 1320
      sinceSpawn += speed
      if (!finish && sinceSpawn > nextGap && (canGround || canFloat)) {   // well spaced, so it never feels rushed (a wave comes thicker)
        spawn(); sinceSpawn = 0
        nextGap = night && !swimming() ? (p === 'horde' ? 60 : 100) + Math.random() * 60 : (canFloat ? 130 : 115) + Math.random() * 80 + speed * 20
      }
      if (night) updateNight()
      // the train on the LRT, and the traffic
      if (train) { train.x -= speed * 0.4 + 1.1; if (train.x < -90) train = null } else if (--trainIn <= 0 && !night) { train = { x: 170 }; trainIn = 500 + Math.random() * 500 }   // no trains after the fall
      lane.forEach(v => { v.x -= speed * v.f }); lane = lane.filter(v => v.x > -40)
      laneGap -= speed * 0.86; if (laneGap <= 0) spawnLane()

      // the next thing coming, and its window
      const live = obs.filter(o => !o.done).map(o => ({ o, t: timeTo(o) })).filter(e => e.t > -GRACE - 2).sort((a, b) => a.t - b.t)
      const next = live[0]
      target = null
      if (next) {
        const o = next.o, t = next.t, lead = leadOf(o), K = KINDS[o.type]
        if (t <= lead + WINDOW) { target = o; if (!manual || credit) { o.ok = true; credit = false } }
        if (o.ok && t <= lead) {
          if (K.zombie) kill(o)
          else if (K.dive && swimming()) { dive = { o, y: K.sub + 3 }; o.done = true }
          else if (!K.dive && kidY === 0 && !swimming()) { vy = o.h > 9 ? BIG : HOP; o.done = true }
        }
        if (!o.ok && t < -GRACE) o.done = true
      }
      // moving: jumping on the road, or swimming and diving in the flood
      if (swimming()) {
        kidY = 0; vy = 0
        if (dive && dive.o.x + dive.o.w < KX - 2) dive = null
        const want = dive ? dive.y : 3
        swimY += Math.max(-DIVE, Math.min(DIVE, want - swimY))
      } else {
        swimY = 3; dive = null
        vy -= G; kidY = Math.max(0, kidY + vy); if (kidY === 0) vy = Math.max(vy, 0)
      }
      // bumping into something
      const hit = obs.some(o => {
        if (o.ok) return false                                      // booked: it can't hurt you
        const K = KINDS[o.type], xHit = o.x < KX + KW - 2 && o.x + o.w > KX + 2
        if (!xHit) return false
        if (K.zombie) return true
        if (K.dive) return swimming() && waterY + swimY - 1 < waterY + K.sub
        return !swimming() && kidY < o.h - 1
      })
      if (hit && manual && !finish) over = night ? 150 : 100
    }

    // ── ZOMBIE EDSA: the kills ──
    const splash = (x, y, n, up = 1) => { for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.3) * 2, vy: -Math.random() * 2.2 * up, life: 40 + Math.random() * 30, s: Math.random() < 0.5 ? 3 : 2, w: 1 }) }
    const BODY_REST = 30                                     // frames a body lies on the road before it blinks out (half a second)
    // how many frames each weapon's bullet takes to reach its target: the kill lands when it gets there, so the hit and the reaction
    // line up (itak, pistola, shotgun, armalayt, machine gun, kalibre .50, bazooka, tangke)
    const FLY = [0, 4, 3, 5, 4, 1, 10, 4]
    const kill = (o) => {
      if (o.dead || o.dying) return
      o.done = true; o.ok = true
      const dog = o.type === 'zdog', fly = FLY[tier]
      // the shot: it follows its target (o) until it lands; n is the armalayt's burst (2 to 4 rounds) and the machine gun's streams
      const life = fly + 4 + (tier === 3 ? 6 : 0)                   // the armalayt's burst needs longer for its last rounds to arrive
      shot = { t: life, T: life, fly, o, x: o.x, y: dog ? GROUND - 3 : GROUND - 9, low: dog, n: 2 + Math.floor(Math.random() * 3) }
      if (tier === 0) swipe = 8
      if (tier === 5) shake = Math.max(shake, 4)                       // the .50 kicks
      if (tier === 7) {                                                 // the tangke rocks back, and its muzzle smokes
        recoil = 3; shake = Math.max(shake, 6)
        const mx = Math.round(kidX) + 22, my = GROUND - 9
        for (let i = 0; i < 9; i++) smoke.push({ x: mx - 2 + Math.random() * 5, y: my - 2 + Math.random() * 4, vx: (Math.random() - 0.3) * 0.5, vy: -0.15 - Math.random() * 0.35, s: Math.random() < 0.5 ? 2 : 3, life: 24 + Math.random() * 14 })
      }
      if (fly) { o.dying = fly; return }
      land(o)
    }
    // the bullet arrives: the body reacts, by weapon
    const land = (o) => {
      o.dead = true; o.dying = 0
      const W = WEAPONS[tier], dog = o.type === 'zdog'
      for (let k = 0; k < o.n; k++) {
        const base = dog ? ZDOG[0] : ZOMBIE[0], x = o.x + k * o.gap, y = GROUND - base.length
        const body = (rows, extra) => gore.push({ rows, base: rows, x, y, vx: 0, vy: 0, g: 0.18, t: 0, ...extra })
        switch (W.kill) {
          case 'slice':                                      // the itak: in half, the top flies off, the legs fold a moment later
            if (dog) body(base, { vx: 0.8, vy: -1.2, land: 'R' })
            else { const top = base.slice(0, 7), bot = base.slice(7); gore.push({ rows: top, base: top, x, y, vx: 0.9, vy: -1.8, g: 0.16, t: 0, land: 'L' }); gore.push({ rows: bot, base: bot, x, y: y + 7, vx: 0, vy: 0, g: 0.18, t: 0, delay: 10, land: 'R' }) }
            splash(x + 4, y + 7, 10); break
          case 'face': body(base, { vx: -0.2, vy: -0.6, land: 'L' }); splash(x + 4, y + 4, 6); break               // pistola: down on its face
          case 'back': body(base, { vx: 1.4, vy: -1.4, land: 'R' }); splash(x + 6, y + 5, 8); break                // shotgun: blown onto its back
          case 'stagger': body(base, { push: 0.45, pushT: 14 + k * 3, g: 0, land: 'R' }); splash(x + 6, y + 5, 5); break   // armalayt: staggers back, then down
          case 'shred': body(dog ? base : NOARMS, { push: 0.6, pushT: 28, limbs: true, g: 0, land: 'R' }); splash(x + 6, y + 5, 10); break   // machine gun: pushed back, coming apart
          case 'fly': body(base, { vx: 2.4 + Math.random(), vy: -2.6 - Math.random() * 1.2, g: 0.1, spin: true }); splash(x + 6, y + 5, 8); break   // kalibre .50: thrown
          default: body(base, { vx: (Math.random() - 0.4) * 3, vy: -3.5 - Math.random() * 1.8, g: 0.16, spin: true }); splash(x + 6, y + 6, 12, 1.5)   // bazooka, tangke: up in the air
        }
      }
      if (W.kill === 'boom') { booms.push({ x: o.x + o.w / 2, y: GROUND - 8, t: 0, R: 14 }); shake = 8 }
      if (W.kill === 'mega') {   // the tangke: a string of big blasts, and everything on screen goes with it
        for (let i = 0; i < 6; i++) booms.push({ x: o.x + Math.random() * 70 - 10, y: GROUND - 6 - Math.random() * 30, t: -i * 4, R: 16 + Math.random() * 8 })
        shake = 24
        obs.filter(q => KINDS[q.type].zombie && !q.dead && !q.dying && q.x < 170).forEach(kill)
      }
      if (W.kill === 'fly') { for (let i = 0; i < 10; i++) bits.push({ x: o.x + 2, y: GROUND - 9 + Math.random() * 4, vx: -0.5 + Math.random() * 3, vy: -1 - Math.random() * 2, life: 10 + Math.random() * 8, s: 3, w: 1 }); shake = Math.max(shake, 5) }   // the .50's sparks on impact
      obs = obs.filter(q => !q.dead)
    }
    const updateNight = () => {
      // AYUDA!: a crate floats down on a parachute; run through it for the next weapon
      if (!airdrop && tier < 7 && !finish && metres >= TOTAL * (0.045 + dropsTaken * 0.115)) { airdrop = { x: 135 + Math.random() * 20, y: -16 }; dropsTaken++ }   // the first within seconds, then one every 15 to 20 s
      if (airdrop) {
        if (airdrop.y < GROUND - 7) { airdrop.y += 0.6; airdrop.x -= speed * 0.25 } else { airdrop.landed = true; airdrop.x -= speed }
        if (airdrop.y > GROUND - 34 && airdrop.x < KX + KW && airdrop.x > KX - 8) { tier = Math.min(7, tier + 1); airdrop = null; banner = { t: 'AYUDA!', f: 70, next: { t: WEAPONS[tier].name, f: 120 } } }
        else if (airdrop.x < -20) airdrop = null
      }
      gore.forEach(b => {
        if (b.delay > 0) { b.delay--; b.x -= speed; return }
        b.t++
        if (b.push) {
          b.x += b.push
          if (b.limbs && b.t % 3 === 0) bits.push({ x: b.x + 4, y: b.y + 4 + Math.random() * 6, vx: Math.random() * 2 - 0.5, vy: -1 - Math.random() * 1.5, life: 60, s: 3, w: 2 })
          if (b.t > b.pushT) { b.push = 0; b.vy = -0.7; b.g = 0.18 }
        }
        b.x += b.vx - speed; b.vy += b.g; b.y += b.vy
        const floor = GROUND - b.rows.length
        if (b.y >= floor && b.vy > 0) {
          if (b.land && !b.landed) { b.rows = b.land === 'L' ? rotL(b.base) : rotR(b.base); b.landed = true }
          b.y = GROUND - b.rows.length; b.vy = 0; b.vx *= 0.5; b.g = 0; b.spin = false
        }
        if (b.g === 0 && b.vy === 0 && !b.push && b.y >= GROUND - b.rows.length) b.rest = (b.rest || 0) + 1   // lying on the road
        if (b.spin && b.t % 4 === 0) b.rows = [b.base, rotR(b.base), flipV(b.base), rotL(b.base)][(b.t / 4) % 4]
      })
      gore = gore.filter(b => b.x > -30 && b.x < 220 && b.y < 150 && !(b.rest > BODY_REST + 24))   // a body lies a moment, blinks, and is gone
      bits.forEach(q => { q.x += q.vx - speed; q.vy += 0.15; q.y += q.vy; if (q.y > GROUND + 1) { q.y = GROUND + 1; q.vx = 0; q.vy = 0 } q.life-- })
      bits = bits.filter(q => q.life > 0 && q.x > -4)
      booms.forEach(e => { e.t++; e.x -= speed }); booms = booms.filter(e => e.t < 28)
      if (shot && --shot.t <= 0) shot = null
      if (swipe) swipe--
      if (shake) shake--
      obs.filter(o => o.dying).forEach(o => { if (--o.dying <= 0) land(o) })   // bullets in flight landing
      if (recoil > 0) recoil = Math.max(0, recoil - 0.5)
      smoke.forEach(q => { q.x += q.vx - speed * 0.5; q.y += q.vy; q.vy *= 0.97; q.life-- }); smoke = smoke.filter(q => q.life > 0)
      // a chopper crosses now and then, sweeping its searchlight
      if (flyover) { flyover.x -= 0.7; if (flyover.x < -40) flyover = null } else if (--flyIn <= 0 && !finish) { flyover = { x: 170, y: 18 + Math.random() * 10 }; flyIn = 900 + Math.random() * 700 }
      debris.forEach(d => { d.x -= 2.2 + speed; d.y += Math.sin((frame + d.ph * 20) * 0.1) * 0.6; if (d.x < -4) { d.x = 170 + Math.random() * 60; d.y = 20 + Math.random() * 90 } })
    }

    // ── drawing ──
    // the traffic is drawn a shade lighter than its numbers say (2 -> 1, 1 -> 0, 0 -> 1), so it stays in the background
    const rectB = (x, y, w, h, shade) => rect(x, y, w, h, [1, 0, 1, 3][shade])
    const drawBus = (x, b) => {
      const t = b - 15
      rectB(x, t, 34, 13, 2); rectB(x + 1, t + 1, 32, 11, 1)
      for (let w = x + 6; w < x + 31; w += 5) night ? raw(w, t + 3, 4, 4, brownout() ? 2 : 1) : rectB(w, t + 3, 4, 4, 0)
      rectB(x + 1, t + 2, 3, 6, 2)                                   // the windscreen at the front (it heads left)
      rectB(x + 1, t + 9, 32, 1, 2)                                  // the stripe
      rectB(x + 5, t + 12, 5, 3, 2); rectB(x + 25, t + 12, 5, 3, 2)   // wheels
    }
    const drawJeep = (x, b) => {
      const t = b - 13
      rectB(x + 3, t, 25, 2, 2)                                      // the long roof
      rectB(x + 4, t + 2, 24, 8, 2); rectB(x + 5, t + 3, 22, 6, 1)
      for (let w = x + 7; w < x + 26; w += 4) night ? raw(w, t + 4, 3, 2, 1) : rectB(w, t + 4, 3, 2, 0)   // open side windows
      rectB(x, t + 6, 5, 4, 2); rectB(x + 1, t + 7, 3, 2, 1)          // the hood out front
      rectB(x + 1, t + 4, 1, 2, 2); rectB(x + 3, t + 3, 1, 3, 2)      // the little horses on the hood
      rectB(x + 5, t + 7, 22, 1, 2)                                  // painted stripe
      rectB(x + 4, t + 10, 4, 3, 2); rectB(x + 21, t + 10, 4, 3, 2)
    }
    const drawRider = (x, b) => {
      rectB(x, b - 3, 3, 3, 2); rectB(x + 11, b - 3, 3, 3, 2)          // wheels
      rectB(x + 2, b - 5, 10, 2, 2)                                  // the bike
      rectB(x + 5, b - 11, 3, 6, 2); rectB(x + 4, b - 14, 4, 3, 2)    // rider and helmet
      rectB(x + 2, b - 9, 3, 1, 2)                                   // arm to the handlebar
      rectB(x + 8, b - 15, 7, 7, 2); rectB(x + 9, b - 14, 5, 5, 1)    // the insulated delivery box on the back
    }
    // ZOMBIE EDSA's lane: wrecks burning where they stopped
    const flames = (x, y, w) => { for (let i = 0; i < w; i += 2) { const h = 1 + Math.floor(hash(i, Math.floor(frame / 4), x | 0) * 5); raw(x + i, y - h, 1, h, h > 3 ? 0 : 1) } }
    const drawWreck = (v, b) => {
      const x = v.x
      if (v.type === 'wcar') { rectB(x + 4, b - 12, 12, 4, 2); rectB(x, b - 8, 22, 6, 2); rectB(x + 1, b - 7, 20, 4, 1); rectB(x + 3, b - 3, 4, 3, 2); rectB(x + 15, b - 3, 4, 3, 2); flames(x + 3, b - 12, 16) }
      else if (v.type === 'wjeep') { rectB(x + 3, b - 11, 25, 8, 2); rectB(x + 4, b - 10, 23, 6, 1); for (let w = x + 7; w < x + 26; w += 4) rectB(w, b - 8, 3, 2, 2); rectB(x + 3, b - 3, 25, 2, 2); rectB(x + 6, b - 14, 4, 3, 2); rectB(x + 20, b - 14, 4, 3, 2); flames(x + 10, b - 11, 8) }   // on its roof
      else if (v.type === 'wbus') { drawBus(x, b); for (let w = x + 6; w < x + 31; w += 10) raw(w, b - 12, 4, 4, 3); flames(x + 2, b - 15, 30) }
      else { rectB(x, b - 9, 28, 2, 2); rectB(x + 2, b - 7, 2, 7, 2); rectB(x + 24, b - 7, 2, 7, 2); rectB(x + 1, b - 19, 26, 9, 2); rectB(x + 2, b - 18, 24, 7, 1); text('TULONG', x + 3, b - 17, 2) }   // a barricade, spray-painted
    }
    const drawCart = (x, b) => {
      rectB(x + 3, b - 22, 10, 2, 2); rectB(x + 1, b - 20, 14, 2, 2)  // umbrella
      rectB(x + 7, b - 18, 1, 7, 2)
      rectB(x, b - 11, 16, 7, 2); rectB(x + 1, b - 10, 14, 5, 1)      // the cart
      rectB(x + 2, b - 12, 6, 1, 2)                                  // the frying pan
      rectB(x + 3, b - 4, 3, 3, 2); rectB(x + 11, b - 4, 3, 3, 2)
      rectB(x + 18, b - 17, 3, 3, 2); rectB(x + 18, b - 14, 3, 10, 2) // the vendor
      for (let s = 0; s < 3; s++) { const sy = b - 14 - ((frame * 0.3 + s * 5) % 14), sx = x + 3 + s * 2 + Math.round(Math.sin((frame + s * 20) * 0.1)); rectB(sx, sy, 2, 1, 2) }   // steam
    }

    const brownout = () => phaseName() === 'brownout' && !(phaseT < 24 && phaseT % 8 < 4)   // it stutters off at first
    // the night sky: stars, and a crescent moon (drawn again over the brownout's darkness, since the moon has no switch)
    const drawSky = () => {
      if (cover > 0.9) return
      stars.forEach(st => { if (st.y < cover * 40) return; const tw = Math.floor((frame + st.ph) / 20) % 7; if (tw) raw(st.x, st.y, 1, 1, tw === 3 ? 0 : 1) })
      const my = 24 - cover * 30                                     // a big blood moon, its craters showing
      ctx.fillStyle = PALETTE[1]; ctx.beginPath(); ctx.arc(130, my, 10, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = PALETTE[0]; ctx.beginPath(); ctx.arc(129, my - 1, 8, 0, Math.PI * 2); ctx.fill()
      raw(126, my - 3, 2, 2, 1); raw(132, my + 1, 3, 2, 1); raw(130, my - 6, 1, 1, 1)
    }
    // everything behind the action: drawn on its own layer and laid down faint (drawScene), so the run itself stands out
    const drawBack = () => {
      const p = phaseName()
      // the sun (or at night the moon and stars), then the rain clouds rolling over it
      if (night) drawSky()
      else if (cover < 0.95) {
        ctx.fillStyle = PALETTE[S(1)]; ctx.beginPath(); ctx.arc(128, 26 - cover * 30, 8, 0, Math.PI * 2); ctx.fill()
        if (cover < 0.3) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + frame * 0.004; rect(128 + Math.cos(a) * 12, 26 + Math.sin(a) * 12, 2, 2, 1) }
      }
      const cloud = (x, y, w, h) => (night ? raw(x, y, w, h, 2) : rect(x, y, w, h, 3))
      if (cover > 0.05) {
        // the storm: a dark band of cloud rolls down over the top of the screen, with a lumpy underside
        const base = Math.round(cover * 26)
        cloud(0, 0, 160, base)
        for (let k = 0; k < 7; k++) {
          const cx = ((k * 31 - frame * 0.12) % 217 + 217) % 217 - 30, w = 26 + (k * 11) % 20
          const d = (k % 3) * 2                                       // each puff hangs a little differently
          cloud(cx, base - 1, w, Math.round((4 + d) * cover))
          cloud(cx + 3, base + Math.round((3 + d) * cover) - 1, w - 6, Math.round(3 * cover))
          cloud(cx + 7, base + Math.round((6 + d) * cover) - 1, w - 14, Math.round(2 * cover))
        }
      }
      // the Makati skyline, far and slow
      const off = (dist * 0.12) % SKY_W, base = 108
      for (const k of [0, 1]) skyline.forEach(b => {
        const x = b.x - off + k * SKY_W; if (x > 160 || x + b.w < 0) return
        if (night) {   // dark towers, their windows lit here and there (a few switch on and off); in a brownout only a candle or two
          const bo = brownout(), slot = Math.floor(frame / 300)
          for (let yy = base - b.h + 3; yy < base - 1; yy += 3) for (let xx = x + 2; xx < x + b.w - 2; xx += 3) {
            const h = hash(b.x, yy, xx + (hash(b.x, yy, xx) < 0.08 ? slot : 0))
            if (bo ? h < 0.03 && (frame + xx) % 30 < 24 : h < 0.38) raw(xx, yy, 1, 1, bo ? 1 : h < 0.12 ? 0 : 1)
          }
          if (hash(b.x, 7, 3) < 0.35) flames(x + 1, base - b.h, b.w - 2)                       // some towers are burning
        } else for (let yy = base - b.h + 1; yy < base; yy += 2) for (let xx = x + 1 + (yy % 4 === 1 ? 1 : 0); xx < x + b.w - 1; xx += 2) rect(xx, yy, 1, 1, 1)   // light, dithered
        rect(x, base - b.h, b.w, 1, 1); rect(x, base - b.h, 1, b.h, 1); rect(x + b.w - 1, base - b.h, 1, b.h, 1)                                       // its outline
        if (b.cap) rect(x + Math.floor(b.w / 2), base - b.h - 4, 1, 4, 1)
      })
      // smoke rising off the city at night
      if (night) for (let k = 0; k < 3; k++) {
        const sx = ((k * 97 + 30 - dist * 0.12) % 240 + 240) % 240 - 30
        for (let i = 0; i < 12; i++) { const yy = 70 - i * 5 - (frame * 0.25) % 5, xx = sx + Math.sin((frame * 0.02) + i * 0.6 + k) * (2 + i * 0.6) + i * 1.5, r = 1 + i * 0.35
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && ((Math.round(xx + dx) + Math.round(yy + dy)) % 2)) raw(xx + dx, yy + dy, 1, 1, 2) }
      }
      // the LRT, with a train now and then
      const loff = (dist * 0.4) % 40
      for (let x = -loff; x < 170; x += 40) rect(x, 84, 5, GROUND - 84, 1)
      rect(0, 80, 160, 4, 1); rect(0, 79, 160, 1, 2)
      if (night) {   // a broken span, and a carriage hanging off it down to the street
        const gx = 300 - ((dist * 0.4) % 520)
        if (gx > -80 && gx < 200) {
          raw(gx, 79, 22, 5, 3)
          for (let i = 0; i < 6; i++) { const cx = gx + 14 + i * 5, cy = 76 + i * 6; rect(cx, cy, 7, 9, 1); rect(cx, cy, 7, 1, 2); if (i % 2) raw(cx + 2, cy + 3, 2, 2, 2) }
        }
      }
      if (train) for (let c = 0; c < 3; c++) { const cx = train.x + c * 28; rect(cx, 69, 26, 10, 1); rect(cx, 69, 26, 1, 2); for (let w = 3; w < 24; w += 5) night ? raw(cx + w, 71, 3, 3, 0) : rect(cx + w, 71, 3, 3, 0) }   // at night the carriages glow
      // electric posts and their spaghetti wires
      const poff = (dist * 0.7) % 100
      const posts = []; for (let x = -poff - 100; x < 270; x += 100) posts.push(x)
      posts.forEach((x, i) => {
        rect(x, 52, 3, GROUND - 52, 1); rect(x - 6, 55, 15, 2, 1); rect(x + 3, 60, 4, 6, 1)
        const nx = posts[i + 1]; if (nx === undefined) return
        for (let w = 0; w < 5; w++) {
          const y0 = 56 + (w % 3), sag = 6 + w * 3 + (w === 4 ? 6 : 0)
          for (let xx = x + 2; xx < nx; xx++) { const t = (xx - x) / (nx - x); if (xx >= 0 && xx < 160) rect(xx, y0 + sag * 4 * t * (1 - t), 1, 1, 1) }
        }
        px(['.111.', '1...1', '1.1.1', '.1.1.', '..1..', '..1..', '.111.', '..1..'], x + 4, 66)   // the tangle by the post
        px(['11..', '1.1.', '.11.', '..1.'], x - 7, 57)
        // at night each post carries a lamp that pools light on the sidewalk; one in four is dodgy and flickers
        if (night && !brownout()) {
          const id = Math.round((x + dist * 0.7) / 100), dodgy = ((id % 4) + 4) % 4 === 1, on = !dodgy || hash(id, Math.floor(frame / 5), 1) > 0.25
          raw(x - 6, 54, 4, 2, on ? 0 : 2)
          if (on) for (let yy = 58; yy < GROUND; yy += 2) { const hw = Math.round((yy - 56) * 0.32); for (let xx = x - 4 - hw + ((yy / 2) % 2); xx <= x - 4 + hw; xx += 2) if (xx >= 0 && xx < 160) raw(xx, yy, 1, 1, 2) }
          if (on) for (let xx = x - 18; xx < x + 10; xx += 2) if (xx >= 0 && xx < 160) raw(xx, GROUND + 1 + ((xx / 2) % 2), 1, 1, 1)
        }
      })
      if (night && flyover) {   // a chopper crossing, its searchlight sweeping the street
        const hx = flyover.x, hy = flyover.y, a = Math.sin(frame * 0.03) * 0.5
        for (let yy = hy + 10; yy < GROUND; yy += 2) { const d = yy - hy - 10, cx = hx + 6 + Math.tan(a) * d, hw = 1 + d * 0.18; for (let xx = cx - hw + ((yy / 2) % 2); xx <= cx + hw; xx += 2) raw(xx, yy, 1, 1, 1) }
        px(HELI.map((r, i) => (i === 0 && frame % 4 < 2 ? r.replace(/3/g, '.') : r)), hx, hy)
        if (frame % 30 < 4) raw(hx + 29, hy + 4, 1, 1, 0)
      }
      if (night) debris.forEach(d => raw(d.x, d.y, (frame + d.ph) % 8 < 4 ? 2 : 1, 1, 1))
      // the traffic, crawling
      if (waterY > 140) lane.forEach(v => {
        const d = { bus: drawBus, jeep: drawJeep, rider: drawRider, cart: drawCart }[v.type]
        if (d) d(v.x, LANE); else drawWreck(v, LANE)
        if (night && d && v.type !== 'cart') {   // headlights throwing a beam ahead (they head left), a red tail light behind
          for (let k = 1; k < 26; k += 2) { const hw = Math.round(k * 0.18); for (let yy = LANE - 5 - hw; yy <= LANE - 5 + hw; yy += 2) if (v.x - k >= 0) raw(v.x - k, yy + (k % 4 === 1 ? 1 : 0), 1, 1, k < 8 ? 0 : 1) }
          raw(v.x, LANE - 5, 1, 2, 0); raw(v.x + v.w - 1, LANE - 6, 1, 2, 1)
        }
      })   // gone under the flood
    }
    // in front, at full strength: the stop signs and the sidewalk
    const drawFront = () => {
      const p = phaseName()
      // the EDSA stop signs: a dark board on two legs, the name in light letters
      signs.forEach(sg => {
        const x = Math.round(sg.x), y = 82, H = 15                   // big letters, so you can read it as it drifts by
        rect(x + 3, y + H, 2, GROUND - y - H, 3); rect(x + sg.w - 5, y + H, 2, GROUND - y - H, 3)
        rect(x, y, sg.w, H, 3); rect(x + 1, y + 1, sg.w - 2, H - 2, 2); rect(x + 1, y + 1, sg.w - 2, 1, 3)
        text(sg.name, x + 4, y + 3, 0, 2)
        if (sg.last) { for (let k = 0; k < 4; k++) rect(x + sg.w + 2 + k * 2, y - 2 + (k % 2) * 2, 2, 2, 3) }   // a little chequered flag at the finish
      })
      // the sidewalk; heat shimmer over it on hot days
      rect(0, GROUND, 160, 1, 3)
      for (let x = -(dist % 12); x < 160; x += 12) rect(x, GROUND + 4, 5, 1, 2)
      for (let x = -((dist * 0.5) % 22); x < 160; x += 22) rect(x + 7, GROUND + 10, 2, 1, 2)
      if (p === 'sun' && cover < 0.2) for (let x = 0; x < 160; x += 11) rect(x + Math.round(Math.sin(frame * 0.12 + x) * 1.5), GROUND - 3 - (x % 2), 4, 1, 1)
    }

    const drawWater = () => {
      if (waterY >= 144) return
      const top = Math.round(waterY)
      for (let y = top + 2; y < 144; y += 2) for (let x = (y / 2 + Math.floor(frame / 10)) % 3; x < 160; x += 3) rect(x, y, 1, 1, 1)   // murky but see-through: a light dither
      for (let x = 0; x < 160; x++) { const w = Math.round(Math.sin((x + frame * 0.8) * 0.2) * 1.5); rect(x, top + w, 1, 2, 3); if (w <= -1 && x % 6 < 2) rect(x, top + w - 1, 1, 1, 3) }   // the surface: a dark rolling wave with little crests
      for (let x = (frame * 0.5) % 20; x < 160; x += 20) rect(x, top + 2, 4, 1, 0)                                   // glints
    }

    // the airdrop, the bodies and bits, explosions, and the shot itself (a flash at the muzzle and a tracer to the target)
    const drawNightFx = () => {
      if (airdrop) { if (!airdrop.landed) px(CHUTE, airdrop.x - 3, airdrop.y - 9); px(CRATE, airdrop.x, airdrop.y); if (airdrop.landed && frame % 20 < 10) raw(airdrop.x + 3, airdrop.y - 3, 2, 2, 0) }
      gore.forEach(b => { if (!(b.rest > BODY_REST && frame % 6 < 3)) px(b.rows, b.x, b.y) })   // blinking out, the old way games cleared bodies
      bits.forEach(q => rect(q.x, q.y, q.w, 1, q.s))
      booms.forEach(e => {
        if (e.t < 0) return
        const r = Math.min(e.R, 3 + e.t * 2), cx = Math.round(e.x), cy = Math.round(e.y)
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const d2 = dx * dx + dy * dy; if (d2 > r * r) continue
          if (e.t < 7) raw(cx + dx, cy + dy, 1, 1, d2 < r * r * 0.4 ? 0 : 1)
          else if (e.t < 16) { if (d2 > r * r * 0.6 && (dx + dy + e.t) % 2) raw(cx + dx, cy + dy, 1, 1, 1) }
          else if ((dx * 3 + dy * 5 + e.t) % 4 === 0) raw(cx + dx, cy + dy - (e.t - 16), 1, 1, 2)
        }
      })
      if (swipe) { const r = 9, cx = Math.round(kidX) + 9, cy = GROUND - 8 - Math.round(kidY); for (let a = -1.4; a < 1.2; a += 0.12) if (Math.abs(a - (swipe / 8) * 2.4 + 1.2) < 0.9) raw(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, 0) }
      smoke.forEach(q => raw(q.x, q.y, q.s, q.s, q.life > 20 ? 1 : 2))
      if (shot && tier > 0 && !swimming()) {
        const gn = WEAPONS[tier].gun, rc = Math.round(recoil)
        const tx = tier === 7 ? Math.round(kidX) + 22 - rc : Math.round(kidX) + gn.dx + gn.rows[0].length, ty = tier === 7 ? GROUND - 9 : GROUND - 14 - Math.round(kidY) + gn.dy + (shot.low ? 2 : 0)
        if (!shot.o.dead) shot.x = shot.o.x                              // it follows its target until it lands
        const sx = shot.x, sy = shot.y, age = shot.T - shot.t, run = (sx - tx) * age / Math.max(1, shot.fly), hx = tx + run
        const lineY = x => ty + (sy - ty) * (x - tx) / Math.max(1, sx - tx)
        const f = [0, 1, 2, 2, 2, 4, 3, 5][tier] - age                  // the muzzle flash, bigger for the heavy guns
        if (f > 0) { raw(tx, ty - f, 1, f * 2 + 1, 0); raw(tx - f + 1, ty, f * 2 + 1, 1, 0) }
        if (tier === 1) { if (hx < sx) raw(hx - 4, lineY(hx), 5, 1, 0) }   // pistola: one bullet, no trail
        else if (tier === 2) {   // the shotgun: a burst of pellets fanning out, flying out from the muzzle
          const reach = Math.min(sx - tx, run), slope = (sy - ty) / Math.max(1, sx - tx)
          for (let p = 0; p < 7; p++) { const sp = (p - 3) * 0.075 + Math.sin(p * 7.1) * 0.02; for (let x = tx + 3 + (p % 3); x < tx + reach; x += 4) raw(x, ty + (slope + sp) * (x - tx), 1, 1, x > tx + reach - 6 ? 0 : 1) }
        } else if (tier === 3) {   // armalayt: a burst of 4 to 6 long rounds, one after another in a straight line
          for (let k = 0; k < shot.n + 2; k++) { const x = hx - k * 10; if (x > tx + 2 && x <= sx) raw(x - 6, lineY(x), 7, 1, 0) }
        } else if (tier === 4) {   // machine gun: 3 or 4 straight streams side by side, all at once, flickering
          const m = shot.n > 2 ? 4 : 3, end = Math.min(hx, sx)
          if (age < shot.fly + 3) for (let st = 0; st < m; st++) for (let x = tx + 3 + st; x < end; x += 4) if ((Math.floor(x / 4) + frame + st) % 3) raw(x, lineY(x) + (st - (m - 1) / 2) * 2, 3, 1, x > end - 8 ? 0 : 1)
        } else if (tier === 5) {   // kalibre .50: one thick trail, there almost at once, fading
          if (age < shot.fly + 4) { const shade = age < 2 ? 0 : age < 4 ? 1 : 2; for (let x = tx + 2; x < Math.min(hx, sx); x++) raw(x, lineY(x) - 1, 1, 2, shade) }
        } else if (tier === 6) {   // bazooka: a big rocket with a nose and fins, and thick smoke behind it
          if (hx < sx) { const rx = Math.round(hx), ry = Math.round(lineY(hx)); raw(rx - 7, ry - 1, 8, 3, 0); raw(rx + 1, ry - 1, 1, 3, 0); raw(rx + 2, ry, 1, 1, 0); raw(rx - 4, ry - 1, 1, 3, 2); raw(rx - 8, ry - 2, 2, 1, 1); raw(rx - 8, ry + 2, 2, 1, 1); for (let k = 1; k < 7 && rx - 9 - k * 4 > tx; k++) raw(rx - 10 - k * 4, ry - 1 + (k % 2), 3, 3, k < 3 ? 1 : 2) }
        } else if (tier === 7) {   // tangke: a big shell, fast
          if (hx < sx) { const rx = Math.round(hx), ry = Math.round(lineY(hx)); ['.333333.', '33333333', '33333333', '.333333.'].forEach((r, j) => [...r].forEach((c, i) => { if (c === '3') raw(rx - 7 + i, ry - 2 + j, 1, 1, j === 3 ? 1 : 0) })); for (let k = 1; k < 4; k++) raw(rx - 8 - k * 5, ry - 1, 4, 2, 1) }   // bright, with a streak behind it
        }
      }
    }
    // caught: the screen goes to pieces
    const gnarly = () => {
      const t = 150 - over
      if (t === 1) splats = Array.from({ length: 9 }, () => ({ x: Math.random() * 160, y: Math.random() * 70, r: 3 + Math.random() * 9, drip: 0.1 + Math.random() * 0.4, len: 0 }))
      for (let i = 0; i < 7; i++) { const y = Math.floor(Math.random() * 144), h = 1 + Math.floor(Math.random() * 6), dx = Math.round((Math.random() - 0.5) * 26); ctx.drawImage(buf, 0, y, 160, h, dx, y, 160, h) }
      for (let i = 0; i < 260; i++) raw(Math.random() * 160, Math.random() * 144, 1, 1, Math.random() < 0.5 ? 0 : 3)
      splats.forEach(sp => { sp.len += sp.drip; ctx.fillStyle = PALETTE[1]; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill(); raw(sp.x - 1, sp.y, 2, sp.r + sp.len * 8, 1); raw(sp.x + sp.r * 0.5, sp.y, 1, sp.r * 0.5 + sp.len * 5, 1) })
      if (t % 12 < 3) { ctx.globalAlpha = 0.6; raw(0, 0, 160, 144, t % 24 < 12 ? 0 : 3); ctx.globalAlpha = 1 }
      if (t > 20) { raw(21, 47, 118, 36, 0); raw(23, 49, 114, 32, 3); const was = inv; inv = false; centred('PATAY KA!', 80, 53, 0, 2); centred('YOU ARE DEAD', 80, 71, 1); inv = was }
      shake = 3
    }
    const drawScene = () => {
      clear()
      const main = ctx; ctx = bctx; bctx.clearRect(0, 0, 160, 144); drawBack(); ctx = main
      ctx.globalAlpha = night ? 0.42 : 0.5; ctx.drawImage(back, 0, 0); ctx.globalAlpha = 1
      drawFront()
      obs.forEach(o => { if (!KINDS[o.type].dive) KINDS[o.type].draw(o, o.x) })
      drawWater()
      obs.forEach(o => { if (KINDS[o.type].dive) KINDS[o.type].draw(o, o.x) })
      if (!swimming()) drawCrowd()
      if (night) drawNightFx()
      const armed = night && !swimming() && !(celT && boarded)
      if (swimming()) px(SWIM[Math.floor(frame / 8) % 4], kidX - 3, waterY + swimY - 3)
      else if (night && boarded) { /* in the chopper */ }
      else if (night && tier === 7 && !celT) { const rc = Math.round(recoil); px(TANK[Math.floor(frame / 5) % 2], Math.round(kidX) - 6 - rc, GROUND - 11); px(TOP.slice(0, 4), Math.round(kidX) + 3 - rc, GROUND - 15) }   // riding the tangke (rocked back when it fires)
      else if (celT && !night) px(kidY > 0 ? CHEER : JUMP, Math.round(kidX), GROUND - 14 - Math.round(kidY))   // celebrating: arms up in the air, arms out on landing
      else {
        const sprite = kidY > 0 ? JUMP : JOG[Math.floor(frame / 7) % 4], b = kidY === 0 && Math.floor(frame / 7) % 2 ? 1 : 0
        px(sprite, Math.round(kidX), GROUND - 14 - Math.round(kidY) + b)
        if (armed && tier < 7) { const gn = WEAPONS[tier].gun, low = shot && shot.low ? 2 : 0; px(low && tier ? gn.rows.map((r, i) => '.'.repeat(Math.min(i, 2)) + r) : gn.rows, Math.round(kidX) + gn.dx, GROUND - 14 - Math.round(kidY) + b + gn.dy + low) }
      }
      if (night && heli) {   // the rescue chopper
        px(HELI.map((r, i) => (i === 0 && frame % 4 < 2 ? r.replace(/3/g, '.') : r)), Math.round(heli.x), Math.round(heli.y))
        if (frame % 20 < 6) raw(Math.round(heli.x) + 29, Math.round(heli.y) + 4, 1, 1, 0)
      }
      // rain over everything while it's wet
      if (!DRY_P.includes(phaseName()) && phaseName() !== 'drain' || (phaseName() === 'drain' && phaseT < 60)) rain.forEach(r => { rect(r.x, r.y, 1, 1, 2); rect(r.x + 1, r.y - 1, 1, 1, 2); rect(r.x + 2, r.y - 2, 1, 1, 2) })
      // at night his headband carries a lamp
      const headY = swimming() ? waterY + swimY - 2 : GROUND - 13 - Math.round(kidY)
      if (night && !celT) raw(Math.round(kidX) + (swimming() ? 13 : 8), headY + 1, 1, 1, 0)
      // the brownout: everything goes dark but a small glow round him and the cone of his headlamp, ahead, where things come from
      if (night && brownout()) {
        const cx = Math.round(kidX) + 5, cy = headY + 6, R = 15, x0 = Math.round(kidX) + 9, L = 88
        for (let y = 0; y < 144; y++) {
          const spans = []
          const dy = y - cy; if (Math.abs(dy) < R) { const dx = Math.round(Math.sqrt(R * R - dy * dy)); spans.push([cx - dx, cx + dx]) }
          const dmin = y >= headY - 2 ? (y - headY - 2) / 0.42 : (headY - 2 - y) / 0.16
          if (dmin <= L) spans.push([x0 + Math.round(dmin), x0 + L])
          spans.sort((a, b) => a[0] - b[0])
          let at = 0
          for (const [a, b] of spans) { if (a > at) raw(at, y, a - at, 1, 3); for (let e = a; e < a + 3 && e <= b; e++) if ((e + y) % 2) raw(e, y, 1, 1, 3); for (let e = b - 2; e <= b; e++) if (e >= a && (e + y) % 2) raw(e, y, 1, 1, 3); at = Math.max(at, b + 1) }
          if (at < 160) raw(at, y, 160 - at, 1, 3)
        }
        ctx.globalAlpha = 0.45; drawSky(); ctx.globalAlpha = 1
      }
      // the "A" over him while a move is waiting for you
      if (manual && target && !target.ok && Math.floor(frame / 6) % 2) {
        const bx = KX + 2, by = swimming() ? waterY + swimY - 13 : GROUND - 26 - Math.round(kidY)
        rect(bx - 1, by - 1, 9, 9, 3); rect(bx, by, 7, 7, 0); text('A', bx + 2, by + 1, 3)
      }
      const km = (m) => (m / 1000).toFixed(2)
      const dark = cover > 0.5                                     // under the storm clouds the writing turns light
      if (!dark && cover < 0.05) rect(0, 0, 160, 14, 0)
      text(km(metres) + ' KM', 160 - (km(metres).length + 3) * 4 - 4, 6, dark ? 0 : 3)
      text('HI ' + km(hi), 6, 6, dark ? 0 : 2)
      if (lastStop) { const w = lastStop.length * 4; text(lastStop, 80 - w / 2, 16, dark ? 0 : 2) }
      if (banner && Math.floor(banner.f / 8) % 2) { const w = banner.t.length * 8; rect(80 - w / 2 - 3, 30, w + 5, 14, 3); rect(80 - w / 2 - 2, 31, w + 3, 12, 0); text(banner.t, 80 - w / 2, 33, 3, 2) }
      if (night && !swimming() && !celT) text(WEAPONS[tier].name, 4, 134, 2)          // the weapon in hand
      if (over) { if (!night && Math.floor(over / 15) % 2) text('GAME OVER', 62, 50) }
      else if (!manual && !banner && Math.floor(frame / 30) % 2) night ? centred('PINDOT A', 80, 50, 3) : text('PRESS A', 66, 50, 3)
      // the finish party: confetti, the camera flashes lighting up the screen, then the circle closing on him
      hearts.forEach(h => { if (h.t < 55 || h.t % 4 < 2) px(HEART, h.x, h.y) })   // they blink out at the end
      confetti.forEach(c => rect(c.x, c.y, Math.floor(frame / 6 + c.x) % 2 ? 2 : 1, 1, c.s))
      fireworks.forEach(f => {   // a burst: sparks flying out, then drooping and fading
        if (f.t < 6) { raw(f.x, f.y + (6 - f.t) * 3, 1, 2, 0); return }
        const t = f.t - 6, r = t * 0.9
        for (let k = 0; k < f.n; k++) { const a = f.ph + k * Math.PI * 2 / f.n, x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r + t * t * 0.012; if (t < 26 || (t + k) % 3) raw(x, y, 1, 1, t < 14 ? 0 : t < 24 ? 1 : 2) }
      })
      if (flashT) { ctx.globalAlpha = 0.45; raw(0, 0, 160, 144, 0); ctx.globalAlpha = 1 }
      if (celT > IRIS_AT) { const e = Math.min(1, (celT - IRIS_AT) / IRIS_LEN); night && heli ? iris(heli.x + 12, heli.y + 5, 130 * (1 - e * e)) : iris(kidX + 5, GROUND - 8 - kidY, 130 * (1 - e * e)) }
      if (night && over) gnarly()
    }

    // ── the prizes: a carousel, one slide at a time (each slides in from the right). A press skips ahead ──
    // the set in play (the day's prizes, or ZOMBIE EDSA's survival kit): names, how long each holds, which are bonuses, the header
    let PRIZES = ['PANALO SIGNAGE', 'MICROMATIC PAYONG', 'GINTONG KIKIAM']
    let HOLD = [270, 330, 330]                                    // frames each prize stays before the next slides in
    let BONUS = [], HEADER = 'MGA PREMYO'
    let prize = 0, prizePos = -1, prizeT = 0, prizeIn = 0
    const startPrize = () => { const kit = night ? NIGHT_KIT : DAY_KIT; PRIZES = kit.names; HOLD = kit.hold; SLIDES = kit.slides; BONUS = kit.bonus; HEADER = kit.header; mode = 'prize'; prize = 0; prizePos = -1; prizeT = 0; prizeIn = 0; banner = null; confetti = []; flashT = 0 }
    const nextPrize = () => { if (prize < PRIZES.length) { prize++; prizeT = 0 } }
    const pressPrize = () => {
      if (prize < PRIZES.length) { if (prizeT > 30) nextPrize() }
      else if (prizeT > 40) { mode = 'play'; manual = false; reset() }   // a fresh run from Monumento
    }
    const updatePrize = () => {
      prizeT++; prizeIn++
      prizePos += (prize - prizePos) * 0.1; if (Math.abs(prize - prizePos) < 0.01) prizePos = prize
      if (prize < PRIZES.length && prizeT > HOLD[prize]) nextPrize()
    }
    const centred = (s, cx, y, shade, sc = 1) => text(s, Math.round(cx - ((s.length * 4 - 1) * sc) / 2), y, shade, sc)
    const inSlide = y => y > 16 && y < 112                        // keep each slide's drawing off the header and the caption

    // 1. the PANALO windshield sign (like the jeepney route signs): a white board hung on two suction cups, big bouncy
    //    italic letters with a thick dark outline over a yellow blob, and a heavy block word under it.
    //    The letters go up one by one, like the sign painter doing it.
    const SIGN_SIZE = [1.25, 1, 1.1, 0.95, 1.05, 1.25], SIGN_DROP = [0, 2, 0, 3, 1, 0]   // each letter a bit taller or lower, so it bounces
    const signMask = new Uint8Array(160 * 144)
    const drawSign = (cx, lt) => {
      cx = Math.round(cx); const w = 136, h = 74, x0 = cx - w / 2, y0 = 28
      // the suction cups on the glass, and the hooks the board hangs from
      for (const hx of [x0 + 30, x0 + w - 30]) {
        rect(hx - 2, y0 - 10, 5, 1, 2); rect(hx - 4, y0 - 9, 9, 1, 2); rect(hx - 5, y0 - 8, 11, 2, 2)
        rect(hx - 3, y0 - 9, 7, 1, 1); rect(hx - 4, y0 - 8, 9, 1, 1)
        rect(hx, y0 - 6, 1, 9, 3); rect(hx - 1, y0 + 2, 3, 1, 3)
      }
      // the board: white with rounded corners and a dark edge
      rect(x0 + 1, y0, w - 2, h, 3); rect(x0, y0 + 1, w, h - 2, 3)
      rect(x0 + 2, y0 + 1, w - 4, h - 2, 0); rect(x0 + 1, y0 + 2, w - 2, h - 4, 0)
      // the yellow blob behind the word
      const ex = cx + 4, ey = y0 + 30
      for (let dy = -19; dy <= 19; dy++) { const hw = Math.round(54 * Math.sqrt(1 - (dy / 20) ** 2)); rect(ex - hw + Math.round(dy * 0.3), ey + dy, hw * 2 + 1, 1, 1) }
      // PANALO: blocky letters from the font, five times bigger, leaned forward, each its own size, then outlined
      const n = Math.min(6, Math.floor(lt / 8)), base = y0 + 46, left = cx - 56
      signMask.fill(0)
      for (let k = 0; k < n; k++) {
        const bits = FONT['PANALO'[k]], ch = Math.round(5 * SIGN_SIZE[k]), bottom = base + SIGN_DROP[k], top = bottom - 5 * ch, lx = left + k * 18
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
          if (bits[r * 3 + c] !== '1') continue
          for (let y = top + r * ch; y < top + (r + 1) * ch; y++) for (let x = lx + c * 5; x < lx + (c + 1) * 5; x++) {
            const X = x + Math.round((base - y) * 0.22)
            if (X >= 0 && X < 160 && y >= 0 && y < 144) signMask[y * 160 + X] = 1
          }
        }
      }
      const on = (x, y) => x >= 0 && x < 160 && y >= 0 && y < 144 && signMask[y * 160 + x] === 1
      for (let y = y0 + 3; y < base + 8; y++) for (let x = Math.max(0, x0 + 2); x < Math.min(160, x0 + w - 2); x++) {
        if (on(x, y)) { rect(x, y, 1, 1, 2); continue }                                        // the letter
        if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || on(x - 2, y - 2)) rect(x, y, 1, 1, 3)   // its outline and a shadow down-right
      }
      // the heavy block word under it
      if (n === 6 && lt > 56) { const s = 'EDSA', sx = cx - 22 + 6; text(s, sx, base + 5, 3, 3); text(s, sx + 1, base + 5, 3, 3) }
    }

    // 2. the Micromatic payong: a big umbrella, furled shut at first; it shivers, then pops open (with an overshoot) and the rain bounces off it
    const easeBack = t => { t = Math.min(1, Math.max(0, t)); const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2 }
    const drops = Array.from({ length: 22 }, () => ({ dx: Math.random() * 120 - 60, y: 18 + Math.random() * 90 }))
    const HOOK = ['....3.', '....3.', '33..3.', '33..3.', '.3333.']
    const drawUmbrella = (cx, lt) => {
      const OPEN_AT = 60, o = lt < OPEN_AT ? 0 : easeBack((lt - OPEN_AT) / 22), oc = Math.min(1, o)
      if (lt > 32 && lt < OPEN_AT) cx += Math.floor(lt / 3) % 2 ? 1 : -1      // the shiver before it pops
      cx = Math.round(cx)
      const W = 3 + 47 * o, H = Math.round(42 - 20 * oc), top = 32, N = 8
      rect(cx, top - 4, 1, 4, 3)                                               // the tip
      for (let r = 0; r < H; r++) {
        const u = (r + 1) / H
        const dome = Math.sqrt(1 - (1 - u) ** 2), spindle = Math.sin(Math.PI * (0.08 + 0.86 * u)) ** 0.6
        const hw = Math.round(W * (spindle * (1 - oc) + dome * oc))
        for (let dx = -hw; dx <= hw; dx++) {
          const uu = hw ? dx / hw : 0, f = (uu + 1) / 2 * N, p = Math.min(N - 1, Math.floor(f))
          if (r > H - 1 - Math.round(2.5 * Math.sin(Math.PI * (f - p)) * oc)) continue   // the scalloped hem between the ribs
          rect(cx + dx, top + r, 1, 1, Math.abs(dx) === hw ? 3 : p % 2 ? 3 : 2)
        }
      }
      if (oc < 0.3) rect(cx - 2, top + 24, 5, 2, 0)                            // the strap round it while it's shut
      rect(cx, top + H, 1, 104 - top - H, 3); px(HOOK, cx - 4, 104)            // the long shaft and the J handle
      if (lt >= OPEN_AT + 4 && lt < OPEN_AT + 40) text('POP!', cx + 34, top - 2, 3)
      // the rain: straight through while it's shut, bouncing off once it's open
      drops.forEach(d => {
        d.y += 2.2
        const x = Math.round(cx + d.dx)
        const over = oc > 0.8 && Math.abs(d.dx) < W - 1
        const surface = over ? top + H * (1 - Math.sqrt(Math.max(0, 1 - (d.dx / W) ** 2))) : 112
        if (d.y >= surface) {
          if (over) { rect(x - 1, surface - 2, 1, 1, 2); rect(x + 1, surface - 2, 1, 1, 2) }
          d.y = 18 + Math.random() * 6; d.dx = Math.random() * 120 - 60
        } else if (inSlide(d.y)) rect(x, d.y, 1, 2, 2)
      })
    }

    // 3. the golden kikiam: three pieces on a bamboo stick, glowing on a dark disc with a slow sunburst behind, a shine
    //    sweeping across and sparkles twinkling round it
    const piece = (x, y, w, h, skew, seed, lt) => {
      for (let j = 0; j < h; j++) {
        const e = Math.abs(j - (h - 1) / 2) / (h / 2)
        const hw = Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - e ** 4))) - ((j * 7 + seed) % 4 === 0 ? 1 : 0)   // a bit lumpy
        const sx = Math.round(skew * (j - h / 2) / h * 4)
        for (let i = -hw; i <= hw; i++) {
          const X = x + i + sx, Y = y + j
          let s = 1
          if (i === -hw || i === hw || j === 0 || j === h - 1) s = 2                       // its edge
          else if ((i * 3 + j * 5 + seed) % 11 === 0) s = 2                                 // the crinkly fried skin
          else if (j === 2 && i > -hw + 3 && i < -2) s = 0                                  // a highlight along the top
          if (s === 1 && ((X - Y * 0.6 + lt * 1.6) % 80 + 80) % 80 < 4) s = 0                // the shine sweeping across
          rect(X, Y, 1, 1, s)
        }
      }
    }
    const spark = (x, y, big) => { const r = big ? 2 : 1; rect(x - r, y, r * 2 + 1, 1, 0); rect(x, y - r, 1, r * 2 + 1, 0); if (big) rect(x, y, 1, 1, 1) }
    const drawKikiam = (cx, lt) => {
      cx = Math.round(cx); const cy = 68, bob = Math.round(Math.sin(lt * 0.06) * 1.5)
      for (let k = 0; k < 16; k++) {                                          // the sunburst
        const a = k * Math.PI / 8 + lt * 0.008
        for (let rr = 38; rr < 70; rr += 2) { const y = cy + Math.sin(a) * rr; if (inSlide(y)) rect(cx + Math.cos(a) * rr, y, 1, 1, 1) }
      }
      for (let dy = -34; dy <= 34; dy++) { const hw = Math.round(Math.sqrt(34 * 34 - dy * dy)); rect(cx - hw, cy + dy, hw * 2 + 1, 1, 3) }   // the dark disc
      rect(cx, 38 + bob, 1, 2, 2); rect(cx - 1, 40 + bob, 2, 70, 2)          // the bamboo stick (pointed at the top)
      piece(cx, 44 + bob, 30, 12, 1, 3, lt); piece(cx, 60 + bob, 28, 12, -1, 7, lt); piece(cx, 76 + bob, 30, 12, 1, 11, lt)
      ;[[-26, -24, 0], [25, -16, 13], [-23, 18, 26], [27, 22, 7]].forEach(([dx, dy, ph]) => {   // the sparkles
        const t = (lt + ph) % 40
        if (t < 30) spark(cx + dx, cy + dy, t > 8 && t < 22)
      })
    }

    // 4. the summary
    const drawWin = (cx, lt) => {
      centred('PANALO KA!', cx, 34, 3, 2)
      centred('21.09 KM', cx, 56, 3, 3)
      centred('MONUMENTO - TAFT AVE.', cx, 80, 2)
      centred('HI ' + (hi / 1000).toFixed(2), cx, 90, 2)
      if (lt > 40 && Math.floor(lt / 30) % 2) centred('PRESS A', cx, 112, 3)
    }

    // ── ZOMBIE EDSA's survival kit ──
    // 1. the cutter: the blade clicks out a notch at a time, the slider following, then a glint runs along it
    const drawCutter = (cx, lt) => {
      cx = Math.round(cx); const y = 62, x0 = cx - 44, n = Math.min(5, Math.floor(lt / 16))
      rect(x0, y, 52, 13, 3); rect(x0 + 1, y + 1, 50, 11, 1)                                  // the handle
      for (let k = 0; k < 8; k++) rect(x0 + 4 + k * 5, y + 8, 3, 3, 2)                         // its grip
      rect(x0 + 10 + n * 5, y - 3, 7, 4, 3); rect(x0 + 11 + n * 5, y - 2, 5, 2, 2)             // the slider
      for (let k = 0; k < n; k++) {                                                            // the snap-off blade, segment by segment
        const bx = x0 + 52 + k * 7
        rect(bx, y + 3, 7, 7, 3); rect(bx, y + 4, 7, 5, k === n - 1 && lt > 90 && Math.floor(lt / 6) % 2 ? 0 : 1)
        for (let j = 0; j < 5; j++) rect(bx + 5 - j, y + 4 + j, 1, 1, 3)                       // the score line between segments
      }
      if (n) { const tx = x0 + 52 + n * 7; for (let j = 0; j < 7; j++) rect(tx + j, y + 3 + j, 1, 7 - j, 3) }   // the slanted tip
      if (lt > 16 && n < 5 && lt % 16 < 8) text('KLIK', x0 + 52 + n * 7, y - 12, 2)
    }
    // 2. the battery radio: the antenna slides out, the dial sweeps through the static, and a message scrolls under it
    const MARQUEE = '... MAY NAKALIGTAS SA TAFT ... PUMUNTA KAYO DOON ... BZZT ... '
    const drawRadio = (cx, lt) => {
      cx = Math.round(cx); const x0 = cx - 36, y0 = 48, w = 72, h = 40
      const al = Math.min(32, lt * 0.5)
      for (let k = 0; k < al; k++) rect(x0 + w - 8 + Math.round(k * 0.45), y0 - 1 - k, k < 12 ? 2 : 1, 1, 3)
      if (al >= 32) rect(x0 + w - 8 + 13, y0 - 34, 3, 2, 3)
      rect(x0 + 12, y0 - 6, 28, 2, 3); rect(x0 + 12, y0 - 6, 2, 6, 3); rect(x0 + 38, y0 - 6, 2, 6, 3)   // the handle
      rect(x0, y0, w, h, 3); rect(x0 + 1, y0 + 1, w - 2, h - 2, 1)
      for (let gy = y0 + 6; gy < y0 + h - 5; gy += 3) for (let gx = x0 + 5; gx < x0 + 32; gx += 3) rect(gx, gy, 1, 1, 3)   // the speaker
      rect(x0 + 36, y0 + 6, 32, 12, 3); rect(x0 + 37, y0 + 7, 30, 10, 0)                       // the dial
      for (let k = 0; k < 8; k++) rect(x0 + 39 + k * 4, y0 + 8, 1, k % 2 ? 2 : 3, 2)
      rect(x0 + 39 + Math.round((Math.sin(lt * 0.05) * 0.5 + 0.5) * 26), y0 + 7, 1, 10, 3)
      for (const kx of [x0 + 44, x0 + 58]) { rect(kx - 3, y0 + 24, 7, 7, 3); rect(kx - 2, y0 + 25, 5, 5, 2); rect(kx, y0 + 25 + (Math.floor(lt / 20) % 2), 1, 2, 0) }
      for (let k = 0; k < 6; k++) if (Math.random() < 0.5) rect(x0 - 4 - Math.random() * 10, y0 + 8 + Math.random() * 24, 1, 1, 2)   // static crackling out
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 64, 94, 128, 9); ctx.clip()
      rect(cx - 64, 94, 128, 9, 3); text(MARQUEE + MARQUEE, cx - 62 - (Math.floor(lt * 0.7) % (MARQUEE.length * 4)), 96, 0)
      ctx.restore()
    }
    // 3. BONUS: the bakuna, a vial glowing, bubbles rising through the serum
    const drawBakuna = (cx, lt) => {
      cx = Math.round(cx); const cy = 66
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + lt * 0.01; for (let rr = 28; rr < 52; rr += 3) { const y = cy + Math.sin(a) * rr; if (inSlide(y)) rect(cx + Math.cos(a) * rr, y, 1, 1, 1) } }
      rect(cx - 6, 32, 13, 6, 3); rect(cx - 5, 33, 11, 4, 2); rect(cx - 4, 38, 9, 5, 3)
      rect(cx - 10, 43, 21, 48, 3); rect(cx - 9, 44, 19, 46, 0)
      const lvl = 52 + Math.round(Math.sin(lt * 0.08))
      rect(cx - 9, lvl, 19, 90 - lvl, 1)
      for (let k = 0; k < 4; k++) rect(cx - 6 + k * 4, 88 - ((lt * 0.5 + k * 9) % (88 - lvl)), 2, 2, 0)
      rect(cx - 9, 67, 19, 9, 3); text('Z-0', cx - 6, 69, 0)
      rect(cx - 7, 46, 1, 40, 0)
    }
    // 4. BONUS: lolo's itak, retired to the wall on two nails, a gleam running along it, a cobweb in the corner
    const drawItakNiLolo = (cx, lt) => {
      cx = Math.round(cx)
      for (let y = 22; y < 108; y += 9) { rect(cx - 64, y, 128, 1, 1); for (let x = cx - 64 + ((y / 9) % 2) * 20; x < cx + 64; x += 40) rect(x, y, 1, 9, 1) }
      const bladeY = i => 50 + Math.round(i * 0.18 - Math.sin(i / 70 * Math.PI) * 5)
      for (let i = 0; i < 70; i++) { const h = i < 6 ? 2 + i : i > 62 ? Math.max(2, 70 - i) : 8; rect(cx - 44 + i, bladeY(i), 1, h, 1); rect(cx - 44 + i, bladeY(i), 1, 1, 3); rect(cx - 44 + i, bladeY(i) + h, 1, 1, 3) }
      for (let i = 0; i < 24; i++) rect(cx + 26 + i, 62 + Math.round(i * 0.15), 1, 6, i % 8 < 2 ? 3 : 2)   // the wooden handle and its bands
      rect(cx - 30, 52, 3, 3, 3); rect(cx + 20, 59, 3, 3, 3)                                  // the nails
      const g = (lt * 1.5) % 130 - 30; if (g >= 0 && g < 66) rect(cx - 44 + g, bladeY(g) + 2, 3, 5, 0)
      for (let k = 0; k < 10; k++) { rect(cx + 63 - k * 2, 23 + k, 1, 1, 2); rect(cx + 63 - k, 23 + k * 2, 1, 1, 2) }
      rect(cx - 22, 84, 44, 11, 3); rect(cx - 21, 85, 42, 9, 2); centred('LOLO', cx, 87, 0)
    }
    // 5. the brain bait: a brain on a fishing line, swinging, dripping, and the dead reaching up for it.
    // The brain is pixel art (32 x 28): white on top, light then darker pink down the folds, the cerebellum darkest; '.' is clear
    const BRAIN = [
      '............3333333.............',
      '.........3330020020333..........',
      '.......33000001001002033........',
      '......3000011100010010003.......',
      '....3301100000001000100003......',
      '...300000101100100010110003.....',
      '..30111010000010001000010203....',
      '.3011222000202001200000021103...',
      '.31120001121020111011221011103..',
      '3112011112110201210211121012113.',
      '31121211121110112110211122112113',
      '31121122112112112111211111211213',
      '32112111112111221222112111121213',
      '32221222111222111111122221121123',
      '32222111212222211222222222122223',
      '32222222122222222222222222222213',
      '.322222222222222222222222211113.',
      '.31222222222222222222222233333..',
      '..3111222122221222222113322223..',
      '...333322211112221111332233333..',
      '.......31222222222223323322223..',
      '........3112222122232232223333..',
      '.........33113332223232233223...',
      '...........33...3322322322233...',
      '..................3223322333....',
      '...................32232333.....',
      '....................3223........',
      '.....................333........'
    ]
    const drawBrainBait = (cx, lt) => {
      cx = Math.round(cx)
      for (let k = 0; k < 40; k++) rect(cx - 60 + k * 1.5, 18 + k * 0.45, 2, 1, 3)              // the rod
      const sway = Math.round(Math.sin(lt * 0.07) * 5), by = 50 + Math.round(Math.abs(Math.sin(lt * 0.1)) * 3), bx = cx + sway
      for (let y = 36; y < by; y++) rect(cx + Math.round(sway * (y - 36) / (by - 36)), y, 1, 1, 3)   // the line
      BRAIN.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') rect(bx - 16 + i, by + j, 1, 1, +c) }))   // hooked at the top of the brain
      if (lt % 50 < 30) rect(bx + 5, by + 28 + (lt % 50) / 4, 1, 2, 2)                        // a drip off the brain stem
      for (let k = 0; k < 3; k++) {                                                            // hands reaching up, grasping
        const hx = cx - 40 + k * 36, reach = Math.round(10 + Math.sin(lt * 0.08 + k * 2) * 8), top = 100 - reach
        rect(hx, top + 8, 5, 112 - top - 8, 3); rect(hx - 2, top + 3, 9, 6, 3)
        for (let f = 0; f < 4; f++) rect(hx - 2 + f * 2 + (f > 1 ? 1 : 0), top - 1 + ((lt + f * 5 + k * 3) % 20 < 10 ? 0 : 1), 1, 4, 3)
      }
    }
    // 6. the summary
    const drawSurvived = (cx, lt) => {
      centred('BUHAY KA PA!', cx, 34, 3, 2)
      centred('21.09 KM', cx, 56, 3, 3)
      centred('MONUMENTO - TAFT AVE.', cx, 80, 2)
      centred('HI ' + (hi / 1000).toFixed(2), cx, 90, 2)
      if (lt > 40 && Math.floor(lt / 30) % 2) centred('PINDOT A', cx, 112, 3)
    }
    const DAY_KIT = { names: ['PANALO SIGNAGE', 'MICROMATIC PAYONG', 'GINTONG KIKIAM'], hold: [270, 330, 330], bonus: [], header: 'MGA PREMYO', slides: [drawSign, drawUmbrella, drawKikiam, drawWin] }
    const NIGHT_KIT = { names: ['CUTTER', 'RADYO DE BATERYA', 'BAKUNA', 'ITAK NI LOLO', 'BITAG NA UTAK'], hold: [300, 360, 300, 300, 360], bonus: [0, 0, 1, 1, 0], header: 'SURVIVAL KIT', slides: [drawCutter, drawRadio, drawBakuna, drawItakNiLolo, drawBrainBait, drawSurvived] }
    let SLIDES = DAY_KIT.slides
    const drawPrize = () => {
      clear()
      SLIDES.forEach((draw, i) => {
        const off = (i - prizePos) * 160; if (Math.abs(off) >= 160) return
        const lt = i === prize ? prizeT : i < prize ? 999 : 0
        draw(80 + off, lt)
        if (i < PRIZES.length) centred(PRIZES[i], 80 + off, 114, 3, 2)
        if (BONUS[i]) { const b = Math.abs(Math.round(Math.sin(lt * 0.15) * 3)); rect(80 + off - 16, 17 - b, 33, 9, 3); centred('BONUS!', 80 + off, 19 - b, 0) }   // the extras, before the brain bait
      })
      centred(HEADER, 80, 6, 2)
      if (prize < PRIZES.length) for (let i = 0; i < PRIZES.length; i++) { const x = 80 - PRIZES.length * 3.5 + i * 7; rect(x, 131, 4, 4, i === prize ? 3 : 1) }
      if (prizeIn < 40) iris(80, 72, (prizeIn / 40) ** 2 * 130)              // the circle opens on the prizes
    }

    // the switch-on: the logo slides down to the middle, glints, and holds a moment
    const drawBoot = () => {
      clear()
      const e = Math.min(1, bootT / 70), y = Math.round(-12 + (1 - (1 - e) ** 3) * 78)
      text('DRINWORKS', 45, y, 3, 2)
      if (bootT > 70 && bootT < 90) {
        const g = bootT < 80 ? ['..3..', '.333.', '33333', '.333.', '..3..'] : ['.....', '..3..', '.333.', '..3..', '.....']
        px(g, 112, y - 4)
      }
      if (bootT > 84) night ? centred('ZOMBIE EDSA', 80, 86, 2) : text('PIXEL PAL', 62, 86, 2)
    }

    // weak batteries (the old unit): every half a minute or so the picture fades for a few seconds, now and then almost to nothing
    let battIn = 900, sag = null, level = 1
    const battery = () => {
      if (!night || mode === 'off') { sag = null; level = 1; return }
      if (sag) {
        sag.t++
        const u = sag.t / sag.len, dip = Math.sin(Math.PI * Math.min(1, u)) ** 0.7
        level = 1 - sag.depth * dip + (Math.random() - 0.5) * 0.08 * dip
        if (sag.t >= sag.len) { sag = null; level = 1; battIn = 1500 + Math.random() * 1500 }
      } else if (--battIn <= 0) sag = { t: 0, len: 150 + Math.random() * 120, depth: Math.random() < 0.25 ? 0.92 : 0.55 }
    }
    const tick = () => {
      frame++
      // the theme can change mid-run: the weather starts over in the new one (and nothing is left floating)
      const n = isNight()
      if (n !== night) { night = n; phase = 0; phaseT = 0; waterY = DRY; cover = 0; dive = null; obs = obs.filter(o => !KINDS[o.type].dive); fireworks = [] }
      inv = night && (mode === 'play' || mode === 'boot')
      battery()
      if (mode === 'off') { raw(0, 0, 160, 144, 0); return }
      if (mode === 'boot') { bootT++; if (bootT > 175) mode = 'play'; drawBoot(); return }
      if (mode === 'prize') { updatePrize(); drawPrize(); return }
      update(); drawScene()
    }

    // blend the frame over what the slow LCD still remembers, then draw it big with the pixel grid on top
    // the old LCD's scars: the logo and the score burnt in, a few dead pixels, one stuck on, and a dead column
    const burn = mk()
    {
      const b = burn.getContext('2d'), put = (s, x, y, sc) => [...s].forEach((ch, k) => [...(FONT[ch] || FONT[' '])].forEach((bit, n) => { if (bit === '1') b.fillRect(x + (k * 4 + (n % 3)) * sc, y + Math.floor(n / 3) * sc, sc, sc) }))
      b.fillStyle = PALETTE[2]; put('DRINWORKS', 45, 66, 2); put('HI 0.00', 6, 6, 1); put('0.00 KM', 128, 6, 1); b.fillRect(0, 13, 160, 1)
    }
    const DEAD = [[23, 40], [131, 88], [60, 121], [144, 17], [88, 52], [12, 101]], STUCK = [110, 30], DEAD_COL = 97
    const present = () => {
      const old = night
      gctx.globalAlpha = old ? 0.55 : 0.8; gctx.drawImage(buf, 0, 0); gctx.globalAlpha = 1      // the new LCD is quicker: less ghosting
      out.imageSmoothingEnabled = false
      out.drawImage(ghost, 0, 0, 160 * SC, 144 * SC)
      if (old) {
        if (mode !== 'off') { out.globalAlpha = 0.16; out.drawImage(burn, 0, 0, 160 * SC, 144 * SC); out.globalAlpha = 1 }
        // a dead pixel never turns on, so it shows the blank (light) shade; the stuck one is always on (dark)
        out.fillStyle = PALETTE[0]; DEAD.forEach(([x, y]) => out.fillRect(x * SC, y * SC, SC, SC))
        out.globalAlpha = 0.7; out.fillRect(DEAD_COL * SC, 0, SC, 144 * SC); out.globalAlpha = 1
        if (mode !== 'off') { out.fillStyle = PALETTE[3]; out.fillRect(STUCK[0] * SC, STUCK[1] * SC, SC, SC) }
        if (level < 0.999) { out.fillStyle = PALETTE[0]; out.globalAlpha = Math.min(0.95, (1 - level) * 0.95); out.fillRect(0, 0, 160 * SC, 144 * SC); out.globalAlpha = 1 }   // weak batteries wash it out
      }
      out.fillStyle = PALETTE[3]; out.globalAlpha = old ? 0.14 : 0.09
      for (let x = 0; x < 160; x++) out.fillRect(x * SC, 0, 1, 144 * SC)
      for (let y = 0; y < 144; y++) out.fillRect(0, y * SC, 160 * SC, 1)
      out.globalAlpha = 1
    }

    gctx.fillStyle = PALETTE[0]; gctx.fillRect(0, 0, 160, 144)
    clear(); present()
    // advance by real time at 60 steps a second; returns true when the picture changed
    const step = (ms) => {
      acc += Math.min(100, ms); let ran = false
      while (acc >= 16.67) { tick(); acc -= 16.67; ran = true }
      if (ran) present()
      return ran
    }
    // Select: fast-forward to the win. He's at Taft as a real run, the sign just behind him, and the finish party starts
    // (the fans, then the prizes). Ignored while switched off or once the finish is already under way.
    const win = () => {
      if (mode === 'off' || finish) return
      mode = 'play'; reset()
      manual = true; speed = 1.2; metres = TOTAL; hi = Math.max(hi, TOTAL)
      nextStop = STOPS.length; lastStop = STOPS[STOPS.length - 1]
      signs = [{ x: KX - 6, name: lastStop, w: lastStop.length * 8 + 7, last: true, passed: true }]
      finish = 1; banner = { t: night ? 'LIGTAS KA!' : 'FINISH!', f: 220 }
    }
    // Start: reset. A fresh run from Monumento (it plays itself until you press), from anywhere: mid-run, the party, the prizes.
    // The best distance (HI) stays.
    const restart = () => { if (mode === 'off') return; mode = 'play'; manual = false; reset() }
    // for the lab: jump to just before Taft in a real run, or straight to the prizes
    const debug = {
      toFinish() {
        if (mode !== 'play') { mode = 'play'; reset() }
        const i = STOPS.length - 1
        manual = true; over = 0; finish = 0; obs = []; signs = []; nextStop = i; lastStop = STOPS[i - 1]; metres = stopAt(i) - 120
      },
      prizes() { if (mode !== 'off') startPrize() },
      brownout() { if (night) { phase = NIGHT_PHASES.findIndex(x => x[0] === 'brownout'); phaseT = 0; banner = { t: 'BROWNOUT!', f: 120 } } },
      sag() { if (night) battIn = 1 },
      arm() { if (night && tier < 7) { tier++; banner = { t: 'AYUDA!', f: 50, next: { t: WEAPONS[tier].name, f: 100 } } } },
      horde() { if (night) { phase = NIGHT_PHASES.findIndex(x => x[0] === 'horde'); phaseT = 0; banner = { t: 'DUMATING NA SILA!', f: 130 } } }
    }
    // how bright the power light should be (1 = full): weak batteries dim and flicker it
    const led = () => (mode === 'off' ? 0 : level < 0.999 ? Math.max(0.15, level - (Math.random() < 0.2 ? 0.3 : 0)) : 1)
    return { canvas, step, press, release, setPower, isOn: () => mode !== 'off', win, restart, debug, led }
  }
}
