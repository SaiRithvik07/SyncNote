import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { env } from '../config/env';
import { prisma } from '../config/db';

interface SocketUser {
  id: string;
  email: string;
  name: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

interface UserPresence {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  documentId: string;
}

// In-memory store for active users keyed by socket.id
const activePresences = new Map<string, UserPresence>();

// In-memory store for active Yjs documents
const activeDocs = new Map<string, Y.Doc>();

export const initSocket = (httpServer: HttpServer, corsOrigin: string | string[]) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,         // reflect request origin — works for all domains with credentials
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as SocketUser;
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };

      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`🔌 User connected to socket: ${user.name} (${user.email}) - SocketID: ${socket.id}`);

    // Helper to get all users in a specific document room
    const getRoomUsers = (documentId: string) => {
      const users: { userId: string; name: string; email: string }[] = [];
      const seen = new Set<string>();

      activePresences.forEach((presence) => {
        if (presence.documentId === documentId && !seen.has(presence.userId)) {
          seen.add(presence.userId);
          users.push({
            userId: presence.userId,
            name: presence.name,
            email: presence.email,
          });
        }
      });
      return users;
    };

    // Helper to clean up active doc if no online users are left
    const checkRoomCleanup = (documentId: string) => {
      const roomUsers = getRoomUsers(documentId);
      if (roomUsers.length === 0) {
        activeDocs.delete(documentId);
        console.log(`🧹 Cleared active Yjs document memory for room ${documentId}`);
      }
    };

    socket.on('join-document', (documentId: string) => {
      socket.join(documentId);
      console.log(`📝 User ${user.name} joined document room: ${documentId}`);

      // Register presence
      activePresences.set(socket.id, {
        socketId: socket.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        documentId,
      });

      // Broadcast updated user presence list to the room
      const roomUsers = getRoomUsers(documentId);
      console.log(`👥 Active users in room ${documentId}:`, roomUsers.map(u => u.name));
      io.to(documentId).emit('presence-update', roomUsers);

      // Get or create Y.Doc for this document
      let ydoc = activeDocs.get(documentId);
      if (!ydoc) {
        ydoc = new Y.Doc();
        activeDocs.set(documentId, ydoc);
      }

      // Send initial sync state to client
      const stateVector = Y.encodeStateVector(ydoc);
      socket.emit('yjs-sync-step-1', {
        stateVector: Buffer.from(stateVector).toString('base64'),
      });
    });

    socket.on('leave-document', (documentId: string) => {
      socket.leave(documentId);
      console.log(`🚪 User ${user.name} left document room: ${documentId}`);

      // Remove presence
      activePresences.delete(socket.id);

      // Broadcast updated user presence list to the room
      io.to(documentId).emit('presence-update', getRoomUsers(documentId));
      
      // Stop typing status if they left
      socket.to(documentId).emit('typing', {
        userId: user.id,
        name: user.name,
        isTyping: false,
      });

      checkRoomCleanup(documentId);
    });

    socket.on('yjs-sync-step-2', ({ stateVector }: { stateVector: string }) => {
      const documentId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (!documentId) return;

      const ydoc = activeDocs.get(documentId);
      if (!ydoc) return;

      const clientSV = Uint8Array.from(Buffer.from(stateVector, 'base64'));
      const update = Y.encodeStateAsUpdate(ydoc, clientSV);
      
      socket.emit('yjs-sync-step-2-reply', {
        update: Buffer.from(update).toString('base64'),
      });
    });

    socket.on('yjs-update', ({ update }: { update: string }) => {
      const documentId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (!documentId) return;

      const ydoc = activeDocs.get(documentId);
      if (!ydoc) return;

      try {
        const binaryUpdate = Uint8Array.from(Buffer.from(update, 'base64'));
        Y.applyUpdate(ydoc, binaryUpdate, socket);
        socket.to(documentId).emit('yjs-update', { update });
      } catch (e) {
        console.error('Error applying Yjs update:', e);
      }
    });

    socket.on('awareness-update', ({ update }: { update: string }) => {
      const documentId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (!documentId) return;
      socket.to(documentId).emit('awareness-update', { update });
    });

    socket.on('awareness-query', () => {
      const documentId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (!documentId) return;
      socket.to(documentId).emit('awareness-query');
    });

    socket.on('edit', ({ documentId, content }: { documentId: string; content: string }) => {
      console.log(`✍️ Edit received on document ${documentId} from ${user.name}`);
      // Fallback for non-Yjs clients or general edit trigger
      socket.to(documentId).emit('edit', {
        content,
        senderId: user.id,
      });
    });

    socket.on('typing', ({ documentId, isTyping }: { documentId: string; isTyping: boolean }) => {
      // Broadcast typing indicator to all other sockets in the document room
      socket.to(documentId).emit('typing', {
        userId: user.id,
        name: user.name,
        isTyping,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected from socket: ${user.name} - SocketID: ${socket.id}`);
      const presence = activePresences.get(socket.id);
      if (presence) {
        const { documentId } = presence;
        activePresences.delete(socket.id);

        // Broadcast presence updates to the room the user was in
        io.to(documentId).emit('presence-update', getRoomUsers(documentId));
        
        // Broadcast typing stopped
        socket.to(documentId).emit('typing', {
          userId: user.id,
          name: user.name,
          isTyping: false,
        });

        checkRoomCleanup(documentId);
      }
    });
  });

  return io;
};
