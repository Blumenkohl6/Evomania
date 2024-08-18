const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tileSize = 27; // Tile-Größe
const amplitude = 1.5;
const frequency = 0.5;
const seed = Math.random(); // Zufälliger Seed

let animationIndex = 0;

// Set high resolution for canvas
const scale = 2; // Adjust scale factor as needed
canvas.width = canvas.clientWidth * scale;
canvas.height = canvas.clientHeight * scale;
ctx.scale(scale, scale);

const simplex = new SimplexNoise(seed);

let player = {
    x: canvas.width / 2 / scale,
    y: canvas.height / 2 / scale,
    width: tileSize * 1.4,
    height: tileSize * 2.7,
    speed: 0,
    maxSpeed: 4,
    acceleration: 0.15,
    direction: 'down',
    inv: []
};

const entities = {
    plants: {},
    creatures: {}
};

// Bewegung des Spielers
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Rufe spawnPlants in der setup-Funktion auf
function setup() {
    readUrl();
    preventSpawnTrap(true);
}

function preventSpawnTrap(first) {
    const tileX = player.x / tileSize - 4;
    const tileY = player.y / tileSize - 3;
    const tileType = generateTile(tileX, tileY);

    if (tileType == 'mountain' || tileType == 'water') {
        player.x += 2;
        player.y += 2;
        preventSpawnTrap(false);
    } else if (!first) {
        player.x += (Math.floor(Math.random() * 6) + 3) * tileSize;
        player.y += (Math.floor(Math.random() * 6) + 3) * tileSize;
        preventSpawnTrap(true);
    }
}

function readUrl() {}

setup();

let time = {
    hours: 6, // Startzeit 6:00 Uhr morgens
    minutes: 0,
    days: 1,
    timeScale: 6 * 60 / 60, // Verhältnis von Echtzeit zu Spielzeit (6h in 60 Sekunden)
    lastUpdate: Date.now() // Startzeit für die Zeitberechnung
};

function updateTime() {
    const now = Date.now();
    const delta = (now - time.lastUpdate) / 1000; // Vergangene Zeit in Sekunden
    time.lastUpdate = now;

    // Aktualisiere die Spielzeit basierend auf dem Delta und dem timeScale
    const gameMinutesPassed = delta * time.timeScale;
    time.minutes += gameMinutesPassed;

    // Update Stunden und Tage, wenn nötig
    if (time.minutes >= 60) {
        time.hours += Math.floor(time.minutes / 60);
        time.minutes %= 60; // Rest-Minuten nach Stundenanpassung

        if (time.hours >= 24) {
            time.days += Math.floor(time.hours / 24);
            time.hours %= 24; // Rest-Stunden nach Tagesanpassung
        }
    }
}

