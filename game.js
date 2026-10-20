/**
 * ============================================================
 *  Pixel Balloon Pop – Subtraction (Fixed & Upgraded)
 *  8-Bit Retro Math Arcade • Touch + Button Hybrid • PWA Ready
 * ============================================================
 */

const CONFIG = {
    LIVES: 3,

    DIFFICULTY: {
        easy:   { label: 'EASY',   maxA: 10,  minA: 2,  baseSpeed: 38 },
        medium: { label: 'MEDIUM', maxA: 20,  minA: 6,  baseSpeed: 50 },
        hard:   { label: 'HARD',   maxA: 100, minA: 15, baseSpeed: 64 },
    },

    BALLOON_COLORS: [
        { main: '#FF004D', hi: '#FF77A8', dk: '#7E2553' }, // Red
        { main: '#29ADFF', hi: '#83C9FF', dk: '#1D4F7E' }, // Blue
        { main: '#00E436', hi: '#7DFFB3', dk: '#008751' }, // Green
        { main: '#FFA300', hi: '#FFEC27', dk: '#AB5236' }, // Orange
        { main: '#FF77A8', hi: '#FFCCAA', dk: '#7E2553' }, // Pink
        { main: '#83769C', hi: '#C2C3C7', dk: '#1D2B53' }, // Indigo
    ],

    // Matching the 3 arcade answer button colors so kids can visually pair them
    SLOT_COLORS: [
        { main: '#FF004D', hi: '#FF77A8', dk: '#7E2553' }, // Slot 1: Pink/Red
        { main: '#29ADFF', hi: '#83C9FF', dk: '#1D4F7E' }, // Slot 2: Blue
        { main: '#00E436', hi: '#7DFFB3', dk: '#008751' }, // Slot 3: Green
    ],

    SPEED_GROWTH: 0.04,
    MAX_SPEED_MULT: 2.4,
    STAR_COUNT: 65,
    CLOUD_COUNT: 6,
};

/* 12x14 8-Bit Balloon Pixel Matrix
   0 = empty, 1 = main, 2 = highlight, 3 = shadow/knot, 4 = outline */
const BALLOON_SPRITE = [
    [0,0,0,4,4,4,4,4,4,0,0,0],
    [0,0,4,1,1,1,1,1,1,4,0,0],
    [0,4,1,2,2,1,1,1,1,1,4,0],
    [4,1,2,2,1,1,1,1,1,1,1,4],
    [4,1,2,1,1,1,1,1,1,1,1,4],
    [4,1,1,1,1,1,1,1,1,1,3,4],
    [4,1,1,1,1,1,1,1,1,1,3,4],
    [4,1,1,1,1,1,1,1,1,3,3,4],
    [0,4,1,1,1,1,1,1,3,3,4,0],
    [0,0,4,1,1,1,1,3,3,4,0,0],
    [0,0,0,4,1,1,3,3,4,0,0,0],
    [0,0,0,0,4,3,3,4,0,0,0,0],
    [0,0,0,0,4,3,3,4,0,0,0,0],
    [0,0,0,0,0,4,4,0,0,0,0,0],
];

const CLOUD_SHAPES = [
    [
        [0,0,1,1,1,0,0,0],
        [0,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,0],
    ],
    [
        [0,0,0,1,1,1,0,0,0],
        [0,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,0],
    ],
];

