import { Server, Socket } from 'socket.io';
import { World } from './World';
import { Player } from './entities/Player';
import { Vector2 } from './types';

export class GameServer {
  private io: Server;
  private world: World;
  private players: Map<string, Player> = new Map();
  private tickRate = 60; // Increased from 30 to 60 for more frequent updates
  private tickInterval: NodeJS.Timeout | null = null;
  private shipBroadcastRate = 50; // Milliseconds between ship broadcasts (20 times/second)
  private lastShipBroadcast = 0;
  private debugMode: boolean = false; // Disable verbose logging to improve performance

  constructor(io: Server) {
    this.io = io;
    this.world = new World(11000, 11000, io); // Pass io to the World
    this.setupSocketHandlers();
    
    if (this.debugMode) {
      console.log("Debug mode enabled - verbose logging active");
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Player connected: ${socket.id}`);
      
      // Handle player join
      socket.on('player:join', (data: { name: string, shipType: number }) => {
        this.handlePlayerJoin(socket, data);
      });
      
      // Handle player controls
      socket.on('player:controls', (controls: any) => {
        this.handlePlayerControls(socket.id, controls);
      });
      
      // Handle cannon fire
      socket.on('player:fire', () => {
        this.handleCannonFire(socket.id);
      });
      
      // Handle ship update requests
      socket.on('request:ships', () => {
        this.handleShipUpdateRequest(socket.id);
      });
      
      // Handle admin commands for game configuration
      socket.on('admin:config:spawn_rates', (data: { wood: number, chest: number, rock: number }) => {
        this.world.setResourceSpawnRates(data.wood, data.chest, data.rock);
        socket.emit('admin:config:update', this.world.getGameConfiguration());
      });
      
      socket.on('admin:config:spawn_intervals', (data: { wood: number, chest: number, rock: number }) => {
        this.world.setResourceSpawnIntervals(data.wood, data.chest, data.rock);
        socket.emit('admin:config:update', this.world.getGameConfiguration());
      });
      
      socket.on('admin:config:rocks', (data: { initial: number, max: number }) => {
        this.world.setRockConfiguration(data.initial, data.max);
        socket.emit('admin:config:update', this.world.getGameConfiguration());
      });
      
      socket.on('admin:action:respawn_rocks', () => {
        this.world.respawnRocks();
        socket.emit('admin:config:update', this.world.getGameConfiguration());
      });
      
      socket.on('admin:get_config', () => {
        socket.emit('admin:config:update', this.world.getGameConfiguration());
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handlePlayerDisconnect(socket.id);
      });
    });
  }

  private handlePlayerJoin(socket: Socket, data: { name: string, shipType: number }): void {
    // Create a spawn position (random safe spot)
    const spawnPosition = this.world.getRandomSpawnPosition();
    
    // Create new player with initial stats
    const player = new Player(
      socket.id,
      data.name || 'Guest',
      spawnPosition,
      data.shipType,
      1, // Initial HP
      2  // Initial cannons (1 per side)
    );
    
    // Add player to the game
    this.players.set(socket.id, player);
    this.world.addPlayer(player);
    
    if (this.debugMode) {
      console.log(`Player ${player.name} (${socket.id.substring(0, 8)}) joined at position (${Math.floor(spawnPosition.x)}, ${Math.floor(spawnPosition.y)})`);
    }
    
    // Send initial game state to the player
    this.sendInitialState(socket);
    
    // Announce new player
    this.broadcastKillfeed(`${player.name} has joined the battle!`);
  }
  
  private sendInitialState(socket: Socket): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    
    // Increase viewport radius for initial state to show more of the map
    const initialViewportRadius = 2500; // Increased from 1500 to show much more of the map initially
    
    // Get all entities for the player's initial viewport
    const visibleEntities = this.world.getVisibleEntitiesWithRadius(player, initialViewportRadius);
    
    // Send game state to player
    socket.emit('game:state', {
      player: player.serialize(),
      ships: visibleEntities.ships.map(ship => ship.serialize()),
      resources: visibleEntities.resources.map(resource => resource.serialize()),
      rocks: visibleEntities.rocks.map(rock => rock.serialize()),
      projectiles: visibleEntities.projectiles.map(p => p.serialize()),
    });
  }
  
  private handlePlayerControls(playerId: string, controls: any): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Update player controls
    player.controls = {
      moveForward: controls.moveForward || false,
      rotateLeft: controls.rotateLeft || false,
      rotateRight: controls.rotateRight || false,
    };
  }
  
  private handleCannonFire(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Check if player can fire (has enough cannons)
    if (player.cannons >= 2) {
      // Create projectiles
      this.world.createProjectiles(player);
    }
  }
  
  private handleShipUpdateRequest(playerId: string): void {
    const requestingPlayer = this.players.get(playerId);
    if (!requestingPlayer) return;
    
    const socket = this.io.sockets.sockets.get(playerId);
    if (!socket) return;
    
    // Get all players
    const allShips = Array.from(this.players.values());
    
    // Send ship data for all ships (excluding the requesting player)
    const otherShips = allShips.filter(ship => ship.id !== playerId);
    
    if (this.debugMode) {
      console.log(`Player ${playerId.substring(0, 8)} requested ship updates. Sending ${otherShips.length} ships.`);
    }
    
    // Send ship updates to the requesting player
    otherShips.forEach(ship => {
      if (this.debugMode) {
        console.log(`  -> Sending ship ${ship.id.substring(0, 8)} at (${Math.floor(ship.position.x)}, ${Math.floor(ship.position.y)})`);
      }
      socket.emit('ship:update', ship.serialize());
    });
  }
  
  private handlePlayerDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    console.log(`Player disconnected: ${playerId} (${player.name})`);
    
    // Before removing player, create a removal notification for all clients
    const removalData = {
      id: playerId,
      removed: true
    };
    
    // Broadcast ship removal to all remaining clients
    this.io.emit('entity:removed', removalData);
    
    // Also include in the next batch update as removed
    this.io.emit('ship:update', removalData);
    
    // Remove player from the game
    this.players.delete(playerId);
    this.world.removePlayer(playerId);
    
    // Announce player left
    this.broadcastKillfeed(`${player.name} has abandoned ship!`);
  }
  
  private broadcastKillfeed(message: string): void {
    this.io.emit('game:killfeed', message);
  }
  
  private update(): void {
    // Update game world
    this.world.update(1000 / this.tickRate); // deltaTime in milliseconds
    
    // Check if it's time to broadcast ship positions
    const now = Date.now();
    if (now - this.lastShipBroadcast >= this.shipBroadcastRate) {
      this.broadcastShipPositions();
      this.lastShipBroadcast = now;
    }
    
    // Send entity updates to each player
    this.sendUpdates();
    
    // Log game state occasionally for debugging
    if (this.players.size > 0 && Math.random() < 0.01) {
      console.log(`Game state: ${this.players.size} active players`);
    }
  }
  
  private broadcastShipPositions(): void {
    if (this.players.size === 0) return;
    
    // Get all player ships for batch update
    const allShips = Array.from(this.players.values()).map(player => player.serialize());
    
    if (this.debugMode) {
      console.log(`Broadcasting positions for ${allShips.length} ships`);
    }
    
    // Send batch update to all clients
    if (allShips.length > 0) {
      this.io.emit('ships:batch_update', allShips);
    }
    
    // Log the number of ships occasionally
    if (Math.random() < 0.01) {
      console.log(`Broadcasting ship positions: ${allShips.length} ships`);
    }
  }
  
  private sendUpdates(): void {
    // Skip if no players
    if (this.players.size === 0) return;
    
    // Update each player
    for (const player of this.players.values()) {
      const socket = this.io.sockets.sockets.get(player.id);
      if (!socket) continue;
      
      // Get visible entities for this player
      const currentVisibleEntities = this.world.getVisibleEntities(player);
      
      // Calculate entity updates based on last known state
      const entityUpdates = this.world.getEntityUpdates(player.lastKnownEntities, currentVisibleEntities);
      
      // Only send update if there are changes
      if (entityUpdates.length > 0) {
        // Periodic logging to help debug
        if (Math.random() < 0.01) {
          console.log(`Sending updates to ${player.id.substring(0, 8)}: ${entityUpdates.length} updates (ships: ${currentVisibleEntities.ships.length}, resources: ${currentVisibleEntities.resources.length})`);
        }
        
        // Send updates
        socket.emit('game:update', {
          player: player.serialize(),
          entities: entityUpdates,
          projectiles: currentVisibleEntities.projectiles.map(p => p.serialize()),
        });
      }
      
      // Update last known entities
      player.lastKnownEntities = currentVisibleEntities;
    }
  }
  
  // Public methods
  public start(): void {
    if (this.tickInterval) return;
    
    console.log(`Starting game server (tick rate: ${this.tickRate} Hz)`);
    
    // Start spawning resources
    this.world.startResourceSpawning();
    
    // Start game loop
    this.tickInterval = setInterval(() => this.update(), 1000 / this.tickRate);
  }
  
  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    this.world.stopResourceSpawning();
    console.log('Game server stopped');
  }
  
  public getPlayerCount(): number {
    return this.players.size;
  }
} 