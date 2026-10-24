
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

/* ==========================================
   FORTNIGHT — 3D BATTLE ROYALE
   Main game engine
========================================== */

const $ = (id) => document.getElementById(id);

const menu = $("main-menu");
const pauseMenu = $("pause-menu");
const endScreen = $("end-screen");
const hud = $("game-hud");
const canvas = $("game-canvas");

let gameStarted = false;
let paused = false;
let gameOver = false;
let elapsed = 0;
let kills = 0;
let health = 100;
let shield = 50;
let ammo = 30;
let reserveAmmo = 90;
let reloadTimer = 0;
let fireTimer = 0;
let messageTimer = 0;
let stormRadius = 170;
let stormDelay = 180;
let weaponName = "RIFLE";
let aiming = false;
let jumping = false;
let verticalSpeed = 0;
let playerSpeed = 8;
let selectedSlot = 1;

const keys = {};
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouseCenter = new THREE.Vector2(0, 0);

let yaw = 0;
let pitch = -0.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8acdf4);
scene.fog = new THREE.Fog(0x8acdf4, 100, 290);

const camera = new THREE.PerspectiveCamera(
  70,
  innerWidth / innerHeight,
  0.1,
  600
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ==========================================
   LIGHTING
========================================== */

scene.add(new THREE.HemisphereLight(0xc7e8ff, 0x61744c, 2.2));

const sunlight = new THREE.DirectionalLight(0xfff0d0, 3);
sunlight.position.set(65, 100, 40);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -100;
sunlight.shadow.camera.right = 100;
sunlight.shadow.camera.top = 100;
sunlight.shadow.camera.bottom = -100;
scene.add(sunlight);

const mat = (color, roughness = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness });

const materials = {
  grass: mat(0x65a94a),
  darkGrass: mat(0x38773b),
  dirt: mat(0x8c704d),
  wood: mat(0x865332),
  roof: mat(0x9d4936),
  blue: mat(0x2678d5),
  skin: mat(0xe5b18a),
  pants: mat(0x35475a),
  dark: mat(0x202b38),
  gold: mat(0xffca42),
  leaf: mat(0x267441),
  leafLight: mat(0x398c4b),
  stone: mat(0x777d83)
};

/* ==========================================
   WORLD
========================================== */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(440, 440),
  materials.grass
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// A central dirt area and roads.
const centralDirt = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  materials.darkGrass
);
centralDirt.rotation.x = -Math.PI / 2;
centralDirt.position.y = 0.015;
scene.add(centralDirt);

function road(x, z, width, depth) {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.12, depth),
    mat(0x555b60)
  );
  object.position.set(x, 0.04, z);
  scene.add(object);
}

road(0, 0, 13, 330);
road(0, 0, 330, 12);

// Hills around the island.
for (let i = 0; i < 25; i++) {
  const angle = (i / 25) * Math.PI * 2;
  const distance = 135 + Math.random() * 40;
  const height = 9 + Math.random() * 18;

  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(15 + Math.random() * 16, height, 7),
    materials.darkGrass
  );

  hill.position.set(
    Math.cos(angle) * distance,
    height / 2 - 1,
    Math.sin(angle) * distance
  );

  hill.scale.z = 1.3;
  hill.castShadow = true;
  scene.add(hill);
}

// Trees.
function createTree(x, z, scale = 1) {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.3 * scale,
      0.48 * scale,
      3 * scale,
      7
    ),
    materials.wood
  );

  trunk.position.y = 1.5 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  for (let i = 0; i < 3; i++) {
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(
        (2.2 - i * 0.35) * scale,
        3 * scale,
        7
      ),
      i === 1 ? materials.leafLight : materials.leaf
    );

    leaves.position.y = (3 + i * 1.4) * scale;
    leaves.castShadow = true;
    tree.add(leaves);
  }

  tree.position.set(x, 0, z);
  scene.add(tree);
}

for (let i = 0; i < 135; i++) {
  const x = (Math.random() - 0.5) * 380;
  const z = (Math.random() - 0.5) * 380;

  if (Math.abs(x) < 16 || Math.abs(z) < 16) continue;

  createTree(x, z, 0.7 + Math.random() * 0.8);
}

