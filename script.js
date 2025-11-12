// Penguin Hacker RPG - Main Game Script

// Game state
const gameState = {
    currentLevel: [0, 0], // x, y coordinates in the world grid
    levelData: null,      // Current level layout
    playerPosition: [10, 18],
    playerInventory: {
        accessKeys: [],
        tools: [],
        skillLevels: {
            hacking: 1,
            networking: 1,
            cryptography: 1
        }
    },
    visitedLevels: {},
    activeNPC: null,
    activePuzzle: null,
    lockedDoors: {},       // Track which doors are locked (by ID)
    completedPuzzles: []  // Track which puzzles have been completed
};

// Map to store relationships between exits and puzzles
const exitDoorPuzzleMap = {};

// Constants
const TILE_SIZE = 1;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const MOVEMENT_SPEED = 0.1;

// Tile mapping
const TileType = {
    FLOOR: 'floor',
    WALL: 'wall',
    ENTRANCE: 'entrance',
    EXIT_RIGHT: 'exit_right',
    EXIT_BOTTOM: 'exit_bottom',
    EXIT_TOP: 'exit_top',
    EXIT_LEFT: 'exit_left',
    EXIT_RIGHT_LOCKED: 'exit_right_locked',
    EXIT_BOTTOM_LOCKED: 'exit_bottom_locked',
    EXIT_TOP_LOCKED: 'exit_top_locked',
    EXIT_LEFT_LOCKED: 'exit_left_locked',
    SERVER: 'server',
    COMPUTER: 'computer',
    ROUTER: 'router',
    SATELLITE: 'satellite',
    DESK: 'desk',
    CHAIR: 'chair',
    NPC: 'npc',
    PUZZLE: 'puzzle',
    PORTAL: 'portal'  // New tile type for the Vibeverse Portal
};

// Map tile values to types
const tileMapping = {
    0: TileType.FLOOR,
    1: TileType.WALL,
    2: TileType.ENTRANCE,
    3: TileType.EXIT_BOTTOM,
    4: TileType.EXIT_TOP,
    5: TileType.EXIT_RIGHT,
    6: TileType.EXIT_LEFT,
    7: TileType.SERVER,
    8: TileType.COMPUTER,
    9: TileType.ROUTER,
    10: TileType.SATELLITE,
    11: TileType.DESK,
    12: TileType.CHAIR,
    13: TileType.NPC,
    14: TileType.PUZZLE,
    // Locked versions of doors (offset by 20)
    23: TileType.EXIT_BOTTOM_LOCKED,
    24: TileType.EXIT_TOP_LOCKED,
    25: TileType.EXIT_RIGHT_LOCKED,
    26: TileType.EXIT_LEFT_LOCKED,
    // Portal tile
    30: TileType.PORTAL
};

// Reverse mapping for level generation
const reverseMapping = {};
Object.keys(tileMapping).forEach(key => {
    reverseMapping[tileMapping[key]] = parseInt(key);
});

// Dom elements
const loadingElement = document.getElementById('loading');
const loadingProgress = document.getElementById('loadingProgress');
const dialogueBox = document.getElementById('dialogueBox');
const gameInfoElement = document.getElementById('gameInfo');
const chatInterface = document.getElementById('chatInterface');
const chatHeader = document.getElementById('chatHeader');
const currentNPCElement = document.getElementById('currentNPC');
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const closeChatBtn = document.getElementById('closeChatBtn');
const puzzleInterface = document.getElementById('puzzleInterface');
const puzzleTitle = document.getElementById('puzzleTitle');
const puzzleDescription = document.getElementById('puzzleDescription');
const puzzleContent = document.getElementById('puzzleContent');
const puzzleInput = document.getElementById('puzzleInput');
const submitPuzzleBtn = document.getElementById('submitPuzzleBtn');
const closePuzzleBtn = document.getElementById('closePuzzleBtn');
const puzzleMessage = document.getElementById('puzzleMessage');
const inventoryIcon = document.getElementById('inventoryIcon');
const inventoryPanel = document.getElementById('inventoryPanel');
const keysContainer = document.getElementById('keysContainer');
const skillsContainer = document.getElementById('skillsContainer');

// THREE.js variables
let scene, camera, renderer;
let worldGroup; // Parent group to enable board/world rotation (pivot at center)
let boardGroup; // Child group offset so rotation is around center
let player, targetIndicator, moveTarget;
let tiles = [];
let collisionMap = [];
let interactableObjects = [];
let cameraSettings = {
    height: 12,
    distance: 8,
    rotation: 0,
    tilt: 0.5,
    tiltMin: 0.1,
    tiltMax: 0.9,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2.0,
    rotationSpeed: 0.005,  // Reduced speed for smoother rotation
    tiltSpeed: 0.005,      // Reduced speed for smoother tilt
    panSpeed: 0.1,         // Speed for panning with middle mouse button
    dampingFactor: 0.85,   // Increased damping (from 0.92) to stop rotation more quickly
    // For smooth camera movement
    currentRotationVelocity: 0,
    targetRotationVelocity: 0,
    currentTiltVelocity: 0,
    targetTiltVelocity: 0,
    panOffset: { x: 0, z: 0 },
    targetPanOffset: { x: 0, z: 0 }
};

// Camera modes: 'top' (static overhead), 'follow' (third-person in front of player), or 'side' (side view)
let cameraMode = 'follow';
// Board rotation in 90-degree steps for top view (0..3), applied to worldGroup
let boardRotationQuarter = 0;
// Top view zoom (1.0 = default; higher = closer)
let topViewZoom = 1.0;
const TOP_ZOOM_MIN = 1.0, TOP_ZOOM_MAX = 2.5, TOP_ZOOM_STEP = 0.2;
// Player rotation smoothing (0 = facing forward/positive Z)
let playerDesiredRotation = 0;

// Cache for geometries, materials, and textures
const geometryCache = {};
const materialCache = {};
const textureCache = {};

// Game groups
let floorGroup, wallGroup, objectGroup;

// Input state
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false,
    e: false
};

// Mouse controls
const mouse = {
    isRightDown: false,
    lastX: 0,
    lastY: 0
};

// Loading system
let npcs = []; // Array to track NPCs
let resourcesLoaded = 0;
const totalResources = 15;

function updateLoadingProgress(step = 1) {
    resourcesLoaded += step;
    const progress = Math.min((resourcesLoaded / totalResources) * 100, 100);
    loadingProgress.style.width = `${progress}%`;

    if (progress >= 100) {
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 500);
    }
}

// Initialize loading screen with robot model
function initLoadingScreen() {
    const container = document.getElementById('loadingScene');
    if (!container) return;

    // Create a small THREE.js scene for the loading screen
    const loadingScene = new THREE.Scene();
    loadingScene.background = null; // Transparent background

    const width = 300, height = 300;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0); // Fully transparent
    container.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    loadingScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    loadingScene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 10);
    pointLight.position.set(2, 2, 2);
    loadingScene.add(pointLight);

    // Add "HBD robot" text using canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HBD robot', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(4, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.y = 0.8; // Move lower, below the initializing text
    textMesh.position.z = 0.5;
    loadingScene.add(textMesh);

    // Load the robot model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'character/robot.glb',
        function (gltf) {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);
            model.position.y = 0;
            model.rotation.y = Math.PI; // Start rotated 180 degrees

            model.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });

            loadingScene.add(model);

            // Animate the model - hide text and model on game start
            let animationId;
            const loadingStartTime = Date.now();
            function animateLoadingScreen() {
                animationId = requestAnimationFrame(animateLoadingScreen);
                model.rotation.y += 0.06; // Faster spin (3x original 0.02)

                // Keep loading screen visible 1 second longer after game loads
                const elapsedTime = Date.now() - loadingStartTime;
                if (loadingElement.style.display === 'none' && elapsedTime > 1000) {
                    cancelAnimationFrame(animationId);
                } else {
                    renderer.render(loadingScene, camera);
                }
            }
            animateLoadingScreen();
        },
        undefined,
        function (error) {
            console.warn('Could not load robot model for loading screen:', error);
        }
    );
}

// Initialize game
async function initGame() {
    // Initialize loading screen with robot model
    initLoadingScreen();
    updateLoadingProgress(1);

    // Initialize THREE.js scene
    initScene();
    updateLoadingProgress(2);

    // Initialize NPC system
    initializeNPCSystem();
    updateLoadingProgress();
    
    // Load initial level
    await loadLevel([0, 0], 'bottom');
    updateLoadingProgress(3);
    
    // Set up event listeners
    setupEventListeners();
    updateLoadingProgress();
    // Create UI controls and apply initial camera/board state
    createTopViewControls();
    applyBoardRotation();
    applyCameraMode(true);
    
    // Update controls text for new camera modes
    const controlsElement = document.getElementById('controls');
    controlsElement.textContent = "WASD: Move | Click: Move to square | E: Terminal | Space: Interact | V: Cycle View (Top/Follow/Side) | Arrows: Rotate board (Top view only)";
    
    // Show welcome message
    showDialogue("SYSTEM LOG: Connection established to Server Room Alpha. Use WASD/arrows to move and SPACE to interact with objects. Press E to open terminal. Security systems active.", 10000);
    
    // Start the game loop
    animate(0);
}

// Initialize THREE.js scene
function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(GRID_WIDTH/2, 12, GRID_HEIGHT/2 + 8);
    camera.lookAt(GRID_WIDTH/2, 0, GRID_HEIGHT/2);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Create lighting
    setupLighting();
    
    // Create world parent group for rotation (top view board rotation around center)
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    // Create board group offset so rotation is around the board center
    boardGroup = new THREE.Group();
    const centerX = (GRID_WIDTH * TILE_SIZE) / 2;
    const centerZ = (GRID_HEIGHT * TILE_SIZE) / 2;
    worldGroup.position.set(centerX, 0, centerZ);
    boardGroup.position.set(-centerX, 0, -centerZ);
    worldGroup.add(boardGroup);
    // Create groups for better performance
    floorGroup = new THREE.Group();
    wallGroup = new THREE.Group();
    objectGroup = new THREE.Group();
    boardGroup.add(floorGroup);
    boardGroup.add(wallGroup);
    boardGroup.add(objectGroup);
    
    // Create target indicator for movement
    targetIndicator = createTargetIndicator();
    
    // Create player character
    player = createCyborgPenguinCharacter();
    boardGroup.add(player);
    
    // Handle window resizing
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Set up lighting
function setupLighting() {
    // Ambient light - increased brightness for better character visibility
    const ambientLight = new THREE.AmbientLight(0x444444, 0.7);
    scene.add(ambientLight);

    // Directional light for shadows - brighter
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(GRID_WIDTH/2, 15, GRID_HEIGHT/2);
    directionalLight.castShadow = true;

    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -GRID_WIDTH;
    directionalLight.shadow.camera.right = GRID_WIDTH;
    directionalLight.shadow.camera.top = GRID_HEIGHT;
    directionalLight.shadow.camera.bottom = -GRID_HEIGHT;
    scene.add(directionalLight);

    // Add key light for character (from front-right)
    const keyLight = new THREE.DirectionalLight(0x88ddff, 0.6);
    keyLight.position.set(10, 8, 15);
    scene.add(keyLight);

    // Add fill light from the left (slightly warmer)
    const fillLight = new THREE.DirectionalLight(0xffaa88, 0.3);
    fillLight.position.set(-8, 6, 10);
    scene.add(fillLight);

    // Add decorative point lights
    addPointLight(5, 1, 5, 0x00ff00, 2.5, 6);
    addPointLight(15, 1, 15, 0x0066ff, 2.5, 6);
    addPointLight(5, 1, 15, 0xff3300, 2.5, 6);
    addPointLight(15, 1, 5, 0xffaa00, 2.5, 6);
}

// Helper to add point lights
function addPointLight(x, y, z, color, intensity, distance) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    light.castShadow = false;
    scene.add(light);
    return light;
}

// Create player character
function createCyborgPenguinCharacter() {
    // Keep the original function name for compatibility, but load the robot model
    const group = new THREE.Group();

    const loader = new THREE.GLTFLoader();
    loader.load(
        'character/robot.glb',
        function (gltf) {
            gltf.scene.scale.set(TILE_SIZE * 0.8, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
            gltf.scene.position.y = TILE_SIZE * 0.4;
            gltf.scene.rotation.y = -Math.PI / 2; // Rotate -90 degrees so W moves away from camera and S moves toward

            group.userData = {
                ...group.userData,
                walkCycle: 0
            };

            gltf.scene.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });

            group.add(gltf.scene);

            // Update loading progress
            updateLoadingProgress(1);
            console.log('Robot model loaded successfully');
        },
        undefined,
        function (error) {
            console.error('Error loading robot model, using fallback:', error);
            const fallback = createSimpleRobotFallback();
            group.add(fallback);
        }
    );

    // Add multiple lights to the character for better visibility
    const characterLight = new THREE.PointLight(0x00ffff, 0.8, TILE_SIZE * 3);
    characterLight.position.set(0, TILE_SIZE * 0.8, 0);
    group.add(characterLight);

    // Add a warm accent light
    const accentLight = new THREE.PointLight(0xffaa00, 0.4, TILE_SIZE * 2.5);
    accentLight.position.set(TILE_SIZE * 0.3, TILE_SIZE * 0.5, TILE_SIZE * 0.3);
    group.add(accentLight);

    return group;
}

