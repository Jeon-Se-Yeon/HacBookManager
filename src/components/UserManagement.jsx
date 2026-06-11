import React, { useState, useCallback } from 'react';
import { Users, Shield, User, Plus, Pencil, Trash2, RefreshCw, Lock, AlertCircle } from 'lucide-react';
import { adminUsersRequest } from '../utils/authApi';

const emptyForm = {
  userId: '',
  name: '',
  password: '',
  role: 'user',
};

export default function UserManagement({ authUser }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const callAdmin = useCallback(
    async (payload) => {
      return adminUsersRequest({
        adminId: authUser.id,
        adminPassword,
        ...payload,
      });
    },
    [authUser.id, adminPassword]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callAdmin({ action: 'list' });
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || '목록을 불러오지 못했습니다.');
      if (err.message?.includes('403') || err.message?.includes('관리자')) {
        setUnlocked(false);
      }
    } finally {
      setLoading(false);
    }
  }, [callAdmin]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    if (!adminPassword.trim()) {
      setError('관리자 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await adminUsersRequest({
        adminId: authUser.id,
        adminPassword: adminPassword.trim(),
        action: 'list',
      });
      setUnlocked(true);
      setMessage('');
      await loadUsers();
    } catch (err) {
      setError(err.message || '인증에 실패했습니다.');
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setFormMode('create');
    setForm(emptyForm);
    setDeleteTarget(null);
    setMessage('');
  };

  const openEdit = (user) => {
    setFormMode('edit');
    setForm({
      userId: user.id,
      name: user.name,
      password: '',
      role: user.role,
    });
    setDeleteTarget(null);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (formMode === 'create') {
        if (!form.userId.trim() || !form.name.trim() || !form.password.trim()) {
          setError('ID, 이름, 비밀번호를 모두 입력해주세요.');
          return;
        }
        await callAdmin({
          action: 'create',
          userId: form.userId.trim(),
          name: form.name.trim(),
          password: form.password.trim(),
          role: form.role,
        });
        setMessage('사용자가 추가되었습니다.');
      } else if (formMode === 'edit') {
        if (!form.name.trim()) {
          setError('이름을 입력해주세요.');
          return;
        }
        await callAdmin({
          action: 'update',
          targetUserId: form.userId,
          name: form.name.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
        });
        setMessage('사용자 정보가 수정되었습니다.');
      }
      setFormMode(null);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await callAdmin({ action: 'delete', targetUserId: userId });
      setMessage('사용자가 삭제되었습니다.');
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '28px', maxWidth: '420px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Shield size={22} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>사용자 관리 인증</h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
          계정 목록 조회·추가·수정·삭제를 위해 관리자 비밀번호를 다시 입력해 주세요.
        </p>
        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>관리자 ID</label>
            <input className="glass-input" value={authUser.id} disabled style={{ width: '100%', marginTop: '4px', opacity: 0.7 }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>관리자 비밀번호</label>
            <input
              type="password"
              className="glass-input"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="비밀번호"
              style={{ width: '100%', marginTop: '4px' }}
              autoFocus
            />
          </div>
          {error && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--danger)', fontSize: '0.78rem' }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="glass-button active" disabled={loading}>
            <Lock size={14} />
            <span>{loading ? '확인 중...' : '사용자 관리 열기'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800' }}>사용자 관리</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              서버(Netlify)에 등록된 계정 {users.length}명
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="glass-button" onClick={loadUsers} disabled={loading}>
            <RefreshCw size={14} />
            <span>새로고침</span>
          </button>
          <button type="button" className="glass-button active" onClick={openCreate}>
            <Plus size={14} />
            <span>사용자 추가</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="glass-panel" style={{ padding: '10px 14px', color: 'var(--success)', fontSize: '0.85rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="glass-panel" style={{ padding: '10px 14px', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {(formMode === 'create' || formMode === 'edit') && (
        <form
          onSubmit={handleSubmit}
          className="glass-panel"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>
            {formMode === 'create' ? '새 사용자 추가' : `사용자 수정: ${form.userId}`}
          </h3>
          {formMode === 'create' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID *</label>
              <input
                className="glass-input"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="아이디 (영문/숫자)"
                style={{ width: '100%', marginTop: '4px' }}
                required
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>이름 *</label>
            <input
              className="glass-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              비밀번호 {formMode === 'create' ? '*' : '(변경 시에만 입력)'}
            </label>
            <input
              type="password"
              className="glass-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
              required={formMode === 'create'}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>권한</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className={`glass-button ${form.role === 'user' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'user' })}
              >
                일반 사용자
              </button>
              <button
                type="button"
                className={`glass-button ${form.role === 'admin' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'admin' })}
              >
                관리자
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="glass-button" onClick={() => setFormMode(null)}>
              취소
            </button>
            <button type="submit" className="glass-button active" disabled={loading}>
              저장
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: '600' }}>ID</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: '600' }}>이름</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: '600' }}>권한</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: '600' }}>가입일</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: '600' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{user.id}</td>
                <td style={{ padding: '12px 14px' }}>{user.name}</td>
                <td style={{ padding: '12px 14px' }}>
                  {user.role === 'admin' ? (
                    <span className="badge read" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={12} /> 관리자
                    </span>
                  ) : (
                    <span className="badge unread" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> 일반
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="glass-button"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => openEdit(user)}
                      title="수정"
                    >
                      <Pencil size={14} />
                    </button>
                    {deleteTarget === user.id ? (
                      <>
                        <button
                          type="button"
                          className="glass-button"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                          onClick={() => handleDelete(user.id)}
                          disabled={loading}
                        >
                          확인
                        </button>
                        <button
                          type="button"
                          className="glass-button"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => setDeleteTarget(null)}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="glass-button"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(user.id)}
                        disabled={user.id === authUser.id}
                        title={user.id === authUser.id ? '본인 계정은 삭제할 수 없습니다' : '삭제'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>등록된 사용자가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
