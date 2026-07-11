import { io, Socket } from 'socket.io-client';
import { env } from './env';

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (socket) {
    if (socket.connected && (socket.auth as any)?.token === token) {
      return socket;
    }
    socket.disconnect();
  }

  socket = io(env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