// Wrapper with new naming for future references
function createRobotCharacter() {
    return createCyborgPenguinCharacter();
}

function createSimpleRobotFallback() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
        getGeometry('cylinder', TILE_SIZE * 0.2, TILE_SIZE * 0.2, TILE_SIZE * 0.6, 16),
        getMaterial('standard', { color: 0x445566, metalness: 0.8, roughness: 0.3 })
    );
    body.position.y = TILE_SIZE * 0.3;
    g.add(body);

    const head = new THREE.Mesh(
        getGeometry('box', TILE_SIZE * 0.25, TILE_SIZE * 0.2, TILE_SIZE * 0.25),
        getMaterial('standard', { color: 0x222833, metalness: 0.6, roughness: 0.4, emissive: 0x003344, emissiveIntensity: 0.2 })
    );
    head.position.y = TILE_SIZE * 0.7;
    g.add(head);

    const eye = new THREE.Mesh(
        getGeometry('box', TILE_SIZE * 0.18, TILE_SIZE * 0.04, TILE_SIZE * 0.02),
        getMaterial('standard', { color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 })
    );
    eye.position.set(0, TILE_SIZE * 0.72, TILE_SIZE * 0.14);
    g.add(eye);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
}

// Fallback character creation function (copy of the original implementation)
function createFallbackPenguinCharacter() {
    // Simplified fallback now just reuses simple robot placeholder
    return createSimpleRobotFallback();
}

// Animation function to update the cyborg penguin
function animateCyborgPenguin(penguin, deltaTime) {
    if (!penguin) return;
    
    const time = performance.now() * 0.001; // Current time in seconds
    
    // Check if this is the GLB model or fallback model
    const isGlbModel = penguin.children.length > 0 && penguin.children[0].isGroup;
    
    if (isGlbModel) {
        // Animation for GLB model
        // Check if the penguin is moving
        const isMoving = Math.abs(penguin.position.x - penguin.userData.lastX || 0) > 0.001 || 
                         Math.abs(penguin.position.z - penguin.userData.lastZ || 0) > 0.001;
                        
        // Store current position for next frame
        penguin.userData.lastX = penguin.position.x;
        penguin.userData.lastZ = penguin.position.z;
        
        if (isMoving) {
            // Update walk cycle
            penguin.userData.walkCycle += deltaTime * 5;
            
            // Simple up and down movement for walking animation
            // Keep the base position at TILE_SIZE * 0.4 (the raised height) and apply animation on top of that
            penguin.children[0].position.y = TILE_SIZE * 0.4 + Math.abs(Math.sin(penguin.userData.walkCycle) * 0.1);
            
            // Slight rotation for walking
            penguin.children[0].rotation.y = Math.sin(penguin.userData.walkCycle * 0.5) * 0.1;
        } else {
            // Subtle idle animation
            // Keep the base position at TILE_SIZE * 0.4 (the raised height) and apply animation on top of that
            penguin.children[0].position.y = TILE_SIZE * 0.4 + Math.sin(time * 1.5) * 0.05;
            penguin.children[0].rotation.y = Math.sin(time * 0.8) * 0.05;
        }
    } else {
        // Original animation for fallback character
        // Animate server lights on backpack
        if (penguin.userData.serverLights) {
            penguin.userData.serverLights.forEach((light, index) => {
                if (light.material) {
                    const blinkRate = 0.5 + index * 0.7; // Different rates for different lights
                    const intensity = (Math.sin(time * blinkRate * Math.PI) * 0.5 + 0.5);
                    light.material.emissiveIntensity = intensity;
                }
            });
        }
        
        // Walking animation for arms
        if (penguin.userData.armTerminal && penguin.userData.rightArm) {
            // Check if the penguin is moving (based on position changes)
            const isMoving = Math.abs(penguin.position.x - penguin.userData.lastX || 0) > 0.001 || 
                            Math.abs(penguin.position.z - penguin.userData.lastZ || 0) > 0.001;
                            
            // Store current position for next frame
            penguin.userData.lastX = penguin.position.x;
            penguin.userData.lastZ = penguin.position.z;
            
            if (isMoving) {
                // Update walk cycle
                penguin.userData.walkCycle += deltaTime * 5;
                
                // Swing arms while walking
                const armSwing = Math.sin(penguin.userData.walkCycle) * 0.3;
                penguin.userData.armTerminal.rotation.x = armSwing;
                penguin.userData.rightArm.rotation.x = -armSwing;
                
                // Also swing legs if they exist
                if (penguin.userData.leftLeg && penguin.userData.rightLeg) {
                    penguin.userData.leftLeg.rotation.x = -armSwing * 0.8;
                    penguin.userData.rightLeg.rotation.x = armSwing * 0.8;
                }
            } else {
                // Reset to neutral position when not moving
                penguin.userData.armTerminal.rotation.x = Math.sin(time * 0.5) * 0.05;
                penguin.userData.rightArm.rotation.x = Math.cos(time * 0.5) * 0.05;
                
                // Reset legs
                if (penguin.userData.leftLeg && penguin.userData.rightLeg) {
                    penguin.userData.leftLeg.rotation.x = 0;
                    penguin.userData.rightLeg.rotation.x = 0;
                }
            }
        }
        
        // Animate hand light
        if (penguin.userData.handLight && penguin.userData.handLight.material) {
            penguin.userData.handLight.material.emissiveIntensity = 0.5 + Math.sin(time * 2.5) * 0.3;
        }
    }
}
// (Legacy fallback penguin implementation fully removed)

