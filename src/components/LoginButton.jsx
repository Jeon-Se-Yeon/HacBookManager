import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, Check, ChevronDown, User } from 'lucide-react';

const GOOGLE_CLIENT_ID = ""; // Insert your Google Developer Console Client ID here to connect real Google Auth!

export default function LoginButton({ user, onLogin, onLogout }) {
  const [showSimulatedPopup, setShowSimulatedPopup] = useState(false);
  const [typedName, setTypedName] = useState('홍길동');
  const [typedEmail, setTypedEmail] = useState('hac.library@gmail.com');

  // Official GSI integration
  useEffect(() => {
    if (GOOGLE_CLIENT_ID && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            // Decode the JWT token to extract user info
            const payload = parseJwt(response.credential);
            onLogin({
              name: payload.name,
              email: payload.email,
              picture: payload.picture
            });
          }
        });

        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "dark", size: "medium", shape: "pill" }
        );
      } catch (e) {
        console.error("GSI initialization failed", e);
      }
    }
  }, [user]);

  // Helper to parse JWT payload
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return {};
    }
  };

  const handleSimulatedSubmit = (e) => {
    e.preventDefault();
    if (!typedName || !typedEmail) return;

    onLogin({
      name: typedName.trim(),
      email: typedEmail.trim().toLowerCase(),
      // Generate a beautiful, high-quality dynamic abstract profile photo using UI Avatars
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(typedName)}&background=6366f1&color=fff&size=128&bold=true`
    });
    setShowSimulatedPopup(false);
  };

  const triggerRealOrSimulatedLogin = () => {
    if (GOOGLE_CLIENT_ID && window.google) {
      // GSI will handle it via its loaded button, but we offer a click trigger
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        setShowSimulatedPopup(true);
      }
    } else {
      setShowSimulatedPopup(true);
    }
  };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* User profile picture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '4px 10px', borderRadius: '20px' }}>
          {user.picture ? (
            <img 
              src={user.picture} 
              alt={user.name} 
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <User size={14} style={{ color: 'var(--primary)' }} />
          )}
          <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '600' }} title={user.email}>{user.name}</span>
        </div>

        {/* Log Out button */}
        <button 
          className="glass-button" 
          onClick={onLogout}
          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
        >
          <LogOut size={12} />
          <span>로그아웃</span>
        </button>

      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        
        {/* Target div for official google button */}
        {GOOGLE_CLIENT_ID && <div id="google-signin-btn"></div>}

        {/* Fallback/Simulated Button */}
        {(!GOOGLE_CLIENT_ID || !window.google) && (
          <button 
            className="glass-button active glow-active"
            onClick={triggerRealOrSimulatedLogin}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
          >
            <LogIn size={13} />
            <span>구글 로그인</span>
          </button>
        )}

      </div>

      {/* Simulated Google Popup Modal */}
      {showSimulatedPopup && (
        <div className="modal-backdrop" onClick={() => setShowSimulatedPopup(false)} style={{ zIndex: 200 }}>
          <div 
            className="glass-panel modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '380px', 
              padding: '24px', 
              background: '#fff', 
              color: '#1f2937', 
              border: 'none',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)' 
            }}
          >
            {/* Google Identity Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', fontFamily: 'sans-serif' }}>Google 계정으로 로그인</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>HAC Book Manager 웹앱에 계속하기</p>
            </div>

            {/* Simulation Chooser Form */}
            <form onSubmit={handleSimulatedSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>이름</label>
                <input 
                  type="text" 
                  value={typedName} 
                  onChange={(e) => setTypedName(e.target.value)}
                  style={{ border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', outline: 'none', color: '#111827', width: '100%', fontSize: '0.85rem' }} 
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>이메일 주소</label>
                <input 
                  type="email" 
                  value={typedEmail} 
                  onChange={(e) => setTypedEmail(e.target.value)}
                  style={{ border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', outline: 'none', color: '#111827', width: '100%', fontSize: '0.85rem' }} 
                  required
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#6b7280', background: '#f3f4f6', padding: '10px', borderRadius: '6px', lineHeight: '1.4' }}>
                ℹ️ **Google OAuth 시뮬레이션 알림**: 실제 구글 클라이언트 ID가 없을 때 테스트할 수 있도록 제공되는 시뮬레이터입니다. 프로필명과 이메일을 입력하시면 해당 계정만의 고유한 인벤토리가 동적으로 연결됩니다!
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSimulatedPopup(false)}
                  style={{ background: 'transparent', border: '1px solid #d1d5db', color: '#374151', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                >
                  취소
                </button>
                <button 
                  type="submit"
                  style={{ background: '#1a73e8', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  계속
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
