# 🏃‍♂️ Adi's Running Game

An exciting browser-based infinite runner game with platforms, hurdles, and strategic gameplay!

## 🎮 Game Features

- **Double Jump Mechanics**: Ground jump + one air jump for enhanced control
- **Smart Obstacle System**: Intelligent spawning ensures fair and playable challenges
- **Aerial Platforms**: Jump on floating platforms to navigate obstacles
- **Ground Holes**: Dangerous gaps that require careful navigation
- **Progressive Difficulty**: Game speed increases gradually over time
- **Coin Collection**: Collect coins to increase your score
- **High Score Tracking**: Persistent local storage of your best runs
- **Mobile Friendly**: Touch controls for mobile browsers
- **PWA Ready**: Installable as a Progressive Web App

## 🕹️ How to Play

### Controls
- **Desktop**: Press `SPACEBAR` or click to jump
- **Mobile**: Tap the screen to jump

### Gameplay
1. **First Jump**: Jump from ground or platforms
2. **Double Jump**: Use your air jump to adjust mid-flight
3. **Avoid Hurdles**: Jump over brown hurdles
4. **Cross Holes**: Use platforms or perfect timing to avoid falling
5. **Collect Coins**: Grab golden coins for points
6. **Survive**: The game gets faster - how long can you last?

## 🚀 Play Online

[Play the Game Here!](https://yourusername.github.io/game) *(Update this link after deployment)*

## 📱 Installation

This game works as a Progressive Web App (PWA):

1. Open the game in your browser
2. Look for "Add to Home Screen" or "Install" prompt
3. Install it like a native app on your device!

## 🛠️ Development

### File Structure
```
game/
├── index.html          # Main game page
├── src/
│   ├── game.js         # Core game logic
│   └── styles.css      # Game styling
├── icons/              # Game assets
│   ├── hero.png        # Player character
│   ├── hurdle.png      # Obstacle sprite
│   └── coin.png        # Collectible sprite
├── manifest.json       # PWA manifest
└── sw.js              # Service worker
```

### Local Development
1. Clone this repository
2. Run a local server: `python3 -m http.server 8000`
3. Open `http://localhost:8000` in your browser

### Technologies Used
- **HTML5 Canvas** for game rendering
- **Vanilla JavaScript** for game logic
- **CSS3** for styling and responsive design
- **Progressive Web App** technologies
- **Local Storage** for high scores

## 🎯 Game Mechanics

### Smart Spawning System
- **Conflict Avoidance**: Obstacles and holes are spaced strategically
- **Escape Routes**: Every challenge has a solution
- **Platform Assistance**: Helpful platforms appear before difficult sections
- **Balanced Difficulty**: Challenging but always fair

### Physics System
- **Realistic Gravity**: Smooth jumping and falling
- **Collision Detection**: Precise but forgiving hit detection
- **Double Jump**: One air jump per ground contact
- **Platform Landing**: Full physics support for aerial platforms

## 🏆 Tips & Strategy

1. **Save Your Air Jump**: Don't waste it on easy obstacles
2. **Use Platforms**: They're often placed to help with difficult sections
3. **Watch Ahead**: Plan your route by looking at upcoming obstacles
4. **Timing is Key**: Sometimes waiting is better than rushing
5. **Practice**: The game rewards patience and skill over luck

## 📈 Future Features

- [ ] Power-ups and special abilities
- [ ] Multiple character skins
- [ ] Different environment themes
- [ ] Multiplayer leaderboards
- [ ] Achievement system
- [ ] Sound effects and music

## 🤝 Contributing

Feel free to contribute to this project! Whether it's:
- Bug fixes
- New features
- Art assets
- Documentation improvements

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎉 Acknowledgments

- Built with modern web technologies
- Inspired by classic infinite runner games
- Designed for both casual and competitive play

---

**Have fun playing!** 🎮✨