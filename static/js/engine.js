// --- SYSTÈME AUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialise = false;

function resumeAudio() {
    if (!audioInitialise) {
        audioCtx.resume();
        audioInitialise = true;
    }
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

// Palette GameBoy Originale
const GB_DARKEST = '#0f380f';
const GB_DARK = '#306230';
const GB_LIGHT = '#8bac0f';
const GB_BG = '#9bbc0f';

let player = { x: 50, y: 144, w: 16, h: 16, hp: 3 };
let bullets = [];
let enemies = [];
let score = 0;
let keys = {};

// Contrôles Clavier
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function spawnEnemy() {
    enemies.push({ x: 320, y: Math.random() * (canvas.height - 20), w: 16, h: 16, lastShot: 0 });
}

function update() {
    // Déplacement joueur (ZQSD)
    if (keys['z'] && player.y > 0) player.y -= 2;
    if (keys['s'] && player.y < canvas.height - player.h) player.y += 2;
    if (keys['q'] && player.x > 0) player.x -= 2;
    if (keys['d'] && player.x < canvas.width - player.w) player.x += 2;

    // IA Ennemis
    enemies.forEach((en, index) => {
        en.x -= 1; 
        if (en.x < -20) enemies.splice(index, 1);

        if (Date.now() - en.lastShot > 2000) {
            bullets.push({ x: en.x, y: en.y + 8, dx: -3, dy: 0, owner: 'enemy' });
            en.lastShot = Date.now();
        }
    });

    // Physique des balles
    bullets.forEach((b, i) => {
        b.x += b.dx;
        
        // Collision Joueur -> Ennemi
        if (b.owner === 'player') {
            enemies.forEach((en, ei) => {
                if (checkCol(b, en)) {
                    enemies.splice(ei, 1);
                    bullets.splice(i, 1);
                    score += 100;
                    playExplosionSound();
                }
            });
        } 
        // Collision Ennemi -> Joueur
        else if (checkCol(b, player)) {
            player.hp--;
            bullets.splice(i, 1);
            playExplosionSound();
            if(player.hp <= 0) {
                alert("MISSION ÉCHOUÉE - Score: " + score);
                location.reload(); 
            }
        }
    });
}

function checkCol(a, b) {
    return a.x < b.x + b.w && a.x + 5 > b.x && a.y < b.y + b.h && a.y + 5 > b.y;
}

function draw() {
    ctx.fillStyle = GB_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin Joueur
    ctx.fillStyle = GB_DARKEST;
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Dessin Ennemis
    ctx.fillStyle = GB_DARK;
    enemies.forEach(en => ctx.fillRect(en.x, en.y, en.w, en.h));

    // Dessin Balles
    bullets.forEach(b => {
        ctx.fillStyle = (b.owner === 'player') ? GB_DARKEST : GB_DARK;
        ctx.fillRect(b.x, b.y, 4, 4);
    });

    // Score & HP
    ctx.fillStyle = GB_DARKEST;
    ctx.font = "10px monospace";
    ctx.fillText(`SCORE: ${score}`, 10, 20);
    ctx.fillText(`VIE: ${player.hp}`, 10, 35);
}

// Tir & Activation Audio
canvas.onclick = (e) => {
    resumeAudio();
    bullets.push({ x: player.x + 16, y: player.y + 8, dx: 4, dy: 0, owner: 'player' });
    playShootSound();
};

// Boucle
setInterval(() => { update(); draw(); }, 1000/60);
setInterval(spawnEnemy, 1500);
