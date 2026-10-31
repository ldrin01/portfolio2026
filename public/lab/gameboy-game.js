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
      dog: { w: 11, h: 7, draw: (o, x) => px(DOG[Math.floor(frame / 5) % 2], x, GROUND - 7) }
    }
    // they drift just UNDER the wave (not on it), so they read clearly; sub = how far down from the surface they reach
    const FLOAT_DROP = 4
    Object.entries(FLOAT).forEach(([k, f]) => { KINDS[k] = { w: f.rows[0].length, sub: f.rows.length + FLOAT_DROP, dive: true, draw: (o, x) => px(f.rows, x, waterY + FLOAT_DROP + bob(o)) } })

    const SC = 5
    const canvas = document.createElement('canvas'); canvas.width = 160 * SC; canvas.height = 144 * SC
    const out = canvas.getContext('2d')
    const mk = () => { const c = document.createElement('canvas'); c.width = 160; c.height = 144; return c }
    const buf = mk(), ghost = mk(), ctx = buf.getContext('2d'), gctx = ghost.getContext('2d')
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
    const SIGN_PACE = 0.35                                       // the signs drift by slowly (like something further back), so you can read them
    // the weather: each phase runs this many frames, then the next one
    const PHASES = [['sun', 1800], ['rain', 480], ['rise', 200], ['swim', 1500], ['drain', 200]]
    const WATER_TOP = 98, DRY = 152                    // the flood rises to just under the LRT, so the city still shows above it

    let kidY = 0, vy = 0, speed = 1.3, dist = 0, metres = 0, hi = 0, frame = 0
    let obs = [], sinceSpawn = 0, nextGap = 90, train = null, trainIn = 200
    let lane = [], laneGap = 0, convoy = 0
    let phase = 0, phaseT = 0, waterY = DRY, cover = 0, swimY = 2, dive = null, banner = null
    let manual = false, over = 0, mode = 'boot', bootT = 0, acc = 0, target = null
    let signs = [], nextStop = 0, lastStop = '', finish = 0, credit = false
    let kidX = KX, celT = 0, crowd = [], confetti = [], flashT = 0           // the finish: where he stops, the party, the fans
    const rain = Array.from({ length: 46 }, () => ({ x: Math.random() * 170, y: Math.random() * 144 }))
    const reset = () => {
      kidY = 0; vy = 0; speed = 1.3; dist = 0; metres = 0; obs = []; sinceSpawn = 0; nextGap = 90; target = null; over = 0
      phase = 0; phaseT = 0; waterY = DRY; cover = 0; swimY = 2; dive = null; banner = null; lane = []; laneGap = 0; convoy = 0
      signs = []; nextStop = 0; lastStop = ''; finish = 0; credit = false
      kidX = KX; celT = 0; crowd = []; confetti = []; flashT = 0; hearts = []
    }
    // the power switch: off blanks the LCD (it fades out through the ghosting); on boots again from the logo, with a fresh game
    const setPower = (on) => {
      if (!on) { mode = 'off'; return }
      if (mode !== 'off') return
      mode = 'boot'; bootT = 0; frame = 0; manual = false; reset()
    }

    const px = (rows, x, y) => rows.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== '.' && c !== '0') { ctx.fillStyle = PALETTE[+c]; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1) }
    }))
    const text = (s, x, y, shade = 3, sc = 1) => {
      ctx.fillStyle = PALETTE[shade]
      ;[...s].forEach((ch, k) => [...(FONT[ch] || FONT[' '])].forEach((b, n) => { if (b === '1') ctx.fillRect(x + (k * 4 + (n % 3)) * sc, y + Math.floor(n / 3) * sc, sc, sc) }))
    }
    const rect = (x, y, w, h, shade) => { ctx.fillStyle = PALETTE[shade]; ctx.fillRect(Math.round(x), Math.round(y), w, h) }
    const clear = () => rect(0, 0, 160, 144, 0)
    const bob = o => Math.round(Math.sin((frame + o.seed) * 0.08))
    const phaseName = () => PHASES[phase][0]
    const swimming = () => waterY < GROUND - 8

    // ── the easy input: whatever is next gets a window; a press inside it books the move, which then fires on its own ──
    const relSpeed = o => (KINDS[o.type].dive ? speed * 0.9 : speed) - o.vx
    const timeTo = o => (o.x + o.w / 2 - (KX + KW / 2)) / relSpeed(o)
    const leadOf = o => KINDS[o.type].dive ? (KINDS[o.type].sub + 2) / DIVE + (o.w + 14) / (2 * relSpeed(o)) + 2 : (o.h > 9 ? BIG : HOP) / G
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

    const spawn = () => {
      const floods = swimming()
      const pool = floods ? ['trash', 'trash', 'wood', 'fbox', 'bike', 'car', 'lola'] : ['bag', 'box', 'box', 'boxes', 'tire', 'tire', 'squat', 'dog', 'dog', 'bag']
      const type = pool[Math.floor(Math.random() * pool.length)], K = KINDS[type]
      obs.push({ type, x: 168, w: K.w, h: K.h || 0, vx: type === 'dog' ? -0.5 : 0, ok: false, done: false, seed: Math.random() * 100 })
    }
    // the traffic behind: the bus carousel comes three at a time; jeepneys, riders and the odd fishball cart in between
    const spawnLane = () => {
      let type
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
      phase = (phase + 1) % PHASES.length; phaseT = 0
      const p = phaseName()
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
    const updateFinish = () => {
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
      if (celT > CROWD_AT + 30) for (let k = 0; k < 2; k++) if (confetti.length < 90) confetti.push({ x: Math.random() * 170, y: -2, vx: Math.random() * 0.6 - 0.3, s: 1 + Math.floor(Math.random() * 3) })
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
        if (d <= 0) { rect(0, y, 160, 1, 3); continue }
        const dx = Math.sqrt(d), x1 = Math.max(0, Math.round(cx - dx)), x2 = Math.round(cx + dx)
        if (x1 > 0) rect(0, y, x1, 1, 3)
        if (x2 < 160) rect(x2, y, 160 - x2, 1, 3)
      }
    }

    const update = () => {
      if (over) { if (--over === 0) { manual = false; reset() } return }
      if (finish && updateFinish()) return
      dist += speed; if (!finish) speed = Math.min(2.3, speed + 0.0004)
      if (!finish) { metres = Math.min(TOTAL, metres + speed / 8); if (manual) hi = Math.max(hi, metres) }   // it holds at 21.09 until the Taft sign reaches him
      // the stop signs: each one appears ahead so that it passes you right at its distance
      if (nextStop < STOPS.length && metres >= stopAt(nextStop) - (168 - KX) / (8 * SIGN_PACE)) { const n = STOPS[nextStop]; signs.push({ x: 168, name: n, w: n.length * 8 + 7, last: nextStop === STOPS.length - 1 }); nextStop++ }
      signs.forEach(sg => {
        sg.x -= speed * SIGN_PACE
        if (!sg.passed && sg.x + sg.w / 2 < KX + KW / 2) {
          sg.passed = true; lastStop = sg.name
          if (sg.last) {
            finish = 1; celT = 0; banner = { t: 'FINISH!', f: 220 }; obs = []; metres = TOTAL; if (manual) hi = Math.max(hi, metres)
            if (phase === 2 || phase === 3) { phase = 4; phaseT = 0 }       // in the flood: the water drains first, then he can celebrate
          }
        }
      })
      signs = signs.filter(sg => sg.x > -sg.w - 4)
      // weather
      if (!(finish && phase <= 1) && ++phaseT > PHASES[phase][1]) nextPhase()   // at the finish the weather holds (no flood on his big moment)
      if (flashT) flashT--
      const p = phaseName()
      const wet = p !== 'sun'
      cover += ((wet ? 1 : 0) - cover) * 0.02
      if (p === 'rise') waterY = DRY + (WATER_TOP - DRY) * Math.min(1, phaseT / 160)
      else if (p === 'drain') waterY = WATER_TOP + (DRY - WATER_TOP) * Math.min(1, phaseT / 160)
      else waterY = p === 'swim' ? WATER_TOP : DRY
      if (banner && --banner.f <= 0) banner = null
      rain.forEach(r => { r.y += 3.2; r.x -= 1.4 + speed * 0.3; if (r.y > 144) { r.y = -4; r.x = Math.random() * 190 } if (r.x < -4) r.x += 180 })

      // the world moves left (dogs trot toward you a little faster)
      obs.forEach(o => { o.x += -(KINDS[o.type].dive ? speed * 0.9 : speed) + o.vx })
      obs = obs.filter(o => o.x > -30)
      // spawning follows the weather: things on the sidewalk while dry (stopping before the flood), floating things while swimming
      const canGround = (p === 'sun') || (p === 'rain' && phaseT < 300)
      const canFloat = p === 'swim' && phaseT > 60 && phaseT < 1320
      sinceSpawn += speed
      if (!finish && sinceSpawn > nextGap && (canGround || canFloat)) { spawn(); sinceSpawn = 0; nextGap = (canFloat ? 130 : 115) + Math.random() * 80 + speed * 20 }   // well spaced, so it never feels rushed
      // the train on the LRT, and the traffic
      if (train) { train.x -= speed * 0.4 + 1.1; if (train.x < -90) train = null } else if (--trainIn <= 0) { train = { x: 170 }; trainIn = 500 + Math.random() * 500 }
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
          if (K.dive && swimming()) { dive = { o, y: K.sub + 3 }; o.done = true }
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
        if (K.dive) return swimming() && waterY + swimY - 1 < waterY + K.sub
        return !swimming() && kidY < o.h - 1
      })
      if (hit && manual && !finish) over = 100
    }

    // ── drawing ──
    // the traffic is drawn a shade lighter than its numbers say (2 -> 1, 1 -> 0, 0 -> 1), so it stays in the background
    const rectB = (x, y, w, h, shade) => rect(x, y, w, h, [1, 0, 1, 3][shade])
    const drawBus = (x, b) => {
      const t = b - 15
      rectB(x, t, 34, 13, 2); rectB(x + 1, t + 1, 32, 11, 1)
      for (let w = x + 6; w < x + 31; w += 5) rectB(w, t + 3, 4, 4, 0)
      rectB(x + 1, t + 2, 3, 6, 2)                                   // the windscreen at the front (it heads left)
      rectB(x + 1, t + 9, 32, 1, 2)                                  // the stripe
      rectB(x + 5, t + 12, 5, 3, 2); rectB(x + 25, t + 12, 5, 3, 2)   // wheels
    }
    const drawJeep = (x, b) => {
      const t = b - 13
      rectB(x + 3, t, 25, 2, 2)                                      // the long roof
      rectB(x + 4, t + 2, 24, 8, 2); rectB(x + 5, t + 3, 22, 6, 1)
      for (let w = x + 7; w < x + 26; w += 4) rectB(w, t + 4, 3, 2, 0)   // open side windows
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
    const drawCart = (x, b) => {
      rectB(x + 3, b - 22, 10, 2, 2); rectB(x + 1, b - 20, 14, 2, 2)  // umbrella
      rectB(x + 7, b - 18, 1, 7, 2)
      rectB(x, b - 11, 16, 7, 2); rectB(x + 1, b - 10, 14, 5, 1)      // the cart
      rectB(x + 2, b - 12, 6, 1, 2)                                  // the frying pan
      rectB(x + 3, b - 4, 3, 3, 2); rectB(x + 11, b - 4, 3, 3, 2)
      rectB(x + 18, b - 17, 3, 3, 2); rectB(x + 18, b - 14, 3, 10, 2) // the vendor
      for (let s = 0; s < 3; s++) { const sy = b - 14 - ((frame * 0.3 + s * 5) % 14), sx = x + 3 + s * 2 + Math.round(Math.sin((frame + s * 20) * 0.1)); rectB(sx, sy, 2, 1, 2) }   // steam
    }

    const drawCity = () => {
      const p = phaseName()
      // the sun, then the rain clouds rolling over it
      if (cover < 0.95) {
        ctx.fillStyle = PALETTE[1]; ctx.beginPath(); ctx.arc(128, 26 - cover * 30, 8, 0, Math.PI * 2); ctx.fill()
        if (cover < 0.3) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + frame * 0.004; rect(128 + Math.cos(a) * 12, 26 + Math.sin(a) * 12, 2, 2, 1) }
      }
      if (cover > 0.05) {
        // the storm: a dark band of cloud rolls down over the top of the screen, with a lumpy underside
        const base = Math.round(cover * 26)
        rect(0, 0, 160, base, 3)
        for (let k = 0; k < 7; k++) {
          const cx = ((k * 31 - frame * 0.12) % 217 + 217) % 217 - 30, w = 26 + (k * 11) % 20
          const d = (k % 3) * 2                                       // each puff hangs a little differently
          rect(cx, base - 1, w, Math.round((4 + d) * cover), 3)
          rect(cx + 3, base + Math.round((3 + d) * cover) - 1, w - 6, Math.round(3 * cover), 3)
          rect(cx + 7, base + Math.round((6 + d) * cover) - 1, w - 14, Math.round(2 * cover), 3)
        }
      }
      // the Makati skyline, far and slow
      const off = (dist * 0.12) % SKY_W, base = 108
      for (const k of [0, 1]) skyline.forEach(b => {
        const x = b.x - off + k * SKY_W; if (x > 160 || x + b.w < 0) return
        for (let yy = base - b.h + 1; yy < base; yy += 2) for (let xx = x + 1 + (yy % 4 === 1 ? 1 : 0); xx < x + b.w - 1; xx += 2) rect(xx, yy, 1, 1, 1)   // light, dithered
        rect(x, base - b.h, b.w, 1, 1); rect(x, base - b.h, 1, b.h, 1); rect(x + b.w - 1, base - b.h, 1, b.h, 1)                                       // its outline
        if (b.cap) rect(x + Math.floor(b.w / 2), base - b.h - 4, 1, 4, 1)
      })
      // the LRT, with a train now and then
      const loff = (dist * 0.4) % 40
      for (let x = -loff; x < 170; x += 40) rect(x, 84, 5, GROUND - 84, 1)
      rect(0, 80, 160, 4, 1); rect(0, 79, 160, 1, 2)
      if (train) for (let c = 0; c < 3; c++) { const cx = train.x + c * 28; rect(cx, 69, 26, 10, 1); rect(cx, 69, 26, 1, 2); for (let w = 3; w < 24; w += 5) rect(cx + w, 71, 3, 3, 0) }
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
      })
      // the traffic, crawling
      if (waterY > 140) lane.forEach(v => { const d = { bus: drawBus, jeep: drawJeep, rider: drawRider, cart: drawCart }[v.type]; d(v.x, LANE) })   // gone under the flood
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

    const drawScene = () => {
      clear(); drawCity()
      obs.forEach(o => { if (!KINDS[o.type].dive) KINDS[o.type].draw(o, o.x) })
      drawWater()
      obs.forEach(o => { if (KINDS[o.type].dive) KINDS[o.type].draw(o, o.x) })
      if (!swimming()) drawCrowd()
      if (swimming()) px(SWIM[Math.floor(frame / 8) % 4], kidX - 3, waterY + swimY - 3)
      else if (celT) px(kidY > 0 ? CHEER : JUMP, Math.round(kidX), GROUND - 14 - Math.round(kidY))   // celebrating: arms up in the air, arms out on landing
      else {
        const sprite = kidY > 0 ? JUMP : JOG[Math.floor(frame / 7) % 4], b = kidY === 0 && Math.floor(frame / 7) % 2 ? 1 : 0
        px(sprite, Math.round(kidX), GROUND - 14 - Math.round(kidY) + b)
      }
      // rain over everything while it's wet
      if (phaseName() !== 'sun' && phaseName() !== 'drain' || (phaseName() === 'drain' && phaseT < 60)) rain.forEach(r => { rect(r.x, r.y, 1, 1, 2); rect(r.x + 1, r.y - 1, 1, 1, 2); rect(r.x + 2, r.y - 2, 1, 1, 2) })
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
      if (over) { if (Math.floor(over / 15) % 2) text('GAME OVER', 62, 50) }
      else if (!manual && !banner && Math.floor(frame / 30) % 2) text('PRESS A', 66, 50, 3)
      // the finish party: confetti, the camera flashes lighting up the screen, then the circle closing on him
      hearts.forEach(h => { if (h.t < 55 || h.t % 4 < 2) px(HEART, h.x, h.y) })   // they blink out at the end
      confetti.forEach(c => rect(c.x, c.y, Math.floor(frame / 6 + c.x) % 2 ? 2 : 1, 1, c.s))
      if (flashT) { ctx.globalAlpha = 0.45; rect(0, 0, 160, 144, 0); ctx.globalAlpha = 1 }
      if (celT > IRIS_AT) { const e = Math.min(1, (celT - IRIS_AT) / IRIS_LEN); iris(kidX + 5, GROUND - 8 - kidY, 130 * (1 - e * e)) }
    }

    // ── the prizes: a carousel, one slide at a time (each slides in from the right). A press skips ahead ──
    const PRIZES = ['PANALO SIGNAGE', 'MICROMATIC PAYONG', 'GINTONG KIKIAM']
    const HOLD = [270, 330, 330]                                  // frames each prize stays before the next slides in
    let prize = 0, prizePos = -1, prizeT = 0, prizeIn = 0
    const startPrize = () => { mode = 'prize'; prize = 0; prizePos = -1; prizeT = 0; prizeIn = 0; banner = null; confetti = []; flashT = 0 }
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

    const SLIDES = [drawSign, drawUmbrella, drawKikiam, drawWin]
    const drawPrize = () => {
      clear()
      SLIDES.forEach((draw, i) => {
        const off = (i - prizePos) * 160; if (Math.abs(off) >= 160) return
        const lt = i === prize ? prizeT : i < prize ? 999 : 0
        draw(80 + off, lt)
        if (i < PRIZES.length) centred(PRIZES[i], 80 + off, 114, 3, 2)
      })
      centred('MGA PREMYO', 80, 6, 2)
      if (prize < PRIZES.length) for (let i = 0; i < PRIZES.length; i++) { const x = 72 + i * 7; rect(x, 131, 4, 4, i === prize ? 3 : 1) }
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
      if (bootT > 84) text('PIXEL PAL', 62, 86, 2)
    }

    const tick = () => {
      frame++
      if (mode === 'off') { clear(); return }
      if (mode === 'boot') { bootT++; if (bootT > 175) mode = 'play'; drawBoot(); return }
      if (mode === 'prize') { updatePrize(); drawPrize(); return }
      update(); drawScene()
    }

    // blend the frame over what the slow LCD still remembers, then draw it big with the pixel grid on top
    const present = () => {
      gctx.globalAlpha = 0.55; gctx.drawImage(buf, 0, 0); gctx.globalAlpha = 1
      out.imageSmoothingEnabled = false
      out.drawImage(ghost, 0, 0, 160 * SC, 144 * SC)
      out.fillStyle = PALETTE[3]; out.globalAlpha = 0.14
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
      manual = true; speed = 1.6; metres = TOTAL; hi = Math.max(hi, TOTAL)
      nextStop = STOPS.length; lastStop = STOPS[STOPS.length - 1]
      signs = [{ x: KX - 6, name: lastStop, w: lastStop.length * 8 + 7, last: true, passed: true }]
      finish = 1; banner = { t: 'FINISH!', f: 220 }
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
      prizes() { if (mode !== 'off') startPrize() }
    }
    return { canvas, step, press, release, setPower, isOn: () => mode !== 'off', win, restart, debug }
  }
}
