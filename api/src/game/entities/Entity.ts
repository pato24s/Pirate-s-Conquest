import { Vector2, EntityData } from '../types';

export abstract class Entity {
  id: string;
  position: Vector2;
  size: number;
  
  constructor(id: string, position: Vector2, size: number) {
    this.id = id;
    this.position = position;
    this.size = size;
  }
  
  // Calculate distance to another entity
  distanceTo(other: Entity): number {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Check collision with another entity using rotated rectangular hitboxes for ships
  collidesWith(other: Entity): boolean {
    // Use simple circular collision for now to ensure entities can be collected
    // This is more permissive and avoids issues with rotation calculations
    return this.distanceTo(other) < this.size + other.size;
  }
  
  // Helper method to check if entity is a ship
  protected isShip(): boolean {
    return false; // Override in Ship class
  }
  
  // Get entity's rotation angle in radians
  protected getAngle(): number {
    return 0; // Override in classes that can rotate
  }
  
  // Rotated rectangle collision detection
  protected rotatedRectangleCollision(other: Entity): boolean {
    // Get dimensions and angles
    const [thisWidth, thisHeight] = this.getRectangleDimensions();
    const [otherWidth, otherHeight] = other.getRectangleDimensions();
    const thisAngle = this.getAngle();
    const otherAngle = other.getAngle();
    
    // Calculate the relative position vector
    const dx = other.position.x - this.position.x;
    const dy = other.position.y - this.position.y;
    
    // If the distance between centers is greater than the sum of the maximum possible radii,
    // there's definitely no collision
    const maxRadius1 = Math.sqrt((thisWidth * thisWidth) + (thisHeight * thisHeight)) / 2;
    const maxRadius2 = Math.sqrt((otherWidth * otherWidth) + (otherHeight * otherHeight)) / 2;
    const centerDist = Math.sqrt(dx * dx + dy * dy);
    
    if (centerDist > maxRadius1 + maxRadius2) {
      return false;
    }
    
    // If one entity is a ship and the other isn't, use a simplified check
    // This helps with collecting resources and hitting rocks
    if (this.isShip() !== other.isShip()) {
      // Get the ship and non-ship entities
      const ship = this.isShip() ? this : other;
      const nonShip = this.isShip() ? other : this;
      
      // Transform the point into the ship's local space
      const angle = ship.getAngle();
      const relX = nonShip.position.x - ship.position.x;
      const relY = nonShip.position.y - ship.position.y;
      
      // Rotate the point
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);
      const rotX = relX * cosA - relY * sinA;
      const rotY = relX * sinA + relY * cosA;
      
      // Get ship dimensions
      const [shipWidth, shipHeight] = ship.getRectangleDimensions();
      
      // Check if the point is within the ship's rectangle plus the non-ship's radius
      return Math.abs(rotX) < (shipWidth / 2 + nonShip.size) &&
             Math.abs(rotY) < (shipHeight / 2 + nonShip.size);
    }
    
    // For ship-to-ship collisions, use a simpler circular check for now
    // This can be improved later if needed
    return this.distanceTo(other) < (maxRadius1 + maxRadius2) * 0.8;
  }
  
  // Get rectangular dimensions [width, height]
  protected getRectangleDimensions(): [number, number] {
    // Default to square dimensions for non-ship entities
    return [this.size * 2, this.size * 2];
  }
  
  // Update entity state
  abstract update(deltaTime: number): void;
  
  // Serialize entity for network transmission
  abstract serialize(): EntityData;
} 