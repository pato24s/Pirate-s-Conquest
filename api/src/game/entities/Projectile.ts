import { Entity } from './Entity';
import { Vector2, EntityData } from '../types';

export class Projectile extends Entity {
  angle: number;
  speed: number;
  damage: number;
  ownerId: string;
  lifetime: number;
  maxLifetime: number = 3000; // 3 seconds max travel time
  
  constructor(
    id: string,
    position: Vector2,
    angle: number,
    speed: number = 250, // Pixels per second
    damage: number = 1,
    ownerId: string
  ) {
    // Projectiles are small
    super(id, position, 5);
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.ownerId = ownerId;
    this.lifetime = 0;
  }
  
  update(deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;
    
    // Move in the direction of the angle
    this.position.x += Math.cos(this.angle) * this.speed * deltaSeconds;
    this.position.y += Math.sin(this.angle) * this.speed * deltaSeconds;
    
    // Increase lifetime
    this.lifetime += deltaTime;
  }
  
  // Check if projectile has expired
  isExpired(): boolean {
    return this.lifetime >= this.maxLifetime;
  }
  
  serialize(): EntityData {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      type: 'projectile',
      angle: this.angle,
      ownerId: this.ownerId
    };
  }
} 