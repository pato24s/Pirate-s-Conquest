export class AssetLoader {
  private static instance: AssetLoader;
  private images: Map<string, HTMLImageElement> = new Map();
  private loadPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private assetsLoaded: boolean = false;

  // Ship assets (one for each color)
  private shipAssets = [
    'ship-red.png',
    'ship-blue.png',
    'ship-green.png',
    'ship-yellow.png',
    'ship-white.png',
    'ship-black.png'
  ];

  // Other game assets
  private gameAssets = [
    'rock.png',
    'rock-moss.png', 
    'wood.png',
    'chest.png',
    'cannonball.png',
    'water-tile.png'
  ];

  // Animation frames
  private waterAnimationFrames: HTMLImageElement[] = [];

  // Private constructor for singleton
  private constructor() {}

  // Get singleton instance
  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  // Load all assets
  public async loadAllAssets(): Promise<boolean> {
    if (this.assetsLoaded) return true;

    try {
      // Load ship assets
      const shipPromises = this.shipAssets.map((asset, index) => 
        this.loadImage(`ship${index}`, `/assets/ships/${asset}`)
      );

      // Load other game assets
      const gamePromises = this.gameAssets.map(asset => 
        this.loadImage(asset.split('.')[0], `/assets/game/${asset}`)
      );

      // Load water animation frames
      const waterFramePromises = [];
      for (let i = 1; i <= 8; i++) {
        waterFramePromises.push(
          this.loadImage(`water-frame-${i}`, `/assets/game/water/frame-${i}.png`)
        );
      }

      // Wait for all assets to load
      await Promise.all([...shipPromises, ...gamePromises, ...waterFramePromises]);

      // Setup water animation frames
      this.setupWaterAnimation();
      
      this.assetsLoaded = true;
      console.log('All game assets loaded successfully!');
      return true;
    } catch (error) {
      console.error('Failed to load game assets:', error);
      return false;
    }
  }

  // Load a single image
  private async loadImage(key: string, src: string): Promise<HTMLImageElement> {
    if (this.loadPromises.has(key)) {
      return this.loadPromises.get(key)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}. Using fallback.`);
        // Create a colored rectangle as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = this.getFallbackColor(key);
        ctx.fillRect(0, 0, 32, 32);
        
        const fallbackImg = new Image();
        fallbackImg.src = canvas.toDataURL();
        fallbackImg.onload = () => {
          this.images.set(key, fallbackImg);
          resolve(fallbackImg);
        };
      };
      img.src = src;
    });

    this.loadPromises.set(key, promise);
    return promise;
  }

  // Setup water animation frames
  private setupWaterAnimation(): void {
    const frames: HTMLImageElement[] = [];
    for (let i = 1; i <= 8; i++) {
      const frame = this.getImage(`water-frame-${i}`);
      if (frame) frames.push(frame);
    }
    this.waterAnimationFrames = frames;
  }

  // Get a fallback color for images that fail to load
  private getFallbackColor(key: string): string {
    if (key.startsWith('ship')) {
      const colors = ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d', '#7b1fa2', '#e64a19'];
      const index = parseInt(key.replace('ship', ''));
      return colors[index % colors.length];
    }
    
    switch (key) {
      case 'rock':
      case 'rock-moss':
        return '#7D7D7D';
      case 'wood':
        return '#8d6e63';
      case 'chest':
        return '#ffd700';
      case 'cannonball':
        return '#000000';
      case 'water-tile':
      default:
        return '#1a3c5a';
    }
  }

  // Get an image by key
  public getImage(key: string): HTMLImageElement | null {
    return this.images.get(key) || null;
  }

  // Get ship image by index
  public getShipImage(shipType: number): HTMLImageElement | null {
    return this.getImage(`ship${shipType % this.shipAssets.length}`);
  }

  // Get water animation frame (optional frame index parameter)
  public getWaterFrame(frameIndex?: number): HTMLImageElement | null {
    if (this.waterAnimationFrames.length === 0) return null;
    
    // Use provided frameIndex if available, otherwise calculate based on time
    if (frameIndex !== undefined) {
      return this.waterAnimationFrames[frameIndex % this.waterAnimationFrames.length];
    }
    
    const timeBasedIndex = Math.floor(Date.now() / 150) % this.waterAnimationFrames.length;
    return this.waterAnimationFrames[timeBasedIndex];
  }

  // Check if all assets are loaded
  public isLoaded(): boolean {
    return this.assetsLoaded;
  }
} 