// Create movement target indicator
function createTargetIndicator() {
    const geometry = getGeometry('ring', 0.2, 0.3, 32);
    const material = getMaterial('basic', { 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.y = 0.05; // Slightly above the floor
    ring.visible = false;
    if (boardGroup) {
        boardGroup.add(ring);
    } else {
        scene.add(ring);
    }
    return ring;
}

// Function to provide guidance to player when entering a level
function providePlayerGuidance() {
    const levelKey = `${gameState.currentLevel[0]}_${gameState.currentLevel[1]}`;
    
    // Check if this is the first time in this level
    if (!gameState.visitedLevels[levelKey].hasOwnProperty('firstVisit')) {
        gameState.visitedLevels[levelKey].firstVisit = true;
        
        // Count puzzles and locked doors in the level
        const puzzles = interactableObjects.filter(obj => obj.userData.type === TileType.PUZZLE);
        const lockedExits = interactableObjects.filter(obj => 
            obj.userData.type.includes('exit') && obj.userData.type.includes('locked')
        );
        
        // Prepare guidance message
        let message = "";
        
        // First level - tutorial guidance
        if (gameState.currentLevel[0] === 0 && gameState.currentLevel[1] === 0) {
            message = "WELCOME TO PENGUIN HACKER RPG\n\nAs a cybersecurity expert, your mission is to infiltrate the corporate network and expose the Iceberg Protocol.\n\nRed doors are locked. Find and solve puzzles to unlock them.";
        } 
        // Any other level - contextual guidance
        else {
            if (puzzles.length > 0) {
                message = `SECTOR SCAN COMPLETE\n\nThis area contains ${puzzles.length} hacking challenge${puzzles.length !== 1 ? 's' : ''} and ${lockedExits.length} locked door${lockedExits.length !== 1 ? 's' : ''}.`;
                
                if (lockedExits.length > 0) {
                    message += "\n\nSolve the hacking challenges to unlock doors and progress further into the network.";
                }
            } else if (lockedExits.length > 0) {
                message = "SECTOR SCAN COMPLETE\n\nThis area contains locked doors but no visible puzzles. Check nearby rooms or use the terminal to find clues.";
            } else {
                message = "SECTOR SCAN COMPLETE\n\nThis area appears to be a transit hub. All doors are unlocked. Continue exploring to find more secure areas.";
            }
        }
        
        // Show guidance
        showDialogue(message, 8000);
        
        // For the first level, add additional computer hint after a delay
        if (gameState.currentLevel[0] === 0 && gameState.currentLevel[1] === 0) {
            setTimeout(() => {
                showDialogue("HINT: Press 'E' when near a computer to access its terminal.", 5000);
            }, 9000);
        }
    }
}

// Load a level by coordinates
async function loadLevel(coords, entryDirection) {
    // Check if we already have this level cached
    const levelKey = `${coords[0]}_${coords[1]}`;
    if (gameState.visitedLevels[levelKey]) {
        setLevel(gameState.visitedLevels[levelKey]);
        
        // Setup locked doors for this level
        setupLockedDoors();
        
        // Assign puzzles to locked doors
        assignPuzzlesToDoors();
        
        // Provide guidance
        providePlayerGuidance();
        
        return;
    }
    
    // Fetch the level from the server
    try {
        const response = await fetch('level.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'action': 'generate_level',
                'entry_direction': entryDirection,
                'level_coords': JSON.stringify(coords)
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to load level');
        }
        
        const levelData = await response.json();
        
        // Cache the level
        gameState.visitedLevels[levelKey] = levelData;
        
        // Set the level
        setLevel(levelData);
        
        // Update game state
        gameState.currentLevel = coords;
        gameState.playerPosition = levelData.entry_point;
        
        // Update UI
        updateGameInfo();
        
        // Setup locked doors for this level
        setupLockedDoors();
        
        // Assign puzzles to locked doors
        assignPuzzlesToDoors();
        
        // Provide guidance
        providePlayerGuidance();
    } catch (error) {
        console.error('Error loading level:', error);
        showDialogue("ERROR: Failed to load level data. Connection interrupted.", 5000);
    }
}

// Function to setup the locked state of doors
function setupLockedDoors() {
    // Initialize doors locked state if not already set
    if (!gameState.lockedDoors) {
        gameState.lockedDoors = {};
    }
    
    // Get all exit doors in the current level
    const exitTiles = [];
    const exits = interactableObjects.filter(obj => obj.userData.type.includes('exit'));
    
    exits.forEach(exit => {
        // Create a unique ID for this exit based on level and position
        const exitId = `exit_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${exit.userData.gridX}_${exit.userData.gridZ}`;
        
        // Map the direction to our door_x_y_direction format for terminal unlocks
        let direction = '';
        if (exit.userData.type.includes('top')) direction = 'north';
        if (exit.userData.type.includes('bottom')) direction = 'south';
        if (exit.userData.type.includes('right')) direction = 'east';
        if (exit.userData.type.includes('left')) direction = 'west';
        
        const doorKey = `door_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${direction}`;
        
        // If this door was unlocked via terminal (sysadmin override)
        if (gameState.unlockedDoors && (
            gameState.unlockedDoors[doorKey] === true || 
            gameState.unlockedDoors[`door_${exit.userData.gridX}_${exit.userData.gridZ}`] === true
        )) {
            // Unlock this door
            gameState.lockedDoors[exitId] = false;
        }
        // If this door has an assigned puzzle
        else if (exitDoorPuzzleMap.hasOwnProperty(exitId)) {
            const puzzleId = exitDoorPuzzleMap[exitId];
            
            // If puzzle has been completed, unlock the door
            if (gameState.completedPuzzles.includes(puzzleId)) {
                gameState.lockedDoors[exitId] = false;
            } else {
                // Otherwise, lock the door
                gameState.lockedDoors[exitId] = true;
            }
        } 
        // Default to locked for new doors
        else if (!gameState.lockedDoors.hasOwnProperty(exitId)) {
            // Assign a puzzle to this door
            assignPuzzleToDoor(exitId);
            
            // Lock the door initially
            gameState.lockedDoors[exitId] = true;
        }
    });
    
    // Update visuals for locked doors
    updateDoorVisuals();
    
    // Update visuals for puzzles
    updatePuzzleVisuals();
}

// Function to update door visuals based on lock status
function updateDoorVisuals() {
    // Go through all interactable objects and update door appearances
    for (const obj of interactableObjects) {
        if (obj.userData.type.includes('exit')) {
            const exitId = `exit_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${obj.userData.gridX}_${obj.userData.gridZ}`;
            
            // Determine if this exit should be locked
            const isLocked = gameState.lockedDoors[exitId] === true;
            
            // Update visual based on original direction
            let baseType = obj.userData.type;
            if (baseType.includes('locked')) {
                baseType = baseType.replace('_locked', '');
            }
            
            // Set new type
            const newType = isLocked ? `${baseType}_locked` : baseType;
            
            // Only update if changed
            if (newType !== obj.userData.type) {
                obj.userData.type = newType;
                
                // Update material
                obj.material.map = createTexture(newType);
                obj.material.needsUpdate = true;
                
                // Update the tile type in the level data for consistency
                // First find tile value from baseType
                let tileValue;
                for (const key in tileMapping) {
                    if (tileMapping[key] === baseType) {
                        tileValue = parseInt(key);
                        break;
                    }
                }
                
                // Get corresponding tileValue for the locked version
                const lockedTileValue = isLocked ? 
                    (tileValue + 20) : // Add offset for locked doors (we'll define these in tileMapping)
                    tileValue;         // Original tile value
                
                // Update the level data
                if (tileValue && gameState.levelData && gameState.levelData.layout) {
                    gameState.levelData.layout[obj.userData.gridZ][obj.userData.gridX] = lockedTileValue;
                }
            }
        }
    }
}

// Function to assign puzzles to doors
function assignPuzzlesToDoors() {
    // Find all puzzles in the level
    const puzzles = interactableObjects.filter(obj => obj.userData.type === TileType.PUZZLE);
    
    // Find all locked exits
    const lockedExits = [];
    for (const obj of interactableObjects) {
        if (obj.userData.type.includes('exit') && obj.userData.type.includes('locked')) {
            lockedExits.push(obj);
        }
    }
    
    // If we have both puzzles and locked exits, assign them
    if (puzzles.length > 0 && lockedExits.length > 0) {
        // For simplicity, assign one puzzle to each door
        for (let i = 0; i < Math.min(puzzles.length, lockedExits.length); i++) {
            const puzzle = puzzles[i];
            const exit = lockedExits[i];
            
            // Store the connection
            const exitId = `exit_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${exit.userData.gridX}_${exit.userData.gridZ}`;
            puzzle.userData.unlocksExitId = exitId;
            
            // Store in the global mapping
            exitDoorPuzzleMap[exitId] = puzzle.userData.puzzleId;
            
            console.log(`Puzzle at [${puzzle.userData.gridX}, ${puzzle.userData.gridZ}] assigned to unlock exit at [${exit.userData.gridX}, ${exit.userData.gridZ}]`);
        }
    }
}

// Function to assign a puzzle to a specific door
function assignPuzzleToDoor(exitId) {
    // Find available puzzles
    const puzzles = interactableObjects.filter(obj => obj.userData.type === TileType.PUZZLE);
    
    // Check if we have any puzzles
    if (puzzles.length === 0) {
        console.log(`No puzzles available to assign to exit ${exitId}`);
        return false;
    }
    
    // Find a puzzle that hasn't been assigned yet
    const availablePuzzle = puzzles.find(puzzle => 
        !puzzle.userData.unlocksExitId || 
        !exitDoorPuzzleMap[puzzle.userData.unlocksExitId]
    );
    
    if (availablePuzzle) {
        // Assign the puzzle to this exit
        availablePuzzle.userData.unlocksExitId = exitId;
        exitDoorPuzzleMap[exitId] = availablePuzzle.userData.puzzleId;
        
        console.log(`Assigned puzzle at [${availablePuzzle.userData.gridX}, ${availablePuzzle.userData.gridZ}] to exit ${exitId}`);
        return true;
    } else {
        // If all puzzles are already assigned, use the first one as fallback
        const fallbackPuzzle = puzzles[0];
        exitDoorPuzzleMap[exitId] = fallbackPuzzle.userData.puzzleId;
        
        console.log(`All puzzles already assigned. Using puzzle at [${fallbackPuzzle.userData.gridX}, ${fallbackPuzzle.userData.gridZ}] for exit ${exitId}`);
        return true;
    }
}

// Set the current level
function setLevel(levelData) {
    // Clear existing level
    clearLevel();
    
    // Set player position
    // Center player within the tile for better camera alignment
    player.position.set(
        (levelData.entry_point[0] + 0.5) * TILE_SIZE,
        0,
        (levelData.entry_point[1] + 0.5) * TILE_SIZE
    );
    
    gameState.playerPosition = [...levelData.entry_point];
    gameState.levelData = levelData;
    
    // Create new level
    createLevel(levelData.layout);
}

// Clear existing level
function clearLevel() {
    // Clear groups
    floorGroup.clear();
    wallGroup.clear();
    objectGroup.clear();
    
    // Clear arrays
    tiles = [];
    interactableObjects = [];
    npcs = [];
    
    // Create new collision map
    collisionMap = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(false));
}

// Create level from layout
function createLevel(layout) {
    // Create textures if they don't exist
    if (!textureCache[TileType.FLOOR]) {
        createTextures();
    }
    
    // Create floor geometry once
    const floorGeometry = getGeometry('plane', TILE_SIZE, TILE_SIZE);
    const floorMaterial = getMaterial('standard', { 
        map: textureCache[TileType.FLOOR],
        side: THREE.DoubleSide
    });
    
    // Create wall geometry once
    const wallGeometry = getGeometry('box', TILE_SIZE, TILE_SIZE * 2, TILE_SIZE);
    const wallMaterial = getMaterial('standard', { 
        map: textureCache[TileType.WALL],
        side: THREE.DoubleSide
    });
    
    // Create server geometry once
    const serverGeometry = getGeometry('box', TILE_SIZE * 0.8, TILE_SIZE * 1.8, TILE_SIZE * 0.8);
    const serverMaterial = getMaterial('standard', { 
        map: textureCache[TileType.SERVER],
        side: THREE.DoubleSide
    });
    
    // Create level tiles
    for (let z = 0; z < GRID_HEIGHT; z++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tileValue = layout[z][x];
            const tileType = tileMapping[tileValue];
            
            // Create floor tile for every position
            const floorTile = new THREE.Mesh(floorGeometry, floorMaterial);
            floorTile.rotation.x = -Math.PI / 2;
            // Center tiles so each grid square spans [(x+0)*TILE_SIZE, (x+1)*TILE_SIZE) around its center
            floorTile.position.set((x + 0.5) * TILE_SIZE, 0, (z + 0.5) * TILE_SIZE);
            floorTile.receiveShadow = true;
            floorGroup.add(floorTile);
            
            // Skip if this is just a floor
            if (tileType === TileType.FLOOR) {
                continue;
            }
            
            // Set up object properties based on tile type
            let objectGeometry, objectHeight, objectMaterial;
            
            // Set geometry based on tile type
            if (tileType === TileType.WALL) {
                objectGeometry = wallGeometry;
                objectHeight = TILE_SIZE;
                collisionMap[z][x] = true; // Mark as collidable
            } else if (tileType === TileType.SERVER) {
                objectGeometry = serverGeometry;
                objectHeight = TILE_SIZE * 0.9;
                collisionMap[z][x] = true; // Mark as collidable
            } else if (tileType === TileType.COMPUTER) {
                objectGeometry = getGeometry('box', TILE_SIZE * 0.7, TILE_SIZE * 0.5, TILE_SIZE * 0.7);
                objectHeight = TILE_SIZE * 0.25;
                collisionMap[z][x] = true; // Computers are collidable
            } else if (tileType === TileType.ROUTER) {
                objectGeometry = getGeometry('box', TILE_SIZE * 0.6, TILE_SIZE * 0.2, TILE_SIZE * 0.6);
                objectHeight = TILE_SIZE * 0.1;
                // Routers don't block movement
            } else if (tileType === TileType.NPC) {
                // NPCs are now robot models instead of cylinders
                // Assign random NPC type
                const npcTypes = ['sysadmin', 'junior_tech', 'security_ai', 'hacker', 'corporate_exec'];
                const npcType = npcTypes[Math.floor(Math.random() * npcTypes.length)];
                
                // Create robot NPC
                const npc = createRobotNPC(npcType, x, z);
                npc.userData.type = tileType;
                npc.userData.gridX = x;
                npc.userData.gridZ = z;
                npc.userData.isInteractable = true;
                npc.userData.npcType = npcType;
                npc.userData.npcId = `npc_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${x}_${z}`;
                
                // Add to scene
                objectGroup.add(npc);
                
                // Add to tracking arrays
                tiles.push(npc);
                interactableObjects.push(npc);
                npcs.push(npc);
                
                // Register with movement system
                registerNPC(npc);
                
                // NPCs no longer block movement - they will move around
                collisionMap[z][x] = false;
                
                // Skip the regular object creation since we created a custom one
                continue;
            } else if (tileType === TileType.PUZZLE) {
                objectGeometry = getGeometry('box', TILE_SIZE * 0.5, TILE_SIZE * 0.5, TILE_SIZE * 0.5);
                objectHeight = TILE_SIZE * 0.25;
                // Puzzles don't block movement
            } else if (tileType === TileType.EXIT_TOP || 
                       tileType === TileType.EXIT_BOTTOM || 
                       tileType === TileType.EXIT_LEFT || 
                       tileType === TileType.EXIT_RIGHT) {
                objectGeometry = getGeometry('plane', TILE_SIZE, TILE_SIZE);
                objectHeight = TILE_SIZE * 0.01; // Just above floor
                // Exits don't block movement
            } else {
                // Default for other types
                objectGeometry = getGeometry('box', TILE_SIZE * 0.5, TILE_SIZE * 0.5, TILE_SIZE * 0.5);
                objectHeight = TILE_SIZE * 0.25;
            }
            
            objectMaterial = getMaterial('standard', { 
                map: textureCache[tileType],
                side: THREE.DoubleSide
            });
            
            const tileObject = new THREE.Mesh(objectGeometry, objectMaterial);
            
            // Position based on type
            if (tileType === TileType.WALL) {
                tileObject.position.set((x + 0.5) * TILE_SIZE, objectHeight, (z + 0.5) * TILE_SIZE);
                wallGroup.add(tileObject);
            } else if (tileType === TileType.EXIT_TOP || 
                       tileType === TileType.EXIT_BOTTOM || 
                       tileType === TileType.EXIT_LEFT || 
                       tileType === TileType.EXIT_RIGHT) {
                tileObject.rotation.x = -Math.PI / 2; // Horizontal like floor
                tileObject.position.set((x + 0.5) * TILE_SIZE, 0.02, (z + 0.5) * TILE_SIZE); // Slightly above floor
                objectGroup.add(tileObject);
                
                // Add glow effect to exits
                const exitLight = new THREE.PointLight(0x00ff66, 0.5, TILE_SIZE * 1.5);
                exitLight.position.set((x + 0.5) * TILE_SIZE, TILE_SIZE * 0.5, (z + 0.5) * TILE_SIZE);
                scene.add(exitLight);
            } else {
                tileObject.position.set((x + 0.5) * TILE_SIZE, objectHeight, (z + 0.5) * TILE_SIZE);
                objectGroup.add(tileObject);
            }
            
            // Only enable shadows for important objects
            if (tileType === TileType.WALL || tileType === TileType.SERVER || tileType === TileType.NPC) {
                tileObject.castShadow = true;
            }
            tileObject.receiveShadow = true;
            
            // Set user data for interaction
            tileObject.userData = { 
                type: tileType, 
                gridX: x, 
                gridZ: z,
                isInteractable: tileType === TileType.NPC || 
                                tileType === TileType.COMPUTER || 
                                tileType === TileType.ROUTER ||
                                tileType === TileType.PUZZLE ||
                                tileType === TileType.EXIT_TOP ||
                                tileType === TileType.EXIT_BOTTOM ||
                                tileType === TileType.EXIT_LEFT ||
                                tileType === TileType.EXIT_RIGHT
            };
            
            tiles.push(tileObject);
            
            if (tileObject.userData.isInteractable) {
                interactableObjects.push(tileObject);
                
                // Add special interactions for NPCs and puzzles
                if (tileType === TileType.NPC) {
                    // Assign random NPC type
                    const npcTypes = ['sysadmin', 'junior_tech', 'security_ai', 'hacker', 'corporate_exec'];
                    tileObject.userData.npcType = npcTypes[Math.floor(Math.random() * npcTypes.length)];
                    tileObject.userData.npcId = `npc_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${x}_${z}`;
                } else if (tileType === TileType.PUZZLE) {
                    // Assign random puzzle type
                    const puzzleTypes = ['terminal', 'regex', 'encryption', 'logic'];
                    tileObject.userData.puzzleType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
                    tileObject.userData.puzzleId = `puzzle_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${x}_${z}`;
                }
            }
            
            // Add special effects for certain objects
            if (tileType === TileType.SERVER) {
                // Add blinking lights to servers (only some for performance)
                if (Math.random() > 0.6) {
                    const serverLight = new THREE.PointLight(
                        [0x00ff00, 0x0066ff, 0xff3300][Math.floor(Math.random() * 3)],
                        0.3, // Reduced intensity
                        TILE_SIZE * 0.8 // Reduced distance
                    );
                    serverLight.position.set(
                        (x + 0.5) * TILE_SIZE,
                        TILE_SIZE * 1.5,
                        (z + 0.5) * TILE_SIZE
                    );
                    scene.add(serverLight);
                    
                    // Make it blink
                    const blinkRate = 0.5 + Math.random();
                    serverLight.userData = {
                        blinkRate: blinkRate,
                        originalIntensity: serverLight.intensity
                    };
                }
            }
            
            // Add computer glow
            if (tileType === TileType.COMPUTER && Math.random() > 0.5) {
                const screenLight = new THREE.PointLight(0x00aaff, 0.2, TILE_SIZE);
                screenLight.position.set(
                    (x + 0.5) * TILE_SIZE,
                    TILE_SIZE * 0.5,
                    (z + 0.5) * TILE_SIZE
                );
                scene.add(screenLight);
            }
            
            // Add puzzle glow
            if (tileType === TileType.PUZZLE) {
                const puzzleLight = new THREE.PointLight(0x00ffff, 0.4, TILE_SIZE);
                puzzleLight.position.set(
                    (x + 0.5) * TILE_SIZE,
                    TILE_SIZE * 0.5,
                    (z + 0.5) * TILE_SIZE
                );
                scene.add(puzzleLight);
            }
            
            // Add portal effects
            if (tileType === TileType.PORTAL) {
                // Add swirling light effect
                const portalLight = new THREE.PointLight(0xaa00ff, 1.0, TILE_SIZE * 3);
                portalLight.position.set(
                    (x + 0.5) * TILE_SIZE,
                    TILE_SIZE * 0.5,
                    (z + 0.5) * TILE_SIZE
                );
                scene.add(portalLight);
                
                // Add additional smaller lights that will animate
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    const orbitLight = new THREE.PointLight(
                        [0xff00ff, 0xff0088, 0x8800ff][i],
                        0.5,
                        TILE_SIZE * 1.5
                    );
                    
                    orbitLight.position.set(
                        (x + 0.5) * TILE_SIZE + Math.cos(angle) * 0.3,
                        TILE_SIZE * (0.3 + i * 0.2),
                        (z + 0.5) * TILE_SIZE + Math.sin(angle) * 0.3
                    );
                    
                    // Store initial angle for animation
                    orbitLight.userData = {
                        centerX: (x + 0.5) * TILE_SIZE,
                        centerZ: (z + 0.5) * TILE_SIZE,
                        angle: angle,
                        radius: 0.3,
                        speed: 1.5 + i * 0.5,
                        verticalSpeed: 0.5 + i * 0.3,
                        baseHeight: TILE_SIZE * (0.3 + i * 0.2)
                    };
                    
                    scene.add(orbitLight);
                    
                    // Add to a special array for animation
                    if (!window.portalLights) {
                        window.portalLights = [];
                    }
                    window.portalLights.push(orbitLight);
                }
                
                // Create a label for the portal
                const labelGeometry = new THREE.PlaneGeometry(TILE_SIZE * 1.2, TILE_SIZE * 0.3);
                
                // Create canvas for the label
                const labelCanvas = document.createElement('canvas');
                labelCanvas.width = 256;
                labelCanvas.height = 64;
                const labelCtx = labelCanvas.getContext('2d');
                
                // Draw label text
                labelCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                labelCtx.fillRect(0, 0, 256, 64);
                labelCtx.fillStyle = '#ffffff';
                labelCtx.strokeStyle = '#aa00ff';
                labelCtx.lineWidth = 2;
                labelCtx.font = 'bold 24px Arial';
                labelCtx.textAlign = 'center';
                labelCtx.textBaseline = 'middle';
                labelCtx.strokeText('VIBEVERSE PORTAL', 128, 32);
                labelCtx.fillText('VIBEVERSE PORTAL', 128, 32);
                
                // Create texture from canvas
                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                
                // Create material with the label texture
                const labelMaterial = new THREE.MeshBasicMaterial({
                    map: labelTexture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                
                // Create mesh with the geometry and material
                const label = new THREE.Mesh(labelGeometry, labelMaterial);
                
                // Position label above the portal
                label.position.set((x + 0.5) * TILE_SIZE, TILE_SIZE * 1.2, (z + 0.5) * TILE_SIZE);
                
                // Make label face the camera
                label.rotation.x = -Math.PI / 4;
                
                // Add label to the scene
                scene.add(label);
            }
        }
    }
}

// Create placeholder textures for each tile type
function createTextures() {
    Object.values(TileType).forEach(type => {
        createTexture(type);
    });
}

// Create texture for a tile type
function createTexture(type) {
    // Return from cache if it exists
    if (textureCache[type]) {
        return textureCache[type];
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Set base color based on tile type
    let color;
    switch(type) {
        case TileType.FLOOR:
            color = '#111122';
            break;
        case TileType.WALL:
            color = '#334455';
            break;
        case TileType.ENTRANCE:
        case TileType.EXIT_RIGHT:
        case TileType.EXIT_BOTTOM:
        case TileType.EXIT_TOP:
        case TileType.EXIT_LEFT:
            color = '#005522';
            break;
        case TileType.SERVER:
            color = '#223366';
            break;
        case TileType.COMPUTER:
            color = '#225588';
            break;
        case TileType.ROUTER:
            color = '#663366';
            break;
        case TileType.SATELLITE:
            color = '#665522';
            break;
        case TileType.DESK:
            color = '#553311';
            break;
        case TileType.CHAIR:
            color = '#222222';
            break;
        case TileType.NPC:
            color = '#886633';
            break;
        case TileType.PUZZLE:
            color = '#006666';
            break;
        case TileType.PORTAL:
            color = '#8800ff'; // Purple for the portal
            break;
        default:
            color = '#444444';
    }
    
    // Fill with base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    
    // Add grid pattern for floor
    if (type === TileType.FLOOR) {
        ctx.strokeStyle = '#222233';
        ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let i = 16; i < 128; i += 32) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(128, i);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 128);
            ctx.stroke();
        }
        
        // Tech details
        ctx.fillStyle = '#003344';
        ctx.fillRect(32, 32, 64, 64);
        ctx.strokeStyle = '#00ffaa';
        ctx.strokeRect(32, 32, 64, 64);
    }
    
    // Add tech pattern for walls
    if (type === TileType.WALL) {
        ctx.fillStyle = '#223344';
        ctx.fillRect(16, 16, 96, 96);
        
        // Panel lines
        ctx.strokeStyle = '#445566';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, 96, 96);
        
        // Access panel
        ctx.fillStyle = '#112233';
        ctx.fillRect(48, 48, 32, 32);
        ctx.strokeStyle = '#667788';
        ctx.strokeRect(48, 48, 32, 32);
        
        // Panel light
        ctx.fillStyle = '#00ffaa';
        ctx.fillRect(56, 56, 16, 16);
    }
    
    // Add details for server
    if (type === TileType.SERVER) {
        // Server rack
        ctx.fillStyle = '#001133';
        ctx.fillRect(16, 8, 96, 112);
        
        // Rack details
        for (let i = 16; i < 112; i += 32) {
            ctx.fillStyle = i % 64 === 16 ? '#334455' : '#223344';
            ctx.fillRect(24, i, 80, 24);
            
            // Server lights
            ctx.fillStyle = Math.random() > 0.5 ? '#00ff00' : '#ff3300';
            ctx.fillRect(90, i + 8, 4, 4);
        }
    }
    
    // Computer texture
    if (type === TileType.COMPUTER) {
        // Base
        ctx.fillStyle = '#111122';
        ctx.fillRect(16, 32, 96, 64);
        
        // Screen
        ctx.fillStyle = '#002233';
        ctx.fillRect(24, 40, 80, 48);
        
        // Screen content
        ctx.font = '8px monospace';
        ctx.fillStyle = '#00ff66';
        
        for (let i = 0; i < 3; i++) {
            ctx.fillText('> ' + Math.random().toString(16).substring(2, 8), 28, 50 + i * 12);
        }
    }
    
    // Router texture
    if (type === TileType.ROUTER) {
        // Base
        ctx.fillStyle = '#222233';
        ctx.fillRect(24, 40, 80, 24);
        
        // Lights
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#00ff00' : '#444444';
            ctx.fillRect(32 + i * 16, 48, 4, 4);
        }
        
        // Ports
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#000011';
            ctx.fillRect(32 + i * 20, 60, 8, 4);
        }
    }
    
    // NPC texture
    if (type === TileType.NPC) {
        // Body silhouette
        ctx.fillStyle = '#334455';
        ctx.beginPath();
        ctx.ellipse(64, 80, 24, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#445566';
        ctx.beginPath();
        ctx.arc(64, 40, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Visor/mask
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(52, 36, 24, 8);
    }
    
    // Puzzle texture
    if (type === TileType.PUZZLE) {
        // Base
        ctx.fillStyle = '#004444';
        ctx.fillRect(16, 16, 96, 96);
        
        // Circuit pattern
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        
        // Draw circuit lines
        ctx.beginPath();
        ctx.moveTo(16, 64);
        ctx.lineTo(48, 64);
        ctx.lineTo(48, 32);
        ctx.lineTo(80, 32);
        ctx.lineTo(80, 96);
        ctx.lineTo(112, 96);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(16, 32);
        ctx.lineTo(32, 32);
        ctx.lineTo(32, 96);
        ctx.lineTo(64, 96);
        ctx.lineTo(64, 48);
        ctx.lineTo(112, 48);
        ctx.stroke();
        
        // Add connection points
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(48, 64, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(48, 32, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(80, 32, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(80, 96, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(64, 96, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(64, 48, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Exit textures
    if (type.includes('exit')) {
        const isLocked = type.includes('locked');
        
        // Set color based on lock status (red if locked, green if unlocked)
        ctx.fillStyle = isLocked ? '#aa0000' : '#00aa44';
        ctx.fillRect(16, 16, 96, 96);
        
        ctx.strokeStyle = isLocked ? '#ff0000' : '#00ff66';
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 96, 96);
        
        // Add lock icon if locked
        if (isLocked) {
            // Draw lock body
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.rect(48, 48, 32, 24);
            ctx.fill();
            
            // Draw lock shackle (the curved part)
            ctx.beginPath();
            ctx.arc(64, 48, 16, Math.PI, 2 * Math.PI);
            ctx.fill();
            
            // Draw keyhole
            ctx.fillStyle = '#aa0000';
            ctx.beginPath();
            ctx.arc(64, 60, 6, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            // Arrow based on direction
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            
            if (type === TileType.EXIT_RIGHT || type === TileType.EXIT_RIGHT_LOCKED) {
                ctx.moveTo(40, 40);
                ctx.lineTo(88, 64);
                ctx.lineTo(40, 88);
            } else if (type === TileType.EXIT_LEFT || type === TileType.EXIT_LEFT_LOCKED) {
                ctx.moveTo(88, 40);
                ctx.lineTo(40, 64);
                ctx.lineTo(88, 88);
            } else if (type === TileType.EXIT_TOP || type === TileType.EXIT_TOP_LOCKED) {
                ctx.moveTo(40, 88);
                ctx.lineTo(64, 40);
                ctx.lineTo(88, 88);
            } else if (type === TileType.EXIT_BOTTOM || type === TileType.EXIT_BOTTOM_LOCKED) {
                ctx.moveTo(40, 40);
                ctx.lineTo(64, 88);
                ctx.lineTo(88, 40);
            }
            
            ctx.fill();
        }
    }
    
    // Create Three.js texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Cache the texture
    textureCache[type] = texture;
    
    return texture;
}

// Get geometry from cache or create new
function getGeometry(name, ...args) {
    const key = `${name}_${args.join('_')}`;
    if (!geometryCache[key]) {
        switch(name) {
            case 'plane':
                geometryCache[key] = new THREE.PlaneGeometry(...args);
                break;
            case 'box':
                geometryCache[key] = new THREE.BoxGeometry(...args);
                break;
            case 'cylinder':
                geometryCache[key] = new THREE.CylinderGeometry(...args);
                break;
            case 'cone':
                geometryCache[key] = new THREE.ConeGeometry(...args);
                break;
            case 'sphere':
                geometryCache[key] = new THREE.SphereGeometry(...args);
                break;
            case 'ring':
                geometryCache[key] = new THREE.RingGeometry(...args);
                break;
        }
    }
    return geometryCache[key];
}

// Get material from cache or create new
function getMaterial(type, options = {}) {
    const key = `${type}_${JSON.stringify(options)}`;
    if (!materialCache[key]) {
        switch(type) {
            case 'standard':
                materialCache[key] = new THREE.MeshStandardMaterial(options);
                break;
            case 'basic':
                materialCache[key] = new THREE.MeshBasicMaterial(options);
                break;
            case 'lambert':
                materialCache[key] = new THREE.MeshLambertMaterial(options);
                break;
        }
    }
    return materialCache[key];
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard event listeners
    window.addEventListener('keydown', (e) => {
        if (chatInterface.style.display === 'flex' || puzzleInterface.style.display === 'flex') {
            return; // Skip if interfaces are open
        }
        
        if (e.key in keys) {
            keys[e.key] = true;
            e.preventDefault();
        }
        
        // Mode switch: V cycles through camera views (top -> follow -> side -> top)
        if (e.key.toLowerCase() === 'v') {
            if (cameraMode === 'top') {
                cameraMode = 'follow';
            } else if (cameraMode === 'follow') {
                cameraMode = 'side';
            } else {
                cameraMode = 'top';
            }
            applyCameraMode(true);
            if (typeof window.__updateTopControls === 'function') window.__updateTopControls();
            // Show mode indicator
            showDialogue(`VIEW MODE: ${cameraMode.toUpperCase()}`, 1500);
        }
        // Terminal access
        if (e.key === 'e' && !keys.e) {
            keys.e = true;
            openNearestTerminal();
        }
        // Board rotation only in top view using ArrowLeft/ArrowRight
        if (cameraMode === 'top') {
            if (e.key === 'ArrowLeft') {
                boardRotationQuarter = (boardRotationQuarter + 3) % 4; // rotate -90°
                applyBoardRotation();
            } else if (e.key === 'ArrowRight') {
                boardRotationQuarter = (boardRotationQuarter + 1) % 4; // rotate +90°
                applyBoardRotation();
            } else if (e.key === 'r') {
                boardRotationQuarter = 0;
                applyBoardRotation();
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        // Skip if chat or puzzle interface is open
        if (chatInterface.style.display === 'flex' || puzzleInterface.style.display === 'flex') {
            return;
        }
        
        if (e.key in keys) {
            keys[e.key] = false;
            e.preventDefault();
        }
        
        // Space for interaction
        if (e.key === ' ') {
            interactWithNearbyObject();
        }
        
        // Release E key state
        if (e.key === 'e') {
            keys.e = false;
        }
    });
    
    // Mouse click event (only handles movement; no camera control)
    window.addEventListener('click', (e) => {
        // Skip if UI is active
        if (chatInterface.style.display === 'flex' || puzzleInterface.style.display === 'flex') {
            return;
        }
        
        // Skip if mobile controls are active - don't allow click to move on mobile
        if (mobileControls.classList.contains('mobile-active')) {
            return;
        }
        
        // Get mouse position in normalized device coordinates
        const mouseVector = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        
        // Raycasting for tile selection
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseVector, camera);
        
        // Intersect with floor
        const intersects = raycaster.intersectObjects(floorGroup.children);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Convert to grid coordinates
            const gridX = Math.floor(hit.point.x / TILE_SIZE);
            const gridZ = Math.floor(hit.point.z / TILE_SIZE);
            
            // Verify coordinates are valid and not colliding with objects
            if (gridX >= 0 && gridX < GRID_WIDTH && 
                gridZ >= 0 && gridZ < GRID_HEIGHT && 
                !collisionMap[gridZ][gridX]) {
                    
                // Set as movement target
                moveTarget = { x: gridX, z: gridZ };
                
                // Position and show the target indicator
                targetIndicator.position.x = (gridX + 0.5) * TILE_SIZE;
                targetIndicator.position.z = (gridZ + 0.5) * TILE_SIZE;
                targetIndicator.visible = true;
            }
        }
    });
    
    // Disable wheel zoom in top mode; allow limited zoom in follow mode
    window.addEventListener('wheel', (e) => {
        if (cameraMode !== 'follow') return;
        cameraSettings.zoom += e.deltaY * 0.001;
        cameraSettings.zoom = Math.max(cameraSettings.minZoom, Math.min(cameraSettings.maxZoom, cameraSettings.zoom));
    });
    
    // Removed mouse-based camera rotation/panning to reduce lag & glitches
    
    // Chat interface events
    closeChatBtn.addEventListener('click', () => {
        closeChatInterface();
    });
    
    sendBtn.addEventListener('click', () => {
        sendChatMessage();
    });
    
    // Improved chat input handling to ensure all keystrokes are captured
    chatInput.addEventListener('keydown', (e) => {
        // Prevent game controls from intercepting these keystrokes
        e.stopPropagation();
        
        // Only prevent default for special keys that might affect the game
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeChatInterface();
        } else if (e.key === ' ' || e.key === 'q' || e.key === 'e' || e.key === 'r' ||
                   e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd' ||
                   e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                   e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // Prevent default for game control keys to ensure they don't affect the game
            // while allowing them to still work in the input
            e.stopImmediatePropagation();
        }
    });
    
    // Also add keyup event to stop propagation
    chatInput.addEventListener('keyup', (e) => {
        // Prevent game controls from intercepting these keystrokes
        e.stopPropagation();
        
        // Stop immediate propagation for game control keys
        if (e.key === ' ' || e.key === 'q' || e.key === 'e' || e.key === 'r' ||
            e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd' ||
            e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.stopImmediatePropagation();
        }
    });
    
    // Focus input when chat opens
    const focusInput = () => {
        // Small delay to ensure focus works reliably
        setTimeout(() => chatInput.focus(), 50);
    };
    
    // Set up a mutation observer to detect when chat becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && 
                chatInterface.style.display === 'flex') {
                focusInput();
            }
        });
    });
    
    observer.observe(chatInterface, { attributes: true });
    
    // Puzzle interface events
    closePuzzleBtn.addEventListener('click', () => {
        puzzleInterface.style.display = 'none';
        gameState.activePuzzle = null;
    });
    
    submitPuzzleBtn.addEventListener('click', () => {
        submitPuzzleSolution();
    });
    
    // Improved puzzle input handling
    puzzleInput.addEventListener('keydown', (e) => {
        // Prevent game controls from intercepting these keystrokes
        e.stopPropagation();
        
        // Only prevent default for special keys that might affect the game
        if (e.key === 'Enter') {
            e.preventDefault();
            submitPuzzleSolution();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            puzzleInterface.style.display = 'none';
            gameState.activePuzzle = null;
        } else if (e.key === ' ' || e.key === 'q' || e.key === 'e' || e.key === 'r' ||
                   e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd' ||
                   e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                   e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // Prevent default for game control keys to ensure they don't affect the game
            // while allowing them to still work in the input
            e.stopImmediatePropagation();
        }
    });
    
    // Also add keyup event to stop propagation
    puzzleInput.addEventListener('keyup', (e) => {
        // Prevent game controls from intercepting these keystrokes
        e.stopPropagation();
        
        // Stop immediate propagation for game control keys
        if (e.key === ' ' || e.key === 'q' || e.key === 'e' || e.key === 'r' ||
            e.key === 'w' || e.key === 'a' || e.key === 's' || e.key === 'd' ||
            e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.stopImmediatePropagation();
        }
    });
    
    // Focus input when puzzle opens
    const focusPuzzleInput = () => {
        setTimeout(() => puzzleInput.focus(), 50);
    };
    
    // Set up a mutation observer to detect when puzzle becomes visible
    const puzzleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && 
                puzzleInterface.style.display === 'flex') {
                focusPuzzleInput();
            }
        });
    });
    
    puzzleObserver.observe(puzzleInterface, { attributes: true });
    
    // Inventory events
    inventoryIcon.addEventListener('click', () => {
        if (inventoryPanel.style.display === 'block') {
            inventoryPanel.style.display = 'none';
        } else {
            updateInventoryDisplay();
            inventoryPanel.style.display = 'block';
        }
    });
    
    // Mobile controls
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileControls = document.getElementById('mobileControls');
    const cameraControls = document.getElementById('cameraControls');
    
    // Get mobile control buttons
    const upBtn = document.getElementById('upBtn');
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const downBtn = document.getElementById('downBtn');
    const centerBtn = document.getElementById('centerBtn');
    const interactBtn = document.getElementById('interactBtn');
    const terminalBtn = document.getElementById('terminalBtn');
    const inventoryBtn = document.getElementById('inventoryBtn');
    const zoomBtn = document.getElementById('zoomBtn');
    const rotateCameraLeft = document.getElementById('rotateCameraLeft');
    const resetCamera = document.getElementById('resetCamera');
    const rotateCameraRight = document.getElementById('rotateCameraRight');
    
    // Mobile device detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Auto-enable on mobile devices
    if (isMobile) {
        mobileControls.classList.add('mobile-active');
        cameraControls.classList.add('mobile-active');
    }
    
    // Mobile toggle button
    mobileToggle.addEventListener('click', () => {
        mobileControls.classList.toggle('mobile-active');
        cameraControls.classList.toggle('mobile-active');
    });
    
    // D-pad controls - touch start
    upBtn.addEventListener('touchstart', () => { keys.w = true; });
    leftBtn.addEventListener('touchstart', () => { keys.a = true; });
    rightBtn.addEventListener('touchstart', () => { keys.d = true; });
    downBtn.addEventListener('touchstart', () => { keys.s = true; });
    
    // D-pad controls - touch end
    upBtn.addEventListener('touchend', () => { keys.w = false; });
    leftBtn.addEventListener('touchend', () => { keys.a = false; });
    rightBtn.addEventListener('touchend', () => { keys.d = false; });
    downBtn.addEventListener('touchend', () => { keys.s = false; });
    
    // Center button - find nearest interactable
    centerBtn.addEventListener('click', () => {
        moveTarget = null;
        targetIndicator.visible = false;
        interactWithNearbyObject();
    });
    
    // Action buttons
    interactBtn.addEventListener('click', () => {
        interactWithNearbyObject();
    });
    
    terminalBtn.addEventListener('click', () => {
        openNearestTerminal();
    });
    
    inventoryBtn.addEventListener('click', () => {
        if (inventoryPanel.style.display === 'block') {
            inventoryPanel.style.display = 'none';
        } else {
            updateInventoryDisplay();
            inventoryPanel.style.display = 'block';
        }
    });
    
    zoomBtn.addEventListener('click', () => {
        // Toggle between zoom levels
        if (cameraSettings.zoom > cameraSettings.minZoom + 0.1) {
            cameraSettings.zoom = cameraSettings.minZoom;
        } else {
            cameraSettings.zoom = cameraSettings.maxZoom;
        }
    });
    
    // Camera rotation controls
    rotateCameraLeft.addEventListener('touchstart', () => {
        cameraSettings.targetRotationVelocity = cameraSettings.rotationSpeed * 5;
    });
    
    rotateCameraLeft.addEventListener('touchend', () => {
        cameraSettings.targetRotationVelocity = 0;
        cameraSettings.currentRotationVelocity = 0;
    });
    
    rotateCameraRight.addEventListener('touchstart', () => {
        cameraSettings.targetRotationVelocity = -cameraSettings.rotationSpeed * 5;
    });
    
    rotateCameraRight.addEventListener('touchend', () => {
        cameraSettings.targetRotationVelocity = 0;
        cameraSettings.currentRotationVelocity = 0;
    });
    
    resetCamera.addEventListener('click', () => {
        cameraSettings.rotation = 0;
        cameraSettings.tilt = 0.5;
        cameraSettings.panOffset = { x: 0, z: 0 };
        cameraSettings.targetPanOffset = { x: 0, z: 0 };
    });
    
    // Prevent default touchmove behavior to avoid page scrolling while using controls
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('.mobile-controls, .camera-controls')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Add viewport meta tag for better mobile experience
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewportMeta);
    }
}

