// Penguin Hacker RPG - Multiplayer Client
let socket;
const otherPlayers = {};

// Initialize multiplayer when the game starts
function initMultiplayer() {
    // Connect to the server
    socket = io();
    
    // On successful connection
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        
        // Join the current level
        joinLevel(gameState.currentLevel, gameState.playerPosition);
        
        // Set up a regular update interval to send player position
        setInterval(sendPlayerPosition, 100);
    });
    
    // When we receive initial player list
    socket.on('players', (players) => {
        // Clear existing players
        clearOtherPlayers();
        
        // Add all players except self
        Object.values(players).forEach(playerData => {
            if (playerData.id !== socket.id && 
                playerData.level[0] === gameState.currentLevel[0] && 
                playerData.level[1] === gameState.currentLevel[1]) {
                createOtherPlayer(playerData);
            }
        });
    });
    
    // When a new player joins
    socket.on('playerJoined', (playerData) => {
        if (playerData.id !== socket.id &&
            playerData.level[0] === gameState.currentLevel[0] && 
            playerData.level[1] === gameState.currentLevel[1]) {
            createOtherPlayer(playerData);
            
            // Show notification
            showDialogue(`A new penguin agent has connected to this sector.`, 3000);
        }
    });
    
    // When a player moves
    socket.on('playerMoved', (data) => {
        updateOtherPlayerPosition(data);
    });
    
    // When a player leaves
    socket.on('playerLeft', (playerId) => {
        removeOtherPlayer(playerId);
    });
    
    // When a door is unlocked by another player
    socket.on('doorUnlocked', (data) => {
        // If we're in the same level
        if (data.level[0] === gameState.currentLevel[0] && 
            data.level[1] === gameState.currentLevel[1]) {
            
            // Unlock the door
            gameState.lockedDoors[data.doorId] = false;
            
            // Update visuals
            updateDoorVisuals();
            
            // Show notification
            showDialogue("A door was unlocked by another agent.", 3000);
        }
    });
    
    // When a puzzle is completed by another player
    socket.on('puzzleCompleted', (data) => {
        // If we're in the same level
        if (data.level[0] === gameState.currentLevel[0] && 
            data.level[1] === gameState.currentLevel[1]) {
            
            // Add to completed puzzles if not already there
            if (!gameState.completedPuzzles.includes(data.puzzleId)) {
                gameState.completedPuzzles.push(data.puzzleId);
            }
            
            // Find the puzzle object
            const puzzle = interactableObjects.find(obj => 
                obj.userData.type === TileType.PUZZLE && 
                obj.userData.puzzleId === data.puzzleId
            );
            
            if (puzzle) {
                // Mark as completed
                puzzle.userData.completed = true;
                
                // Update visuals
                updatePuzzleVisuals();
            }
            
            // Show notification
            showDialogue("A security bypass was completed by another agent.", 3000);
        }
    });
    
    // When receiving a chat message
    socket.on('chatMessage', (data) => {
        // If chat is open, add to the chat
        if (chatInterface.style.display === 'flex') {
            addMessageToChat(`<AGENT_${data.from.substring(0, 6)}>: ${data.message}`, 'npc');
        } else {
            // Otherwise show as dialogue
            showDialogue(`<AGENT_${data.from.substring(0, 6)}>: ${data.message}`, 5000);
        }
    });
}

// Join a level
function joinLevel(level, position) {
    if (socket && socket.connected) {
        socket.emit('changeLevel', {
            level: level,
            position: position
        });
    }
}

// Send player position to server
function sendPlayerPosition() {
    if (socket && socket.connected) {
        socket.emit('updatePosition', {
            position: gameState.playerPosition,
            rotation: player.rotation.y,
            level: gameState.currentLevel
        });
    }
}

// Create a representation of another player
function createOtherPlayer(playerData) {
    // Create a group for the player
    const otherPlayerGroup = new THREE.Group();
    
    // Try to use the same model as the main player
    const loader = new THREE.GLTFLoader();
    loader.load(
        'character/penguin.glb',
        function (gltf) {
            // Scale and position similar to main player
            gltf.scene.scale.set(TILE_SIZE * 0.8, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
            gltf.scene.position.y = TILE_SIZE * 0.4;
            gltf.scene.rotation.y = -Math.PI / 2;
            
            // Add to the group
            otherPlayerGroup.add(gltf.scene);
            
            // Set shadow properties
            gltf.scene.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
        },
        null,
        function (error) {
            // On error, create a simple box representation
            console.error('Error loading other player model:', error);
            const boxGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.5, TILE_SIZE, TILE_SIZE * 0.5);
            const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x00AAFF });
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.y = TILE_SIZE * 0.5;
            otherPlayerGroup.add(box);
        }
    );
    
    // Set initial position and rotation
    otherPlayerGroup.position.set(
        playerData.position[0] * TILE_SIZE,
        0,
        playerData.position[1] * TILE_SIZE
    );
    otherPlayerGroup.rotation.y = playerData.rotation || 0;
    
    // Add player ID tag
    const playerIdCanvas = document.createElement('canvas');
    playerIdCanvas.width = 256;
    playerIdCanvas.height = 64;
    const ctx = playerIdCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#00FFFF';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`AGENT_${playerData.id.substring(0, 6)}`, 128, 32);
    
    const playerIdTexture = new THREE.CanvasTexture(playerIdCanvas);
    const playerIdMaterial = new THREE.SpriteMaterial({ map: playerIdTexture });
    const playerIdSprite = new THREE.Sprite(playerIdMaterial);
    playerIdSprite.position.set(0, TILE_SIZE * 1.5, 0);
    playerIdSprite.scale.set(2, 0.5, 1);
    otherPlayerGroup.add(playerIdSprite);
    
    // Add to scene
    scene.add(otherPlayerGroup);
    
    // Store reference
    otherPlayers[playerData.id] = otherPlayerGroup;
    
    return otherPlayerGroup;
}

