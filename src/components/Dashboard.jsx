import React, { useMemo, memo } from 'react';
import { Book, Library, CheckCircle2, AlertTriangle } from 'lucide-react';

// Helper function to estimate volume count from a string (e.g., "1~10, 12, 15~18")
export const parseVolumeCount = (volStr) => {
  if (volStr === undefined || volStr === null || volStr === '') return 0;
  if (typeof volStr === 'number') return 1;
  const str = String(volStr).trim();
  if (!str) return 0;
  
  let count = 0;
  const parts = str.split(',');
  for (let part of parts) {
    part = part.trim();
    if (part.includes('~')) {
      const range = part.split('~');
      const start = parseInt(range[0], 10);
      const end = parseInt(range[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        count += Math.abs(end - start) + 1;
      } else {
        count += 1; // Fallback for weird strings
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        count += 1;
      } else if (part.length > 0) {
        // non-numeric volumes (e.g. "상", "하", "단편", "외전")
        count += 1;
      }
    }
  }
  return count;
};

// Helper function to check if a title has a volume gap (e.g., "7, 17~27" or "1~9, 16~17")
export const hasVolumeGaps = (volStr) => {
  if (!volStr || typeof volStr !== 'string') return false;
  const str = volStr.trim();
  if (str.includes(',')) return true; // Split volumes indicate gap or separate holds
  return false;
};

function Dashboard({ books }) {
  const stats = useMemo(() => {
    let totalVolumes = 0;
    let unreadCount = 0;
    let readingCount = 0;
    let readCount = 0;
    let booksWithGaps = 0;

    for (const book of books) {
      totalVolumes += parseVolumeCount(book.volumes);
      if (book.readStatus === 'unread') unreadCount += 1;
      else if (book.readStatus === 'reading') readingCount += 1;
      else if (book.readStatus === 'read') readCount += 1;
      if (hasVolumeGaps(book.volumes)) booksWithGaps += 1;
    }

    const totalBooks = books.length;
    const completionRate = totalBooks > 0 ? Math.round((readCount / totalBooks) * 100) : 0;

    return {
      totalBooks,
      totalVolumes,
      unreadCount,
      readingCount,
      readCount,
      completionRate,
      booksWithGaps,
    };
  }, [books]);

  const {
    totalBooks,
    totalVolumes,
    unreadCount,
    readingCount,
    readCount,
    completionRate,
    booksWithGaps,
  } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 className="dashboard-title-desktop" style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px', letterSpacing: '-0.2px' }}>대시보드</h2>
      
      {/* Total Books Card */}
      <div className="glass-panel stat-card accent">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>총 보유 타이틀</span>
          <Library size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{totalBooks}개</div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>가나다 및 장르별 서적 목록</span>
      </div>

      {/* Total Volumes Card */}
      <div className="glass-panel stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>추산 소장 권수</span>
          <Book size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{totalVolumes}권</div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>개별 낱권 및 단편의 총합</span>
      </div>

      {/* Completion Card */}
      <div className="glass-panel stat-card success">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>완독률</span>
          <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{completionRate}%</div>
        
        {/* Progress bar */}
        <div className="progress-track">
          <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--success)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>완독 {readCount}개</span>
          <span>읽는 중 {readingCount}개</span>
        </div>
      </div>

      {/* Gaps / Incomplete Card */}
      <div className="glass-panel stat-card warning">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>이 빠진 전권 (중간 누락)</span>
          <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '4px 0' }}>{booksWithGaps}개</div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>구매가 필요한 빠진 권수 소장작</span>
      </div>
    </div>
  );
}

export default memo(Dashboard);
