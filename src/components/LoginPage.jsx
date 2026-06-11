import React, { useEffect } from 'react';
import { BookOpen, Lock } from 'lucide-react';
import LoginForm from './LoginForm';

export default function LoginPage({ onLogin, onCancel, isLoggedIn }) {
  useEffect(() => {
    if (isLoggedIn) {
      onCancel();
    }
  }, [isLoggedIn, onCancel]);

  return (
    <div className="login-page">
      <div className="glass-panel login-page-card animate-fade-in">
        <div className="login-page-brand">
          <BookOpen size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h1>HAC Book Manager</h1>
            <p>소장 서적 인벤토리 및 위시리스트 관리</p>
          </div>
        </div>

        <div className="login-page-heading">
          <Lock size={18} style={{ color: 'var(--primary)' }} />
          <h2>ID/PW 회원가입 / 로그인</h2>
        </div>

        <LoginForm onLogin={onLogin} onCancel={onCancel} />
      </div>
    </div>
  );
}
