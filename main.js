const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tileSize = 26; // Tile-Größe
const amplitude = 1;
const frequency = 0.5;
const seed = Math.random(); // Zufälliger Seed

let animationIndex = 0;

// Set high resolution for canvas
const scale = 2; // Adjust scale factor as needed
canvas.width = canvas.clientWidth * scale;
canvas.height = canvas.clientHeight * scale;
ctx.scale(scale, scale);

const simplex = new SimplexNoise(seed);

// Spielerposition (als Fließkommazahlen)
let player = {
    x: canvas.width / 2 / scale,
    y: canvas.height / 2 / scale,
    width: tileSize * 1.5,
    height: tileSize * 3,
    speed: 0,
    maxSpeed: 4,
    acceleration: 0.2,
    direction: 'down'
}; // Startposition in der Mitte des Canvas

// Bewegung des Spielers
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

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

function generateTile(x, y) {
    const value = simplex.noise2D(x / 100, y / 100);
    if (value < -0.5) return 'water';
    if (value < -0.32) return 'sand';
    if (value < 0.5) return 'grass';
    return 'mountain';
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

    // Berechnung für Tiles basierend auf den aktuellen Start- und Endpunkten
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const tileType = generateTile(x, y);
            const screenX = (x - startX) * tileSize * scale - offsetX;
            const screenY = (y - startY) * tileSize * scale - offsetY;
            drawTile(tileType, screenX / scale, screenY / scale, x, y);
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
    updatePlayerPosition();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

// Deaktivieren Sie die Bildglättung (Image Smoothing)
ctx.imageSmoothingEnabled = false;

gameLoop();