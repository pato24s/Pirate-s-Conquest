// Basic 2D vector
export interface Vector2 {
  x: number;
  y: number;
}

// Player controls
export interface PlayerControls {
  moveForward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
}

// Visible entities container
export interface VisibleEntities {
  ships: any[];
  resources: any[];
  rocks: any[];
  projectiles: any[];
}

// Entity serialized data
export interface EntityData {
  id: string;
  x: number;
  y: number;
  type: string;
  [key: string]: any;
} 