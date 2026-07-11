'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface LocalUser {
  name: string;
  email: string;
  id: string;
}

function MultiplayerMock() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const collaborators = [
      { name: 'Rithvik', color: '#6A5CE0' },
      { name: 'N', color: '#FF6B57' },
    ];
    const script = [
      { who: 0, text: 'Launch checklist — ' },
      { who: 1, text: 'final review by Friday.\n\n' },
      { who: 0, text: '1. Ship pricing page copy\n' },
      { who: 1, text: '2. QA the signup flow\n' },
      { who: 0, text: '3. ' },
    ];

    const body = bodyRef.current;
    const presenceEl = presenceRef.current;
    if (!body || !presenceEl) return;

    presenceEl.innerHTML = '';
    collaborators.forEach((c) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        width: '27px', height: '27px', borderRadius: '50%',
        border: '2px solid #fff', marginLeft: '-8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
        color: '#fff', fontWeight: '600', background: c.color,
      });
      el.textContent = c.name[0];
      presenceEl.appendChild(el);
    });

    let segIdx = 0, charIdx = 0, rendered = '';
    let tid: NodeJS.Timeout | null = null;

    function render(who: number) {
      const c = collaborators[who];
      if (!body) return;
      body.innerHTML =
        rendered.replace(/\n/g, '<br>') +
        `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;color:#fff;background:${c.color};position:relative;top:-1.1em;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.18)">${c.name}</span>` +
        `<span style="display:inline-block;width:2px;height:1.1em;vertical-align:-0.2em;background:${c.color};animation:blink 1s steps(1) infinite"></span>`;
    }

    function tick() {
      if (segIdx >= script.length) {
        tid = setTimeout(() => { rendered = ''; segIdx = 0; charIdx = 0; tick(); }, 2400);
        return;
      }
      const seg = script[segIdx];
      if (charIdx < seg.text.length) {
        rendered += seg.text[charIdx++];
        render(seg.who);
        tid = setTimeout(tick, 28 + Math.random() * 35);
      } else {
        segIdx++; charIdx = 0;
        tid = setTimeout(tick, 260);
      }
    }
    tick();
    return () => { if (tid) clearTimeout(tid); };
  }, []);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative' }}>

      {/* Doc window */}
      <div style={{
        background: '#fff', border: '1px solid #E1DDD0', borderRadius: 18,
        boxShadow: '0 40px 80px -30px rgba(21,21,26,.28), 0 2px 6px rgba(21,21,26,.05)',
        overflow: 'hidden', textAlign: 'left', transform: 'rotate(-.4deg)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 22px', borderBottom: '1px solid #E1DDD0', background: '#EDEAE0',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6C6B66', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#E1DDD0','#E1DDD0','#E1DDD0'].map((c, i) => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />
              ))}
            </div>
            Q3 Launch Notes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#6C6B66', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0F9C8E', display: 'inline-block' }} />
              saved 2s ago
            </div>
            <div ref={presenceRef} style={{ display: 'flex', alignItems: 'center', paddingLeft: 8 }} />
          </div>
        </div>
        <div
          ref={bodyRef}
          style={{
            padding: '36px 40px 46px', minHeight: 220,
            fontFamily: "'Fraunces',serif", fontSize: 21, lineHeight: 1.8, color: '#15151A',
          }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('syncnote_token');
      const userStr = localStorage.getItem('syncnote_user');
      if (token && userStr) {
        try { setCurrentUser(JSON.parse(userStr)); } catch {}
      }
      setIsCheckingAuth(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('syncnote_token');
    localStorage.removeItem('syncnote_user');
    setCurrentUser(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('').toUpperCase() || 'U';

  if (isCheckingAuth) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F6F4EE', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid #15151A', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,560;0,9..144,680;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root{--paper:#F6F4EE;--paper-dim:#EDEAE0;--ink:#15151A;--ink-soft:#6C6B66;--line:#E1DDD0;--coral:#FF6B57;--teal:#0F9C8E;--violet:#6A5CE0;--amber:#E4A233;--card:#FFFFFF;}
        *{box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{margin:0;background:var(--paper);color:var(--ink);font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.25;}}
        @keyframes blink{50%{opacity:0;}}
        .lp-nav-outer{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--line);background:rgba(246,244,238,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}
        .lp-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 48px;max-width:1280px;margin:0 auto;gap:32px;}
        .lp-logo{display:flex;align-items:center;gap:9px;font-weight:600;font-size:17px;color:var(--ink);text-decoration:none;flex-shrink:0;}
        .lp-logo-mark{width:30px;height:30px;border-radius:8px;background:var(--ink);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(20,20,20,.25);flex-shrink:0;}
        .lp-nav-links{display:flex;gap:28px;font-size:14px;color:var(--ink-soft);flex:1;justify-content:center;}
        .lp-nav-links a{color:inherit;text-decoration:none;font-weight:500;transition:color .15s;}
        .lp-nav-links a:hover{color:var(--ink);}
        .lp-nav-right{display:flex;align-items:center;gap:16px;flex-shrink:0;}
        .lp-btn{background:var(--ink);color:var(--paper);padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;text-decoration:none;transition:transform .15s,box-shadow .15s;font-family:'Inter',sans-serif;}
        .lp-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(0,0,0,.2);}
        .lp-btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line);}
        .lp-nav-link{font-size:14px;font-weight:500;color:var(--ink-soft);text-decoration:none;transition:color .15s;display:flex;align-items:center;gap:4px;}
        .lp-nav-link:hover{color:var(--ink);}
        .lp-avatar{width:32px;height:32px;border-radius:50%;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:.03em;box-shadow:0 2px 6px rgba(0,0,0,.22);cursor:default;}
        .lp-hero{max-width:1280px;margin:0 auto;padding:64px 48px 80px;text-align:center;position:relative;}
        .lp-blob{position:absolute;border-radius:50%;filter:blur(70px);z-index:-1;}
        .lp-eyebrow{display:inline-flex;align-items:center;gap:8px;margin:0 auto 26px;padding:7px 14px;border-radius:100px;border:1px solid var(--line);background:var(--card);font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--ink-soft);box-shadow:0 2px 6px rgba(0,0,0,.04);}
        .lp-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--teal);animation:pulse 1.8s infinite;display:inline-block;}
        .lp-headline{font-family:'Fraunces',serif;font-weight:560;font-size:clamp(42px,6.4vw,80px);line-height:1.02;letter-spacing:-0.025em;margin:0 auto 22px;max-width:900px;}
        .lp-headline em{font-style:italic;font-weight:500;background:linear-gradient(95deg,var(--violet),var(--coral) 70%);-webkit-background-clip:text;background-clip:text;color:transparent;}
        .lp-sub{max-width:560px;margin:0 auto 34px;color:var(--ink-soft);font-size:17px;line-height:1.65;}
        .lp-ctas{display:flex;gap:12px;justify-content:center;margin-bottom:70px;flex-wrap:wrap;}
        .lp-features{max-width:1280px;margin:0 auto;padding:100px 48px 40px;}
        .lp-section-label{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}
        .lp-section-title{font-family:'Fraunces',serif;font-size:32px;font-weight:560;margin:0 0 48px;max-width:520px;}
        .lp-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .lp-feature-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px 26px;transition:transform .18s,box-shadow .18s;}
        .lp-feature-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px -20px rgba(21,21,26,.2);}
        .lp-feature-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;}
        .lp-feature-card h3{font-size:16.5px;margin:0 0 9px;font-weight:600;font-family:'Fraunces',serif;}
        .lp-feature-card p{font-size:14px;color:var(--ink-soft);line-height:1.65;margin:0;}
        .lp-cta-band{max-width:1280px;margin:80px auto 0;padding:0 48px;}
        .lp-cta-inner{background:var(--ink);color:var(--paper);border-radius:22px;padding:64px 48px;text-align:center;position:relative;overflow:hidden;}
        .lp-cta-inner h2{font-family:'Fraunces',serif;font-size:clamp(28px,4vw,42px);font-weight:560;margin:0 0 14px;}
        .lp-cta-inner p{color:#B7B6AE;margin:0 0 30px;font-size:15px;}
        .lp-cta-inner .lp-btn{background:var(--paper);color:var(--ink);}
        .lp-cta-glow{position:absolute;width:400px;height:400px;background:var(--violet);border-radius:50%;filter:blur(100px);opacity:.35;top:-160px;right:-100px;}
        .lp-footer{text-align:center;padding:32px;color:var(--ink-soft);font-family:'JetBrains Mono',monospace;font-size:12px;border-top:1px solid var(--line);}
        @media(max-width:900px){
          .lp-nav{padding:18px 22px;}
          .lp-nav-links{display:none;}
          .lp-hero{padding:48px 20px 60px;}
          .lp-feature-grid{grid-template-columns:1fr;}
          .lp-features{padding:80px 20px 20px;}
          .lp-cta-band{padding:0 20px;}
          .lp-cta-inner{padding:44px 24px;}
        }
      `}</style>

      {/* NAV */}
      <div className="lp-nav-outer">
        <nav className="lp-nav">
          <Link href="/" className="lp-logo">
            <div className="lp-logo-mark">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F6F4EE" strokeWidth="2" strokeLinecap="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            SyncNote
          </Link>

          <div className="lp-nav-right">
            {currentUser ? (
              <>
                <Link href="/dashboard" className="lp-nav-link">
                  Dashboard
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <div className="lp-avatar" title={currentUser.name}>{getInitials(currentUser.name)}</div>
              </>
            ) : (
              <>
                <Link href="/login" className="lp-nav-link">Sign In</Link>
                <Link href="/register" className="lp-btn">Get Started</Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-blob" style={{ width: 380, height: 380, background: 'var(--violet)', top: -140, left: -100, opacity: 0.3 }} />
        <div className="lp-blob" style={{ width: 320, height: 320, background: 'var(--coral)', top: 60, right: -140, opacity: 0.2 }} />

        <div className="lp-eyebrow"><span className="dot" /> Real-time document collaboration</div>
        <h1 className="lp-headline">Write together.<br /><em>Watch it happen live.</em></h1>
        <p className="lp-sub">
          SyncNote is a focused workspace for teams who think out loud together — instant edits, live presence, and autosaved history, without the clutter.
        </p>
        <div className="lp-ctas">
          {currentUser ? (
            <Link href="/dashboard" className="lp-btn">Go to your dashboard →</Link>
          ) : (
            <>
              <Link href="/register" className="lp-btn">Create your free space →</Link>
              <Link href="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
            </>
          )}
        </div>
        <MultiplayerMock />
      </section>

      {/* FEATURES */}
      <section className="lp-features" id="features">
        <div className="lp-section-label">// why teams switch</div>
        <h2 className="lp-section-title">Everything a shared doc needs, nothing it doesn't.</h2>
        <div className="lp-feature-grid">
          {[
            {
              bg: '#FFE8E3', stroke: 'var(--coral)',
              icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
              title: 'Instant collaboration',
              desc: 'Edits propagate to every collaborator in real time. Live cursors and typing signals keep everyone in lock-step — no refresh, no lag.',
            },
            {
              bg: '#DFF5F1', stroke: 'var(--teal)',
              icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
              title: 'Autosave & history',
              desc: 'Quiet autosaves on idle. Checkpoint any version manually, and roll back to a past draft in a single click.',
            },
            {
              bg: '#ECE8FF', stroke: 'var(--violet)',
              icon: <><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
              title: 'Granular access',
              desc: 'Delegate OWNER, EDITOR, or read-only VIEWER roles per document, per collaborator.',
            },
          ].map((f) => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon" style={{ background: f.bg }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={f.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <div className="lp-cta-band">
        <div className="lp-cta-inner">
          <div className="lp-cta-glow" />
          <h2>Your next note is one click away.</h2>
          <p>No credit card. No install. Just a shared page and a cursor.</p>
          <Link href={currentUser ? '/dashboard' : '/register'} className="lp-btn">
            {currentUser ? 'Open your dashboard →' : 'Create your first document →'}
          </Link>
        </div>
      </div>

      <footer className="lp-footer">
        © {new Date().getFullYear()} SyncNote — built for teams who think out loud.
      </footer>
    </>
  );
}