// Handle interaction with nearby objects
function interactWithNearbyObject() {
    // Find nearby interactable objects
    const interactDistance = 1.5; // Increased from 1 to make exit interaction easier
    const nearbyObjects = interactableObjects.filter(obj => {
        const dx = Math.abs(gameState.playerPosition[0] - obj.userData.gridX);
        const dz = Math.abs(gameState.playerPosition[1] - obj.userData.gridZ);
        return dx <= interactDistance && dz <= interactDistance;
    });
    
    if (nearbyObjects.length > 0) {
        // Get the closest object
        const closestObject = nearbyObjects.reduce((closest, current) => {
            const closestDist = Math.abs(gameState.playerPosition[0] - closest.userData.gridX) + 
                           Math.abs(gameState.playerPosition[1] - closest.userData.gridZ);
            const currentDist = Math.abs(gameState.playerPosition[0] - current.userData.gridX) + 
                           Math.abs(gameState.playerPosition[1] - current.userData.gridZ);
            return currentDist < closestDist ? current : closest;
        });
        
        // Handle based on type
        const type = closestObject.userData.type;
        
        if (type === TileType.NPC) {
            // Set NPC to talking state
            setNPCTalking(closestObject);
            openChat(closestObject);
        } else if (type === TileType.PUZZLE) {
            openPuzzle(closestObject);
        } else if (type === TileType.EXIT_TOP || 
                  type === TileType.EXIT_BOTTOM || 
                  type === TileType.EXIT_LEFT || 
                  type === TileType.EXIT_RIGHT) {
            // Handle exit by type
            handleExit(type);
        } else if (type === TileType.COMPUTER) {
            // Open terminal for computers
            openTerminal(closestObject);
        } else {
            // For routers, etc. just show dialogue
            showObjectInfo(closestObject);
        }
    }
}

