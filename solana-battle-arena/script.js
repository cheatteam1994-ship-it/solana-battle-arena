const canvas = document.getElementById("battleCanvas");
const ctx = canvas.getContext("2d");

const container = document.getElementById("gameContainer");
canvas.width = container.clientWidth;
canvas.height = container.clientHeight;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// CONFIG
const ROUND_DURATION = 10000; // 10 secondi per test
const FIRE_RATE_BASE = 1000; // ms tra proiettili
let FIRE_RATE = FIRE_RATE_BASE;

let roundActive = true;
let roundStartTime = Date.now();
let countdown = 0;
let countdownInterval;

// CONFIG API SOLANA (Helius)
const API_KEY = '86cece6e-0608-40c1-9b6f-e44ef8764a4f';
const TOKEN_ADDRESS = 'F6sFmPHVHbw3daG4SNX8BMuQ6W5sYsKmrYTvpZTupump';

// ARRAY HOLDERS
let holders = []; // unico array, niente redeclaration

// ARRAY PLAYERS
let players = [];

// -------------------------
// PLAYER CLASS
// -------------------------
class Player {
    constructor(wallet) {
        this.wallet = wallet;
        this.radius = 15;
        const angle = Math.random() * 2 * Math.PI;
        const distance = 150 + Math.random() * 200;
        this.x = centerX + distance * Math.cos(angle);
        this.y = centerY + distance * Math.sin(angle);

        this.speed = 1.5 + Math.random() * 1.5;
        this.alive = true;

        const moveAngle = Math.random() * 2 * Math.PI;
        this.vx = Math.cos(moveAngle) * this.speed;
        this.vy = Math.sin(moveAngle) * this.speed;
    }

    move() {
        if (!this.alive || !roundActive) return;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > canvas.height - this.radius) this.vy *= -1;
    }

    draw() {
        if (!this.alive) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#00ffcc";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.wallet.slice(0,4), this.x, this.y - this.radius - 5);
    }
}

// -------------------------
// ENEMY CLASS
// -------------------------
class Enemy {
    constructor() {
        this.x = centerX;
        this.y = centerY;
        this.radius = 40;
        this.angle = 0;
        this.bullets = [];
        this.lastFire = 0;
    }

    update() {
        if (!roundActive) return;
        this.angle += 0.02;
        const now = Date.now();
        if (now - this.lastFire > FIRE_RATE) {
            this.shoot();
            this.lastFire = now;
        }
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.outOfBounds);
    }

    shoot() {
        const angle = Math.random() * 2 * Math.PI;
        this.bullets.push(new Bullet(this.x, this.y, angle));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#ff3333";
        ctx.fill();
        ctx.restore();

        this.bullets.forEach(b => b.draw());
    }
}

// -------------------------
// BULLET CLASS
// -------------------------
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 3;
        this.radius = 5;
        this.outOfBounds = false;
    }

    update() {
        if (!roundActive) return;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.outOfBounds = true;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffff00";
        ctx.fill();
    }
}

// -------------------------
// ISTANZIA IL NEMICO
// -------------------------
let enemy = new Enemy();

// -------------------------
// FETCH HOLDERS DA HELIUS RPC
// -------------------------
async function fetchNewHolders() {
    try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTokenLargestAccounts",
                params: [TOKEN_ADDRESS]
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        const newHolders = data.result.value.map(item => ({ wallet: item.address }));

        const existingWallets = holders.map(h => h.wallet);
        const actuallyNew = newHolders.filter(h => !existingWallets.includes(h.wallet));
        holders.push(...actuallyNew);

        console.log(`📥 Nuovi holders arrivati: ${actuallyNew.length}`);

    } catch (error) {
        console.error('Errore durante il recupero degli holders:', error);
    }
}

// -------------------------
// START ROUND
// -------------------------
async function startRound() {
    await fetchNewHolders();
    roundActive = true;
    players = holders.map(h => new Player(h.wallet));
    roundStartTime = Date.now();
    FIRE_RATE = FIRE_RATE_BASE;
    document.getElementById("winnerDisplay").textContent = "";
    if (countdownInterval) clearInterval(countdownInterval);
    console.log("🏁 Round iniziato con", players.length, "giocatori");
}

// -------------------------
// COUNTDOWN NUOVO ROUND
// -------------------------
function startCountdown() {
    countdown = ROUND_DURATION / 1000;
    updateCountdownDisplay();

    countdownInterval = setInterval(() => {
        countdown--;
        updateCountdownDisplay();
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startRound();
        }
    }, 1000);
}

function updateCountdownDisplay() {
    document.getElementById("winnerDisplay").textContent = 
        `Nuovo round in ${countdown} s | Prossimo giocatori: ${holders.length}`;
}

// -------------------------
// GAME LOOP
// -------------------------
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();

    if (roundActive && now - roundStartTime > 5000 && players.filter(p => p.alive).length > 1) {
        FIRE_RATE = 400;
    }

    enemy.update();
    enemy.draw();
    players.forEach(p => { p.move(); p.draw(); });

    enemy.bullets.forEach(b => {
        players.forEach(p => {
            if (p.alive && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius) {
                p.alive = false;
            }
        });
    });

    const alivePlayers = players.filter(p => p.alive);
    if (roundActive && alivePlayers.length <= 1) {
        roundActive = false;
        if (alivePlayers.length === 1) {
            document.getElementById("winnerDisplay").textContent = `Vincitore: ${alivePlayers[0].wallet}`;
        } else {
            document.getElementById("winnerDisplay").textContent = `Nessun vincitore`;
        }
        startCountdown();
    }

    requestAnimationFrame(animate);
}

animate();

// -------------------------
// RESIZE CANVAS
// -------------------------
window.addEventListener("resize", () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
});