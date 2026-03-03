// --- SYSTÈME AUDIO (Mbz Commando GB) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialise = false;
let nextNoteTime = 0;
const tempo = 120; // BPM
const melody = [261.63, 293.66, 311.13, 349.23, 392.00, 311.13, 349.23, 261.63]; 
let currentNote = 0;

function resumeAudio() {
    if (!audioInitialise) {
        audioCtx.resume();
        audioInitialise = true;
        nextNoteTime = audioCtx.currentTime;
        scheduler(); // Démarre la musique de fond
    }
}

// Séquenceur pour la boucle de fond
function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        playBackgroundNote(melody[currentNote], nextNoteTime);
        nextNoteTime += 60.0 / tempo / 2; // Croches
        currentNote = (currentNote + 1) % melody.length;
    }
    setTimeout(scheduler, 25);
}

function playBackgroundNote(freq, time) {
    if (!audioInitialise || !gameRunning) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle'; 
    // La musique devient plus aiguë (une octave au dessus) quand le Boss est là
    osc.frequency.setValueAtTime(boss ? freq : freq / 2, time); 
    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.2);
}

function playShootSound() {
    if (!audioInitialise) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playExplosionSound() {
    if (!audioInitialise) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// --- MOTEUR DE JEU ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GB_DARKEST = '#0f380f';
const GB_DARK = '#306230';
const GB_LIGHT = '#8bac0f';
const GB_BG = '#9bbc0f';

let player = { x: 50, y: 144, w: 16, h: 16, hp: 3 };
let bullets = [];
let enemies = [];
let decors = []; 
let healthPacks = []; 
let boss = null; 
let score = 0;
let distanceParcourue = 0; 
let flashTimer = 0; 
let keys = {};
let gameRunning = true;

// Init décors (buissons/cailloux)
for(let i=0; i<12; i++) {
    decors.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, w: 6, h: 6 });
}

window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function spawnEnemy() {
    if (!gameRunning || boss) return; 
    enemies.push({ x: 340, y: Math.random() * (canvas.height - 20), w: 16, h: 16, lastShot: 0 });
}

function update() {
    if (!gameRunning) return;

    // Déplacements ZQSD
    if (keys['z'] && player.y > 0) player.y -= 2;
    if (keys['s'] && player.y < canvas.height - player.h) player.y += 2;
    if (keys['q'] && player.x > 0) player.x -= 2;

    // Scrolling bloqué si le Boss est là
    if (keys['d'] && !boss) {
        if (player.x < canvas.width / 2) {
            player.x += 2;
        } else {
            distanceParcourue += 1;
            enemies.forEach(en => en.x -= 2); 
            bullets.forEach(b => b.x -= 2);
            healthPacks.forEach(hp => hp.x -= 2);
            decors.forEach(d => {
                d.x -= 2;
                if (d.x < -10) {
                    d.x = canvas.width + 10;
                    d.y = Math.random() * canvas.height;
                }
            });
        }
    }

    // Apparition du Boss (Tous les 5000m)
    if (distanceParcourue > 0 && distanceParcourue % 5000 === 0 && !boss) {
        boss = { x: 340, y: 120, w: 40, h: 40, hp: 20, lastShot: 0, dir: 1 };
    }

    // IA du Boss
    if (boss) {
        if (boss.x > 250) boss.x -= 1; 
        boss.y += boss.dir * 1;
        if (boss.y < 20 || boss.y > 240) boss.dir *= -1;

        if (Date.now() - boss.lastShot > 1500) {
            bullets.push({ x: boss.x, y: boss.y + 10, dx: -3, dy: 0, owner: 'enemy' });
            bullets.push({ x: boss.x, y: boss.y + 20, dx: -3, dy: 0, owner: 'enemy' });
            bullets.push({ x: boss.x, y: boss.y + 30, dx: -3, dy: 0, owner: 'enemy' });
            boss.lastShot = Date.now();
        }
    }

    // Gestion des packs de soin (Tous les 1000m)
    if (distanceParcourue % 1000 === 0 && distanceParcourue > 0 && healthPacks.length === 0) {
        healthPacks.push({ x: 340, y: Math.random() * (canvas.height - 20), w: 10, h: 10 });
    }

    healthPacks.forEach((hp, i) => {
        if (checkCol(player, hp)) {
            player.hp++; 
            flashTimer = 15;
            healthPacks.splice(i, 1);
            playShootSound(); 
        }
        if (hp.x < -20) healthPacks.splice(i, 1);
    });

    // IA Ennemis de base
    enemies.forEach((en, index) => {
        en.x -= 0.5; 
        if (en.x < -40) enemies.splice(index, 1);
        if (Date.now() - en.lastShot > 2000) {
            bullets.push({ x: en.x, y: en.y + 8, dx: -3, dy: 0, owner: 'enemy' });
            en.lastShot = Date.now();
        }
    });

    // Collisions Balles
    bullets.forEach((b, i) => {
        b.x += b.dx;
        if (b.owner === 'player') {
            // Toucher le Boss
            if (boss && checkCol(b, boss)) {
                boss.hp--;
                bullets.splice(i, 1);
                playExplosionSound();
                if (boss.hp <= 0) {
                    boss = null;
                    score += 5000;
                    distanceParcourue += 10; 
                }
            }
            // Toucher les ennemis
            enemies.forEach((en, ei) => {
                if (checkCol(b, en)) {
                    enemies.splice(ei, 1);
                    bullets.splice(i, 1);
                    score += 100;
                    playExplosionSound();
                }
            });
        } else if (checkCol(b, player)) {
            // Le joueur est touché
            player.hp--;
            bullets.splice(i, 1);
            playExplosionSound();
            if(player.hp <= 0) {
                gameRunning = false;
                alert("MISSION ÉCHOUÉE - Score: " + score + " | Distance: " + distanceParcourue + "m");
                location.reload(); 
            }
        }
    });
}

