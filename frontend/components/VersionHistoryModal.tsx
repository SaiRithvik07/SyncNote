import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Clock, RotateCcw, X } from 'lucide-react';

interface VersionSnapshot {
  id: string;
  documentId: string;
  content: string;
  editedBy: string;
  createdAt: string;
}

interface VersionHistoryModalProps {
  documentId: string;
  documentRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  onClose: () => void;
  onRestore: (updatedContent: string) => void;
}

export default function VersionHistoryModal({
  documentId,
  documentRole,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const queryClient = useQueryClient();
  const canRestore = documentRole === 'OWNER' || documentRole === 'EDITOR';

  // Fetch version snapshots
  const { data: versionData, isLoading } = useQuery<{ versions: VersionSnapshot[] }>({
    queryKey: ['versions', documentId],
    queryFn: () => api.get<{ versions: VersionSnapshot[] }>(`/documents/${documentId}/versions`),
  });

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: (versionId: string) =>
      api.post<{ document: { content: string } }>(`/documents/${documentId}/versions/${versionId}/restore`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      toast.success('Document successfully restored to selected snapshot');
      onRestore(res.document.content);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to restore snapshot');
    },
  });

  const handleRestore = (versionId: string) => {
    if (!canRestore) return;
    if (
      confirm(
        'Are you sure you want to restore this snapshot? This will overwrite the current live document content.'
      )
    ) {
      restoreMutation.mutate(versionId);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-[#e4e4e7] rounded-lg max-w-md w-full p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-bold text-zinc-900 mb-2">Version History</h3>
        <p className="text-xs text-zinc-500 mb-6">
          View manual or automatic snapshots taken for this document. Restore to roll back changes.
        </p>

        {/* Snapshots List */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {isLoading && (
            <div className="text-center py-8 text-sm text-zinc-500">Loading version snapshots...</div>
          )}

          {!isLoading && versionData?.versions.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-400">
              No version snapshots saved for this document.
            </div>
          )}

          {!isLoading &&
            versionData?.versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between gap-4 border border-zinc-100 rounded-md p-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-zinc-800 font-semibold text-xs">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{formatDate(version.createdAt)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 truncate">
                    Saved by <span className="font-medium">{version.editedBy}</span>
                  </p>
                </div>

                {canRestore && (
                  <button
                    onClick={() => handleRestore(version.id)}
                    disabled={restoreMutation.isPending}
                    className="inline-flex items-center gap-1 bg-zinc-100 border border-zinc-200 text-zinc-800 text-[11px] font-semibold px-2.5 py-1.5 rounded hover:bg-zinc-200 hover:border-zinc-300 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                )}
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