// World collision objects.
const obstacles = [];

function createBlock(x, z, width, height, depth, material, solid = true) {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );

  object.position.set(x, height / 2, z);
  object.castShadow = true;
  object.receiveShadow = true;
  scene.add(object);

  if (solid) {
    obstacles.push({ x, z, width, depth });
  }

  return object;
}

// Houses.
function createHouse(x, z) {
  createBlock(x, z, 12, 5, 10, mat(0xe0c9a2));
  createBlock(x, z, 13, 0.7, 11, materials.roof);

  // Door and windows are decorative.
  createBlock(x, z + 5.08, 2, 3.5, 0.12, materials.wood, false);
  createBlock(x - 3, z - 5.08, 1.7, 1.5, 0.12, materials.blue, false);
  createBlock(x + 3, z - 5.08, 1.7, 1.5, 0.12, materials.blue, false);
}

[
  [25, 22],
  [40, 25],
  [-28, 35],
  [-42, 24],
  [32, -35],
  [-30, -40],
  [60, -5],
  [-65, -10],
  [75, 55],
  [-80, -65]
].forEach(([x, z]) => createHouse(x, z));

// Rocks.
for (let i = 0; i < 50; i++) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1 + Math.random() * 2, 0),
    materials.stone
  );

  rock.position.set(
    (Math.random() - 0.5) * 340,
    0.7,
    (Math.random() - 0.5) * 340
  );

  rock.scale.y = 0.8;
  rock.castShadow = true;
  scene.add(rock);
}

/* ==========================================
   PLAYER CHARACTER
========================================== */

const player = new THREE.Group();
scene.add(player);

const avatar = new THREE.Group();
player.add(avatar);

function part(parent, geometry, material, x, y, z) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function capsule(parent, radius, length, material, x, y, z) {
  return part(
    parent,
    new THREE.CapsuleGeometry(radius, length, 4, 8),
    material,
    x,
    y,
    z
  );
}

// Boots.
part(
  avatar,
  new THREE.BoxGeometry(0.42, 0.25, 0.62),
  materials.dark,
  -0.28, 0.18, 0.05
);

part(
  avatar,
  new THREE.BoxGeometry(0.42, 0.25, 0.62),
  materials.dark,
  0.28, 0.18, 0.05
);

// Animated legs.
const leftLeg = new THREE.Group();
const rightLeg = new THREE.Group();

leftLeg.position.set(-0.28, 1.25, 0);
rightLeg.position.set(0.28, 1.25, 0);

avatar.add(leftLeg, rightLeg);

capsule(leftLeg, 0.22, 0.75, materials.pants, 0, -0.38, 0);
capsule(rightLeg, 0.22, 0.75, materials.pants, 0, -0.38, 0);

// Body and clothing.
part(
  avatar,
  new THREE.CapsuleGeometry(0.53, 0.8, 5, 10),
  materials.blue,
  0, 2.05, 0
);

part(
  avatar,
  new THREE.BoxGeometry(0.94, 0.15, 0.58),
  materials.gold,
  0, 1.62, 0
);

// Backpack.
part(
  avatar,
  new THREE.BoxGeometry(0.55, 0.75, 0.25),
  materials.dark,
  0, 2.25, 0.43
);

part(
  avatar,
  new THREE.BoxGeometry(0.4, 0.14, 0.29),
  materials.gold,
  0, 2.48, 0.58
);

// Arms.
const leftArm = new THREE.Group();
const rightArm = new THREE.Group();

leftArm.position.set(-0.66, 2.45, 0);
rightArm.position.set(0.66, 2.45, 0);

avatar.add(leftArm, rightArm);

capsule(leftArm, 0.19, 0.55, materials.blue, 0, -0.3, 0);
capsule(leftArm, 0.17, 0.25, materials.skin, 0, -0.72, 0);
capsule(rightArm, 0.19, 0.55, materials.blue, 0, -0.3, 0);
capsule(rightArm, 0.17, 0.25, materials.skin, 0, -0.72, 0);

// Head, hair, and face.
part(
  avatar,
  new THREE.CylinderGeometry(0.16, 0.18, 0.25, 10),
  materials.skin,
  0, 2.72, 0
);

