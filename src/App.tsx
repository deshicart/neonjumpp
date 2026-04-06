// ============================================================
// Neon Jump – Doodle Jump-style game with Enemies & Sound
// Built with Phaser 3 + React shell
// ============================================================
import { useEffect, useRef } from "react";
import Phaser from "phaser";

// ─── Constants ───────────────────────────────────────────────
const W = 400;
const H = 680;
const GRAVITY = 1400;
const JUMP_VEL = -750;
const SPRING_VEL = -1150;
const MOVE_SPEED = 280;
const PLT_W = 76;
const PLT_H = 14;
const BEST_KEY = "neonjump_best_v3";

// Colors
const C = {
  bg: 0x05050f,
  player: 0x00ffe7,
  normal: 0x1eff8e,
  moving: 0x00c8ff,
  breakable: 0xff6b35,
  spring: 0xffe600,
  boost: 0xff00ff,
  enemy: 0xff2d55,
  enemy2: 0xff9500,
  enemy3: 0xcc44ff,
  shield: 0x4cc9f0,
  jetpack: 0xf72585,
  particle: 0x00ffe7,
  star: 0xffffff,
};

// ─── Web Audio Sound Engine ──────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicNodes: (OscillatorNode | GainNode)[] = [];
  private musicInterval: ReturnType<typeof setInterval> | null = null;

  public muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  resume() {
    try { this.getCtx().resume(); } catch (_) {}
  }

  private play(
    freq: number,
    dur: number,
    vol = 0.18,
    type: OscillatorType = "sine",
    attack = 0.005,
    freqEnd?: number
  ) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      }
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.01);
    } catch (_) {}
  }

  // ── SFX ──────────────────────────────────────────────────

  jump() {
    this.play(260, 0.13, 0.12, "square", 0.005, 320);
    this.play(520, 0.08, 0.06, "sine");
  }

  spring() {
    this.play(300, 0.05, 0.15, "square", 0.003, 800);
    this.play(900, 0.15, 0.1, "sine", 0.005, 600);
    this.play(1200, 0.12, 0.07, "sine", 0.005, 400);
  }

  boost() {
    this.play(400, 0.04, 0.2, "sawtooth", 0.002, 1000);
    this.play(800, 0.1, 0.15, "square", 0.005, 1600);
    setTimeout(() => this.play(1600, 0.08, 0.1, "sine", 0.005, 800), 60);
  }

  powerUp() {
    // Rising arpeggio
    const notes = [400, 533, 640, 800, 1066];
    notes.forEach((f, i) => {
      setTimeout(() => this.play(f, 0.18, 0.16, "sine", 0.005, f * 1.05), i * 55);
    });
  }

  jetpackOn() {
    this.play(120, 0.25, 0.18, "sawtooth", 0.04, 180);
    this.play(240, 0.25, 0.08, "square", 0.04, 300);
  }

  enemyHit() {
    // Shield absorb
    this.play(800, 0.05, 0.2, "square", 0.002, 400);
    this.play(300, 0.15, 0.12, "sawtooth", 0.002, 150);
  }

  enemyStomp() {
    // Satisfying crunch when stomping enemy
    this.play(180, 0.06, 0.25, "sawtooth", 0.002, 60);
    this.play(90, 0.18, 0.2, "square", 0.005, 40);
    setTimeout(() => this.play(440, 0.1, 0.15, "sine", 0.005, 880), 60);
    setTimeout(() => this.play(880, 0.08, 0.1, "sine", 0.005, 1200), 110);
  }

  enemyShoot() {
    // Enemy fires a projectile
    this.play(600, 0.04, 0.1, "square", 0.002, 200);
    this.play(300, 0.08, 0.08, "sawtooth", 0.002, 100);
  }

  shieldBreak() {
    this.play(400, 0.08, 0.2, "square", 0.002, 200);
    this.play(200, 0.22, 0.18, "sawtooth", 0.005, 80);
    setTimeout(() => this.play(100, 0.18, 0.15, "sine"), 100);
  }

  death() {
    this.play(440, 0.1, 0.25, "sawtooth", 0.002, 220);
    setTimeout(() => this.play(330, 0.12, 0.22, "sawtooth", 0.005, 165), 100);
    setTimeout(() => this.play(220, 0.15, 0.20, "sawtooth", 0.005, 110), 200);
    setTimeout(() => this.play(110, 0.25, 0.18, "square", 0.005, 55), 320);
    setTimeout(() => this.play(55, 0.35, 0.15, "sine", 0.01, 30), 480);
  }

  breakPlatform() {
    this.play(220, 0.04, 0.15, "sawtooth", 0.002, 80);
    this.play(110, 0.12, 0.12, "square", 0.002, 50);
  }

  scoreUp() {
    this.play(880, 0.07, 0.09, "sine", 0.003, 1100);
  }

  // ── Ambient Music ─────────────────────────────────────────
  // Procedural arpeggiated bass line + lead melody

  startMusic() {
    if (this.musicInterval) return;
    const baseNotes = [55, 65.4, 73.4, 82.4]; // A1, C2, D2, E2
    const leadNotes = [220, 261.6, 293.7, 329.6, 440, 392, 349.2, 293.7];
    let beat = 0;
    let leadIdx = 0;

    this.musicInterval = setInterval(() => {
      if (this.muted) return;
      try {
        const ctx = this.getCtx();

        // Bass pulse every beat
        const bassNote = baseNotes[beat % baseNotes.length];
        this.play(bassNote, 0.28, 0.055, "sine", 0.01);
        this.play(bassNote * 2, 0.14, 0.03, "square", 0.01);

        // Hi-hat feel every other beat
        if (beat % 2 === 0) {
          try {
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const hgain = ctx.createGain();
            hgain.gain.setValueAtTime(0.025, ctx.currentTime);
            hgain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            src.connect(hgain);
            hgain.connect(this.masterGain!);
            src.start();
          } catch (_) {}
        }

        // Lead melody every 4 beats
        if (beat % 4 === 0) {
          const ln = leadNotes[leadIdx % leadNotes.length];
          this.play(ln, 0.22, 0.04, "triangle", 0.01, ln * 1.02);
          leadIdx++;
        }

        // Chord swell every 8 beats
        if (beat % 8 === 0) {
          [220, 277.2, 329.6].forEach((f, i) => {
            setTimeout(() => this.play(f, 1.8, 0.018, "sine", 0.3), i * 30);
          });
        }

        beat = (beat + 1) % 1024;
      } catch (_) {}
    }, 220); // ~272 BPM / 4 = ~68 BPM feel at 4 steps
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicNodes.forEach(n => { try { (n as any).stop?.(); } catch (_) {} });
    this.musicNodes = [];

  }

  destroy() {
    this.stopMusic();
    try { this.ctx?.close(); } catch (_) {}
    this.ctx = null;
    this.masterGain = null;
  }
}

const sfx = new SoundEngine();

