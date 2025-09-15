const canvas = document.getElementById("battleCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// CONFIG
const ROUND_DURATION = 180000; // 3 minuti
const FIRE_RATE_BASE = 1000; // ms tra proiettili
let FIRE_RATE = FIRE_RATE_BASE;
let roundStartTime = Date.now();

// PLAYER
class Player {
    constructor(wallet) {
        this.wallet = wallet;
        this.radius = 15;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // spawn lontano dal centro
        const angle = Math.random() * 2 * Math.PI;
        const distance = 200 + Math.random() * 200;
        this.x = centerX + distance * Math.cos(angle);
        this.y = centerY + distance * Math.sin(angle);

        this.speed = 1 + Math.random() * 2;
        this.alive = true;
    }

    move() {
        if (!this.alive) return;
        const angle = Math.random() * 2 * Math.PI;
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        // stay inside canvas
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    draw() {
        if (!this.alive) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#00ffcc";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.stroke();
    }
}

// ENEMY
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
        // nemico che ruota
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

// BULLETS
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

// INIT
let players = [];
let enemy = new Enemy();

function startRound() {
    players = holders.map(h => new Player(h.wallet));
    roundStartTime = Date.now();
    FIRE_RATE = FIRE_RATE_BASE;
    document.getElementById("winnerDisplay").textContent = "";
}

startRound();

// GAME LOOP
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    // aumenta rateo fuoco dopo 2 minuti se ci sono molti player
    if (now - roundStartTime > 120000 && players.filter(p => p.alive).length > 1) {
        FIRE_RATE = 400; // più veloce
    }

    enemy.update();
    enemy.draw();

    players.forEach(p => {
        p.move();
        p.draw();
    });

    // collisioni bullets
    enemy.bullets.forEach(b => {
        players.forEach(p => {
            if (p.alive && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius) {
                p.alive = false;
            }
        });
    });

    // check vincitore
    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length === 1) {
        document.getElementById("winnerDisplay").textContent = `Vincitore: ${alivePlayers[0].wallet}`;
    } else if (alivePlayers.length === 0) {
        document.getElementById("winnerDisplay").textContent = `Nessun vincitore`;
    }

    // nuovo round
    if (now - roundStartTime > ROUND_DURATION) {
        startRound();
    }

    requestAnimationFrame(animate);
}

animate();

// resize
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
