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
let decors = []; // Pour les buissons et rochers
let score = 0;
let distanceParcourue = 0; // Suivi de la progression
let keys = {};
let gameRunning = true;

// Générer quelques décors au début pour remplir la "jungle"
for(let i=0; i<12; i++) {
    decors.push({ 
        x: Math.random() * canvas.width, 
        y: Math.random() * canvas.height, 
        w: 6, 
        h: 6 
    });
}

// Contrôles Clavier
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function spawnEnemy() {
    if (!gameRunning) return;
    // Spawn à droite, juste hors écran
    enemies.push({ x: 340, y: Math.random() * (canvas.height - 20), w: 16, h: 16, lastShot: 0 });
}

function update() {
    if (!gameRunning) return;

    // Déplacement Z et S (Haut/Bas)
    if (keys['z'] && player.y > 0) player.y -= 2;
    if (keys['s'] && player.y < canvas.height - player.h) player.y += 2;
    
    // Déplacement Q (Gauche)
    if (keys['q'] && player.x > 0) player.x -= 2;

    // --- LOGIQUE DE SCROLLING (Avancer vers la droite avec D) ---
    if (keys['d']) {
        if (player.x < canvas.width / 2) {
            // Le joueur avance normalement jusqu'au milieu de l'écran
            player.x += 2;
        } else {
            // Le joueur est au milieu : on fait défiler le monde entier !
            distanceParcourue += 1;
            
            // On fait reculer les ennemis, les balles et les décors
            enemies.forEach(en => en.x -= 2); 
            bullets.forEach(b => b.x -= 2);
            decors.forEach(d => {
                d.x -= 2;
                // Si un buisson sort à gauche, on le remet à droite
                if (d.x < -10) {
                    d.x = canvas.width + 10;
                    d.y = Math.random() * canvas.height;
                }
            });
        }
    }

    // IA Ennemis (Vitesse de base + comportement de tir)
    enemies.forEach((en, index) => {
        en.x -= 0.5; // Vitesse de marche lente
        if (en.x < -40) enemies.splice(index, 1);

        if (Date.now() - en.lastShot > 2000) {
            bullets.push({ x: en.x, y: en.y + 8, dx: -3, dy: 0, owner: 'enemy' });
            en.lastShot = Date.now();
        }
    });

    // Physique des balles et collisions
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
                gameRunning = false;
                alert("MISSION ÉCHOUÉE - Score: " + score + " | Distance: " + distanceParcourue + "m");
                location.reload(); 
            }
        }
    });
}

function checkCol(a, b) {
    return a.x < b.x + b.w && a.x + 5 > b.x && a.y < b.y + b.h && a.y + 5 > b.y;
}

function draw() {
    // Fond GameBoy
    ctx.fillStyle = GB_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner les décors (buissons clairs)
    ctx.fillStyle = GB_LIGHT;
    decors.forEach(d => ctx.fillRect(d.x, d.y, d.w, d.h));

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

    // HUD : Score, Distance & Vie
    ctx.fillStyle = GB_DARKEST;
    ctx.font = "10px monospace";
    ctx.fillText(`SCORE: ${score}`, 10, 20);
    ctx.fillText(`DIST : ${distanceParcourue}m`, 10, 35);
    ctx.fillText(`VIE  : ${player.hp}`, 10, 50);
}

// --- FUSION CLIC : TIR & RECUL ---
canvas.onclick = (e) => {
    resumeAudio();
    
    if (!gameRunning) {
        location.reload();
        return;
    }

    // 1. Création de la balle du joueur
    bullets.push({ 
        x: player.x + 16, 
        y: player.y + 8, 
        dx: 4, 
        dy: 0, 
        owner: 'player' 
    });

    // 2. EFFET DE RECUL
    // Le joueur est repoussé vers la gauche pour chaque tir
    if (player.x > 10) player.x -= 5; 

    // 3. Son de tir
    playShootSound();
};

// Lancement des boucles
setInterval(() => { update(); draw(); }, 1000/60);
setInterval(spawnEnemy, 1500);