// ─── Texture Generation ──────────────────────────────────────
function makeTextures(scene: Phaser.Scene) {
  const g = scene.add.graphics();

  // ── Background ──
  g.clear();
  g.fillStyle(C.bg, 1);
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const x = Phaser.Math.Between(0, W);
    const y = Phaser.Math.Between(0, H);
    const a = Phaser.Math.FloatBetween(0.2, 1.0);
    const s = Math.random() < 0.12 ? 2 : 1;
    g.fillStyle(0xffffff, a);
    g.fillRect(x, y, s, s);
  }
  // Nebula wisps
  [[80, 200, 0x0033ff, 0.04], [300, 450, 0x330055, 0.05], [150, 600, 0x002244, 0.04]].forEach(
    ([nx, ny, nc, na]) => {
      g.fillStyle(nc as number, na as number);
      g.fillEllipse(nx as number, ny as number, 120, 60);
    }
  );
  g.generateTexture("bg", W, H);

  // ── Player ──
  const PW = 38, PH = 44;
  g.clear();
  g.fillStyle(C.player, 0.15);
  g.fillEllipse(PW / 2, PH / 2, PW + 20, PH + 20);
  g.fillStyle(C.player, 1);
  g.fillEllipse(PW / 2, PH / 2 + 4, PW - 4, PH - 8);
  g.fillEllipse(PW / 2, PH / 2 - 8, PW - 8, 22);
  g.fillStyle(0x000010, 1);
  g.fillCircle(PW / 2 - 6, PH / 2 - 10, 3.5);
  g.fillCircle(PW / 2 + 6, PH / 2 - 10, 3.5);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(PW / 2 - 4.5, PH / 2 - 12, 1.5);
  g.fillCircle(PW / 2 + 7.5, PH / 2 - 12, 1.5);
  // Antenna
  g.lineStyle(2, C.player, 0.9);
  g.lineBetween(PW / 2, PH / 2 - 20, PW / 2 + 4, PH / 2 - 28);
  g.fillStyle(C.player, 1);
  g.fillCircle(PW / 2 + 4, PH / 2 - 29, 3);
  g.generateTexture("player", PW, PH);

  // ── Platforms ──
  const makePlt = (key: string, color: number, extraH = 0) => {
    const pw = PLT_W + 8, ph = PLT_H + 8 + extraH;
    g.clear();
    // Outer glow
    g.fillStyle(color, 0.15);
    g.fillRoundedRect(0, extraH, pw, PLT_H + 8, 7);
    // Main body
    g.fillStyle(color, 1);
    g.fillRoundedRect(4, extraH + 4, PLT_W, PLT_H, 5);
    // Shine
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(8, extraH + 6, PLT_W - 10, 3, 2);
    // Side edges
    g.fillStyle(color, 0.5);
    g.fillRoundedRect(4, extraH + PLT_H + 2, PLT_W, 4, 2);
    g.generateTexture(key, pw, ph);
  };
  makePlt("plt_normal",   C.normal);
  makePlt("plt_moving",   C.moving);
  makePlt("plt_break",    C.breakable);
  makePlt("plt_boost",    C.boost);

  // ── Spring Platform ──
  const sw = PLT_W + 8;
  g.clear();
  g.fillStyle(C.spring, 0.15);
  g.fillRoundedRect(0, 16, sw, PLT_H + 8, 7);
  g.fillStyle(C.spring, 1);
  g.fillRoundedRect(4, 20, PLT_W, PLT_H, 5);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(8, 22, PLT_W - 10, 3, 2);
  // Spring coil
  g.lineStyle(3, C.spring, 1);
  for (let i = 0; i < 4; i++) {
    g.lineBetween(sw / 2 - 8, 2 + i * 4, sw / 2 + 8, 2 + i * 4);
    if (i < 3) {
      g.lineBetween(sw / 2 + 8, 2 + i * 4, sw / 2 - 8, 6 + i * 4);
    }
  }
  g.fillStyle(C.spring, 1);
  g.fillRect(sw / 2 - 9, 0, 18, 4);
  g.generateTexture("plt_spring", sw, PLT_H + 8 + 16);

  // ── Enemy Type 1: Spiky Ball ──
  const ES = 32, EP = 10;
  g.clear();
  // Glow
  g.fillStyle(C.enemy, 0.25);
  g.fillCircle(ES / 2 + EP, ES / 2 + EP, ES / 2 + 8);
  // Body
  g.fillStyle(C.enemy, 1);
  g.fillCircle(ES / 2 + EP, ES / 2 + EP, ES / 2);
  // Inner highlight
  g.fillStyle(0xff6688, 0.6);
  g.fillCircle(ES / 2 + EP - 4, ES / 2 + EP - 4, ES / 4);
  // Spikes (8 directions)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cx = ES / 2 + EP, cy = ES / 2 + EP;
    const tip = ES / 2 + 10;
    g.fillStyle(C.enemy, 1);
    g.fillTriangle(
      cx + Math.cos(a) * (ES / 2 - 2), cy + Math.sin(a) * (ES / 2 - 2),
      cx + Math.cos(a + 0.35) * (ES / 2 - 4), cy + Math.sin(a + 0.35) * (ES / 2 - 4),
      cx + Math.cos(a) * tip, cy + Math.sin(a) * tip
    );
  }
  // Eyes
  const ecx = ES / 2 + EP, ecy = ES / 2 + EP;
  g.fillStyle(0xffffff, 1);
  g.fillCircle(ecx - 5, ecy - 3, 5);
  g.fillCircle(ecx + 5, ecy - 3, 5);
  g.fillStyle(0x110000, 1);
  g.fillCircle(ecx - 4, ecy - 3, 3);
  g.fillCircle(ecx + 6, ecy - 3, 3);
  // Evil brow
  g.lineStyle(2.5, 0x880000, 1);
  g.lineBetween(ecx - 9, ecy - 9, ecx - 1, ecy - 7);
  g.lineBetween(ecx + 1, ecy - 7, ecx + 9, ecy - 9);
  g.generateTexture("enemy1", ES + EP * 2, ES + EP * 2);

  // ── Enemy Type 2: Bouncer (Orange) ──
  const B2 = 28, B2P = 8;
  g.clear();
  g.fillStyle(C.enemy2, 0.22);
  g.fillCircle(B2 / 2 + B2P, B2 / 2 + B2P, B2 / 2 + 6);
  g.fillStyle(C.enemy2, 1);
  g.fillCircle(B2 / 2 + B2P, B2 / 2 + B2P, B2 / 2);
  g.fillStyle(0xffcc44, 0.5);
  g.fillCircle(B2 / 2 + B2P - 4, B2 / 2 + B2P - 4, B2 / 4);
  // Square eyes
  const b2cx = B2 / 2 + B2P, b2cy = B2 / 2 + B2P;
  g.fillStyle(0x000000, 1);
  g.fillRect(b2cx - 8, b2cy - 5, 7, 7);
  g.fillRect(b2cx + 1, b2cy - 5, 7, 7);
  g.fillStyle(C.enemy2, 1);
  g.fillRect(b2cx - 6, b2cy - 3, 3, 3);
  g.fillRect(b2cx + 3, b2cy - 3, 3, 3);
  // Zigzag mouth
  g.lineStyle(2, 0x000000, 1);
  g.lineBetween(b2cx - 7, b2cy + 5, b2cx - 3, b2cy + 2);
  g.lineBetween(b2cx - 3, b2cy + 2, b2cx + 1, b2cy + 5);
  g.lineBetween(b2cx + 1, b2cy + 5, b2cx + 5, b2cy + 2);
  g.lineBetween(b2cx + 5, b2cy + 2, b2cx + 8, b2cy + 5);
  g.generateTexture("enemy2", B2 + B2P * 2, B2 + B2P * 2);

  // ── Enemy Type 3: Ghost (Purple) ──
  const G3 = 30, G3P = 8;
  g.clear();
  g.fillStyle(C.enemy3, 0.2);
  g.fillEllipse(G3 / 2 + G3P, G3 / 2 + G3P, G3 + 12, G3 + 12);
  g.fillStyle(C.enemy3, 0.85);
  g.fillEllipse(G3 / 2 + G3P, G3 / 2 + G3P, G3, G3);
  // Wavy bottom
  g.fillStyle(C.enemy3, 0.85);
  for (let i = 0; i < 5; i++) {
    g.fillCircle(G3P + i * 8 + 4, G3 / 2 + G3P + G3 / 2 - 2, 6);
  }
  const g3cx = G3 / 2 + G3P, g3cy = G3 / 2 + G3P - 2;
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(g3cx - 6, g3cy - 4, 10, 8);
  g.fillEllipse(g3cx + 6, g3cy - 4, 10, 8);
  g.fillStyle(0x220033, 1);
  g.fillCircle(g3cx - 6, g3cy - 3, 3);
  g.fillCircle(g3cx + 6, g3cy - 3, 3);
  g.generateTexture("enemy3", G3 + G3P * 2, G3 + G3P * 2 + 4);

  // ── Projectile ──
  g.clear();
  g.fillStyle(C.enemy, 0.3);
  g.fillCircle(7, 7, 7);
  g.fillStyle(C.enemy, 1);
  g.fillCircle(7, 7, 4);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(5, 5, 2);
  g.generateTexture("projectile", 14, 14);

  // ── Jetpack power-up ──
  g.clear();
  g.fillStyle(C.jetpack, 0.3);
  g.fillEllipse(18, 20, 36, 36);
  g.fillStyle(C.jetpack, 1);
  g.fillRoundedRect(4, 6, 28, 28, 6);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(8, 9, 10, 6, 3);
  g.fillStyle(0xffaa00, 1);
  g.fillTriangle(8, 34, 14, 34, 11, 44);
  g.fillTriangle(20, 34, 26, 34, 23, 44);
  g.fillStyle(0xff4400, 0.8);
  g.fillTriangle(9, 34, 13, 34, 11, 40);
  g.fillTriangle(21, 34, 25, 34, 23, 40);
  g.generateTexture("jetpack", 36, 46);

  // ── Shield power-up ──
  g.clear();
  g.fillStyle(C.shield, 0.2);
  g.fillCircle(18, 18, 18);
  g.lineStyle(3, C.shield, 1);
  g.strokeCircle(18, 18, 14);
  g.lineStyle(2, 0xffffff, 0.5);
  g.lineBetween(18, 6, 18, 30);
  g.lineBetween(6, 18, 30, 18);
  g.fillStyle(C.shield, 0.3);
  g.fillCircle(18, 18, 8);
  g.generateTexture("shield_pu", 36, 36);

  // ── Particle dot ──
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture("dot", 8, 8);

  g.destroy();
}

