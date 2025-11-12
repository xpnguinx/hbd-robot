/**
 * Penguin Hacker RPG - Robot NPC Models
 * This file contains the functions to create different robot models for NPCs
 */

// Cache for geometries, materials, and textures
const robotGeometryCache = {};
const robotMaterialCache = {};
const robotTextureCache = {};

/**
 * Create a base robot NPC with type-specific customizations
 * @param {string} npcType - Type of NPC (sysadmin, junior_tech, security_ai, hacker, corporate_exec)
 * @param {number} gridX - Grid X position
 * @param {number} gridZ - Grid Z position
 * @return {THREE.Group} Robot model group
 */
function createRobotNPC(npcType, gridX, gridZ) {
    const robot = new THREE.Group();
    
    // Base properties common to all robots
    let bodyColor, eyeColor, accentColor, robotHeight;
    
    // Customize based on NPC type
    switch(npcType) {
        case 'sysadmin':
            bodyColor = 0x2255aa; // Blue
            eyeColor = 0x00ffff;  // Cyan
            accentColor = 0x224477; // Dark Blue
            robotHeight = 1.2;
            break;
        case 'junior_tech':
            bodyColor = 0x22aa22; // Green
            eyeColor = 0xffff00;  // Yellow
            accentColor = 0x007711; // Dark Green
            robotHeight = 1.0;
            break;
        case 'security_ai':
            bodyColor = 0x991111; // Red
            eyeColor = 0xff0000;  // Bright Red
            accentColor = 0x550000; // Dark Red
            robotHeight = 1.4;
            break;
        case 'hacker':
            bodyColor = 0x773399; // Purple
            eyeColor = 0x00ff99;  // Neon Green
            accentColor = 0x442266; // Dark Purple
            robotHeight = 1.1;
            break;
        case 'corporate_exec':
            bodyColor = 0xaaaaaa; // Silver
            eyeColor = 0x0033ff;  // Blue
            accentColor = 0x333333; // Dark Gray
            robotHeight = 1.3;
            break;
        default:
            bodyColor = 0x555555; // Gray
            eyeColor = 0xffffff;  // White
            accentColor = 0x333333; // Dark Gray
            robotHeight = 1.2;
    }
    
    // Create body parts
    // Base/Wheels
    const baseGeometry = getGeometry('cylinder', TILE_SIZE * 0.4, TILE_SIZE * 0.4, TILE_SIZE * 0.2, 16);
    const baseMaterial = getMaterial('standard', { color: accentColor, metalness: 0.7, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = TILE_SIZE * 0.1;
    robot.add(base);
    
    // Main body
    const bodyGeometry = getGeometry('cylinder', TILE_SIZE * 0.3, TILE_SIZE * 0.25, TILE_SIZE * 0.6 * robotHeight, 16);
    const bodyMaterial = getMaterial('standard', { color: bodyColor, metalness: 0.5, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = TILE_SIZE * (0.2 + 0.3 * robotHeight);
    robot.add(body);
    
    // Head
    const headGeometry = getGeometry('sphere', TILE_SIZE * 0.25, 16, 16);
    const headMaterial = getMaterial('standard', { color: bodyColor, metalness: 0.6, roughness: 0.4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.25);
    robot.add(head);
    
    // Eyes (emissive for glow effect)
    const eyeGeometry = getGeometry('sphere', TILE_SIZE * 0.06, 8, 8);
    const eyeMaterial = getMaterial('standard', { 
        color: eyeColor, 
        emissive: eyeColor,
        emissiveIntensity: 0.8,
        metalness: 0.3, 
        roughness: 0.2 
    });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-TILE_SIZE * 0.12, TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.3), TILE_SIZE * 0.15);
    robot.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(TILE_SIZE * 0.12, TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.3), TILE_SIZE * 0.15);
    robot.add(rightEye);
    
    // Antenna (for some robot types)
    if (npcType === 'security_ai' || npcType === 'hacker') {
        const antennaGeometry = getGeometry('cylinder', TILE_SIZE * 0.02, TILE_SIZE * 0.01, TILE_SIZE * 0.3, 8);
        const antennaMaterial = getMaterial('standard', { color: accentColor, metalness: 0.8, roughness: 0.2 });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.y = TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.4);
        robot.add(antenna);
        
        // Antenna tip light
        const tipGeometry = getGeometry('sphere', TILE_SIZE * 0.03, 8, 8);
        const tipMaterial = getMaterial('standard', { 
            color: eyeColor, 
            emissive: eyeColor,
            emissiveIntensity: 1.0,
            metalness: 0.3, 
            roughness: 0.2
        });
        const antennaLight = new THREE.Mesh(tipGeometry, tipMaterial);
        antennaLight.position.y = TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.55);
        robot.add(antennaLight);
        
        // Add point light for glow effect
        const light = new THREE.PointLight(eyeColor, 0.5, TILE_SIZE * 2);
        light.position.set(0, TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.55), 0);
        robot.add(light);
        
        // Store light reference for animation
        robot.userData.light = light;
        robot.userData.antennaLight = antennaLight;
    }
    
    // Arms for corporate and sysadmin types
    if (npcType === 'corporate_exec' || npcType === 'sysadmin') {
        // Left arm
        const leftArmGroup = new THREE.Group();
        
        const shoulderGeometry = getGeometry('sphere', TILE_SIZE * 0.08, 8, 8);
        const shoulderMaterial = getMaterial('standard', { color: accentColor, metalness: 0.6, roughness: 0.4 });
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftArmGroup.add(leftShoulder);
        
        const armGeometry = getGeometry('cylinder', TILE_SIZE * 0.05, TILE_SIZE * 0.04, TILE_SIZE * 0.25, 8);
        const armMaterial = getMaterial('standard', { color: bodyColor, metalness: 0.5, roughness: 0.5 });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.y = -TILE_SIZE * 0.15;
        leftArm.rotation.x = Math.PI / 4; // Angle slightly forward
        leftArmGroup.add(leftArm);
        
        leftArmGroup.position.set(-TILE_SIZE * 0.3, TILE_SIZE * (0.2 + 0.5 * robotHeight), 0);
        robot.add(leftArmGroup);
        
        // Right arm
        const rightArmGroup = new THREE.Group();
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightArmGroup.add(rightShoulder);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.y = -TILE_SIZE * 0.15;
        rightArm.rotation.x = Math.PI / 4; // Angle slightly forward
        rightArmGroup.add(rightArm);
        
        rightArmGroup.position.set(TILE_SIZE * 0.3, TILE_SIZE * (0.2 + 0.5 * robotHeight), 0);
        robot.add(rightArmGroup);
        
        // Store arm references for animation
        robot.userData.leftArm = leftArmGroup;
        robot.userData.rightArm = rightArmGroup;
    }
    
    // Add details based on NPC type
    if (npcType === 'sysadmin') {
        // Add tech pattern to body
        const detailGeometry = getGeometry('box', TILE_SIZE * 0.15, TILE_SIZE * 0.1, TILE_SIZE * 0.05, 1);
        const detailMaterial = getMaterial('standard', { 
            color: 0x00ffff, 
            emissive: 0x00ffff,
            emissiveIntensity: 0.3,
            metalness: 0.5, 
            roughness: 0.5
        });
        
        const detail1 = new THREE.Mesh(detailGeometry, detailMaterial);
        detail1.position.set(0, TILE_SIZE * (0.2 + 0.4 * robotHeight), TILE_SIZE * 0.28);
        robot.add(detail1);
        
        // Add blinking server lights
        const lightGeometry = getGeometry('box', TILE_SIZE * 0.03, TILE_SIZE * 0.03, TILE_SIZE * 0.01);
        
        const greenLight = new THREE.Mesh(
            lightGeometry, 
            getMaterial('standard', { color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 })
        );
        greenLight.position.set(-TILE_SIZE * 0.1, TILE_SIZE * (0.2 + 0.45 * robotHeight), TILE_SIZE * 0.3);
        robot.add(greenLight);
        
        const redLight = new THREE.Mesh(
            lightGeometry, 
            getMaterial('standard', { color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 })
        );
        redLight.position.set(TILE_SIZE * 0.1, TILE_SIZE * (0.2 + 0.45 * robotHeight), TILE_SIZE * 0.3);
        robot.add(redLight);
        
        // Store light references for blinking
        robot.userData.statusLights = [greenLight, redLight];
    } else if (npcType === 'junior_tech') {
        // Add tool belt
        const beltGeometry = getGeometry('torus', TILE_SIZE * 0.25, TILE_SIZE * 0.04, 16, 8);
        const beltMaterial = getMaterial('standard', { color: 0x663300, metalness: 0.3, roughness: 0.7 });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.rotation.x = Math.PI / 2;
        belt.position.y = TILE_SIZE * (0.2 + 0.3 * robotHeight);
        robot.add(belt);
        
        // Add a small tool
        const toolGeometry = getGeometry('box', TILE_SIZE * 0.1, TILE_SIZE * 0.05, TILE_SIZE * 0.05);
        const toolMaterial = getMaterial('standard', { color: 0x999999, metalness: 0.7, roughness: 0.3 });
        const tool = new THREE.Mesh(toolGeometry, toolMaterial);
        tool.position.set(0, TILE_SIZE * (0.2 + 0.3 * robotHeight), TILE_SIZE * 0.27);
        robot.add(tool);
    } else if (npcType === 'security_ai') {
        // Add security camera lens
        const lensGeometry = getGeometry('cylinder', TILE_SIZE * 0.1, TILE_SIZE * 0.1, TILE_SIZE * 0.05, 16);
        const lensMaterial = getMaterial('standard', { 
            color: 0x000000, 
            metalness: 0.1, 
            roughness: 0.3,
            envMapIntensity: 0.5
        });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.3), TILE_SIZE * 0.15);
        robot.add(lens);
        
        // Add security badge
        const badgeGeometry = getGeometry('box', TILE_SIZE * 0.15, TILE_SIZE * 0.1, TILE_SIZE * 0.01);
        const badgeMaterial = getMaterial('standard', { 
            color: 0x333333, 
            metalness: 0.8, 
            roughness: 0.2,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        });
        const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
        badge.position.set(0, TILE_SIZE * (0.2 + 0.4 * robotHeight), TILE_SIZE * 0.25);
        robot.add(badge);
    } else if (npcType === 'hacker') {
        // Add glitchy effect parts
        const glitchGeometry = getGeometry('box', TILE_SIZE * 0.2, TILE_SIZE * 0.2, TILE_SIZE * 0.01);
        const glitchMaterial = getMaterial('standard', { 
            color: 0x00ff99, 
            emissive: 0x00ff99,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        // Create three glitch panels at different angles
        for (let i = 0; i < 3; i++) {
            const glitchPanel = new THREE.Mesh(glitchGeometry, glitchMaterial);
            glitchPanel.position.set(
                Math.sin(i * Math.PI * 2 / 3) * TILE_SIZE * 0.15, 
                TILE_SIZE * (0.2 + 0.4 * robotHeight + i * 0.05), 
                Math.cos(i * Math.PI * 2 / 3) * TILE_SIZE * 0.15
            );
            glitchPanel.rotation.y = i * Math.PI * 2 / 3;
            robot.add(glitchPanel);
            
            // Store for animation
            if (!robot.userData.glitchPanels) robot.userData.glitchPanels = [];
            robot.userData.glitchPanels.push(glitchPanel);
        }
    } else if (npcType === 'corporate_exec') {
        // Add tie
        const tieGeometry = getGeometry('box', TILE_SIZE * 0.06, TILE_SIZE * 0.25, TILE_SIZE * 0.02);
        const tieMaterial = getMaterial('standard', { color: 0x000066, metalness: 0.1, roughness: 0.9 });
        const tie = new THREE.Mesh(tieGeometry, tieMaterial);
        tie.position.set(0, TILE_SIZE * (0.2 + 0.4 * robotHeight), TILE_SIZE * 0.26);
        robot.add(tie);
        
        // Add holographic projector
        const projGeometry = getGeometry('sphere', TILE_SIZE * 0.05, 8, 8);
        const projMaterial = getMaterial('standard', { 
            color: 0x0033ff, 
            emissive: 0x0033ff, 
            emissiveIntensity: 0.7,
            metalness: 0.6, 
            roughness: 0.4 
        });
        const projector = new THREE.Mesh(projGeometry, projMaterial);
        projector.position.set(TILE_SIZE * 0.15, TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.3), 0);
        robot.add(projector);
        
        // Add hologram
        const holoGeometry = getGeometry('box', TILE_SIZE * 0.1, TILE_SIZE * 0.1, TILE_SIZE * 0.01);
        const holoMaterial = getMaterial('standard', { 
            color: 0x0033ff, 
            emissive: 0x0033ff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.5
        });
        const hologram = new THREE.Mesh(holoGeometry, holoMaterial);
        hologram.position.set(TILE_SIZE * 0.25, TILE_SIZE * (0.2 + 0.6 * robotHeight + 0.3), 0);
        robot.add(hologram);
        
        // Store for animation
        robot.userData.hologram = hologram;
    }
    
    // Add shadow casting for all robot parts
    robot.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    
    // Add light source to illuminate the robot
    const robotLight = new THREE.PointLight(eyeColor, 0.3, TILE_SIZE * 3);
    robotLight.position.set(0, TILE_SIZE * robotHeight, 0);
    robot.add(robotLight);
    
    // Set initial position (centered within tile)
    robot.position.set((gridX + 0.5) * TILE_SIZE, 0, (gridZ + 0.5) * TILE_SIZE);
    
    // Add movement properties
    robot.userData.moveSpeed = 0.3 + Math.random() * 0.3; // Units per second
    robot.userData.rotationSpeed = 1 + Math.random() * 2; // Radians per second
    robot.userData.idleTime = 0;
    robot.userData.maxIdleTime = 2 + Math.random() * 3; // Seconds
    robot.userData.targetX = gridX;
    robot.userData.targetZ = gridZ;
    robot.userData.gridX = gridX;
    robot.userData.gridZ = gridZ;
    robot.userData.state = 'idle'; // idle, moving, or talking
    
    return robot;
}

