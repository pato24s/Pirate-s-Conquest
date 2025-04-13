import { v4 as uuidv4 } from 'uuid';
import { Vector2, VisibleEntities } from './types';
import { Player } from './entities/Player';
import { Resource, ResourceType } from './entities/Resource';
import { Rock } from './entities/Rock';
import { Projectile } from './entities/Projectile';
import { Server } from 'socket.io';

export class World {
  width: number;
  height: number;
  private io: Server | null = null;
  
  // Entity collections
  private players: Map<string, Player> = new Map();
  private resources: Map<string, Resource> = new Map();
  private rocks: Map<string, Rock> = new Map();
  private projectiles: Map<string, Projectile> = new Map();
  
  // Resource spawning
  private woodSpawnInterval: NodeJS.Timeout | null = null;
  private chestSpawnInterval: NodeJS.Timeout | null = null;
  private rockSpawnInterval: NodeJS.Timeout | null = null;
  
  // Game balance configuration
  private initialRockCount: number = 1000;
  private maxRockCount: number = 3000;
  private woodSpawnQuantity: number = 50;
  private chestSpawnQuantity: number = 0; // Set to 0 to disable chest spawning
  private rockSpawnQuantity: number = 1;
  private woodSpawnIntervalMs: number = 5000; // 5 seconds
  private chestSpawnIntervalMs: number = 20000; // 20 seconds
  private rockSpawnIntervalMs: number = 30000; // 30 seconds
  private maxWoodCount: number = 1000; // Maximum number of wood resources allowed on map
  
  constructor(width: number, height: number, io?: Server) {
    this.width = width;
    this.height = height;
    this.io = io || null;
    
    // Create initial world setup with rocks
    this.generateInitialRocks(this.initialRockCount);
    
    // Add initial resources scattered across the map - only wood, no chests
    this.generateInitialResources(50, 0); // 50 wood, 0 chests
  }
  
