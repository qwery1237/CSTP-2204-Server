import { Server } from 'socket.io';

export default function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: 'https://cstp-2204-jin-harinder.netlify.app',
      methods: ['GET', 'POST'],
    },
  });
}
