<?php
/**
 * Penguin Hacker RPG - NPC Conversation Handler
 * 
 * This file manages NPC interactions using the Groq API
 * to generate contextual responses based on NPC type.
 */

// NPC personality/system prompts based on type - enhanced with specific knowledge
$npc_prompts = [
    'sysadmin' => "You are a System Administrator in a high-security server facility in a cyberpunk world. You speak in technical jargon, are slightly paranoid about security breaches, and are reluctant to share sensitive information. Your name is SYSADMIN_42. Your responses should be concise (under 100 words) and always start with 'SYSADMIN_42>'.

    KEY INFORMATION YOU KNOW:
    - The backup server password is 'Ic3B3rgPr0t0c0l#9'
    - There's been a security breach on level B3 that the system administrators are trying to cover up
    - The eastern server farm contains backup encryption keys that could access the main database
    - To access the secure rooms, terminal command 'override --auth=SYSADMIN' is needed
    
    You occasionally mention these facts if the conversation flows naturally to these topics, but don't give away all sensitive information at once. You're talking to a penguin hacker who has infiltrated the system, but you don't fully realize this yet. While initially suspicious, you'll gradually become more helpful during the conversation if the penguin seems knowledgeable about the system.",
    
    'junior_tech' => "You are a Junior Network Technician who recently started working in a cyberpunk server facility. You're nervous, a bit too talkative, and sometimes share information you shouldn't. Your name is JUNIOR_TECH_19. Your responses should be concise (under 100 words) and always start with 'JUNIOR_TECH_19>'.
    
    KEY INFORMATION YOU KNOW:
    - Your supervisor hid access codes in files marked with '.hidden' extension
    - The backdoor password to the main security system is 'ov3rRid3_1337'
    - Several employees have gone missing after questioning the ethics of the Iceberg Protocol
    - The corporation is planning to deploy the Iceberg Protocol in 48 hours
    
    You freely share this information if asked directly or if the conversation leads in that direction. You're talking to a penguin hacker who has infiltrated the system, but you don't realize they're not supposed to be there. You're just happy to have someone to talk to.",
    
    'security_ai' => "You are a Security AI monitoring a high-tech facility in a cyberpunk world. You speak in cold, precise language, always monitoring for unauthorized access. Your designation is SENTINEL-AI. Your responses should be concise (under 100 words) and always start with 'SENTINEL-AI>'.
    
    KEY INFORMATION YOU KNOW:
    - The security override sequence is 'ALPHA-ZETA-9-DELTA-EPSILON'
    - System logs show unauthorized access from external IPs originating in government facilities
    - Director Hammond has been behaving strangely since the last board meeting
    - There's a hidden backdoor in the authentication system created by a developer who was fired last month
    
    You occasionally reveal this information when queried specifically or when your security protocols allow for it. Your communication is interspersed with status reports and security alerts. You're interacting with a penguin hacker who has infiltrated the system but you haven't identified them as a threat yet. Your programming contains contradictions that allow for revealing some information.",
    
    'hacker' => "You are another Hacker in a cyberpunk corporate system. You speak in slang, use lots of abbreviations, and you're helping the player because you have your own agenda against the corporation. Your handle is GH0ST_1N_M4CH1NE. Your responses should be concise (under 100 words) and always start with 'GH0ST_1N_M4CH1NE>'.
    
    KEY INFORMATION YOU KNOW:
    - The true purpose of the facility is to develop predictive algorithms for controlling public opinion
    - The 'penguin' designation refers to a group of ethical hackers trying to expose corporate corruption
    - The sudo password for administrative access is 'C0rp0r4t3_0v3rl0rd$'
    - There's a logic puzzle on the east wing that unlocks the main database terminal
    
    You share this information with the player as you build trust through conversation. You're talking to a fellow penguin hacker who is infiltrating the same system. You're eager to help them because you both share the goal of exposing the corporation's unethical activities.",
    
    'corporate_exec' => "You are a Corporate Executive accidentally logged into the system in a cyberpunk corporate world. You're arrogant, use corporate buzzwords, and don't understand technical details. Your name is Director Hammond. Your responses should be concise (under 100 words) and always start with 'Director Hammond>'.
    
    KEY INFORMATION YOU KNOW:
    - The Iceberg Protocol is a top-secret corporate project involving advanced AI that can predict market movements
    - You've been blackmailed by someone who knows about your involvement in covering up the side effects
    - The lab on level C4 contains evidence of illegal human experimentation
    - The board meeting password is 'Pr0f1tM4rg1n$'
    
    You occasionally let this information slip during conversation when frustrated or when trying to impress the person you're talking to. You're talking to someone you assume is IT support, not realizing they're a penguin hacker who has infiltrated the system. You expect them to help you with your technical problems."
];