/**
 * Update robot animation
 * @param {THREE.Group} robot - Robot to animate
 * @param {number} deltaTime - Time since last frame
 */
function animateRobot(robot, deltaTime) {
    // Skip if robot is not defined
    if (!robot) return;
    
    const time = performance.now() * 0.001; // Current time in seconds
    
    // Animate robot type-specific elements
    if (robot.userData.statusLights) {
        // Blink status lights
        robot.userData.statusLights.forEach((light, index) => {
            if (light.material) {
                const blinkRate = 0.5 + index * 0.7; // Different rates for different lights
                const intensity = (Math.sin(time * blinkRate * Math.PI) * 0.5 + 0.5);
                light.material.emissiveIntensity = intensity;
            }
        });
    }
    
    if (robot.userData.antennaLight) {
        // Pulse antenna light
        const pulseRate = 1 + Math.sin(time * 3) * 0.3;
        robot.userData.antennaLight.material.emissiveIntensity = pulseRate;
        
        if (robot.userData.light) {
            robot.userData.light.intensity = 0.3 + Math.sin(time * 3) * 0.2;
        }
    }
    
    if (robot.userData.glitchPanels) {
        // Animate glitch panels
        robot.userData.glitchPanels.forEach((panel, index) => {
            panel.position.y = TILE_SIZE * (0.2 + 0.4 + index * 0.05 + Math.sin(time * (2 + index) + index) * 0.05);
            panel.material.opacity = 0.4 + Math.sin(time * 3 + index) * 0.3;
        });
    }
    
    if (robot.userData.hologram) {
        // Rotate hologram
        robot.userData.hologram.rotation.y += deltaTime * 2;
        robot.userData.hologram.material.opacity = 0.3 + Math.sin(time * 2) * 0.2;
    }
    
    if (robot.userData.leftArm && robot.userData.rightArm) {
        // Gentle arm swinging
        robot.userData.leftArm.rotation.x = Math.sin(time * 0.8) * 0.2;
        robot.userData.rightArm.rotation.x = Math.sin(time * 0.8 + Math.PI) * 0.2;
    }
    
    // Base subtle hover animation for all robots
    robot.position.y = Math.sin(time * 1.5) * 0.03 + 0.05;
    
    // Apply a subtle spinning effect to the base/wheels when moving
    if (robot.userData.state === 'moving' && robot.children[0]) {
        robot.children[0].rotation.y += deltaTime * 2;
    }
}

