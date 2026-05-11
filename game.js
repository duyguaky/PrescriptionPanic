const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

let gameState = "start";
let keys = {};
let score = 0;
let level = 1;
let lives = 3;
let delivered = 0;
let message = "";
let messageTimer = 0;
let lastTime = 0;
let spawnTimer = 0;
let bonusTimer = 0;

const skinTones = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524"];
const shirtColors = ["#5DADE2", "#58D68D", "#F5B041", "#AF7AC5", "#EC7063"];
const hairColors = ["#2d2d2d", "#5d4037", "#a1887f", "#1f1f1f"];

const medicines = [
  { name: "Painkiller", short: "P", color: "#ff6b6b", icon: "💊" },
  { name: "Vitamin", short: "V", color: "#ffd93d", icon: "🍋" },
  { name: "Syrup", short: "S", color: "#6bcB77", icon: "🧪" },
  { name: "Antibiotic", short: "A", color: "#4d96ff", icon: "💉" },
  { name: "Cream", short: "C", color: "#b983ff", icon: "🧴" }
];

const player = {
  x: 485,
  y: 330,
  w: 48,
  h: 78,
  speed: 250,
  carry: null,
  boost: 0,
  invincible: 0,
  step: 0
};

let shelves = [];
let patients = [];
let obstacles = [];
let bonuses = [];
let particles = [];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resetGame() {
  gameState = "playing";
  score = 0;
  level = 1;
  lives = 3;
  delivered = 0;
  message = "";
  messageTimer = 0;
  spawnTimer = 0;
  bonusTimer = 0;
  patients = [];
  obstacles = [];
  bonuses = [];
  particles = [];

  player.x = 485;
  player.y = 330;
  player.carry = null;
  player.boost = 0;
  player.invincible = 0;
  player.step = 0;

  createShelves();
  createObstacles();
  spawnPatient();
}

function createShelves() {
  shelves = [];
  const startY = 115;

  for (let i = 0; i < medicines.length; i++) {
    shelves.push({
      x: 34,
      y: startY + i * 90,
      w: 175,
      h: 64,
      med: medicines[i],
      pulse: Math.random() * 10
    });
  }
}

function createObstacles() {
  obstacles = [
    {
      x: 325,
      y: 190,
      w: 74,
      h: 44,
      direction: 1,
      baseSpeed: 55,
      minX: 285,
      maxX: 670
    },
    {
      x: 575,
      y: 430,
      w: 74,
      h: 44,
      direction: -1,
      baseSpeed: 65,
      minX: 285,
      maxX: 670
    }
  ];
}

function findAvailablePatientSlot(maxPatients) {
  const usedSlots = patients.map(p => p.slot);

  for (let i = 0; i < maxPatients; i++) {
    if (!usedSlots.includes(i)) {
      return i;
    }
  }

  return -1;
}

function spawnPatient() {
  /*
    Balanced level system:
    Level 1: one patient, one medicine.
    Level 2: one patient, sometimes two medicines.
    Level 3-4: two patients can wait.
    Level 5-6: two patients, more two-medicine prescriptions.
    Level 7+: three patients can wait.
    Level 10+: four patients can wait.
  */

  let maxPatients = 1;

  if (level >= 3) maxPatients = 2;
  if (level >= 7) maxPatients = 3;
  if (level >= 10) maxPatients = 4;

  if (patients.length >= maxPatients) return;

  const slot = findAvailablePatientSlot(maxPatients);

  if (slot === -1) return;

  let medicineCount = 1;

  if (level >= 2) {
    medicineCount = Math.random() < 0.30 ? 2 : 1;
  }

  if (level >= 5) {
    medicineCount = Math.random() < 0.50 ? 2 : 1;
  }

  if (level >= 9) {
    medicineCount = Math.random() < 0.15 ? 3 : medicineCount;
  }

  let prescription = [];

  for (let i = 0; i < medicineCount; i++) {
    const med = medicines[Math.floor(Math.random() * medicines.length)];
    prescription.push(med.short);
  }

  const spotY = 110 + slot * 112;
  const patienceTime = Math.max(13, 26 - level * 0.9);

  patients.push({
    slot,
    x: 790,
    y: spotY,
    w: 160,
    h: 88,
    prescription,
    original: [...prescription],
    patience: patienceTime,
    maxPatience: patienceTime,
    bob: Math.random() * 10,
    skin: randomFrom(skinTones),
    shirt: randomFrom(shirtColors),
    hair: randomFrom(hairColors)
  });
}

