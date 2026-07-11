import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Plus, Trash2, X } from 'lucide-react';

type DocumentRole = 'OWNER' | 'EDITOR' | 'VIEWER';

interface Collaborator {
  id: string;
  documentId: string;
  userId: string;
  role: DocumentRole;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface CollaboratorModalProps {
  documentId: string;
  documentRole: DocumentRole;
  onClose: () => void;
}

export default function CollaboratorModal({ documentId, documentRole, onClose }: CollaboratorModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<DocumentRole>('EDITOR');
  const isOwner = documentRole === 'OWNER';

  // Fetch collaborators query
  const { data: collabData, isLoading } = useQuery<{ collaborators: Collaborator[] }>({
    queryKey: ['collaborators', documentId],
    queryFn: () => api.get<{ collaborators: Collaborator[] }>(`/documents/${documentId}/collaborators`),
  });

  // Add collaborator mutation
  const addMutation = useMutation({
    mutationFn: (body: { email: string; role: DocumentRole }) =>
      api.post(`/documents/${documentId}/collaborators`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', documentId] });
      toast.success('Collaborator added!');
      setEmail('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add collaborator');
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: DocumentRole }) =>
      api.patch(`/documents/${documentId}/collaborators/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', documentId] });
      toast.success('Role updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update role');
    },
  });

  // Remove collaborator mutation
  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/documents/${documentId}/collaborators/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', documentId] });
      toast.success('Collaborator removed');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove collaborator');
    },
  });

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    addMutation.mutate({ email, role });
  };

  const handleRoleChange = (userId: string, newRole: DocumentRole) => {
    updateMutation.mutate({ userId, role: newRole });
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (confirm('Are you sure you want to remove this collaborator?')) {
      removeMutation.mutate(userId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-[#e4e4e7] rounded-lg max-w-lg w-full p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-bold text-zinc-900 mb-2">Manage Collaborators</h3>
        <p className="text-xs text-zinc-500 mb-6">
          {isOwner
            ? 'Invite users by email to collaborate on this canvas. Assign editor or view-only roles.'
            : 'View-only access list for this document. Only the owner can make changes.'}
        </p>

        {/* Invite Form - Only visible to Document Owner */}
        {isOwner && (
          <form onSubmit={handleAddCollaborator} className="flex gap-2 mb-6">
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-zinc-900"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as DocumentRole)}
              className="border border-zinc-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none text-zinc-950"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="inline-flex items-center gap-1 bg-zinc-950 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-black transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Invite
            </button>
          </form>
        )}

        {/* Collaborators List */}
        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
          {isLoading && (
            <div className="text-center py-6 text-sm text-zinc-500">Loading collaborators...</div>
          )}

          {!isLoading && collabData?.collaborators.length === 0 && (
            <div className="text-center py-6 text-xs text-zinc-400">
              No collaborators invited yet.
            </div>
          )}

          {!isLoading &&
            collabData?.collaborators.map((collab) => (
              <div key={collab.id} className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{collab.user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{collab.user.email}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isOwner ? (
                    <select
                      value={collab.role}
                      onChange={(e) => handleRoleChange(collab.user.id, e.target.value as DocumentRole)}
                      disabled={updateMutation.isPending}
                      className="border border-zinc-200 rounded px-1.5 py-1 text-xs bg-white text-zinc-950 focus:outline-none"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 font-medium">
                      {collab.role.toLowerCase()}
                    </span>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => handleRemoveCollaborator(collab.user.id)}
                      disabled={removeMutation.isPending}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors"
                      title="Remove Collaborator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="border border-zinc-300 bg-white text-zinc-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