function applyTimeOfDayFilter() {
    let color;
    const timeOfDay = time.hours + time.minutes / 60; // Exakte Zeit in Dezimalform (z.B. 6.5 für 6:30 Uhr)
    const maxAlpha = 0.5; // Maximale Dunkelheit der Nacht

    if (timeOfDay >= 19 || timeOfDay < 6) { // Nacht oder Übergänge zur/von Nacht (19:00 - 7:00 Uhr)
        let alpha = 0;

        if (timeOfDay >= 19 && timeOfDay < 21) { // Übergang von Abend zu Nacht (19:00 - 21:00 Uhr)
            alpha = (timeOfDay - 19) / 2 * maxAlpha; // Sanfter Übergang mit maxAlpha-Begrenzung
        } else if (timeOfDay >= 5 && timeOfDay < 7) { // Übergang von Nacht zu Morgen (5:00 - 7:00 Uhr)
            alpha = (6 - timeOfDay) / 2 * maxAlpha; // Sanfter Übergang mit maxAlpha-Begrenzung
        } else { // Tiefe Nacht (21:00 - 4:00 Uhr)
            alpha = maxAlpha; // Konstante Dunkelheit in der Nacht
        }

        color = `rgba(0, 0, 0, ${alpha})`;
    }

    if (color) {
        ctx.save();
        ctx.globalAlpha = 1; // Setze globale Alpha auf 1, da wir den Alpha-Wert in der Farbe selbst steuern
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

function updatePlayerPosition() {
    let moveX = 0;
    let moveY = 0;

    if (keys['ArrowUp'] || keys['w']) moveY -= 1;
    if (keys['ArrowDown'] || keys['s']) moveY += 1;
    if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
    if (keys['ArrowRight'] || keys['d']) moveX += 1;

    // Normiere den Vektor, wenn es eine diagonale Bewegung gibt
    if (moveX !== 0 || moveY !== 0) {
        if (player.speed < player.maxSpeed) player.speed += player.acceleration;

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



    // Berechne neue Positionen
    const newX = player.x + moveX;
    const newY = player.y + moveY;

    // Prüfe Kollisionen
    const tileX = newX / tileSize - 4;
    const tileY = newY / tileSize - 3;
    const tileType = generateTile(tileX, tileY);

    if (tileType !== 'mountain' && tileType !== 'water') {
        player.x = newX;
        player.y = newY;
    } else player.speed = 0;
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

function cacheImages(obj, parentPath = '') {
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = parentPath ? `${parentPath}/${key}` : key;

        if (typeof value === 'string' && value) {
            // If value is a string and not empty, cache the image
            const img = new Image();
            img.src = value;
            imageCache[currentPath] = img;
        } else if (typeof value === 'object') {
            // Recursively go deeper into the object
            cacheImages(value, currentPath);
        }
    }
    status++;
}

// Call the cacheImages function with the root entityImages object
cacheImages(entityImages);

const detailCache = {};

function loadDetailImages() {
    for (const [key, src] of Object.entries(detailImages)) {
        const img = new Image();
        img.src = src;
        detailCache[key] = img;
    }
    status++;
}

loadDetailImages();

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getDetailPosition(tileX, tileY, detailType, detailWidth, detailHeight, minDistance) {
    const baseSeed = tileX * 31 + tileY * 17; // Basis-Seed basierend auf der Tile-Position
    const detailSeed = baseSeed + detailType.hashCode(); // Seed für Detailtyp hinzufügen
    const randomValue = seededRandom(detailSeed);

    // Maximale mögliche Positionen unter Berücksichtigung des Mindestabstands
    const maxDetailX = tileSize - detailWidth - minDistance;
    const maxDetailY = tileSize - detailHeight - minDistance;

    // Berechne die Position der Details innerhalb der Tile, angepasst auf die Detailgröße
    let detailX = Math.floor(randomValue * maxDetailX);
    let detailY = Math.floor(randomValue * maxDetailY);

    // Falls die berechnete Position zu nah an der Kachelkante ist, bewege sie innerhalb des zulässigen Bereichs
    detailX = Math.max(detailX, minDistance);
    detailY = Math.max(detailY, minDistance);

    return { detailX, detailY };
}

String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function getRandomDetails(type, tileX, tileY) {
    const details = tileDetails[type];
    if (!details || details.length === 0) return [];

    const seed = tileX * 31 + tileY * 17;
    const randomValue = seededRandom(seed);

    let cumulativeProbability = 0;
    let chosenDetails = [];

    // Gehe die Details durch und wähle diejenigen basierend auf der Wahrscheinlichkeit
    for (const detail of details) {
        cumulativeProbability += detail.probability;
        if (randomValue < cumulativeProbability) {
            chosenDetails.push(detail);
            // Sobald ein Detail ausgewählt wurde, stoppen wir hier, da die Wahrscheinlichkeit bereits angewendet wurde
            break;
        }
    }

    return chosenDetails;
}

function drawTile(type, x, y, tileX, tileY) {
    switch (type) {
        case 'water':
            ctx.fillStyle = '#1E90FF';
            break;
        case 'sand':
            ctx.fillStyle = '#FFD700';
            break;
        case 'grass':
            ctx.fillStyle = '#8bc34a';
            break;
        case 'mountain':
            ctx.fillStyle = '#2F4F4F';
            break;
    }
    ctx.fillRect(x, y, tileSize, tileSize);

    // Holen Sie sich alle Details für diese Kachel
    const details = getRandomDetails(type, tileX, tileY);
    for (const detail of details) {
        const detailImg = detailCache[detail.type];
        if (detailImg) {
            const detailWidth = (detail.width || detail.size) * tileSize / 4;
            const detailHeight = (detail.height || detail.size) * tileSize / 4;

            // Berechne die Größe basierend auf dem Seitenverhältnis, falls angegeben
            const ratio = detail.ratio || (detail.width / detail.height) || 1;
            const calculatedHeight = detailWidth / ratio;

            // Berechne den Mindestabstand
            const minDistance = detail.minDistance || 0;

            // Berechne die Position der Detailbilder
            const { detailX, detailY } = getDetailPosition(tileX, tileY, detail.type, detailWidth, calculatedHeight, minDistance);
            ctx.drawImage(detailImg, x + detailX, y + detailY, detailWidth, calculatedHeight);
        }
    }
}

const vegetation = {
    'bush': 'assets/grafik/entities/static/bush.png'
};

const vegetationSizeFactor = 1.8;

function loadVegetation() {
    for (plant in vegetation) {
        let img = document.createElement('img');
        img.src = vegetation[plant];
        vegetation[plant] = img;
    }
}

loadVegetation();

function drawVegetation(type, x, y) {
    if (type == null) return;
    registerEntity(type, x, y);
    ctx.drawImage(vegetation[type], x, y - tileSize / 4, tileSize * vegetationSizeFactor, tileSize * vegetationSizeFactor);
}

function generateGenome() {
    return {
        attractivity: 0,
        reproduction: 1,
        growth: 1,
        edibility: 0
    };
}

function registerEntity(type, screenX, screenY) {
    const x = player.x + (screenX - canvas.width / 2);
    const y = player.y + (screenY - canvas.height / 2);

    if (vegetation[type] != undefined) { //plant
        if (!entities.plants[x + "-" + y]) entities.plants[x + "-" + y] = {};
        if (entities.plants[x + "-" + y][type] != undefined) return;
        entities.plants[x + "-" + y][type] = {
            genome: generateGenome(),
            state: 0
        };
    } else if (creatures[type] != undefined) { //creature

    }
}

const chances = { //in Promille
    'bush': 3.5
};

function generateTile(x, y) {
    const value = simplex.noise2D(x / 100, y / 100);

    if (value < -0.5) return 'water';
    if (value < -0.32) return 'sand';
    if (value < 0.5) return 'grass';
    return 'mountain';
}

generateTile();

function generateVegetation(x, y) {
    const value = simplex.noise2D(x / 100, y / 100);
    const randomValue = seededRandom(x * 10000 + y + seed) * 1000;

    if (value < -0.5) return null;
    if (value < -0.32) return null;
    if (value < 0.5) return (Math.floor(randomValue) < chances['bush']) ? 'bush' : null;
    return null;
}


function drawMap() {
    // Setze die Hintergrundfarbe
    ctx.fillStyle = '#000'; // z.B. Schwarz als Hintergrund
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Erweiterte Anzahl an Kacheln in jede Richtung für die Pufferzone
    const extraTiles = 4; // Vergrößere den extra Pufferbereich

    // Berechne den Startpunkt für die Kacheln basierend auf der Spielerposition
    const startX = Math.floor(player.x / tileSize) - Math.floor(canvas.width / tileSize / 2 / scale) - extraTiles;
    const startY = Math.floor(player.y / tileSize) - Math.floor(canvas.height / tileSize / 2 / scale) - extraTiles;
    const endX = startX + Math.ceil(canvas.width / tileSize / scale) + 2 * extraTiles;
    const endY = startY + Math.ceil(canvas.height / tileSize / scale) + 2 * extraTiles;

    const offsetX = (player.x % tileSize) * scale;
    const offsetY = (player.y % tileSize) * scale;

    // Tiles zeichen
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const tileType = generateTile(x, y);
            const screenX = (x - startX) * tileSize * scale - offsetX;
            const screenY = (y - startY) * tileSize * scale - offsetY;
            drawTile(tileType, screenX / scale, screenY / scale, x, y);
        }
    }

    // Vegetation zeichnen
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const vegType = generateVegetation(x, y);
            const screenX = (x - startX) * tileSize * scale - offsetX;
            const screenY = (y - startY) * tileSize * scale - offsetY;
            drawVegetation(vegType, screenX / scale, screenY / scale, x, y)
        }
    }
}

