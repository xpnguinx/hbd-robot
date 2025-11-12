<?php
/**
 * Penguin Hacker RPG - Puzzle Generator
 * 
 * This file handles puzzle generation and validation for various
 * programming and hacking challenges in the game.
 */

// Puzzle libraries - collections of different types of puzzles
$terminal_puzzles = [
    [
        'description' => 'Access the hidden directory and list its contents. The directory is called ".secret" and is in the current folder.',
        'solution' => 'ls -la .secret',
        'success_message' => 'ACCESS GRANTED. Directory contents revealed: [crypto_keys, user_data.bin, backdoor.sh]',
        'failure_message' => 'ACCESS DENIED. Invalid command syntax.'
    ],
    [
        'description' => 'Find all files containing the word "password" in the current directory and subdirectories.',
        'solution' => 'grep -r "password" .',
        'success_message' => 'SEARCH COMPLETE. Found 3 occurrences in [config.ini, ./users/admin.txt, ./system/auth.log]',
        'failure_message' => 'SEARCH FAILED. Invalid search parameters.'
    ],
    [
        'description' => 'Change permissions on "secure.sh" to make it executable for the owner only.',
        'solution' => 'chmod 700 secure.sh',
        'success_message' => 'PERMISSIONS UPDATED. File "secure.sh" is now executable.',
        'failure_message' => 'PERMISSION DENIED. Invalid permission syntax.'
    ],
    [
        'description' => 'Create a compressed archive of the "data" folder.',
        'solution' => 'tar -czf data.tar.gz data',
        'success_message' => 'COMPRESSION COMPLETE. Archive "data.tar.gz" created successfully.',
        'failure_message' => 'COMPRESSION FAILED. Invalid command parameters.'
    ],
    [
        'description' => 'Connect to the remote server at 192.168.1.10 using SSH as user "admin".',
        'solution' => 'ssh admin@192.168.1.10',
        'success_message' => 'CONNECTION ESTABLISHED. Welcome to CoreSec Server.',
        'failure_message' => 'CONNECTION FAILED. Invalid SSH command.'
    ],
    [
        'description' => 'Display the last 10 lines of the log file "system.log".',
        'solution' => 'tail system.log',
        'success_message' => 'LOG ENTRIES RETRIEVED. Detected suspicious access patterns.',
        'failure_message' => 'RETRIEVAL FAILED. Invalid command syntax.'
    ],
    [
        'description' => 'Find all processes running as root and save them to "root_processes.txt".',
        'solution' => 'ps -u root > root_processes.txt',
        'success_message' => 'PROCESS LIST SAVED. 47 processes found running as root.',
        'failure_message' => 'OPERATION FAILED. Incorrect command or permissions issue.'
    ]
];

$regex_puzzles = [
    [
        'description' => 'Create a regex pattern that matches valid IPv4 addresses (e.g., 192.168.1.1).',
        'test_cases' => [
            ['string' => '192.168.1.1', 'should_match' => true],
            ['string' => '255.255.255.255', 'should_match' => true],
            ['string' => '0.0.0.0', 'should_match' => true],
            ['string' => '256.1.1.1', 'should_match' => false],
            ['string' => '192.168.1', 'should_match' => false],
            ['string' => 'a.b.c.d', 'should_match' => false]
        ],
        'example_solution' => '^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
        'solution' => 'REGEX_CHECK',
        'success_message' => 'PATTERN VALID. Firewall access granted.',
        'failure_message' => 'PATTERN INVALID. Your regex does not match all test cases.'
    ],
    [
        'description' => 'Create a regex pattern that matches valid hexadecimal color codes (e.g., #FFF or #123ABC).',
        'test_cases' => [
            ['string' => '#FFF', 'should_match' => true],
            ['string' => '#123ABC', 'should_match' => true],
            ['string' => '#4a5B6c', 'should_match' => true],
            ['string' => '#GGG', 'should_match' => false],
            ['string' => 'FFF', 'should_match' => false],
            ['string' => '#1234567', 'should_match' => false]
        ],
        'example_solution' => '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$',
        'solution' => 'REGEX_CHECK',
        'success_message' => 'COLOR CODES ACCEPTED. Visual interface unlocked.',
        'failure_message' => 'INVALID COLOR CODE PATTERN. Access denied.'
    ],
    [
        'description' => 'Create a regex pattern that matches all valid email addresses.',
        'test_cases' => [
            ['string' => 'user@example.com', 'should_match' => true],
            ['string' => 'user.name+tag@example.co.uk', 'should_match' => true],
            ['string' => '123@subdomain.example.com', 'should_match' => true],
            ['string' => 'user@domain', 'should_match' => false],
            ['string' => '@example.com', 'should_match' => false],
            ['string' => 'user@.com', 'should_match' => false]
        ],
        'example_solution' => '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'solution' => 'REGEX_CHECK',
        'success_message' => 'EMAIL PATTERN VALIDATED. Phishing filter enabled.',
        'failure_message' => 'PATTERN REJECTED. Does not correctly filter email formats.'
    ]
];

