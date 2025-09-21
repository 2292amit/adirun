class InfiniteRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'gameOver'
        this.difficulty = 'easy'; // Current difficulty level
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
        // Timer system (3 minutes = 180 seconds)
        this.gameTimeLimit = 180; // 3 minutes in seconds
        this.gameTimeRemaining = this.gameTimeLimit;
        this.gameStartTime = 0;
        
        // Distance tracking for scoring
        this.totalDistance = 0;
        this.maxDistanceReached = 0; // Track furthest point reached
        this.coinScore = 0; // Separate tracking for coin points
        
        // Manual world movement
        this.worldSpeed = 0; // Current world movement speed
        this.maxWorldSpeed = 8; // Maximum world movement speed
        
        // Death animation
        this.deathAnimation = {
            active: false,
            timer: 0,
            duration: 60, // frames
            rotation: 0,
            scale: 1
        };
        
        // Game settings
        this.gravity = 0.8;
        this.gameSpeed = 5; // Increased from 3 to 5 for faster initial speed
        this.speedIncrement = 0.003; // Increased from 0.002 to 0.003 for better progression
        
        // Player - further increased size for better zoom
        this.player = {
            x: 120,
            y: 0,
            width: 80, // Increased from 60 to 80
            height: 80, // Increased from 60 to 80
            velocityY: 0,
            jumping: false,
            grounded: false,
            color: '#FF6B6B',
            // Animation properties
            animationTime: 0,
            runBounce: 0,
            runCycle: 0,
            baseY: 0,
            // Jump cooldown
            jumpCooldown: 0,
            // Air jump system
            airJumpsLeft: 1 // Allow 1 air jump
        };
        
        // Ground
        this.groundHeight = 80;
        // Will be set properly after canvas setup
        this.player.y = 0;
        
        // Game objects
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.scorePopups = []; // Floating score text
        this.clouds = [];
        this.platforms = []; // Aerial platforms
        this.holes = []; // Ground holes
        this.ramps = []; // Ground ramps for vertical engagement
        this.blocks = []; // Jumpable blocks
        this.blockTimer = 0;
        this.birds = []; // Flying bird enemies
        this.birdTimer = 0;
        this.snails = []; // Ground snail enemies
        this.snailTimer = 0;
        this.watches = []; // Time extension powerups
        this.watchTimer = 0;
        
        // Sound system
        this.sounds = {};
        this.soundsEnabled = true;
        this.musicEnabled = true;
        this.backgroundMusic = null;
        this.runningSound = null;
        this.scheduledPlatforms = []; // Platforms scheduled to help with obstacles
        
        // Background
        this.backgroundX = 0;
        this.mountainX = 0;
        this.worldOffset = 0; // World movement for progressive speed
        
        // Day-night cycle system
        this.timeOfDay = 0; // 0 = dawn, 0.25 = day, 0.5 = dusk, 0.75 = night, 1 = dawn again
        this.dayNightSpeed = 0.00008; // Much slower - complete cycle takes ~12,500 frames (~3.5 minutes at 60fps)
        
        // Setup canvas now that ground height is defined
        this.setupCanvas();
        
        // Initialize sound system
        this.initSounds();
        
        // Timing
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.cloudTimer = 0;
        this.platformTimer = 0;
        this.holeTimer = 0;
        this.rampTimer = 0;
        
        // Difficulty configurations
        this.difficultySettings = {
            easy: {
                obstacleChance: 0.3,
                coinChance: 0.8,
                holeChance: 0.2,
                platformChance: 0.6,
                rampChance: 0.5,
                birdChance: 0.2,
                snailChance: 0.3,
                watchChance: 0.2,
                minObstacleSpacing: 300,
                minCoinSpacing: 150,
                minHoleSpacing: 500,
                name: 'Easy Mode'
            },
            medium: {
                obstacleChance: 0.4,
                coinChance: 0.6,
                holeChance: 0.3,
                platformChance: 0.5,
                rampChance: 0.4,
                birdChance: 0.3,
                snailChance: 0.4,
                watchChance: 0.15,
                minObstacleSpacing: 250,
                minCoinSpacing: 180,
                minHoleSpacing: 400,
                name: 'Medium Mode'
            },
            hard: {
                obstacleChance: 0.6,
                coinChance: 0.4,
                holeChance: 0.4,
                platformChance: 0.4,
                rampChance: 0.3,
                birdChance: 0.5,
                snailChance: 0.6,
                watchChance: 0.1,
                minObstacleSpacing: 200,
                minCoinSpacing: 220,
                minHoleSpacing: 350,
                name: 'Hard Mode'
            }
        };
        
        // Assets loading
        this.assetsLoaded = false;
        this.loadAssets();
        
        // Initialize player position now that canvas and player are set up
        this.initializePlayerPosition();
        
        // Input handling
        this.setupInput();
        
        // UI elements
        this.setupUI();
        this.setupDifficultySelection();
        
        // Start game loop
        this.gameLoop();
    }
    
    initSounds() {
        // Create simple sound effects using Web Audio API
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported, sound will be disabled');
            this.soundsEnabled = false;
            return;
        }
        
        // Create sound effects using oscillators
        this.createSoundEffects();
        
        // Load background music
        this.loadBackgroundMusic();
    }
    
    createSoundEffects() {
        // We'll create sound effects procedurally using Web Audio API
        this.sounds = {
            jump: () => this.playTone(200, 0.1, 'square'),
            coin: () => this.playTone(800, 0.2, 'sine'),
            watch: () => this.playChord([400, 600, 800], 0.3, 'sine'),
            death: () => this.playTone(150, 0.5, 'sawtooth'),
            powerup: () => this.playChord([200, 400, 600, 800], 0.4, 'sine')
        };
        
        // Create running sound (procedural)
        this.createRunningSound();
    }
    
    loadBackgroundMusic() {
        try {
            this.backgroundMusic = new Audio('icons/background.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = 0.1; // Much lower volume to not overpower other sounds
            this.backgroundMusic.preload = 'auto';
            
            // Handle loading errors
            this.backgroundMusic.onerror = () => {
                console.log('Could not load background music');
                this.backgroundMusic = null;
            };
            
            this.backgroundMusic.oncanplaythrough = () => {
                console.log('Background music loaded successfully');
            };
        } catch (e) {
            console.log('Error loading background music:', e);
            this.backgroundMusic = null;
        }
    }
    
    createRunningSound() {
        // Create a running sound effect using Web Audio API
        this.runningSound = {
            isPlaying: false,
            oscillator: null,
            gainNode: null,
            start: () => {
                if (!this.soundsEnabled || !this.audioContext || this.runningSound.isPlaying) return;
                
                try {
                    this.runningSound.oscillator = this.audioContext.createOscillator();
                    this.runningSound.gainNode = this.audioContext.createGain();
                    
                    this.runningSound.oscillator.connect(this.runningSound.gainNode);
                    this.runningSound.gainNode.connect(this.audioContext.destination);
                    
                    // Create a rhythmic running sound
                    this.runningSound.oscillator.frequency.value = 80;
                    this.runningSound.oscillator.type = 'triangle';
                    this.runningSound.gainNode.gain.value = 0.05; // Very quiet
                    
                    // Add some rhythm variation
                    setInterval(() => {
                        if (this.runningSound.isPlaying && this.runningSound.gainNode) {
                            this.runningSound.gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                            this.runningSound.gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime + 0.1);
                        }
                    }, 200);
                    
                    this.runningSound.oscillator.start();
                    this.runningSound.isPlaying = true;
                } catch (e) {
                    console.log('Error starting running sound:', e);
                }
            },
            stop: () => {
                if (this.runningSound.oscillator && this.runningSound.isPlaying) {
                    try {
                        this.runningSound.oscillator.stop();
                        this.runningSound.oscillator = null;
                        this.runningSound.gainNode = null;
                        this.runningSound.isPlaying = false;
                    } catch (e) {
                        console.log('Error stopping running sound:', e);
                    }
                }
            }
        };
    }
    
    playTone(frequency, duration, waveType = 'sine') {
        if (!this.soundsEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = waveType;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.log('Error playing sound:', e);
        }
    }
    
    playChord(frequencies, duration, waveType = 'sine') {
        if (!this.soundsEnabled || !this.audioContext) return;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, duration * 0.7, waveType);
            }, index * 50);
        });
    }
    
    toggleSound() {
        this.soundsEnabled = !this.soundsEnabled;
        const soundToggleBtn = document.getElementById('soundToggleBtn');
        if (soundToggleBtn) {
            if (this.soundsEnabled) {
                soundToggleBtn.textContent = '🔊';
                soundToggleBtn.classList.remove('muted');
                this.startBackgroundMusic();
            } else {
                soundToggleBtn.textContent = '🔇';
                soundToggleBtn.classList.add('muted');
                this.stopBackgroundMusic();
                this.runningSound.stop();
            }
        }
        
        // Play a test sound when enabling
        if (this.soundsEnabled && this.sounds.coin) {
            this.sounds.coin();
        }
    }
    
    startBackgroundMusic() {
        if (this.backgroundMusic && this.musicEnabled && this.soundsEnabled) {
            try {
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play().catch(e => {
                    console.log('Could not start background music:', e);
                });
            } catch (e) {
                console.log('Error starting background music:', e);
            }
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            try {
                this.backgroundMusic.pause();
                this.backgroundMusic.currentTime = 0;
            } catch (e) {
                console.log('Error stopping background music:', e);
            }
        }
    }
    
    setupCanvas() {
        // Get device pixel ratio for high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size (CSS pixels)
        let displayWidth, displayHeight;
        if (window.innerWidth <= 768) {
            // Mobile: full screen
            displayWidth = window.innerWidth;
            displayHeight = window.innerHeight;
        } else {
            // Desktop: fixed size
            displayWidth = Math.min(1200, window.innerWidth - 40);
            displayHeight = Math.min(600, window.innerHeight - 40);
        }
        
        // Set canvas style size
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        // Set actual canvas size in memory (scaled for high-DPI)
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        
        // Scale the drawing context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        
        // Store display dimensions for game logic
        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
        this.pixelRatio = dpr;
        
        console.log(`Canvas setup: ${displayWidth}x${displayHeight} display, ${this.canvas.width}x${this.canvas.height} actual, DPR: ${dpr}`);
    }
    
    initializePlayerPosition() {
        // Set player initial position after both canvas and player are set up
        this.player.y = this.displayHeight - this.groundHeight - this.player.height;
        this.player.baseY = this.player.y;
    }
    
    loadAssets() {
        // Load game assets (no background image needed - we'll render custom background)
        this.heroImage = new Image();
        this.coinImage = new Image();
        this.hurdleImage = new Image();
        this.birdImage = new Image();
        this.snailImage = new Image();
        
        let loadedAssets = 0;
        const totalAssets = 5;
        
        const onAssetLoad = () => {
            loadedAssets++;
            console.log(`Loaded asset ${loadedAssets}/${totalAssets}`);
            if (loadedAssets === totalAssets) {
                this.assetsLoaded = true;
                console.log('All assets loaded!');
                this.generateClouds();
            }
        };
        
        const onAssetError = (assetName) => {
            console.error(`Failed to load asset: ${assetName}`);
            loadedAssets++;
            if (loadedAssets === totalAssets) {
                this.assetsLoaded = true;
                console.log('Asset loading completed (some may have failed)');
                this.generateClouds();
            }
        };
        
        this.heroImage.onload = onAssetLoad;
        this.coinImage.onload = onAssetLoad;
        this.hurdleImage.onload = onAssetLoad;
        this.birdImage.onload = onAssetLoad;
        this.snailImage.onload = onAssetLoad;
        
        this.heroImage.onerror = () => onAssetError('hero.png');
        this.coinImage.onerror = () => onAssetError('coin.png');
        this.hurdleImage.onerror = () => onAssetError('hurdle.png');
        this.birdImage.onerror = () => onAssetError('bird.png');
        this.snailImage.onerror = () => onAssetError('snail.png');
        
        const timestamp = Date.now();
        this.heroImage.src = `icons/hero.png?v=${timestamp}`;
        this.coinImage.src = `icons/coin.png?v=${timestamp}`;
        this.hurdleImage.src = `icons/hurdle.png?v=${timestamp}`;
        this.birdImage.src = `icons/bird.png?v=${timestamp}`;
        this.snailImage.src = `icons/snail.png?v=${timestamp}`;
        
        // Initialize background elements
        this.initializeBackground();
    }
    
    initializeBackground() {
        // Initialize trees
        this.trees = [];
        for (let i = 0; i < 6; i++) {
            this.trees.push({
                x: Math.random() * this.displayWidth * 2,
                y: this.displayHeight - this.groundHeight - 60 - Math.random() * 40,
                width: 15 + Math.random() * 10,
                height: 40 + Math.random() * 30,
                type: Math.random() > 0.5 ? 'pine' : 'oak',
                speed: 0.2 + Math.random() * 0.3
            });
        }
        
        // Initialize mountains
        this.mountains = [];
        for (let i = 0; i < 4; i++) {
            this.mountains.push({
                x: i * 300,
                y: this.displayHeight - this.groundHeight - 80 - Math.random() * 60,
                width: 200 + Math.random() * 100,
                height: 60 + Math.random() * 40,
                speed: 0.1
            });
        }
        
        // Initialize background hills
        this.hills = [];
        for (let i = 0; i < 5; i++) {
            this.hills.push({
                x: i * 250,
                y: this.displayHeight - this.groundHeight - 40 - Math.random() * 30,
                width: 180 + Math.random() * 80,
                height: 30 + Math.random() * 25,
                speed: 0.15
            });
        }
    }
    
    setupInput() {
        // Track key states for smooth movement
        this.keys = {
            left: false,
            right: false,
            jump: false
        };

        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.handleJump();
                } else if (this.gameState === 'menu') {
                    this.startGame();
                } else if (this.gameState === 'gameOver') {
                    this.resetGame();
                }
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                e.preventDefault();
                this.keys.left = true;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                e.preventDefault();
                this.keys.right = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.keys.left = false;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.keys.right = false;
            }
        });
        
        // Touch input for mobile - now only for menu/game over states
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'menu') {
                this.startGame();
            } else if (this.gameState === 'gameOver') {
                this.resetGame();
            }
        });
        
        // Mouse input - now only for menu/game over states
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (this.gameState === 'menu') {
                this.startGame();
            } else if (this.gameState === 'gameOver') {
                this.resetGame();
            }
        });
        
        // Prevent scrolling on mobile
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Mobile control buttons
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const jumpBtn = document.getElementById('jumpBtn');
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.left = true;
            });
            leftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.left = false;
            });
            leftBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.keys.left = true;
            });
            leftBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.keys.left = false;
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.right = true;
            });
            rightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys.right = false;
            });
            rightBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.keys.right = true;
            });
            rightBtn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.keys.right = false;
            });
        }
        
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.handleJump();
                }
            });
            jumpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.handleJump();
                }
            });
        }
        
        // Game fullscreen button (during gameplay)
        const gameFullscreenBtn = document.getElementById('gameFullscreenBtn');
        if (gameFullscreenBtn) {
            gameFullscreenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Call the global enterFullscreen function
                if (window.enterFullscreen) {
                    window.enterFullscreen();
                }
            });
        }
        
        // Sound toggle button
        const soundToggleBtn = document.getElementById('soundToggleBtn');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSound();
            });
        }
    }
    
    setupUI() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        this.updateHighScoreDisplay();
    }
    
    setupDifficultySelection() {
        // Set up difficulty selection buttons
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove selected class from all buttons
                difficultyButtons.forEach(b => b.classList.remove('selected'));
                
                // Add selected class to clicked button
                btn.classList.add('selected');
                
                // Update difficulty
                this.difficulty = btn.dataset.difficulty;
                console.log('Difficulty set to:', this.difficultySettings[this.difficulty].name);
            });
        });
        
        // Set default difficulty
        this.difficulty = 'easy';
    }
    
    handleJump() {
        if (this.gameState === 'menu') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            // Allow jumping if grounded OR if air jumps are available
            const canJump = (this.player.grounded || this.player.airJumpsLeft > 0) && 
                           this.player.jumpCooldown <= 0;
            
            if (canJump) {
                this.player.velocityY = -22; // Jump power
                this.player.jumping = true;
                this.player.jumpCooldown = 10; // 10 frame cooldown
                
                // Play jump sound
                if (this.sounds.jump) {
                    this.sounds.jump();
                }
                
                if (this.player.grounded) {
                    // Ground jump - reset air jumps
                    this.player.grounded = false;
                    this.player.airJumpsLeft = 1; // Reset air jumps when jumping from ground
                } else {
                    // Air jump - consume one air jump
                    this.player.airJumpsLeft--;
                }
            }
        } else if (this.gameState === 'gameOver') {
            this.restartGame();
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.gameTimeRemaining = this.gameTimeLimit;
        document.getElementById('startScreen').classList.add('hidden');
        document.body.classList.add('playing'); // Show mobile controls
        
        // Resume audio context if needed (required for mobile browsers)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Start background music
        this.startBackgroundMusic();
        
        this.resetGame();
    }
    
    restartGame() {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.gameTimeRemaining = this.gameTimeLimit;
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.body.classList.add('playing'); // Show mobile controls
        
        // Restart background music
        this.startBackgroundMusic();
        
        this.resetGame();
    }
    
    resetGame() {
        this.score = 0;
        this.coinScore = 0;
        this.totalDistance = 0;
        this.maxDistanceReached = 0;
        this.gameSpeed = 5; // Reset to faster initial speed
        this.player.y = this.displayHeight - this.groundHeight - this.player.height;
        this.player.baseY = this.player.y;
        this.player.x = 120; // Reset horizontal position
        this.player.velocityY = 0;
        this.player.jumping = false;
        this.player.grounded = true;
        this.player.animationTime = 0;
        this.player.runBounce = 0;
        this.player.runCycle = 0;
        this.player.jumpCooldown = 0;
        this.player.airJumpsLeft = 1;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.scorePopups = [];
        this.platforms = [];
        this.holes = [];
        this.ramps = [];
        this.blocks = [];
        this.birds = [];
        this.snails = [];
        this.watches = [];
        this.scheduledPlatforms = [];
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.platformTimer = 0;
        this.holeTimer = 0;
        this.rampTimer = 0;
        this.blockTimer = 0;
        this.birdTimer = 0;
        this.snailTimer = 0;
        this.watchTimer = 0;
        this.backgroundX = 0;
        this.worldOffset = 0;
        this.timeOfDay = 0; // Reset to dawn
        
        // Reset death animation
        this.deathAnimation.active = false;
        this.deathAnimation.timer = 0;
        this.deathAnimation.rotation = 0;
        this.deathAnimation.scale = 1;
        
        this.initializeBackground();
    }
    
    generateClouds() {
        this.clouds = [];
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * this.displayWidth * 2,
                y: Math.random() * (this.displayHeight * 0.4),
                size: 20 + Math.random() * 30,
                speed: 0.5 + Math.random() * 1
            });
        }
    }
    
    update() {
        if (this.gameState !== 'playing' || !this.assetsLoaded) return;
        
        // Update timer
        this.updateTimer();
        
        this.updatePlayer();
        this.updateObstacles();
        this.updateCoins();
        this.updatePlatforms();
        this.updateHoles();
        this.updateRamps();
        this.updateBlocks();
        this.updateBirds();
        this.updateSnails();
        this.updateWatches();
        this.updateParticles();
        this.updateScorePopups();
        this.updateBackground();
        this.updateDayNightCycle();
        this.updateGameSpeed();
        this.spawnObjects();
        this.checkCollisions();
        this.updateScore();
    }
    
    updateTimer() {
        // Calculate elapsed time
        const elapsedTime = (Date.now() - this.gameStartTime) / 1000; // Convert to seconds
        this.gameTimeRemaining = Math.max(0, this.gameTimeLimit - elapsedTime);
        
        // Update timer display
        this.updateTimerDisplay();
        
        // Check if time is up
        if (this.gameTimeRemaining <= 0) {
            this.gameOver();
        }
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.gameTimeRemaining / 60);
        const seconds = Math.floor(this.gameTimeRemaining % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = timeString;
            
            // Change color when time is running low
            if (this.gameTimeRemaining <= 30) {
                timerElement.style.color = '#FF6B6B'; // Red when < 30 seconds
            } else if (this.gameTimeRemaining <= 60) {
                timerElement.style.color = '#FFD93D'; // Yellow when < 1 minute
            } else {
                timerElement.style.color = 'white'; // Normal white
            }
        }
    }
    
    updatePlayer() {
        // Handle death animation
        if (this.deathAnimation.active) {
            this.deathAnimation.timer++;
            this.deathAnimation.rotation += 0.3; // Spinning effect
            this.deathAnimation.scale = Math.max(0.1, 1 - (this.deathAnimation.timer / this.deathAnimation.duration));
            
            // End game after animation
            if (this.deathAnimation.timer >= this.deathAnimation.duration) {
                this.gameOver();
                return;
            }
            return; // Don't update other player logic during death
        }
        
        // Update animation time and cooldowns - increased for more lively animation
        this.player.animationTime += 0.3; // Increased from 0.2 to 0.3
        if (this.player.jumpCooldown > 0) {
            this.player.jumpCooldown--;
        }
        
        // Handle manual world movement based on key states
        this.worldSpeed = 0; // Reset world speed each frame
        
        // Check if movement would cause collision with blocks
        let canMoveLeft = true;
        let canMoveRight = true;
        
        // Check for block collisions that would prevent movement
        this.blocks.forEach(block => {
            // Simple collision prevention - check if player would hit block sides
            const playerRight = this.player.x + this.player.width;
            const playerLeft = this.player.x;
            const playerTop = this.player.y;
            const playerBottom = this.player.y + this.player.height;
            
            const blockLeft = block.x;
            const blockRight = block.x + block.width;
            const blockTop = block.y;
            const blockBottom = block.y + block.height;
            
            // Check vertical overlap (player and block are at same height)
            const verticalOverlap = playerBottom > blockTop + 5 && playerTop < blockBottom - 5;
            
            if (verticalOverlap) {
                // Check horizontal proximity for movement blocking
                if (playerRight >= blockLeft - 15 && playerRight <= blockLeft + 5) {
                    canMoveRight = false; // Block is directly in front when moving right
                }
                if (playerLeft <= blockRight + 15 && playerLeft >= blockRight - 5) {
                    canMoveLeft = false; // Block is directly in front when moving left
                }
            }
        });
        
        if (this.keys.left && canMoveLeft) {
            this.worldSpeed = this.maxWorldSpeed; // Move world right (player appears to move left)
        }
        if (this.keys.right && canMoveRight) {
            this.worldSpeed = -this.maxWorldSpeed; // Move world left (player appears to move right)
            
            // Track distance only when moving forward beyond previous maximum
            this.totalDistance += Math.abs(this.maxWorldSpeed);
            if (this.totalDistance > this.maxDistanceReached) {
                this.maxDistanceReached = this.totalDistance;
            }
        }
        
        // Apply gravity
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground collision - use separate variable for physics
        const groundY = this.displayHeight - this.groundHeight - this.player.height;
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.baseY = groundY;
            this.player.velocityY = 0;
            this.player.jumping = false;
            this.player.grounded = true;
            this.player.airJumpsLeft = 1; // Reset air jumps when landing
        } else {
            this.player.grounded = false;
            this.player.runBounce = 0; // Reset bounce when not grounded
        }
        
        // Running animation (only when grounded AND moving) - but don't modify actual Y position for physics
        if (this.player.grounded && this.gameState === 'playing' && (this.keys.left || this.keys.right)) {
            // Create bouncing effect for running - increased speed for more lively animation
            this.player.runCycle += 0.5; // Increased from 0.3 to 0.5 for faster animation
            this.player.runBounce = Math.sin(this.player.runCycle) * 4; // Increased bounce from 3 to 4 pixels
            // Don't modify this.player.y - use runBounce in rendering instead
            
            // Start running sound if not already playing
            if (this.runningSound && !this.runningSound.isPlaying) {
                this.runningSound.start();
            }
        } else {
            // Reset running animation when not moving
            this.player.runBounce = 0;
            // Keep runCycle but don't advance it when not moving
            
            // Stop running sound when not moving
            if (this.runningSound && this.runningSound.isPlaying) {
                this.runningSound.stop();
            }
        }
    }
    
    updateObstacles() {
        // Move obstacles based on manual world movement
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x += this.worldSpeed; // Move with world
            
            // Remove obstacles that are off-screen
            if (obstacle.x + obstacle.width < 0 || obstacle.x > this.displayWidth + 200) {
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    updateCoins() {
        // Move coins based on manual world movement
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x += this.worldSpeed; // Move with world
            coin.rotation += 0.1;
            coin.pulseTime += 0.15; // For pulsing effect
            
            // Remove coins that are off-screen
            if (coin.x + coin.size < 0 || coin.x > this.displayWidth + 200) {
                this.coins.splice(i, 1);
            }
        }
    }
    
    updatePlatforms() {
        // Move platforms based on manual world movement
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            platform.x += this.worldSpeed; // Move with world
            
            // Remove platforms that are off-screen
            if (platform.x + platform.width < 0 || platform.x > this.displayWidth + 200) {
                this.platforms.splice(i, 1);
            }
        }
    }
    
    updateHoles() {
        // Move holes based on manual world movement
        for (let i = this.holes.length - 1; i >= 0; i--) {
            const hole = this.holes[i];
            hole.x += this.worldSpeed; // Move with world
            
            // Remove holes that are off-screen
            if (hole.x + hole.width < 0 || hole.x > this.displayWidth + 200) {
                this.holes.splice(i, 1);
            }
        }
    }
    
    updateRamps() {
        // Move ramps based on manual world movement
        for (let i = this.ramps.length - 1; i >= 0; i--) {
            const ramp = this.ramps[i];
            ramp.x += this.worldSpeed; // Move with world
            
            // Remove ramps that are off-screen
            if (ramp.x + ramp.width < 0 || ramp.x > this.displayWidth + 200) {
                this.ramps.splice(i, 1);
            }
        }
    }
    
    updateBlocks() {
        // Move blocks based on manual world movement
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            block.x += this.worldSpeed; // Move with world
            
            // Remove blocks that are off-screen
            if (block.x + block.width < 0 || block.x > this.displayWidth + 200) {
                this.blocks.splice(i, 1);
            }
        }
    }
    
    updateBirds() {
        // Move birds from right to left, speed increases with game progress
        const baseSpeed = 2; // Base speed
        const progressSpeed = Math.min(this.gameSpeed * 0.3, 4); // Speed based on game progress
        const totalBirdSpeed = baseSpeed + progressSpeed;
        
        for (let i = this.birds.length - 1; i >= 0; i--) {
            const bird = this.birds[i];
            bird.x -= totalBirdSpeed; // Always move left
            bird.x += this.worldSpeed; // Also affected by world movement
            
            // Simple wing flapping animation
            bird.animationTime += 0.3;
            bird.wingOffset = Math.sin(bird.animationTime) * 3;
            
            // Remove birds that are off-screen
            if (bird.x + bird.width < -50) {
                this.birds.splice(i, 1);
            }
        }
    }
    
    updateSnails() {
        // Move snails slowly from right to left
        const snailSpeed = 1; // Very slow movement
        
        for (let i = this.snails.length - 1; i >= 0; i--) {
            const snail = this.snails[i];
            snail.x -= snailSpeed; // Always move left slowly
            snail.x += this.worldSpeed; // Also affected by world movement
            
            // Simple shell animation
            snail.animationTime += 0.1;
            snail.shellOffset = Math.sin(snail.animationTime) * 2;
            
            // Remove snails that are off-screen
            if (snail.x + snail.width < -50) {
                this.snails.splice(i, 1);
            }
        }
    }
    
    updateWatches() {
        // Move watches with world movement (they float in place)
        for (let i = this.watches.length - 1; i >= 0; i--) {
            const watch = this.watches[i];
            watch.x += this.worldSpeed; // Move with world
            
            // Gentle floating animation
            watch.animationTime += 0.15;
            watch.floatOffset = Math.sin(watch.animationTime) * 8;
            
            // Gentle glowing animation
            watch.glowIntensity = 0.5 + Math.sin(watch.animationTime * 2) * 0.3;
            
            // Remove watches that are off-screen
            if (watch.x + watch.width < -50 || watch.x > this.displayWidth + 200) {
                this.watches.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateBackground() {
        // Move background based on manual world movement
        this.backgroundX += this.worldSpeed * 0.5;
        
        // Update trees
        this.trees.forEach(tree => {
            tree.x += this.worldSpeed * tree.speed;
            if (tree.x + tree.width < 0) {
                tree.x = this.displayWidth + Math.random() * 200;
                tree.y = this.displayHeight - this.groundHeight - 60 - Math.random() * 40;
                tree.height = 40 + Math.random() * 30;
            } else if (tree.x > this.displayWidth + 200) {
                tree.x = -tree.width - Math.random() * 200;
                tree.y = this.displayHeight - this.groundHeight - 60 - Math.random() * 40;
                tree.height = 40 + Math.random() * 30;
            }
        });
        
        // Update mountains
        this.mountains.forEach(mountain => {
            mountain.x += this.worldSpeed * mountain.speed;
            if (mountain.x + mountain.width < 0) {
                mountain.x = this.displayWidth + Math.random() * 100;
            } else if (mountain.x > this.displayWidth + 100) {
                mountain.x = -mountain.width - Math.random() * 100;
            }
        });
        
        // Update hills
        this.hills.forEach(hill => {
            hill.x += this.worldSpeed * hill.speed;
            if (hill.x + hill.width < 0) {
                hill.x = this.displayWidth + Math.random() * 150;
            } else if (hill.x > this.displayWidth + 150) {
                hill.x = -hill.width - Math.random() * 150;
            }
        });
        
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x += this.worldSpeed * cloud.speed;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.displayWidth + cloud.size;
                cloud.y = Math.random() * (this.displayHeight * 0.4);
            } else if (cloud.x > this.displayWidth + cloud.size) {
                cloud.x = -cloud.size;
                cloud.y = Math.random() * (this.displayHeight * 0.4);
            }
        });
    }
    
    updateDayNightCycle() {
        // Progress the day-night cycle based on game time
        this.timeOfDay += this.dayNightSpeed;
        if (this.timeOfDay >= 1) {
            this.timeOfDay = 0; // Reset cycle
        }
    }
    
    updateGameSpeed() {
        this.gameSpeed += this.speedIncrement;
    }
    
    spawnObjects() {
        // Only spawn objects when moving forward (right key pressed)
        if (!this.keys.right) return;
        
        // Smart spawning system to ensure playability
        this.obstacleTimer++;
        this.coinTimer++;
        this.platformTimer++;
        this.holeTimer++;
        this.rampTimer++;
        this.blockTimer++;
        this.birdTimer++;
        this.snailTimer++;
        this.watchTimer++;
        
        // Check what's coming up in the next 300-500 pixels to avoid conflicts
        const upcomingObstacles = this.getUpcomingObstacles();
        const upcomingHoles = this.getUpcomingHoles();
        const upcomingPlatforms = this.getUpcomingPlatforms();
        const upcomingBlocks = this.getUpcomingBlocks();
        
        // Spawn obstacles with difficulty-based spacing and chance
        const settings = this.difficultySettings[this.difficulty];
        if (this.obstacleTimer > settings.minObstacleSpacing) {
            const canSpawnObstacle = this.canSpawnObstacle(upcomingHoles, upcomingPlatforms, upcomingBlocks);
            if (canSpawnObstacle && Math.random() < settings.obstacleChance) {
                this.spawnObstacle();
                this.obstacleTimer = 0;
                
                // If we spawn a difficult obstacle, ensure there's a platform nearby to help
                if (Math.random() < 0.3) { // 30% chance for challenging obstacles
                    this.scheduleHelpfulPlatform();
                }
            }
        }
        
        // Spawn holes with difficulty-based spacing and chance
        if (this.holeTimer > settings.minHoleSpacing) {
            const canSpawnHole = this.canSpawnHole(upcomingObstacles, upcomingPlatforms);
            if (canSpawnHole && Math.random() < settings.holeChance) {
                this.spawnHole();
                this.holeTimer = 0;
                
                // Always provide a platform before a hole for escape route
                this.scheduleHelpfulPlatform(-100); // Platform 100 pixels before hole
            }
        }
        
        // Spawn platforms with difficulty-based chance
        const minPlatformSpacing = 450; // Increased spacing for more strategic placement
        if (this.platformTimer > minPlatformSpacing) {
            // Only spawn if there's a reasonable gap and not too many platforms nearby
            const nearbyPlatforms = upcomingPlatforms.filter(p => p.x < this.displayWidth + 300);
            if (nearbyPlatforms.length < 2 && Math.random() < settings.platformChance) { // Limit platform density
                this.spawnPlatform();
                this.platformTimer = 0;
            }
        }
        
        // Spawn coins with difficulty-based spacing and chance
        if (this.coinTimer > settings.minCoinSpacing) {
            const canSpawnCoin = this.canSpawnCoin(upcomingObstacles, upcomingHoles);
            if (canSpawnCoin && Math.random() < settings.coinChance) {
                this.spawnCoin();
                this.coinTimer = 0;
            }
        }
        
        // Spawn ramps with difficulty-based chance
        const minRampSpacing = 400; // Reduced spacing for more frequent spawning
        if (this.rampTimer > minRampSpacing) {
            const canSpawnRamp = this.canSpawnRamp(upcomingObstacles, upcomingHoles, upcomingPlatforms);
            
            if (canSpawnRamp && Math.random() < settings.rampChance) {
                this.spawnRamp();
                this.rampTimer = 0;
            }
        }
        
        // Spawn blocks occasionally (not affected by difficulty but check for conflicts)
        const minBlockSpacing = 300;
        if (this.blockTimer > minBlockSpacing && Math.random() < 0.4) {
            const canSpawnBlock = this.canSpawnBlock(upcomingObstacles, upcomingHoles);
            if (canSpawnBlock) {
                this.spawnBlock();
                this.blockTimer = 0;
            }
        }
        
        // Spawn birds with difficulty-based chance
        const minBirdSpacing = 200;
        if (this.birdTimer > minBirdSpacing && Math.random() < settings.birdChance) {
            this.spawnBird();
            this.birdTimer = 0;
        }
        
        // Spawn snails with difficulty-based chance
        const minSnailSpacing = 400;
        if (this.snailTimer > minSnailSpacing && Math.random() < settings.snailChance) {
            this.spawnSnail();
            this.snailTimer = 0;
        }
        
        // Spawn watch powerups with difficulty-based chance
        const minWatchSpacing = 800; // Very rare
        if (this.watchTimer > minWatchSpacing && Math.random() < settings.watchChance) {
            this.spawnWatch();
            this.watchTimer = 0;
        }
    }
    
    spawnObstacle() {
        // Improved hurdle sizing for better gameplay balance
        const baseHeight = 70; // Reduced from 80 to 70 for easier jumping
        const heightVariation = Math.random() * 16 - 8; // -8 to +8 pixels
        const finalHeight = Math.max(50, baseHeight + heightVariation); // Minimum 50px height
        
        const obstacle = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight - finalHeight,
            width: 50 + Math.random() * 10, // Reduced width for easier passage: 50-60px
            height: finalHeight,
            type: 'hurdle'
        };
        this.obstacles.push(obstacle);
    }
    
    spawnCoin() {
        // Determine coin type based on probability
        let multiplier, color, textColor;
        const rand = Math.random();
        
        if (rand < 0.4) { // 40% - 1x coins (most common)
            multiplier = 1;
            color = '#FFD700'; // Gold
            textColor = '#000000'; // Black text
        } else if (rand < 0.65) { // 25% - 2x coins
            multiplier = 2;
            color = '#00FF00'; // Green
            textColor = '#000000'; // Black text
        } else if (rand < 0.8) { // 15% - 3x coins
            multiplier = 3;
            color = '#00BFFF'; // Blue
            textColor = '#FFFFFF'; // White text
        } else if (rand < 0.9) { // 10% - 4x coins
            multiplier = 4;
            color = '#FF69B4'; // Pink
            textColor = '#000000'; // Black text
        } else if (rand < 0.97) { // 7% - 5x coins
            multiplier = 5;
            color = '#9932CC'; // Purple
            textColor = '#FFFFFF'; // White text
        } else { // 3% - -1x penalty coins
            multiplier = -1;
            color = '#FF0000'; // Red
            textColor = '#FFFFFF'; // White text
        }
        
        const coin = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight - 90 - Math.random() * 120,
            size: 40,
            rotation: 0,
            collected: false,
            multiplier: multiplier,
            color: color,
            textColor: textColor,
            pulseTime: 0 // For visual effects
        };
        this.coins.push(coin);
    }
    
    spawnPlatform() {
        const platform = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight - 120 - Math.random() * 80, // 120-200 pixels above ground
            width: 80 + Math.random() * 60, // 80-140 pixels wide
            height: 15, // Platform thickness
            type: 'platform'
        };
        this.platforms.push(platform);
    }
    
    spawnHole() {
        const hole = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight, // At ground level
            width: 60 + Math.random() * 40, // 60-100 pixels wide
            height: this.groundHeight, // Full ground height
            type: 'hole'
        };
        this.holes.push(hole);
    }
    
    spawnRamp() {
        // Variable ramp sizes for variety
        const rampTypes = [
            { width: 80, height: 35 },   // Small ramp
            { width: 120, height: 50 },  // Medium ramp  
            { width: 160, height: 70 },  // Large ramp
            { width: 200, height: 90 }   // Extra large ramp
        ];
        
        const rampType = rampTypes[Math.floor(Math.random() * rampTypes.length)];
        const rampWidth = rampType.width;
        const rampHeight = rampType.height;
        
        const ramp = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight - rampHeight, // Position on ground
            width: rampWidth,
            height: rampHeight,
            type: 'ramp',
            // For physics calculations
            slope: rampHeight / rampWidth // Used for ramp physics
        };
        this.ramps.push(ramp);
    }
    
    spawnBlock() {
        // Variable block sizes
        const blockTypes = [
            { width: 60, height: 60 },   // Small block
            { width: 80, height: 80 },   // Medium block
            { width: 100, height: 60 },  // Wide block
            { width: 60, height: 100 }   // Tall block
        ];
        
        const blockType = blockTypes[Math.floor(Math.random() * blockTypes.length)];
        
        const block = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight - blockType.height,
            width: blockType.width,
            height: blockType.height,
            type: 'block'
        };
        
        this.blocks.push(block);
    }
    
    spawnBird() {
        // Random height for birds (flying at different altitudes)
        const groundLevel = this.displayHeight - this.groundHeight;
        const minHeight = 100; // Minimum height above ground
        const maxHeight = groundLevel - 150; // Maximum height (above player jump reach)
        const birdY = minHeight + Math.random() * (maxHeight - minHeight);
        
        const bird = {
            x: this.displayWidth + 50, // Start off-screen to the right
            y: birdY,
            width: 40,
            height: 30,
            type: 'bird',
            animationTime: 0,
            wingOffset: 0
        };
        
        this.birds.push(bird);
    }
    
    spawnSnail() {
        const snail = {
            x: this.displayWidth + 30, // Start off-screen to the right
            y: this.displayHeight - this.groundHeight - 25, // On ground
            width: 35,
            height: 25,
            type: 'snail',
            animationTime: 0,
            shellOffset: 0
        };
        
        this.snails.push(snail);
    }
    
    spawnWatch() {
        // Spawn watch powerup at random height (floating in air)
        const groundLevel = this.displayHeight - this.groundHeight;
        const minHeight = 150; // Above player reach but not too high
        const maxHeight = groundLevel - 200;
        const watchY = minHeight + Math.random() * (maxHeight - minHeight);
        
        const watch = {
            x: this.displayWidth + 30,
            y: watchY,
            width: 35,
            height: 35,
            type: 'watch',
            animationTime: 0,
            floatOffset: 0,
            glowIntensity: 0.5
        };
        
        this.watches.push(watch);
    }
    
    // Smart spawning helper functions
    getUpcomingObstacles() {
        const checkDistance = 500; // Check next 500 pixels
        return this.obstacles.filter(obstacle => 
            obstacle.x > this.displayWidth && obstacle.x < this.displayWidth + checkDistance
        );
    }
    
    getUpcomingHoles() {
        const checkDistance = 500;
        return this.holes.filter(hole => 
            hole.x > this.displayWidth && hole.x < this.displayWidth + checkDistance
        );
    }
    
    getUpcomingPlatforms() {
        const checkDistance = 500;
        return this.platforms.filter(platform => 
            platform.x > this.displayWidth && platform.x < this.displayWidth + checkDistance
        );
    }
    
    getUpcomingBlocks() {
        const checkDistance = 500;
        return this.blocks.filter(block => 
            block.x > this.displayWidth && block.x < this.displayWidth + checkDistance
        );
    }
    
    canSpawnObstacle(upcomingHoles, upcomingPlatforms, upcomingBlocks) {
        const minDistanceFromHole = 200; // Minimum distance from any hole
        const minDistanceFromBlock = 150; // Minimum distance from any block
        
        // Don't spawn obstacle too close to a hole
        for (let hole of upcomingHoles) {
            if (Math.abs(hole.x - this.displayWidth) < minDistanceFromHole) {
                return false;
            }
        }
        
        // Don't spawn obstacle too close to a block
        for (let block of upcomingBlocks) {
            if (Math.abs(block.x - this.displayWidth) < minDistanceFromBlock) {
                return false;
            }
        }
        
        return true;
    }
    
    canSpawnBlock(upcomingObstacles, upcomingHoles) {
        const minDistanceFromObstacle = 150; // Minimum distance from any obstacle
        const minDistanceFromHole = 200; // Minimum distance from any hole
        
        // Don't spawn block too close to an obstacle
        for (let obstacle of upcomingObstacles) {
            if (Math.abs(obstacle.x - this.displayWidth) < minDistanceFromObstacle) {
                return false;
            }
        }
        
        // Don't spawn block too close to a hole
        for (let hole of upcomingHoles) {
            if (Math.abs(hole.x - this.displayWidth) < minDistanceFromHole) {
                return false;
            }
        }
        
        return true;
    }
    
    canSpawnHole(upcomingObstacles, upcomingPlatforms) {
        const minDistanceFromObstacle = 200; // Minimum distance from any obstacle
        
        // Don't spawn hole too close to an obstacle
        for (let obstacle of upcomingObstacles) {
            if (Math.abs(obstacle.x - this.displayWidth) < minDistanceFromObstacle) {
                return false;
            }
        }
        
        // Ensure there's a platform nearby to help escape the hole
        const hasNearbyPlatform = upcomingPlatforms.some(platform => 
            platform.x > this.displayWidth - 150 && platform.x < this.displayWidth + 150
        );
        
        return hasNearbyPlatform; // Only spawn hole if there's a way to escape
    }
    
    canSpawnCoin(upcomingObstacles, upcomingHoles) {
        const minDistanceFromHazard = 80; // Coins should be accessible
        
        // Don't spawn coins too close to obstacles or holes
        for (let obstacle of upcomingObstacles) {
            if (Math.abs(obstacle.x - this.displayWidth) < minDistanceFromHazard) {
                return false;
            }
        }
        
        for (let hole of upcomingHoles) {
            if (Math.abs(hole.x - this.displayWidth) < minDistanceFromHazard) {
                return false;
            }
        }
        
        return true;
    }
    
    canSpawnRamp(upcomingObstacles, upcomingHoles, upcomingPlatforms) {
        const minDistanceFromObstacle = 200; // Reduced safe distance from obstacles
        const minDistanceFromHole = 180; // Reduced safe distance from holes
        const minDistanceFromPlatform = 150; // Reduced safe distance from platforms
        const strategicDistance = 600; // Distance to look ahead for strategic placement
        
        // Don't spawn ramp too close to obstacles
        for (let obstacle of upcomingObstacles) {
            if (Math.abs(obstacle.x - this.displayWidth) < minDistanceFromObstacle) {
                return false;
            }
        }
        
        // Don't spawn ramp too close to holes
        for (let hole of upcomingHoles) {
            if (Math.abs(hole.x - this.displayWidth) < minDistanceFromHole) {
                return false;
            }
        }
        
        // Don't spawn ramp too close to platforms
        for (let platform of upcomingPlatforms) {
            if (Math.abs(platform.x - this.displayWidth) < minDistanceFromPlatform) {
                return false;
            }
        }
        
        // Strategic placement: prefer to place ramps before obstacles or holes for tactical advantage
        const hasObstacleAhead = upcomingObstacles.some(obstacle => 
            obstacle.x - this.displayWidth > minDistanceFromObstacle && 
            obstacle.x - this.displayWidth < strategicDistance
        );
        
        const hasHoleAhead = upcomingHoles.some(hole => 
            hole.x - this.displayWidth > minDistanceFromHole && 
            hole.x - this.displayWidth < strategicDistance
        );
        
        // More lenient: spawn if strategic OR if no conflicts (even without strategic reason)
        return hasObstacleAhead || hasHoleAhead || (upcomingObstacles.length === 0 && upcomingHoles.length === 0);
    }
    
    scheduleHelpfulPlatform(offsetX = 150) {
        // Schedule a platform to appear at a helpful position
        const platform = {
            x: this.displayWidth + offsetX,
            y: this.displayHeight - this.groundHeight - 120 - Math.random() * 40, // 120-160 pixels above ground
            width: 100 + Math.random() * 40, // Bigger platforms for safety: 100-140px
            height: 15,
            type: 'platform'
        };
        this.platforms.push(platform);
    }
    
    checkCollisions() {
        // Check obstacle collisions
        this.obstacles.forEach(obstacle => {
            if (this.isColliding(this.player, obstacle)) {
                this.startDeathAnimation();
            }
        });
        
        // Check block collisions - improved top collision detection
        this.blocks.forEach(block => {
            const playerLeft = this.player.x;
            const playerRight = this.player.x + this.player.width;
            const playerTop = this.player.y;
            const playerBottom = this.player.y + this.player.height;
            
            const blockLeft = block.x;
            const blockRight = block.x + block.width;
            const blockTop = block.y;
            const blockBottom = block.y + block.height;
            
            // Check if player is overlapping with block horizontally
            const horizontalOverlap = playerRight > blockLeft && playerLeft < blockRight;
            
            if (horizontalOverlap) {
                // Check if player is approaching from above (top collision)
                const isComingFromAbove = this.player.velocityY >= 0 && playerTop < blockTop;
                const isLandingOnTop = playerBottom >= blockTop && playerBottom <= blockTop + 20;
                
                if (isComingFromAbove && isLandingOnTop) {
                    // Player is landing on top of block
                    this.player.y = blockTop - this.player.height;
                    this.player.velocityY = 0;
                    this.player.jumping = false;
                    this.player.grounded = true;
                    this.player.airJumpsLeft = 1;
                    return; // Exit early since we handled the collision
                }
                
                // Check if player is already standing on the block
                const isOnTop = this.player.grounded && Math.abs(playerBottom - blockTop) <= 5;
                if (isOnTop) {
                    // Keep player on top of block
                    this.player.y = blockTop - this.player.height;
                    this.player.velocityY = 0;
                    this.player.grounded = true;
                    return; // Exit early since we handled the collision
                }
                
                // Check for vertical overlap (player is inside the block)
                const verticalOverlap = playerBottom > blockTop + 5 && playerTop < blockBottom - 5;
                if (verticalOverlap) {
                    // Player is inside the block - push them out
                    if (playerBottom - blockTop < blockBottom - playerTop) {
                        // Push up (player is closer to top of block)
                        this.player.y = blockTop - this.player.height;
                        this.player.velocityY = 0;
                        this.player.grounded = true;
                    } else {
                        // Push down (player is closer to bottom of block)
                        this.player.y = blockBottom;
                        this.player.velocityY = 2; // Small downward velocity
                    }
                }
            }
        });
        
        // Check coin collisions
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (this.isColliding(this.player, coin)) {
                this.collectCoin(coin, i);
            }
        }
        
        // Check watch powerup collisions
        for (let i = this.watches.length - 1; i >= 0; i--) {
            const watch = this.watches[i];
            if (this.isColliding(this.player, watch)) {
                this.collectWatch(watch, i);
            }
        }
        
        // Check platform collisions (player can land on them)
        this.platforms.forEach(platform => {
            if (this.isCollidingWithPlatform(this.player, platform)) {
                // Player is on platform
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.jumping = false;
                this.player.grounded = true;
                this.player.baseY = this.player.y;
                this.player.airJumpsLeft = 1; // Reset air jumps when landing on platform
            }
        });
        
        // Check hole collisions (player falls and dies)
        this.holes.forEach(hole => {
            if (this.isCollidingWithHole(this.player, hole)) {
                this.startDeathAnimation();
            }
        });
        
        // Check ramp collisions (player can run up them)
        this.ramps.forEach(ramp => {
            if (this.isCollidingWithRamp(this.player, ramp)) {
                this.handleRampCollision(this.player, ramp);
            }
        });
        
        // Check bird collisions (deadly)
        this.birds.forEach(bird => {
            if (this.isColliding(this.player, bird)) {
                this.startDeathAnimation();
            }
        });
        
        // Check snail collisions (deadly)
        this.snails.forEach(snail => {
            if (this.isColliding(this.player, snail)) {
                this.startDeathAnimation();
            }
        });
    }
    
    isColliding(rect1, rect2) {
        // More forgiving collision detection for better gameplay
        const margin = 8; // Add 8 pixel margin for more forgiving collisions
        
        return rect1.x + margin < rect2.x + (rect2.width || rect2.size) &&
               rect1.x + rect1.width - margin > rect2.x &&
               rect1.y + margin < rect2.y + (rect2.height || rect2.size) &&
               rect1.y + rect1.height - margin > rect2.y;
    }
    
    isCollidingWithPlatform(player, platform) {
        // Check if player is falling onto platform from above
        return player.x < platform.x + platform.width &&
               player.x + player.width > platform.x &&
               player.y + player.height >= platform.y &&
               player.y + player.height <= platform.y + platform.height + 10 && // Allow landing within 10 pixels
               player.velocityY >= 0; // Only when falling
    }
    
    isCollidingWithHole(player, hole) {
        // Check if player's feet are in the hole area and they're at ground level
        const playerBottom = player.y + player.height;
        const groundLevel = this.displayHeight - this.groundHeight;
        
        return player.x < hole.x + hole.width &&
               player.x + player.width > hole.x &&
               playerBottom >= groundLevel; // Player is at or below ground level
    }
    
    isCollidingWithBlock(player, block) {
        // Standard AABB collision detection
        return player.x < block.x + block.width &&
               player.x + player.width > block.x &&
               player.y < block.y + block.height &&
               player.y + player.height > block.y;
    }
    
    startDeathAnimation() {
        if (this.deathAnimation.active) return; // Already dying
        
        this.deathAnimation.active = true;
        this.deathAnimation.timer = 0;
        this.deathAnimation.rotation = 0;
        this.deathAnimation.scale = 1;
        
        // Play death sound
        if (this.sounds.death) {
            this.sounds.death();
        }
        
        // Stop world movement during death
        this.worldSpeed = 0;
    }
    
    isCollidingWithRamp(player, ramp) {
        // Check if player is touching the ramp
        return player.x < ramp.x + ramp.width &&
               player.x + player.width > ramp.x &&
               player.y + player.height >= ramp.y &&
               player.y + player.height <= ramp.y + ramp.height + 10; // Allow some tolerance
    }
    
    handleRampCollision(player, ramp) {
        // Calculate the ramp surface height at player's x position
        const relativeX = Math.max(0, Math.min(ramp.width, player.x + player.width/2 - ramp.x));
        const rampSurfaceY = ramp.y + ramp.height - (relativeX * ramp.slope);
        
        // Only apply ramp physics if player is on or near the ramp surface
        if (player.y + player.height >= rampSurfaceY - 5) {
            player.y = rampSurfaceY - player.height;
            player.velocityY = 0;
            player.grounded = true;
            player.jumping = false;
            player.baseY = player.y;
            player.airJumpsLeft = 1; // Reset air jumps when on ramp
            
            // Give player a slight upward boost when leaving the ramp
            if (relativeX >= ramp.width - 5) { // Near the end of the ramp
                player.velocityY = -8; // Boost upward
                player.grounded = false;
            }
        }
    }
    
    collectCoin(coin, index) {
        const basePoints = 10;
        const pointsEarned = basePoints * coin.multiplier;
        this.coinScore += pointsEarned;
        
        // Play coin sound
        if (this.sounds.coin) {
            this.sounds.coin();
        }
        
        // Ensure coin score doesn't go below 0
        if (this.coinScore < 0) {
            this.coinScore = 0;
        }
        
        // Create floating score text
        this.createScorePopup(coin.x, coin.y, pointsEarned, coin.multiplier);
        
        this.coins.splice(index, 1);
        
        // Create particle effect with coin's color
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: coin.x + coin.size / 2,
                y: coin.y + coin.size / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 40,
                maxLife: 40,
                color: coin.color
            });
        }
    }
    
    collectWatch(watch, index) {
        // Add 10 seconds to the timer
        this.gameTimeRemaining = Math.min(this.gameTimeLimit, this.gameTimeRemaining + 10);
        
        // Play watch sound
        if (this.sounds.watch) {
            this.sounds.watch();
        }
        
        // Create time bonus popup (modify createScorePopup to accept custom text)
        this.createTimePopup(watch.x, watch.y, '+10 SEC');
        
        // Remove the watch
        this.watches.splice(index, 1);
        
        // Create particle effect with gold color
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: watch.x + watch.width / 2,
                y: watch.y + watch.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 50,
                maxLife: 50,
                color: '#FFD700' // Gold color
            });
        }
    }
    
    createTimePopup(x, y, text) {
        const popup = {
            x: x,
            y: y,
            text: text,
            life: 80,
            maxLife: 80,
            velocityY: -2,
            color: '#4CAF50' // Green for time bonus
        };
        this.scorePopups.push(popup);
    }
    
    createScorePopup(x, y, points, multiplier) {
        const popup = {
            x: x,
            y: y,
            points: points,
            multiplier: multiplier,
            life: 60, // 1 second at 60fps
            maxLife: 60,
            velocityY: -2 // Float upward
        };
        this.scorePopups.push(popup);
    }
    
    updateScorePopups() {
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.life--;
            popup.y += popup.velocityY;
            popup.velocityY += 0.05; // Slight gravity
            
            if (popup.life <= 0) {
                this.scorePopups.splice(i, 1);
            }
        }
    }
    
    updateScore() {
        // Score = coin points + distance points (1 point per 10 pixels of NEW ground covered)
        // Only award points for the furthest distance reached, not total distance traveled
        const distanceScore = Math.floor(this.maxDistanceReached / 10);
        this.score = this.coinScore + distanceScore;
        
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.body.classList.remove('playing'); // Hide mobile controls
        
        // Stop background music and running sound
        this.stopBackgroundMusic();
        if (this.runningSound && this.runningSound.isPlaying) {
            this.runningSound.stop();
        }
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString());
            this.updateHighScoreDisplay();
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHighScore').textContent = this.highScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
        
        if (!this.assetsLoaded) {
            // Show loading screen
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Loading...', this.displayWidth / 2, this.displayHeight / 2);
            return;
        }
        
        this.renderBackground();
        this.renderGround();
        this.renderHoles(); // Render holes before ground
        this.renderRamps(); // Render ramps on ground
        this.renderBlocks(); // Render jumpable blocks
        this.renderBirds(); // Render flying enemies
        this.renderSnails(); // Render ground enemies
        this.renderWatches(); // Render time powerups
        this.renderClouds();
        this.renderPlatforms();
        this.renderCoins();
        this.renderObstacles();
        this.renderPlayer();
        this.renderParticles();
        this.renderScorePopups();
    }
    
    renderBackground() {
        // Dynamic sky gradient based on time of day
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        
        // Calculate sky colors based on time of day
        const skyColors = this.getSkyColors(this.timeOfDay);
        gradient.addColorStop(0, skyColors.top);
        gradient.addColorStop(0.7, skyColors.middle);
        gradient.addColorStop(1, skyColors.bottom);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
        
        // Render celestial objects (sun, moon, stars)
        this.renderCelestialObjects();
        
        // Render mountains (furthest back)
        this.renderMountains();
        
        // Render hills (middle distance)
        this.renderHills();
        
        // Render trees (closest background elements)
        this.renderTrees();
    }
    
    getSkyColors(timeOfDay) {
        // timeOfDay: 0 = dawn, 0.25 = day, 0.5 = dusk, 0.75 = night, 1 = dawn
        const colors = {};
        
        if (timeOfDay < 0.125) { // Early dawn
            const t = timeOfDay / 0.125;
            colors.top = this.interpolateColor('#1a1a2e', '#ff6b6b', t);
            colors.middle = this.interpolateColor('#16213e', '#ffa500', t);
            colors.bottom = this.interpolateColor('#0f3460', '#ffb347', t);
        } else if (timeOfDay < 0.375) { // Dawn to day
            const t = (timeOfDay - 0.125) / 0.25;
            colors.top = this.interpolateColor('#ff6b6b', '#87ceeb', t);
            colors.middle = this.interpolateColor('#ffa500', '#e6f3ff', t);
            colors.bottom = this.interpolateColor('#ffb347', '#f0f8ff', t);
        } else if (timeOfDay < 0.625) { // Day to dusk
            const t = (timeOfDay - 0.375) / 0.25;
            colors.top = this.interpolateColor('#87ceeb', '#ff4500', t);
            colors.middle = this.interpolateColor('#e6f3ff', '#ff6347', t);
            colors.bottom = this.interpolateColor('#f0f8ff', '#ffd700', t);
        } else if (timeOfDay < 0.875) { // Dusk to night
            const t = (timeOfDay - 0.625) / 0.25;
            colors.top = this.interpolateColor('#ff4500', '#0c0c0c', t);
            colors.middle = this.interpolateColor('#ff6347', '#1a1a2e', t);
            colors.bottom = this.interpolateColor('#ffd700', '#2c2c54', t);
        } else { // Night to dawn
            const t = (timeOfDay - 0.875) / 0.125;
            colors.top = this.interpolateColor('#0c0c0c', '#1a1a2e', t);
            colors.middle = this.interpolateColor('#1a1a2e', '#16213e', t);
            colors.bottom = this.interpolateColor('#2c2c54', '#0f3460', t);
        }
        
        return colors;
    }
    
    interpolateColor(color1, color2, factor) {
        // Convert hex to RGB
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        // Interpolate
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    renderCelestialObjects() {
        const sunMoonSize = 40;
        const sunMoonY = this.displayHeight * 0.15;
        
        // Calculate sun/moon position based on time of day
        const celestialX = this.displayWidth * 0.2 + (this.displayWidth * 0.6) * this.timeOfDay;
        
        if (this.timeOfDay < 0.5) { // Day time - show sun
            const sunOpacity = 1 - Math.abs(this.timeOfDay - 0.25) * 4; // Brightest at 0.25 (noon)
            if (sunOpacity > 0) {
                // Sun glow
                const glowGradient = this.ctx.createRadialGradient(celestialX, sunMoonY, 0, celestialX, sunMoonY, sunMoonSize * 1.5);
                glowGradient.addColorStop(0, `rgba(255, 255, 0, ${sunOpacity * 0.3})`);
                glowGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
                this.ctx.fillStyle = glowGradient;
                this.ctx.fillRect(celestialX - sunMoonSize * 1.5, sunMoonY - sunMoonSize * 1.5, 
                                sunMoonSize * 3, sunMoonSize * 3);
                
                // Sun
                this.ctx.fillStyle = `rgba(255, 215, 0, ${sunOpacity})`;
                this.ctx.beginPath();
                this.ctx.arc(celestialX, sunMoonY, sunMoonSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else { // Night time - show moon and stars
            const moonOpacity = 1 - Math.abs(this.timeOfDay - 0.75) * 4; // Brightest at 0.75 (midnight)
            if (moonOpacity > 0) {
                // Moon
                this.ctx.fillStyle = `rgba(245, 245, 220, ${moonOpacity})`;
                this.ctx.beginPath();
                this.ctx.arc(celestialX, sunMoonY, sunMoonSize * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Moon craters
                this.ctx.fillStyle = `rgba(200, 200, 180, ${moonOpacity * 0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(celestialX - 10, sunMoonY - 8, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(celestialX + 8, sunMoonY + 5, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Stars
            if (this.timeOfDay > 0.6 && this.timeOfDay < 0.9) {
                this.renderStars();
            }
        }
    }
    
    renderStars() {
        // Generate consistent stars based on a seed
        const starCount = 50;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 0; i < starCount; i++) {
            // Use deterministic positions so stars don't flicker
            const x = (i * 137.5) % this.displayWidth; // Golden angle for distribution
            const y = (i * 73.2) % (this.displayHeight * 0.4); // Only in upper 40% of sky
            const size = 1 + (i % 3); // Varying star sizes
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderMountains() {
        this.mountains.forEach(mountain => {
            this.ctx.fillStyle = '#D3D3D3'; // Light gray mountains
            this.ctx.beginPath();
            this.ctx.moveTo(mountain.x, this.displayHeight - this.groundHeight);
            this.ctx.lineTo(mountain.x + mountain.width / 3, mountain.y);
            this.ctx.lineTo(mountain.x + mountain.width * 2/3, mountain.y + mountain.height * 0.3);
            this.ctx.lineTo(mountain.x + mountain.width, mountain.y + mountain.height * 0.7);
            this.ctx.lineTo(mountain.x + mountain.width, this.displayHeight - this.groundHeight);
            this.ctx.closePath();
            this.ctx.fill();
        });
    }
    
    renderHills() {
        this.hills.forEach(hill => {
            this.ctx.fillStyle = '#E0E0E0'; // Slightly darker gray for hills
            this.ctx.beginPath();
            this.ctx.ellipse(hill.x + hill.width/2, hill.y + hill.height, hill.width/2, hill.height/2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderTrees() {
        this.trees.forEach(tree => {
            const visualX = tree.x; // Use direct position
            
            if (tree.type === 'pine') {
                // Pine tree
                this.ctx.fillStyle = '#8FBC8F'; // Dark sea green
                // Tree trunk
                this.ctx.fillRect(visualX + tree.width/2 - 2, tree.y + tree.height - 15, 4, 15);
                // Tree triangles
                this.ctx.beginPath();
                this.ctx.moveTo(visualX + tree.width/2, tree.y);
                this.ctx.lineTo(visualX, tree.y + tree.height * 0.4);
                this.ctx.lineTo(visualX + tree.width, tree.y + tree.height * 0.4);
                this.ctx.closePath();
                this.ctx.fill();
                
                this.ctx.beginPath();
                this.ctx.moveTo(visualX + tree.width/2, tree.y + tree.height * 0.2);
                this.ctx.lineTo(visualX + tree.width * 0.1, tree.y + tree.height * 0.7);
                this.ctx.lineTo(visualX + tree.width * 0.9, tree.y + tree.height * 0.7);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                // Oak tree
                this.ctx.fillStyle = '#8B4513'; // Saddle brown trunk
                this.ctx.fillRect(visualX + tree.width/2 - 3, tree.y + tree.height - 20, 6, 20);
                
                this.ctx.fillStyle = '#9ACD32'; // Yellow green leaves
                this.ctx.beginPath();
                this.ctx.arc(visualX + tree.width/2, tree.y + tree.height * 0.3, tree.width/2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderGround() {
        // Ground - subtle green
        this.ctx.fillStyle = '#C8E6C8';
        this.ctx.fillRect(0, this.displayHeight - this.groundHeight, this.displayWidth, this.groundHeight);
        
        // Subtract holes from ground (render ground around holes)
        this.holes.forEach(hole => {
            this.ctx.fillStyle = '#87CEEB'; // Sky color for hole
            this.ctx.fillRect(hole.x, hole.y, hole.width, hole.height);
        });
        
        // Subtle ground pattern (avoiding holes)
        this.ctx.fillStyle = '#B8D6B8';
        for (let x = this.backgroundX % 60; x < this.displayWidth; x += 60) {
            let drawPattern = true;
            // Check if this pattern segment overlaps with any hole
            this.holes.forEach(hole => {
                if (x < hole.x + hole.width && x + 30 > hole.x) {
                    drawPattern = false;
                }
            });
            if (drawPattern) {
                this.ctx.fillRect(x, this.displayHeight - this.groundHeight, 30, this.groundHeight);
            }
        }
        
        // Ground texture lines
        this.ctx.strokeStyle = '#A8C6A8';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.displayHeight - this.groundHeight);
        this.ctx.lineTo(this.displayWidth, this.displayHeight - this.groundHeight);
        this.ctx.stroke();
    }
    
    renderHoles() {
        this.holes.forEach(hole => {
            // Render hole as darker area
            this.ctx.fillStyle = '#2F4F4F'; // Dark gray for hole depth
            this.ctx.fillRect(hole.x, hole.y, hole.width, hole.height);
            
            // Add hole edges
            this.ctx.strokeStyle = '#1C1C1C';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(hole.x, hole.y, hole.width, hole.height);
        });
    }
    
    renderRamps() {
        this.ramps.forEach(ramp => {
            this.ctx.save();
            
            // Main ramp body - earthy brown
            this.ctx.fillStyle = '#8B4513'; // Brown ramp
            this.ctx.beginPath();
            this.ctx.moveTo(ramp.x, ramp.y + ramp.height); // Bottom left
            this.ctx.lineTo(ramp.x + ramp.width, ramp.y + ramp.height); // Bottom right
            this.ctx.lineTo(ramp.x + ramp.width, ramp.y); // Top right
            this.ctx.lineTo(ramp.x, ramp.y + ramp.height); // Back to bottom left
            this.ctx.fill();
            
            // Ramp surface - lighter brown
            this.ctx.fillStyle = '#D2B48C';
            this.ctx.beginPath();
            this.ctx.moveTo(ramp.x, ramp.y + ramp.height); // Bottom left
            this.ctx.lineTo(ramp.x + ramp.width, ramp.y); // Top right
            this.ctx.lineTo(ramp.x + ramp.width, ramp.y + 3); // Top right with thickness
            this.ctx.lineTo(ramp.x, ramp.y + ramp.height); // Back to bottom left
            this.ctx.fill();
            
            // Ramp edges for definition
            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(ramp.x, ramp.y + ramp.height);
            this.ctx.lineTo(ramp.x + ramp.width, ramp.y);
            this.ctx.stroke();
            
            // Side edge
            this.ctx.beginPath();
            this.ctx.moveTo(ramp.x + ramp.width, ramp.y);
            this.ctx.lineTo(ramp.x + ramp.width, ramp.y + ramp.height);
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    renderBlocks() {
        this.blocks.forEach(block => {
            this.ctx.save();
            
            // Main block body - stone gray
            this.ctx.fillStyle = '#696969';
            this.ctx.fillRect(block.x, block.y, block.width, block.height);
            
            // Block outline - darker gray
            this.ctx.strokeStyle = '#2F2F2F';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(block.x, block.y, block.width, block.height);
            
            // Add some texture lines
            this.ctx.strokeStyle = '#808080';
            this.ctx.lineWidth = 1;
            
            // Horizontal lines
            for (let i = 1; i < 3; i++) {
                const y = block.y + (block.height / 3) * i;
                this.ctx.beginPath();
                this.ctx.moveTo(block.x + 5, y);
                this.ctx.lineTo(block.x + block.width - 5, y);
                this.ctx.stroke();
            }
            
            // Vertical lines
            for (let i = 1; i < 3; i++) {
                const x = block.x + (block.width / 3) * i;
                this.ctx.beginPath();
                this.ctx.moveTo(x, block.y + 5);
                this.ctx.lineTo(x, block.y + block.height - 5);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        });
    }
    
    renderBirds() {
        this.birds.forEach(bird => {
            this.ctx.save();
            
            // Use bird image if loaded, otherwise draw a simple bird shape
            if (this.assetsLoaded && this.birdImage.complete) {
                // Apply wing flapping animation
                this.ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
                this.ctx.translate(0, bird.wingOffset); // Vertical bobbing
                this.ctx.translate(-bird.width/2, -bird.height/2);
                
                this.ctx.drawImage(this.birdImage, 0, 0, bird.width, bird.height);
            } else {
                // Fallback: draw a simple bird shape
                this.ctx.fillStyle = '#4A4A4A'; // Dark gray bird
                
                // Bird body (oval)
                this.ctx.beginPath();
                this.ctx.ellipse(bird.x + bird.width/2, bird.y + bird.height/2 + bird.wingOffset, 
                               bird.width/3, bird.height/2, 0, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Simple wings
                this.ctx.fillStyle = '#666666';
                this.ctx.beginPath();
                this.ctx.ellipse(bird.x + bird.width/4, bird.y + bird.height/2 + bird.wingOffset, 
                               bird.width/4, bird.height/4, 0, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.beginPath();
                this.ctx.ellipse(bird.x + 3*bird.width/4, bird.y + bird.height/2 + bird.wingOffset, 
                               bird.width/4, bird.height/4, 0, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    renderSnails() {
        this.snails.forEach(snail => {
            this.ctx.save();
            
            // Use snail image if loaded, otherwise draw a simple snail shape
            if (this.assetsLoaded && this.snailImage.complete) {
                // Apply shell bobbing animation
                this.ctx.translate(snail.x + snail.width/2, snail.y + snail.height/2);
                this.ctx.translate(0, snail.shellOffset); // Vertical bobbing
                this.ctx.translate(-snail.width/2, -snail.height/2);
                
                this.ctx.drawImage(this.snailImage, 0, 0, snail.width, snail.height);
            } else {
                // Fallback: draw a simple snail shape
                // Snail body (elongated oval)
                this.ctx.fillStyle = '#8B4513'; // Brown body
                this.ctx.beginPath();
                this.ctx.ellipse(snail.x + snail.width/3, snail.y + 2*snail.height/3 + snail.shellOffset, 
                               snail.width/3, snail.height/4, 0, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Shell (circle)
                this.ctx.fillStyle = '#D2B48C'; // Tan shell
                this.ctx.beginPath();
                this.ctx.arc(snail.x + 2*snail.width/3, snail.y + snail.height/2 + snail.shellOffset, 
                           snail.height/3, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Shell spiral
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(snail.x + 2*snail.width/3, snail.y + snail.height/2 + snail.shellOffset, 
                           snail.height/6, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        });
    }
    
    renderWatches() {
        this.watches.forEach(watch => {
            this.ctx.save();
            
            // Watch position with floating effect
            const renderX = watch.x;
            const renderY = watch.y + watch.floatOffset;
            
            // Glowing effect
            const glowSize = watch.width * 1.5;
            const gradient = this.ctx.createRadialGradient(
                renderX + watch.width/2, renderY + watch.height/2, 0,
                renderX + watch.width/2, renderY + watch.height/2, glowSize
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${watch.glowIntensity})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(renderX - glowSize/2, renderY - glowSize/2, 
                             watch.width + glowSize, watch.height + glowSize);
            
            // Watch body (simple clock shape)
            this.ctx.fillStyle = '#FFD700'; // Gold
            this.ctx.beginPath();
            this.ctx.arc(renderX + watch.width/2, renderY + watch.height/2, 
                        watch.width/2 - 2, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Watch face
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(renderX + watch.width/2, renderY + watch.height/2, 
                        watch.width/2 - 6, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Clock hands
            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            
            // Hour hand
            this.ctx.beginPath();
            this.ctx.moveTo(renderX + watch.width/2, renderY + watch.height/2);
            this.ctx.lineTo(renderX + watch.width/2 + 6, renderY + watch.height/2 - 6);
            this.ctx.stroke();
            
            // Minute hand
            this.ctx.beginPath();
            this.ctx.moveTo(renderX + watch.width/2, renderY + watch.height/2);
            this.ctx.lineTo(renderX + watch.width/2 - 8, renderY + watch.height/2 - 2);
            this.ctx.stroke();
            
            // Center dot
            this.ctx.fillStyle = '#333333';
            this.ctx.beginPath();
            this.ctx.arc(renderX + watch.width/2, renderY + watch.height/2, 2, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    renderPlatforms() {
        this.platforms.forEach(platform => {
            // Platform base
            this.ctx.fillStyle = '#8B4513'; // Brown platform
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Platform top surface
            this.ctx.fillStyle = '#D2B48C'; // Lighter brown top
            this.ctx.fillRect(platform.x, platform.y, platform.width, 3);
            
            // Platform edges
            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });
    }
    
    renderClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(cloud.x - cloud.size * 0.5, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderPlayer() {
        this.ctx.save();
        
        // Calculate visual position with bounce effect
        const visualY = this.player.y + this.player.runBounce;
        
        // Calculate animation effects
        const centerX = this.player.x + this.player.width / 2;
        const centerY = visualY + this.player.height / 2;
        
        // Move to center for transformations
        this.ctx.translate(centerX, centerY);
        
        // Animation effects
        let rotation = 0;
        let scaleX = 1;
        let scaleY = 1;
        
        // Death animation overrides all other animations
        if (this.deathAnimation.active) {
            rotation = this.deathAnimation.rotation;
            scaleX = scaleY = this.deathAnimation.scale;
        } else if (this.gameState === 'playing') {
            if (this.player.jumping) {
                // Slight forward lean when jumping
                rotation = 0.1; // 0.1 radians forward lean
                scaleY = 1.05; // Slightly stretched
            } else if (this.player.grounded) {
                // Running animation effects
                const runPhase = Math.sin(this.player.runCycle);
                
                // Subtle horizontal squash and stretch
                scaleX = 1 + runPhase * 0.05; // Slight width variation
                scaleY = 1 - runPhase * 0.03; // Slight height variation
                
                // Very subtle lean forward while running
                rotation = 0.02 + Math.sin(this.player.runCycle * 2) * 0.01;
            }
        }
        
        // Apply transformations
        this.ctx.rotate(rotation);
        this.ctx.scale(scaleX, scaleY);
        
        if (this.assetsLoaded && this.heroImage.complete) {
            // Render hero image with animations
            this.ctx.drawImage(
                this.heroImage, 
                -this.player.width / 2, 
                -this.player.height / 2, 
                this.player.width, 
                this.player.height
            );
        } else {
            // Fallback: simple rectangle while loading
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.fillRect(
                -this.player.width / 2, 
                -this.player.height / 2, 
                this.player.width, 
                this.player.height
            );
        }
        
        this.ctx.restore();
    }
    
    renderObstacles() {
        this.obstacles.forEach(obstacle => {
            if (this.assetsLoaded && this.hurdleImage.complete) {
                // Render hurdle image
                this.ctx.drawImage(this.hurdleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else {
                // Fallback rectangle while loading
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Add simple hurdle pattern
                this.ctx.fillStyle = '#654321';
                this.ctx.fillRect(obstacle.x, obstacle.y + 10, obstacle.width, 5);
                this.ctx.fillRect(obstacle.x, obstacle.y + 25, obstacle.width, 5);
                this.ctx.fillRect(obstacle.x, obstacle.y + 40, obstacle.width, 5);
            }
        });
    }
    
    renderCoins() {
        this.coins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x + coin.size / 2, coin.y + coin.size / 2);
            
            // Pulsing effect for higher value coins
            const pulseScale = 1 + Math.sin(coin.pulseTime) * 0.1 * Math.abs(coin.multiplier);
            this.ctx.scale(pulseScale, pulseScale);
            
            // Rotate only for the coin background, not the text
            this.ctx.rotate(coin.rotation);
            
            // Render coin with multiplier colors
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size / 2);
            gradient.addColorStop(0, coin.color);
            gradient.addColorStop(0.7, coin.color);
            gradient.addColorStop(1, this.darkenColor(coin.color, 0.3));
            this.ctx.fillStyle = gradient;
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Border
            this.ctx.strokeStyle = this.darkenColor(coin.color, 0.5);
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Reset rotation for text so it stays upright
            this.ctx.rotate(-coin.rotation);
            
            // Multiplier text (now upright)
            this.ctx.fillStyle = coin.textColor;
            this.ctx.font = `bold ${coin.size * 0.4}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const text = coin.multiplier > 0 ? `${coin.multiplier}x` : `${coin.multiplier}x`;
            this.ctx.fillText(text, 0, 0);
            
            this.ctx.restore();
        });
    }
    
    darkenColor(color, factor) {
        // Convert hex to RGB, darken, and convert back
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
        
        return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
    }
    
    renderScorePopups() {
        this.scorePopups.forEach(popup => {
            const alpha = popup.life / popup.maxLife;
            this.ctx.save();
            
            let text, fillColor, strokeColor;
            
            if (popup.text) {
                // Time popup (has custom text)
                text = popup.text;
                fillColor = popup.color || '#4CAF50'; // Green for time
                strokeColor = 'rgba(0, 0, 0, ' + alpha + ')';
            } else {
                // Score popup (has points)
                text = popup.points > 0 ? `+${popup.points}` : `${popup.points}`;
                fillColor = popup.points > 0 ? '#00FF00' : '#FF0000';
                strokeColor = 'rgba(0, 0, 0, ' + alpha + ')';
            }
            
            // Extract RGB from hex color for alpha
            const hexMatch = fillColor.match(/^#([0-9a-f]{6})$/i);
            if (hexMatch) {
                const hex = hexMatch[1];
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
                this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`; // Fallback
            }
            
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2;
            
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Text outline
            this.ctx.strokeText(text, popup.x, popup.y);
            this.ctx.fillText(text, popup.x, popup.y);
            
            this.ctx.restore();
        });
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / 30;
            this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fillRect(particle.x, particle.y, 3, 3);
        });
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    console.log('Starting Infinite Runner game...');
    new InfiniteRunner();
});

// Handle window resize
window.addEventListener('resize', () => {
    // Debounce resize events
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        location.reload(); // Simple approach for now
    }, 250);
});
