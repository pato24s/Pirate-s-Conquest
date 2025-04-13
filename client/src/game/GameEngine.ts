import { Socket } from 'socket.io-client';
import { Ship, Entity, Resource, Rock } from './entities';
import { AssetLoader } from './AssetLoader';

class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private socket: Socket;
  private shipIndex: number;
  
  private player: Ship | null = null;
  private entities: Entity[] = [];
  private projectiles: any[] = [];
  private viewport = { x: 0, y: 0, width: 0, height: 0 };
  
  // Dynamic zoom level based on player HP
  private baseZoomLevel: number = 1.51;
  private minZoomLevel: number = 0.5;
  private zoomLevel: number = 1.25;
  private targetZoomLevel: number = 1.25;
  private zoomTransitionSpeed: number = 0.05; // Lower = smoother transition
  
  // Ship size multipliers (separate for width and height)
  private shipWidthMultiplier: number = 2.5;
  private shipHeightMultiplier: number = 1.5;
  
  private isRunning = false;
  private lastUpdateTime = 0;
  private assetLoader: AssetLoader;
  private assetsLoaded = false;
  private waterAnimationTimer = 0;
  private waterAnimationFrame = 0;
  
  // Ship controls
  private controls = {
    moveForward: false,
    rotateLeft: false,
    rotateRight: false,
  };

  constructor(canvas: HTMLCanvasElement, socket: Socket, shipIndex: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.socket = socket;
    this.shipIndex = shipIndex;
    this.assetLoader = AssetLoader.getInstance();

    // Set initial viewport size
    this.viewport.width = canvas.width;
    this.viewport.height = canvas.height;

    // Load assets
    this.loadAssets();

    // Set up socket event listeners
    this.setupSocketListeners();
    
    // Add keypress handler for testing
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        this.printDebugState();
      }
    });
  }

  private async loadAssets(): Promise<void> {
    try {
      // Assets should already be loaded from GameCanvas component
      // Just check if they're available
      this.assetsLoaded = this.assetLoader.isLoaded();
      if (!this.assetsLoaded) {
        console.warn('Assets not fully loaded when game engine started. Will use fallbacks.');
      }
    } catch (error) {
      console.error('Error checking assets:', error);
    }
  }

  private setupSocketListeners(): void {
    // Handle initial game state
    this.socket.on('game:state', (data) => {
      this.handleGameState(data);
    });

    // Handle entity updates
    this.socket.on('game:update', (data) => {
      this.handleGameUpdate(data);
    });

    // Add specific listener for ship updates to ensure real-time position sync
    this.socket.on('ship:update', (shipData) => {
      this.handleShipUpdate(shipData);
    });
    
    // Add batch ship update handler for more efficient updates
    this.socket.on('ships:batch_update', (shipsData) => {
      if (Array.isArray(shipsData)) {
        console.log(`Received batch update with ${shipsData.length} ships`);
        
        // First handle removed ships
        const removals = shipsData.filter(shipData => shipData.removed);
        removals.forEach(shipData => {
          this.handleShipUpdate(shipData);
        });
        
        // Then handle updates and additions
        const updates = shipsData.filter(shipData => !shipData.removed);
        updates.forEach(shipData => {
          this.handleShipUpdate(shipData);
        });
      }
    });
    
    // Handle entity removal (for disconnected players)
    this.socket.on('entity:removed', (data) => {
      if (data && data.id) {
        console.log(`Entity removal event received for: ${data.id.substring(0, 8)}`);
        // Remove entity from the entities array
        const entityIndex = this.entities.findIndex(e => e.id === data.id);
        if (entityIndex !== -1) {
          const removedEntity = this.entities[entityIndex];
          console.log(`Removed ${removedEntity instanceof Ship ? 'ship' : 'entity'} with ID: ${data.id.substring(0, 8)}`);
          this.entities.splice(entityIndex, 1);
        }
      }
    });

    // Handle player death
    this.socket.on('player:died', () => {
      // Show death animation or message if needed
      console.log('You died! Respawning...');
      // Show banner on respawn
      (window as any).sdk?.showBanner();
    });
  }

  private handleGameState(state: any): void {
    // Initialize player ship
    if (state.player) {
      this.player = new Ship(
        state.player.id,
        state.player.x,
        state.player.y,
        state.player.angle,
        state.player.hp,
        this.shipIndex,
        state.player.size,
        state.player.cannons
      );
    }

    // Initialize other entities
    this.entities = [];
    
    // Add other ships
    if (state.ships) {
      state.ships.forEach((shipData: any) => {
        if (shipData.id !== this.player?.id) {
          const ship = new Ship(
            shipData.id,
            shipData.x,
            shipData.y,
            shipData.angle,
            shipData.hp,
            shipData.shipType,
            shipData.size,
            shipData.cannons
          );
          this.entities.push(ship);
        }
      });
    }
    
    // Add resources (wood, chests)
    if (state.resources) {
      state.resources.forEach((resourceData: any) => {
        const resource = new Resource(
          resourceData.id,
          resourceData.x,
          resourceData.y,
          resourceData.type, // 'wood' or 'chest'
          resourceData.value
        );
        this.entities.push(resource);
      });
    }
    
    // Add rocks
    if (state.rocks) {
      state.rocks.forEach((rockData: any) => {
        const rock = new Rock(
          rockData.id,
          rockData.x,
          rockData.y,
          rockData.size,
          rockData.hp
        );
        this.entities.push(rock);
      });
    }
  }

  private handleGameUpdate(update: any): void {
    // Update player position if available
    if (update.player && this.player) {
      this.player.x = update.player.x;
      this.player.y = update.player.y;
      this.player.angle = update.player.angle;
      this.player.hp = update.player.hp;
      this.player.size = update.player.size;
      this.player.cannons = update.player.cannons;
      
      // Update zoom level based on player HP
      this.updateZoomLevel();
      
      // We don't need to update viewport x/y anymore since we center on player
    }
    
    // Handle entity updates
    if (update.entities) {
      // Process entity updates (add, remove, update)
      this.updateEntities(update.entities);
    }
    
    // Handle projectiles (cannonballs)
    if (update.projectiles) {
      // Update projectiles array
      this.projectiles = update.projectiles.map((p: any) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        angle: p.angle,
        ownerId: p.ownerId
      }));
    }
  }
  
  private updateEntities(entityUpdates: any[]): void {
    // First, remove all existing resources since we'll get a complete new set
    this.entities = this.entities.filter(e => !(e instanceof Resource));
    
    // Process entity updates
    entityUpdates.forEach((update) => {
      // Skip updates without id
      if (!update || !update.id) return;
      
      // Handle entity removal
      if (update.removed) {
        // Find the entity to remove
        const entityIndex = this.entities.findIndex(e => e.id === update.id);
        if (entityIndex !== -1) {
          console.log(`Removing entity ${update.id.substring(0, 8)} via update`);
          this.entities.splice(entityIndex, 1);
        }
        return;
      }
      
      // Check if this is a ship update (explicit ship check)
      if (update.type === 'ship') {
        // Special handling for ships to ensure proper synchronization
        this.handleShipUpdate(update);
        return; // Skip remaining processing for ships
      }
      
      // Handle resources - add them all since we cleared them at the start
      if (update.type === 'resource') {
        const newResource = new Resource(
          update.id,
          update.x,
          update.y,
          update.resourceType || 'wood',
          update.value || 1
        );
        this.entities.push(newResource);
        return;
      }
      
      // Handle other entity types (rocks)
      const existingEntityIndex = this.entities.findIndex(e => e.id === update.id);
      
      if (existingEntityIndex !== -1) {
        // Update existing entity
        const entity = this.entities[existingEntityIndex];
        
        // Always update position
        entity.x = update.x;
        entity.y = update.y;
        
        // Type-specific updates
        if (entity instanceof Rock && update.type === 'rock') {
          if ('hp' in update) (entity as Rock).hp = update.hp;
        }
      } else if (update.type === 'rock') {
        // Add new rock
        const newRock = new Rock(
          update.id,
          update.x,
          update.y,
          update.size || 25,
          update.hp || 10
        );
        this.entities.push(newRock);
      }
    });
  }

  // Game loop
  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;

    // Calculate delta time
    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;

    // Smoothly transition zoom level
    this.updateZoomTransition(deltaTime);

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw ocean background (animated water tiles)
    this.drawBackground(deltaTime);
    
    // Update controls
    this.updateControls();
    
    // Request ship updates every 200ms for real-time position updates
    if (Math.floor(timestamp / 200) !== Math.floor(this.lastUpdateTime / 200)) {
      this.requestShipUpdates();
    }
    
    // Draw all visible entities
    this.drawEntities();
    
    // Request next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  private drawBackground(deltaTime: number): void {
    // Apply zoom transformation for the background
    this.ctx.save();
    this.ctx.scale(this.zoomLevel, this.zoomLevel);
    
    if (!this.player) {
      this.ctx.restore();
      return;
    }
    
    // Update water animation timer
    this.waterAnimationTimer += deltaTime;
    if (this.waterAnimationTimer > 200) {
      this.waterAnimationTimer = 0;
      this.waterAnimationFrame = (this.waterAnimationFrame + 1) % 8; // Use 8 frames to match the actual number of frames
    }
    
    // Center point in the canvas
    const centerX = this.canvas.width / (2 * this.zoomLevel);
    const centerY = this.canvas.height / (2 * this.zoomLevel);
    
    // Calculate visible area accounting for zoom
    const visibleWidth = this.canvas.width / this.zoomLevel;
    const visibleHeight = this.canvas.height / this.zoomLevel;
    
    // Draw water
    const waterFrame = this.assetLoader.getWaterFrame(this.waterAnimationFrame);
    const waterTile = this.assetLoader.getImage('water-tile');
    
    // If we have the animated water frame or the static water tile
    if (waterFrame || waterTile) {
      const tileImg = waterFrame || waterTile;
      const tileSize = 128; // Assuming our water tile is 128x128 pixels
      
      // Calculate the number of tiles needed to cover the visible area with more padding
      const tilesX = Math.ceil(visibleWidth / tileSize) + 6;
      const tilesY = Math.ceil(visibleHeight / tileSize) + 6;
      
      // Calculate starting positions - start much farther back to ensure full coverage
      const startX = Math.floor(centerX - (this.player.x % tileSize) - (tilesX/2) * tileSize);
      const startY = Math.floor(centerY - (this.player.y % tileSize) - (tilesY/2) * tileSize);
      
      // Fill the entire visible area with water
      this.ctx.fillStyle = '#1a3c5a'; // Deeper blue background as a base
      this.ctx.fillRect(0, 0, visibleWidth, visibleHeight);
      
      // Draw the water tiles
      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          const posX = startX + x * tileSize;
          const posY = startY + y * tileSize;
          
          // Add null check before drawing
          if (tileImg) {
            this.ctx.drawImage(tileImg, posX, posY, tileSize, tileSize);
          }
        }
      }
    } else {
      // Fallback to solid color if images aren't loaded
      this.ctx.fillStyle = '#1a3c5a'; // Deeper blue for ocean
      this.ctx.fillRect(0, 0, visibleWidth, visibleHeight);
      
      // Draw grid with adjusted dimensions
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 1;
      
      // Grid size
      const gridSize = 100;
      
      // Draw vertical grid lines, aligned to player position
      const startGridX = centerX - this.player.x % gridSize;
      for (let x = startGridX; x <= visibleWidth; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, visibleHeight);
        this.ctx.stroke();
      }
      for (let x = startGridX - gridSize; x >= 0; x -= gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, visibleHeight);
        this.ctx.stroke();
      }
      
      // Draw horizontal grid lines, aligned to player position
      const startGridY = centerY - this.player.y % gridSize;
      for (let y = startGridY; y <= visibleHeight; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(visibleWidth, y);
        this.ctx.stroke();
      }
      for (let y = startGridY - gridSize; y >= 0; y -= gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(visibleWidth, y);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }
  
  private updateControls(): void {
    if (!this.player) return;
    
    // Send control updates to server
    this.socket.emit('player:controls', {
      moveForward: this.controls.moveForward,
      rotateLeft: this.controls.rotateLeft,
      rotateRight: this.controls.rotateRight,
    });
  }
  
  private drawEntities(): void {
    // Apply zoom transformation
    this.ctx.save();
    
    // Scale everything according to zoom level
    this.ctx.scale(this.zoomLevel, this.zoomLevel);
    
    // Center the viewport on player position
    // The player should be exactly in the center of the screen regardless of zoom
    const centerX = this.canvas.width / (2 * this.zoomLevel);
    const centerY = this.canvas.height / (2 * this.zoomLevel);
    
    // Draw all entities (relative to viewport)
    this.entities.forEach(entity => {
      // Check if entity is visible in viewport
      if (this.isEntityVisible(entity)) {
        // Calculate screen position - center everything around the player
        const screenX = centerX + (entity.x - this.player!.x);
        const screenY = centerY + (entity.y - this.player!.y);
        
        if (entity instanceof Ship) {
          this.drawShip(entity as Ship, screenX, screenY);
        } else if (entity instanceof Resource) {
          this.drawResource(entity as Resource, screenX, screenY);
        } else if (entity instanceof Rock) {
          this.drawRock(entity as Rock, screenX, screenY);
        }
      }
    });
    
    // Draw the player at the exact center
    if (this.player) {
      this.drawShip(this.player, centerX, centerY);
    }
    
    // Draw projectiles
    if (this.projectiles && this.projectiles.length > 0) {
      this.projectiles.forEach(projectile => {
        if (this.isProjectileVisible(projectile)) {
          const screenX = centerX + (projectile.x - this.player!.x);
          const screenY = centerY + (projectile.y - this.player!.y);
          this.drawProjectile(screenX, screenY);
        }
      });
    }
    
    // Restore the canvas context
    this.ctx.restore();
    
    // Optional: Draw viewport debug info
    this.drawDebugInfo();
  }
  
  private isEntityVisible(entity: Entity): boolean {
    // Handle case where player isn't initialized yet
    if (!this.player) return false;
    
    // Calculate distance from player to entity
    const dx = entity.x - this.player.x;
    const dy = entity.y - this.player.y;
    
    // Half of the visible width/height
    const visibleHalfWidth = (this.canvas.width / this.zoomLevel) / 2;
    const visibleHalfHeight = (this.canvas.height / this.zoomLevel) / 2;
    
    // Add a buffer zone to avoid entities popping in/out suddenly
    const bufferSize = 250;
    
    // Check if the entity is within visible area plus buffer
    return (
      Math.abs(dx) < visibleHalfWidth + bufferSize + entity.size &&
      Math.abs(dy) < visibleHalfHeight + bufferSize + entity.size
    );
  }
  
  private drawShip(ship: Ship, x: number, y: number): void {
    // Save context
    this.ctx.save();
    
    // Translate and rotate
    this.ctx.translate(x, y);
    this.ctx.rotate(ship.angle);
    
    // Get ship image based on type
    const shipImg = this.assetLoader.getShipImage(ship.shipType);
    
    if (shipImg) {
      // Calculate ship size with different multipliers for width and height
      const shipWidth = ship.size * this.shipWidthMultiplier;
      const shipHeight = ship.size * this.shipHeightMultiplier;
      
      // Draw the ship image
      this.ctx.drawImage(shipImg, -shipWidth / 2, -shipHeight / 2, shipWidth, shipHeight);
    } else {
      // Fallback to rectangle if image not loaded
      this.ctx.fillStyle = this.getShipColor(ship.shipType);
      const shipWidth = ship.size * this.shipWidthMultiplier;
      const shipHeight = ship.size * this.shipHeightMultiplier;
      
      // Ship body
      this.ctx.fillRect(-shipWidth / 2, -shipHeight / 2, shipWidth, shipHeight);
      
      // Draw cannons
      this.ctx.fillStyle = '#333';
      const cannonSize = shipHeight / 8;
      const cannonSpacing = shipHeight / (ship.cannons + 1);
      
      for (let i = 1; i <= ship.cannons; i++) {
        const cannonY = -shipHeight / 2 + i * cannonSpacing;
        
        // Left cannon
        this.ctx.fillRect(-shipWidth / 2 - cannonSize, cannonY - cannonSize / 2, cannonSize, cannonSize);
        
        // Right cannon
        this.ctx.fillRect(shipWidth / 2, cannonY - cannonSize / 2, cannonSize, cannonSize);
      }
    }
    
    // Health bar
    if (ship.hp > 0) {
      const shipWidth = ship.size * this.shipWidthMultiplier;
      this.ctx.fillStyle = '#1dc01d';
      const healthWidth = (shipWidth * ship.hp) / (5 + Math.floor(ship.hp / 5) * 5);
      this.ctx.fillRect(-shipWidth / 2, -ship.size * this.shipHeightMultiplier / 2 - 10, healthWidth, 5);
    }
    
    // Restore context
    this.ctx.restore();
  }
  
  private getShipColor(shipType: number): string {
    const colors = [
      '#d32f2f', // Red
      '#1976d2', // Blue
      '#388e3c', // Green
      '#fbc02d', // Yellow
      '#7b1fa2', // Purple
      '#e64a19', // Orange
    ];
    
    return colors[shipType % colors.length];
  }
  
  private drawResource(resource: Resource, x: number, y: number): void {
    if (resource.resourceType === 'wood') {
      const woodImg = this.assetLoader.getImage('wood');
      if (woodImg) {
        const size = 30;
        this.ctx.drawImage(woodImg, x - size / 2, y - size / 2, size, size);
      } else {
        // Fallback
        this.ctx.fillStyle = '#8d6e63';
        this.ctx.fillRect(x - 15, y - 5, 30, 10);
      }
    } else if (resource.resourceType === 'chest') {
      const chestImg = this.assetLoader.getImage('chest');
      if (chestImg) {
        const size = 25;
        this.ctx.drawImage(chestImg, x - size / 2, y - size / 2, size, size);
      } else {
        // Fallback
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(x - 10, y - 7, 20, 14);
        this.ctx.strokeStyle = '#8d6e63';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 10, y - 7, 20, 14);
      }
    }
  }
  
  private drawRock(rock: Rock, x: number, y: number): void {
    // Choose between normal rock and mossy rock image
    // Use mossy rocks occasionally based on a hash of the rock's id
    const rockImg = this.assetLoader.getImage(
      (parseInt(rock.id, 36) % 4 === 0) ? 'rock-moss' : 'rock'
    );
    
    if (rockImg) {
      const size = rock.size * 2;
      this.ctx.drawImage(rockImg, x - size / 2, y - size / 2, size, size);
    } else {
      // Fallback
      this.ctx.fillStyle = '#7D7D7D';
      this.ctx.beginPath();
      this.ctx.arc(x, y, rock.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw health indicator if damaged
    if (rock.hp < rock.maxHp) {
      this.ctx.fillStyle = '#d32f2f';
      const healthPct = rock.hp / rock.maxHp;
      const healthWidth = rock.size * 2 * healthPct;
      this.ctx.fillRect(x - rock.size, y + rock.size + 5, healthWidth, 3);
    }
  }

  // Public methods for game control
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  public stop(): void {
    this.isRunning = false;
  }
  
  public handleResize(): void {
    this.viewport.width = this.canvas.width;
    this.viewport.height = this.canvas.height;
    
    // No need to update viewport.x and viewport.y as we center directly on the player
  }
  
  // Ship control methods
  public moveForward(active: boolean): void {
    this.controls.moveForward = active;
  }
  
  public rotateLeft(active: boolean): void {
    this.controls.rotateLeft = active;
  }
  
  public rotateRight(active: boolean): void {
    this.controls.rotateRight = active;
  }
  
  public fireCannons(): void {
    // Send cannon fire event to server
    this.socket.emit('player:fire');
  }

  // Add method to update zoom level based on player HP
  private updateZoomLevel(): void {
    if (!this.player) return;
    
    // Calculate zoom based on formula: zoom = 1.51 - (hp/100)
    // But round down to the nearest 25 HP for stepwise changes
    const hpStep = Math.floor(this.player.hp / 25) * 25;
    const calculatedZoom = this.baseZoomLevel - (hpStep / 100);
    
    // Set target zoom level (capped at minimum zoom level)
    this.targetZoomLevel = Math.max(this.minZoomLevel, calculatedZoom);
    
    // Log zoom changes occasionally
    if (Math.random() < 0.05) {
      console.log(`Player HP: ${this.player.hp}, HP Step: ${hpStep}, Target Zoom: ${this.targetZoomLevel.toFixed(2)}`);
    }
  }
  
  // Add method to smoothly transition zoom level
  private updateZoomTransition(deltaTime: number): void {
    // If we're already at the target zoom, no need to transition
    if (Math.abs(this.zoomLevel - this.targetZoomLevel) < 0.001) {
      return;
    }
    
    // Calculate the distance to move based on deltaTime and transition speed
    const zoomDiff = this.targetZoomLevel - this.zoomLevel;
    const zoomStep = zoomDiff * this.zoomTransitionSpeed * (deltaTime / 16.67); // Normalize to 60fps
    
    // Update the current zoom level
    this.zoomLevel += zoomStep;
    
    // Log transition progress occasionally
    if (Math.random() < 0.01) {
      console.log(`Zoom transition: ${this.zoomLevel.toFixed(3)} -> ${this.targetZoomLevel.toFixed(3)}`);
    }
  }

  // Update the increaseZoom and decreaseZoom methods to be manual overrides
  public increaseZoom(): void {
    // This now acts as a temporary zoom boost
    this.targetZoomLevel = Math.min(3.0, this.targetZoomLevel + 0.25);
    console.log(`Manual zoom increase: target ${this.targetZoomLevel.toFixed(2)}`);
  }
  
  public decreaseZoom(): void {
    // This now acts as a temporary zoom reduction
    this.targetZoomLevel = Math.max(0.5, this.targetZoomLevel - 0.25);
    console.log(`Manual zoom decrease: target ${this.targetZoomLevel.toFixed(2)}`);
  }

  // Update isProjectileVisible to match the same approach
  private isProjectileVisible(projectile: any): boolean {
    if (!this.player) return false;
    
    // Calculate distance from player to projectile
    const dx = projectile.x - this.player.x;
    const dy = projectile.y - this.player.y;
    
    // Half of the visible width/height
    const visibleHalfWidth = (this.canvas.width / this.zoomLevel) / 2;
    const visibleHalfHeight = (this.canvas.height / this.zoomLevel) / 2;
    
    // Add a buffer zone
    const bufferSize = 250;
    const projectileSize = 10;
    
    // Check if projectile is within visible area plus buffer
    return (
      Math.abs(dx) < visibleHalfWidth + bufferSize + projectileSize &&
      Math.abs(dy) < visibleHalfHeight + bufferSize + projectileSize
    );
  }

  // Add method to draw projectiles
  private drawProjectile(x: number, y: number): void {
    // Save context
    this.ctx.save();
    
    const cannonballImg = this.assetLoader.getImage('cannonball');
    if (cannonballImg) {
      const size = 12;
      this.ctx.drawImage(cannonballImg, x - size / 2, y - size / 2, size, size);
    } else {
      // Draw cannonball fallback
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Restore context
    this.ctx.restore();
  }

  // Add a debug method to visualize the viewport boundaries
  private drawDebugInfo(): void {
    this.ctx.save();
    
    // Draw viewport boundary
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw zoom info
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    // this.ctx.fillText(`Zoom: ${this.zoomLevel.toFixed(2)}`, 10, 20);
    
    if (this.player) {
      // this.ctx.fillText(`Player Position: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})`, 10, 40);
      // this.ctx.fillText(`Player ID: ${this.player.id.substring(0, 8)}`, 10, 60);
      // this.ctx.fillText(`Player HP: ${this.player.hp}, Cannons: ${this.player.cannons}`, 10, 80);
      // this.ctx.fillText(`Entities: ${this.entities.length}, Projectiles: ${this.projectiles.length}`, 10, 100);
      
      // Show visible area dimensions
      // const visibleWidth = Math.floor(this.canvas.width / this.zoomLevel);
      // const visibleHeight = Math.floor(this.canvas.height / this.zoomLevel);
      // this.ctx.fillText(`Visible Area: ${visibleWidth}x${visibleHeight} px`, 10, 120);
      
      // Display assets loaded status
      // this.ctx.fillText(`Assets Loaded: ${this.assetsLoaded ? 'Yes' : 'No'}`, 10, 140);
      
      // Use separate y-coordinate to ensure ships are always shown
      let shipDisplayY = 20;
      this.ctx.fillText(`Other Ships:`, 10, shipDisplayY);
      shipDisplayY += 20;
      
      // Get ships directly from entities array to ensure latest positions
      const ships = this.entities.filter(e => e instanceof Ship);
      
      // Sort ships to ensure consistent display order
      ships.sort((a, b) => a.id.localeCompare(b.id));
      
      // Display ships with last position update timestamp
      if (ships.length > 0) {
        ships.forEach((ship, index) => {
          const shipObj = ship as Ship;
          // Add color to highlight updates
          this.ctx.fillStyle = 'lime';
          this.ctx.fillText(
            `Ship ${index+1}: ID ${shipObj.id.substring(0, 8)}, Pos (${Math.floor(shipObj.x)}, ${Math.floor(shipObj.y)})`, 
            10, shipDisplayY
          );
          shipDisplayY += 20;
        });
      } else {
        this.ctx.fillStyle = 'yellow';
        this.ctx.fillText('No other ships detected', 10, shipDisplayY);
      }
      
      // Reset color
      this.ctx.fillStyle = 'white';
    }
    
    this.ctx.restore();
  }

  // Add a specific handler for ship updates
  private handleShipUpdate(shipData: any): void {
    // Ignore invalid updates
    if (!shipData || !shipData.id) {
      console.warn('Received invalid ship update');
      return;
    }
    
    // Handle ship removal
    if (shipData.removed) {
      const shipIndex = this.entities.findIndex(e => e.id === shipData.id && e instanceof Ship);
      if (shipIndex !== -1) {
        console.log(`Removing ship ${shipData.id.substring(0, 8)} via ship:update event`);
        this.entities.splice(shipIndex, 1);
      }
      return;
    }
    
    // Debug log selectively (only log every 20th update to reduce spam)
    const shouldLog = Math.random() < 0.05;
    if (shouldLog) {
      console.log(`Ship update received for ${shipData.id.substring(0, 8)}: (${Math.floor(shipData.x)}, ${Math.floor(shipData.y)})`);
    }
    
    // If it's our player, update player object
    if (this.player && shipData.id === this.player.id) {
      this.player.x = shipData.x;
      this.player.y = shipData.y;
      this.player.angle = shipData.angle;
      this.player.hp = shipData.hp;
      this.player.size = shipData.size;
      this.player.cannons = shipData.cannons;
      return;
    }
    
    // Otherwise, find and update the ship in the entities array
    const shipIndex = this.entities.findIndex(e => e.id === shipData.id && e instanceof Ship);
    
    if (shipIndex !== -1) {
      // Update existing ship
      const ship = this.entities[shipIndex] as Ship;
      
      // Always force-update position and angle for consistent movement
      ship.x = shipData.x;
      ship.y = shipData.y;
      ship.angle = shipData.angle;
      
      // Update other properties
      if (shipData.hp !== undefined) ship.hp = shipData.hp;
      if (shipData.size !== undefined) ship.size = shipData.size;
      if (shipData.cannons !== undefined) ship.cannons = shipData.cannons;
      
      if (shouldLog) {
        console.log(`Updated existing ship ${shipData.id.substring(0, 8)} to (${Math.floor(ship.x)}, ${Math.floor(ship.y)})`);
      }
    } else {
      // Add new ship
      console.log(`Adding new ship ${shipData.id.substring(0, 8)} at (${Math.floor(shipData.x)}, ${Math.floor(shipData.y)})`);
      const newShip = new Ship(
        shipData.id,
        shipData.x,
        shipData.y,
        shipData.angle || 0,
        shipData.hp || 1,
        shipData.shipType || 0,
        shipData.size || 30,
        shipData.cannons || 2
      );
      this.entities.push(newShip);
    }
  }

  // Add a method to request ship updates
  private requestShipUpdates(): void {
    // Request updates for all ships
    console.log("Requesting ship updates from server");
    this.socket.emit('request:ships');
  }

  // Add method to print debug state
  private printDebugState(): void {
    console.log("==== GAME STATE DEBUG ====");
    console.log(`Player: ${this.player ? `ID: ${this.player.id.substring(0, 8)}, Pos: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})` : 'Not set'}`);
    
    const ships = this.entities.filter(e => e instanceof Ship);
    console.log(`Ships (${ships.length}):`);
    ships.forEach((ship, i) => {
      console.log(`  Ship ${i+1}: ID: ${ship.id.substring(0, 8)}, Pos: (${Math.floor(ship.x)}, ${Math.floor(ship.y)})`);
    });
    
    const resources = this.entities.filter(e => e instanceof Resource);
    console.log(`Resources: ${resources.length}`);
    
    const rocks = this.entities.filter(e => e instanceof Rock);
    console.log(`Rocks: ${rocks.length}`);
    
    console.log(`Projectiles: ${this.projectiles.length}`);
    console.log("==========================");
  }
}

export default GameEngine; 