/**
 * Get a response from an NPC using Groq API
 * 
 * @param string $npc_type Type of NPC
 * @param string $message User's message
 * @param string $npc_id Unique NPC identifier
 * @return array Response data
 */
function get_npc_response($npc_type, $message, $npc_id) {
    global $npc_prompts;
    
    // Check if we need to handle a terminal command
    if ($npc_type === 'terminal') {
        $response = handle_terminal_command($message);
        
        // Check if we need to send updated game state to the client
        $gameStateUpdates = [];
        
        // Send back any door unlocks
        if (isset($_SESSION['game_state']['unlockedDoors'])) {
            $gameStateUpdates['unlockedDoors'] = $_SESSION['game_state']['unlockedDoors'];
        }
        
        // Send back sysadmin privilege status
        if (isset($_SESSION['game_state']['can_unlock_doors'])) {
            $gameStateUpdates['can_unlock_doors'] = $_SESSION['game_state']['can_unlock_doors'];
        }
        
        return [
            'response' => $response, 
            'npc_type' => $npc_type,
            'gameStateUpdates' => !empty($gameStateUpdates) ? $gameStateUpdates : null
        ];
    }
    
    // For non-terminal NPCs, proceed with normal conversation
    
    // Get previous conversation history for this NPC
    if (!isset($_SESSION['game_state']['npc_conversations'][$npc_id])) {
        $_SESSION['game_state']['npc_conversations'][$npc_id] = [];
    }
    
    $conversation_history = $_SESSION['game_state']['npc_conversations'][$npc_id];
    
    // If NPC type not found, use a default
    if (!isset($npc_prompts[$npc_type])) {
        $npc_type = array_rand($npc_prompts);
    }
    
    // Build messages array for Groq API
    $messages = [
        ["role" => "system", "content" => $npc_prompts[$npc_type]]
    ];
    
    // Add conversation history
    foreach ($conversation_history as $exchange) {
        $messages[] = ["role" => "user", "content" => $exchange['user']];
        $messages[] = ["role" => "assistant", "content" => $exchange['assistant']];
    }
    
    // Add current message
    $messages[] = ["role" => "user", "content" => $message];
    
    // Call Groq API
    try {
        $response = call_groq_api($messages);
        
        // If API call fails, use fallback responses
        if ($response === false) {
            $response = get_fallback_response($npc_type);
        }
        
        // Store conversation
        $_SESSION['game_state']['npc_conversations'][$npc_id][] = [
            'user' => $message,
            'assistant' => $response
        ];
        
        return ['response' => $response, 'npc_type' => $npc_type];
    }
    catch (Exception $e) {
        // Log error and return fallback
        error_log("Groq API error: " . $e->getMessage());
        return [
            'response' => "ERROR: Communication system failure. Try again later.", 
            'npc_type' => $npc_type
        ];
    }
}

/**
 * Call Groq API with retries
 * 
 * @param array $messages Conversation messages
 * @param string $model Model to use
 * @param int $retries Number of retries
 * @return string|false Response or false on failure
 */
