import React, { useState, useMemo } from 'react';
import { Search, Plus, HelpCircle } from 'lucide-react';
import { hasVolumeGaps } from './Dashboard';
import { sortBooksByTitle } from '../utils/bookStorage';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import VirtualBookGrid from './VirtualBookGrid';

const CONSONANTS = ['전체', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ&숫자', '라노벨&기타', '기타'];

export default function BookList({ books, onSelectBook, onAddBook, isAdmin = false }) {
  const [search, setSearch] = useState('');
  const [selectedConsonant, setSelectedConsonant] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('all'); // all, unread, reading, read
  const [gapFilter, setGapFilter] = useState('all'); // all, complete, gaps
  const debouncedSearch = useDebouncedValue(search, 200);

  const filteredBooks = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = books.filter(book => {
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        (isAdmin && book.notes && book.notes.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
      
      // 2. Category Tab Match
      if (selectedConsonant !== '전체' && book.category !== selectedConsonant) return false;
      
      // 3. Status Filter Match
      if (statusFilter !== 'all' && book.readStatus !== statusFilter) return false;
      
      // 4. Gap Filter Match
      const isGap = hasVolumeGaps(book.volumes);
      if (gapFilter === 'gaps' && !isGap) return false;
      if (gapFilter === 'complete' && isGap) return false;
      
      return true;
    });
    return sortBooksByTitle(filtered);
  }, [books, debouncedSearch, selectedConsonant, statusFilter, gapFilter, isAdmin]);

  return (
    <div className="book-list-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search & Actions Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* Search Input wrapper */}
        <div className="book-list-search">
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="glass-input"
            placeholder={isAdmin ? '책 제목 또는 비고 내용 검색...' : '책 제목 검색...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '44px' }}
          />
        </div>

        {/* Add Book Button (Admin Only) */}
        {isAdmin && (
          <button className="glass-button active glow-active" onClick={onAddBook}>
            <Plus size={18} />
            <span>도서 추가</span>
          </button>
        )}
      </div>

      {/* Consonant Filter Tabs (Horizontally Scrollable) */}
      <div className="glass-panel consonant-tabs" style={{ padding: '8px', overflowX: 'auto', display: 'flex', gap: '4px', whiteSpace: 'nowrap' }}>
        {CONSONANTS.map((c) => (
          <button
            key={c}
            type="button"
            className={`consonant-tab${selectedConsonant === c ? ' is-active' : ''}`}
            onClick={() => setSelectedConsonant(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid Filters */}
      <div className="book-list-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        
        {/* Status Filter buttons */}
        <div className="glass-panel" style={{ display: 'inline-flex', padding: '4px', gap: '4px' }}>
          {[
            ['all', '전체 진행도'],
            ['unread', '미독'],
            ['reading', '읽는 중'],
            ['read', '완독'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`filter-chip${statusFilter === value ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="glass-panel" style={{ display: 'inline-flex', padding: '4px', gap: '4px' }}>
          {[
            ['all', '전체 구성'],
            ['complete', '빠진 권수 없음'],
            ['gaps', '누락 권수 있음'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`filter-chip${gapFilter === value ? ' is-active' : ''}`}
              onClick={() => setGapFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="book-list-result-count" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
          검색결과: <strong>&nbsp;{filteredBooks.length}</strong>개 타이틀
        </div>
      </div>

      {/* Book Grid Layout */}
      {filteredBooks.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <HelpCircle size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5, display: 'block' }} />
          <p style={{ fontWeight: '500' }}>조건에 맞는 서적이 없습니다.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>검색어 또는 필터를 조정해 보세요.</p>
        </div>
      ) : (
        <VirtualBookGrid
          books={filteredBooks}
          isAdmin={isAdmin}
          onSelectBook={onSelectBook}
          listKey={`${debouncedSearch}|${selectedConsonant}|${statusFilter}|${gapFilter}`}
        />
      )}
    </div>
  );
}
