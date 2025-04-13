import { Entity } from './Entity';
import { Vector2, EntityData } from '../types';

export type ResourceType = 'wood' | 'chest';

export class Resource extends Entity {
  resourceType: ResourceType;
  value: number;
  
  constructor(id: string, position: Vector2, resourceType: ResourceType, value: number = 1) {
    // Size based on resource type
    const size = resourceType === 'wood' ? 15 : 10;
    super(id, position, size);
    
    this.resourceType = resourceType;
    this.value = value;
  }
  
  update(deltaTime: number): void {
    // Resources are static, no update logic needed
  }
  
  serialize(): EntityData {
    return {
      id: this.id,
      x: this.position.x,
      y: this.position.y,
      type: 'resource',
      resourceType: this.resourceType,
      value: this.value
    };
  }
} 