// Open nearest terminal
function openNearestTerminal() {
    // If terminal is already open, don't try to reopen it
    if (chatInterface.style.display === 'flex' && 
        currentNPCElement.textContent === 'TERMINAL') {
        return;
    }
    
    // Find nearby computer terminals
    const nearbyComputers = interactableObjects.filter(obj => {
        if (obj.userData.type !== TileType.COMPUTER) return false;
        
        const dx = Math.abs(gameState.playerPosition[0] - obj.userData.gridX);
        const dz = Math.abs(gameState.playerPosition[1] - obj.userData.gridZ);
        return dx <= 1 && dz <= 1;
    });
    
    if (nearbyComputers.length > 0) {
        // Get the closest computer
        const closestComputer = nearbyComputers.reduce((closest, current) => {
            const closestDist = Math.abs(gameState.playerPosition[0] - closest.userData.gridX) + 
                           Math.abs(gameState.playerPosition[1] - closest.userData.gridZ);
            const currentDist = Math.abs(gameState.playerPosition[0] - current.userData.gridX) + 
                           Math.abs(gameState.playerPosition[1] - current.userData.gridZ);
            return currentDist < closestDist ? current : closest;
        });
        
        // Open terminal chat interface
        openTerminal(closestComputer);
    } else {
        showDialogue("No terminal in range. Move closer to a computer.", 3000);
    }
}