function spawnBonus() {
  const type = Math.random() < 0.55 ? "time" : "speed";

  const safeZones = [
    { xMin: 270, xMax: 700, yMin: 105, yMax: 215 },
    { xMin: 270, xMax: 700, yMin: 330, yMax: 540 }
  ];

  const zone = safeZones[Math.floor(Math.random() * safeZones.length)];

  bonuses.push({
    x: zone.xMin + Math.random() * (zone.xMax - zone.xMin),
    y: zone.yMin + Math.random() * (zone.yMax - zone.yMin),
    r: 17,
    type,
    angle: 0,
    life: 10
  });
}

function rectsCollide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function circleRectCollide(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return dx * dx + dy * dy < circle.r * circle.r;
}

function update(dt) {
  if (gameState !== "playing") return;

  const speed = player.boost > 0 ? player.speed * 1.55 : player.speed;

  let moving = false;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    player.x -= speed * dt;
    moving = true;
  }

  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    player.x += speed * dt;
    moving = true;
  }

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    player.y -= speed * dt;
    moving = true;
  }

  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    player.y += speed * dt;
    moving = true;
  }

  if (moving) {
    player.step += dt * 10;
  }

  player.x = Math.max(16, Math.min(W - player.w - 16, player.x));
  player.y = Math.max(88, Math.min(H - player.h - 20, player.y));

  if (player.boost > 0) player.boost -= dt;
  if (player.invincible > 0) player.invincible -= dt;

  updateShelves(dt);
  updatePatients(dt);
  updateObstacles(dt);
  updateBonuses(dt);
  updateParticles(dt);

  spawnTimer += dt;

  /*
    Hasta gelme süresi:
    İlk levellerde hasta daha hızlı gelir.
    Ama aynı anda gelebilecek hasta sayısı level sistemine bağlı kalır.
  */
  const spawnLimit = Math.max(1.8, 3.6 - level * 0.18);

  if (spawnTimer > spawnLimit) {
    spawnPatient();
    spawnTimer = 0;
  }

  bonusTimer += dt;

  if (bonusTimer > 9) {
    spawnBonus();
    bonusTimer = 0;
  }

  if (messageTimer > 0) {
    messageTimer -= dt;
  }

  checkShelfPickup();
  checkPatientDelivery();
  checkObstacleCollision();
  checkBonusCollision();

  level = 1 + Math.floor(delivered / 5);

  if (lives <= 0) {
    gameState = "gameover";
  }
}

function updateShelves(dt) {
  for (const shelf of shelves) {
    shelf.pulse += dt * 2.5;
  }
}

function updatePatients(dt) {
  for (let i = patients.length - 1; i >= 0; i--) {
    const p = patients[i];
    p.patience -= dt;
    p.bob += dt * 3;

    if (p.patience <= 0) {
      lives--;
      showMessage("A patient left angry! -1 life", "#e74c3c");
      createParticles(p.x + 60, p.y + 40, "#e74c3c");
      patients.splice(i, 1);
    }
  }
}

function updateObstacles(dt) {
  for (const o of obstacles) {
    const levelSpeedBonus = Math.min(90, (level - 1) * 12);
    const currentSpeed = o.baseSpeed + levelSpeedBonus;

    o.x += o.direction * currentSpeed * dt;

    if (o.x < o.minX || o.x > o.maxX) {
      o.direction *= -1;
      o.x = Math.max(o.minX, Math.min(o.maxX, o.x));
    }
  }
}