part(
  avatar,
  new THREE.SphereGeometry(0.39, 16, 12),
  materials.skin,
  0, 3.12, 0
);

part(
  avatar,
  new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  mat(0x30241c),
  0, 3.27, 0
);

part(
  avatar,
  new THREE.BoxGeometry(0.48, 0.13, 0.48),
  mat(0x30241c),
  0, 3.38, -0.01
);

part(
  avatar,
  new THREE.SphereGeometry(0.045, 8, 8),
  materials.dark,
  -0.13, 3.15, -0.35
);

part(
  avatar,
  new THREE.SphereGeometry(0.045, 8, 8),
  materials.dark,
  0.13, 3.15, -0.35
);

// Weapon held in front of the body.
const weapon = new THREE.Group();
avatar.add(weapon);

part(
  weapon,
  new THREE.BoxGeometry(0.18, 0.2, 1.05),
  materials.dark,
  0.48, 2.1, -0.55
);

part(
  weapon,
  new THREE.BoxGeometry(0.13, 0.3, 0.25),
  mat(0x161b20),
  0.48, 1.89, -0.4
);

part(
  weapon,
  new THREE.BoxGeometry(0.12, 0.12, 0.35),
  materials.gold,
  0.48, 2.23, -0.5
);

/* ==========================================
   LOOT CHESTS AND WEAPON PICKUPS
========================================== */

const chests = [];
const pickups = [];

function createChest(x, z) {
  const group = new THREE.Group();

  part(
    group,
    new THREE.BoxGeometry(1.35, 0.8, 0.85),
    materials.gold,
    0, 0.45, 0
  );

  part(
    group,
    new THREE.BoxGeometry(1.4, 0.16, 0.9),
    mat(0xffe47a),
    0, 0.86, 0
  );

  part(
    group,
    new THREE.BoxGeometry(0.18, 0.3, 0.09),
    materials.dark,
    0, 0.55, -0.46
  );

  const glow = new THREE.PointLight(0xffc52c, 1.5, 7);
  glow.position.y = 1.5;
  group.add(glow);

  group.position.set(x, 0, z);
  scene.add(group);

  chests.push({ group, opened: false });
}

[
  [8, 15],
  [-10, 28],
  [37, 17],
  [-36, 33],
  [48, -30],
  [-35, -34],
  [15, -45],
  [70, 5],
  [0, 80],
  [-75, 12]
].forEach(([x, z]) => createChest(x, z));

function createPickup(x, z) {
  const group = new THREE.Group();

  part(
    group,
    new THREE.BoxGeometry(0.2, 0.2, 1),
    materials.gold,
    0, 0, 0
  );

  group.position.set(x, 0.65, z);
  scene.add(group);

  pickups.push({ group, taken: false });
}

for (let i = 0; i < 18; i++) {
  createPickup(
    (Math.random() - 0.5) * 150,
    (Math.random() - 0.5) * 150
  );
}

/* ==========================================
   ENEMY BOTS
========================================== */

const enemies = [];
const enemyColors = [0xd74639, 0x7b55cf, 0xd87b2e, 0x20a7a3];

function createEnemy(x, z, index) {
  const group = new THREE.Group();

  const body = part(
    group,
    new THREE.CapsuleGeometry(0.42, 0.7, 4, 8),
    mat(enemyColors[index % enemyColors.length]),
    0, 1.55, 0
  );

  const head = part(
    group,
    new THREE.SphereGeometry(0.32, 12, 10),
    materials.skin,
    0, 2.35, 0
  );

  part(
    group,
    new THREE.SphereGeometry(0.34, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    materials.dark,
    0, 2.48, 0
  );

  part(
    group,
    new THREE.BoxGeometry(0.3, 0.2, 0.8),
    materials.dark,
    0.42, 1.6, -0.3
  );

  group.position.set(x, 0, z);
  scene.add(group);

  enemies.push({
    group,
    parts: [body, head],
    hp: 100,
    alive: true,
    shootTimer: 1.5 + Math.random() * 2,
    speed: 1.2 + Math.random() * 1.2,
    phase: Math.random() * 5
  });
}

for (let i = 0; i < 10; i++) {
  const angle = Math.random() * Math.PI * 2;
  const distance = 35 + Math.random() * 95;

  createEnemy(
    Math.cos(angle) * distance,
    Math.sin(angle) * distance,
    i
  );
}

/* ==========================================
   STORM
========================================== */

const stormWall = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, 65, 80, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0x5c70ff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false
  })
);

