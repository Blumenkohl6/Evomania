// main.js

// =========================
// GLOBALE VARIABLEN & SETUP
// =========================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Trennung von "logischer" Canvas-Größe (Spielkoordinaten) und "physischer" Größe (Geräte-Pixel)
let canvasLogicalWidth = 0;
let canvasLogicalHeight = 0;

// Hilfsfunktion, um den Modulo immer positiv zu erhalten
function mod(n, m) {
    return ((n % m) + m) % m;
}

// Wird in mehreren Funktionen genutzt
const tileSize = 27; // Größe eines Tiles

// Player-Objekt (wird in setup() später korrekt positioniert)
let player = {
    x: 0,
    y: 0,
    width: tileSize * 1.4,
    height: tileSize * 2.7,
    speed: 0,
    maxSpeed: 4,
    acceleration: 0.15,
    direction: 'down',
    inv: []
};

// Tastatureingaben
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// DevicePixelRatio-Resize-Logik
function resizeCanvas() {
    // Ermittle DPR für scharfe Darstellung
    const dpr = window.devicePixelRatio || 1;

    // Definiere die "logische" Breite/Höhe (Spielkoordinaten)
    // +100 als Puffer – kannst du anpassen oder entfernen
    canvasLogicalWidth = window.innerWidth + 100;
    canvasLogicalHeight = window.innerHeight + 100;

    // Setze physische Canvas-Größe = logische Größe * DPR
    canvas.width = canvasLogicalWidth * dpr;
    canvas.height = canvasLogicalHeight * dpr;

    // Damit das Canvas in CSS genau so groß erscheint wie die logische Größe
    canvas.style.width = canvasLogicalWidth + "px";
    canvas.style.height = canvasLogicalHeight + "px";

    // Skaliere den Zeichnungskontext, damit alles scharf bleibt
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Pixelige Grafik ohne Glättung
    ctx.imageSmoothingEnabled = false;
}

// Einmal initial aufrufen
resizeCanvas();
// Und bei Fenstergrößenänderung erneut
window.addEventListener('resize', resizeCanvas);

// ===============
// SPIEL-SETUP
// ===============
const seed = Math.random(); // Zufälliger Seed
const simplex = new SimplexNoise(seed);

let animationIndex = 0;
let amplitude = 1.5;
let frequency = 0.5;

let lightLevel = 1;
let weather = 0;
/*
time    lightLevel 
21-4        1
19-21       10-1
4-6         1-10
6-19        10

Weather
1 //few clouds      -1
2 //more clouds     -2
3 //complete clouds -3
4 //rain            -4
5 //storm           -5
*/

function readUrl() {
    // Falls du URL-Parameter etc. auslesen möchtest
}

function setup() {
    readUrl();

    // Positioniere den Spieler in der Mitte der "logischen" Canvas
    player.x = canvasLogicalWidth / 2;
    player.y = canvasLogicalHeight / 2;

    preventSpawnTrap(true);
}

function preventSpawnTrap(first) {
    const tileX = Math.floor(player.x / tileSize);
    const tileY = Math.floor(player.y / tileSize);

    const tileType = generateTile(tileX, tileY);

    if (tileType === 'mountain' || tileType === 'water') {
        player.x += 2;
        player.y += 2;
        preventSpawnTrap(false);
    } else if (!first) {
        player.x += (Math.floor(Math.random() * 6) + 3) * tileSize;
        player.y += (Math.floor(Math.random() * 6) + 3) * tileSize;
        preventSpawnTrap(true);
    }
}
setup();

// ==================
// ZEIT & TAG-NACHT
// ==================
let time = {
    hours: 6, // Startzeit 6:00 Uhr morgens
    minutes: 0,
    days: 1,
    timeScale: 6 * 60 / 60, // Verhältnis von Echtzeit zu Spielzeit (6h in 60s)
    lastUpdate: Date.now() // Startzeit für die Zeitberechnung
};