/* ──────────────────────────────────────────────────────────
   SOUND MANAGER – Procedural 8-Bit Chiptune & SFX
   ────────────────────────────────────────────────────────── */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = false;
        this.musicTimer = null;
        this.noteIndex = 0;
    }

    _ensure() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    _tone(freq, dur, type = 'square', vol = 0.14, delay = 0) {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
    }

    _sweep(f1, f2, dur, type = 'square', vol = 0.14, delay = 0) {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f1, t);
        osc.frequency.linearRampToValueAtTime(f2, t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
    }

    _noise(dur, vol = 0.1, delay = 0) {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const bufLen = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        src.buffer = buf;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t);
        src.stop(t + dur);
    }

    playPop(streak = 0) {
        this._ensure();
        const pitchBoost = Math.min(streak, 12) * 45;
        this._noise(0.07, 0.15, 0);
        this._sweep(520 + pitchBoost, 980 + pitchBoost, 0.09, 'square', 0.15, 0.01);
        this._tone(1100 + pitchBoost, 0.12, 'triangle', 0.12, 0.07);
    }

    playWrong() {
        this._ensure();
        this._tone(180, 0.14, 'sawtooth', 0.16, 0);
        this._tone(130, 0.22, 'square', 0.16, 0.12);
    }

    playEscape() {
        this._ensure();
        this._sweep(480, 140, 0.35, 'triangle', 0.15, 0);
    }

    playClick() {
        this._ensure();
        this._tone(740, 0.04, 'square', 0.09, 0);
    }

    playGameOver() {
        this._ensure();
        const notes = [392, 349, 330, 262];
        notes.forEach((f, i) => {
            this._tone(f, 0.26, 'square', 0.14, i * 0.22);
            this._tone(f / 2, 0.26, 'triangle', 0.1, i * 0.22);
        });
    }

    startMusic() {
        if (!this.musicEnabled || this.musicTimer) return;
        this._ensure();
        if (!this.ctx) return;

        const melody = [
            262, 330, 392, 523, 392, 330, 294, 349,
            262, 330, 392, 523, 587, 523, 392, 330
        ];
        const bass = [
            131, 131, 165, 165, 196, 196, 147, 175,
            131, 131, 165, 165, 196, 196, 131, 131
        ];

        this.noteIndex = 0;
        this.musicTimer = setInterval(() => {
            if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
            const idx = this.noteIndex % melody.length;
            const t = this.ctx.currentTime;

            const mOsc = this.ctx.createOscillator();
            const mGain = this.ctx.createGain();
            mOsc.type = 'square';
            mOsc.frequency.setValueAtTime(melody[idx], t);
            mGain.gain.setValueAtTime(0.035, t);
            mGain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
            mOsc.connect(mGain).connect(this.ctx.destination);
            mOsc.start(t);
            mOsc.stop(t + 0.18);

            const bOsc = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bOsc.type = 'triangle';
            bOsc.frequency.setValueAtTime(bass[idx], t);
            bGain.gain.setValueAtTime(0.045, t);
            bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
            bOsc.connect(bGain).connect(this.ctx.destination);
            bOsc.start(t);
            bOsc.stop(t + 0.18);

            this.noteIndex++;
        }, 190);
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        if (this.sfxEnabled) this.playClick();
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) this.startMusic();
        else this.stopMusic();
        return this.musicEnabled;
    }
}

/* ──────────────────────────────────────────────────────────
   VISUAL ENTITIES (Particles, Popups, Stars, Clouds, Balloons)
   ────────────────────────────────────────────────────────── */
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 320;
        this.vy = (Math.random() - 0.5) * 320 - 90;
        this.size = Math.floor(Math.random() * 5) + 4;
        this.color = color;
        this.life = 1;
        this.decay = 1.4 + Math.random() * 1.2;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 520 * dt; // Gravity
        this.life -= this.decay * dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
        ctx.globalAlpha = 1;
    }

    get dead() { return this.life <= 0; }
}

class ScorePopup {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.vy = -65;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= 1.1 * dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = "15px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(this.text, Math.floor(this.x) + 2, Math.floor(this.y) + 2);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, Math.floor(this.x), Math.floor(this.y));
        ctx.restore();
    }

    get dead() { return this.life <= 0; }
}

class Star {
    constructor(w, h) {
        this.x = Math.floor(Math.random() * w);
        this.y = Math.floor(Math.random() * (h * 0.72));
        this.size = Math.random() < 0.3 ? 3 : 2;
        this.speed = 1.5 + Math.random() * 3;
        this.phase = Math.random() * Math.PI * 2;
    }

    draw(ctx, t) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(t * this.speed + this.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#FFF1E8';
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class Cloud {
    constructor(w, h) {
        this.shape = CLOUD_SHAPES[Math.floor(Math.random() * CLOUD_SHAPES.length)];
        this.ps = 4 + Math.floor(Math.random() * 3);
        this.x = Math.random() * w;
        this.y = 40 + Math.random() * (h * 0.42);
        this.speed = 10 + Math.random() * 18;
        this.alpha = 0.12 + Math.random() * 0.12;
        this.w = w;
    }

    update(dt) {
        this.x += this.speed * dt;
        const totalW = this.shape[0].length * this.ps;
        if (this.x > this.w + totalW) this.x = -totalW;
    }

    draw(ctx) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#FFF1E8';
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (this.shape[r][c]) {
                    ctx.fillRect(
                        Math.floor(this.x + c * this.ps),
                        Math.floor(this.y + r * this.ps),
                        this.ps,
                        this.ps
                    );
                }
            }
        }
        ctx.globalAlpha = 1;
    }
}

class Balloon {
    constructor(x, y, number, slotIndex, colorSet, speed, ps, isDecorative = false) {
        this.baseX = x;
        this.x = x;
        this.y = y;
        this.number = number;
        this.slotIndex = slotIndex;
        this.color = colorSet;
        this.speed = speed;
        this.ps = ps;
        this.isDecorative = isDecorative;
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleAmp = 10 + Math.random() * 8;
        this.wobbleFreq = 1.8 + Math.random() * 1.2;
        this.popped = false;
    }

