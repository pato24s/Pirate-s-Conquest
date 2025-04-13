# Pirates Conquest Game Assets

This directory contains all the image assets needed for the Pirates Conquest game.

## Directory Structure

```
public/assets/
├── ships/           # Ship images for different colors
│   ├── ship-red.png
│   ├── ship-blue.png
│   ├── ship-green.png
│   ├── ship-yellow.png
│   ├── ship-purple.png
│   └── ship-orange.png
│
├── game/            # Other game assets
│   ├── rock.png     # Regular rock
│   ├── rock-moss.png # Rock with moss
│   ├── wood.png     # Wooden wreckage
│   ├── chest.png    # Treasure chest
│   ├── cannonball.png # Projectile
│   ├── water-tile.png # Static water background (fallback)
│   │
│   └── water/       # Water animation frames
│       ├── frame-1.png
│       ├── frame-2.png
│       ├── frame-3.png
│       ├── frame-4.png
│       ├── frame-5.png
│       ├── frame-6.png
│       ├── frame-7.png
│       └── frame-8.png
```

## Image Requirements

### Ships
- Ship images should be oriented with the bow (front) pointing to the right
- Recommended size: ~100x60 pixels
- PNG format with transparency
- Each color should have its own image

### Rocks
- Should appear as rocky obstacles
- Circular or irregular shape
- Include moss variant for variety
- Recommended size: ~60x60 pixels
- PNG format with transparency

### Resources
- Wood: Should look like wooden planks or wreckage
- Chest: Should look like a treasure chest
- Recommended size: ~30x30 pixels
- PNG format with transparency

### Water
- Water animation frames should be seamless tiles
- Recommended size: 128x128 pixels
- 8 frames for smooth animation
- PNG format

## Adding Your Own Assets

1. Create your pixel art images according to the specifications above
2. Place them in the appropriate directories
3. The game will automatically load them at startup
4. If an image fails to load, the game will use a colored placeholder

## Troubleshooting

If your images don't appear in the game:
1. Check that the file names match exactly what's expected
2. Verify that images are in PNG format
3. Make sure they're in the correct directories
4. Check browser console for loading errors 