function updateTime() {
    const now = Date.now();
    const delta = (now - time.lastUpdate) / 1000; // vergangene Zeit in Sekunden
    time.lastUpdate = now;

    // Spielzeit basierend auf timeScale hochzählen
    const gameMinutesPassed = delta * time.timeScale;
    time.minutes += gameMinutesPassed;

    // Stunden/Tage aktualisieren, wenn nötig
    if (time.minutes >= 60) {
        time.hours += Math.floor(time.minutes / 60);
        time.minutes %= 60; // Rest-Minuten

        growth();

        if (time.hours >= 24) {
            time.days += Math.floor(time.hours / 24);
            time.hours %= 24; // Rest-Stunden
        }
    }
}

function applyTimeOfDayFilter() {
    let color;
    const timeOfDay = time.hours + time.minutes / 60; 
    const maxAlpha = 0.5; // Maximale Dunkelheit der Nacht

    if (timeOfDay >= 19 || timeOfDay < 6) { 
        let alpha = 0;

        if (timeOfDay >= 19 && timeOfDay < 21) { 
            alpha = (timeOfDay - 19) / 2 * maxAlpha; 
        } else if (timeOfDay >= 5 && timeOfDay < 7) { 
            alpha = (6 - timeOfDay) / 2 * maxAlpha; 
        } else { 
            alpha = maxAlpha; 
        }

        color = `rgba(0, 0, 0, ${alpha})`;
    }

    if (color) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

// =====================
// WACHSTUM / ENTWICKLUNG
// =====================
const entities = {
    plants: {},
    creatures: {}
};

function growth() {
    // Beispiel: Erhöhe state aller Entities, wenn ein Tag vergeht
    for (let entitykind in entities) {
        for (let object in entities[entitykind]) {
            for (let entity in entities[entitykind][object]) {
                entities[entitykind][object][entity].state++;
            }
        }
    }
}

// ==================
// SPIELER-STEUERUNG
// ==================
function updatePlayerPosition() {
    let moveX = 0;
    let moveY = 0;

    if (keys['ArrowUp'] || keys['w']) moveY -= 1;
    if (keys['ArrowDown'] || keys['s']) moveY += 1;
    if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
    if (keys['ArrowRight'] || keys['d']) moveX += 1;

    // Bei diagonaler Bewegung normieren
    if (moveX !== 0 || moveY !== 0) {
        if (player.speed < player.maxSpeed) {
            player.speed += player.acceleration;
        }

        // Richtung setzen
        if (moveY < 0 && moveX < 0) player.direction = 'left-up';
        else if (moveY > 0 && moveX > 0) player.direction = 'right-down';
        else if (moveX < 0 && moveY > 0) player.direction = 'left-down';
        else if (moveX > 0 && moveY < 0) player.direction = 'right-up';
        else if (moveY > 0) player.direction = 'down';
        else if (moveY < 0) player.direction = 'up';
        else if (moveX < 0) player.direction = 'left';
        else player.direction = 'right';

        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX = (moveX / length) * player.speed;
        moveY = (moveY / length) * player.speed;
    } else {
        player.speed = 0;
    }

    // Neue Position berechnen
    const newX = player.x + moveX;
    const newY = player.y + moveY;

    // Prüfen, ob die Tile passierbar ist
    const tileX = Math.floor(newX / tileSize);
    const tileY = Math.floor(newY / tileSize);
    const tileType = generateTile(tileX, tileY);

    if (tileType !== 'mountain' && tileType !== 'water') {
        player.x = newX;
        player.y = newY;
    } else {
        player.speed = 0;
    }
}

// ====================
// TILES / WELTGENERATOR
// ====================
function generateTile(x, y) {
    const value = simplex.noise2D(x / 100, y / 100);

    if (value < -0.5) return 'water';
    if (value < -0.32) return 'sand';
    if (value < 0.5) return 'grass';
    return 'mountain';
}

// Details und ihre Bilder
const tileDetails = {
    'grass': [
        { type: 'bush1', probability: 0.2, size: 1.5 },
        { type: 'bush2', probability: 0.2, size: 1.5 }
    ],
    'sand': [
        { type: 'pebble', probability: 0.97, size: 0.3 },
        { type: 'shell', probability: 0.018, size: 2 },
        { type: 'snail shell', probability: 0.018, size: 2.3 }
    ],
    'mountain': [
        { type: 'boulder1', probability: 0.008, size: 4 },
        { type: 'boulder2', probability: 0.03, size: 4 },
        { type: 'crack1', probability: 0.008, size: 4.2 },
        { type: 'crack2', probability: 0.008, size: 4.2 },
        { type: 'gold ore', probability: 0.004, size: 4.2 },
        { type: 'iron ore', probability: 0.01, size: 4.2 }
    ],
    'water': [
        { type: 'wave', probability: 0.35, size: 4, ratio: 5, minDistance: 7 }
    ]
};

const detailImages = {
    'bush1': '/assets/grafik/biome/plains/grass_bunch_1.png',
    'bush2': '/assets/grafik/biome/plains/grass_bunch_2.png',
    'pebble': '/assets/grafik/biome/beach/pebble.png',
    'shell': '/assets/grafik/biome/beach/shell.png',
    'snail shell': '/assets/grafik/biome/beach/snail_shell.png',
    'wave': '/assets/grafik/biome/water/wave.png',
    'boulder1': '/assets/grafik/biome/mountain/boulder1.png',
    'boulder2': '/assets/grafik/biome/mountain/boulder2.png',
    'crack1': '/assets/grafik/biome/mountain/crack1.png',
    'crack2': '/assets/grafik/biome/mountain/crack2.png',
    'gold ore': '/assets/grafik/biome/mountain/gold_ore.png',
    'iron ore': '/assets/grafik/biome/mountain/iron_ore.png'
};

const detailCache = {};

// Bilder cachen
function loadDetailImages() {
    for (const [key, src] of Object.entries(detailImages)) {
        const img = new Image();
        img.src = src;
        detailCache[key] = img;
    }
}
loadDetailImages();

String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // In 32bit Integer umwandeln
    }
    return hash;
};

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getDetailPosition(tileX, tileY, detailType, detailWidth, detailHeight, minDistance) {
    const baseSeed = tileX * 31 + tileY * 17;
    const detailSeed = baseSeed + detailType.hashCode();
    const randomValue = seededRandom(detailSeed);

    const maxDetailX = tileSize - detailWidth - minDistance;
    const maxDetailY = tileSize - detailHeight - minDistance;

    let detailX = Math.floor(randomValue * maxDetailX);
    let detailY = Math.floor(randomValue * maxDetailY);

    detailX = Math.max(detailX, minDistance);
    detailY = Math.max(detailY, minDistance);

    return { detailX, detailY };
}

