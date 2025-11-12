<?php
/**
 * Penguin Hacker RPG - Level Generator
 * 
 * This file handles procedural level generation for the game.
 * It creates randomized levels based on coordinates and templates.
 */

// Level templates that can be combined and modified
$level_templates = [
    // Basic server room
    'server_room' => [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 7, 7, 7, 0, 7, 7, 7, 0, 0, 7, 7, 7, 0, 7, 7, 7, 0, 1], 
        [1, 0, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 7, 0, 1], 
        [1, 0, 7, 0, 8, 0, 7, 0, 8, 0, 0, 8, 0, 7, 0, 8, 0, 7, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
        [1, 0, 7, 0, 7, 0, 9, 0, 7, 0, 0, 7, 0, 9, 0, 7, 0, 7, 0, 1], 
        [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
        [1, 0, 7, 0, 7, 0, 9, 0, 7, 0, 0, 7, 0, 9, 0, 7, 0, 7, 0, 1], 
        [1, 0, 7, 0, 7, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 7, 0, 7, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 7, 0, 8, 0, 7, 0, 8, 0, 0, 8, 0, 7, 0, 8, 0, 7, 0, 1], 
        [1, 0, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 7, 0, 1], 
        [1, 0, 7, 7, 7, 0, 7, 7, 7, 0, 0, 7, 7, 7, 0, 7, 7, 7, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    
    // Office area
    'office' => [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 11, 0, 8, 0, 11, 0, 8, 0, 0, 8, 0, 11, 0, 8, 0, 11, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    
    // Network hub
    'network_hub' => [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 9, 0, 9, 0, 9, 0, 1, 0, 0, 1, 0, 9, 0, 9, 0, 9, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 9, 0, 9, 0, 9, 0, 1, 0, 0, 1, 0, 9, 0, 9, 0, 9, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 9, 0, 9, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 9, 0, 9, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 9, 0, 9, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 9, 0, 9, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 9, 0, 9, 0, 9, 0, 1, 0, 0, 1, 0, 9, 0, 9, 0, 9, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 9, 0, 9, 0, 9, 0, 1, 0, 0, 1, 0, 9, 0, 9, 0, 9, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    
    // Security room
    'security_room' => [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 0, 7, 7, 7, 0, 0, 7, 7, 7, 0, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 1, 0, 7, 0, 0, 0, 0, 0, 0, 7, 0, 1, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 0, 7, 0, 8, 0, 0, 8, 0, 7, 0, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 8, 0, 1], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
        [1, 0, 8, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 0, 7, 0, 8, 0, 0, 8, 0, 7, 0, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 1, 0, 7, 0, 0, 0, 0, 0, 0, 7, 0, 1, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 0, 7, 7, 7, 0, 0, 7, 7, 7, 0, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], 
        [1, 0, 8, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 8, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    
    // Executive Office
    'executive_office' => [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 11, 11, 11, 0, 0, 0, 0, 8, 8, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], 
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], 
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], 
        [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
];

/**
 * Get a level template based on coordinates
 * 
 * @param array $coords Level coordinates [x, y]
 * @return array The template to use
 */
function get_level_template($coords) {
    global $level_templates;
    
    // Use coordinates to deterministically select a template
    $template_names = array_keys($level_templates);
    $template_index = (abs($coords[0] * 7) + abs($coords[1] * 13)) % count($template_names);
    $template_name = $template_names[$template_index];
    
    return $level_templates[$template_name];
}

/**
 * Generate a new level
 * 
 * @param string $entry_direction Direction player is entering from
 * @param array $coords Level coordinates [x, y]
 * @return array Generated level data
 */
function generate_level($entry_direction, $coords) {
    // Get base template
    $level = get_level_template($coords);
    
    // Add exits based on entry direction
    add_exits($level, $entry_direction, $coords);
    
    // Add game elements
    $difficulty = abs($coords[0]) + abs($coords[1]);
    add_game_elements($level, $difficulty);
    
    // Calculate entry point
    $entry_point = get_entry_point($level, $entry_direction);
    
    return [
        'layout' => $level,
        'entry_point' => $entry_point,
        'difficulty' => $difficulty
    ];
}

/**
 * Add exits to the level
 * 
 * @param array &$level Level layout
 * @param string $entry_direction Direction player is entering from
 * @param array $coords Level coordinates
 */
function add_exits(&$level, $entry_direction, $coords) {
    // Set exit in the opposite direction of entry
    switch ($entry_direction) {
        case 'top':
            // Already has exit at bottom
            $level[19][9] = 3;
            $level[19][10] = 3;
            break;
        case 'bottom':
            // Already has exit at top
            $level[0][9] = 4;
            $level[0][10] = 4;
            break;
        case 'left':
            // Already has exit at right
            $level[9][19] = 5;
            $level[10][19] = 5;
            break;
        case 'right':
            // Already has exit at left
            $level[9][0] = 6;
            $level[10][0] = 6;
            break;
    }
    
    // Randomly add additional exits (except for the direction we came from)
    $directions = ['top', 'bottom', 'left', 'right'];
    
    // Use coordinates to make the randomness deterministic
    $seed = abs($coords[0] * 1000 + $coords[1]);
    mt_srand($seed);
    
    foreach ($directions as $dir) {
        if ($dir != $entry_direction && mt_rand(0, 100) < 70) {
            switch ($dir) {
                case 'top':
                    if ($level[0][9] != 4) {
                        $level[0][9] = 4;
                        $level[0][10] = 4;
                    }
                    break;
                case 'bottom':
                    if ($level[19][9] != 3) {
                        $level[19][9] = 3;
                        $level[19][10] = 3;
                    }
                    break;
                case 'left':
                    if ($level[9][0] != 6) {
                        $level[9][0] = 6;
                        $level[10][0] = 6;
                    }
                    break;
                case 'right':
                    if ($level[9][19] != 5) {
                        $level[9][19] = 5;
                        $level[10][19] = 5;
                    }
                    break;
            }
        }
    }
}

/**
 * Add game elements to the level
 * 
 * @param array &$level Level layout
 * @param int $difficulty Level difficulty
 */
function add_game_elements(&$level, $difficulty) {
    // Add NPCs (more with increasing difficulty)
    $npc_count = 1 + floor($difficulty / 2);
    $npc_count = min($npc_count, 5); // Cap at 5 NPCs
    
    // Add puzzles (more with increasing difficulty)
    $puzzle_count = 1 + floor($difficulty / 3);
    $puzzle_count = min($puzzle_count, 3); // Cap at 3 puzzles
    
    $empty_spaces = [];
    
    // Find all empty spaces
    for ($z = 0; $z < 20; $z++) {
        for ($x = 0; $x < 20; $x++) {
            if ($level[$z][$x] == 0) {
                // Avoid placing near exits
                $near_exit = false;
                for ($dz = -1; $dz <= 1; $dz++) {
                    for ($dx = -1; $dx <= 1; $dx++) {
                        $check_z = $z + $dz;
                        $check_x = $x + $dx;
                        if ($check_z >= 0 && $check_z < 20 && $check_x >= 0 && $check_x < 20) {
                            $tile = $level[$check_z][$check_x];
                            if ($tile >= 2 && $tile <= 6) { // Exit/entrance
                                $near_exit = true;
                                break 2;
                            }
                        }
                    }
                }
                
                if (!$near_exit) {
                    $empty_spaces[] = [$x, $z];
                }
            }
        }
    }
    
    // Shuffle empty spaces
    shuffle($empty_spaces);
    
    // Place NPCs
    for ($i = 0; $i < $npc_count && $i < count($empty_spaces); $i++) {
        $pos = $empty_spaces[$i];
        $level[$pos[1]][$pos[0]] = 13; // NPC
    }
    
    // Place puzzles
    for ($i = $npc_count; $i < $npc_count + $puzzle_count && $i < count($empty_spaces); $i++) {
        $pos = $empty_spaces[$i];
        $level[$pos[1]][$pos[0]] = 14; // Puzzle
    }
}

/**
 * Calculate entry point coordinates based on the entry direction
 * 
 * @param array $level Level layout
 * @param string $entry_direction Direction player is entering from
 * @return array [x, y] coordinates
 */
function get_entry_point($level, $entry_direction) {
    switch ($entry_direction) {
        case 'top':
            return [10, 1]; // Just inside the top exit
        case 'bottom':
            return [10, 18]; // Just inside the bottom exit
        case 'left':
            return [1, 10]; // Just inside the left exit
        case 'right':
            return [18, 10]; // Just inside the right exit
        default:
            return [10, 10]; // Center of the map as fallback
    }
}