// Update other player position
function updateOtherPlayerPosition(data) {
    if (otherPlayers[data.id]) {
        // Smoothly move towards new position
        const targetX = data.position[0] * TILE_SIZE;
        const targetZ = data.position[1] * TILE_SIZE;
        
        // Store current position
        otherPlayers[data.id].userData.targetX = targetX;
        otherPlayers[data.id].userData.targetZ = targetZ;
        otherPlayers[data.id].userData.targetRotation = data.rotation;
        
        // The actual movement happens in the animate function
        if (!otherPlayers[data.id].userData.isMoving) {
            otherPlayers[data.id].userData.isMoving = true;
            animateOtherPlayer(data.id);
        }
    }
}

// Animate other player movement
function animateOtherPlayer(id) {
    if (!otherPlayers[id]) return;
    
    const player = otherPlayers[id];
    const targetX = player.userData.targetX;
    const targetZ = player.userData.targetZ;
    const targetRotation = player.userData.targetRotation;
    
    // Move towards target position
    player.position.x += (targetX - player.position.x) * 0.1;
    player.position.z += (targetZ - player.position.z) * 0.1;
    
    // Rotate towards target rotation
    if (targetRotation !== undefined) {
        // Find shortest rotation direction
        let rotDiff = targetRotation - player.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        
        player.rotation.y += rotDiff * 0.1;
    }
    
    // Check if we're close enough to target
    const distanceX = Math.abs(targetX - player.position.x);
    const distanceZ = Math.abs(targetZ - player.position.z);
    
    if (distanceX < 0.01 && distanceZ < 0.01) {
        player.position.x = targetX;
        player.position.z = targetZ;
        player.userData.isMoving = false;
    } else {
        // Continue animation
        requestAnimationFrame(() => animateOtherPlayer(id));
    }
}

// Remove another player
function removeOtherPlayer(playerId) {
    if (otherPlayers[playerId]) {
        scene.remove(otherPlayers[playerId]);
        delete otherPlayers[playerId];
    }
}

// Clear all other players
function clearOtherPlayers() {
    Object.keys(otherPlayers).forEach(id => {
        scene.remove(otherPlayers[id]);
    });
    Object.keys(otherPlayers).forEach(key => {
        delete otherPlayers[key];
    });
}

// Send chat message to other players
function sendChatMessageToPlayers(message) {
    if (socket && socket.connected) {
        socket.emit('sendChatMessage', {
            level: gameState.currentLevel,
            message: message
        });
    }
}

// Override the original loadLevel function to support multiplayer
const originalLoadLevel = loadLevel;
loadLevel = async function(coords, entryDirection) {
    // Call the original function
    await originalLoadLevel(coords, entryDirection);
    
    // Then join the new level in multiplayer
    joinLevel(coords, gameState.playerPosition);
};

// Override submitPuzzleSolution to sync with other players
const originalSubmitPuzzleSolution = submitPuzzleSolution;
submitPuzzleSolution = async function() {
    // Call the original function
    const result = await originalSubmitPuzzleSolution();
    
    // If it was successful and we have multiplayer
    if (result && result.correct && socket && socket.connected) {
        // Sync puzzle completion
        socket.emit('completePuzzle', {
            puzzleId: gameState.activePuzzle.userData.puzzleId,
            level: gameState.currentLevel
        });
        
        // If this puzzle unlocks a door, sync that too
        if (gameState.activePuzzle.userData.unlocksExitId) {
            socket.emit('unlockDoor', {
                doorId: gameState.activePuzzle.userData.unlocksExitId,
                level: gameState.currentLevel
            });
        }
    }
    
    return result;
};

// Override sendChatMessage to support multiplayer chat
const originalSendChatMessage = sendChatMessage;
sendChatMessage = async function() {
    // Call the original function
    await originalSendChatMessage();
    
    // Get the message
    const message = chatInput.value.trim();
    
    // If this is not a terminal chat, send to other players
    if (gameState.activeNPC && gameState.activeNPC.userData.npcType !== 'terminal' && 
        message && socket && socket.connected) {
        sendChatMessageToPlayers(message);
    }
};

// Initialize multiplayer after the game loads
window.addEventListener('load', () => {
    // Initialize game is called automatically
    
    // Initialize multiplayer after a small delay to let the game load
    setTimeout(initMultiplayer, 1000);
}); 