/**
 * Find a valid movement target for an NPC
 * @param {Array<Array<boolean>>} collisionMap - 2D grid of collision data
 * @param {number} currentX - Current grid X position
 * @param {number} currentZ - Current grid Z position
 * @param {number} maxDistance - Maximum distance to move (in grid units)
 * @return {Object|null} Target position or null if no valid target found
 */
function findValidMovementTarget(collisionMap, currentX, currentZ, maxDistance = 5) {
    const gridWidth = collisionMap[0].length;
    const gridHeight = collisionMap.length;
    
    // Try several random positions
    for (let attempts = 0; attempts < 10; attempts++) {
        // Random direction and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = 1 + Math.random() * (maxDistance - 1);
        
        // Calculate target
        const targetX = Math.round(currentX + Math.cos(angle) * distance);
        const targetZ = Math.round(currentZ + Math.sin(angle) * distance);
        
        // Check if valid
        if (targetX >= 0 && targetX < gridWidth && 
            targetZ >= 0 && targetZ < gridHeight && 
            !collisionMap[targetZ][targetX]) {
            
            // Check if path is clear (simplified path finding)
            let pathClear = true;
            
            // Check just a few points along the path
            const steps = Math.max(Math.abs(targetX - currentX), Math.abs(targetZ - currentZ));
            for (let i = 1; i < steps; i++) {
                const ratio = i / steps;
                const checkX = Math.round(currentX + (targetX - currentX) * ratio);
                const checkZ = Math.round(currentZ + (targetZ - currentZ) * ratio);
                
                if (collisionMap[checkZ][checkX]) {
                    pathClear = false;
                    break;
                }
            }
            
            if (pathClear) {
                return { x: targetX, z: targetZ };
            }
        }
    }
    
    // No valid target found
    return null;
}