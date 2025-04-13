// Base Entity class
export abstract class Entity {
  id: string;
  x: number;
  y: number;
  size: number;

  constructor(id: string, x: number, y: number, size: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.size = size;
  }
}

// Ship class for both player and enemy ships
export class Ship extends Entity {
  angle: number;
  hp: number;
  shipType: number;
  cannons: number;

  constructor(
    id: string,
    x: number,
    y: number,
    angle: number,
    hp: number,
    shipType: number,
    size: number,
    cannons: number
  ) {
    super(id, x, y, size);
    this.angle = angle;
    this.hp = hp;
    this.shipType = shipType;
    this.cannons = cannons;
  }

  // Additional ship methods can be added here
}

// Resource class for wood wreckage and golden chests
export class Resource extends Entity {
  resourceType: 'wood' | 'chest';
  value: number;

  constructor(
    id: string,
    x: number,
    y: number,
    resourceType: 'wood' | 'chest',
    value: number
  ) {
    // Size based on resource type
    const size = resourceType === 'wood' ? 15 : 10;
    super(id, x, y, size);
    this.resourceType = resourceType;
    this.value = value;
  }
}

// Rock class for obstacles
export class Rock extends Entity {
  hp: number;
  maxHp: number;

  constructor(id: string, x: number, y: number, size: number, hp: number) {
    super(id, x, y, size);
    this.hp = hp;
    this.maxHp = hp;
  }
}

// Projectile class for cannonballs
export class Projectile extends Entity {
  angle: number;
  speed: number;
  damage: number;
  ownerId: string;

  constructor(
    id: string,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    ownerId: string
  ) {
    // Cannonballs are small
    super(id, x, y, 5);
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.ownerId = ownerId;
  }

  // Update position based on angle and speed
  update(deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;
    this.x += Math.cos(this.angle) * this.speed * deltaSeconds;
    this.y += Math.sin(this.angle) * this.speed * deltaSeconds;
  }
} 