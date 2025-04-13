import { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import GameEngine from './GameEngine';
import { AssetLoader } from './AssetLoader';
import AdminPanel from '../components/AdminPanel';

interface GameCanvasProps {
  playerName: string;
  shipIndex: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ playerName, shipIndex }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState({ hp: 1, cannonCount: 2 });
  const [killfeed, setKillfeed] = useState<string[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [adminPanelVisible, setAdminPanelVisible] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    console.log("Attempting to connect to Socket.IO server...");
    
    // Connect with improved configuration
    const newSocket = io('/', {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      withCredentials: false,
      rememberUpgrade: false
    });

    // Track connection attempts
    let connectionAttempts = 0;
    const maxAttempts = 3;
    
    // Define event handlers
    const handleConnectError = (error: Error) => {
      connectionAttempts++;
      console.error(`Socket connection error (attempt ${connectionAttempts}/${maxAttempts}):`, error);
      
      if (connectionAttempts >= maxAttempts) {
        console.log("Trying direct connection to server...");
        newSocket.io.opts.transports = ['polling', 'websocket'];
      }
    };

    const handleConnect = () => {
      console.log('Socket connected successfully with ID:', newSocket.id);
      newSocket.emit('player:join', { name: playerName, shipType: shipIndex });
    };

    const handleDisconnect = (reason: string) => {
      console.log(`Socket disconnected: ${reason}`);
    };

    const handleStats = (data: any) => {
      setStats(data);
    };

    const handleKillfeed = (message: string) => {
      setKillfeed((prev) => [message, ...prev.slice(0, 4)]);
    };

    // Attach event listeners
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('player:stats', handleStats);
    newSocket.on('game:killfeed', handleKillfeed);

    setSocket(newSocket);

    // Cleanup function to remove all listeners and disconnect
    return () => {
      console.log("Cleaning up socket connection");
      if (newSocket) {
        // Remove all listeners
        newSocket.removeAllListeners();
        // Disconnect the socket
        newSocket.disconnect();
        // Clear the socket state
        setSocket(null);
      }
    };
  }, [playerName, shipIndex]);

  // Preload assets
  useEffect(() => {
    // Start asset loading
    const loadAssets = async () => {
      const assetLoader = AssetLoader.getInstance();
      
      // Simulate loading progress
      const loadingInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(loadingInterval);
            return 90;
          }
          return newProgress;
        });
      }, 150);
      
      // Actually load assets
      const loaded = await assetLoader.loadAllAssets();
      
      // Clear interval and set fully loaded
      clearInterval(loadingInterval);
      setLoadingProgress(100);
      setAssetsLoaded(loaded);
    };
    
    loadAssets();
  }, []);
  
  // Initialize game engine after assets loaded
  useEffect(() => {
    if (!canvasRef.current || !socket || !assetsLoaded) return;

    const canvas = canvasRef.current;
    const engine = new GameEngine(canvas, socket, shipIndex);

    // Start game loop
    engine.start();

    // Handle keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          engine.moveForward(true);
          break;
        case 'a':
          engine.rotateLeft(true);
          break;
        case 'd':
          engine.rotateRight(true);
          break;
        case ' ':
          engine.fireCannons();
          break;
        case '+':
        case '=':
          engine.increaseZoom();
          break;
        case '-':
        case '_':
          engine.decreaseZoom();
          break;
        case '~':
        case '`':
          // Toggle admin panel
          setAdminPanelVisible(prev => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          engine.moveForward(false);
          break;
        case 'a':
          engine.rotateLeft(false);
          break;
        case 'd':
          engine.rotateRight(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize canvas on window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.handleResize();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, socket, shipIndex, assetsLoaded]);

  // Render loading screen or game canvas
  return (
    <div className="relative w-full h-full overflow-hidden">
      {!assetsLoaded ? (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-blue-900 flex flex-col items-center justify-center">
          <h2 className="text-4xl font-pirate text-pirate-gold mb-8">Loading Pirates' Conquest</h2>
          <div className="w-80 h-6 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-pirate-gold transition-all duration-300 ease-out" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-white mt-4">Loading game assets... {loadingProgress}%</p>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} className="w-full h-full" />
          
          {/* Game UI Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between">
            <div>
              <div className="bg-black bg-opacity-50 p-2 rounded-lg text-white">
                <div className="mb-1">HP: {stats.hp}</div>
                <div>Cannons: {stats.cannonCount}</div>
              </div>
            </div>
            
            {/* Kill feed */}
            <div className="bg-black bg-opacity-50 p-2 rounded-lg text-white max-w-xs">
              {killfeed.map((message, i) => (
                <div key={i} className="text-sm mb-1">{message}</div>
              ))}
            </div>
          </div>
          
          {/* Game controls hint */}
          <div className="absolute bottom-0 left-0 p-4 bg-black bg-opacity-50 text-white rounded-tr-lg">
            <div className="text-sm">W: Move Forward</div>
            <div className="text-sm">A/D: Rotate</div>
            <div className="text-sm">Space: Fire Cannons</div>
            <div className="text-sm">+/-: Zoom In/Out</div>
            <div className="text-sm">`/~: Toggle Admin Panel</div>
          </div>
          
          {/* Admin Panel */}
          {socket && <AdminPanel socket={socket} visible={adminPanelVisible} />}
        </>
      )}
    </div>
  );
};

export default GameCanvas; 