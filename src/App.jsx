import React, { useState, useEffect } from 'react';
import initialBooks from './data/initialData.json';
import Dashboard from './components/Dashboard';
import BookList from './components/BookList';
import BookModal from './components/BookModal';
import LoginPage from './components/LoginPage';
import Wishlist from './components/Wishlist';
import ImportExport from './components/ImportExport';
import { BookOpen, ShoppingBag, Database, Library, Lock, Unlock, Users, LayoutDashboard, X, Palette } from 'lucide-react';
import ThemeSettings from './components/ThemeSettings';
import { useBodyScrollLock } from './utils/useBodyScrollLock';
import UserManagement from './components/UserManagement';
import {
  initializeBooks,
  loadCatalog,
  loadReadStatusMap,
  mergeBooksWithReadStatus,
  pushCatalogToServer,
  pushReadStatusToServer,
  sortBooksByTitle,
} from './utils/bookStorage';
import { loadAuthSession, saveAuthSession, clearAuthSession, touchAuthSession } from './utils/authSession';
import { useAppNavigation } from './utils/useAppNavigation';
import { useMediaQuery } from './utils/useMediaQuery';
import './App.css';

const isLoginPath = (path) => path === '/login' || path === '/login/';

function stripReadStatus(book) {
  const { readStatus, ...rest } = book;
  return rest;
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const { path, navigate, goHome } = useAppNavigation();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [booksLoading, setBooksLoading] = useState(true);
  useBodyScrollLock(dashboardOpen);
  const isAdmin = authUser?.role === 'admin';
  const userId = authUser?.id ?? null;
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const showDashboard = isDesktop || dashboardOpen;

  useEffect(() => {
    const { user, token, expiresAt } = loadAuthSession();
    if (user) {
      setAuthUser(user);
      setAuthToken(token);
      setSessionExpiresAt(expiresAt);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBooksLoading(true);

    initializeBooks(userId, authToken, initialBooks, isAdmin)
      .then(({ books: merged }) => {
        if (!cancelled) setBooks(merged);
      })
      .catch((err) => {
        console.error('Failed to load books', err);
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, authToken, isAdmin]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    const onChange = () => {
      if (mq.matches) setDashboardOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const applyBooksView = (catalog, statusMap) => {
    setBooks(sortBooksByTitle(mergeBooksWithReadStatus(catalog, statusMap)));
  };

  const persistCatalog = async (catalog) => {
    try {
      const saved = await pushCatalogToServer(authToken, catalog, isAdmin);
      const statusMap = loadReadStatusMap(userId);
      applyBooksView(saved, statusMap);
      return saved;
    } catch (err) {
      console.error('Failed to save catalog', err);
      alert(err.message || '서적 목록을 서버에 저장하지 못했습니다.');
      return catalog;
    }
  };

  const persistReadStatus = async (bookId, readStatus) => {
    if (!bookId || !authUser) return;
    const statusMap = { ...loadReadStatusMap(userId), [bookId]: readStatus };
    await pushReadStatusToServer(authToken, userId, statusMap);
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, readStatus } : b)));
    setSelectedBook((prev) =>
      prev && prev.id === bookId ? { ...prev, readStatus } : prev
    );
  };

  const handleLoginSuccess = ({ user, token }) => {
    setAuthUser(user);
    setAuthToken(token || null);
    const expiresAt = saveAuthSession(user, token);
    setSessionExpiresAt(expiresAt);
    setSelectedBook(null);
    goHome();
  };

  const handleLogout = () => {
    setAuthUser(null);
    setAuthToken(null);
    setSessionExpiresAt(null);
    clearAuthSession();
    setSelectedBook(null);
    setDashboardOpen(false);
    setActiveTab('inventory');
    goHome();
  };

  // 세션 만료 시각이 지나면 자동 로그아웃
  useEffect(() => {
    if (!authUser || !sessionExpiresAt) return;

    const expireSession = () => {
      handleLogout();
      alert('세션이 만료되어 자동으로 로그아웃되었습니다. 다시 로그인해주세요.');
    };

    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }

    const timer = setTimeout(expireSession, remaining);
    return () => clearTimeout(timer);
  }, [authUser, sessionExpiresAt]);

  // 사용자 활동(클릭·키 입력·스크롤 등)이 있으면 세션을 연장 (최대 1분에 한 번 갱신)
  useEffect(() => {
    if (!authUser) return;

    let lastTouch = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch < 60 * 1000) return;
      lastTouch = now;
      const expiresAt = touchAuthSession();
      if (expiresAt) setSessionExpiresAt(expiresAt);
    };

    const events = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { capture: true, passive: true })
    );
    return () =>
      events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
  }, [authUser]);

  const handleSaveBook = async (bookData) => {
    if (!authUser) return;

    if (bookData.id) {
      if (isAdmin) {
        const catalog = (loadCatalog() || []).map((b) =>
          b.id === bookData.id ? { ...stripReadStatus(b), ...stripReadStatus(bookData) } : b
        );
        await persistCatalog(catalog);
        if (bookData.readStatus) {
          await persistReadStatus(bookData.id, bookData.readStatus);
        }
      } else {
        await persistReadStatus(bookData.id, bookData.readStatus || 'unread');
      }
    } else {
      if (!isAdmin) return;
      const newBook = {
        ...stripReadStatus(bookData),
        id: `book-${Date.now()}`,
      };
      const catalog = [...(loadCatalog() || []), newBook];
      await persistCatalog(catalog);
      if (bookData.readStatus && bookData.readStatus !== 'unread') {
        await persistReadStatus(newBook.id, bookData.readStatus);
      }
    }
    setSelectedBook(null);
  };

  const handleSaveCoverImage = async (bookId, coverImageUrl) => {
    if (!isAdmin || !bookId) return;
    const normalized = (coverImageUrl || '').trim();
    const catalog = (loadCatalog() || []).map((b) =>
      b.id === bookId ? { ...b, coverImageUrl: normalized } : b
    );
    await persistCatalog(catalog);
    setSelectedBook((prev) =>
      prev && prev.id === bookId ? { ...prev, coverImageUrl: normalized } : prev
    );
  };

  const handleDeleteBook = async (bookId) => {
    if (!isAdmin) return;
    const catalog = (loadCatalog() || []).filter((b) => b.id !== bookId);
    await persistCatalog(catalog);
    const statusMap = { ...loadReadStatusMap(userId) };
    delete statusMap[bookId];
    await pushReadStatusToServer(authToken, userId, statusMap);
    applyBooksView(loadCatalog() || catalog, statusMap);
    setSelectedBook(null);
  };

  const handleImportData = async (importedBooks) => {
    if (!isAdmin) return;
    const catalog = importedBooks.map(stripReadStatus);
    const statusMap = {};
    importedBooks.forEach((b) => {
      if (b.id && b.readStatus) statusMap[b.id] = b.readStatus;
    });
    await persistCatalog(catalog);
    await pushReadStatusToServer(authToken, userId, statusMap);
  };

  const handleResetData = async () => {
    if (!isAdmin) return;
    const catalog = initialBooks.map(stripReadStatus);
    await persistCatalog(catalog);
    await pushReadStatusToServer(authToken, userId, {});
  };

  if (isLoginPath(path)) {
    return (
      <LoginPage
        isLoggedIn={!!authUser}
        onLogin={handleLoginSuccess}
        onCancel={goHome}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="glass-panel app-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="header-leading">
          <button
            type="button"
            className="glass-button mobile-dashboard-btn"
            onClick={() => setDashboardOpen(true)}
            aria-label="대시보드 메뉴 열기"
          >
            <LayoutDashboard size={18} />
            <span>대시보드</span>
          </button>
          <div className="logo-section">
          <BookOpen size={28} style={{ color: 'var(--primary)' }} />
          <div>
            <h1>HAC Book Manager</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              소장 서적 인벤토리 및 위시리스트 관리 시스템
            </p>
          </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {authUser ? (
              <span
                className="badge read glow-active"
                style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px', textTransform: 'none' }}
              >
                {isAdmin
                  ? `🛡️ ${authUser?.name || '관리자'} 관리자`
                  : `🙋 ${authUser?.name || '사용자'} 일반 사용자`}
              </span>
            ) : (
              <span
                className="badge unread"
                style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px', textTransform: 'none' }}
              >
                👀 게스트 모드 (조회 전용, 로그인 필요)
              </span>
            )}

            <button
              className={`glass-button ${isAdmin ? 'active' : ''}`}
              onClick={authUser ? handleLogout : () => navigate('/login')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              title={authUser ? '로그아웃' : 'ID/PW 회원가입/로그인'}
            >
              {authUser ? <Unlock size={14} /> : <Lock size={14} />}
              <span>{authUser ? '로그아웃' : '로그인'}</span>
            </button>
          </div>

          <nav className="nav-tabs">
            <button
              className={`glass-button ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Library size={16} />
              <span>서적 목록</span>
            </button>

            <button
              className={`glass-button ${activeTab === 'wishlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('wishlist')}
            >
              <ShoppingBag size={16} />
              <span>위시리스트</span>
            </button>

            <button
              className={`glass-button ${activeTab === 'backup' ? 'active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              <Database size={16} />
              <span>백업 설정</span>
            </button>

            <button
              className={`glass-button ${activeTab === 'theme' ? 'active' : ''}`}
              onClick={() => setActiveTab('theme')}
            >
              <Palette size={16} />
              <span>테마</span>
            </button>

            {isAdmin && (
              <button
                className={`glass-button ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={16} />
                <span>사용자 관리</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {dashboardOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="대시보드 닫기"
          onClick={() => setDashboardOpen(false)}
        />
      )}

      <main className="app-content">
        <aside className={`app-sidebar ${dashboardOpen ? 'is-open' : ''}`}>
          <div className="app-sidebar-mobile-bar">
            <span style={{ fontWeight: '700', fontSize: '1rem' }}>대시보드</span>
            <button
              type="button"
              className="glass-button"
              style={{ padding: '6px 10px' }}
              onClick={() => setDashboardOpen(false)}
              aria-label="대시보드 닫기"
            >
              <X size={16} />
            </button>
          </div>
          {showDashboard && <Dashboard books={books} />}
        </aside>

        <section className="app-main">
          {booksLoading && (
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              서적 목록·독서 상태를 동기화하는 중...
            </div>
          )}
          {activeTab === 'inventory' && (
            <BookList
              books={books}
              onSelectBook={(book) => setSelectedBook(book)}
              onAddBook={() => setSelectedBook({})}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'wishlist' && (
            <Wishlist books={books} onSelectBook={(book) => setSelectedBook(book)} isAdmin={isAdmin} />
          )}

          {activeTab === 'backup' && (
            <ImportExport
              books={books}
              onImportData={handleImportData}
              onResetData={handleResetData}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'theme' && <ThemeSettings />}

          {activeTab === 'users' && isAdmin && authUser && (
            <UserManagement authUser={authUser} />
          )}
        </section>
      </main>

      {selectedBook !== null && (
        <BookModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onSave={handleSaveBook}
          onReadStatusChange={persistReadStatus}
          onSaveCoverImage={handleSaveCoverImage}
          onDelete={handleDeleteBook}
          isAdmin={isAdmin}
          canEditReadStatus={!!authUser}
        />
      )}

      <footer
        style={{
          marginTop: '48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '20px',
          paddingBottom: '20px',
        }}
      >
        HAC Book Manager • Built with React & Vite • Optimized for Netlify Static Hosting
      </footer>
    </div>
  );
}
