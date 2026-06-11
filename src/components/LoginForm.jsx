import React, { useState } from 'react';
import { AlertCircle, UserPlus, LogIn, Loader2, ArrowLeft } from 'lucide-react';
import { loginWithServer, signupWithServer } from '../utils/authApi';

export default function LoginForm({ onLogin, onCancel }) {
  const [mode, setMode] = useState('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupRole, setSignupRole] = useState('user');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusText('');

    const cleanId = userId.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();
    if (!cleanId || !cleanPassword) {
      setError('ID와 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!cleanName) {
          setError('회원가입 시 이름을 입력해주세요.');
          return;
        }
        const { user, token } = await signupWithServer({
          userId: cleanId,
          password: cleanPassword,
          name: cleanName,
          role: signupRole,
          adminCode: adminCode.trim(),
        });
        setStatusText('회원가입이 완료되었습니다.');
        onLogin({ user, token });
        return;
      }

      const { user, token } = await loginWithServer(cleanId, cleanPassword);
      setStatusText('로그인되었습니다.');
      onLogin({ user, token });
    } catch (err) {
      const message = err.message || '요청에 실패했습니다.';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError(
          '인증 서버에 연결할 수 없습니다. Netlify 배포 사이트이거나 로컬에서는 `npm run dev` 후 http://localhost:8888 로 접속해 주세요.'
        );
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <p className="login-form-intro">
        일반 사용자는 독서 상태를 수정할 수 있고, 관리자는 도서 삭제/추가/전체 편집 권한을 가집니다.
      </p>

      <div className="login-form-mode-tabs">
        <button
          type="button"
          className={`glass-button ${mode === 'login' ? 'active' : ''}`}
          onClick={() => {
            setMode('login');
            setError('');
            setStatusText('');
          }}
          disabled={isSubmitting}
        >
          로그인
        </button>
        <button
          type="button"
          className={`glass-button ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => {
            setMode('signup');
            setError('');
            setStatusText('');
          }}
          disabled={isSubmitting}
        >
          회원가입
        </button>
      </div>

      {mode === 'signup' && (
        <>
          <div className="login-form-field">
            <label>이름</label>
            <input
              className="glass-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="이름 입력"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="login-form-field">
            <label>권한 선택</label>
            <div className="login-form-mode-tabs">
              <button
                type="button"
                className={`glass-button ${signupRole === 'user' ? 'active' : ''}`}
                onClick={() => setSignupRole('user')}
                disabled={isSubmitting}
              >
                일반 사용자
              </button>
              <button
                type="button"
                className={`glass-button ${signupRole === 'admin' ? 'active' : ''}`}
                onClick={() => setSignupRole('admin')}
                disabled={isSubmitting}
              >
                관리자
              </button>
            </div>
          </div>

          {signupRole === 'admin' && (
            <div className="login-form-field">
              <label>관리자 등록 코드</label>
              <input
                type="password"
                className="glass-input"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                placeholder="관리자 코드 입력"
                disabled={isSubmitting}
              />
            </div>
          )}
        </>
      )}

      <div className="login-form-field">
        <label>ID</label>
        <input
          className="glass-input"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="아이디 입력"
          autoFocus={mode !== 'signup'}
          disabled={isSubmitting}
        />
      </div>

      <div className="login-form-field">
        <label>비밀번호</label>
        <input
          type="password"
          className="glass-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호 입력"
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="login-form-alert login-form-alert--error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {statusText && (
        <div className="login-form-alert login-form-alert--success">
          <UserPlus size={14} />
          <span>{statusText}</span>
        </div>
      )}

      <p className="login-form-hint">
        계정은 Netlify 서버(Blobs)에 저장됩니다. 초기 관리자 계정은 Netlify 환경 변수{' '}
        <code>HAC_USERS_JSON</code>으로 설정하세요.
      </p>

      <div className="login-form-actions">
        {onCancel && (
          <button type="button" className="glass-button" onClick={onCancel} disabled={isSubmitting}>
            <ArrowLeft size={14} />
            <span>메인으로</span>
          </button>
        )}
        <button type="submit" className="glass-button active" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>처리 중...</span>
            </>
          ) : mode === 'signup' ? (
            <>
              <UserPlus size={14} />
              <span>회원가입</span>
            </>
          ) : (
            <>
              <LogIn size={14} />
              <span>로그인</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