$encryption_puzzles = [
    [
        'description' => 'Decrypt this Caesar cipher (shift by 3): "DWWDFN DW GDZQ"',
        'solution' => 'ATTACK AT DAWN',
        'success_message' => 'DECRYPTION SUCCESSFUL. Mission details acquired.',
        'failure_message' => 'DECRYPTION FAILED. Try a different key or approach.'
    ],
    [
        'description' => 'Decrypt this message with key="PENGUIN": "THQJNRBWJLFRKVGJBHTLXWL"',
        'hint' => 'This is a Vigenère cipher. Each letter is shifted by the corresponding letter in the key.',
        'solution' => 'SECRETSERVERLOCATION',
        'success_message' => 'DECRYPTION SUCCESSFUL. Server location acquired.',
        'failure_message' => 'DECRYPTION FAILED. Incorrect decoding algorithm or key.'
    ],
    [
        'description' => 'Convert this binary to ASCII: "01001000 01000001 01000011 01001011 01000101 01000100"',
        'solution' => 'HACKED',
        'success_message' => 'CONVERSION COMPLETE. System access granted.',
        'failure_message' => 'CONVERSION FAILED. Incorrect binary interpretation.'
    ],
    [
        'description' => 'Decrypt this hex-encoded message: "496365626572672050726f746f636f6c"',
        'solution' => 'Iceberg Protocol',
        'success_message' => 'HEX DECODED. Protocol name confirmed.',
        'failure_message' => 'DECODING ERROR. Verify your hex conversion method.'
    ]
];

$logic_puzzles = [
    [
        'description' => 'Complete the logical sequence: 2, 6, 12, 20, ?',
        'hint' => 'Look at the differences between consecutive numbers.',
        'solution' => '30',
        'success_message' => 'SEQUENCE VERIFIED. Access protocol accepted.',
        'failure_message' => 'SEQUENCE ERROR. Logical pattern not recognized.'
    ],
    [
        'description' => 'If A=1, B=2, C=3, etc., what 5-letter word equals 54? It\'s something a hacker might do.',
        'hint' => 'Sum the values of each letter in the word.',
        'solution' => 'CRACK',
        'success_message' => 'WORD VERIFIED. Semantic access granted.',
        'failure_message' => 'WORD INCORRECT. Semantic pattern not recognized.'
    ],
    [
        'description' => 'Resolve this Boolean expression: (A OR B) AND (NOT A OR C) AND (NOT B OR NOT C), where A=true, B=true, C=?',
        'hint' => 'Try both true and false for C and see which satisfies all conditions.',
        'solution' => 'false',
        'success_message' => 'BOOLEAN LOGIC VERIFIED. Firewall exception created.',
        'failure_message' => 'BOOLEAN ERROR. Logic gate sequence invalid.'
    ],
    [
        'description' => 'What is the next number in this pattern: 1, 3, 6, 10, 15, ?',
        'hint' => 'These are triangular numbers. Think about how each number relates to its position in the sequence.',
        'solution' => '21',
        'success_message' => 'TRIANGULAR SEQUENCE CONFIRMED. Security node unlocked.',
        'failure_message' => 'SEQUENCE MISMATCH. Mathematical pattern violated.'
    ]
];

/**
 * Generate a puzzle based on type and ID
 * 
 * @param string $type Puzzle type (terminal, regex, encryption, logic)
 * @param string $id Unique puzzle ID
 * @return array Puzzle data
 */
function generate_puzzle($type, $id) {
    global $terminal_puzzles, $regex_puzzles, $encryption_puzzles, $logic_puzzles;
    
    // Convert ID to a numeric hash for deterministic selection
    $hash = crc32($id);
    
    switch ($type) {
        case 'terminal':
            $index = $hash % count($terminal_puzzles);
            return $terminal_puzzles[$index];
            
        case 'regex':
            $index = $hash % count($regex_puzzles);
            return $regex_puzzles[$index];
            
        case 'encryption':
            $index = $hash % count($encryption_puzzles);
            return $encryption_puzzles[$index];
            
        case 'logic':
            $index = $hash % count($logic_puzzles);
            return $logic_puzzles[$index];
            
        default:
            // Default to terminal puzzle
            $index = $hash % count($terminal_puzzles);
            return $terminal_puzzles[$index];
    }
}

/**
 * Validate a solution for a specific puzzle
 * 
 * @param string $type Puzzle type
 * @param string $id Puzzle ID
 * @param string $answer User's answer
 * @return array Result with success/failure status and message
 */
