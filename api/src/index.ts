import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameServer } from './game/GameServer';

// Create Express app
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Basic middleware for logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  path: '/socket.io'
});

// Socket.IO connection logging
io.engine.on("connection_error", (err) => {
  console.log("Connection error:", err.req.url, err.code, err.message, err.context);
});

// Initialize game server
const gameServer = new GameServer(io);
gameServer.start();

// Handle basic routes
app.get('/', (req, res) => {
  res.send('Pirates Conquest Game Server');
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    playerCount: gameServer.getPlayerCount(),
    socketCount: io.engine.clientsCount
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  gameServer.stop();
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
}); 