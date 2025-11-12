/**
 * Penguin Hacker RPG - NPC Movement System
 * This file handles NPC movement, pathfinding, and state updates
 */

// Array to track all NPCs in the current level
let npcEntities = [];

/**
 * Initialize NPC movement system
 * Must be called whenever a new level is loaded
 */
function initializeNPCSystem() {
    // Clear existing NPCs
    npcEntities = [];
}

/**
 * Register an NPC with the movement system
 * @param {THREE.Group} npc - NPC object to register
 */
function registerNPC(npc) {
    if (!npc) return;
    
    // Initialize NPC movement properties if not set
    if (!npc.userData.moveTimer) {
        npc.userData.moveTimer = 0;
        npc.userData.state = npc.userData.state || 'idle';
        npc.userData.idleTime = 0;
        npc.userData.maxIdleTime = npc.userData.maxIdleTime || (2 + Math.random() * 3);
        npc.userData.moveSpeed = npc.userData.moveSpeed || (0.3 + Math.random() * 0.3);
        npc.userData.rotationSpeed = npc.userData.rotationSpeed || (1 + Math.random() * 2);
        npc.userData.pathIndex = 0;
        npc.userData.currentPath = null;
    }
    
    // Add to tracking array
    npcEntities.push(npc);
}

/**
 * Update all NPCs
 * @param {number} deltaTime - Time since last frame in seconds
 * @param {Array<Array<boolean>>} collisionMap - 2D array of collision data
 */
function updateNPCs(deltaTime, collisionMap) {
    npcEntities.forEach(npc => {
        updateNPCMovement(npc, deltaTime, collisionMap);
        animateRobot(npc, deltaTime);
    });
}

/**
 * Update movement for a single NPC
 * @param {THREE.Group} npc - NPC to update
 * @param {number} deltaTime - Time since last frame
 * @param {Array<Array<boolean>>} collisionMap - Collision map
 */
function updateNPCMovement(npc, deltaTime, collisionMap) {
    // Skip if NPC is talking to player
    if (npc.userData.state === 'talking') return;
    
    // Handle based on current state
    if (npc.userData.state === 'idle') {
        // Update idle timer
        npc.userData.idleTime += deltaTime;
        
        // Check if idle time exceeded
        if (npc.userData.idleTime >= npc.userData.maxIdleTime) {
            // Reset idle time
            npc.userData.idleTime = 0;
            
            // Chance to start moving
            if (Math.random() > 0.3) {
                // Find a new target to move to
                const target = findValidMovementTarget(
                    collisionMap, 
                    npc.userData.gridX, 
                    npc.userData.gridZ,
                    3 // Maximum movement distance
                );
                
                if (target) {
                    npc.userData.targetX = target.x;
                    npc.userData.targetZ = target.z;
                    npc.userData.state = 'moving';
                    
                    // Calculate the path (simplified direct path)
                    npc.userData.currentPath = [
                        { x: npc.userData.gridX, z: npc.userData.gridZ },
                        { x: target.x, z: target.z }
                    ];
                    npc.userData.pathIndex = 0;
                }
            }
        }
    } else if (npc.userData.state === 'moving') {
        // Get current and target grid positions
        const gridX = npc.userData.gridX;
        const gridZ = npc.userData.gridZ;
        const targetX = npc.userData.targetX;
        const targetZ = npc.userData.targetZ;
        
        // Calculate world positions
        const worldX = gridX * TILE_SIZE;
        const worldZ = gridZ * TILE_SIZE;
        const targetWorldX = targetX * TILE_SIZE;
        const targetWorldZ = targetZ * TILE_SIZE;
        
        // Get current position
        const currentX = npc.position.x;
        const currentZ = npc.position.z;
        
        // Calculate direction to target
        const dx = targetWorldX - currentX;
        const dz = targetWorldZ - currentZ;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // If we're close to target, stop moving
        if (distance < 0.05) {
            // Update grid position
            npc.userData.gridX = targetX;
            npc.userData.gridZ = targetZ;
            
            // Snap to grid
            npc.position.x = targetWorldX;
            npc.position.z = targetWorldZ;
            
            // Return to idle state
            npc.userData.state = 'idle';
            npc.userData.idleTime = 0;
            npc.userData.maxIdleTime = 2 + Math.random() * 3; // Randomize idle time
            
            return;
        }
        
        // Calculate normalized direction
        const dirX = dx / distance;
        const dirZ = dz / distance;
        
        // Smoothly rotate to face movement direction
        const targetRotationY = Math.atan2(dirX, dirZ);
        const currentRotationY = npc.rotation.y;
        
        // Calculate the shortest angle difference
        let rotDiff = targetRotationY - currentRotationY;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        
        // Rotate towards target
        const rotationStep = npc.userData.rotationSpeed * deltaTime;
        if (Math.abs(rotDiff) > rotationStep) {
            npc.rotation.y += Math.sign(rotDiff) * rotationStep;
        } else {
            npc.rotation.y = targetRotationY;
        }
        
        // Only move if facing approximately the right direction
        if (Math.abs(rotDiff) < Math.PI / 4) {
            // Calculate movement step
            const moveStep = npc.userData.moveSpeed * deltaTime;
            const moveDistanceThisFrame = Math.min(moveStep, distance);
            
            // Update position
            npc.position.x += dirX * moveDistanceThisFrame;
            npc.position.z += dirZ * moveDistanceThisFrame;
        }
    }
}

/**
 * Set an NPC to talking state
 * @param {THREE.Group} npc - NPC to set as talking
 */
function setNPCTalking(npc) {
    if (!npc) return;
    
    npc.userData.state = 'talking';
    
    // Make the NPC rotate to face the player
    // This would be called when the player interacts with the NPC
}

/**
 * Reset an NPC to idle state
 * @param {THREE.Group} npc - NPC to reset
 */
function resetNPCState(npc) {
    if (!npc) return;
    
    npc.userData.state = 'idle';
    npc.userData.idleTime = 0;
    npc.userData.maxIdleTime = 1 + Math.random() * 2; // Short idle before moving again
}

/**
 * Find an NPC at the given grid coordinates
 * @param {number} gridX - Grid X position
 * @param {number} gridZ - Grid Z position
 * @return {THREE.Group|null} - The NPC at the position or null if none found
 */
function getNPCAtPosition(gridX, gridZ) {
    for (let i = 0; i < npcEntities.length; i++) {
        const npc = npcEntities[i];
        // Check against current grid position
        if (Math.abs(npc.userData.gridX - gridX) <= 0.5 && 
            Math.abs(npc.userData.gridZ - gridZ) <= 0.5) {
            return npc;
        }
    }
    return null;
}