function validate_puzzle_solution($type, $id, $answer) {
    // Generate the puzzle data
    $puzzle = generate_puzzle($type, $id);
    
    // Validate based on puzzle type
    $is_correct = false;
    
    switch ($type) {
        case 'terminal':
            // For terminal commands, we check for exact match or variations
            $answer = trim(strtolower($answer));
            $solution = trim(strtolower($puzzle['solution']));
            
            // Check for exact match
            if ($answer === $solution) {
                $is_correct = true;
            } 
            // Check for common variations
            else if ($type === 'terminal') {
                // Handle ls command variations
                if (strpos($solution, 'ls') === 0) {
                    $is_correct = check_ls_command_variation($answer, $solution);
                }
                // Handle grep command variations
                else if (strpos($solution, 'grep') === 0) {
                    $is_correct = check_grep_command_variation($answer, $solution);
                }
                // Handle other command variations...
            }
            break;
            
        case 'regex':
            // For regex puzzles, we test against all test cases
            $is_correct = validate_regex_pattern($answer, $puzzle['test_cases']);
            break;
            
        case 'encryption':
            // For encryption puzzles, check for exact match (case insensitive)
            $is_correct = (strtoupper(trim($answer)) === strtoupper(trim($puzzle['solution'])));
            break;
            
        case 'logic':
            // For logic puzzles, check for exact match
            $is_correct = (strtolower(trim($answer)) === strtolower(trim($puzzle['solution'])));
            break;
    }
    
    // Return result
    return [
        'correct' => $is_correct,
        'message' => $is_correct ? $puzzle['success_message'] : $puzzle['failure_message']
    ];
}

/**
 * Check ls command variations
 * 
 * @param string $answer User's answer
 * @param string $solution Expected solution
 * @return bool Whether the answer is valid
 */
function check_ls_command_variation($answer, $solution) {
    // Check for ls command variations (order of flags doesn't matter)
    if (strpos($solution, 'ls -la') === 0) {
        // Accept ls -la, ls -al, ls -l -a, etc.
        $pattern = '/^ls\s+(-[al]+|\s*-[al]\s+-[al])/';
        if (preg_match($pattern, $answer)) {
            // Extract the path part from both
            $solution_parts = explode(' ', $solution, 3);
            $answer_parts = explode(' ', $answer, 3);
            
            if (count($solution_parts) >= 3 && count($answer_parts) >= 3) {
                return trim($solution_parts[2]) === trim($answer_parts[2]);
            } else if (count($solution_parts) == 2 && count($answer_parts) == 2) {
                return true; // No path specified in either
            }
        }
    }
    
    return false;
}

/**
 * Check grep command variations
 * 
 * @param string $answer User's answer
 * @param string $solution Expected solution
 * @return bool Whether the answer is valid
 */
function check_grep_command_variation($answer, $solution) {
    // Handle grep command variations
    if (strpos($solution, 'grep -r') === 0) {
        // Accept grep -r, grep --recursive, etc.
        if (strpos($answer, 'grep -r') === 0 || strpos($answer, 'grep --recursive') === 0) {
            // Extract the search pattern and path
            preg_match('/grep\s+(?:-r|--recursive)\s+"([^"]+)"\s+(.+)/', $solution, $solution_matches);
            preg_match('/grep\s+(?:-r|--recursive)\s+"([^"]+)"\s+(.+)/', $answer, $answer_matches);
            
            if (count($solution_matches) >= 3 && count($answer_matches) >= 3) {
                return $solution_matches[1] === $answer_matches[1] && $solution_matches[2] === $answer_matches[2];
            }
        }
    }
    
    return false;
}

/**
 * Validate a regex pattern against test cases
 * 
 * @param string $pattern User's regex pattern
 * @param array $test_cases Test cases to validate against
 * @return bool Whether the pattern passes all test cases
 */
function validate_regex_pattern($pattern, $test_cases) {
    try {
        // Check if pattern is valid regex
        @preg_match('/' . $pattern . '/', '');
        if (preg_last_error() !== PREG_NO_ERROR) {
            return false;
        }
        
        // Test against all test cases
        foreach ($test_cases as $test) {
            $match_result = preg_match('/' . $pattern . '/', $test['string']);
            
            if (($test['should_match'] && $match_result !== 1) || 
                (!$test['should_match'] && $match_result === 1)) {
                return false;
            }
        }
        
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Generate a reward for solving a puzzle
 * 
 * @param string $puzzle_type Type of puzzle solved
 * @return array Reward data
 */
function generate_reward($puzzle_type) {
    switch ($puzzle_type) {
        case 'terminal':
            return [
                'type' => 'skill',
                'skill' => 'hacking',
                'amount' => 1,
                'message' => 'Hacking skill increased by 1!'
            ];
            
        case 'regex':
            return [
                'type' => 'key',
                'key_id' => 'security_' . mt_rand(1000, 9999),
                'message' => 'Security access key acquired!'
            ];
            
        case 'encryption':
            return [
                'type' => 'skill',
                'skill' => 'cryptography',
                'amount' => 1,
                'message' => 'Cryptography skill increased by 1!'
            ];
            
        case 'logic':
            return [
                'type' => 'skill',
                'skill' => 'networking',
                'amount' => 1,
                'message' => 'Networking skill increased by 1!'
            ];
            
        default:
            return [
                'type' => 'key',
                'key_id' => 'master_' . mt_rand(1000, 9999),
                'message' => 'Master key acquired!'
            ];
    }
}