function drawPlayer() {
    let playerScreenX = canvas.width / 2 / scale - player.width / 2;
    let playerScreenY = canvas.height / 2 / scale - player.height / 2;

    let img;

    animationIndex++;

    if (player.speed !== 0) {
        playerScreenY = playerScreenY + amplitude * Math.sin(frequency * animationIndex);
    }

    switch (player.direction) {
        case 'up':
            img = imageCache['moving/player/Up'];
            break;
        case 'down':
            img = imageCache['moving/player/Down'];
            break;
        case 'left':
            img = imageCache['moving/player/Left'];
            break;
        case 'right':
            img = imageCache['moving/player/Right'];
            break;
        case 'left-up':
            img = imageCache['moving/player/LeftUp'];
            break;
        case 'left-down':
            img = imageCache['moving/player/LeftDown'];
            break;
        case 'right-up':
            img = imageCache['moving/player/RightUp'];
            break;
        case 'right-down':
            img = imageCache['moving/player/RightDown'];
            break;
    }

    ctx.drawImage(img, playerScreenX, playerScreenY, player.width, player.height);
}

function gameLoop() {
    updateTime();
    updatePlayerPosition();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawPlayer();
    applyTimeOfDayFilter();
    requestAnimationFrame(gameLoop);
}


// Deaktivieren Sie die Bildglättung (Image Smoothing)
ctx.imageSmoothingEnabled = false;

gameLoop();