stormWall.position.y = 32.5;
scene.add(stormWall);

const stormRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.45, 5, 100),
  new THREE.MeshBasicMaterial({
    color: 0x7d8bff,
    transparent: true,
    opacity: 0.85
  })
);

stormRing.rotation.x = Math.PI / 2;
stormRing.position.y = 0.3;
scene.add(stormRing);

/* ==========================================
   GAME UI
========================================== */

function showMessage(text) {
  $("game-message").textContent = text;
  messageTimer = 2.5;
}

function updateHUD() {
  $("health-value").textContent = Math.ceil(health);
  $("shield-value").textContent = Math.ceil(shield);

  $("health-fill").style.width = health + "%";
  $("shield-fill").style.width = shield + "%";

  $("ammo-counter").textContent = `${ammo} / ${reserveAmmo}`;

  $("eliminations").textContent = `Eliminations: ${kills}`;

  $("players-alive").textContent =
    `Players remaining: ${1 + enemies.filter(e => e.alive).length}`;

  $("island-position").textContent =
    `X: ${Math.round(player.position.x)} · Z: ${Math.round(player.position.z)}`;

  $("storm-timer").textContent =
    `Storm: ${Math.max(0, Math.ceil(stormDelay - elapsed))}`;

  $("weapon-1").textContent = weaponName;
}

function damage(amount) {
  let remaining = amount;

  const shieldDamage = Math.min(shield, remaining);
  shield -= shieldDamage;
  remaining -= shieldDamage;

  health = Math.max(0, health - remaining);
  updateHUD();

  if (health <= 0) {
    endMatch(false);
  }
}

function endMatch(victory) {
  if (gameOver) return;

  gameOver = true;
  document.exitPointerLock?.();

  $("end-title").textContent = victory ? "VICTORY ROYALE!" : "ELIMINATED";

  $("end-description").textContent =
    `Eliminations: ${kills} · Time survived: ${Math.floor(elapsed)} seconds`;

  endScreen.classList.remove("hidden");
  hud.classList.add("hidden");
}

/* ==========================================
   COLLISION AND PLAYER MOVEMENT
========================================== */

function movePlayer(dx, dz) {
  const oldX = player.position.x;
  const oldZ = player.position.z;

  player.position.x += dx;
  player.position.z += dz;

  player.position.x = THREE.MathUtils.clamp(player.position.x, -205, 205);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -205, 205);

  for (const obstacle of obstacles) {
    const hitX =
      Math.abs(player.position.x - obstacle.x) < obstacle.width / 2 + 0.45;

    const hitZ =
      Math.abs(player.position.z - obstacle.z) < obstacle.depth / 2 + 0.45;

    if (hitX && hitZ) {
      if (Math.abs(dx) > 0) player.position.x = oldX;
      if (Math.abs(dz) > 0) player.position.z = oldZ;
    }
  }
}

function playerForward() {
  return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
}

function playerRight() {
  return new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
}

/* ==========================================
   SHOOTING AND RELOADING
========================================== */

function shoot() {
  if (!gameStarted || paused || gameOver || reloadTimer > 0) return;
  if (fireTimer > 0) return;

  if (ammo <= 0) {
    showMessage("PRESS R TO RELOAD");
    return;
  }

  ammo--;
  fireTimer = 0.18;

  // Aim from the center of the screen.
  raycaster.setFromCamera(mouseCenter, camera);
  raycaster.far = 110;

  const targets = [];

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    enemy.group.updateMatrixWorld(true);

    for (const object of enemy.parts) {
      object.updateWorldMatrix(true, false);
      targets.push(object);
    }
  }

  const hits = raycaster.intersectObjects(targets, false);

  if (hits.length > 0) {
    const hitObject = hits[0].object;
    const target = enemies.find(
      enemy => enemy.alive && enemy.parts.includes(hitObject)
    );

    if (target) {
      target.hp -= 34;

      if (target.hp <= 0) {
        target.alive = false;
        scene.remove(target.group);
        kills++;
        showMessage("ENEMY ELIMINATED!");
      } else {
        showMessage("HIT!");
      }
    }
  }

  updateHUD();
}

