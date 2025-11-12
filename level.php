<?php
/**
 * Penguin Hacker RPG - Level Generator Endpoint
 * 
 * This file handles level generation requests specifically to avoid issues with
 * mixed JSON and HTML responses from index.php.
 */

// Start session for game state persistence
session_start();

// Include required files
require_once 'npc_handler.php';
require_once 'puzzle_generator.php';
require_once 'level_generator.php';
require_once 'groq_config.php';

// Initialize game state if not exists
if (!isset($_SESSION['game_state'])) {
    $_SESSION['game_state'] = [
        'current_level' => [0, 0], // [x, y] coordinates in the level grid
        'visited_levels' => [[0, 0]], // Track visited levels
        'player_position' => [10, 18], // Starting position
        'player_inventory' => [
            'access_keys' => [],
            'tools' => [],
            'skill_levels' => [
                'hacking' => 1,
                'networking' => 1,
                'cryptography' => 1
            ]
        ],
        'npc_conversations' => [], // Store conversation history with NPCs
        'completed_puzzles' => [], // Track solved puzzles
        'puzzles' => [] // Store active puzzles
    ];
}

// Set content type to JSON before any output
header('Content-Type: application/json');

// Check if this is a level generation request
if (isset($_POST['action']) && $_POST['action'] === 'generate_level') {
    $entry_direction = isset($_POST['entry_direction']) ? $_POST['entry_direction'] : 'bottom';
    $level_coords = isset($_POST['level_coords']) ? json_decode($_POST['level_coords'], true) : [0, 0];
    
    // Validate coordinates to ensure they're integers
    if (!is_array($level_coords) || count($level_coords) != 2 || 
        !is_numeric($level_coords[0]) || !is_numeric($level_coords[1])) {
        echo json_encode(['error' => 'Invalid level coordinates']);
        exit;
    }
    
    // Convert to integers
    $level_coords = [intval($level_coords[0]), intval($level_coords[1])];
    
    // Validate entry direction
    $valid_directions = ['top', 'bottom', 'left', 'right'];
    if (!in_array($entry_direction, $valid_directions)) {
        $entry_direction = 'bottom'; // Default if invalid
    }
    
    echo json_encode(generateLevel($entry_direction, $level_coords));
    exit;
} else {
    // Return error if not a valid request
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

/**
 * Generate a new level layout based on entry direction and coordinates
 * 
 * @param string $entry_direction Direction player is entering from
 * @param array $coords Level coordinates [x, y]
 * @return array Level layout and entry point
 */
function generateLevel($entry_direction, $coords) {
    // Check if this is the starting level (0,0)
    if ($coords[0] == 0 && $coords[1] == 0) {
        $base_level = [
            // 0=floor, 1=wall, 2=entrance, 3=exit_bottom, 4=exit_top, 5=exit_right, 6=exit_left, 
            // 7=server, 8=computer, 9=router, 10=satellite, 11=desk, 12=chair, 13=npc, 14=puzzle, 30=portal
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
            [1, 0, 7, 7, 7, 0, 7, 7, 7, 0, 0, 7, 7, 7, 0, 7, 7, 7, 0, 1], 
            [1, 0, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 7, 0, 1], 
            [1, 0, 7, 0, 8, 0, 7, 0, 8, 0, 0, 8, 0, 7, 0, 8, 0, 7, 0, 1], 
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
            [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
            [1, 0, 7, 0, 7, 0, 9, 0, 7, 0, 0, 7, 0, 9, 0, 7, 0, 7, 0, 1], 
            [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
            [6, 0, 0, 0, 0, 0, 0, 0, 0, 13, 13, 0, 0, 0, 0, 0, 0, 0, 0, 5], 
            [6, 0, 0, 0, 0, 0, 0, 0, 0, 13, 13, 0, 0, 0, 0, 0, 0, 0, 0, 5], 
            [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
            [1, 0, 7, 0, 7, 0, 9, 0, 7, 0, 0, 7, 0, 9, 0, 7, 0, 7, 0, 1], 
            [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
            [1, 0, 7, 0, 8, 0, 7, 0, 8, 0, 0, 8, 0, 7, 0, 8, 0, 7, 0, 1], 
            [1, 0, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 7, 0, 1], 
            [1, 0, 7, 7, 7, 0, 7, 7, 7, 0, 0, 7, 7, 7, 0, 7, 7, 7, 0, 1], 
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 30, 0, 1], 
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ];
        
        return ['layout' => $base_level, 'entry_point' => [10, 18]];
    }
    
    // Check if we've already visited this level
    $levelKey = $coords[0] . '_' . $coords[1];
    
    // Ensure visited_levels is an associative array
    if (!isset($_SESSION['game_state']['visited_levels']) || !is_array($_SESSION['game_state']['visited_levels'])) {
        $_SESSION['game_state']['visited_levels'] = [];
    }
    
    if (isset($_SESSION['game_state']['visited_levels'][$levelKey])) {
        return $_SESSION['game_state']['visited_levels'][$levelKey];
    }
    
    // Generate a procedural level
    $level = generate_level($entry_direction, $coords);
    
    // Cache for future visits
    $_SESSION['game_state']['visited_levels'][$levelKey] = $level;
    
    return $level;
}
?> 