import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import BookCard from './BookCard';

const GAP = 16;
const MIN_CARD_WIDTH = 260;
const ROW_HEIGHT = 128;
const OVERSCAN_ROWS = 3;

export default function VirtualBookGrid({ books, isAdmin, onSelectBook, listKey = '' }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 480 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
  }, [listKey]);

  const columns = useMemo(() => {
    if (size.width <= 0) return 1;
    return Math.max(1, Math.floor((size.width + GAP) / (MIN_CARD_WIDTH + GAP)));
  }, [size.width]);

  const cardWidth = useMemo(() => {
    if (columns <= 0) return MIN_CARD_WIDTH;
    return (size.width - (columns - 1) * GAP) / columns;
  }, [size.width, columns]);

  const rowCount = Math.ceil(books.length / columns) || 0;
  const rowStride = ROW_HEIGHT + GAP;
  const totalHeight = rowCount > 0 ? rowCount * ROW_HEIGHT + (rowCount - 1) * GAP : 0;

  const { startRow, endRow } = useMemo(() => {
    const first = Math.max(0, Math.floor(scrollTop / rowStride) - OVERSCAN_ROWS);
    const visibleRows = Math.ceil(size.height / rowStride) + 1;
    const last = Math.min(rowCount - 1, first + visibleRows + OVERSCAN_ROWS * 2);
    return { startRow: first, endRow: last };
  }, [scrollTop, size.height, rowCount, rowStride]);

  const visibleItems = useMemo(() => {
    const startIndex = startRow * columns;
    const endIndex = Math.min(books.length, (endRow + 1) * columns);
    const items = [];
    for (let i = startIndex; i < endIndex; i += 1) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      items.push({
        book: books[i],
        key: books[i].id || i,
        top: row * rowStride,
        left: col * (cardWidth + GAP),
      });
    }
    return items;
  }, [books, startRow, endRow, columns, cardWidth, rowStride]);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div ref={containerRef} className="virtual-books-scroll" onScroll={onScroll}>
      <div className="virtual-books-spacer" style={{ height: totalHeight }}>
        {visibleItems.map(({ book, key, top, left }) => (
          <BookCard
            key={key}
            book={book}
            isAdmin={isAdmin}
            onSelect={onSelectBook}
            style={{
              position: 'absolute',
              top,
              left,
              width: cardWidth,
              height: ROW_HEIGHT,
            }}
          />
        ))}
      </div>
    </div>
  );
}
