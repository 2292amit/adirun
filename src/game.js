class InfiniteRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'gameOver'
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
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
        this.clouds = [];
        this.platforms = []; // Aerial platforms
        this.holes = []; // Ground holes
        this.scheduledPlatforms = []; // Platforms scheduled to help with obstacles
        
        // Background
        this.backgroundX = 0;
        this.mountainX = 0;
        this.worldOffset = 0; // World movement for progressive speed
        
        // Setup canvas now that ground height is defined
        this.setupCanvas();
        
        // Timing
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.cloudTimer = 0;
        this.platformTimer = 0;
        this.holeTimer = 0;
        
        // Assets loading
        this.assetsLoaded = false;
        this.loadAssets();
        
        // Initialize player position now that canvas and player are set up
        this.initializePlayerPosition();
        
        // Input handling
        this.setupInput();
        
        // UI elements
        this.setupUI();
        
        // Start game loop
        this.gameLoop();
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
        
        let loadedAssets = 0;
        const totalAssets = 3;
        
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
        
        this.heroImage.onerror = () => onAssetError('hero.png');
        this.coinImage.onerror = () => onAssetError('coin.png');
        this.hurdleImage.onerror = () => onAssetError('hurdle.png');
        
        const timestamp = Date.now();
        this.heroImage.src = `icons/hero.png?v=${timestamp}`;
        this.coinImage.src = `icons/coin.png?v=${timestamp}`;
        this.hurdleImage.src = `icons/hurdle.png?v=${timestamp}`;
        
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
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleJump();
            }
        });
        
        // Touch input for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleJump();
        });
        
        // Mouse input
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleJump();
        });
        
        // Prevent scrolling on mobile
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
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
    
    handleJump() {
        if (this.gameState === 'start') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            // Allow jumping if grounded OR if air jumps are available
            const canJump = (this.player.grounded || this.player.airJumpsLeft > 0) && 
                           this.player.jumpCooldown <= 0;
            
            if (canJump) {
                this.player.velocityY = -22; // Jump power
                this.player.jumping = true;
                this.player.jumpCooldown = 10; // 10 frame cooldown
                
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
        document.getElementById('startScreen').classList.add('hidden');
        this.resetGame();
    }
    
    restartGame() {
        this.gameState = 'playing';
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.resetGame();
    }
    
    resetGame() {
        this.score = 0;
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
        this.platforms = [];
        this.holes = [];
        this.scheduledPlatforms = [];
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.platformTimer = 0;
        this.holeTimer = 0;
        this.backgroundX = 0;
        this.worldOffset = 0;
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
        
        this.updatePlayer();
        this.updateObstacles();
        this.updateCoins();
        this.updatePlatforms();
        this.updateHoles();
        this.updateParticles();
        this.updateBackground();
        this.updateGameSpeed();
        this.spawnObjects();
        this.checkCollisions();
        this.updateScore();
    }
    
    updatePlayer() {
        // Update animation time and cooldowns - increased for more lively animation
        this.player.animationTime += 0.3; // Increased from 0.2 to 0.3
        if (this.player.jumpCooldown > 0) {
            this.player.jumpCooldown--;
        }
        
        // Progressive speed increase based on time, not accumulation
        const gameTime = this.player.animationTime / 60; // Convert to seconds
        this.worldOffset = Math.min(gameTime * 0.01, 1); // Very gradual increase, max +1 speed
        
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
            
            // Return player to original horizontal position when landing
            if (this.player.x > 120) {
                this.player.x += (120 - this.player.x) * 0.1; // Smooth return to original position
            }
        } else {
            this.player.grounded = false;
            this.player.runBounce = 0; // Reset bounce when not grounded
        }
        
        // Running animation (only when grounded) - but don't modify actual Y position for physics
        if (this.player.grounded && this.gameState === 'playing') {
            // Create bouncing effect for running - increased speed for more lively animation
            this.player.runCycle += 0.5; // Increased from 0.3 to 0.5 for faster animation
            this.player.runBounce = Math.sin(this.player.runCycle) * 4; // Increased bounce from 3 to 4 pixels
            // Don't modify this.player.y - use runBounce in rendering instead
        }
    }
    
    updateObstacles() {
        const totalSpeed = this.gameSpeed + this.worldOffset;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= totalSpeed;
            
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    updateCoins() {
        const totalSpeed = this.gameSpeed + this.worldOffset;
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= totalSpeed;
            coin.rotation += 0.1;
            
            if (coin.x + coin.size < 0) {
                this.coins.splice(i, 1);
            }
        }
    }
    
    updatePlatforms() {
        const totalSpeed = this.gameSpeed + this.worldOffset;
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            platform.x -= totalSpeed;
            
            if (platform.x + platform.width < 0) {
                this.platforms.splice(i, 1);
            }
        }
    }
    
    updateHoles() {
        const totalSpeed = this.gameSpeed + this.worldOffset;
        for (let i = this.holes.length - 1; i >= 0; i--) {
            const hole = this.holes[i];
            hole.x -= totalSpeed;
            
            if (hole.x + hole.width < 0) {
                this.holes.splice(i, 1);
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
        // Add progressive speed to background movement
        const totalSpeed = this.gameSpeed + this.worldOffset;
        this.backgroundX -= totalSpeed * 0.5;
        
        // Update trees
        this.trees.forEach(tree => {
            tree.x -= this.gameSpeed * tree.speed;
            if (tree.x + tree.width < 0) {
                tree.x = this.displayWidth + Math.random() * 200;
                tree.y = this.displayHeight - this.groundHeight - 60 - Math.random() * 40;
                tree.height = 40 + Math.random() * 30;
            }
        });
        
        // Update mountains
        this.mountains.forEach(mountain => {
            mountain.x -= this.gameSpeed * mountain.speed;
            if (mountain.x + mountain.width < 0) {
                mountain.x = this.displayWidth + Math.random() * 100;
            }
        });
        
        // Update hills
        this.hills.forEach(hill => {
            hill.x -= this.gameSpeed * hill.speed;
            if (hill.x + hill.width < 0) {
                hill.x = this.displayWidth + Math.random() * 150;
            }
        });
        
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.displayWidth + cloud.size;
                cloud.y = Math.random() * (this.displayHeight * 0.4);
            }
        });
    }
    
    updateGameSpeed() {
        this.gameSpeed += this.speedIncrement;
    }
    
    spawnObjects() {
        // Smart spawning system to ensure playability
        this.obstacleTimer++;
        this.coinTimer++;
        this.platformTimer++;
        this.holeTimer++;
        
        // Check what's coming up in the next 300-500 pixels to avoid conflicts
        const upcomingObstacles = this.getUpcomingObstacles();
        const upcomingHoles = this.getUpcomingHoles();
        const upcomingPlatforms = this.getUpcomingPlatforms();
        
        // Spawn obstacles with smart spacing
        const minObstacleSpacing = 250; // Minimum safe distance between obstacles
        if (this.obstacleTimer > minObstacleSpacing) {
            const canSpawnObstacle = this.canSpawnObstacle(upcomingHoles, upcomingPlatforms);
            if (canSpawnObstacle) {
                this.spawnObstacle();
                this.obstacleTimer = 0;
                
                // If we spawn a difficult obstacle, ensure there's a platform nearby to help
                if (Math.random() < 0.3) { // 30% chance for challenging obstacles
                    this.scheduleHelpfulPlatform();
                }
            }
        }
        
        // Spawn holes with strategic spacing
        const minHoleSpacing = 400; // Holes should be less frequent
        if (this.holeTimer > minHoleSpacing) {
            const canSpawnHole = this.canSpawnHole(upcomingObstacles, upcomingPlatforms);
            if (canSpawnHole) {
                this.spawnHole();
                this.holeTimer = 0;
                
                // Always provide a platform before a hole for escape route
                this.scheduleHelpfulPlatform(-100); // Platform 100 pixels before hole
            }
        }
        
        // Spawn platforms strategically (less frequently, more purposeful)
        const minPlatformSpacing = 450; // Increased spacing for more strategic placement
        if (this.platformTimer > minPlatformSpacing) {
            // Only spawn if there's a reasonable gap and not too many platforms nearby
            const nearbyPlatforms = upcomingPlatforms.filter(p => p.x < this.displayWidth + 300);
            if (nearbyPlatforms.length < 2) { // Limit platform density
                this.spawnPlatform();
                this.platformTimer = 0;
            }
        }
        
        // Spawn coins between obstacles
        const minCoinSpacing = 180;
        if (this.coinTimer > minCoinSpacing) {
            const canSpawnCoin = this.canSpawnCoin(upcomingObstacles, upcomingHoles);
            if (canSpawnCoin) {
                this.spawnCoin();
                this.coinTimer = 0;
            }
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
        const coin = {
            x: this.displayWidth,
            y: this.displayHeight - this.groundHeight - 90 - Math.random() * 120, // Adjusted for bigger coin
            size: 40, // Increased from 30 to 40 for zoom effect
            rotation: 0,
            collected: false
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
    
    canSpawnObstacle(upcomingHoles, upcomingPlatforms) {
        const minDistanceFromHole = 200; // Minimum distance from any hole
        
        // Don't spawn obstacle too close to a hole
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
                this.gameOver();
            }
        });
        
        // Check coin collisions
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (this.isColliding(this.player, coin)) {
                this.collectCoin(coin, i);
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
                this.gameOver();
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
    
    collectCoin(coin, index) {
        this.score += 10;
        this.coins.splice(index, 1);
        
        // Create particle effect
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: coin.x + coin.size / 2,
                y: coin.y + coin.size / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: '#FFD700'
            });
        }
    }
    
    updateScore() {
        this.score += 1;
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
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
        this.renderClouds();
        this.renderPlatforms();
        this.renderCoins();
        this.renderObstacles();
        this.renderPlayer();
        this.renderParticles();
    }
    
    renderBackground() {
        // Sky gradient - subtle and calm
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#E6F3FF'); // Very light blue
        gradient.addColorStop(0.7, '#F0F8FF'); // Almost white
        gradient.addColorStop(1, '#F5F5DC'); // Light beige near ground
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
        
        // Render mountains (furthest back)
        this.renderMountains();
        
        // Render hills (middle distance)
        this.renderHills();
        
        // Render trees (closest background elements)
        this.renderTrees();
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
        
        if (this.gameState === 'playing') {
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
            this.ctx.rotate(coin.rotation);
            
            if (this.assetsLoaded && this.coinImage.complete) {
                // Render coin image
                this.ctx.drawImage(this.coinImage, -coin.size / 2, -coin.size / 2, coin.size, coin.size);
            } else {
                // Fallback coin gradient
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size / 2);
                gradient.addColorStop(0, '#FFD700');
                gradient.addColorStop(1, '#FFA500');
                this.ctx.fillStyle = gradient;
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Inner circle
                this.ctx.fillStyle = '#FF8C00';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, coin.size / 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
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