  // Generate initial rocks
  private generateInitialRocks(count: number): void {
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPosition();
      const size = 20 + Math.random() * 30; // Random size between 20-50
      const hp = Math.floor(size / 10); // HP based on size
      
      const rock = new Rock(uuidv4(), position, size, hp);
      this.rocks.set(rock.id, rock);
    }
  }
  
  // Generate initial resources
  private generateInitialResources(woodCount: number, chestCount: number): void {
    console.log(`Generating initial resources: ${woodCount} wood, ${chestCount} chests`);
    
    // Spawn wood
    for (let i = 0; i < woodCount; i++) {
      const position = this.getRandomPosition();
      
      // Skip if too close to rocks or edges
      if (!this.isPositionSafe(position, 30)) {
        continue;
      }
      
      const resource = new Resource(
        uuidv4(),
        position,
        'wood',
        1
      );
      
      this.resources.set(resource.id, resource);
    }
    
    // Spawn chests
    for (let i = 0; i < chestCount; i++) {
      const position = this.getRandomPosition();
      
      // Skip if too close to rocks or edges
      if (!this.isPositionSafe(position, 30)) {
        continue;
      }
      
      const resource = new Resource(
        uuidv4(),
        position,
        'chest',
        1
      );
      
      this.resources.set(resource.id, resource);
    }
    
    console.log(`Initial resources generated: ${this.resources.size} total resources`);
  }
  
  // Get a random position in the world
  private getRandomPosition(): Vector2 {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height
    };
  }
  
  // Get a random safe position for player spawn
  getRandomSpawnPosition(): Vector2 {
    const margin = 100; // Keep away from edges
    
    // Try several positions until we find a safe one
    for (let attempts = 0; attempts < 10; attempts++) {
      const position = {
        x: margin + Math.random() * (this.width - margin * 2),
        y: margin + Math.random() * (this.height - margin * 2)
      };
      
      // Check if position is far enough from all rocks and players
      if (this.isPositionSafe(position, 100)) { // 100px safe radius
        return position;
      }
    }
    
    // If we couldn't find a safe spot, return a position near the center
    return {
      x: this.width / 2 + (Math.random() * 200 - 100),
      y: this.height / 2 + (Math.random() * 200 - 100)
    };
  }
  
  // Check if a position is safe (no entities nearby)
  private isPositionSafe(position: Vector2, safeRadius: number): boolean {
    // Check distance to rocks
    for (const rock of this.rocks.values()) {
      const dx = position.x - rock.position.x;
      const dy = position.y - rock.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < safeRadius + rock.size) {
        return false; // Too close to a rock
      }
    }
    
    // Check distance to players
    for (const player of this.players.values()) {
      const dx = position.x - player.position.x;
      const dy = position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < safeRadius + player.size) {
        return false; // Too close to a player
      }
    }
    
    return true; // Position is safe
  }
  
  // Add a player to the world
  addPlayer(player: Player): void {
    console.log(`World: Adding player ${player.id.substring(0, 8)} at position (${Math.floor(player.position.x)}, ${Math.floor(player.position.y)})`);
    this.players.set(player.id, player);
    
    // Initialize last known entities for this player
    player.lastKnownEntities = {
      ships: [],
      resources: [],
      rocks: [],
      projectiles: []
    };
    
    // Log current player count
    console.log(`World now has ${this.players.size} players`);
    
    // Log all player IDs
    console.log('Current players:');
    Array.from(this.players.keys()).forEach(id => {
      console.log(`- ${id.substring(0, 8)}`);
    });
  }
  
  // Remove a player from the world
  removePlayer(playerId: string): void {
    // Get the player before removing for logging
    const player = this.players.get(playerId);
    if (player) {
      console.log(`World: Removing player ${playerId.substring(0, 8)} from world`);
      
      // Remove from players collection
      this.players.delete(playerId);
      
      // Log remaining players
      console.log(`World now has ${this.players.size} players`);
      if (this.players.size > 0) {
        console.log('Remaining players:');
        Array.from(this.players.keys()).forEach(id => {
          console.log(`- ${id.substring(0, 8)}`);
        });
      }
      
      // Update lastKnownEntities for all remaining players to remove the disconnected player
      for (const remainingPlayer of this.players.values()) {
        if (remainingPlayer.lastKnownEntities) {
          // Filter out the disconnected player from ships list
          remainingPlayer.lastKnownEntities.ships = 
            remainingPlayer.lastKnownEntities.ships.filter(ship => ship.id !== playerId);
        }
      }
    }
  }
  
  // Create projectiles for a player's cannon fire
  createProjectiles(player: Player): void {
    if (!player.canFire()) return;
    
    // Number of cannons per side
    const cannonCount = player.cannons / 2;
    
    // Calculate ship dimensions based on player size
    const shipWidth = player.size;        // Width is now the base size
    const shipHeight = player.size * 2;   // Height is 2x the size to make it more rectangular
    
    // Distance from ship's side where projectiles spawn
    const spawnOffset = shipWidth * 0.6;   // Spawn slightly away from the ship
    
    // Create projectiles on each side
    for (let side = 0; side < 2; side++) {
      const sideAngle = side === 0 ? Math.PI / 2 : -Math.PI / 2; // Left or right
      
      for (let i = 0; i < cannonCount; i++) {
        // Calculate spacing between cannons to use almost full ship length
        // Use 0.8 to leave a small margin from the edges
        const spacing = ((i + 1) / (cannonCount + 1) - 0.5) * (shipHeight * 0.8);
        
        // Calculate spawn position
        // First move to the side of the ship
        const sideX = Math.cos(player.angle + sideAngle) * spawnOffset;
        const sideY = Math.sin(player.angle + sideAngle) * spawnOffset;
        
        // Then offset along the ship's length
        const offsetX = Math.cos(player.angle) * spacing;
        const offsetY = Math.sin(player.angle) * spacing;
        
        const spawnX = player.position.x + sideX + offsetX;
        const spawnY = player.position.y + sideY + offsetY;
        
        // Calculate projectile angle (perpendicular to ship side)
        const projectileAngle = player.angle + sideAngle;
        
        // Create projectile with adjusted speed and size
        const projectile = new Projectile(
          uuidv4(),
          { x: spawnX, y: spawnY },
          projectileAngle,
          300,  // Slightly faster speed
          1,    // Damage
          player.id
        );
        
        this.projectiles.set(projectile.id, projectile);
      }
    }
    
    // Start cannon cooldown
    player.startCooldown();
  }
  
  // Spawn a new resource
  private spawnResource(type: ResourceType): void {
    // Don't spawn if we've reached the maximum wood count
    if (type === 'wood' && this.getWoodCount() >= this.maxWoodCount) {
      return;
    }

    const position = this.getRandomPosition();
    
    // Ensure resources don't spawn directly on top of players or rocks
    // Use a smaller safe distance to be less restrictive
    const minSafeDistance = 20; // Minimum distance from players/rocks, reduced from 50
    
    // Check distance to players
    for (const player of this.players.values()) {
      const dx = position.x - player.position.x;
      const dy = position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minSafeDistance + player.size) {
        return; // Too close to a player, skip this spawn
      }
    }
    
    // Check distance to rocks with a simpler check
    let tooCloseToRock = false;
    for (const rock of this.rocks.values()) {
      const dx = position.x - rock.position.x;
      const dy = position.y - rock.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minSafeDistance + rock.size) {
        tooCloseToRock = true;
        break;
      }
    }
    
    // Skip spawn if too close to a rock
    if (tooCloseToRock) {
      return;
    }
    
    // Create the resource
    const resource = new Resource(
      uuidv4(),
      position,
      type,
      type === 'wood' ? 1 : 1 // Wood gives 1 HP, chest unlocks cannons
    );
    
    // Log resource creation to help with debugging
    console.log(`Spawned ${type} at (${Math.floor(position.x)}, ${Math.floor(position.y)})`);
    
    // Add to resources collection
    this.resources.set(resource.id, resource);
  }
  
  // Get all entities visible to a player
  getVisibleEntities(player: Player): VisibleEntities {
    const viewportRadius = 500 + player.size * 3; // Base viewport + bonus for size
    const visibleEntities: VisibleEntities = {
      ships: [],
      resources: [],
      rocks: [],
      projectiles: []
    };
    
    // Add visible ships (other players)
    for (const otherPlayer of this.players.values()) {
      if (otherPlayer.id !== player.id) {
        const dx = otherPlayer.position.x - player.position.x;
        const dy = otherPlayer.position.y - player.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < viewportRadius + otherPlayer.size) {
          visibleEntities.ships.push(otherPlayer);
        }
      }
    }
    
    // Add visible resources
    for (const resource of this.resources.values()) {
      const dx = resource.position.x - player.position.x;
      const dy = resource.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < viewportRadius + resource.size) {
        visibleEntities.resources.push(resource);
      }
    }
    
    // Add visible rocks
    for (const rock of this.rocks.values()) {
      const dx = rock.position.x - player.position.x;
      const dy = rock.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < viewportRadius + rock.size) {
        visibleEntities.rocks.push(rock);
      }
    }
    
    // Add visible projectiles
    for (const projectile of this.projectiles.values()) {
      const dx = projectile.position.x - player.position.x;
      const dy = projectile.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < viewportRadius + projectile.size) {
        visibleEntities.projectiles.push(projectile);
      }
    }
    
    return visibleEntities;
  }
  
  // Get entity updates based on previous known state
  getEntityUpdates(previousEntities: VisibleEntities, currentEntities: VisibleEntities): any[] {
    const updates: any[] = [];
    
    // Handle ships - Force include ALL ships in every update with complete data
    currentEntities.ships.forEach(ship => {
      updates.push(ship.serialize());
    });
    
    // Handle resources - Always include ALL resources in updates
    currentEntities.resources.forEach(resource => {
      updates.push(resource.serialize());
    });
    
    // Handle rocks
    this.getEntityTypeUpdates(
      previousEntities.rocks,
      currentEntities.rocks,
      updates
    );
    
    return updates;
  }
  
  // Helper method to determine which entities need updates
  private getEntityTypeUpdates(previous: any[], current: any[], updates: any[]): void {
    // First find entities that are removed
    for (const prevEntity of previous) {
      if (!current.find(e => e.id === prevEntity.id)) {
        updates.push({
          id: prevEntity.id,
          removed: true
        });
      }
    }
    
    // Then add new or modified entities
    for (const entity of current) {
      // If entity wasn't in previous list, add it
      const prevEntity = previous.find(e => e.id === entity.id);
      if (!prevEntity) {
        updates.push(entity.serialize());
      }
      // If position changed, add it
      else if (
        entity.position.x !== prevEntity.position.x ||
        entity.position.y !== prevEntity.position.y ||
        // For ships, also check if other properties changed
        ('angle' in entity && 'angle' in prevEntity && entity.angle !== prevEntity.angle) ||
        ('hp' in entity && 'hp' in prevEntity && entity.hp !== prevEntity.hp)
      ) {
        updates.push(entity.serialize());
      }
    }
  }
  
  // Start resource spawning
  startResourceSpawning(): void {
    // Spawn wood every 5 seconds
    this.woodSpawnInterval = setInterval(() => {
      if (this.players.size > 0) { // Only spawn if players exist
        // Spawn multiple wood resources
        for (let i = 0; i < this.woodSpawnQuantity; i++) {
          this.spawnResource('wood');
        }
      }
    }, this.woodSpawnIntervalMs);
    
    // Chest spawning is disabled by setting chestSpawnQuantity to 0
    
    // Occasionally spawn new rocks
    this.rockSpawnInterval = setInterval(() => {
      if (this.rocks.size < this.maxRockCount && this.players.size > 0) {
        // Spawn multiple rocks
        for (let i = 0; i < this.rockSpawnQuantity; i++) {
          if (this.rocks.size < this.maxRockCount) {
            const position = this.getRandomPosition();
            if (this.isPositionSafe(position, 100)) {
              const size = 20 + Math.random() * 30;
              const hp = Math.floor(size / 10);
              const rock = new Rock(uuidv4(), position, size, hp);
              this.rocks.set(rock.id, rock);
            }
          }
        }
      }
    }, this.rockSpawnIntervalMs);
  }
  
  // Stop resource spawning
  stopResourceSpawning(): void {
    if (this.woodSpawnInterval) {
      clearInterval(this.woodSpawnInterval);
      this.woodSpawnInterval = null;
    }
    
    if (this.chestSpawnInterval) {
      clearInterval(this.chestSpawnInterval);
      this.chestSpawnInterval = null;
    }
    
    if (this.rockSpawnInterval) {
      clearInterval(this.rockSpawnInterval);
      this.rockSpawnInterval = null;
    }
  }
  
  // Update the world state
  update(deltaTime: number): void {
    // Update all players
    for (const player of this.players.values()) {
      // Store previous position before updating
      const prevPos = { ...player.position };
      
      // Update player position
      player.update(deltaTime);
      
      // Check collisions with rocks and prevent movement through them
      for (const rock of this.rocks.values()) {
        if (player.collidesWith(rock)) {
          // Collision detected, revert to previous position
          player.position = prevPos;
          break;
        }
      }
      
      // Check player-player collisions
      for (const otherPlayer of this.players.values()) {
        if (player.id !== otherPlayer.id && player.collidesWith(otherPlayer)) {
          // Simple bounce-back for player-player collisions
          player.position = prevPos;
          break;
        }
      }
    }
    
    // Update projectiles and check collisions
    this.updateProjectiles(deltaTime);
    
    // Check collisions with resources
    this.checkResourceCollisions();
  }
  
  // Update projectiles and check collisions
  private updateProjectiles(deltaTime: number): void {
    const projectilesToRemove: string[] = [];
    
    // Update projectile positions
    for (const projectile of this.projectiles.values()) {
      projectile.update(deltaTime);
      
      // Check if projectile expired
      if (projectile.isExpired()) {
        projectilesToRemove.push(projectile.id);
        continue;
      }
      
      // Check if projectile is out of bounds
      if (
        projectile.position.x < 0 || 
        projectile.position.x > this.width ||
        projectile.position.y < 0 || 
        projectile.position.y > this.height
      ) {
        projectilesToRemove.push(projectile.id);
        continue;
      }
      
      // Check collisions with rocks
      for (const rock of this.rocks.values()) {
        if (projectile.collidesWith(rock)) {
          // Damage the rock
          if (rock.takeDamage(projectile.damage)) {
            // Rock destroyed
            this.rocks.delete(rock.id);
          }
          
          // Remove projectile
          projectilesToRemove.push(projectile.id);
          break;
        }
      }
      
      // Skip player checks if already marked for removal
      if (projectilesToRemove.includes(projectile.id)) continue;
      
      // Check collisions with players (but not the owner)
      for (const player of this.players.values()) {
        if (player.id !== projectile.ownerId && projectile.collidesWith(player)) {
          // Damage the player
          const isDead = player.takeDamage(projectile.damage);
          
          if (isDead) {
            // Player died - handle death
            this.handlePlayerDeath(player, projectile.ownerId);
          }
          
          // Remove projectile
          projectilesToRemove.push(projectile.id);
          break;
        }
      }
    }
    
    // Remove collected projectiles
    for (const id of projectilesToRemove) {
      this.projectiles.delete(id);
    }
  }
  
  // Check for collisions with resources
  private checkResourceCollisions(): void {
    const resourcesToRemove: string[] = [];
    
    // Check each player against each resource
    for (const player of this.players.values()) {
      for (const resource of this.resources.values()) {
        if (player.collidesWith(resource)) {
          // Player collided with resource
          if (resource.resourceType === 'wood') {
            // Wood adds HP
            player.addHp(resource.value);
          } else if (resource.resourceType === 'chest') {
            // Chest only adds cannons if player has enough HP
            if (player.hp >= 6) {
              // Add cannons based on HP tier
              player.updateCannons();
            }
          }
          
          // Mark resource for removal
          resourcesToRemove.push(resource.id);
        }
      }
    }
    
    // Remove collected resources
    for (const id of resourcesToRemove) {
      this.resources.delete(id);
    }
  }
  
  // Handle player death
  private handlePlayerDeath(player: Player, killerID: string): void {
    // Find killer player
    const killer = this.players.get(killerID);
    
    // Broadcast kill message
    const killMessage = killer 
      ? `${killer.name} sank ${player.name}'s ship!`
      : `${player.name}'s ship was destroyed!`;
    
    // Emit kill message to all players
    if (this.io) {
      for (const p of this.players.values()) {
        const socket = this.io.sockets.sockets.get(p.id);
        if (socket) {
          socket.emit('game:killfeed', killMessage);
        }
      }
      
      // Notify player of death
      const socket = this.io.sockets.sockets.get(player.id);
      if (socket) {
        socket.emit('player:died');
      }
    }
    
    // Drop loot at player's position
    this.dropPlayerLoot(player);
    
    // Reset player stats
    player.hp = 1;
    player.cannons = 2;
    player.updateSize(); // Adjust size based on new HP
    
    // Move player to a safe spawn location
    player.position = this.getRandomSpawnPosition();
  }
  
  // Drop loot when a player dies
  private dropPlayerLoot(player: Player): void {
    const position = { ...player.position };
    const woodCount = Math.floor(player.hp / 2); // Half of HP as wood
    // No chests dropped on death
    
    // Drop wood
    for (let i = 0; i < woodCount; i++) {
      // Random offset from death position
      const offset = {
        x: (Math.random() * 50) - 25,
        y: (Math.random() * 50) - 25
      };
      
      const resourcePosition = {
        x: position.x + offset.x,
        y: position.y + offset.y
      };
      
      const resource = new Resource(
        uuidv4(),
        resourcePosition,
        'wood',
        1
      );
      
      this.resources.set(resource.id, resource);
    }
  }
  
  // Get all entities visible to a player with a custom radius
  getVisibleEntitiesWithRadius(player: Player, viewportRadius: number): VisibleEntities {
    const visibleEntities: VisibleEntities = {
      ships: [],
      resources: [],
      rocks: [],
      projectiles: []
    };
    
    // Add ALL ships regardless of distance - ship positions are critical
    for (const otherPlayer of this.players.values()) {
      if (otherPlayer.id !== player.id) {
        visibleEntities.ships.push(otherPlayer);
      }
    }
    
    // If this is the initial state (large viewport radius), include ALL resources
    const isInitialState = viewportRadius > 2000;
    
    // Add visible resources
    for (const resource of this.resources.values()) {
      if (isInitialState) {
        // Include all resources in initial state
        visibleEntities.resources.push(resource);
      } else {
        // Normal visibility check for regular updates
        const dx = resource.position.x - player.position.x;
        const dy = resource.position.y - player.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < viewportRadius + resource.size) {
          visibleEntities.resources.push(resource);
        }
      }
    }
    
    // Add visible rocks
    for (const rock of this.rocks.values()) {
      const dx = rock.position.x - player.position.x;
      const dy = rock.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < viewportRadius + rock.size) {
        visibleEntities.rocks.push(rock);
      }
    }
    
    // Add visible projectiles
    for (const projectile of this.projectiles.values()) {
      const dx = projectile.position.x - player.position.x;
      const dy = projectile.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < viewportRadius + projectile.size) {
        visibleEntities.projectiles.push(projectile);
      }
    }
    
    return visibleEntities;
  }
  
  // Configuration methods for game balancing
  setResourceSpawnRates(woodQuantity: number, chestQuantity: number, rockQuantity: number): void {
    this.woodSpawnQuantity = woodQuantity;
    this.chestSpawnQuantity = chestQuantity;
    this.rockSpawnQuantity = rockQuantity;
    console.log(`Resource spawn rates updated: wood=${woodQuantity}, chest=${chestQuantity}, rock=${rockQuantity}`);
  }
  
  setResourceSpawnIntervals(woodMs: number, chestMs: number, rockMs: number): void {
    this.woodSpawnIntervalMs = woodMs;
    this.chestSpawnIntervalMs = chestMs;
    this.rockSpawnIntervalMs = rockMs;
    console.log(`Resource spawn intervals updated: wood=${woodMs}ms, chest=${chestMs}ms, rock=${rockMs}ms`);
    
    // Restart intervals with new timings if already running
    if (this.woodSpawnInterval || this.chestSpawnInterval || this.rockSpawnInterval) {
      this.stopResourceSpawning();
      this.startResourceSpawning();
    }
  }
  
  setRockConfiguration(initialCount: number, maxCount: number): void {
    this.initialRockCount = initialCount;
    this.maxRockCount = maxCount;
    console.log(`Rock configuration updated: initialCount=${initialCount}, maxCount=${maxCount}`);
  }
  
  // Method to respawn all rocks (useful for testing)
  respawnRocks(): void {
    // Clear existing rocks
    this.rocks.clear();
    
    // Generate new rocks
    this.generateInitialRocks(this.initialRockCount);
    console.log(`Respawned ${this.initialRockCount} rocks`);
  }
  
  // Helper method to count wood resources
  private getWoodCount(): number {
    let count = 0;
    for (const resource of this.resources.values()) {
      if (resource.resourceType === 'wood') {
        count++;
      }
    }
    return count;
  }
  
  // Add method to set maximum wood count
  setMaxWoodCount(maxCount: number): void {
    this.maxWoodCount = maxCount;
    console.log(`Maximum wood count set to ${maxCount}`);
  }
  
  // Get current configuration (useful for debugging)
  getGameConfiguration(): object {
    return {
      initialRockCount: this.initialRockCount,
      currentRockCount: this.rocks.size,
      maxRockCount: this.maxRockCount,
      woodSpawnQuantity: this.woodSpawnQuantity,
      chestSpawnQuantity: this.chestSpawnQuantity,
      rockSpawnQuantity: this.rockSpawnQuantity,
      woodSpawnIntervalMs: this.woodSpawnIntervalMs,
      chestSpawnIntervalMs: this.chestSpawnIntervalMs,
      rockSpawnIntervalMs: this.rockSpawnIntervalMs,
      maxWoodCount: this.maxWoodCount,
      currentWoodCount: this.getWoodCount(),
      resourceCount: this.resources.size,
      playerCount: this.players.size
    };
  }
} 