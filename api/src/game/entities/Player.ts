import { Entity } from './Entity';
import { Vector2, PlayerControls, VisibleEntities, EntityData } from '../types';

export class Player extends Entity {
  name: string;
  angle: number = 0;
  speed: number = 300; // Pixels per second
  rotationSpeed: number = 2; // Radians per second
  hp: number;
  maxHp: number;
  shipType: number;
  cannons: number;
  cannonCooldown: number = 0;
  cannonCooldownTime: number = 2000; // 2 seconds between shots
  controls: PlayerControls = { moveForward: false, rotateLeft: false, rotateRight: false };
  lastKnownEntities: VisibleEntities = { ships: [], resources: [], rocks: [], projectiles: [] };
  
  // Define base size as a static constant
  private static readonly BASE_SIZE: number = 20; // Changed from 20 to 30
  
  constructor(
    id: string,
    name: string,
    position: Vector2,
    shipType: number,
    hp: number,
    cannons: number
  ) {
    // Use the static BASE_SIZE constant
    super(id, position, Player.BASE_SIZE);
    
    this.name = name;
    this.shipType = shipType;
    this.hp = hp;
    this.maxHp = hp;
    this.cannons = cannons;
    
    // Random starting angle
    this.angle = Math.random() * Math.PI * 2;
  }
  
  update(deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;
    
    // Handle rotation
    if (this.controls.rotateLeft) {
      this.angle -= this.rotationSpeed * deltaSeconds;
    }
    if (this.controls.rotateRight) {
      this.angle += this.rotationSpeed * deltaSeconds;
    }
    
    // Normalize angle
    this.angle = this.angle % (Math.PI * 2);
    if (this.angle < 0) this.angle += Math.PI * 2;
    
    // Handle movement
    if (this.controls.moveForward) {
      const dx = Math.cos(this.angle) * this.speed * deltaSeconds;
      const dy = Math.sin(this.angle) * this.speed * deltaSeconds;
      
      this.position.x += dx;
      this.position.y += dy;
    }
    
    // Update cannon cooldown
    if (this.cannonCooldown > 0) {
      this.cannonCooldown -= deltaTime;
      if (this.cannonCooldown < 0) this.cannonCooldown = 0;
    }
    
    // Ensure player stays within world bounds (assuming world is 0,0 to worldWidth,worldHeight)
    this.position.x = Math.max(this.size, Math.min(this.position.x, 11000 - this.size));
    this.position.y = Math.max(this.size, Math.min(this.position.y, 11000 - this.size));
  }
  
  // Add HP to the player
  addHp(amount: number): void {
    this.hp += amount;
    this.maxHp = this.hp; // Max HP increases with current HP
    
    // Increase size based on HP
    this.updateSize();
    
    // Check if we unlocked new cannons (every 5 HP)
    this.updateCannons();
  }
  
  // Take damage
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    
    // Check if player died
    if (this.hp <= 0) {
      this.hp = 0;
      return true; // Player died
    }
    
    // Update size based on new HP
    this.updateSize();
    
    // Update cannons based on new HP
    this.updateCannons();
    
    return false; // Player still alive
  }
  
  // Update ship size based on HP
  updateSize(): void {
    // Use the static BASE_SIZE constant and cap at 500
    this.size = Math.min(Player.BASE_SIZE + (this.hp * 2), 500);
  }
  
  // Update number of cannons based on HP
  updateCannons(): void {
    // Every 5 HP gives +1 cannon per side (so +2 total)
    const newCannons = 2 + (Math.floor(this.hp / 5) * 2);
    this.cannons = Math.max(this.cannons, newCannons);
  }
  
  // Check if player can fire cannons
  canFire(): boolean {
    return this.cannonCooldown <= 0;
  }
  
  // Start cannon cooldown after firing
  startCooldown(): void {
    this.cannonCooldown = this.cannonCooldownTime;
  }
  
  serialize(): EntityData {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      type: 'ship',
      angle: this.angle,
      hp: this.hp,
      size: this.size,
      shipType: this.shipType,
      cannons: this.cannons,
      name: this.name
    };
  }
  
  // Override isShip to identify this as a ship entity
  protected isShip(): boolean {
    return true;
  }
  
  // Override getRectangleDimensions to return ship's actual dimensions
  protected getRectangleDimensions(): [number, number] {
    // Use the same multipliers as in the client rendering
    const width = this.size * 2.5;  // shipWidthMultiplier
    const height = this.size * 1.5; // shipHeightMultiplier
    return [width, height];
  }
  
  // Override getAngle to provide ship's rotation
  protected getAngle(): number {
    return this.angle;
  }
} 