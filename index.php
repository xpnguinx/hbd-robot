<?php
/**
 * Penguin Hacker RPG - Main Application
 * 
 * A cyberpunk-themed browser-based 3D hacking game where you play as
 * a hooded penguin infiltrating a high-security corporate network.
 */

// Include Groq API setup
require_once 'groq_config.php';

 // Start session for game state persistence
session_start();

// Include required files
require_once 'npc_handler.php';
require_once 'puzzle_generator.php';
require_once 'level_generator.php';

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

// Handle AJAX requests
if (isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    switch ($_POST['action']) {
        case 'generate_level':
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
            
        case 'npc_conversation':
            $npc_type = isset($_POST['npc_type']) ? $_POST['npc_type'] : 'unknown';
            $message = isset($_POST['message']) ? $_POST['message'] : '';
            $npc_id = isset($_POST['npc_id']) ? $_POST['npc_id'] : '0';
            
            // Sanitize inputs
            $npc_type = htmlspecialchars($npc_type);
            $npc_id = htmlspecialchars($npc_id);
            
            echo json_encode(get_npc_response($npc_type, $message, $npc_id));
            exit;
            
        case 'check_puzzle':
            $puzzle_type = isset($_POST['puzzle_type']) ? $_POST['puzzle_type'] : '';
            $puzzle_id = isset($_POST['puzzle_id']) ? $_POST['puzzle_id'] : '';
            $answer = isset($_POST['answer']) ? $_POST['answer'] : '';
            
            // Sanitize inputs
            $puzzle_type = htmlspecialchars($puzzle_type);
            $puzzle_id = htmlspecialchars($puzzle_id);
            
            echo json_encode(checkPuzzleSolution($puzzle_type, $puzzle_id, $answer));
            exit;
            
        case 'save_game':
            if (isset($_POST['game_state'])) {
                $game_state = json_decode($_POST['game_state'], true);
                
                // Validate game state
                if (is_array($game_state) && isset($game_state['current_level']) && 
                    isset($game_state['player_position']) && isset($game_state['player_inventory'])) {
                    $_SESSION['game_state'] = $game_state;
                    echo json_encode(['status' => 'success']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Invalid game state']);
                }
            } else {
                echo json_encode(['status' => 'error', 'message' => 'No game state provided']);
            }
            exit;
            
        default:
            echo json_encode(['error' => 'Unknown action']);
            exit;
    }
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
            // 7=server, 8=computer, 9=router, 10=satellite, 11=desk, 12=chair, 13=npc, 14=puzzle
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
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1], 
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

/**
 * Check if the provided solution solves the puzzle
 * 
 * @param string $puzzle_type Type of puzzle
 * @param string $puzzle_id Unique puzzle ID
 * @param string $answer User's answer
 * @return array Result with success/failure status and reward
 */
function checkPuzzleSolution($puzzle_type, $puzzle_id, $answer) {
    // Get puzzle from session if it exists
    if (!isset($_SESSION['game_state']['puzzles'][$puzzle_id])) {
        // Generate a new puzzle
        $puzzle = generate_puzzle($puzzle_type, $puzzle_id);
        $_SESSION['game_state']['puzzles'][$puzzle_id] = $puzzle;
    } else {
        $puzzle = $_SESSION['game_state']['puzzles'][$puzzle_id];
    }
    
    // Check if puzzle was already completed
    if (in_array($puzzle_id, $_SESSION['game_state']['completed_puzzles'])) {
        return [
            'correct' => true,
            'message' => 'You have already completed this puzzle.',
            'reward' => null
        ];
    }
    
    // Check solution
    $is_correct = false;
    $reward = null;
    
    switch ($puzzle_type) {
        case 'terminal':
            $is_correct = trim(strtolower($answer)) === trim(strtolower($puzzle['solution']));
            break;
            
        case 'regex':
            // Try to match the test strings with the provided regex
            try {
                $matches = true;
                foreach ($puzzle['test_cases'] as $test) {
                    $should_match = $test['should_match'];
                    $test_str = $test['string'];
                    
                    $match_result = @preg_match('/' . $answer . '/', $test_str);
                    
                    // Check if there was an error in the regex
                    if ($match_result === false) {
                        $matches = false;
                        break;
                    }
                    
                    if (($should_match && $match_result !== 1) || 
                        (!$should_match && $match_result === 1)) {
                        $matches = false;
                        break;
                    }
                }
                $is_correct = $matches;
            } catch (Exception $e) {
                $is_correct = false;
            }
            break;
            
        case 'encryption':
            $is_correct = trim($answer) === trim($puzzle['solution']);
            break;
            
        case 'logic':
            // Logic puzzles have specific answers
            $is_correct = trim(strtolower($answer)) === trim(strtolower($puzzle['solution']));
            break;
            
        default:
            $is_correct = false;
    }
    
    // If correct, mark as completed and give reward
    if ($is_correct) {
        $_SESSION['game_state']['completed_puzzles'][] = $puzzle_id;
        
        // Generate reward (access key, skill improvement, etc.)
        $reward = generate_reward($puzzle_type);
        
        // Add reward to player's inventory
        if ($reward['type'] === 'key') {
            $_SESSION['game_state']['player_inventory']['access_keys'][] = $reward['key_id'];
        } else if ($reward['type'] === 'skill') {
            $_SESSION['game_state']['player_inventory']['skill_levels'][$reward['skill']] += $reward['amount'];
        }
    }
    
    return [
        'correct' => $is_correct,
        'reward' => $reward,
        'message' => $is_correct ? $puzzle['success_message'] : $puzzle['failure_message']
    ];
}

/**
 * Get debugging information for client-side error handling
 * Only enabled in development mode
 */
function getDebugInfo() {
    // Set to true for development, false for production
    $debug_mode = false;
    
    if ($debug_mode) {
        return [
            'php_version' => PHP_VERSION,
            'session_status' => session_status(),
            'memory_usage' => memory_get_usage(true),
            'errors' => error_get_last()
        ];
    }
    
    return null;
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Penguin Hacker RPG</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
    <div id="loading">
        <div>INITIALIZING SYSTEM...</div>
        <div id="loadingBar"><div id="loadingProgress"></div></div>
        <div id="loadingScreenContainer" style="display: flex; justify-content: center; align-items: center; margin-top: 20px; height: 300px;">
            <div id="loadingScene" style="width: 300px; height: 300px;"></div>
        </div>
    </div>
    
    <div id="gameContainer">
        <div id="dialogueBox"></div>
        <div id="gameInfo">SERVER ROOM ALPHA :: SEC_LEVEL: 4</div>
        <div id="controls">WASD/Arrows: Move | Space: Interact | Mouse: Click to Move | E: Open Terminal | Scroll: Zoom | Right-Click + Drag: Rotate Camera</div>
        
        <!-- Chat Interface -->
        <div id="chatInterface">
            <div id="chatHeader">
                <span id="currentNPC">TERMINAL</span>
                <button id="closeChatBtn">X</button>
            </div>
            <div id="chatHistory"></div>
            <div id="inputContainer">
                <span class="prompt">&gt;</span>
                <input id="chatInput" type="text" placeholder="Type command or message..." />
                <button id="sendBtn">SEND</button>
            </div>
        </div>
        
        <!-- Puzzle Interface -->
        <div id="puzzleInterface">
            <div id="puzzleHeader">
                <span id="puzzleTitle">SECURITY CHALLENGE</span>
                <button id="closePuzzleBtn">X</button>
            </div>
            <div id="puzzleDescription"></div>
            <div id="puzzleContent"></div>
            <div id="puzzleInputContainer">
                <input id="puzzleInput" type="text" placeholder="Enter solution..." />
                <button id="submitPuzzleBtn">SUBMIT</button>
            </div>
            <div id="puzzleMessage"></div>
        </div>
        
        <!-- Inventory Interface -->
        <div id="inventoryIcon">INV</div>
        <div id="inventoryPanel">
            <div id="inventoryHeader">INVENTORY</div>
            <div id="inventoryContent">
                <div id="keysList">
                    <h3>ACCESS KEYS</h3>
                    <ul id="keysContainer"></ul>
                </div>
                <div id="skillsList">
                    <h3>SKILL LEVELS</h3>
                    <div id="skillsContainer"></div>
                </div>
            </div>
        </div>
        
        <!-- Debug Panel (hidden in production) -->
        <div id="debugPanel" style="display: none;">
            <div id="debugHeader">DEBUG INFO</div>
            <div id="debugContent"></div>
        </div>
        
        <!-- Mobile Toggle Button -->
        <div class="mobile-toggle" id="mobileToggle"></div>
        
        <!-- Camera Controls -->
        <div class="camera-controls" id="cameraControls">
            <button id="rotateCameraLeft">↺</button>
            <button id="resetCamera">R</button>
            <button id="rotateCameraRight">↻</button>
        </div>
        
        <!-- Mobile Controls -->
        <div class="mobile-controls" id="mobileControls">
            <div class="controls-container">
                <div class="d-pad">
                    <button class="up-btn" id="upBtn">↑</button>
                    <button class="left-btn" id="leftBtn">←</button>
                    <button class="center-btn" id="centerBtn">•</button>
                    <button class="right-btn" id="rightBtn">→</button>
                    <button class="down-btn" id="downBtn">↓</button>
                </div>
                <div class="action-buttons">
                    <button id="interactBtn">SPACE</button>
                    <button id="terminalBtn">E</button>
                    <button id="inventoryBtn">INV</button>
                    <button id="zoomBtn">ZOOM</button>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.js"></script>
    <script src="robot_models.js"></script>
    <script src="npc_movement.js"></script>
    <script src="script.js"></script>
    <script src="multiplayer.js"></script>
    
    <!-- Initialize debug info if needed -->
    <script>
        // Pass debug info from PHP if available
        const debugInfo = <?php echo json_encode(getDebugInfo()); ?>;
        if (debugInfo) {
            document.getElementById('debugPanel').style.display = 'block';
            document.getElementById('debugContent').textContent = JSON.stringify(debugInfo, null, 2);
        }
    </script>
</body>
</html>