function getRandomDetails(type, tileX, tileY) {
    const details = tileDetails[type];
    if (!details || details.length === 0) return [];

    const seedVal = tileX * 31 + tileY * 17;
    const randomValue = seededRandom(seedVal);

    let cumulativeProbability = 0;
    let chosenDetails = [];

    for (const detail of details) {
        cumulativeProbability += detail.probability;
        if (randomValue < cumulativeProbability) {
            chosenDetails.push(detail);
            break; // Nur 1 Detail
        }
    }
    return chosenDetails;
}

function drawTile(type, x, y, tileX, tileY) {
    switch (type) {
        case 'water':    ctx.fillStyle = '#1E90FF'; break;
        case 'sand':     ctx.fillStyle = '#FFD700'; break;
        case 'grass':    ctx.fillStyle = '#8bc34a'; break;
        case 'mountain': ctx.fillStyle = '#2F4F4F'; break;
    }
    ctx.fillRect(x, y, tileSize+1, tileSize+1);

    // Zeichne zufällige Details
    const details = getRandomDetails(type, tileX, tileY);
    for (const detail of details) {
        const detailImg = detailCache[detail.type];
        if (!detailImg) continue;

        const detailWidth = (detail.width || detail.size) * tileSize / 4;
        const detailHeight = (detail.height || detail.size) * tileSize / 4;
        const ratio = detail.ratio || (detail.width / detail.height) || 1;
        const calculatedHeight = detailWidth / ratio;
        const minDistance = detail.minDistance || 0;

        const { detailX, detailY } = getDetailPosition(tileX, tileY, detail.type, detailWidth, calculatedHeight, minDistance);
        ctx.drawImage(detailImg, x + detailX, y + detailY, detailWidth, calculatedHeight);
    }
}

