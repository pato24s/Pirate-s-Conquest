import { useState } from 'react';

interface GameStartProps {
  onStartGame: (name: string, shipIndex: number) => void;
}

const GameStart: React.FC<GameStartProps> = ({ onStartGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [selectedShip, setSelectedShip] = useState(0);
  
  // Ship options (will be replaced with actual sprite images)
  const shipOptions = [
    { id: 0, name: 'Red Ship', color: 'bg-red-700' },
    { id: 1, name: 'Blue Ship', color: 'bg-blue-700' },
    { id: 2, name: 'Green Ship', color: 'bg-green-700' },
    { id: 3, name: 'Yellow Ship', color: 'bg-yellow-600' },
    { id: 4, name: 'White Ship', color: 'bg-white' },
    { id: 5, name: 'Black Ship', color: 'bg-black' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGame(playerName, selectedShip);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <h1 className="text-5xl font-pirate text-pirate-gold mb-8">Pirates' Conquest</h1>
      
      <div className="bg-pirate-brown bg-opacity-80 p-8 rounded-lg shadow-lg max-w-md w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="playerName" className="block text-xl mb-2">Your Pirate Name</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter name or play as Guest"
              className="w-full px-4 py-2 rounded bg-pirate-blue text-white border border-pirate-gold focus:outline-none focus:ring-2 focus:ring-pirate-gold"
            />
          </div>
          
          <div>
            <label className="block text-xl mb-3">Choose Your Ship</label>
            <div className="grid grid-cols-3 gap-4">
              {shipOptions.map((ship) => (
                <div
                  key={ship.id}
                  onClick={() => setSelectedShip(ship.id)}
                  className={`${ship.color} h-16 w-24 mx-auto rounded cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                    selectedShip === ship.id ? 'ring-4 ring-pirate-gold transform scale-110' : ''
                  }`}
                >
                  {/* Ship sprite will go here */}
                  <span className="text-xs text-center">{ship.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 bg-pirate-gold hover:bg-yellow-600 text-pirate-blue font-bold rounded transition-colors text-xl"
          >
            Set Sail!
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-white text-center max-w-md">
        <h3 className="text-xl mb-3 text-pirate-gold">Controls:</h3>
        <p className="mb-2">W - Move forward</p>
        <p className="mb-2">A/D - Rotate ship</p>
        <p className="mb-2">Spacebar - Fire cannons</p>
      </div>
    </div>
  );
};

export default GameStart; 