function checkCol(a, b) {
    return a.x < b.x + (b.w || 5) && a.x + (a.w || 5) > b.x && a.y < b.y + (b.h || 5) && a.y + (a.h || 5) > b.y;
}

function draw() {
    ctx.fillStyle = GB_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = GB_LIGHT;
    decors.forEach(d => ctx.fillRect(d.x, d.y, d.w, d.h));

    healthPacks.forEach(hp => {
        ctx.fillStyle = GB_LIGHT;
        ctx.fillRect(hp.x, hp.y, hp.w, hp.h);
        ctx.fillStyle = GB_DARKEST;
        ctx.fillRect(hp.x + 4, hp.y + 2, 2, 6);
        ctx.fillRect(hp.x + 2, hp.y + 4, 6, 2);
    });

    if (boss) {
        ctx.fillStyle = GB_DARK;
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
        // Barre de vie Boss
        ctx.fillStyle = GB_DARKEST;
        ctx.fillRect(boss.x, boss.y - 10, (boss.hp / 20) * boss.w, 4);
    }

    // Dessin Joueur avec effet flash
    if (flashTimer > 0) {
        ctx.fillStyle = GB_LIGHT; 
        flashTimer--;
    } else {
        ctx.fillStyle = GB_DARKEST;
    }
    ctx.fillRect(player.x, player.y, player.w, player.h);
    
    ctx.fillStyle = GB_DARK;
    enemies.forEach(en => ctx.fillRect(en.x, en.y, en.w, en.h));

    bullets.forEach(b => {
        ctx.fillStyle = (b.owner === 'player') ? GB_DARKEST : GB_DARK;
        ctx.fillRect(b.x, b.y, 4, 4);
    });

    // HUD
    ctx.fillStyle = GB_DARKEST;
    ctx.font = "10px monospace";
    ctx.fillText(`SCORE: ${score}`, 10, 20);
    ctx.fillText(`DIST : ${distanceParcourue}m`, 10, 35);
    ctx.fillText(`VIE  : ${"♥".repeat(player.hp)}`, 10, 50);
    if(boss) ctx.fillText(`BOSS HP: ${boss.hp}`, 10, 65);
}

canvas.onclick = (e) => {
    resumeAudio();
    if (!gameRunning) { location.reload(); return; }
    bullets.push({ x: player.x + 16, y: player.y + 8, dx: 4, dy: 0, owner: 'player' });
    if (player.x > 10) player.x -= 5; // Effet de recul
    playShootSound();
};

setInterval(() => { update(); draw(); }, 1000/60);
setInterval(spawnEnemy, 1500);
