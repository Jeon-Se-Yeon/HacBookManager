import React, { memo } from 'react';
import { resolveBookCoverUrl } from '../utils/coverFetcher';

function StatusBadge({ status }) {
  switch (status) {
    case 'read':
      return <span className="badge read">완독</span>;
    case 'reading':
      return <span className="badge reading">읽는 중</span>;
    default:
      return <span className="badge unread">미독</span>;
  }
}

const BookCard = memo(function BookCard({ book, isAdmin, onSelect, style }) {
  const coverUrl = resolveBookCoverUrl(book);

  return (
    <div
      className={`glass-panel book-card${coverUrl ? ' has-cover' : ''}`}
      style={style}
      onClick={() => onSelect(book)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(book);
        }
      }}
    >
      {coverUrl && (
        <div className="book-card-cover">
          <img src={coverUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        </div>
      )}
      <div className="book-card-body">
        <div className="book-card-header">
          <span className="book-card-title">{book.title}</span>
          <span className="book-card-badge">
            <StatusBadge status={book.readStatus} />
          </span>
        </div>
        <div className="book-card-footer">
          <span className="book-card-vol">{book.volumes || '권수 미지정'}</span>
          <span className="book-card-category">{book.category}</span>
        </div>
        {isAdmin && book.notes && (
          <div className="book-card-notes" title={book.notes}>
            {book.notes}
          </div>
        )}
      </div>
    </div>
  );
});

export default BookCard;
