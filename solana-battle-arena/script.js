const canvas = document.getElementById("battleCanvas");
const ctx = canvas.getContext("2d");

const container = document.getElementById("gameContainer");
canvas.width = container.clientWidth;
canvas.height = container.clientHeight;

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
        // spawn lontano dal centro
        const angle = Math.random() * 2 * Math.PI;
        const distance = 150 + Math.random() * 200;
        this.x = centerX + distance * Math.cos(angle);
        this.y = centerY + distance * Math.sin(angle);

        this.speed = 1.5 + Math.random() * 1.5;
        this.alive = true;

        // movimento naturale
        const moveAngle = Math.random() * 2 * Math.PI;
        this.vx = Math.cos(moveAngle) * this.speed;
        this.vy = Math.sin(moveAngle) * this.speed;
    }

    move() {
        if (!this.alive) return;

        this.x += this.vx;
        this.y += this.vy;

        // rimbalzo sui bordi
        if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > canvas.height - this.radius) this.vy *= -1;
    }

    draw() {
        if (!this.alive) return;
        // cerchio
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#00ffcc";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.stroke();

        // wallet abbreviato (prime 4 lettere)
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.wallet.slice(0,4), this.x, this.y - this.radius - 5);
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
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
});