function updateBonuses(dt) {
  for (let i = bonuses.length - 1; i >= 0; i--) {
    bonuses[i].angle += dt * 3.2;
    bonuses[i].life -= dt;

    if (bonuses[i].life <= 0) {
      bonuses.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function checkShelfPickup() {
  for (const shelf of shelves) {
    if (rectsCollide(player, shelf)) {
      if (!player.carry || player.carry.short !== shelf.med.short) {
        player.carry = shelf.med;
        showMessage(`Picked: ${shelf.med.name}`, "#1f7a8c");
      }
    }
  }
}

function checkPatientDelivery() {
  for (let i = patients.length - 1; i >= 0; i--) {
    const p = patients[i];

    if (rectsCollide(player, p) && player.carry) {
      const index = p.prescription.indexOf(player.carry.short);

      if (index !== -1) {
        p.prescription.splice(index, 1);
        score += 10;
        createParticles(p.x + 70, p.y + 35, "#2ecc71");
        showMessage("Correct medicine! +10", "#27ae60");
        player.carry = null;

        if (p.prescription.length === 0) {
          score += Math.floor(p.patience * 2);
          delivered++;
          createParticles(p.x + 70, p.y + 35, "#f1c40f");
          patients.splice(i, 1);
          showMessage("Prescription completed!", "#16a085");
        }
      } else {
        lives--;
        score = Math.max(0, score - 8);
        createParticles(player.x + 20, player.y + 20, "#e74c3c");
        showMessage("Wrong medicine! -1 life", "#c0392b");
        player.carry = null;
        player.invincible = 0.8;
      }
    }
  }
}

function checkObstacleCollision() {
  if (player.invincible > 0) return;

  for (const o of obstacles) {
    if (rectsCollide(player, o)) {
      lives--;
      player.x = 485;
      player.y = 330;
      player.carry = null;
      player.invincible = 1.1;
      createParticles(o.x + 35, o.y + 20, "#ff9f43");
      showMessage("You hit a moving service cart! -1 life", "#d35400");
    }
  }
}

function checkBonusCollision() {
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const b = bonuses[i];

    if (circleRectCollide(b, player)) {
      if (b.type === "time") {
        for (const p of patients) {
          p.patience = Math.min(p.maxPatience, p.patience + 6);
        }

        showMessage("Bonus: Extra time!", "#2980b9");
      } else {
        player.boost = 5.5;
        showMessage("Bonus: Speed boost!", "#8e44ad");
      }

      createParticles(b.x, b.y, "#3498db");
      bonuses.splice(i, 1);
    }
  }
}

function showMessage(text, color) {
  message = { text, color };
  messageTimer = 1.25;
}

function createParticles(x, y, color) {
  for (let i = 0; i < 14; i++) {
    particles.push({
      x,
      y,
      vx: -90 + Math.random() * 180,
      vy: -90 + Math.random() * 180,
      life: 0.45 + Math.random() * 0.55,
      color
    });
  }
}

function getMoodEmoji(p) {
  const ratio = p.patience / p.maxPatience;

  if (ratio > 0.66) return "🙂";
  if (ratio > 0.33) return "😟";
  return "😡";
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (gameState === "start") {
    drawStartScreen();
    return;
  }

  drawGame();

  if (gameState === "gameover") {
    drawGameOver();
  }
}

function drawGame() {
  drawBackground();
  drawUI();
  drawShelves();
  drawCounter();
  drawObstacles();
  drawBonuses();
  drawPatients();
  drawPlayer();
  drawParticles();
  drawMessage();
}

function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#eef8fb");
  bg.addColorStop(1, "#d7edf4");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#1d5568";
  ctx.fillRect(0, 0, W, 78);

  ctx.fillStyle = "#f5efe0";
  ctx.fillRect(0, 78, 230, H - 78);

  ctx.fillStyle = "#f6ecf3";
  ctx.fillRect(770, 78, 230, H - 78);

  ctx.fillStyle = "#f8fcfd";
  ctx.fillRect(230, 78, 540, H - 78);

  ctx.fillStyle = "#dbeef4";

  for (let x = 245; x < 760; x += 45) {
    ctx.fillRect(x, 92, 2, H - 125);
  }

  for (let y = 92; y < H - 28; y += 45) {
    ctx.fillRect(230, y, 540, 2);
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 28px Arial";
  ctx.fillText("Prescription Panic", 24, 48);

  ctx.fillStyle = "#20363e";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Medicine Shelves", 28, 105);
  ctx.fillText("Patients", 835, 105);
}

function drawUI() {
  drawTopBadge(345, 24, `Score: ${score}`, 120);
  drawTopBadge(475, 24, `Level: ${level}`, 120);
  drawTopBadge(605, 24, `Lives: ${"❤".repeat(lives)}`, 145);
  drawTopBadge(760, 24, `Delivered: ${delivered}`, 160);

  if (player.carry) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(28, 548, 178, 44, 14, true);

    ctx.fillStyle = "#17485d";
    ctx.font = "bold 15px Arial";
    ctx.fillText("Carrying:", 42, 575);

    ctx.fillStyle = player.carry.color;
    ctx.beginPath();
    ctx.arc(138, 570, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.font = "bold 15px Arial";
    ctx.fillText(player.carry.short, 133, 575);

    ctx.fillStyle = "#20363e";
    ctx.font = "bold 14px Arial";
    ctx.fillText(player.carry.name, 156, 575);
  }
}

function drawTopBadge(x, y, text, width = 120) {
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(x, y - 15, width, 32, 16, true);

  ctx.fillStyle = "white";
  ctx.font = "bold 18px Arial";
  ctx.fillText(text, x + 10, y + 7);
}

function drawShelves() {
  for (const shelf of shelves) {
    const scale = 1 + Math.sin(shelf.pulse) * 0.018;

    ctx.save();
    ctx.translate(shelf.x + shelf.w / 2, shelf.y + shelf.h / 2);
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    roundRect(-shelf.w / 2, -shelf.h / 2, shelf.w, shelf.h, 16, true);

    ctx.strokeStyle = shelf.med.color;
    ctx.lineWidth = 4;
    roundRect(-shelf.w / 2, -shelf.h / 2, shelf.w, shelf.h, 16, false);

    ctx.fillStyle = shelf.med.color;
    ctx.beginPath();
    ctx.arc(-58, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-58, 0, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "22px Arial";
    ctx.fillText(shelf.med.icon, -69, 8);

    ctx.fillStyle = shelf.med.color;
    roundRect(-32, -23, 28, 24, 8, true);

    ctx.fillStyle = "#111";
    ctx.font = "bold 16px Arial";
    ctx.fillText(shelf.med.short, -23, -6);

    ctx.fillStyle = "#20363e";
    ctx.font = "bold 15px Arial";
    ctx.fillText(shelf.med.name, 4, -4);

    ctx.fillStyle = "#6b7b83";
    ctx.font = "13px Arial";
    ctx.fillText("Touch to pick", 4, 15);

    ctx.restore();
  }
}

function drawCounter() {
  const counterGradient = ctx.createLinearGradient(270, 0, 720, 0);
  counterGradient.addColorStop(0, "#b5d3db");
  counterGradient.addColorStop(1, "#95bcc7");

  ctx.fillStyle = counterGradient;
  roundRect(270, 255, 460, 34, 16, true);

  ctx.fillStyle = "#17485d";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Pharmacy Counter", 430, 278);
}

function drawPatients() {
  for (const p of patients) {
    const offset = Math.sin(p.bob) * 2.5;
    const mood = getMoodEmoji(p);

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    roundRect(p.x, p.y + offset, p.w, p.h, 18, true);

    ctx.strokeStyle = "#d2c1d0";
    ctx.lineWidth = 2;
    roundRect(p.x, p.y + offset, p.w, p.h, 18, false);

    drawPatientCharacter(p.x + 18, p.y + 12 + offset, p);

    ctx.fillStyle = "#ffffff";
    roundRect(p.x + 16, p.y - 18 + offset, 36, 28, 12, true);

    ctx.fillStyle = "#333";
    ctx.font = "18px Arial";
    ctx.fillText(mood, p.x + 22, p.y + 2 + offset);

    ctx.fillStyle = "#f8fbfd";
    roundRect(p.x + 64, p.y + 14 + offset, 84, 36, 12, true);

    ctx.fillStyle = "#18323a";
    ctx.font = "bold 12px Arial";
    ctx.fillText("Needs:", p.x + 74, p.y + 28 + offset);

    for (let i = 0; i < p.prescription.length; i++) {
      const med = medicines.find(m => m.short === p.prescription[i]);
      const bubbleX = p.x + 90 + i * 28;

      ctx.fillStyle = med.color;
      ctx.beginPath();
      ctx.arc(bubbleX, p.y + 46 + offset, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111";
      ctx.font = "bold 12px Arial";
      ctx.fillText(med.short, bubbleX - 4, p.y + 50 + offset);
    }

    const ratio = Math.max(0, p.patience / p.maxPatience);

    ctx.fillStyle = "#e0e0e0";
    roundRect(p.x + 64, p.y + 62 + offset, 80, 8, 4, true);

    ctx.fillStyle = ratio > 0.66 ? "#2ecc71" : ratio > 0.33 ? "#f39c12" : "#e74c3c";
    roundRect(p.x + 64, p.y + 62 + offset, 80 * ratio, 8, 4, true);
  }
}

function drawPatientCharacter(x, y, p) {
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.arc(x + 18, y + 16, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.hair;
  ctx.beginPath();
  ctx.arc(x + 18, y + 12, 11, Math.PI, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = p.shirt;
  roundRect(x + 7, y + 28, 22, 26, 8, true);

  ctx.strokeStyle = "#4a4a4a";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x + 14, y + 54);
  ctx.lineTo(x + 11, y + 68);
  ctx.moveTo(x + 22, y + 54);
  ctx.lineTo(x + 25, y + 68);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 7, y + 36);
  ctx.lineTo(x, y + 45);
  ctx.moveTo(x + 29, y + 36);
  ctx.lineTo(x + 36, y + 45);
  ctx.stroke();
}

function drawObstacles() {
  for (const o of obstacles) {
    drawServiceCart(o.x, o.y, o.w, o.h);
  }
}

function drawServiceCart(x, y, w, h) {
  ctx.fillStyle = "#7f8c8d";
  roundRect(x, y, w, h, 10, true);

  ctx.fillStyle = "#95a5a6";
  roundRect(x + 6, y + 6, w - 12, h - 16, 8, true);

  ctx.strokeStyle = "#566573";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x + 10, y + 20);
  ctx.lineTo(x + w - 10, y + 20);
  ctx.moveTo(x + 10, y + 31);
  ctx.lineTo(x + w - 10, y + 31);
  ctx.stroke();

  ctx.fillStyle = "#e74c3c";
  roundRect(x + w / 2 - 10, y + 9, 20, 20, 6, true);

  ctx.fillStyle = "white";
  ctx.fillRect(x + w / 2 - 3, y + 12, 6, 14);
  ctx.fillRect(x + w / 2 - 7, y + 16, 14, 6);

  ctx.fillStyle = "#2c3e50";

  ctx.beginPath();
  ctx.arc(x + 14, y + h, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w - 14, y + h, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBonuses() {
  for (const b of bonuses) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    ctx.fillStyle = b.type === "time" ? "#4ea5ff" : "#9b59b6";
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.type === "time" ? "⏱" : "⚡", 0, 0);

    ctx.restore();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

function drawPlayer() {
  const walk = Math.sin(player.step) * 2;

  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.boost > 0) {
    ctx.shadowColor = "#9b59b6";
    ctx.shadowBlur = 16;
  }

  if (player.invincible > 0) {
    ctx.globalAlpha = 0.55 + Math.sin(Date.now() * 0.03) * 0.25;
  }

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(24, 74, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(24, 16, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d2d2d";
  ctx.beginPath();
  ctx.arc(24, 12, 12, Math.PI, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  roundRect(12, 28, 24, 28, 8, true);

  ctx.fillStyle = "#1f7a8c";
  roundRect(18, 34, 12, 16, 5, true);

  ctx.strokeStyle = "#f1c27d";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(12, 36);
  ctx.lineTo(4, 48);
  ctx.moveTo(36, 36);
  ctx.lineTo(44, 48);
  ctx.stroke();

  ctx.strokeStyle = "#34495e";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(21, 56);
  ctx.lineTo(18, 72 + walk);
  ctx.moveTo(27, 56);
  ctx.lineTo(30, 72 - walk);
  ctx.stroke();

  ctx.fillStyle = "#27ae60";
  ctx.fillRect(21, 36, 6, 14);
  ctx.fillRect(17, 40, 14, 6);

  if (player.carry) {
    ctx.fillStyle = player.carry.color;
    ctx.beginPath();
    ctx.arc(47, 44, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.font = "bold 11px Arial";
    ctx.fillText(player.carry.short, 43, 48);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawMessage() {
  if (messageTimer > 0 && message) {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRect(340, 86, 320, 34, 16, true);

    ctx.fillStyle = message.color;
    ctx.font = "bold 20px Arial";
    ctx.fillText(message.text, 355, 108);
  }
}

function drawStartScreen() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#edf8fb");
  bg.addColorStop(1, "#d5ecf3");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#17485d";
  ctx.font = "bold 54px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Prescription Panic", W / 2, 130);

  ctx.fillStyle = "#49636d";
  ctx.font = "22px Arial";
  ctx.fillText("Serve patients quickly and deliver the correct medicines.", W / 2, 180);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(215, 225, 570, 250, 24, true);

  ctx.fillStyle = "#18323a";
  ctx.font = "bold 25px Arial";
  ctx.fillText("How to Play", W / 2, 270);

  ctx.font = "18px Arial";
  ctx.fillText("1. Move with Arrow Keys or WASD.", W / 2, 315);
  ctx.fillText("2. Look at the patient’s medicine letters on the right.", W / 2, 347);
  ctx.fillText("3. Go to the left shelves and pick the correct medicine.", W / 2, 379);
  ctx.fillText("4. Return to the patient and deliver it.", W / 2, 411);
  ctx.fillText("5. Avoid moving service carts and do not keep patients waiting.", W / 2, 443);

  ctx.fillStyle = "#1f7a8c";
  roundRect(345, 510, 310, 58, 18, true);

  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Press ENTER to Start", W / 2, 548);

  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "white";
  roundRect(295, 165, 410, 290, 24, true);

  ctx.fillStyle = "#c0392b";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", W / 2, 230);

  ctx.fillStyle = "#20363e";
  ctx.font = "bold 22px Arial";
  ctx.fillText(`Final Score: ${score}`, W / 2, 288);
  ctx.fillText(`Level Reached: ${level}`, W / 2, 324);
  ctx.fillText(`Prescriptions Delivered: ${delivered}`, W / 2, 360);

  ctx.fillStyle = "#1f7a8c";
  roundRect(350, 392, 300, 48, 16, true);

  ctx.fillStyle = "white";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Press ENTER to Restart", W / 2, 423);

  ctx.textAlign = "left";
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fill) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === "Enter") {
    if (gameState === "start" || gameState === "gameover") {
      resetGame();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

createShelves();
requestAnimationFrame(gameLoop);