// ====================
// VEGETATION / ENTITIES
// ====================
const vegetation = {
    'bush-0': 'assets/grafik/entities/static/bush-0.png',
    'bush-1': 'assets/grafik/entities/static/bush-1.png',
    'bush-2': 'assets/grafik/entities/static/bush-2.png',
    'bush-3': 'assets/grafik/entities/static/bush-3.png'
};

const creatures = {};

const vegetationSizeFactor = 1.8;

function loadVegetation() {
    for (let plant in vegetation) {
        let img = new Image();
        img.src = vegetation[plant];
        vegetation[plant] = img;
    }
}
loadVegetation();

function generateGenome() {
    return {
        attractivity: 0,
        reproduction: 1,
        growth: 1,
        edibility: 0,
        constancy: 1,
        foodWaterRatio: 1 / 2,
        lifespan: 0
    };
}

function registerEntity(type, screenX, screenY) {
    // screenX/screenY = Zeichenposition (logische Koords),
    // wir rechnen sie zurück auf Weltkoords
    const x = player.x + (screenX - (canvasLogicalWidth / 2));
    const y = player.y + (screenY - (canvasLogicalHeight / 2));

    if (vegetation[type] !== undefined) { // Plant
        const key = x + "-" + y;
        if (!entities["plants"][key]) {
            entities["plants"][key] = {};
        }
        if (entities["plants"][key][type] !== undefined) return;

        entities["plants"][key][type] = {
            genome: generateGenome(),
            state: 0,
            timeStamp: time.hours + time.days * 24
        };
    } else if (creatures[type] !== undefined) {
        // Falls du Creatures registrieren möchtest
    }
}

function drawVegetation(type, x, y) {
    if (type == null) return;
    registerEntity(type, x, y);

    // x,y sind hier logische Zeichenkoordinaten
    // "bush-0" etc. existiert in vegetation
    ctx.drawImage(
        vegetation[type + "-0"],
        x,
        y - tileSize / 4,
        tileSize * vegetationSizeFactor,
        tileSize * vegetationSizeFactor
    );
}

const chances = { // in Promille
    'bush': 3.5
};

function generateVegetation(x, y) {
    // Gleiche Noise-Funktion wie generateTile
    const value = simplex.noise2D(x / 100, y / 100);
    const randomValue = seededRandom(x * 10000 + y + seed) * 1000;

    if (value < -0.5) return null;
    if (value < -0.32) return null;
    if (value < 0.5) {
        // 3.5 von 1000 = 0.35%
        return (Math.floor(randomValue) < chances['bush']) ? 'bush' : null;
    }
    return null;
}

// =============
// KARTEN-RENDER
// =============
function drawMap() {
    // Komplett schwarz übermalen
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Wie viele Tiles passen ins Bild?
    const extraTiles = 4;
    
    // Hier nur mit der LOGISCHEN Größe rechnen, damit es auf großen Displays nicht abgeschnitten wird
    const startX = Math.floor(player.x / tileSize)
        - Math.floor(canvasLogicalWidth / tileSize / 2)
        - extraTiles;

    const startY = Math.floor(player.y / tileSize)
        - Math.floor(canvasLogicalHeight / tileSize / 2)
        - extraTiles;

    const endX = startX
        + Math.ceil(canvasLogicalWidth / tileSize)
        + 2 * extraTiles;

    const endY = startY
        + Math.ceil(canvasLogicalHeight / tileSize)
        + 2 * extraTiles;

    // Offset in logischen Pixeln
    const offsetX = mod(player.x, tileSize);
    const offsetY = mod(player.y, tileSize);

    // Tiles zeichnen
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const tileType = generateTile(x, y);

            // Rechne die Zeichenposition in logischen Koordinaten
            const screenX = (x - startX) * tileSize - offsetX;
            const screenY = (y - startY) * tileSize - offsetY;

            drawTile(tileType, screenX, screenY, x, y);
        }
    }

    // Vegetation zeichnen
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const vegType = generateVegetation(x, y);

            const screenX = (x - startX) * tileSize - offsetX;
            const screenY = (y - startY) * tileSize - offsetY;

            drawVegetation(vegType, screenX, screenY);
        }
    }
}