function reload() {
  if (reloadTimer > 0 || ammo >= 30 || reserveAmmo <= 0) return;

  reloadTimer = 1.2;
  showMessage("RELOADING...");
}

function finishReload() {
  const amount = Math.min(30 - ammo, reserveAmmo);

  ammo += amount;
  reserveAmmo -= amount;

  updateHUD();
  showMessage("RELOADED");
}

/* ==========================================
   LOOT INTERACTION
========================================== */

function interact() {
  if (!gameStarted || paused || gameOver) return;

  for (const chest of chests) {
    if (chest.opened) continue;

    if (chest.group.position.distanceTo(player.position) < 4) {
      chest.opened = true;
      scene.remove(chest.group);

      reserveAmmo += 30;
      shield = Math.min(100, shield + 15);

      showMessage("CHEST OPENED! +AMMO +SHIELD");
      updateHUD();
      return;
    }
  }

  for (const pickup of pickups) {
    if (pickup.taken) continue;

    if (pickup.group.position.distanceTo(player.position) < 3) {
      pickup.taken = true;
      scene.remove(pickup.group);

      reserveAmmo += 25;
      weaponName = "RARE RIFLE";

      showMessage("WEAPON AMMO COLLECTED");
      updateHUD();
      return;
    }
  }

  showMessage("NO LOOT NEARBY");
}

/* ==========================================
   INPUT CONTROLS
========================================== */

function startGame() {
  if (gameStarted) return;

  gameStarted = true;
  paused = false;

  menu.classList.add("hidden");
  pauseMenu.classList.add("hidden");
  endScreen.classList.add("hidden");
  hud.classList.remove("hidden");

  player.position.set(0, 0, 0);
  health = 100;
  shield = 50;
  ammo = 30;
  reserveAmmo = 90;
  kills = 0;
  elapsed = 0;
  stormRadius = 170;
  gameOver = false;
  yaw = 0;
  pitch = -0.12;

  clock.getDelta();
  updateHUD();

  renderer.domElement.requestPointerLock?.();
}

function togglePause() {
  if (!gameStarted || gameOver) return;

  paused = !paused;

  if (paused) {
    pauseMenu.classList.remove("hidden");
    renderer.domElement.ownerDocument.exitPointerLock?.();
  } else {
    pauseMenu.classList.add("hidden");
    renderer.domElement.requestPointerLock?.();
    clock.getDelta();
  }
}

$("play-button").addEventListener("click", startGame);
$("resume-button").addEventListener("click", togglePause);

$("restart-button").addEventListener("click", () => {
  location.reload();
});

$("return-button").addEventListener("click", () => {
  location.reload();
});

document.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.repeat) return;

  if (event.code === "Escape") {
    if (gameStarted && !gameOver) togglePause();
  }

  if (event.code === "KeyE") interact();
  if (event.code === "KeyR") reload();

  if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
    selectedSlot = Number(event.code.slice(-1));

    document.querySelectorAll(".weapon-slot").forEach(slot => {
      slot.classList.toggle(
        "selected",
        Number(slot.dataset.slot) === selectedSlot
      );
    });
  }
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

document.addEventListener("mousemove", event => {
  if (document.pointerLockElement !== renderer.domElement) return;

  yaw -= event.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(
    pitch - event.movementY * 0.0018,
    -0.65,
    0.35
  );
});

document.addEventListener("mousedown", event => {
  if (!gameStarted || paused || gameOver) return;

  if (event.button === 0) {
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock?.();
      return;
    }

    shoot();
  }

  if (event.button === 2) {
    aiming = true;
  }
});

document.addEventListener("mouseup", event => {
  if (event.button === 2) aiming = false;
});

document.addEventListener("contextmenu", event => {
  event.preventDefault();
});

/* ==========================================
   CAMERA
========================================== */

