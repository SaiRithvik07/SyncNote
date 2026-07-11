'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';

import { api } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
// Never SSR the editor — Awareness uses browser APIs during construction
const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });
import PresenceBar from '@/components/PresenceBar';
import CollaboratorModal from '@/components/CollaboratorModal';
import VersionHistoryModal from '@/components/VersionHistoryModal';
import {
  ArrowLeft,
  CloudLightning,
  Edit2,
  FileText,
  History,
  Lock,
  Save,
  Share2,
} from 'lucide-react';

interface DocumentDetails {
  document: {
    id: string;
    title: string;
    content: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    owner: { id: string; name: string; email: string };
  };
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Real-time states
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; name: string; email: string }[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>({});

  // Modal open states
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Sync state tracking flags
  const socketRef = useRef<Socket | null>(null);
  const localChangeRef = useRef(false);
  const activeEditingRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoVersionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Yjs — stored in state so the Editor guard is provably false during SSR
  // and only becomes true after the client-side effect runs.
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  // Keep refs so socket handlers (closures) always see the latest values
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  // 1. Authenticate user client-side + init Yjs (runs only in the browser)
  useEffect(() => {
    setIsMounted(true);

    // Create Yjs doc + Awareness exactly once per mount
    if (!ydocRef.current) {
      const doc = new Y.Doc({ guid: documentId });
      const aw = new Awareness(doc);
      ydocRef.current = doc;
      awarenessRef.current = aw;
      setYdoc(doc);
      setAwareness(aw);
    }

    const token = localStorage.getItem('syncnote_token');
    const userStr = localStorage.getItem('syncnote_user');
    if (!token || !userStr) {
      router.push('/login');
    } else {
      setCurrentUser(JSON.parse(userStr));
    }
  }, [router, documentId]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('syncnote_token') : null;

  // 2. Fetch document details
  const { data, isLoading, error } = useQuery<DocumentDetails>({
    queryKey: ['documents', documentId],
    queryFn: () => api.get<DocumentDetails>(`/documents/${documentId}`),
    enabled: !!token && !!documentId,
  });

  const documentData = data?.document;
  const userRole = data?.role;
  const isEditable = userRole === 'OWNER' || userRole === 'EDITOR';

  // Set initial content and title when query completes
  useEffect(() => {
    if (documentData) {
      setDocumentTitle(documentData.title);
      if (!editorContent) {
        setEditorContent(documentData.content);
      }
    }
  }, [documentData]);

  // 3. Mutators
  // Autosave patch request
  const updateContentMutation = useMutation({
    mutationFn: (content: string) => api.patch(`/documents/${documentId}`, { content }),
    onSuccess: () => {
      // Quietly invalidate queries to keep cache warm without full reload flickering
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
    },
    onError: (err: any) => {
      toast.error('Autosave failed: ' + (err.message || 'Server error'));
    },
  });

  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: (title: string) => api.patch(`/documents/${documentId}`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      toast.success('Title updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update title');
    },
  });

  // Manual Version Save
  const saveVersionMutation = useMutation({
    mutationFn: (content: string) => api.post(`/documents/${documentId}/versions`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', documentId] });
      toast.success('Version snapshot saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save version snapshot');
    },
  });

  // 4. Socket.IO connection and syncing
  useEffect(() => {
    if (!token || !documentId || !currentUser || !ydoc || !awareness) return;

    // Use local aliases (same objects as state, kept for clarity in this block)
    const localYdoc = ydoc;
    const localAwareness = awareness;

    // Define distinct collaborator colors
    const COLLABORATOR_COLORS = ['#6E62E8', '#FF6B57', '#149E90', '#E7A93C'];
    const getColorForUser = (userId: string) => {
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
      return COLLABORATOR_COLORS[index];
    };

    const userColor = getColorForUser(currentUser.id);

    // Initialize user presence context in awareness state
    localAwareness.setLocalStateField('user', {
      name: currentUser.name,
      color: userColor,
      isTyping: false,
    });

    // Connect socket
    const socket = getSocket(token);
    socketRef.current = socket;
    socket.connect();

    // Socket Event Listeners
    socket.on('presence-update', (users: { userId: string; name: string; email: string }[]) => {
      setOnlineUsers(users);
    });

    socket.on('typing', ({ userId, name, isTyping }: { userId: string; name: string; isTyping: boolean }) => {
      if (userId !== currentUser.id) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          if (isTyping) {
            updated[userId] = name;
          } else {
            delete updated[userId];
          }
          return updated;
        });
      }
    });

    // --- YJS Socket Listeners ---
    socket.on('yjs-sync-step-1', ({ stateVector }: { stateVector: string }) => {
      const serverSV = Uint8Array.from(Buffer.from(stateVector, 'base64'));
      
      const clientSV = Y.encodeStateVector(localYdoc);
      socket.emit('yjs-sync-step-2', {
        stateVector: Buffer.from(clientSV).toString('base64'),
      });

      const update = Y.encodeStateAsUpdate(localYdoc, serverSV);
      socket.emit('yjs-update', {
        update: Buffer.from(update).toString('base64'),
      });
    });

    socket.on('yjs-sync-step-2-reply', ({ update }: { update: string }) => {
      try {
        const binaryUpdate = Uint8Array.from(Buffer.from(update, 'base64'));
        Y.applyUpdate(localYdoc, binaryUpdate, socket);
      } catch (e) {
        console.error('Error applying sync-2 update:', e);
      }
    });

    socket.on('yjs-update', ({ update }: { update: string }) => {
      try {
        const binaryUpdate = Uint8Array.from(Buffer.from(update, 'base64'));
        Y.applyUpdate(localYdoc, binaryUpdate, socket);
      } catch (e) {
        console.error('Error applying yjs update:', e);
      }
    });

    // --- YJS Awareness Listeners ---
    socket.on('awareness-update', ({ update }: { update: string }) => {
      try {
        const binaryUpdate = Uint8Array.from(Buffer.from(update, 'base64'));
        applyAwarenessUpdate(localAwareness, binaryUpdate, socket);
      } catch (e) {
        console.error('Error applying awareness update:', e);
      }
    });

    socket.on('awareness-query', () => {
      const update = encodeAwarenessUpdate(localAwareness, [localYdoc.clientID]);
      socket.emit('awareness-update', {
        update: Buffer.from(update).toString('base64'),
      });
    });

    const handleYjsUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== socket) {
        socket.emit('yjs-update', {
          update: Buffer.from(update).toString('base64'),
        });
      }
    };
    localYdoc.on('update', handleYjsUpdate);

    // Listen to local awareness updates and broadcast them
    const handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => {
      if (origin === 'local' || origin === null) {
        const update = encodeAwarenessUpdate(localAwareness, [localYdoc.clientID]);
        socket.emit('awareness-update', {
          update: Buffer.from(update).toString('base64'),
        });
      }
    };
    localAwareness.on('update', handleAwarenessUpdate);

    // Join document room
    socket.emit('join-document', documentId);

    // Request other active clients awareness states
    socket.emit('awareness-query');

    // Cleanup on unmount or workspace leaves
    return () => {
      localYdoc.off('update', handleYjsUpdate);
      localAwareness.off('update', handleAwarenessUpdate);

      if (socket) {
        if (activeEditingRef.current && isEditable) {
          api.post(`/documents/${documentId}/versions`, { content: editorContent }).catch(() => {});
        }

        socket.emit('leave-document', documentId);
        socket.off('presence-update');
        socket.off('typing');
        socket.off('yjs-sync-step-1');
        socket.off('yjs-sync-step-2-reply');
        socket.off('yjs-update');
        socket.off('awareness-update');
        socket.off('awareness-query');
        disconnectSocket();
      }
    };
  }, [token, documentId, currentUser, ydoc, awareness]);

  // 5. Autosave Debounce Logic
  useEffect(() => {
    if (!isEditable) return;

    // Check if change is locally made by user typing (not socket push)
    if (localChangeRef.current) {
      activeEditingRef.current = true;

      // Clear any pending autosave timers
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      // Schedule autosave after 2.5 seconds of idle typing
      autosaveTimeoutRef.current = setTimeout(() => {
        updateContentMutation.mutate(editorContent);
        localChangeRef.current = false;
      }, 2500);
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [editorContent, isEditable]);

  // 6. Automatic Versioning Interval (Every 5 minutes of active editing)
  useEffect(() => {
    if (!isEditable) return;

    autoVersionIntervalRef.current = setInterval(() => {
      if (activeEditingRef.current) {
        saveVersionMutation.mutate(editorContent);
        activeEditingRef.current = false; // Reset active state after snapshot
      }
    }, 5 * 60 * 1000);

    return () => {
      if (autoVersionIntervalRef.current) {
        clearInterval(autoVersionIntervalRef.current);
      }
    };
  }, [editorContent, isEditable]);

  // Helper trigger for typing indicators
  const handleTypingStatus = (isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { documentId, isTyping });
    }
    if (awarenessRef.current && currentUser) {
      const localState = awarenessRef.current.getLocalState();
      const userState = localState?.user;
      awarenessRef.current.setLocalStateField('user', {
        ...userState,
        name: currentUser.name,
        color: userState?.color || '#6E62E8',
        isTyping,
      });
    }
  };

  // Callback on local changes from Editor.tsx
  const handleEditorChange = (newHtml: string) => {
    setEditorContent(newHtml);
    localChangeRef.current = true;

    // Broadcast local edits to collaborators instantly
    if (socketRef.current) {
      socketRef.current.emit('edit', {
        documentId,
        content: newHtml,
      });
    }
  };

  // Handler when restoring version from history modal
  const handleRestoreVersion = (restoredContent: string) => {
    setEditorContent(restoredContent);
    // Broadcast restore event instantly to online collaborators
    if (socketRef.current) {
      socketRef.current.emit('edit', {
        documentId,
        content: restoredContent,
      });
    }
    toast.success('Document updated and broadcast to all users');
  };

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (documentTitle.trim() && documentTitle !== documentData?.title) {
      updateTitleMutation.mutate(documentTitle);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa]">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full" />
        <p className="text-sm text-zinc-500 mt-3">Loading workspace...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa]">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full" />
        <p className="text-sm text-zinc-500 mt-3">Loading document details...</p>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] px-6 text-center">
        <h2 className="text-2xl font-bold text-zinc-900">Document unavailable</h2>
        <p className="text-zinc-500 mt-2 max-w-sm">
          {error?.message || 'The requested document does not exist, or you lack access permissions.'}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 bg-zinc-950 text-white px-4 py-2 rounded-md hover:bg-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      {/* Document Header Bar */}
      <header className="bg-white border-b border-[#e4e4e7] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
            {isEditingTitle && isEditable ? (
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="font-bold text-md border border-zinc-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-zinc-950 text-zinc-900"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="font-bold text-zinc-900 truncate max-w-[150px] sm:max-w-xs md:max-w-md text-md"
                  title={documentTitle}
                >
                  {documentTitle}
                </span>
                {isEditable && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition-colors shrink-0"
                    title="Edit title"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {!isEditable && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded font-semibold text-zinc-500 shrink-0">
                <Lock className="w-2.5 h-2.5" />
                Read-Only
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {isEditable && (
            <button
              onClick={() => saveVersionMutation.mutate(editorContent)}
              disabled={saveVersionMutation.isPending}
              className="inline-flex items-center justify-center gap-1 bg-white border border-zinc-200 text-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
              title="Save Version Snapshot"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Snapshot</span>
            </button>
          )}

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex items-center justify-center gap-1 bg-white border border-zinc-200 text-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-zinc-50 transition-colors shadow-sm"
            title="View Snapshot History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => setIsCollabOpen(true)}
            className="inline-flex items-center justify-center gap-1 bg-zinc-950 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-black transition-colors shadow-sm"
            title="Invite/View Access List"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* Online Users & Typing Indicators Presence Bar */}
      {currentUser && (
        <PresenceBar
          onlineUsers={onlineUsers}
          typingUsers={typingUsers}
          currentUserId={currentUser.id}
        />
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {ydoc && awareness ? (
          <Editor
            ydoc={ydoc}
            awareness={awareness}
            initialContent={documentData.content}
            onChange={handleEditorChange}
            onTyping={handleTypingStatus}
            editable={isEditable}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-6 h-6 border-2 border-zinc-950 border-t-transparent rounded-full" />
          </div>
        )}
        
        {/* Autosave Sync Status */}
        {isEditable && (
          <div className="mt-4 flex items-center justify-end text-xs text-zinc-400 gap-1.5 font-medium select-none">
            <CloudLightning className="w-3.5 h-3.5" />
            {updateContentMutation.isPending ? (
              <span>Saving changes...</span>
            ) : (
              <span>All changes saved to cloud</span>
            )}
          </div>
        )}
      </main>

      {/* Share Modals */}
      {isCollabOpen && userRole && (
        <CollaboratorModal
          documentId={documentId}
          documentRole={userRole}
          onClose={() => setIsCollabOpen(false)}
        />
      )}

      {isHistoryOpen && userRole && (
        <VersionHistoryModal
          documentId={documentId}
          documentRole={userRole}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}