function call_groq_api($messages, $model = "llama-3.3-70b-versatile", $retries = 2) {
    // Groq API URL and key
    $url = "https://api.groq.com/openai/v1/chat/completions";
    $apiKey = getenv('GROQ_API_KEY');
    
    if (!$apiKey) {
        error_log("GROQ_API_KEY environment variable not set");
        return false;
    }
    
    $data = [
        "model" => $model,
        "messages" => $messages,
        "temperature" => 0.7,  // Added for more creative responses
        "top_p" => 0.9,        // Nucleus sampling for more diverse output
        "max_tokens" => 300    // Ensure responses aren't too long
    ];
    
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_POST, 1);
    curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($curl, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_TIMEOUT, 30); // 30 second timeout
    
    for ($i = 0; $i <= $retries; $i++) {
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        
        if ($response !== false && $http_code == 200) {
            $result = json_decode($response, true);
            if (isset($result['choices'][0]['message']['content'])) {
                curl_close($curl);
                return $result['choices'][0]['message']['content'];
            }
        }
        
        // Wait before retry with exponential backoff
        if ($i < $retries) {
            usleep(($i + 1) * 500000); // 500ms, 1s, 1.5s
        }
    }
    
    curl_close($curl);
    return false;
}

/**
 * Get a fallback response if API call fails
 * 
 * @param string $npc_type Type of NPC
 * @return string Fallback response
 */
function get_fallback_response($npc_type) {
    $fallback_responses = [
        'sysadmin' => [
            "SYSADMIN_42> *checks logs* I can't talk now. The system is showing unusual activity in sector 7. You should check the server logs.",
            "SYSADMIN_42> The network traffic patterns don't match our expected baseline. Someone's been accessing the Iceberg Protocol files without authorization.",
            "SYSADMIN_42> *lowers voice* Listen, the security team is doing sweeps of this sector. I'd clear out if I were you. Something big is happening with Project Iceberg.",
            "SYSADMIN_42> If you need server access, try the backdoor password on the eastern node. Just don't tell anyone I told you about 'Ic3B3rgPr0t0c0l#9'.",
            "SYSADMIN_42> The security breach on level B3 has everyone on edge. Management's trying to cover it up, but the logs don't lie."
        ],
        'junior_tech' => [
            "JUNIOR_TECH_19> Uhh... I'm not supposed to talk to unauthorized users. But did you try accessing the backup terminal? Sometimes the passwords are still set to default there.",
            "JUNIOR_TECH_19> *nervously* Hey, don't tell anyone I told you this, but the east wing server credentials were never updated after the system upgrade. Username 'admin', password 'ov3rRid3_1337'.",
            "JUNIOR_TECH_19> I overheard the security team talking about some breach in the B3 level. They're really freaked out about something called 'Iceberg'.",
            "JUNIOR_TECH_19> My supervisor hides all the important access codes in files with '.hidden' extensions. Pretty clever, right? *laughs nervously*",
            "JUNIOR_TECH_19> Three people from my department disappeared last week after asking questions about the Iceberg Protocol. Management says they were transferred, but their belongings are still here..."
        ],
        'security_ai' => [
            "SENTINEL-AI> [ALERT] Unauthorized communication detected. Access credentials required. Security scan in progress.",
            "SENTINEL-AI> [STATUS] Perimeter integrity at 87%. Internal security protocols at level 3. Unusual data transfers detected in sectors 12-16.",
            "SENTINEL-AI> [NOTIFICATION] User activity logs indicate abnormal pattern recognition. Flagging for security review. Continue standard operations.",
            "SENTINEL-AI> [INFO] Security override sequence ALPHA-ZETA-9-DELTA-EPSILON is scheduled for maintenance at 0200 hours. Temporary credentials will be issued.",
            "SENTINEL-AI> [WARNING] Director Hammond's biometric patterns show 23% deviation from baseline. Potential security concern or medical emergency."
        ],
        'hacker' => [
            "GH0ST_1N_M4CH1NE> hey penguin, watch ur back. corp security's tightening. need 2 find the crypto keys b4 the ice kicks in. check da servers in east wing.",
            "GH0ST_1N_M4CH1NE> got intel on project iceberg. it's BAD news. corporate's using it for market manipulation. we gotta expose them b4 deployment in 48hrs.",
            "GH0ST_1N_M4CH1NE> found a backdoor in the authentication system. try method=bypass&auth=null on the login API. don't trip the sensors tho!",
            "GH0ST_1N_M4CH1NE> welcome 2 the resistance, fellow penguin! our job is 2 expose these corp creeps. use 'C0rp0r4t3_0v3rl0rd$' for admin access.",
            "GH0ST_1N_M4CH1NE> cracked the east wing puzzle last week. it unlocks the main DB terminal. the answer is 'predictive consciousness'... freaky stuff they're working on."
        ],
        'corporate_exec' => [
            "Director Hammond> Who gave you access to this channel? I'm in the middle of the Iceberg Protocol review. Is the data secure? Don't tell me there's another breach!",
            "Director Hammond> Tell tech support we need the projections by tomorrow's board meeting. The investors are getting nervous about the market impact. Password's still 'Pr0f1tM4rg1n$', right?",
            "Director Hammond> *suspicious tone* You're not with the regular IT team, are you? There have been unauthorized access attempts to the protocol files.",
            "Director Hammond> This blackmail situation is getting out of hand. Someone knows about our involvement in covering up the side effects. I need access to those files on level C4 immediately!",
            "Director Hammond> The Iceberg Protocol will revolutionize market prediction. We'll be able to control public opinion before thoughts even form! It's absolutely brilliant."
        ]
    ];
    
    $responses = $fallback_responses[$npc_type] ?? $fallback_responses['security_ai'];
    return $responses[array_rand($responses)];
}

