'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; email: string };
}

interface FetchDocumentsResponse {
  owned: Document[];
  shared: Document[];
}

// Deterministic accent color per doc
const ACCENTS = ['#6A5CE0', '#FF6B57', '#0F9C8E', '#E4A233', '#EC4899', '#06B6D4'];
const accentFor = (id: string) => ACCENTS[id.charCodeAt(0) % ACCENTS.length];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'shared'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('syncnote_token');
    const userStr = localStorage.getItem('syncnote_user');
    if (!token || !userStr) { router.push('/login'); return; }
    setCurrentUser(JSON.parse(userStr));
  }, [router]);

  const { data, isLoading } = useQuery<FetchDocumentsResponse>({
    queryKey: ['documents'],
    queryFn: () => api.get<FetchDocumentsResponse>('/documents'),
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('syncnote_token'),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => api.post<{ document: Document }>('/documents', { title }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document created!');
      setIsCreateOpen(false);
      setNewTitle('');
      router.push(`/documents/${res.document.id}`);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create document'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document deleted'); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const handleLogout = () => {
    localStorage.removeItem('syncnote_token');
    localStorage.removeItem('syncnote_user');
    toast.success('Logged out');
    router.push('/login');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';

  const getFilteredDocs = () => {
    if (!data) return [];
    const docs =
      activeTab === 'all' ? [...data.owned, ...data.shared] :
      activeTab === 'owned' ? data.owned : data.shared;
    const unique = Array.from(new Map(docs.map((d) => [d.id, d])).values());
    return unique.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredDocs = getFilteredDocs();
  const totalDocs = data ? data.owned.length + data.shared.length : 0;
  const totalCollaborators = 0; // could be derived from collab data in future

  if (!currentUser) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,560;0,9..144,680&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root{--paper:#F6F4EE;--paper-dim:#EDEAE0;--ink:#15151A;--ink-soft:#6C6B66;--line:#E1DDD0;--coral:#FF6B57;--teal:#0F9C8E;--violet:#6A5CE0;--amber:#E4A233;--card:#FFFFFF;}
        *{box-sizing:border-box;}
        body{margin:0;background:var(--paper);color:var(--ink);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
        .db-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 48px;max-width:1280px;margin:0 auto;}
        .db-logo{display:flex;align-items:center;gap:10px;font-weight:600;font-size:18px;text-decoration:none;color:var(--ink);}
        .db-logo-mark{width:32px;height:32px;border-radius:9px;background:var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(20,20,20,.25);}
        .db-nav-right{display:flex;align-items:center;gap:14px;}
        .db-avatar{width:34px;height:34px;border-radius:50%;background:var(--violet);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;font-family:'JetBrains Mono',monospace;box-shadow:0 3px 8px rgba(106,92,224,.35);}
        .db-icon-btn{width:36px;height:36px;border-radius:9px;border:1px solid var(--line);background:var(--card);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);transition:background .15s,color .15s;}
        .db-icon-btn:hover{background:var(--paper-dim);color:var(--ink);}
        .db-wrap{max-width:1280px;margin:0 auto;padding:20px 48px 80px;}
        .db-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:34px;flex-wrap:wrap;gap:16px;}
        .db-head h1{font-family:'Fraunces',serif;font-size:36px;font-weight:560;margin:0 0 6px;}
        .db-head p{color:var(--ink-soft);font-size:14.5px;margin:0;}
        .db-btn{background:var(--ink);color:var(--paper);padding:11px 20px;border-radius:9px;font-size:14px;font-weight:600;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s;font-family:'Inter',sans-serif;}
        .db-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(0,0,0,.18);}
        .db-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}
        .db-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:36px;}
        .db-stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;}
        .db-stat-num{font-family:'Fraunces',serif;font-size:28px;font-weight:560;margin-bottom:2px;}
        .db-stat-label{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;}
        .db-stat-accent{width:22px;height:3px;border-radius:2px;margin-bottom:12px;}
        .db-controls{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap;}
        .db-search{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:10px 14px;background:var(--card);flex:1;max-width:360px;}
        .db-search input{border:none;outline:none;background:transparent;font-family:'Inter',sans-serif;font-size:14px;width:100%;color:var(--ink);}
        .db-tabs{display:flex;gap:26px;border-bottom:1px solid var(--line);margin-bottom:28px;}
        .db-tab{padding:10px 2px;font-size:14px;color:var(--ink-soft);cursor:pointer;position:relative;font-weight:500;background:none;border:none;font-family:'Inter',sans-serif;}
        .db-tab.active{color:var(--ink);font-weight:600;}
        .db-tab.active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--ink);}
        .db-empty{border:1px dashed var(--line);border-radius:20px;padding:70px 20px 60px;text-align:center;background:repeating-linear-gradient(0deg,transparent,transparent 27px,var(--paper-dim) 28px);background-color:var(--card);}
        .db-empty h2{font-family:'Fraunces',serif;font-size:22px;font-weight:560;margin:0 0 8px;}
        .db-empty p{color:var(--ink-soft);font-size:14.5px;margin:0 0 26px;}
        .db-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
        .db-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;border-left-width:4px;transition:transform .15s,box-shadow .15s;cursor:pointer;}
        .db-card:hover{transform:translateY(-3px);box-shadow:0 18px 36px -18px rgba(21,21,26,.22);}
        .db-card h4{font-family:'Fraunces',serif;font-size:16.5px;margin:0;font-weight:560;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .db-card .snippet{font-size:13px;color:var(--ink-soft);line-height:1.55;margin:10px 0 18px;min-height:38px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
        .db-card .row2{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:14px;margin-top:auto;}
        .db-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-soft);}
        .db-role{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px;}
        .db-delete{width:28px;height:28px;border-radius:7px;border:1px solid var(--line);background:transparent;color:var(--ink-soft);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,color .15s;}
        .db-delete:hover{background:#FFF0EE;color:var(--coral);border-color:#FFCFC9;}
        /* modal */
        .db-overlay{position:fixed;inset:0;background:rgba(21,21,26,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50;}
        .db-modal{background:var(--card);border:1px solid var(--line);border-radius:18px;max-width:440px;width:100%;padding:32px;box-shadow:0 40px 80px -24px rgba(21,21,26,.28);}
        .db-modal h3{font-family:'Fraunces',serif;font-size:22px;font-weight:560;margin:0 0 8px;}
        .db-modal p{color:var(--ink-soft);font-size:14px;margin:0 0 22px;}
        .db-input{width:100%;border:1px solid var(--line);border-radius:9px;padding:11px 14px;font-size:14px;font-family:'Inter',sans-serif;color:var(--ink);background:var(--paper);outline:none;transition:border-color .15s,box-shadow .15s;}
        .db-input:focus{border-color:var(--violet);box-shadow:0 0 0 3px rgba(106,92,224,.12);}
        .db-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px;}
        .db-btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line);}
        @media(max-width:900px){
          .db-nav,.db-wrap{padding-left:22px;padding-right:22px;}
          .db-stats{grid-template-columns:repeat(2,1fr);}
          .db-grid{grid-template-columns:1fr;}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid #E1DDD0', background: '#F6F4EE' }}>
        <div className="db-nav">
          <Link href="/" className="db-logo">
            <div className="db-logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F6F4EE" strokeWidth="2" strokeLinecap="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            SyncNote
          </Link>
          <div className="db-nav-right">
            {/* logout */}
            <button className="db-icon-btn" onClick={handleLogout} title="Log out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <div className="db-avatar" title={currentUser.name}>{getInitials(currentUser.name)}</div>
          </div>
        </div>
      </nav>

      <div className="db-wrap">
        {/* HEADER */}
        <div className="db-head">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, {currentUser.name.split(' ')[0]}. Manage your shared canvases.</p>
          </div>
          <button className="db-btn" onClick={() => setIsCreateOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New document
          </button>
        </div>

        {/* STATS */}
        <div className="db-stats">
          {[
            { accent: '#6A5CE0', num: data?.owned.length ?? 0, label: 'My Documents' },
            { accent: '#FF6B57', num: data?.shared.length ?? 0, label: 'Shared with me' },
            { accent: '#0F9C8E', num: totalDocs, label: 'Total documents' },
            { accent: '#E4A233', num: data ? timeAgo(
              [...(data.owned), ...(data.shared)].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.updatedAt ?? new Date().toISOString()
            ) : '—', label: 'Last activity' },
          ].map((s, i) => (
            <div key={i} className="db-stat">
              <div className="db-stat-accent" style={{ background: s.accent }} />
              <div className="db-stat-num">{s.num}</div>
              <div className="db-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="db-controls">
          <div className="db-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6C6B66" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              placeholder="Search documents by title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* TABS */}
        <div className="db-tabs">
          {[
            { key: 'all', label: `All (${totalDocs})` },
            { key: 'owned', label: `My documents (${data?.owned.length ?? 0})` },
            { key: 'shared', label: `Shared with me (${data?.shared.length ?? 0})` },
          ].map((t) => (
            <button
              key={t.key}
              className={`db-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 12 }}>
            <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid #15151A', borderTopColor: 'transparent', borderRadius: '50%' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#6C6B66' }}>Loading documents…</span>
          </div>
        )}

        {/* EMPTY */}
        {!isLoading && filteredDocs.length === 0 && (
          <div className="db-empty">
            <div style={{ width: 64, height: 64, margin: '0 auto 22px' }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="14" y="8" width="36" height="48" rx="4" fill="#fff" stroke="#E1DDD0" strokeWidth="2" transform="rotate(-4 32 32)" />
                <rect x="16" y="10" width="36" height="48" rx="4" fill="#fff" stroke="#E1DDD0" strokeWidth="2" />
                <line x1="23" y1="22" x2="45" y2="22" stroke="#EDEAE0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="23" y1="30" x2="45" y2="30" stroke="#EDEAE0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="23" y1="38" x2="36" y2="38" stroke="#EDEAE0" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="48" cy="46" r="9" fill="#6A5CE0" />
                <path d="M48 42v8M44 46h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2>{searchQuery ? 'No results' : 'Nothing here yet'}</h2>
            <p>{searchQuery ? `No documents match "${searchQuery}".` : 'Create your first document — every collaborator you add joins the page instantly.'}</p>
            {!searchQuery && (
              <button className="db-btn" onClick={() => setIsCreateOpen(true)}>+ Create document</button>
            )}
          </div>
        )}

        {/* DOCUMENT GRID */}
        {!isLoading && filteredDocs.length > 0 && (
          <div className="db-grid">
            {filteredDocs.map((doc) => {
              const isOwner = doc.ownerId === currentUser.id;
              const accent = accentFor(doc.id);
              const snippet = doc.content
                ? doc.content.replace(/<[^>]+>/g, '').slice(0, 100)
                : 'No content yet…';
              return (
                <div
                  key={doc.id}
                  className="db-card"
                  style={{ borderLeftColor: accent }}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                    <h4 title={doc.title}>{doc.title}</h4>
                    <span
                      className="db-role"
                      style={{
                        background: isOwner ? '#EDEAE0' : '#ECE8FF',
                        color: isOwner ? '#6C6B66' : '#6A5CE0',
                        flexShrink: 0,
                      }}
                    >
                      {isOwner ? 'OWNER' : 'SHARED'}
                    </span>
                  </div>
                  <div className="snippet">{snippet}</div>
                  <div className="row2">
                    <span className="db-meta">edited {timeAgo(doc.updatedAt)}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!isOwner && doc.owner && (
                        <span className="db-meta">by {doc.owner.name}</span>
                      )}
                      {isOwner && (
                        <button
                          className="db-delete"
                          title="Delete document"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Permanently delete this document?')) deleteMutation.mutate(doc.id);
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setIsCreateOpen(false)}>
          <div className="db-modal">
            <h3>New document</h3>
            <p>Give it a title to get started. You can always rename it later.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                createMutation.mutate(newTitle.trim());
              }}
            >
              <input
                className="db-input"
                type="text"
                placeholder="e.g. Weekly Synclog, Project Proposal…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                required
              />
              <div className="db-modal-actions">
                <button
                  type="button"
                  className="db-btn db-btn-ghost"
                  onClick={() => { setIsCreateOpen(false); setNewTitle(''); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="db-btn"
                  disabled={createMutation.isPending || !newTitle.trim()}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