// ─── Boot Scene ──────────────────────────────────────────────
class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }
  create() {
    makeTextures(this);
    this.scene.start("Start");
  }
}

// ─── Start Scene ─────────────────────────────────────────────
class StartScene extends Phaser.Scene {
  constructor() { super("Start"); }

  create() {
    this.add.image(W / 2, H / 2, "bg").setDisplaySize(W, H);

    // Floating deco platforms
    [
      { x: 60,  y: 200, t: "plt_normal" },
      { x: 310, y: 290, t: "plt_moving" },
      { x: 150, y: 400, t: "plt_spring" },
      { x: 280, y: 510, t: "plt_break"  },
    ].forEach(p => {
      const img = this.add.image(p.x, p.y, p.t).setAlpha(0.3).setScale(0.85);
      this.tweens.add({
        targets: img, x: p.x + Phaser.Math.Between(-25, 25),
        duration: Phaser.Math.Between(2000, 3500), yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    });

    // Floating enemies deco
    const demoEnemy1 = this.add.image(60, 350, "enemy1").setScale(0.7).setAlpha(0.5);
    const demoEnemy2 = this.add.image(340, 250, "enemy2").setScale(0.7).setAlpha(0.5);
    const demoEnemy3 = this.add.image(200, 480, "enemy3").setScale(0.7).setAlpha(0.4);
    [demoEnemy1, demoEnemy2, demoEnemy3].forEach((e, i) => {
      this.tweens.add({
        targets: e, y: (e.y as number) - 15, angle: i % 2 === 0 ? 10 : -10,
        duration: 1200 + i * 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    });

    // Title
    const title = this.add.text(W / 2, H * 0.17, "NEON\nLEAP", {
      fontFamily: "monospace", fontSize: "64px", color: "#00ffe7", align: "center",
      stroke: "#003333", strokeThickness: 5,
      shadow: { blur: 28, color: "#00ffe7", fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scaleX: 1.05, scaleY: 1.05, duration: 850, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.text(W / 2, H * 0.37, "Jump. Survive. Ascend.", {
      fontFamily: "monospace", fontSize: "15px", color: "#aaffee",
    }).setOrigin(0.5);

    // Demo character
    const demo = this.add.image(W / 2, H * 0.48, "player").setScale(1.6);
    this.tweens.add({ targets: demo, y: (demo.y as number) - 20, duration: 720, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Best score
    const best = parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10);
    if (best > 0) {
      this.add.text(W / 2, H * 0.62, `🏆  BEST: ${best.toLocaleString()}`, {
        fontFamily: "monospace", fontSize: "18px", color: "#ffdf00",
        shadow: { blur: 12, color: "#ffaa00", fill: true },
      }).setOrigin(0.5);
    }

    // Start button
    const btnY = H * 0.73;
    const btn = this.add.graphics();
    btn.fillStyle(C.normal, 0.9);
    btn.fillRoundedRect(W / 2 - 95, btnY - 26, 190, 52, 14);
    btn.lineStyle(2, 0xffffff, 0.5);
    btn.strokeRoundedRect(W / 2 - 95, btnY - 26, 190, 52, 14);

    const btnTxt = this.add.text(W / 2, btnY, "TAP  TO  START", {
      fontFamily: "monospace", fontSize: "20px", color: "#001500", fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btnTxt, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });

    // Warning about enemies
    this.add.text(W / 2, H * 0.83, "⚠  Stomp enemies from above to kill!", {
      fontFamily: "monospace", fontSize: "12px", color: "#ff2d55",
      shadow: { blur: 8, color: "#ff2d55", fill: true },
    }).setOrigin(0.5).setAlpha(0.85);

    this.add.text(W / 2, H * 0.90, "← → keys  |  Tap sides  |  Tilt phone", {
      fontFamily: "monospace", fontSize: "11px", color: "#ffffff",
    }).setOrigin(0.5).setAlpha(0.4);

    // Platform legend
    const items = [
      { key: "plt_normal",  label: "Normal",  col: "#1eff8e" },
      { key: "plt_moving",  label: "Moving",  col: "#00c8ff" },
      { key: "plt_break",   label: "Break",   col: "#ff6b35" },
      { key: "plt_spring",  label: "Spring",  col: "#ffe600" },
      { key: "plt_boost",   label: "Boost",   col: "#ff00ff" },
    ];
    const iw = W / items.length;
    items.forEach((it, i) => {
      const cx = iw * i + iw / 2;
      this.add.image(cx, H * 0.964, it.key).setScale(0.42);
      this.add.text(cx, H * 0.975, it.label, {
        fontFamily: "monospace", fontSize: "8px", color: it.col,
      }).setOrigin(0.5, 0).setAlpha(0.7);
    });

    // Start action
    const go = () => {
      sfx.resume();
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.time.delayedCall(280, () => this.scene.start("Game"));
    };
    btnTxt.on("pointerdown", go);
    this.input.keyboard?.once("keydown-SPACE", go);
    this.input.keyboard?.once("keydown-ENTER", go);
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}

// ─── Type Definitions ────────────────────────────────────────
type EnemyType = "spiky" | "bouncer" | "ghost";
type PlatType  = "normal" | "moving" | "breakable" | "spring" | "boost";
type PupType   = "jetpack" | "shield";

interface Platform {
  img: Phaser.GameObjects.Image;
  body: Phaser.Geom.Rectangle; // world coords
  type: PlatType;
  moveDir: number;
  broken: boolean;
  alive: boolean;
  breakAlpha: number;
}

interface Enemy {
  img: Phaser.GameObjects.Image;
  glowGfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;        // world y
  dir: number;
  type: EnemyType;
  alive: boolean;
  dying: boolean;
  speed: number;
  shootTimer: number;   // countdown ms until next shot
  shootCooldown: number;
  hp: number;           // for bouncer (takes 2 hits)
  bobOffset: number;    // phase for ghost bob
}

interface Projectile {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vy: number;
  alive: boolean;
}

interface PowerUp {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  type: PupType;
  alive: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
  isScreen?: boolean; // if true, x/y are already screen coords
}

// ─── Game Scene ──────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  // Player
  private px = W / 2;
  private py = H - 100;
  private pvx = 0;
  private pvy = 0;
  private pFacing = 1;
  private powerUp: "none" | PupType = "none";
  private powerUpTimer = 0;
  private shieldHits = 0;
  private invincible = false;
  private invTimer = 0;
  private stomping = false; // true if player is falling fast enough to stomp

  // Camera / world
  private camY = H;
  private highestPlayerY = H - 100;

  // Score
  private score = 0;
  private bestScore = 0;
  private lastScoreMilestone = 0;

  // Game objects
  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];

  // Sprites & graphics
  private playerSprite!: Phaser.GameObjects.Image;
  private shieldGfx!: Phaser.GameObjects.Graphics;
  private overlayGfx!: Phaser.GameObjects.Graphics; // for particles & glow
  private bgImg!: Phaser.GameObjects.TileSprite;

  // UI
  private scoreTxt!: Phaser.GameObjects.Text;
  private bestTxt!: Phaser.GameObjects.Text;
  private powerTxt!: Phaser.GameObjects.Text;
  private killTxt!: Phaser.GameObjects.Text;
  private dangerOverlay!: Phaser.GameObjects.Graphics;

  // Controls
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private touchL = false;
  private touchR = false;
  private tiltX = 0;
  private tiltHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  // Generation
  private genY = 0;
  private isDead = false;
  private killCount = 0;

  constructor() { super("Game"); }

  // World ↔ Screen
  private w2s(wy: number): number { return wy - (this.camY - H); }

  create() {
    this.isDead = false;
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem(BEST_KEY) ?? "0", 10);
    this.powerUp = "none";
    this.powerUpTimer = 0;
    this.shieldHits = 0;
    this.invincible = false;
    this.invTimer = 0;
    this.stomping = false;
    this.platforms = [];
    this.enemies = [];
    this.projectiles = [];
    this.powerUps = [];
    this.particles = [];
    this.touchL = false;
    this.touchR = false;
    this.tiltX = 0;
    this.camY = H;
    this.genY = H;
    this.px = W / 2;
    this.py = H - 80;
    this.pvx = 0;
    this.pvy = JUMP_VEL * 0.6;
    this.highestPlayerY = this.py;
    this.killCount = 0;
    this.lastScoreMilestone = 0;

    sfx.resume();

    // Background
    this.bgImg = this.add.tileSprite(0, 0, W, H, "bg").setOrigin(0, 0).setDepth(0);

    // Graphics layers
    this.overlayGfx = this.add.graphics().setDepth(5);

    // Danger vignette overlay
    this.dangerOverlay = this.add.graphics().setDepth(25).setAlpha(0);

    // Player sprite
    this.playerSprite = this.add.image(this.px, this.py, "player").setDepth(10);

    // Shield ring
    this.shieldGfx = this.add.graphics().setDepth(11);

    // Score UI
    this.scoreTxt = this.add.text(12, 10, "0", {
      fontFamily: "monospace", fontSize: "28px", color: "#00ffe7",
      stroke: "#002222", strokeThickness: 4,
      shadow: { blur: 12, color: "#00ffe7", fill: true },
    }).setDepth(20);

    this.bestTxt = this.add.text(W - 12, 10, `BEST: ${this.bestScore.toLocaleString()}`, {
      fontFamily: "monospace", fontSize: "14px", color: "#ffdf00",
    }).setOrigin(1, 0).setDepth(20).setAlpha(0.7);

    this.powerTxt = this.add.text(W / 2, 14, "", {
      fontFamily: "monospace", fontSize: "14px", color: "#f72585",
      shadow: { blur: 10, color: "#f72585", fill: true },
    }).setOrigin(0.5, 0).setDepth(20);

    // Kill counter
    this.killTxt = this.add.text(12, H - 36, "💀 0", {
      fontFamily: "monospace", fontSize: "14px", color: "#ff2d55",
      shadow: { blur: 8, color: "#ff2d55", fill: true },
    }).setDepth(20).setAlpha(0.8);

    // Touch zones
    const tzL = this.add.zone(0, 0, W / 2, H).setOrigin(0, 0).setDepth(30).setInteractive();
    const tzR = this.add.zone(W / 2, 0, W / 2, H).setOrigin(0, 0).setDepth(30).setInteractive();
    tzL.on("pointerdown", () => { sfx.resume(); this.touchL = true; });
    tzL.on("pointerup",   () => { this.touchL = false; });
    tzR.on("pointerdown", () => { sfx.resume(); this.touchR = true; });
    tzR.on("pointerup",   () => { this.touchR = false; });

    // Keyboard
    if (this.input.keyboard) this.keys = this.input.keyboard.createCursorKeys();

    // Device tilt
    this.tiltHandler = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) this.tiltX = Phaser.Math.Clamp(e.gamma / 28, -1, 1);
    };
    window.addEventListener("deviceorientation", this.tiltHandler);

    // Spawn starting platforms
    this.spawnPlatform(W / 2, H - 60, "normal");
    let gy = H - 60;
    for (let i = 0; i < 14; i++) {
      gy -= Phaser.Math.Between(65, 115);
      this.spawnPlatform(Phaser.Math.Between(50, W - 50), gy);
    }
    this.genY = gy;

    // Start music
    sfx.startMusic();

    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  // ── Spawners ─────────────────────────────────────────────

  private spawnPlatform(wx: number, wy: number, forceType?: PlatType) {
    const difficulty = Math.floor(this.score / 500);
    const typePool: PlatType[] = [
      "normal", "normal", "normal",
      "moving", "moving",
      "breakable",
      "spring",
      "boost",
    ];
    if (difficulty >= 3) typePool.push("breakable");
    if (difficulty >= 5) typePool.push("moving");
    const type = forceType ?? typePool[Phaser.Math.Between(0, typePool.length - 1)];
    const texKey = {
      normal:    "plt_normal",
      moving:    "plt_moving",
      breakable: "plt_break",
      spring:    "plt_spring",
      boost:     "plt_boost",
    }[type];
    const sy = this.w2s(wy);
    const img = this.add.image(wx, sy, texKey).setDepth(6).setOrigin(0.5, 0.5);
    this.platforms.push({
      img,
      body: new Phaser.Geom.Rectangle(wx - PLT_W / 2, wy - PLT_H / 2, PLT_W, PLT_H),
      type, moveDir: Math.random() < 0.5 ? 1 : -1,
      broken: false, alive: true, breakAlpha: 1,
    });
  }

  private spawnEnemy(wx: number, wy: number) {
    // Pick enemy type based on score
    const difficulty = Math.floor(this.score / 600);
    let type: EnemyType;
    if (difficulty < 2) {
      type = "spiky";
    } else if (difficulty < 4) {
      type = Math.random() < 0.6 ? "spiky" : "bouncer";
    } else {
      const r = Math.random();
      type = r < 0.4 ? "spiky" : r < 0.7 ? "bouncer" : "ghost";
    }

    const texKey = { spiky: "enemy1", bouncer: "enemy2", ghost: "enemy3" }[type];
    const speed = type === "ghost" ? 40 : type === "bouncer" ? 90 : 65;
    const sy = this.w2s(wy);
    const img = this.add.image(wx, sy, texKey).setDepth(8);
    const glowGfx = this.add.graphics().setDepth(7);

    // Ghost: slower, mostly alpha; bouncer: bounces vertically
    if (type === "ghost") img.setAlpha(0.82);

    const shootCooldown = type === "bouncer" ? 2800 : 99999; // only bouncers shoot

    this.enemies.push({
      img, glowGfx,
      x: wx, y: wy,
      dir: Math.random() < 0.5 ? 1 : -1,
      type, alive: true, dying: false,
      speed,
      shootTimer: shootCooldown * (0.5 + Math.random()),
      shootCooldown,
      hp: type === "bouncer" ? 2 : 1,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  private spawnProjectile(wx: number, wy: number) {
    const sy = this.w2s(wy);
    const img = this.add.image(wx, sy, "projectile").setDepth(9);
    this.projectiles.push({ img, x: wx, y: wy, vy: 200, alive: true });
    sfx.enemyShoot();
  }

  private spawnPowerUp(wx: number, wy: number) {
    const type: PupType = Math.random() < 0.5 ? "jetpack" : "shield";
    const sy = this.w2s(wy);
    const img = this.add.image(wx, sy, type === "jetpack" ? "jetpack" : "shield_pu").setDepth(7);
    this.powerUps.push({ img, x: wx, y: wy, type, alive: true });
  }

  // ── Particles ────────────────────────────────────────────

  private burst(wx: number, wy: number, color: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 130;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 380, maxLife: 380,
        color, size: 2 + Math.random() * 4,
      });
    }
  }

  private stompBurst(wx: number, wy: number) {
    // Large dramatic stomp burst
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      const colors = [C.enemy, C.enemy2, 0xffffff, 0xff8800];
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 600, maxLife: 600,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 5,
      });
    }
    // Ring shockwave via big particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 220,
        life: 220, maxLife: 220,
        color: 0xffffff, size: 3,
      });
    }
  }

  // ── Update ───────────────────────────────────────────────

  update(_t: number, dt: number) {
    if (this.isDead) return;
    const d = Math.min(dt, 50) / 1000;

    this.handleInput(d);
    this.updatePhysics(d);
    this.updatePlatforms(d);
    this.updateEnemies(d);
    this.updateProjectiles(d);
    this.updatePowerUps(d);
    this.updateParticles(d);
    this.updateCamera();
    this.updateScore();
    this.generateMore();
    this.cleanup();
    this.renderAll();
    this.checkDeath();
  }

  private handleInput(d: number) {
    let hDir = 0;
    if (Math.abs(this.tiltX) > 0.1)       hDir = this.tiltX;
    else if (this.touchL)                   hDir = -1;
    else if (this.touchR)                   hDir = 1;
    else if (this.keys?.left?.isDown)       hDir = -1;
    else if (this.keys?.right?.isDown)      hDir = 1;

    if (hDir !== 0) {
      this.pvx = hDir * MOVE_SPEED;
      this.pFacing = hDir > 0 ? 1 : -1;
    } else {
      this.pvx *= 0.74;
      if (Math.abs(this.pvx) < 2) this.pvx = 0;
    }
    void d;
  }

  private updatePhysics(d: number) {
    // Jetpack
    if (this.powerUp === "jetpack") {
      this.pvy = Math.max(this.pvy - 3000 * d, -620);
      this.powerUpTimer -= d * 1000;
      if (this.powerUpTimer <= 0) {
        this.powerUp = "none";
        this.burst(this.px, this.py, C.jetpack, 10);
      }
      // Flame particles
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: this.px + (Math.random() - 0.5) * 12,
          y: this.py + 22,
          vx: (Math.random() - 0.5) * 45,
          vy: 90 + Math.random() * 110,
          life: 220, maxLife: 220,
          color: Math.random() < 0.5 ? 0xff6600 : 0xffcc00,
          size: 2 + Math.random() * 3,
        });
      }
    } else {
      this.pvy += GRAVITY * d;
    }

    this.pvy = Math.min(this.pvy, 1600);

    // Mark stomping (falling fast enough)
    this.stomping = this.pvy > 200;

    this.py += this.pvy * d;
    this.px += this.pvx * d;

    // Wrap X
    if (this.px < -20)    this.px = W + 20;
    else if (this.px > W + 20) this.px = -20;

    // Invincibility timer
    if (this.invincible) {
      this.invTimer -= d * 1000;
      if (this.invTimer <= 0) this.invincible = false;
    }

    // Shield power-up timer for jetpack
    if (this.powerUp === "shield" && this.shieldHits <= 0) {
      this.powerUp = "none";
      this.shieldGfx.clear();
    }

    // Platform collisions (only when falling)
    if (this.pvy >= 0) {
      for (const p of this.platforms) {
        if (!p.alive || p.broken) continue;
        const pb = p.body;
        const pLeft = this.px - 14;
        const pRight = this.px + 14;
        const pBottom = this.py + 22;
        const pPrevBottom = pBottom - this.pvy * d;

        if (pRight < pb.left + 3 || pLeft > pb.right - 3) continue;
        if (pBottom < pb.top - 2 || pPrevBottom > pb.bottom + 4) continue;

        // Land on platform
        this.py = pb.top - 22;

        if (p.type === "breakable") {
          p.broken = true;
          this.pvy = JUMP_VEL;
          this.burst(this.px, this.py + 22, C.breakable, 14);
          sfx.breakPlatform();
          this.time.delayedCall(300, () => { p.alive = false; });
        } else if (p.type === "spring") {
          this.pvy = SPRING_VEL;
          this.burst(this.px, this.py + 22, C.spring, 16);
          sfx.spring();
        } else if (p.type === "boost") {
          this.pvy = JUMP_VEL * 1.28;
          this.burst(this.px, this.py + 22, C.boost, 16);
          sfx.boost();
        } else {
          this.pvy = JUMP_VEL;
          this.burst(this.px, this.py + 22, C.particle, 8);
          sfx.jump();
        }
        break;
      }
    }
  }

  private updatePlatforms(d: number) {
    const spd = 78 * d;
    for (const p of this.platforms) {
      if (!p.alive) continue;
      if (p.type === "moving") {
        p.body.x += spd * p.moveDir;
        if (p.body.x + PLT_W > W - 5) { p.body.x = W - 5 - PLT_W; p.moveDir = -1; }
        if (p.body.x < 5)             { p.body.x = 5; p.moveDir = 1; }
      }
      const sy = this.w2s(p.body.y + PLT_H / 2);
      const sx = p.body.x + PLT_W / 2;
      p.img.setPosition(sx, sy);
      if (p.broken) {
        p.breakAlpha -= d * 3;
        p.img.setAlpha(Math.max(p.breakAlpha, 0));
      }
    }
  }

  private updateEnemies(d: number) {
    const now = this.time.now;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.dying) continue;

      // Movement per type
      if (e.type === "spiky") {
        e.x += e.speed * d * e.dir;
        if (e.x > W - 22 || e.x < 22) { e.dir *= -1; e.img.setFlipX(e.dir < 0); }
      } else if (e.type === "bouncer") {
        e.x += e.speed * d * e.dir;
        if (e.x > W - 22 || e.x < 22) { e.dir *= -1; e.img.setFlipX(e.dir < 0); }
        // Bouncer also bobs vertically
        e.y += Math.sin(now / 400 + e.bobOffset) * 0.8;
        // Shoot projectile
        e.shootTimer -= d * 1000;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.shootCooldown + Phaser.Math.Between(-400, 400);
          this.spawnProjectile(e.x, e.y + 20);
        }
      } else if (e.type === "ghost") {
        // Ghost drifts toward player horizontally
        const dx = this.px - e.x;
        e.x += (dx > 0 ? 1 : -1) * e.speed * d;
        // Bob vertically
        e.y += Math.sin(now / 600 + e.bobOffset) * 0.5;
        // Flicker alpha
        e.img.setAlpha(0.7 + Math.sin(now / 200 + e.bobOffset) * 0.15);
      }

      // Update screen position
      const sy = this.w2s(e.y);
      e.img.setPosition(e.x, sy);

      // Glow
      e.glowGfx.clear();
      const glowColor = { spiky: C.enemy, bouncer: C.enemy2, ghost: C.enemy3 }[e.type];
      const glowAlpha = e.type === "ghost" ? 0.12 : 0.18;
      const glowRadius = e.type === "spiky" ? 28 : 22;
      e.glowGfx.fillStyle(glowColor, glowAlpha);
      e.glowGfx.fillCircle(e.x, sy, glowRadius + Math.sin(now / 300 + e.bobOffset) * 4);

      // Rotate spiky enemies
      if (e.type === "spiky") {
        e.img.setAngle(e.img.angle + e.dir * 60 * d);
      }

      // ── Collision with player ──
      if (!this.invincible) {
        const dx = Math.abs(e.x - this.px);
        const dy = Math.abs(e.y - this.py);
        const hitRadius = e.type === "ghost" ? 20 : e.type === "bouncer" ? 18 : 22;

        if (dx < hitRadius && dy < hitRadius) {
          // Is the player stomping from above?
          const playerBottom = this.py + 22;
          const isStomp = this.stomping && playerBottom < e.y + 8 && this.pvy > 100;

          if (isStomp) {
            // Stomp kill!
            this.killEnemy(e);
          } else {
            // Enemy hits player
            if (this.powerUp === "shield" && this.shieldHits > 0) {
              this.shieldHits--;
              this.invincible = true;
              this.invTimer = 1400;
              this.cameras.main.shake(140, 0.014);
              sfx.enemyHit();
              if (this.shieldHits <= 0) {
                this.powerUp = "none";
                this.shieldGfx.clear();
                sfx.shieldBreak();
              }
            } else {
              this.triggerDeath();
              return;
            }
          }
        }
      }
    }
  }

  private killEnemy(e: Enemy) {
    if (e.dying || !e.alive) return;
    e.dying = true;
    e.alive = false;
    this.killCount++;
    this.killTxt.setText(`💀 ${this.killCount}`);

    // Stomp bounce
    this.pvy = JUMP_VEL * 0.8;
    sfx.enemyStomp();

    // Flash white
    e.img.setTint(0xffffff);
    this.stompBurst(e.x, e.y);

    // Score bonus
    this.score += 200;

    // Floating +200 text
    const bonusTxt = this.add.text(e.x, this.w2s(e.y) - 20, "+200", {
      fontFamily: "monospace", fontSize: "18px", color: "#ffdf00",
      stroke: "#332200", strokeThickness: 3,
      shadow: { blur: 10, color: "#ffaa00", fill: true },
    }).setOrigin(0.5).setDepth(22);
    this.tweens.add({
      targets: bonusTxt, y: this.w2s(e.y) - 80, alpha: 0,
      duration: 900, ease: "Power2",
      onComplete: () => bonusTxt.destroy(),
    });

    // Tween death
    this.tweens.add({
      targets: [e.img, e.glowGfx],
      scaleX: 2.2, scaleY: 2.2, alpha: 0,
      duration: 340, ease: "Power3",
      onComplete: () => { e.img.destroy(); e.glowGfx.destroy(); },
    });
    this.cameras.main.shake(80, 0.01);
  }

  private updateProjectiles(d: number) {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.y += proj.vy * d;
      proj.img.setPosition(proj.x, this.w2s(proj.y));
      proj.img.setAngle(proj.img.angle + 200 * d);

      // Hit player
      if (!this.invincible) {
        const dx = Math.abs(proj.x - this.px);
        const dy = Math.abs(proj.y - this.py);
        if (dx < 18 && dy < 18) {
          proj.alive = false;
          proj.img.destroy();
          if (this.powerUp === "shield" && this.shieldHits > 0) {
            this.shieldHits--;
            this.invincible = true;
            this.invTimer = 1200;
            this.burst(this.px, this.py, C.shield, 8);
            sfx.enemyHit();
            if (this.shieldHits <= 0) { this.powerUp = "none"; this.shieldGfx.clear(); sfx.shieldBreak(); }
          } else {
            this.triggerDeath();
            return;
          }
        }
      }
    }
    // Remove off-screen projectiles
    this.projectiles = this.projectiles.filter(p => {
      if (!p.alive) return false;
      const sy = this.w2s(p.y);
      if (sy > H + 50 || sy < -50) { p.img.destroy(); return false; }
      return true;
    });
  }

  private updatePowerUps(d: number) {
    for (const pu of this.powerUps) {
      if (!pu.alive) continue;
      pu.img.setPosition(pu.x, this.w2s(pu.y) + Math.sin(this.time.now / 600) * 8);
      pu.img.setAngle(Math.sin(this.time.now / 900) * 10);

      const dx = Math.abs(pu.x - this.px);
      const dy = Math.abs(pu.y - this.py);
      if (dx < 28 && dy < 28) {
        pu.alive = false;
        pu.img.destroy();
        this.powerUp = pu.type;
        if (pu.type === "jetpack") { this.powerUpTimer = 3400; sfx.jetpackOn(); }
        if (pu.type === "shield")  { this.shieldHits = 3; }
        this.burst(this.px, this.py, pu.type === "jetpack" ? C.jetpack : C.shield, 18);
        sfx.powerUp();
      }
    }
    void d;
  }

  private updateParticles(d: number) {
    const ms = d * 1000;
    for (const p of this.particles) {
      p.life -= ms;
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += 260 * d;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateCamera() {
    const targetCamY = this.py + H * 0.45;
    if (targetCamY < this.camY) {
      this.camY = targetCamY;
      this.bgImg.tilePositionY = -this.camY * 0.28;
    }
  }

  private updateScore() {
    if (this.py < this.highestPlayerY) {
      const diff = this.highestPlayerY - this.py;
      this.score += diff * 0.055;
      this.highestPlayerY = this.py;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem(BEST_KEY, Math.floor(this.bestScore).toString());
        this.bestTxt.setText(`BEST: ${Math.floor(this.bestScore).toLocaleString()}`);
      }
    }
    this.scoreTxt.setText(Math.floor(this.score).toLocaleString());

    // Milestones
    const milestone = Math.floor(this.score / 1000);
    if (milestone > this.lastScoreMilestone) {
      this.lastScoreMilestone = milestone;
      sfx.scoreUp();
      const mTxt = this.add.text(W / 2, H / 2 - 60, `${milestone * 1000}!`, {
        fontFamily: "monospace", fontSize: "36px", color: "#00ffe7",
        shadow: { blur: 20, color: "#00ffe7", fill: true },
      }).setOrigin(0.5).setDepth(22);
      this.tweens.add({
        targets: mTxt, y: H / 2 - 140, alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: 1100, ease: "Power2",
        onComplete: () => mTxt.destroy(),
      });
    }

    // Power-up text
    if (this.powerUp === "jetpack") {
      const s = (this.powerUpTimer / 1000).toFixed(1);
      this.powerTxt.setText(`⚡ JETPACK ${s}s`).setColor("#f72585");
    } else if (this.powerUp === "shield") {
      this.powerTxt.setText(`🛡 SHIELD ×${this.shieldHits}`).setColor("#4cc9f0");
    } else {
      this.powerTxt.setText("");
    }

    // Danger vignette near death
    const screenY = this.w2s(this.py);
    const danger = Phaser.Math.Clamp((screenY - H * 0.7) / (H * 0.35), 0, 1);
    this.dangerOverlay.clear();
    if (danger > 0) {
      this.dangerOverlay.setAlpha(danger * 0.5);
      this.dangerOverlay.fillStyle(0xff0000, 1);
      this.dangerOverlay.fillRect(0, 0, W, H);
    } else {
      this.dangerOverlay.setAlpha(0);
    }
  }

  private generateMore() {
    const topWorldY = this.camY - H;
    while (this.genY > topWorldY - H * 2) {
      const difficulty = Math.floor(this.score / 500);
      const minGap = Math.min(68 + difficulty * 5, 120);
      const maxGap = Math.min(128 + difficulty * 7, 210);
      const gap = Phaser.Math.Between(minGap, maxGap);
      this.genY -= gap;
      const x = Phaser.Math.Between(50, W - 50);
      this.spawnPlatform(x, this.genY);

      // ── Enemy spawn logic ──
      // Enemies start from score 300, frequency increases with difficulty
      const enemyChance = Math.min(0.06 + difficulty * 0.028, 0.30);
      if (this.score > 300 && Math.random() < enemyChance) {
        const ex = Phaser.Math.Between(30, W - 30);
        this.spawnEnemy(ex, this.genY - Phaser.Math.Between(30, 70));
      }

      // Power-ups
      if (Math.random() < 0.055) {
        this.spawnPowerUp(x, this.genY - 40);
      }
    }
  }

  private cleanup() {
    const cutoffWorld = this.camY + 180;
    const cutoffScreen = H + 220;

    this.platforms = this.platforms.filter(p => {
      if (p.body.y > cutoffWorld || (!p.alive && p.breakAlpha <= 0)) {
        p.img.destroy(); return false;
      }
      return true;
    });

    this.enemies = this.enemies.filter(e => {
      if (!e.alive && !e.dying) { return false; }
      const sy = this.w2s(e.y);
      if (sy > cutoffScreen) {
        if (e.alive) { e.img.destroy(); e.glowGfx.destroy(); }
        return false;
      }
      return true;
    });

    this.powerUps = this.powerUps.filter(pu => {
      if (!pu.alive) return false;
      if (this.w2s(pu.y) > cutoffScreen) { pu.img.destroy(); return false; }
      return true;
    });
  }

  private renderAll() {
    this.overlayGfx.clear();
    const now = this.time.now;

    // ── Particles ──
    for (const p of this.particles) {
      const a = p.life / p.maxLife;
      const sy = this.w2s(p.y);
      this.overlayGfx.fillStyle(p.color, a);
      this.overlayGfx.fillCircle(p.x, sy, Math.max(p.size * a, 0.5));
    }

    // ── Platform special glow ──
    for (const p of this.platforms) {
      if (!p.alive) continue;
      if (p.type === "spring" || p.type === "boost" || p.type === "moving") {
        const col = p.type === "spring" ? C.spring : p.type === "boost" ? C.boost : C.moving;
        const sy = this.w2s(p.body.y + PLT_H / 2);
        const sx = p.body.x + PLT_W / 2;
        const pulse = 0.18 + Math.sin(now / 400 + sx) * 0.08;
        this.overlayGfx.fillStyle(col, pulse);
        this.overlayGfx.fillEllipse(sx, sy, PLT_W + 12, 18);
      }
    }

    // ── Player ──
    this.playerSprite.setPosition(this.px, this.w2s(this.py));
    this.playerSprite.setFlipX(this.pFacing < 0);

    // Squish/stretch
    if (this.pvy < -100)      this.playerSprite.setScale(1.15, 0.86);
    else if (this.pvy > 250)  this.playerSprite.setScale(0.87, 1.13);
    else                      this.playerSprite.setScale(1, 1);

    // Invincible flicker
    if (this.invincible) {
      this.playerSprite.setAlpha(Math.sin(now / 75) > 0 ? 1 : 0.25);
    } else {
      this.playerSprite.setAlpha(1);
    }

    // Jetpack glow on player
    if (this.powerUp === "jetpack") {
      const pulse = 0.2 + Math.sin(now / 80) * 0.1;
      this.overlayGfx.fillStyle(C.jetpack, pulse);
      this.overlayGfx.fillEllipse(this.px, this.w2s(this.py), 56, 56);
    }

    // ── Shield ring ──
    this.shieldGfx.clear();
    if (this.powerUp === "shield") {
      const a = Math.min(this.shieldHits / 3, 1);
      const pulse = Math.sin(now / 200) * 0.15;
      this.shieldGfx.lineStyle(3 + pulse * 2, C.shield, a);
      this.shieldGfx.strokeCircle(this.px, this.w2s(this.py), 38 + pulse * 4);
      this.shieldGfx.lineStyle(1, C.shield, a * 0.35);
      this.shieldGfx.strokeCircle(this.px, this.w2s(this.py), 48 + pulse * 5);
    }

    // ── Enemy health bars (bouncers only) ──
    for (const e of this.enemies) {
      if (!e.alive || e.dying || e.type !== "bouncer") continue;
      if (e.hp < 2) {
        const sy = this.w2s(e.y);
        const bw = 30, bh = 4;
        this.overlayGfx.fillStyle(0x333333, 0.8);
        this.overlayGfx.fillRect(e.x - bw / 2, sy - 28, bw, bh);
        this.overlayGfx.fillStyle(C.enemy2, 1);
        this.overlayGfx.fillRect(e.x - bw / 2, sy - 28, bw * (e.hp / 2), bh);
      }
    }

    // ── Projectile glow ──
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      const sy = this.w2s(proj.y);
      this.overlayGfx.fillStyle(C.enemy, 0.22);
      this.overlayGfx.fillCircle(proj.x, sy, 12);
    }
  }

  private checkDeath() {
    const screenY = this.w2s(this.py);
    if (screenY > H + 80) this.triggerDeath();
  }

  private triggerDeath() {
    if (this.isDead) return;
    this.isDead = true;
    sfx.stopMusic();
    sfx.death();
    this.cameras.main.shake(200, 0.02);

    // Death tween
    this.tweens.add({
      targets: this.playerSprite,
      angle: 180, alpha: 0, y: this.w2s(this.py) + 80,
      scaleX: 1.5, scaleY: 1.5,
      duration: 750, ease: "Power2",
    });

    this.time.delayedCall(950, () => {
      this.scene.start("GameOver", {
        score: Math.floor(this.score),
        best: Math.floor(this.bestScore),
        kills: this.killCount,
      });
    });
  }

  shutdown() {
    sfx.stopMusic();
    if (this.tiltHandler) window.removeEventListener("deviceorientation", this.tiltHandler);
    this.tiltHandler = null;
  }
}