// Open chat with NPC
function openChat(npcObject) {
    // Set active NPC
    gameState.activeNPC = npcObject;
    
    // Update chat interface
    currentNPCElement.textContent = npcObject.userData.npcType.toUpperCase();
    chatHistory.innerHTML = '';
    
    // Show chat interface
    chatInterface.style.display = 'flex';
    
    // Welcome message based on NPC type
    const welcomeMessages = {
        'sysadmin': "SYSADMIN_42> *eyes you suspiciously* State your business in this sector. Authorization level?",
        'junior_tech': "JUNIOR_TECH_19> Oh! Uh, hi there. Should you be in this area? I mean, I'm not saying you shouldn't! Just... protocol and all that...",
        'security_ai': "SENTINEL-AI> [SCANNING] Unknown entity detected. Identification required. State purpose of system access.",
        'hacker': "GH0ST_1N_M4CH1NE> yo penguin! ur late 2 the party. corp's been tightening security. found anything good yet?",
        'corporate_exec': "Director Hammond> Who are you? IT support? Good. The system's been acting up, and I need access to the Iceberg Protocol files immediately."
    };
    
    // Add welcome message to chat
    addMessageToChat(welcomeMessages[npcObject.userData.npcType] || welcomeMessages['security_ai'], 'npc');
    
    // Focus input
    chatInput.focus();
}

// Open terminal interface
function openTerminal(computerObject) {
    // Don't reopen if already open
    if (chatInterface.style.display === 'flex' && 
        currentNPCElement.textContent === 'TERMINAL') {
        return;
    }
    
    // Set active terminal
    gameState.activeNPC = {
        userData: {
            npcType: 'terminal',
            npcId: `terminal_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${computerObject.userData.gridX}_${computerObject.userData.gridZ}`
        }
    };
    
    // Update chat interface
    currentNPCElement.textContent = 'TERMINAL';
    chatHistory.innerHTML = '';
    
    // Add special terminal styling
    chatInterface.classList.add('terminal-mode');
    
    // Show chat interface
    chatInterface.style.display = 'flex';
    
    // Reset key states to prevent stuck keys
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
    
    // Welcome message
    const welcomeMessage = `
    > SYSTEM v2.4.1 READY
    > CONNECTED TO LOCAL NETWORK
    > TYPE 'help' FOR AVAILABLE COMMANDS
    > USE 'ESC' TO CLOSE TERMINAL
    `;
    
    // Add welcome message to chat
    addMessageToChat(welcomeMessage, 'npc');
    
    // Focus input with a small delay to ensure it works
    setTimeout(() => {
        chatInput.focus();
        
        // Clear any previous input
        chatInput.value = '';
    }, 50);
}

// Open puzzle interface
function openPuzzle(puzzleObject) {
    // Set active puzzle
    gameState.activePuzzle = puzzleObject;
    
    // Fetch puzzle data
    fetchPuzzleData(puzzleObject.userData.puzzleType, puzzleObject.userData.puzzleId);
}

// Fetch puzzle data from server
async function fetchPuzzleData(puzzleType, puzzleId) {
    try {
        // Show loading state
        puzzleTitle.textContent = 'LOADING CHALLENGE...';
        puzzleDescription.textContent = 'Establishing secure connection...';
        puzzleContent.innerHTML = '<div class="typing-effect">Retrieving security challenge data...</div>';
        puzzleMessage.textContent = '';
        puzzleInput.value = '';
        puzzleInterface.style.display = 'flex';
        
        // Simulate loading time for effect
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Send request to server
        const response = await fetch('index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'action': 'check_puzzle',
                'puzzle_type': puzzleType,
                'puzzle_id': puzzleId,
                'answer': '' // Empty to just get the puzzle data
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch puzzle data');
        }
        
        const puzzleData = await response.json();
        
        // Generate a client-side representation of the puzzle
        const clientPuzzle = {
            description: puzzleData.message || 'Complete the security challenge to gain access.',
            content: generatePuzzleContent(puzzleType, puzzleId),
            hint: getPuzzleHint(puzzleType)
        };
        
        // Update puzzle interface
        updatePuzzleInterface(clientPuzzle);
    } catch (error) {
        console.error('Error loading puzzle:', error);
        puzzleMessage.textContent = 'ERROR: Failed to load challenge.';
    }
}

// Generate content for puzzle display
function generatePuzzleContent(puzzleType, puzzleId) {
    // Create different content based on puzzle type
    switch (puzzleType) {
        case 'terminal':
            return 'Enter the correct terminal command to proceed. Use standard Linux/Unix command syntax.';
        case 'regex':
            return 'Create a regular expression pattern that matches the required strings:<br><br>' +
                   'Test cases:<br>' +
                   '192.168.1.1 - Should match<br>' +
                   '255.255.255.255 - Should match<br>' +
                   '0.0.0.0 - Should match<br>' +
                   '256.1.1.1 - Should NOT match<br>' +
                   '192.168.1 - Should NOT match';
        case 'encryption':
            return 'Decrypt the message using appropriate cryptographic techniques.<br>' +
                   'Look for patterns, substitution rules, or key-based encryption methods.';
        case 'logic':
            return 'Solve the logical sequence or pattern to proceed.<br>' +
                  'Think carefully about mathematical relationships and sequence patterns.';
        default:
            return 'Complete the security challenge to gain access.';
    }
}

// Get hint for puzzle type
function getPuzzleHint(puzzleType) {
    switch (puzzleType) {
        case 'terminal':
            return 'Try common command-line actions like ls, cat, grep, chmod, etc.';
        case 'regex':
            return 'Remember to account for all possible valid formats while excluding invalid ones.';
        case 'encryption':
            return 'Common ciphers include Caesar (shift), Vigenère (key-based), and ASCII to text conversion.';
        case 'logic':
            return 'Look for patterns in how numbers relate to each other or change through the sequence.';
        default:
            return 'Analyze the challenge carefully for patterns or clues.';
    }
}

// Update puzzle interface with data
function updatePuzzleInterface(puzzleData) {
    puzzleTitle.textContent = `${gameState.activePuzzle.userData.puzzleType.toUpperCase()} CHALLENGE`;
    puzzleDescription.textContent = puzzleData.description;
    puzzleContent.innerHTML = puzzleData.content;
    puzzleInput.placeholder = `Enter ${gameState.activePuzzle.userData.puzzleType} solution...`;
    
    // Add hint if available
    if (puzzleData.hint) {
        const hintElement = document.createElement('div');
        hintElement.className = 'puzzle-hint';
        hintElement.innerHTML = `<br><strong>HINT:</strong> ${puzzleData.hint}`;
        puzzleContent.appendChild(hintElement);
    }
    
    // Focus input
    puzzleInput.focus();
}

// Function to update puzzle visuals based on completion status
function updatePuzzleVisuals() {
    // Safety check for interactableObjects
    if (!interactableObjects || !Array.isArray(interactableObjects)) {
        console.warn("Cannot update puzzle visuals: interactableObjects is not available");
        return;
    }
    
    try {
        // Go through all puzzle objects in the level
        const puzzles = interactableObjects.filter(obj => 
            obj && obj.userData && obj.userData.type === TileType.PUZZLE
        );
        
        puzzles.forEach(puzzle => {
            // Check that we have a valid puzzle and that it's completed
            if (!puzzle || !puzzle.userData) return;
            
            // Mark puzzles as completed if they're in the completedPuzzles array
            if (gameState.completedPuzzles && gameState.completedPuzzles.includes(puzzle.userData.puzzleId)) {
                puzzle.userData.completed = true;
            }
            
            if (puzzle.userData.completed) {
                // Change the material to indicate completion
                if (!puzzle.userData.visuallyMarkedCompleted) {
                    try {
                        // Create a new material with a green glow
                        const completedMaterial = new THREE.MeshStandardMaterial({
                            map: textureCache[TileType.PUZZLE],
                            emissive: 0x00ff00,
                            emissiveIntensity: 0.5
                        });
                        
                        // Apply the new material
                        puzzle.material = completedMaterial;
                        puzzle.material.needsUpdate = true;
                        
                        // Add a "completed" effect
                        const completionEffect = new THREE.PointLight(0x00ff00, 0.8, TILE_SIZE * 3);
                        completionEffect.position.set(
                            puzzle.position.x,
                            puzzle.position.y + TILE_SIZE * 0.5,
                            puzzle.position.z
                        );
                        scene.add(completionEffect);
                        
                        // Store a reference to the effect
                        puzzle.userData.completionEffect = completionEffect;
                        
                        // Mark as visually updated
                        puzzle.userData.visuallyMarkedCompleted = true;
                    } catch (err) {
                        console.error("Error updating puzzle visual:", err);
                    }
                }
            }
        });
    } catch (err) {
        console.error("Error in updatePuzzleVisuals:", err);
    }
}

// Submit puzzle solution
async function submitPuzzleSolution() {
    if (!gameState.activePuzzle) return;
    
    const answer = puzzleInput.value.trim();
    if (!answer) return;
    
    try {
        // Show loading state
        puzzleMessage.textContent = 'Validating solution...';
        
        // Send solution to server
        const response = await fetch('index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'action': 'check_puzzle',
                'puzzle_type': gameState.activePuzzle.userData.puzzleType,
                'puzzle_id': gameState.activePuzzle.userData.puzzleId,
                'answer': answer
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to validate solution');
        }
        
        const result = await response.json();
        
        // Update message
        puzzleMessage.textContent = result.message || 
            (result.correct ? 'SOLUTION ACCEPTED' : 'SOLUTION REJECTED');
        
        // Visual feedback
        puzzleMessage.style.color = result.correct ? '#00ff99' : '#ff3333';
        
        // If correct, give reward
        if (result.correct) {
            // Mark puzzle as completed
            gameState.activePuzzle.userData.completed = true;
            
            // Update puzzle visuals
            updatePuzzleVisuals();
            
            // Clear input
            puzzleInput.value = '';
            
            // Check if this puzzle unlocks a door
            if (gameState.activePuzzle.userData.unlocksExitId) {
                // Unlock the door
                gameState.lockedDoors[gameState.activePuzzle.userData.unlocksExitId] = false;
                
                // Update visuals
                updateDoorVisuals();
                
                // Show feedback
                showDialogue("You hear a door unlocking in the distance.", 3000);
            }
            
            // Apply reward
            if (result.reward) {
                applyReward(result.reward);
            }
            
            // Close puzzle interface after a delay
            setTimeout(() => {
                puzzleInterface.style.display = 'none';
                gameState.activePuzzle = null;
            }, 3000);
        }
    } catch (error) {
        console.error('Error submitting solution:', error);
        puzzleMessage.textContent = 'ERROR: Unable to verify solution. Try again.';
        puzzleMessage.style.color = '#ff3333';
    }
}

// Apply a reward from solving a puzzle
function applyReward(reward) {
    if (reward.type === 'skill') {
        // Update skill level
        gameState.playerInventory.skillLevels[reward.skill] = 
            (gameState.playerInventory.skillLevels[reward.skill] || 0) + reward.amount;
            
        // Show message
        showDialogue(`SKILL INCREASED: ${reward.skill} +${reward.amount}`, 3000);
    } else if (reward.type === 'key') {
        // Add key to inventory
        gameState.playerInventory.accessKeys.push(reward.key_id);
        
        // Show message
        showDialogue(`ACCESS KEY ACQUIRED: ${reward.key_id}`, 3000);
    }
    
    // Update inventory display
    updateInventoryDisplay();
    
    // Visual effect for reward
    const rewardGlow = document.createElement('div');
    rewardGlow.className = 'glitch-text';
    rewardGlow.textContent = 'DATA ACQUIRED';
    rewardGlow.style.position = 'absolute';
    rewardGlow.style.top = '50%';
    rewardGlow.style.left = '50%';
    rewardGlow.style.transform = 'translate(-50%, -50%)';
    rewardGlow.style.fontSize = '32px';
    rewardGlow.style.color = '#00ffff';
    rewardGlow.style.pointerEvents = 'none';
    document.body.appendChild(rewardGlow);
    
    // Remove after animation
    setTimeout(() => {
        document.body.removeChild(rewardGlow);
    }, 2000);
}

