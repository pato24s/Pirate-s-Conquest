import { useState } from 'react';
import GameStart from '@/components/GameStart';
import GameCanvas from '@/game/GameCanvas';

const App = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedShip, setSelectedShip] = useState(0);

  const handleStartGame = (name: string, shipIndex: number) => {
    setPlayerName(name || 'Guest');
    setSelectedShip(shipIndex);
    setGameStarted(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {!gameStarted ? (
        <GameStart onStartGame={handleStartGame} />
      ) : (
        <GameCanvas playerName={playerName} shipIndex={selectedShip} />
      )}
    </div>
  );
};

export default App; 