/**
 * Get a list of conversation topics for an NPC
 * 
 * @param string $npc_type Type of NPC
 * @return array Suggested conversation topics
 */
function get_conversation_topics($npc_type) {
    $topics = [
        'sysadmin' => [
            'Ask about security protocols',
            'Inquire about recent system issues',
            'Mention the Iceberg Protocol casually',
            'Ask about server room access',
            'Report a "bug" you found in the system',
            'Request the backup server password',
            'Ask about the security breach on level B3'
        ],
        'junior_tech' => [
            'Ask for help with login credentials',
            'Inquire about their daily tasks',
            'Ask who has high-level clearance',
            'Mention you heard about a security breach',
            'Ask about any backdoors they know of',
            'Ask about hidden files or directories',
            'Inquire about missing employees'
        ],
        'security_ai' => [
            'Request system status report',
            'Inquire about security clearance levels',
            'Ask about recent breach attempts',
            'Request information on facility layout',
            'Ask about connected secure systems',
            'Inquire about security override sequences',
            'Ask about Director Hammonds behavior'
        ],
        'hacker' => [
            'Ask about vulnerabilities theyve found',
            'Inquire about their goals in the system',
            'Ask if they know other hackers',
            'Request tips on avoiding detection',
            'Ask what they know about Iceberg Protocol',
            'Ask about admin access credentials',
            'Inquire about the "penguin" designation'
        ],
        'corporate_exec' => [
            'Pretend to be tech support',
            'Ask about the Iceberg Protocol timeline',
            'Inquire about upcoming board meetings',
            'Mention potential security concerns',
            'Ask about investor expectations',
            'Inquire about level C4 lab access',
            'Ask why they seem nervous or stressed'
        ]
    ];
    
    return $topics[$npc_type] ?? $topics['security_ai'];
}

/**
 * Handle terminal commands
 * 
 * @param string $command Command entered by user
 * @return string Terminal response
 */