// Show information about an object
function showObjectInfo(object) {
    const type = object.userData.type;
    let message;
    
    if (type === TileType.COMPUTER) {
        const computerMessages = [
            "TERMINAL ACCESS GRANTED\n> Running port scan...\n> Vulnerabilities detected: 3\n> Logging user activity...",
            "SECURITY LEVEL: 4\n> /bin/access_log reveals unusual login patterns\n> Intrusion countermeasures active\n> [WARNING] Keycard required for database access",
            "SYSTEM STATUS: ONLINE\n> Memory utilization: 86%\n> Encryption protocols active\n> Hidden directory detected at /mnt/secret/iceberg_protocols/",
            "NETWORK TRAFFIC ANALYSIS\n> Unusual data packets from SubNode 7\n> Packet capture initiated\n> Firewall exceptions detected in router configuration"
        ];
        message = computerMessages[Math.floor(Math.random() * computerMessages.length)];
    } else if (type === TileType.ROUTER) {
        const routerMessages = [
            "ROUTER STATUS\n> Firmware: CiscoNVX 7.2.4\n> Connected devices: 42\n> VPN tunnel established\n> [WARNING] Port 22 exposed",
            "NETWORK TELEMETRY\n> Traffic spikes detected at 0200 hours\n> Unusual DNS requests to external domains\n> IPv6 tunnel operational",
            "PACKET ANALYSIS\n> Suspicious outbound traffic detected\n> MAC address filtering bypassed\n> Administrator access timestamps modified"
        ];
        message = routerMessages[Math.floor(Math.random() * routerMessages.length)];
    } else if (type === TileType.SERVER) {
        const serverMessages = [
            "SERVER STATUS\n> Model: IBM QuantumVault 9000\n> RAID: Healthy\n> CPU Utilization: 78%\n> [WARNING] Unauthorized access attempt detected",
            "DATA STORAGE\n> Capacity: 256TB\n> Used: 189TB (73.8%)\n> Critical data detected\n> Backup status: INCOMPLETE",
            "SERVER LOGS\n> Multiple failed authentication attempts\n> Unusual file access patterns\n> Memory dump initiated at 03:42\n> Primary admin credentials changed"
        ];
        message = serverMessages[Math.floor(Math.random() * serverMessages.length)];
    } else {
        message = "No data available";
    }
    
    showDialogue(message, 5000);
}

// Handle exit transitions
function handleExit(exitType) {
    console.log("Handling exit of type:", exitType);
    
    // Check if this is a locked exit
    if (exitType.includes('locked')) {
        showDialogue("This door is locked. Find a way to unlock it first.", 3000);
        return;
    }
    
    // Determine direction and new coordinates
    let newCoords, entryDirection;
    
    switch (exitType) {
        case TileType.EXIT_TOP:
            newCoords = [gameState.currentLevel[0], gameState.currentLevel[1] - 1];
            entryDirection = 'bottom';
            break;
        case TileType.EXIT_BOTTOM:
            newCoords = [gameState.currentLevel[0], gameState.currentLevel[1] + 1];
            entryDirection = 'top';
            break;
        case TileType.EXIT_LEFT:
            newCoords = [gameState.currentLevel[0] - 1, gameState.currentLevel[1]];
            entryDirection = 'right';
            break;
        case TileType.EXIT_RIGHT:
            newCoords = [gameState.currentLevel[0] + 1, gameState.currentLevel[1]];
            entryDirection = 'left';
            break;
        default:
            console.error("Unknown exit type:", exitType);
            return; // Not an exit
    }
    
    // Display transition message
    const exitNames = {
        [TileType.EXIT_RIGHT]: "East Wing",
        [TileType.EXIT_LEFT]: "West Wing",
        [TileType.EXIT_TOP]: "North Datacenter",
        [TileType.EXIT_BOTTOM]: "South Corridor"
    };
    
    showDialogue(`Accessing ${exitNames[exitType]}...\nEstablishing connection...\nMapping network topology...`, 2000);
    
    // Wait for message to display, then transition
    setTimeout(() => {
        loadLevel(newCoords, entryDirection);
    }, 2000);
}

// Send chat message to NPC
async function sendChatMessage() {
    if (!gameState.activeNPC) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Clear input
    chatInput.value = '';
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'npcMessage typing-effect';
    typingIndicator.textContent = '...';
    chatHistory.appendChild(typingIndicator);
    
    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    try {
        let response;
        
        // If this is a terminal, handle locally
        if (gameState.activeNPC.userData.npcType === 'terminal') {
            // We need to await the promise result here
            response = await handleTerminalCommand(message);
        } else {
            // Send to server NPC API
            response = await getNPCResponse(message);
        }
        
        // Remove typing indicator
        chatHistory.removeChild(typingIndicator);
        
        // Add NPC response
        addMessageToChat(response, 'npc');
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove typing indicator
        chatHistory.removeChild(typingIndicator);
        
        // Add error message
        addMessageToChat('ERROR: Communication system failure. Retrying...', 'npc');
    }
}

// Add message to chat history
function addMessageToChat(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `chatMessage ${sender}Message`;
    
    // Handle terminal-style pre-formatted messages with newlines
    if (gameState.activeNPC && gameState.activeNPC.userData.npcType === 'terminal' && sender === 'npc') {
        // Use pre element for terminal messages to preserve formatting
        messageElement.innerHTML = `<pre>${message}</pre>`;
        // Apply styling to pre element to match terminal aesthetic
        const preElement = messageElement.querySelector('pre');
        if (preElement) {
            preElement.style.margin = '0';
            preElement.style.fontFamily = 'monospace';
            preElement.style.whiteSpace = 'pre-wrap';
            preElement.style.wordBreak = 'break-word';
        }
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return;
    }
    
    if (sender === 'user') {
        messageElement.textContent = message;
    } else {
        // For NPC messages, use the typing effect
        let index = 0;
        const text = message;
        messageElement.textContent = '';
        
        const typingInterval = setInterval(() => {
            if (index < text.length) {
                messageElement.textContent += text.charAt(index);
                index++;
                
                // Scroll to bottom while typing
                chatHistory.scrollTop = chatHistory.scrollHeight;
            } else {
                clearInterval(typingInterval);
            }
        }, 15);
    }
    
    chatHistory.appendChild(messageElement);
    
    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Get NPC response from server
async function getNPCResponse(message) {
    try {
        const response = await fetch('index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'action': 'npc_conversation',
                'npc_type': gameState.activeNPC.userData.npcType,
                'message': message,
                'npc_id': gameState.activeNPC.userData.npcId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get NPC response');
        }
        
        const result = await response.json();
        return result.response;
    } catch (error) {
        console.error('Error getting NPC response:', error);
        return "ERROR: Communication system failure. Try again later.";
    }
}

// Handle terminal commands
function handleTerminalCommand(command) {
    // Forward command to the PHP backend
    return fetch('index.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'action': 'npc_conversation',
            'npc_type': 'terminal',
            'message': command,
            'npc_id': gameState.activeNPC.userData.npcId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to process terminal command');
        }
        return response.json();
    })
    .then(data => {
        // Check if we need to update game state
        if (data.gameStateUpdates) {
            // Check for unlocked doors
            if (data.gameStateUpdates.unlockedDoors) {
                // Initialize if not exists
                if (!gameState.unlockedDoors) {
                    gameState.unlockedDoors = {};
                }
                
                // Merge the unlocked doors from the server
                Object.assign(gameState.unlockedDoors, data.gameStateUpdates.unlockedDoors);
                
                // Update door visuals
                updateDoorVisuals();
                
                // Show notification about unlocked doors
                showDialogue("Door security protocols bypassed. Access granted to restricted areas.", 3000);
            }
            
            // Check for sysadmin privilege
            if (data.gameStateUpdates.can_unlock_doors) {
                gameState.canUnlockDoors = data.gameStateUpdates.can_unlock_doors;
            }
        }
        
        if (command.toLowerCase() === 'exit') {
            // Close the terminal after a short delay
            setTimeout(() => {
                closeChatInterface();
            }, 500);
        }
        return data.response;
    })
    .catch(error => {
        console.error('Error in terminal command:', error);
        return `> ERROR: Command processing failed. System may be unstable.`;
    });
}

// Function to properly close chat interface
function closeChatInterface() {
    chatInterface.style.display = 'none';
    
    // Reset NPC state if one was active
    if (gameState.activeNPC && gameState.activeNPC.userData.state === 'talking') {
        resetNPCState(gameState.activeNPC);
    }
    
    gameState.activeNPC = null;
    chatInterface.classList.remove('terminal-mode');
    
    // Reset key states to prevent stuck keys
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
    
    // Small delay before re-enabling game controls 
    // to prevent accidental movement
    setTimeout(() => {
        // Game controls are automatically re-enabled
        // by our keyboard event handlers
    }, 100);
}

// Update inventory display
function updateInventoryDisplay() {
    // Update keys
    keysContainer.innerHTML = '';
    if (gameState.playerInventory.accessKeys.length === 0) {
        keysContainer.innerHTML = '<li>No access keys found</li>';
    } else {
        gameState.playerInventory.accessKeys.forEach(key => {
            const keyItem = document.createElement('li');
            keyItem.textContent = key;
            keysContainer.appendChild(keyItem);
        });
    }
    
    // Update skills
    skillsContainer.innerHTML = '';
    Object.entries(gameState.playerInventory.skillLevels).forEach(([skill, level]) => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skillItem';
        skillItem.innerHTML = `<span>${skill}</span><span>LVL ${level}</span>`;
        skillsContainer.appendChild(skillItem);
    });
}

// Update game info display
function updateGameInfo() {
    const areaNames = {
        "0,0": "SERVER ROOM ALPHA",
        "1,0": "NETWORK HUB EAST",
        "-1,0": "NETWORK HUB WEST",
        "0,1": "SECURITY MAINFRAME",
        "0,-1": "EXECUTIVE OFFICE",
        "1,1": "DATABASE CLUSTER",
        "-1,1": "BACKUP SYSTEMS",
        "1,-1": "R&D TERMINALS",
        "-1,-1": "ARCHIVE STORAGE"
    };
    
    const coords = `${gameState.currentLevel[0]},${gameState.currentLevel[1]}`;
    const areaName = areaNames[coords] || `SECTOR ${Math.abs(gameState.currentLevel[0])}${Math.abs(gameState.currentLevel[1])}`;
    const secLevel = 4 + Math.abs(gameState.currentLevel[0]) + Math.abs(gameState.currentLevel[1]);
    
    gameInfoElement.textContent = `${areaName} :: SEC_LEVEL: ${secLevel}`;
}

// Show dialogue box with message
function showDialogue(text, duration = 5000) {
    dialogueBox.innerHTML = text;
    dialogueBox.style.display = 'block';
    
    // Clear any existing timeout
    if (window.dialogueTimeout) {
        clearTimeout(window.dialogueTimeout);
    }
    
    // Set new timeout
    window.dialogueTimeout = setTimeout(() => {
        dialogueBox.style.display = 'none';
    }, duration);
}

