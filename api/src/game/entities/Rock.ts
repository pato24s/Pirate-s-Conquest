import { Entity } from './Entity';
import { Vector2, EntityData } from '../types';

export class Rock extends Entity {
  hp: number;
  maxHp: number;
  
  constructor(id: string, position: Vector2, size: number = 40, hp: number = 5) {
    super(id, position, size);
    this.hp = hp;
    this.maxHp = hp;
  }
  
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    
    // Return true if rock is destroyed
    return this.hp <= 0;
  }
  
  update(deltaTime: number): void {
    // Rocks are static, no update logic needed
  }
  
  serialize(): EntityData {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      type: 'rock',
      size: this.size,
      hp: this.hp,
      maxHp: this.maxHp
    };
  }
} 