// ─── Game Over Scene ─────────────────────────────────────────
class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  create(data: { score: number; best: number; kills: number }) {
    const score = data?.score ?? 0;
    const best  = data?.best  ?? 0;
    const kills = data?.kills ?? 0;

    this.add.image(W / 2, H / 2, "bg").setDisplaySize(W, H).setAlpha(0.55);

    const ov = this.add.graphics();
    ov.fillStyle(0x000000, 0.7);
    ov.fillRect(0, 0, W, H);

    // Panel
    const panelW = 310, panelH = 400;
    const panelX = (W - panelW) / 2, panelY = (H - panelH) / 2 - 20;
    const panel = this.add.graphics();
    panel.fillStyle(0x0a0a22, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    panel.lineStyle(2, C.player, 0.7);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);
    // Inner accent line
    panel.lineStyle(1, C.normal, 0.2);
    panel.strokeRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 14);

    // Title
    this.add.text(W / 2, panelY + 36, "GAME OVER", {
      fontFamily: "monospace", fontSize: "34px", color: "#ff2d55",
      stroke: "#330011", strokeThickness: 4,
      shadow: { blur: 20, color: "#ff2d55", fill: true },
    }).setOrigin(0.5);

    // Dead player sprite
    const deadPlayer = this.add.image(W / 2, panelY + 88, "player")
      .setScale(1.4).setAngle(180).setAlpha(0.8).setTint(0xff2d55);
    this.tweens.add({ targets: deadPlayer, scaleX: 1.5, scaleY: 1.5, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });

    // Score
    this.add.text(W / 2, panelY + 130, "SCORE", {
      fontFamily: "monospace", fontSize: "13px", color: "#8888aa",
    }).setOrigin(0.5);
    this.add.text(W / 2, panelY + 158, score.toLocaleString(), {
      fontFamily: "monospace", fontSize: "46px", color: "#00ffe7",
      shadow: { blur: 16, color: "#00ffe7", fill: true },
    }).setOrigin(0.5);

    // Best
    const isNew = score >= best && score > 0;
    const bestTxt = this.add.text(W / 2, panelY + 210, isNew ? "🏆 NEW BEST!" : `BEST: ${best.toLocaleString()}`, {
      fontFamily: "monospace", fontSize: isNew ? "20px" : "16px", color: "#ffdf00",
      shadow: { blur: 10, color: "#ffaa00", fill: true },
    }).setOrigin(0.5);
    if (isNew) {
      this.tweens.add({ targets: bestTxt, scaleX: 1.1, scaleY: 1.1, duration: 400, yoyo: true, repeat: -1 });
    }

    // Kill count
    this.add.text(W / 2, panelY + 248, `💀 Enemies stomped: ${kills}`, {
      fontFamily: "monospace", fontSize: "14px", color: "#ff6688",
    }).setOrigin(0.5).setAlpha(0.9);

    // Divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, C.player, 0.25);
    divGfx.lineBetween(panelX + 20, panelY + 272, panelX + panelW - 20, panelY + 272);

    // Restart button
    const btnY = panelY + panelH - 55;
    const btnGfx = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnGfx.clear();
      btnGfx.fillStyle(hover ? 0x00ffaa : C.normal, hover ? 1 : 0.92);
      btnGfx.fillRoundedRect(W / 2 - 105, btnY - 24, 210, 48, 12);
      btnGfx.lineStyle(2, 0xffffff, hover ? 0.6 : 0.3);
      btnGfx.strokeRoundedRect(W / 2 - 105, btnY - 24, 210, 48, 12);
    };
    drawBtn(false);
    const btnTxt = this.add.text(W / 2, btnY, "▶  PLAY AGAIN", {
      fontFamily: "monospace", fontSize: "20px", color: "#001500", fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(22);
    btnTxt.on("pointerover", () => drawBtn(true));
    btnTxt.on("pointerout",  () => drawBtn(false));
    btnTxt.on("pointerdown", () => this.restartGame());
    this.input.keyboard?.once("keydown-SPACE", () => this.restartGame());
    this.input.keyboard?.once("keydown-ENTER", () => this.restartGame());

    // Menu link
    const menuTxt = this.add.text(W / 2, panelY + panelH + 30, "← Main Menu", {
      fontFamily: "monospace", fontSize: "15px", color: "#8888cc",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0.7).setDepth(22);
    menuTxt.on("pointerdown", () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(250, () => this.scene.start("Start"));
    });

    // Floating enemy sprites for flavor
    const enemyKeys = ["enemy1", "enemy2", "enemy3"];
    for (let i = 0; i < 5; i++) {
      const ex = Phaser.Math.Between(10, W - 10);
      const ey = Phaser.Math.Between(10, H - 10);
      const eImg = this.add.image(ex, ey, enemyKeys[i % 3]).setScale(0.45).setAlpha(0.12).setDepth(1);
      this.tweens.add({
        targets: eImg, y: ey - Phaser.Math.Between(15, 30), angle: Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(1500, 2500), yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }

    // Confetti particles if new best
    if (isNew) {
      this.time.addEvent({
        delay: 80, loop: true,
        callback: () => {
          const x = Phaser.Math.Between(panelX, panelX + panelW);
          const dot = this.add.graphics().setDepth(23);
          const col = [0x00ffe7, C.normal, 0xffdf00, 0xff2d55, 0xff9500][Phaser.Math.Between(0, 4)];
          dot.fillStyle(col, 0.9);
          dot.fillRect(0, 0, 5, 5);
          dot.setPosition(x, panelY - 10);
          this.tweens.add({
            targets: dot, y: panelY + panelH + 10, alpha: 0,
            x: x + Phaser.Math.Between(-40, 40),
            duration: Phaser.Math.Between(600, 1200),
            onComplete: () => dot.destroy(),
          });
        },
      });
    }

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private restartGame() {
    sfx.resume();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(250, () => this.scene.start("Game"));
  }
}

// ─── React Entry Point ───────────────────────────────────────
export default function App() {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current || !ref.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: W,
      height: H,
      parent: ref.current,
      backgroundColor: "#05050f",
      scene: [BootScene, StartScene, GameScene, GameOverScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: W,
        height: H,
      },
      render: {
        antialias: false,
        roundPixels: true,
      },
      fps: { target: 60 },
      input: { activePointers: 3 },
      disableContextMenu: true,
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#05050f",
        overflow: "hidden",
        touchAction: "none",
      }}
    />
  );
}