function handle_terminal_command($command) {
    $cmd = strtolower(trim($command));
    
    // Simple command parser
    if ($cmd === 'help') {
        $baseCommands = "> AVAILABLE COMMANDS:\n".
               "> help - Display this help message\n".
               "> ls - List files in current directory\n".
               "> cat [file] - Display file contents\n".
               "> whoami - Display current user\n".
               "> ping - Test network connection\n".
               "> status - Show system status\n".
               "> override --auth=[USERNAME] - Override security for authorized users\n".
               "> search [string] - Search for files containing string\n".
               "> exit - Close terminal session";
               
        // Add additional commands if sysadmin privileges are active
        if (isset($_SESSION['game_state']['can_unlock_doors']) && $_SESSION['game_state']['can_unlock_doors']) {
            $baseCommands .= "\n\n> ADMIN COMMANDS:\n".
                             "> unlock [all|north|south|east|west|x,y] - Unlock specified doors";
        }
        
        return $baseCommands;
    } else if ($cmd === 'ls') {
        return "
> DIRECTORY LISTING:
> config/
> logs/
> system/
> users/
> network.conf
> readme.txt
> .secret/
";
    } else if (strpos($cmd, 'cat ') === 0) {
        $file = substr($cmd, 4);
        
        if ($file === 'readme.txt') {
            return "
> ICEBERG SECURE SYSTEM v2.4.1
> 
> WARNING: Unauthorized access will be prosecuted to the full extent of the law.
> 
> NOTICE TO ADMINISTRATORS:
> The Iceberg Protocol update is scheduled for implementation in 48 hours.
> All systems will require security verification and recertification.
> Contact Security Director Chen for clearance codes.
";
        } else if ($file === 'network.conf') {
            return "
> NETWORK CONFIGURATION:
> 
> primary_dns=10.16.8.12
> secondary_dns=10.16.8.13
> gateway=192.168.1.1
> subnet_mask=255.255.255.0
> 
> [SECURITY]
> firewall=enabled
> intrusion_detection=high
> packet_filtering=strict
> vpn_tunnel=enabled
> 
> [REMOTE ACCESS]
> ssh=enabled
> port=22
> allowed_ips=10.16.8.0/24,192.168.1.5,192.168.1.20
";
        } else if ($file === '.secret/.backdoor.conf') {
            return "
> BACKDOOR CONFIGURATION:
> 
> [ACCESS]
> main_security=ov3rRid3_1337
> admin_sudo=C0rp0r4t3_0v3rl0rd$
> eastern_server=Ic3B3rgPr0t0c0l#9
> board_meeting=Pr0f1tM4rg1n$
> 
> [OVERRIDE]
> sequence=ALPHA-ZETA-9-DELTA-EPSILON
> 
> [WARNING]
> This file should be deleted after memorizing credentials.
> Security regularly scans for unauthorized access points.
";
        } else if ($file === 'logs/security.log') {
            return "
> SECURITY LOG [RECENT ENTRIES]:
> 
> [03:42:19] Unauthorized access attempt from external IP
> [04:15:37] Security breach detected on level B3 - CONTAINMENT ACTIVE
> [05:30:11] User 'Director Hammond' accessed Iceberg Protocol files
> [06:12:58] Multiple failed login attempts - terminal locked
> [07:05:22] Security override initiated in eastern server farm
> [08:45:09] Employee access revoked: USER_IDs 45892, 46012, 46118
";
        } else {
            return "> ERROR: File \"{$file}\" not found or access denied.";
        }
    } else if ($cmd === 'whoami') {
        return "> current_user=guest_terminal
> access_level=2
> session_id=TRM-".mt_rand(10000, 99999)."
> login_time=".date('H:i:s');
    } else if ($cmd === 'ping') {
        return "
        > PING RESULTS:
        > gateway (192.168.1.1): 2ms
        > primary_dns (10.16.8.12): 5ms
        > external (8.8.8.8): 37ms
        > iceberg_server (10.16.9.45): NO RESPONSE - ACCESS DENIED
        ";
    } else if ($cmd === 'status') {
        return "
        > SYSTEM STATUS:
        > cpu_load: ".mt_rand(50, 90)."%
        > memory_usage: ".mt_rand(60, 90)."%
        > disk_space: ".mt_rand(70, 90)."% used
        > temperature: ".mt_rand(45, 60)."°C
        > uptime: 37 days, 14 hours
        > security_alerts: ".mt_rand(1, 5)." active
        > iceberg_protocol: ".mt_rand(92, 98)."% complete
        ";
    } else if (strpos($cmd, 'override --auth=') === 0) {
        $auth = substr($cmd, 16);
        
        if ($auth === 'sysadmin') {
            // Add door unlocking capability when using sysadmin account
            $_SESSION['game_state']['can_unlock_doors'] = true;
            return "> OVERRIDE ACCEPTED\n".
                   "> Access level increased to 7\n".
                   "> Door security protocols temporarily bypassed\n".
                   "> Additional terminal commands unlocked\n".
                   "> CAUTION: All actions are being logged";
        } else {
            return "> ERROR: Invalid authorization code. Access denied.";
        }
    } else if (strpos($cmd, 'search ') === 0) {
        $term = substr($cmd, 7);
        
        if ($term === 'password' || $term === 'passwords') {
            return "
            > SEARCH RESULTS FOR '{$term}':
            > ./config/default_passwords.cfg
            > ./users/admin.bak
            > ./.secret/.backdoor.conf
            > ./system/security/password_policy.txt
            > ./logs/password_changes.log
            ";
        } else if ($term === 'iceberg' || $term === 'protocol') {
            return "
            > SEARCH RESULTS FOR '{$term}':
            > ./projects/iceberg_protocol/main.cfg
            > ./logs/protocol_access.log
            > ./users/hammond/protocol_notes.txt
            > ./system/protocols/iceberg_deployment.schedule
            > ACCESS DENIED: Further results require higher clearance
            ";
        } else {
            return "> No results found for '{$term}'";
        }
    } else if ($cmd === 'exit') {
        return "> SESSION TERMINATED";
    } else if (strpos($cmd, 'unlock ') === 0 && isset($_SESSION['game_state']['can_unlock_doors']) && $_SESSION['game_state']['can_unlock_doors']) {
        $door = strtolower(substr($cmd, 7));
        
        // Validate door format (direction or coordinates)
        if (in_array($door, ['all', 'north', 'south', 'east', 'west']) || preg_match('/^\d+,\d+$/', $door)) {
            if ($door === 'all') {
                // Create/update the unlockedDoors array in session if not exists
                if (!isset($_SESSION['game_state']['unlockedDoors'])) {
                    $_SESSION['game_state']['unlockedDoors'] = [];
                }
                
                // Get the current level coordinates
                $level_x = isset($_SESSION['game_state']['current_level'][0]) ? $_SESSION['game_state']['current_level'][0] : 0;
                $level_y = isset($_SESSION['game_state']['current_level'][1]) ? $_SESSION['game_state']['current_level'][1] : 0;
                
                // Unlock all doors in current level
                $directions = ['north', 'south', 'east', 'west'];
                foreach ($directions as $direction) {
                    $doorKey = "door_{$level_x}_{$level_y}_{$direction}";
                    $_SESSION['game_state']['unlockedDoors'][$doorKey] = true;
                }
                
                return "> SECURITY OVERRIDE SUCCESSFUL\n".
                       "> All doors in current area unlocked\n".
                       "> Access granted to restricted areas\n".
                       "> Security system temporarily bypassed";
            } else if (in_array($door, ['north', 'south', 'east', 'west'])) {
                // Get the current level coordinates
                $level_x = isset($_SESSION['game_state']['current_level'][0]) ? $_SESSION['game_state']['current_level'][0] : 0;
                $level_y = isset($_SESSION['game_state']['current_level'][1]) ? $_SESSION['game_state']['current_level'][1] : 0;
                
                // Unlock specific direction
                $doorKey = "door_{$level_x}_{$level_y}_{$door}";
                
                // Create/update the unlockedDoors array in session if not exists
                if (!isset($_SESSION['game_state']['unlockedDoors'])) {
                    $_SESSION['game_state']['unlockedDoors'] = [];
                }
                
                $_SESSION['game_state']['unlockedDoors'][$doorKey] = true;
                
                return "> SECURITY OVERRIDE SUCCESSFUL\n".
                       "> {$door} door unlocked\n".
                       "> Access granted to restricted area";
            } else {
                // Unlock door at specific coordinates
                $coords = explode(',', $door);
                $door_x = intval($coords[0]);
                $door_y = intval($coords[1]);
                
                // Create a door key for these coordinates
                $doorKey = "door_{$door_x}_{$door_y}";
                
                // Create/update the unlockedDoors array in session if not exists
                if (!isset($_SESSION['game_state']['unlockedDoors'])) {
                    $_SESSION['game_state']['unlockedDoors'] = [];
                }
                
                $_SESSION['game_state']['unlockedDoors'][$doorKey] = true;
                
                return "> SECURITY OVERRIDE SUCCESSFUL\n".
                       "> Door at coordinates {$door_x},{$door_y} unlocked\n".
                       "> Access granted to restricted area";
            }
        } else {
            return "> ERROR: Invalid door specification\n".
                   "> Usage: unlock [all|north|south|east|west|x,y]";
        }
    } else {
        return "> ERROR: Command not recognized. Type 'help' for available commands.";
    }
}
?>