// Handle player movement
function movePlayer(deltaTime) {
    // Skip movement if chat or puzzle is open
    if (chatInterface.style.display === 'flex' || puzzleInterface.style.display === 'flex') {
        return false;
    }
    
    let dx = 0;
    let dz = 0;
    let moved = false;
    
    // Keyboard movement (WASD only). Map to world based on camera mode/board rotation
    const input = { x: 0, z: 0 };
    if (keys.w) input.z -= 1;
    if (keys.s) input.z += 1;
    if (keys.a) input.x -= 1;
    if (keys.d) input.x += 1;
    // Normalize to a cardinal step
    if (input.x !== 0 || input.z !== 0) {
        // Transform input from screen space to world grid based on cameraMode
        let angle = 0;
        if (cameraMode === 'top') {
            angle = -boardRotationQuarter * (Math.PI / 2);
        } else {
            // Keep WASD consistent in follow mode by using world axes (no rotation of input)
            angle = 0;
        }
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const wx = input.x * cosA - input.z * sinA;
        const wz = input.x * sinA + input.z * cosA;
        // Choose dominant axis to keep grid-stepped movement
        if (Math.abs(wx) > Math.abs(wz)) {
            dx = wx > 0 ? 1 : -1;
            dz = 0;
        } else {
            dz = wz > 0 ? 1 : -1;
            dx = 0;
        }
    }
    
    // Mouse click movement
    if (moveTarget) {
        dx = 0;
        dz = 0;
        
        // Determine direction to target
        if (gameState.playerPosition[0] < moveTarget.x) dx = 1;
        else if (gameState.playerPosition[0] > moveTarget.x) dx = -1;
        
        if (gameState.playerPosition[1] < moveTarget.z) dz = 1;
        else if (gameState.playerPosition[1] > moveTarget.z) dz = -1;
        
        // Prefer horizontal movement first if both directions are needed
        if (dx !== 0 && dz !== 0) {
            if (Math.abs(gameState.playerPosition[0] - moveTarget.x) > Math.abs(gameState.playerPosition[1] - moveTarget.z)) {
                dz = 0;
            } else {
                dx = 0;
            }
        }
        
        // Check if we've reached the target
        if (gameState.playerPosition[0] === moveTarget.x && gameState.playerPosition[1] === moveTarget.z) {
            moveTarget = null;
            targetIndicator.visible = false;
        }
    }
    
    if (dx !== 0 || dz !== 0) {
        // Calculate new position
        const newX = gameState.playerPosition[0] + dx;
        const newZ = gameState.playerPosition[1] + dz;
        
        // Check bounds and collision
        if (newX >= 0 && newX < GRID_WIDTH && 
            newZ >= 0 && newZ < GRID_HEIGHT && 
            !collisionMap[newZ][newX]) {
            
            // Check for exit tiles before moving
            const tileValue = gameState.levelData.layout[newZ][newX];
            const tileType = tileMapping[tileValue];
            
            // Check if the tile is a portal
            if (tileType === TileType.PORTAL) {
                // Handle portal entry - redirect to Vibeverse
                enterPortal();
                return false;
            }
            
            // Check if the tile is a locked door
            const isLockedDoor = tileType && tileType.includes('exit') && (
                tileType.includes('locked') || 
                gameState.lockedDoors[`exit_${gameState.currentLevel[0]}_${gameState.currentLevel[1]}_${newX}_${newZ}`] === true
            );
            
            // If it's not a locked door, allow movement
            if (!isLockedDoor) {
                // Update position
                gameState.playerPosition[0] = newX;
                gameState.playerPosition[1] = newZ;
                // Keep the 3D model centered within the grid cell
                player.position.x = (newX + 0.5) * TILE_SIZE;
                player.position.z = (newZ + 0.5) * TILE_SIZE;
                moved = true;
                
                // Check for exit tiles
                if (tileType && (
                    tileType === TileType.EXIT_RIGHT || 
                    tileType === TileType.EXIT_LEFT || 
                    tileType === TileType.EXIT_TOP || 
                    tileType === TileType.EXIT_BOTTOM ||
                    tileType === TileType.EXIT_RIGHT_LOCKED || 
                    tileType === TileType.EXIT_LEFT_LOCKED || 
                    tileType === TileType.EXIT_TOP_LOCKED || 
                    tileType === TileType.EXIT_BOTTOM_LOCKED
                )) {
                    handleExit(tileType);
                }
            } else {
                // This is a locked door tile, show message
                showDialogue("This door is locked. Find a way to unlock it first.", 3000);
                if (moveTarget) {
                    moveTarget = null;
                    targetIndicator.visible = false;
                }
            }
        } else if (moveTarget) {
            // If we hit a wall while following a path, cancel the movement
            moveTarget = null;
            targetIndicator.visible = false;
        }
        
        // Update desired facing based on movement direction (smoothed elsewhere)
        if (dx !== 0 || dz !== 0) {
            playerDesiredRotation = Math.atan2(dx, dz);
        }
    }
    
    // Target indicator animation
    if (targetIndicator.visible) {
        const time = performance.now() * 0.001;
        targetIndicator.scale.set(
            1.0 + Math.sin(time * 3) * 0.2,
            1.0 + Math.sin(time * 3) * 0.2,
            1.0 + Math.sin(time * 3) * 0.2
        );
    }
    
    return moved;
}

// Handle player entering the Vibeverse portal
function enterPortal() {
    // Show portal entry message
    showDialogue("Entering Vibeverse Portal...", 2000);

    // After a brief delay, redirect to the portal URL
    setTimeout(() => {
        // Build the portal URL with parameters
        const portalURL = new URL('http://portal.pieter.com');
        
        // Add parameters
        portalURL.searchParams.append('username', 'penguin_hacker');
        portalURL.searchParams.append('color', '00ffff'); // Cyan like the player's glow
        portalURL.searchParams.append('speed', '1.5');
        portalURL.searchParams.append('ref', window.location.href);
        
        // Additional optional parameters
        portalURL.searchParams.append('avatar_url', '');
        portalURL.searchParams.append('team', 'hackers');
        
        // Redirect to the portal
        window.location.href = portalURL.toString();
    }, 2000);
}

// Update camera to follow player with improved smooth motion
function updateCamera(deltaTime) {
    const centerX = (GRID_WIDTH * TILE_SIZE) / 2;
    const centerZ = (GRID_HEIGHT * TILE_SIZE) / 2;

    if (cameraMode === 'top') {
        // Static overhead view of the entire board with zoom
        const baseHeight = Math.max(GRID_WIDTH, GRID_HEIGHT) * TILE_SIZE * 1.6;
        const topHeight = baseHeight / topViewZoom;
        camera.position.set(centerX, topHeight, centerZ + 0.0001);
        camera.lookAt(centerX, 0, centerZ);
    } else if (cameraMode === 'follow') {
        // Smooth player rotation toward desired rotation
        const rotDiff = playerDesiredRotation - player.rotation.y;
        // Normalize angle difference to [-PI, PI]
        let adjustedDiff = rotDiff;
        while (adjustedDiff > Math.PI) adjustedDiff -= Math.PI * 2;
        while (adjustedDiff < -Math.PI) adjustedDiff += Math.PI * 2;
        player.rotation.y += adjustedDiff * 0.15; // smoothing factor

        // Follow view: camera positioned in front of player (opposite of behind)
        // This way WASD controls are intuitive - W moves toward camera direction
        const distance = 6 * cameraSettings.zoom;
        const height = 3 * cameraSettings.zoom;

        // Camera positioned in front of player (player faces +Z, camera is in front at +Z)
        const targetX = player.position.x;
        const targetZ = player.position.z + distance;
        const targetY = player.position.y + height;

        const smooth = Math.min(5.0 * deltaTime, 0.2);
        camera.position.x += (targetX - camera.position.x) * smooth;
        camera.position.z += (targetZ - camera.position.z) * smooth;
        camera.position.y += (targetY - camera.position.y) * smooth;

        // Look at the player's center, slightly above
        camera.lookAt(player.position.x, player.position.y + 0.8, player.position.z);
    } else if (cameraMode === 'side') {
        // Side view: camera positioned to the left of the player (opposite side for front view)
        const rotDiff = playerDesiredRotation - player.rotation.y;
        // Normalize angle difference to [-PI, PI]
        let adjustedDiff = rotDiff;
        while (adjustedDiff > Math.PI) adjustedDiff -= Math.PI * 2;
        while (adjustedDiff < -Math.PI) adjustedDiff += Math.PI * 2;
        player.rotation.y += adjustedDiff * 0.15;

        // Side view from the left, with good distance for lighting
        const sideDistance = 5 * cameraSettings.zoom;
        const height = 2.5 * cameraSettings.zoom;

        const targetX = player.position.x - sideDistance;
        const targetZ = player.position.z;
        const targetY = player.position.y + height;

        const smooth = Math.min(5.0 * deltaTime, 0.2);
        camera.position.x += (targetX - camera.position.x) * smooth;
        camera.position.z += (targetZ - camera.position.z) * smooth;
        camera.position.y += (targetY - camera.position.y) * smooth;

        // Look at the player's center
        camera.lookAt(player.position.x, player.position.y + 0.8, player.position.z);
    }
}

// Rotate board based on quarter turns
function applyBoardRotation() {
    if (!worldGroup) return;
    worldGroup.rotation.y = boardRotationQuarter * (Math.PI / 2);
}

// Apply camera mode (reset values as needed)
function applyCameraMode(reset = false) {
    if (cameraMode === 'top') {
        cameraSettings.zoom = 1; // not used directly in top mode
    } else {
        // Reset follow zoom/offset
        cameraSettings.zoom = 1;
    }
}

// UI controls for top view zoom
function createTopViewControls() {
    if (document.getElementById('topViewControls')) return; // avoid duplicates
    const container = document.createElement('div');
    container.id = 'topViewControls';
    container.style.position = 'absolute';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    container.style.zIndex = '9999';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '12px';
    container.style.color = '#0ff';
    container.style.background = 'rgba(0,0,0,0.4)';
    container.style.padding = '6px 8px';
    container.style.border = '1px solid #0ff';
    container.style.borderRadius = '4px';

    const title = document.createElement('div');
    title.textContent = 'TOP VIEW';
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    container.appendChild(title);

    const zoomRow = document.createElement('div');
    zoomRow.style.display = 'flex';
    zoomRow.style.gap = '4px';
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.textContent = '-';
    const zoomLabel = document.createElement('span');
    zoomLabel.textContent = 'Zoom';
    const zoomInBtn = document.createElement('button');
    zoomInBtn.textContent = '+';
    [zoomOutBtn, zoomInBtn].forEach(btn => { btn.style.cursor='pointer'; btn.style.background='#022'; btn.style.color='#0ff'; btn.style.border='1px solid #044'; btn.style.padding='2px 6px'; });
    zoomRow.appendChild(zoomOutBtn);
    zoomRow.appendChild(zoomLabel);
    zoomRow.appendChild(zoomInBtn);
    container.appendChild(zoomRow);

    const rotateRow = document.createElement('div');
    rotateRow.style.display='flex';
    rotateRow.style.gap='4px';
    const rotL = document.createElement('button'); rotL.textContent='⟲';
    const rotR = document.createElement('button'); rotR.textContent='⟳';
    const rotReset = document.createElement('button'); rotReset.textContent='R';
    ;[rotL, rotR, rotReset].forEach(btn=>{btn.style.cursor='pointer';btn.style.background='#022';btn.style.color='#0ff';btn.style.border='1px solid #044';btn.style.padding='2px 6px';});
    rotateRow.appendChild(rotL); rotateRow.appendChild(rotR); rotateRow.appendChild(rotReset);
    container.appendChild(rotateRow);

    document.body.appendChild(container);

    function updateButtons() {
        container.style.display = cameraMode === 'top' ? 'flex' : 'none';
    }
    updateButtons();

    zoomInBtn.addEventListener('click', ()=>{ if (cameraMode!=='top') return; topViewZoom = Math.min(TOP_ZOOM_MAX, topViewZoom + TOP_ZOOM_STEP); });
    zoomOutBtn.addEventListener('click', ()=>{ if (cameraMode!=='top') return; topViewZoom = Math.max(TOP_ZOOM_MIN, topViewZoom - TOP_ZOOM_STEP); });
    rotL.addEventListener('click', ()=>{ if (cameraMode!=='top') return; boardRotationQuarter=(boardRotationQuarter+3)%4; applyBoardRotation(); });
    rotR.addEventListener('click', ()=>{ if (cameraMode!=='top') return; boardRotationQuarter=(boardRotationQuarter+1)%4; applyBoardRotation(); });
    rotReset.addEventListener('click', ()=>{ if (cameraMode!=='top') return; boardRotationQuarter=0; applyBoardRotation(); });

    // Expose for mode switching
    window.__updateTopControls = updateButtons;
}

// Animation loop
let lastTime = 0;
let moveCounter = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const timeInSeconds = currentTime * 0.001;
    const deltaTime = Math.min(timeInSeconds - lastTime, 0.1); // Cap at 0.1s to prevent large jumps
    lastTime = timeInSeconds;
    
    // Limit movement rate
    moveCounter += deltaTime;
    if (moveCounter >= 0.1) { // Move every 100ms
        movePlayer(deltaTime);
        moveCounter = 0;
    }
    
    // Update camera
    updateCamera(deltaTime);
    
    // Update NPCs
    updateNPCs(deltaTime, collisionMap);

    animateCyborgPenguin(player, deltaTime);
    
    // Light animations
    const time = timeInSeconds;
    scene.children.forEach(child => {
        if (child.isPointLight && child.userData && child.userData.blinkRate) {
            child.intensity = Math.abs(Math.sin(time * child.userData.blinkRate)) * 
                             child.userData.originalIntensity;
        }
    });
    
    // Animate portal lights
    if (window.portalLights && window.portalLights.length > 0) {
        window.portalLights.forEach(light => {
            if (light && light.userData) {
                // Update angle
                light.userData.angle += light.userData.speed * deltaTime;
                
                // Calculate new position
                light.position.x = light.userData.centerX + Math.cos(light.userData.angle) * light.userData.radius;
                light.position.z = light.userData.centerZ + Math.sin(light.userData.angle) * light.userData.radius;
                
                // Animate vertical position
                light.position.y = light.userData.baseHeight + 
                                  Math.sin(time * light.userData.verticalSpeed) * 0.2;
                
                // Pulsate intensity
                light.intensity = 0.5 + Math.sin(time * 2 + light.userData.angle) * 0.3;
            }
        });
    }
    
    // Make the player's glow pulsate
    if (player.children[4]) { // Glow sphere
        player.children[4].scale.set(
            1.0 + Math.sin(time * 2) * 0.2,
            1.0 + Math.sin(time * 2) * 0.2,
            1.0 + Math.sin(time * 2) * 0.2
        );
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Complete loading if we're still in loading phase
    updateLoadingProgress(0.1);
}

// Save game state to server
async function saveGameState() {
    try {
        const response = await fetch('index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'action': 'save_game',
                'game_state': JSON.stringify(gameState)
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save game state');
        }
        
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error('Error saving game state:', error);
        return false;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    initGame();
});