    get width()  { return BALLOON_SPRITE[0].length * this.ps; }
    get height() { return BALLOON_SPRITE.length * this.ps; }

    update(dt, time) {
        if (this.popped) return;
        this.y -= this.speed * dt;
        this.x = this.baseX + Math.sin(time * this.wobbleFreq + this.wobblePhase) * this.wobbleAmp;
    }

    containsPoint(px, py) {
        const halfW = this.width * 0.62;
        const halfH = this.height * 0.62;
        return (
            px >= this.x - halfW &&
            px <= this.x + halfW &&
            py >= this.y - halfH &&
            py <= this.y + halfH
        );
    }

    draw(ctx, time) {
        if (this.popped) return;
        const ps = this.ps;
        const ox = Math.floor(this.x - this.width / 2);
        const oy = Math.floor(this.y - this.height / 2);

        // Draw animated wavy string
        ctx.fillStyle = '#C2C3C7';
        const sx = Math.floor(this.x);
        const sy = oy + this.height;
        for (let i = 0; i < 7; i++) {
            const dx = Math.floor(Math.sin(time * 4 + this.wobblePhase + i * 0.6) * (ps * 0.55));
            ctx.fillRect(sx + dx - 1, sy + i * (ps - 1), 3, ps);
        }

        // Draw 8-bit balloon sprite
        for (let r = 0; r < BALLOON_SPRITE.length; r++) {
            for (let c = 0; c < BALLOON_SPRITE[r].length; c++) {
                const v = BALLOON_SPRITE[r][c];
                if (v === 0) continue;
                if (v === 1) ctx.fillStyle = this.color.main;
                else if (v === 2) ctx.fillStyle = this.color.hi;
                else if (v === 3) ctx.fillStyle = this.color.dk;
                else if (v === 4) ctx.fillStyle = '#000000';
                ctx.fillRect(ox + c * ps, oy + r * ps, ps, ps);
            }
        }

        // Draw candidate answer on gameplay balloons
        if (!this.isDecorative && this.number !== null) {
            const numStr = String(this.number);
            const fontSize = Math.max(12, Math.floor(ps * 2.6));
            ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const tx = Math.floor(this.x);
            const ty = Math.floor(this.y - ps * 1.2);

            ctx.fillStyle = '#000000';
            ctx.fillText(numStr, tx + 2, ty + 2);
            ctx.fillStyle = '#FFF1E8';
            ctx.fillText(numStr, tx, ty);
        }
    }
}

/* ──────────────────────────────────────────────────────────
   SCENERY RENDERER – Pixel Moon, Mountains & Grass
   ────────────────────────────────────────────────────────── */
function createSceneryCanvas(w, h) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const step = 4;
    const groundY = h - 24;

    // Pixel Moon in upper right
    const moonR = Math.max(20, Math.floor(Math.min(w, h) * 0.055));
    const moonX = Math.floor(w * 0.82);
    const moonY = Math.floor(h * 0.18);
    for (let y = -moonR; y <= moonR; y += step) {
        for (let x = -moonR; x <= moonR; x += step) {
            if (x * x + y * y <= moonR * moonR) {
                ctx.fillStyle = '#FFF1E8';
                ctx.fillRect(moonX + x, moonY + y, step, step);
            }
        }
    }

    // Distant mountain range
    const farPeaks = [
        { x: w * 0.15, y: groundY - h * 0.22 },
        { x: w * 0.48, y: groundY - h * 0.28 },
        { x: w * 0.82, y: groundY - h * 0.20 },
    ];
    ctx.fillStyle = '#141B3D';
    for (let x = 0; x < w; x += step) {
        let minY = groundY;
        for (const p of farPeaks) {
            const py = p.y + Math.abs(x - p.x) * 0.55;
            if (py < minY) minY = py;
        }
        minY = Math.floor(minY / step) * step;
        ctx.fillRect(x, minY, step, groundY - minY);
    }

    // Near mountain range
    const nearPeaks = [
        { x: w * 0.08, y: groundY - h * 0.12 },
        { x: w * 0.32, y: groundY - h * 0.18 },
        { x: w * 0.65, y: groundY - h * 0.15 },
        { x: w * 0.92, y: groundY - h * 0.13 },
    ];
    ctx.fillStyle = '#090D24';
    for (let x = 0; x < w; x += step) {
        let minY = groundY;
        for (const p of nearPeaks) {
            const py = p.y + Math.abs(x - p.x) * 0.68;
            if (py < minY) minY = py;
        }
        minY = Math.floor(minY / step) * step;
        ctx.fillRect(x, minY, step, groundY - minY);
    }

    // Retro 8-bit turf strip
    ctx.fillStyle = '#008751';
    ctx.fillRect(0, groundY, w, 6);
    ctx.fillStyle = '#00E436';
    for (let x = 0; x < w; x += step * 2) {
        ctx.fillRect(x, groundY, step, 4);
    }
    ctx.fillStyle = '#1D2B53';
    ctx.fillRect(0, groundY + 6, w, 18);

    return off;
}