// =============
// SPIELER-RENDER
// =============
const entityImages = {
    static: {},
    moving: {
        player: {
            Up: 'assets/grafik/entities/moving/player/playerUp.png',
            Down: 'assets/grafik/entities/moving/player/playerDown.png',
            Left: 'assets/grafik/entities/moving/player/playerLeft.png',
            Right: 'assets/grafik/entities/moving/player/playerRight.png',
            LeftUp: 'assets/grafik/entities/moving/player/playerLeftUp.png',
            LeftDown: 'assets/grafik/entities/moving/player/playerLeftDown.png',
            RightUp: 'assets/grafik/entities/moving/player/playerRightUp.png',
            RightDown: 'assets/grafik/entities/moving/player/playerRightDown.png',
        }
    }
};

const imageCache = {};

// Rekursives Caching der entityImages
function cacheImages(obj, parentPath = '') {
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = parentPath ? `${parentPath}/${key}` : key;

        if (typeof value === 'string' && value) {
            const img = new Image();
            img.src = value;
            imageCache[currentPath] = img;
        } else if (typeof value === 'object') {
            cacheImages(value, currentPath);
        }
    }
}
cacheImages(entityImages);

function drawPlayer() {
    // Spieler soll in der Mitte des Bildschirms stehen
    let playerScreenX = (canvasLogicalWidth / 2) - (player.width / 2);
    let playerScreenY = (canvasLogicalHeight / 2) - (player.height / 2);

    let img;
    animationIndex++;

    // Wackel-Animation beim Laufen
    if (player.speed !== 0) {
        playerScreenY += amplitude * Math.sin(frequency * animationIndex);
    }

    // Bild je nach Richtung
    switch (player.direction) {
        case 'up':        img = imageCache['moving/player/Up'];        break;
        case 'down':      img = imageCache['moving/player/Down'];      break;
        case 'left':      img = imageCache['moving/player/Left'];      break;
        case 'right':     img = imageCache['moving/player/Right'];     break;
        case 'left-up':   img = imageCache['moving/player/LeftUp'];    break;
        case 'left-down': img = imageCache['moving/player/LeftDown'];  break;
        case 'right-up':  img = imageCache['moving/player/RightUp'];   break;
        case 'right-down':img = imageCache['moving/player/RightDown']; break;
    }

    if (img) {
        ctx.drawImage(img, playerScreenX, playerScreenY, player.width, player.height);
    }
}

// ===================
// TAG-/NACHT-ZYKLUS
// ===================
function updateLightlevel() {
    if (time.hours > 21 && time.hours < 4)      lightLevel = 1;
    else if (time.hours == 4)                  lightLevel = 2;
    else if (time.hours == 5)                  lightLevel = 4;
    else if (time.hours == 6)                  lightLevel = 8;
    else if (time.hours > 6 && time.hours < 19)lightLevel = 10;
    else if (time.hours == 19)                 lightLevel = 9;
    else if (time.hours == 20)                 lightLevel = 7;
    else                                       lightLevel = 3; // z.B. 21 Uhr

    lightLevel -= weather;
    if (lightLevel < 0) lightLevel = 0;
}

// ====================
// HAUPT-SPIELSCHLEIFE
// ====================
function gameLoop() {
    updateTime();
    updateLightlevel();
    updatePlayerPosition();

    // Canvas leeren
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Map & Player zeichnen
    drawMap();
    drawPlayer();

    // Tag-/Nacht-Filter
    applyTimeOfDayFilter();

    requestAnimationFrame(gameLoop);
}
gameLoop();
