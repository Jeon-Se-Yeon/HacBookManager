import React, { useMemo } from 'react';
import { ShoppingCart, Check, Info, ArrowRight } from 'lucide-react';
import { sortBooksByTitle } from '../utils/bookStorage';

// Advanced helper to calculate missing intermediate volume ranges in a collection
export const getMissingVolumes = (volStr) => {
  if (!volStr || typeof volStr !== 'string') return '';
  const str = volStr.trim();
  if (!str) return '';

  const owned = new Set();
  const parts = str.split(',');
  
  let hasNumbers = false;
  
  for (let part of parts) {
    part = part.trim();
    if (part.includes('~')) {
      const range = part.split('~');
      const start = parseInt(range[0], 10);
      const end = parseInt(range[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        hasNumbers = true;
        const minVal = Math.min(start, end);
        const maxVal = Math.max(start, end);
        for (let i = minVal; i <= maxVal; i++) {
          owned.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        hasNumbers = true;
        owned.add(num);
      }
    }
  }
  
  if (!hasNumbers || owned.size === 0) return '';
  
  const minOwned = Math.min(...owned);
  const maxOwned = Math.max(...owned);
  
  // If the count of elements equals the range span, no intermediate volumes are missing
  if (owned.size === (maxOwned - minOwned + 1)) return '';
  
  const missing = [];
  for (let i = minOwned; i <= maxOwned; i++) {
    if (!owned.has(i)) {
      missing.push(i);
    }
  }
  
  if (missing.length === 0) return '';
  
  // Group sequential missing numbers back into user-friendly range strings (e.g. [8,9,10] -> "8~10")
  const ranges = [];
  let rangeStart = missing[0];
  let rangeEnd = missing[0];
  
  for (let i = 1; i < missing.length; i++) {
    if (missing[i] === rangeEnd + 1) {
      rangeEnd = missing[i];
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}~${rangeEnd}`);
      rangeStart = missing[i];
      rangeEnd = missing[i];
    }
  }
  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}~${rangeEnd}`);
  
  return ranges.join(', ');
};

export default function Wishlist({ books, onSelectBook, isAdmin = false }) {
  
  // Compute list of books with missing volume gaps
  const wishlistItems = useMemo(() => {
    const items = books
      .map(book => {
        const missing = getMissingVolumes(book.volumes);
        return {
          ...book,
          missingVolumes: missing
        };
      })
      .filter(item => item.missingVolumes !== '');
    return sortBooksByTitle(items);
  }, [books]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShoppingCart size={24} style={{ color: 'var(--warning)' }} />
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.3px' }}>자동 분석 희망 도서 (이 빠진 권수)</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>소장하고 계신 권수 범위 중, 중간에 이가 빠진 누락 권수를 시스템이 자동으로 분석한 구매 위시리스트입니다.</p>
        </div>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', margin: '0 auto 16px auto', justifyContent: 'center' }}>
            <Check size={28} style={{ color: 'var(--success)' }} />
          </div>
          <p style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>모든 소장작의 중간 권수가 채워져 있습니다!</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>현재 소장하고 있는 타이틀 중 끊기거나 누락된 중간 권수 세트가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div className="glass-panel" style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(245, 158, 11, 0.04)', borderColor: 'rgba(245, 158, 11, 0.15)', alignItems: 'flex-start' }}>
            <Info size={16} style={{ color: 'var(--warning)', marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              아래의 리스트는 전체 {books.length}개의 타이틀 중 중간 누락분이 확인된 <strong>{wishlistItems.length}개</strong>의 작품들입니다. 카드나 우측 화살표를 누르면 해당 서적의 편집 모드로 이동하여 상세 사항 및 메모를 변경할 수 있습니다.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '8px' }}>
            {wishlistItems.map((item) => (
              <div 
                key={item.id} 
                className="glass-panel" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  cursor: 'pointer',
                  borderLeft: '4px solid var(--warning)',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => onSelectBook(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                }}
              >
                {/* Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.title}</h3>
                  <span style={{ fontSize: '0.75rem', background: 'var(--surface-muted)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                    {item.category}
                  </span>
                </div>

                {/* Status Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', fontSize: '0.85rem', background: 'var(--surface-inset)', padding: '8px 12px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>현재 소장 범위</div>
                    <div style={{ color: 'var(--accent-text)', fontWeight: '600' }}>{item.volumes}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginBottom: '2px', fontWeight: '600' }}>구매 필요 권수 🛍️</div>
                    <div style={{ color: 'var(--warning)', fontWeight: '700' }}>{item.missingVolumes}</div>
                  </div>
                </div>

                {/* Notes */}
                {isAdmin && item.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <strong>비고:</strong> {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
