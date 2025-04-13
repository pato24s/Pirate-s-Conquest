import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface AdminPanelProps {
  socket: Socket;
  visible: boolean;
}

interface GameConfig {
  initialRockCount: number;
  currentRockCount: number;
  maxRockCount: number;
  woodSpawnQuantity: number;
  chestSpawnQuantity: number;
  rockSpawnQuantity: number;
  woodSpawnIntervalMs: number;
  chestSpawnIntervalMs: number;
  rockSpawnIntervalMs: number;
  resourceCount: number;
  playerCount: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ socket, visible }) => {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [spawnRates, setSpawnRates] = useState({
    wood: 3,
    chest: 1,
    rock: 1
  });
  const [spawnIntervals, setSpawnIntervals] = useState({
    wood: 5000,
    chest: 20000,
    rock: 30000
  });
  const [rockConfig, setRockConfig] = useState({
    initial: 30,
    max: 50
  });

  useEffect(() => {
    // Request initial configuration
    socket.emit('admin:get_config');

    // Listen for configuration updates
    socket.on('admin:config:update', (newConfig: GameConfig) => {
      setConfig(newConfig);
      
      // Update local state with server values
      setSpawnRates({
        wood: newConfig.woodSpawnQuantity,
        chest: newConfig.chestSpawnQuantity,
        rock: newConfig.rockSpawnQuantity
      });
      
      setSpawnIntervals({
        wood: newConfig.woodSpawnIntervalMs,
        chest: newConfig.chestSpawnIntervalMs,
        rock: newConfig.rockSpawnIntervalMs
      });
      
      setRockConfig({
        initial: newConfig.initialRockCount,
        max: newConfig.maxRockCount
      });
    });

    return () => {
      // Clean up listeners
      socket.off('admin:config:update');
    };
  }, [socket]);

  const handleSpawnRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSpawnRates(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const handleSpawnIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSpawnIntervals(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const handleRockConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRockConfig(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const applySpawnRates = () => {
    socket.emit('admin:config:spawn_rates', spawnRates);
  };

  const applySpawnIntervals = () => {
    socket.emit('admin:config:spawn_intervals', spawnIntervals);
  };

  const applyRockConfig = () => {
    socket.emit('admin:config:rocks', rockConfig);
  };

  const respawnRocks = () => {
    socket.emit('admin:action:respawn_rocks');
  };

  if (!visible) return null;

  return (
    <div className="admin-panel">
      <h2>Game Configuration</h2>
      
      {config && (
        <div className="config-stats">
          <p>Players: {config.playerCount}</p>
          <p>Resources: {config.resourceCount}</p>
          <p>Rocks: {config.currentRockCount}/{config.maxRockCount}</p>
        </div>
      )}
      
      <div className="config-section">
        <h3>Spawn Quantities</h3>
        <div className="input-group">
          <label>
            Wood:
            <input 
              type="number" 
              name="wood" 
              min="1" 
              max="50" 
              value={spawnRates.wood} 
              onChange={handleSpawnRateChange} 
            />
          </label>
          <label>
            Chest:
            <input 
              type="number" 
              name="chest" 
              min="1" 
              max="10" 
              value={spawnRates.chest} 
              onChange={handleSpawnRateChange} 
            />
          </label>
          <label>
            Rock:
            <input 
              type="number" 
              name="rock" 
              min="1" 
              max="10" 
              value={spawnRates.rock} 
              onChange={handleSpawnRateChange} 
            />
          </label>
          <button onClick={applySpawnRates}>Apply</button>
        </div>
      </div>
      
      <div className="config-section">
        <h3>Spawn Intervals (ms)</h3>
        <div className="input-group">
          <label>
            Wood:
            <input 
              type="number" 
              name="wood" 
              min="1000" 
              max="30000" 
              step="1000"
              value={spawnIntervals.wood} 
              onChange={handleSpawnIntervalChange} 
            />
          </label>
          <label>
            Chest:
            <input 
              type="number" 
              name="chest" 
              min="5000" 
              max="60000" 
              step="1000"
              value={spawnIntervals.chest} 
              onChange={handleSpawnIntervalChange} 
            />
          </label>
          <label>
            Rock:
            <input 
              type="number" 
              name="rock" 
              min="10000" 
              max="60000" 
              step="1000"
              value={spawnIntervals.rock} 
              onChange={handleSpawnIntervalChange} 
            />
          </label>
          <button onClick={applySpawnIntervals}>Apply</button>
        </div>
      </div>
      
      <div className="config-section">
        <h3>Rock Configuration</h3>
        <div className="input-group">
          <label>
            Initial Count:
            <input 
              type="number" 
              name="initial" 
              min="10" 
              max="100" 
              value={rockConfig.initial} 
              onChange={handleRockConfigChange} 
            />
          </label>
          <label>
            Max Count:
            <input 
              type="number" 
              name="max" 
              min="20" 
              max="200" 
              value={rockConfig.max} 
              onChange={handleRockConfigChange} 
            />
          </label>
          <button onClick={applyRockConfig}>Apply</button>
          <button onClick={respawnRocks}>Respawn Rocks</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 