function updateCamera(dt) {
  const distance = aiming ? 4.2 : 7.5;
  const height = aiming ? 2.8 : 4.0;

  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + 2.2,
    player.position.z
  );

  const horizontal = new THREE.Vector3(
    Math.sin(yaw),
    0,
    Math.cos(yaw)
  );

  const desired = target.clone().addScaledVector(horizontal, distance);
  desired.y += height + pitch * 5;

  camera.position.lerp(
    desired,
    1 - Math.exp(-8 * dt)
  );

  camera.lookAt(
    target.clone().add(new THREE.Vector3(0, pitch * 5, 0))
  );

  camera.fov = THREE.MathUtils.damp(
    camera.fov,
    aiming ? 53 : 70,
    8,
    dt
  );

  camera.updateProjectionMatrix();
}

/* ==========================================
   MAIN GAME UPDATE
========================================== */

function update(dt) {
  if (!gameStarted || paused || gameOver) return;

  elapsed += dt;

  fireTimer = Math.max(0, fireTimer - dt);

  if (messageTimer > 0) {
    messageTimer -= dt;

    if (messageTimer <= 0) {
      $("game-message").textContent = "";
    }
  }

  if (reloadTimer > 0) {
    reloadTimer -= dt;

    if (reloadTimer <= 0) finishReload();
  }

  const sprint = keys.ShiftLeft || keys.ShiftRight;
  playerSpeed = sprint ? 13 : 8;

  const forward = playerForward();
  const right = playerRight();
  const movement = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) movement.add(forward);
  if (keys.KeyS || keys.ArrowDown) movement.sub(forward);
  if (keys.KeyD || keys.ArrowRight) movement.add(right);
  if (keys.KeyA || keys.ArrowLeft) movement.sub(right);

  const isMoving = movement.lengthSq() > 0;

  if (isMoving) {
    movement.normalize();

    movePlayer(
      movement.x * playerSpeed * dt,
      movement.z * playerSpeed * dt
    );

    avatar.rotation.y = Math.atan2(-movement.x, -movement.z);

    const swing = Math.sin(elapsed * 12) * (sprint ? 0.65 : 0.4);

    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.55;
    rightArm.rotation.x = swing * 0.55;
  } else {
    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, dt);
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, dt);
    leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0, 10, dt);
    rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0, 10, dt);
  }

  // Jumping.
  if (keys.Space && !jumping) {
    jumping = true;
    verticalSpeed = 8;
  }

  if (jumping) {
    player.position.y += verticalSpeed * dt;
    verticalSpeed -= 22 * dt;

    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalSpeed = 0;
      jumping = false;
    }
  }

  updateCamera(dt);

  // Storm shrinks over time.
  stormRadius = Math.max(18, 170 - Math.max(0, elapsed - 20) * 0.65);

  stormWall.scale.set(stormRadius, 1, stormRadius);
  stormRing.scale.set(stormRadius, stormRadius, 1);

  const outsideStorm =
    Math.hypot(player.position.x, player.position.z) > stormRadius;

  if (outsideStorm) {
    damage(5 * dt);
    $("storm-status").textContent = "IN THE STORM!";
  } else {
    $("storm-status").textContent = "Safe zone";
  }

  // Enemy bots chase and attack the player.
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    enemy.shootTimer -= dt;

    const delta = player.position.clone().sub(enemy.group.position);
    const distance = delta.length();

    if (distance > 9 && distance < 95) {
      delta.y = 0;
      delta.normalize();

      enemy.group.position.addScaledVector(delta, enemy.speed * dt);
      enemy.group.rotation.y = Math.atan2(-delta.x, -delta.z);
    }

    if (distance < 48 && enemy.shootTimer <= 0) {
      enemy.shootTimer = 1.7 + Math.random() * 1.7;

      if (Math.random() < 0.33) {
        damage(5 + Math.random() * 6);
      }
    }

    enemy.group.position.y =
      Math.abs(Math.sin(elapsed * 3 + enemy.phase)) * 0.05;
  }

  if (enemies.every(enemy => !enemy.alive)) {
    endMatch(true);
  }

  updateHUD();
}

/* ==========================================
   WINDOW RESIZE
========================================== */

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});

/* ==========================================
   STARTUP
========================================== */

player.position.set(0, 0, 0);
camera.position.set(0, 5, 8);

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.035);

  update(dt);
  renderer.render(scene, camera);
}

animate();