/* ──────────────────────────────────────────────────────────
   MAIN GAME CONTROLLER
   ────────────────────────────────────────────────────────── */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx    = this.canvas.getContext('2d');

        this.screens = {
            start:      document.getElementById('start-screen'),
            game:       document.getElementById('game-screen'),
            pause:      document.getElementById('pause-overlay'),
            gameover:   document.getElementById('gameover-screen'),
            highscores: document.getElementById('highscores-screen'),
        };

        this.state      = 'start'; // start | playing | paused | gameover | highscores
        this.prevScreen = 'start';
        this.difficulty = 'easy';

        this.score          = 0;
        this.lives          = CONFIG.LIVES;
        this.streak         = 0;
        this.maxStreak      = 0;
        this.balloonsPopped = 0;
        this.multiplier     = 1;

        this.problem     = null;
        this.answers     = [];
        this.correctIdx  = -1;
        this.waitingNext = false;

        this.balloons     = [];
        this.menuBalloons = [];
        this.particles    = [];
        this.popups       = [];
        this.stars        = [];
        this.clouds       = [];
        this.sceneryCache = null;

        this.sound      = new SoundManager();
        this.deferredPrompt = null;

        this.lastTime = performance.now();
        this.gameTime = 0;

        this._resizeCanvas();
        this._bindEvents();
        this._spawnMenuBalloons();

        window.addEventListener('resize', () => this._resizeCanvas());
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => this._resizeCanvas());
            ro.observe(document.getElementById('game-container'));
        }

        this._loop = this._loop.bind(this);
        requestAnimationFrame(this._loop);
    }

    /* ---------- Responsive Canvas & Scenery ---------- */
    _resizeCanvas() {
        const container = document.getElementById('game-container');
        if (!container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        if (w === 0 || h === 0) return;

        this.canvas.width  = w;
        this.canvas.height = h;
        this.ctx.imageSmoothingEnabled = false;

        this.stars = Array.from({ length: CONFIG.STAR_COUNT }, () => new Star(w, h));
        this.clouds = Array.from({ length: CONFIG.CLOUD_COUNT }, () => new Cloud(w, h));
        this.sceneryCache = createSceneryCanvas(w, h);
    }

    _getPixelScale() {
        const minDim = Math.min(this.canvas.width, this.canvas.height);
        return Math.max(4, Math.min(7, Math.floor(minDim / 78)));
    }

    _spawnMenuBalloons() {
        this.menuBalloons = [];
        const w = this.canvas.width || 400;
        const h = this.canvas.height || 700;
        const ps = this._getPixelScale();
        for (let i = 0; i < 6; i++) {
            const color = CONFIG.BALLOON_COLORS[i % CONFIG.BALLOON_COLORS.length];
            const x = 40 + Math.random() * Math.max(60, w - 80);
            const y = Math.random() * h;
            const speed = 22 + Math.random() * 20;
            this.menuBalloons.push(new Balloon(x, y, null, -1, color, speed, ps, true));
        }
    }

    /* ---------- Event Bindings (Touch, Mouse & Keyboard) ---------- */
    _bindEvents() {
        // Difficulty selection
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.difficulty = btn.dataset.diff;
                this.sound.playClick();
            });
        });

        // Main navigation
        document.getElementById('start-btn').addEventListener('click', () => this._startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this._startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this._togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this._togglePause());
        document.getElementById('quit-btn').addEventListener('click', () => this._goHome());

        document.getElementById('home-btn').addEventListener('click', () => {
            if (this.state === 'playing') this._togglePause();
            else this._goHome();
        });
        document.getElementById('go-home-btn').addEventListener('click', () => this._goHome());

        // High Scores
        document.getElementById('menu-scores-btn').addEventListener('click', () => {
            this.prevScreen = 'start';
            this._showHighScores();
        });
        document.getElementById('go-scores-btn').addEventListener('click', () => {
            this.prevScreen = 'gameover';
            this._showHighScores();
        });
        document.getElementById('scores-back-btn').addEventListener('click', () => {
            this.sound.playClick();
            this._showScreen(this.prevScreen);
        });

        // Sound & Music Toggles
        const syncAudioUI = () => {
            const sfxOn = this.sound.sfxEnabled;
            const bgmOn = this.sound.musicEnabled;
            document.getElementById('sfx-toggle-menu').textContent   = sfxOn ? '♪ SFX: ON' : '♪ SFX: OFF';
            document.getElementById('sfx-toggle-game').textContent   = sfxOn ? '♪' : '♪✕';
            document.getElementById('music-toggle-menu').textContent = bgmOn ? '♫ BGM: ON' : '♫ BGM: OFF';
            document.getElementById('music-toggle-game').textContent = bgmOn ? '♫' : '♫✕';
        };

        document.getElementById('sfx-toggle-menu').addEventListener('click', () => {
            this.sound.toggleSFX();
            syncAudioUI();
        });
        document.getElementById('sfx-toggle-game').addEventListener('click', () => {
            this.sound.toggleSFX();
            syncAudioUI();
        });
        document.getElementById('music-toggle-menu').addEventListener('click', () => {
            this.sound._ensure();
            this.sound.toggleMusic();
            syncAudioUI();
        });
        document.getElementById('music-toggle-game').addEventListener('click', () => {
            this.sound._ensure();
            this.sound.toggleMusic();
            syncAudioUI();
        });

        // Fast zero-delay pointerdown on answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const idx = parseInt(btn.dataset.index, 10);
                this._handleAnswer(idx);
            });
        });

        // Direct tap/click on rising balloons in the canvas
        this.canvas.addEventListener('pointerdown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const py = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            if (this.state === 'playing' && !this.waitingNext) {
                for (let i = this.balloons.length - 1; i >= 0; i--) {
                    const b = this.balloons[i];
                    if (!b.popped && b.containsPoint(px, py)) {
                        this._handleAnswer(b.slotIndex);
                        return;
                    }
                }
            } else if (this.state !== 'playing') {
                // Fun interactive easter egg: pop decorative background balloons on menu
                for (const mb of this.menuBalloons) {
                    if (mb.containsPoint(px, py)) {
                        this.sound.playPop(1);
                        this._burstParticles(mb);
                        mb.y = this.canvas.height + 60;
                        mb.baseX = 40 + Math.random() * Math.max(60, this.canvas.width - 80);
                        break;
                    }
                }
            }
        });

        // Keyboard Support
        window.addEventListener('keydown', (e) => {
            if (this.state === 'playing' && !this.waitingNext) {
                if (e.key === '1' || e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  this._handleAnswer(0);
                else if (e.key === '2' || e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this._handleAnswer(1);
                else if (e.key === '3' || e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this._handleAnswer(2);
            }
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                if (this.state === 'playing' || this.state === 'paused') this._togglePause();
            }
            if (e.key === 'Enter' || e.key === ' ') {
                if (this.state === 'start' || this.state === 'gameover') {
                    e.preventDefault();
                    this._startGame();
                }
            }
        });

        // PWA Install Prompt Support
        const installBtn = document.getElementById('install-pwa-btn');
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            installBtn.classList.remove('hidden');
        });

        installBtn.addEventListener('click', async () => {
            if (!this.deferredPrompt) return;
            this.deferredPrompt.prompt();
            await this.deferredPrompt.userChoice;
            this.deferredPrompt = null;
            installBtn.classList.add('hidden');
        });
    }

    /* ---------- Screen Switching (FIXED STATE MISMATCH) ---------- */
    _showScreen(name) {
        Object.entries(this.screens).forEach(([key, el]) => {
            if (key === 'pause') {
                el.classList.remove('active');
            } else {
                el.classList.toggle('active', key === name);
            }
        });
        // Critical Fix: Map 'game' screen to 'playing' state so _loop & _handleAnswer execute
        this.state = (name === 'game') ? 'playing' : name;
    }

    /* ---------- Start / Pause / Home ---------- */
    _startGame() {
        this.sound._ensure();
        this.sound.playClick();

        this.score          = 0;
        this.lives          = CONFIG.LIVES;
        this.streak         = 0;
        this.maxStreak      = 0;
        this.balloonsPopped = 0;
        this.multiplier     = 1;
        this.waitingNext    = false;
        this.balloons       = [];
        this.particles      = [];
        this.popups         = [];

        this._showScreen('game');
        this._resizeCanvas();
        this._updateHUD();
        this._nextRound();

        if (this.sound.musicEnabled) this.sound.startMusic();
    }

    _togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.screens.pause.classList.add('active');
            this.sound.playClick();
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.screens.pause.classList.remove('active');
            this.lastTime = performance.now();
            this.sound.playClick();
        }
    }

    _goHome() {
        this.screens.pause.classList.remove('active');
        this.sound.stopMusic();
        this.sound.playClick();
        this.balloons = [];
        this._showScreen('start');
    }

    /* ---------- Round & Problem Generation ---------- */
    _nextRound() {
        const diff = CONFIG.DIFFICULTY[this.difficulty];
        const a = diff.minA + Math.floor(Math.random() * (diff.maxA - diff.minA + 1));
        const b = 1 + Math.floor(Math.random() * (a - 1));
        const answer = a - b;

        const wrongSet = new Set();
        let tries = 0;
        while (wrongSet.size < 2 && tries < 60) {
            let delta = Math.floor(Math.random() * 5) + 1;
            if (Math.random() < 0.5) delta = -delta;
            let candidate = answer + delta;
            if (candidate < 0) candidate = answer + Math.abs(delta) + 1;
            if (candidate !== answer) wrongSet.add(candidate);
            tries++;
        }
        while (wrongSet.size < 2) {
            wrongSet.add(answer + wrongSet.size + 1);
        }

        const answers = [answer, ...wrongSet];
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        this.problem    = { a, b, answer };
        this.answers    = answers;
        this.correctIdx = answers.indexOf(answer);

        document.getElementById('problem-text').innerHTML =
            `${a} &minus; ${b} = <span class="c-yellow">?</span>`;

        const btns = document.querySelectorAll('.answer-btn');
        btns.forEach((btn, i) => {
            btn.querySelector('.answer-num').textContent = answers[i];
            btn.classList.remove('correct-flash', 'wrong-flash');
        });

        this._spawnRoundBalloons();
    }

    /* ---------- Spawn 3 Candidate Balloons (Tap Balloon or Button) ---------- */
    _spawnRoundBalloons() {
        this.balloons = [];
        const diff = CONFIG.DIFFICULTY[this.difficulty];
        const ps = this._getPixelScale();
        const w = this.canvas.width || 360;
        const h = this.canvas.height || 640;

        // Calculate bottom deck height so balloons emerge cleanly above the answer buttons
        const deckEl = document.getElementById('arcade-deck');
        const deckH = deckEl ? deckEl.offsetHeight : 120;
        const startY = h - deckH + 35;

        const speedMult = Math.min(
            CONFIG.MAX_SPEED_MULT,
            1 + (this.score / 100) * CONFIG.SPEED_GROWTH
        );
        const baseSpeed = diff.baseSpeed * speedMult;

        // 3 horizontal lanes corresponding to Answer 1, 2, 3
        const laneWidth = w / 3;
        for (let i = 0; i < 3; i++) {
            const laneCenter = laneWidth * i + laneWidth / 2;
            const staggerY = startY + (i % 2 === 0 ? 12 : 0);
            const speed = baseSpeed * (0.96 + Math.random() * 0.08);
            const colorSet = CONFIG.SLOT_COLORS[i];

            this.balloons.push(
                new Balloon(laneCenter, staggerY, this.answers[i], i, colorSet, speed, ps, false)
            );
        }
    }

    /* ---------- Answer Validation ---------- */
    _handleAnswer(idx) {
        if (this.state !== 'playing' || this.waitingNext) return;
        if (this.balloons.length === 0) return;

        const btns = document.querySelectorAll('.answer-btn');
        const targetBalloon = this.balloons.find(b => b.slotIndex === idx && !b.popped);

        if (idx === this.correctIdx) {
            /* ---- CORRECT ANSWER ---- */
            this.waitingNext = true;
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;

            if      (this.streak >= 10) this.multiplier = 4;
            else if (this.streak >= 5)  this.multiplier = 3;
            else if (this.streak >= 3)  this.multiplier = 2;
            else                        this.multiplier = 1;

            const pts = 10 * this.multiplier;
            this.score += pts;
            this.balloonsPopped++;

            // Update equation ? with solved answer
            document.getElementById('problem-text').innerHTML =
                `${this.problem.a} &minus; ${this.problem.b} = <span class="c-green">${this.problem.answer}</span>`;

            // Pop all current balloons with celebratory burst on the correct one
            this.balloons.forEach(b => {
                b.popped = true;
                this._burstParticles(b, b.slotIndex === idx ? 28 : 10);
            });

            if (targetBalloon) {
                this._spawnScorePopups(targetBalloon.x, targetBalloon.y, pts);
            }

            this.sound.playPop(this.streak);
            this._flash('#00E436', 0.22);
            if (btns[idx]) btns[idx].classList.add('correct-flash');
            this._updateHUD();

            setTimeout(() => {
                this.waitingNext = false;
                if (this.state === 'playing') {
                    this._nextRound();
                }
            }, 480);

        } else {
            /* ---- WRONG ANSWER ---- */
            if (targetBalloon && targetBalloon.popped) return;
            if (targetBalloon) {
                targetBalloon.popped = true;
                this._burstParticles(targetBalloon, 14);
                this.popups.push(new ScorePopup(targetBalloon.x, targetBalloon.y, 'MISS!', '#FF004D'));
            }

            this.streak = 0;
            this.multiplier = 1;
            this.lives--;

            this.sound.playWrong();
            this._flash('#FF004D', 0.28);
            this._shake();
            if (btns[idx]) {
                btns[idx].classList.add('wrong-flash');
                setTimeout(() => btns[idx].classList.remove('wrong-flash'), 320);
            }

            this._updateHUD();

            if (this.lives <= 0) {
                this.waitingNext = true;
                this._gameOver();
            }
        }
    }

    _burstParticles(balloon, count = 24) {
        const colors = [balloon.color.main, balloon.color.hi, balloon.color.dk, '#FFF1E8', '#FFEC27'];
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(
                balloon.x + (Math.random() - 0.5) * balloon.width * 0.8,
                balloon.y + (Math.random() - 0.5) * balloon.height * 0.8,
                colors[Math.floor(Math.random() * colors.length)]
            ));
        }
    }

    _spawnScorePopups(cx, cy, pts) {
        this.popups.push(new ScorePopup(cx, cy - 10, `+${pts}`, '#FFEC27'));
        if (this.multiplier > 1) {
            this.popups.push(new ScorePopup(cx, cy + 14, `x${this.multiplier} BONUS`, '#FF77A8'));
        }
        if (this.streak > 0 && this.streak % 5 === 0) {
            this.popups.push(new ScorePopup(cx, cy - 34, `${this.streak} STREAK!`, '#29ADFF'));
        }
    }

    /* ---------- Visual Feedback & HUD ---------- */
    _flash(color, alpha) {
        const el = document.getElementById('flash-overlay');
        el.style.background = color;
        el.style.opacity = alpha;
        setTimeout(() => { el.style.opacity = 0; }, 130);
    }

    _shake() {
        const container = document.getElementById('game-container');
        container.classList.remove('shake');
        void container.offsetWidth;
        container.classList.add('shake');
    }

    _updateHUD() {
        document.getElementById('score-value').textContent  = this.score;
        document.getElementById('streak-value').textContent = this.streak;

        const badge = document.getElementById('multiplier-badge');
        if (this.multiplier > 1) {
            badge.classList.remove('hidden');
            badge.textContent = `x${this.multiplier}`;
        } else {
            badge.classList.add('hidden');
        }

        const hearts = document.querySelectorAll('#hud-lives .heart');
        hearts.forEach((h, i) => {
            h.classList.toggle('full', i < this.lives);
        });
    }

    _updateDangerBar(ceilingY, startY) {
        const bar = document.getElementById('danger-bar');
        if (!bar || this.balloons.length === 0) return;

        const active = this.balloons.filter(b => !b.popped);
        if (active.length === 0) return;

        const highestY = Math.min(...active.map(b => b.y));
        const totalDist = Math.max(1, startY - ceilingY);
        const remainingRatio = Math.max(0, Math.min(1, (highestY - ceilingY) / totalDist));

        bar.style.width = `${Math.floor(remainingRatio * 100)}%`;
        if (remainingRatio > 0.5)      bar.style.backgroundColor = '#00E436';
        else if (remainingRatio > 0.25) bar.style.backgroundColor = '#FFA300';
        else                            bar.style.backgroundColor = '#FF004D';
    }

    /* ---------- Game Over & High Scores ---------- */
    _gameOver() {
        this.state = 'gameover';
        this.sound.playGameOver();
        this.sound.stopMusic();

        document.getElementById('final-score').textContent  = this.score;
        document.getElementById('final-popped').textContent = this.balloonsPopped;
        document.getElementById('final-streak').textContent = this.maxStreak;

        const isNew = this._saveHighScore();
        document.getElementById('new-highscore').classList.toggle('hidden', !isNew);

        setTimeout(() => {
            this._showScreen('gameover');
        }, 550);
    }

    _loadHighScores() {
        try {
            return JSON.parse(localStorage.getItem('pixelBalloonScores')) || [];
        } catch {
            return [];
        }
    }

    _saveHighScore() {
        if (this.score <= 0) return false;
        const scores = this._loadHighScores();
        const wasTop = scores.length === 0 || this.score > (scores[0]?.score ?? 0);

        scores.push({
            score:  this.score,
            popped: this.balloonsPopped,
            streak: this.maxStreak,
            diff:   this.difficulty,
            date:   new Date().toLocaleDateString(),
        });
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 10) scores.length = 10;

        try {
            localStorage.setItem('pixelBalloonScores', JSON.stringify(scores));
        } catch {}
        return wasTop;
    }

    _showHighScores() {
        this.sound.playClick();
        const scores = this._loadHighScores();
        const list = document.getElementById('scores-list');
        list.innerHTML = '';

        if (scores.length === 0) {
            list.innerHTML = '<div class="no-scores">NO RECORDS YET. PLAY A GAME!</div>';
        } else {
            scores.forEach((s, i) => {
                const entry = document.createElement('div');
                entry.className = 'score-entry';
                entry.innerHTML = `
                    <span class="score-rank">#${i + 1}</span>
                    <span class="score-pts">${s.score} PTS</span>
                    <span class="score-diff">${(s.diff || 'EASY').toUpperCase()}</span>
                    <span class="score-date">${s.date || ''}</span>
                `;
                list.appendChild(entry);
            });
        }

        this._showScreen('highscores');
    }

    /* ──────────────────────────────────────────────────────────
       MAIN GAME LOOP (Delta-Time Normalized for 60Hz/120Hz)
       ────────────────────────────────────────────────────────── */
    _loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.gameTime += dt;

        // Always animate background clouds & effects
        for (const c of this.clouds) c.update(dt);
        for (const p of this.particles) p.update(dt);
        this.particles = this.particles.filter(p => !p.dead);
        for (const pop of this.popups) pop.update(dt);
        this.popups = this.popups.filter(pop => !pop.dead);

        if (this.state === 'playing') {
            this._updatePlaying(dt);
        } else if (this.state !== 'paused') {
            // Animate decorative balloons on Start / GameOver / HighScores screens
            for (const mb of this.menuBalloons) {
                mb.update(dt, this.gameTime);
                if (mb.y < -80) {
                    mb.y = this.canvas.height + 60;
                    mb.baseX = 40 + Math.random() * Math.max(60, this.canvas.width - 80);
                }
            }
        }

        this._render();
        requestAnimationFrame(this._loop);
    }

    _updatePlaying(dt) {
        for (const b of this.balloons) {
            b.update(dt, this.gameTime);
        }

        // Calculate ceiling below the problem banner
        const banner = document.getElementById('problem-banner');
        const ceilingY = banner ? (banner.offsetTop + banner.offsetHeight + 18) : 110;
        const deckEl = document.getElementById('arcade-deck');
        const startY = this.canvas.height - (deckEl ? deckEl.offsetHeight : 120);

        this._updateDangerBar(ceilingY, startY);

        if (this.waitingNext) return;

        // Check if the correct balloon escaped past the top banner
        const correctBalloon = this.balloons.find(b => b.slotIndex === this.correctIdx);
        if (correctBalloon && !correctBalloon.popped && correctBalloon.y < ceilingY) {
            this.waitingNext = true;
            this.lives--;
            this.streak = 0;
            this.multiplier = 1;

            this.sound.playEscape();
            this._shake();
            this._flash('#FFA300', 0.28);
            this.popups.push(new ScorePopup(correctBalloon.x, ceilingY + 20, 'ESCAPED!', '#FFA300'));

            this._updateHUD();

            if (this.lives <= 0) {
                this._gameOver();
                return;
            }

            setTimeout(() => {
                this.waitingNext = false;
                if (this.state === 'playing') {
                    this._nextRound();
                }
            }, 450);
        }
    }

    _render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (w === 0 || h === 0) return;

        // 8-Bit banded night sky
        ctx.fillStyle = '#090A1F';
        ctx.fillRect(0, 0, w, Math.floor(h * 0.35));
        ctx.fillStyle = '#0D0D2B';
        ctx.fillRect(0, Math.floor(h * 0.35), w, Math.floor(h * 0.35));
        ctx.fillStyle = '#1D2B53';
        ctx.fillRect(0, Math.floor(h * 0.70), w, Math.ceil(h * 0.30));

        // Twinkling Stars
        for (const s of this.stars) s.draw(ctx, this.gameTime);

        // Parallax Clouds
        for (const c of this.clouds) c.draw(ctx);

        // Cached Pixel Moon, Mountains & Turf
        if (this.sceneryCache) {
            ctx.drawImage(this.sceneryCache, 0, 0);
        }

        // Draw either active Gameplay Balloons or Menu Decorative Balloons
        if (this.state === 'playing' || this.state === 'paused') {
            for (const b of this.balloons) b.draw(ctx, this.gameTime);
        } else {
            for (const mb of this.menuBalloons) mb.draw(ctx, this.gameTime);
        }

        // Particles & Floating Score Popups
        for (const p of this.particles) p.draw(ctx);
        for (const pop of this.popups) pop.draw(ctx);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => new Game());
    } else {
        new Game();
    }
});