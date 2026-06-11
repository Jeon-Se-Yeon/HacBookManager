import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Save, AlertCircle } from 'lucide-react';
import {
  getBookCoverUrl,
  getCachedCoverUrl,
  getCoverSearchCooldownRemainingMs,
  resolveBookCoverUrl,
} from '../utils/coverFetcher';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { useBackdropDismiss } from '../utils/useBackdropDismiss';

const CATEGORIES = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ&숫자', '라노벨&기타', '기타'];

export default function BookModal({ book, onClose, onSave, onReadStatusChange, onSaveCoverImage, onDelete, isAdmin, canEditReadStatus }) {
  const isEdit = !!book?.id;
  const modalPanelRef = useRef(null);
  useBodyScrollLock(true);
  const { backdropHandlers, panelHandlers } = useBackdropDismiss(onClose);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ㄱ');
  const [volumes, setVolumes] = useState('');
  const [notes, setNotes] = useState('');
  const [readStatus, setReadStatus] = useState('unread');
  const [manualCoverUrl, setManualCoverUrl] = useState('');
  const [autoCoverUrl, setAutoCoverUrl] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isCoverLoading, setIsCoverLoading] = useState(false);
  const [coverFetchMessage, setCoverFetchMessage] = useState('');

  const displayCoverUrl = useMemo(() => {
    const manual = manualCoverUrl.trim();
    if (manual) return manual;
    if (autoCoverUrl) return autoCoverUrl;
    return resolveBookCoverUrl(book);
  }, [manualCoverUrl, autoCoverUrl, book]);

  const loadAutoCover = async (forceRefresh = false) => {
    if (!book?.title || manualCoverUrl.trim()) {
      setCoverFetchMessage('');
      return;
    }
    const cooldown = getCoverSearchCooldownRemainingMs();
    if (cooldown > 0 && !forceRefresh) {
      const sec = Math.ceil(cooldown / 1000);
      setCoverFetchMessage(`표지 API 요청 제한 중입니다. ${sec}초 후 다시 시도해 주세요.`);
      return;
    }
    setCoverFetchMessage('');
    setIsCoverLoading(true);
    const url = await getBookCoverUrl(book.title, { forceRefresh });
    setIsCoverLoading(false);
    if (url) {
      setManualCoverUrl(url);
      setAutoCoverUrl(url);
      if (book?.id && onSaveCoverImage) {
        onSaveCoverImage(book.id, url);
        setCoverFetchMessage('표지를 찾아 도서 데이터에 저장했습니다.');
      } else {
        setCoverFetchMessage('표지를 찾았습니다. 저장 시 함께 기록됩니다.');
      }
      return;
    }
    setCoverFetchMessage(
      getCoverSearchCooldownRemainingMs() > 0
        ? '표지 API 요청이 많아 잠시 후 다시 시도해 주세요.'
        : 'AniList·Jikan에서 일치하는 표지를 찾지 못했습니다. 관리자는 URL을 직접 입력할 수 있습니다.'
    );
  };

  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setCategory(book.category || 'ㄱ');
      setVolumes(book.volumes || '');
      setNotes(book.notes || '');
      setReadStatus(book.readStatus || 'unread');
      setManualCoverUrl(book.coverImageUrl || '');
    } else {
      setTitle('');
      setCategory('ㄱ');
      setVolumes('');
      setNotes('');
      setReadStatus('unread');
      setManualCoverUrl('');
    }
    if (book?.coverImageUrl?.trim()) {
      setAutoCoverUrl(null);
    } else {
      const cached = book?.title ? getCachedCoverUrl(book.title) : null;
      setAutoCoverUrl(cached);
    }
    setCoverFetchMessage('');
    setDeleteConfirm(false);
  }, [book]);

  useEffect(() => {
    modalPanelRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [book?.id]);

  const handleReadStatusSelect = (status) => {
    if (!canEditReadStatus) return;
    setReadStatus(status);
    if (book?.id && onReadStatusChange) {
      onReadStatusChange(book.id, status);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEditReadStatus) return;
    if (!isAdmin && !book?.id) return;
    if (!title.trim()) return;

    const payload = {
      id: book?.id,
      title: title.trim(),
      category,
      volumes: volumes.trim(),
      readStatus
    };

    if (isAdmin) {
      payload.notes = notes.trim();
      payload.coverImageUrl = (manualCoverUrl.trim() || autoCoverUrl || '').trim();
    } else {
      payload.notes = book?.notes || '';
      payload.coverImageUrl = book?.coverImageUrl || '';
    }

    onSave(payload);
  };

  const showAdminCoverPanel = isAdmin;
  const showUserCoverImage = !isAdmin && isEdit && !!displayCoverUrl;
  const showCoverSection = showAdminCoverPanel || showUserCoverImage;

  const modal = (
    <div className="modal-backdrop" role="dialog" aria-modal="true" {...backdropHandlers}>
      <div
        ref={modalPanelRef}
        className="glass-panel modal-content book-modal"
        {...panelHandlers}
        style={{ background: 'var(--modal-panel-bg)', border: '1px solid var(--border-glass)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.3px' }}>
            {!isAdmin ? '도서 정보 상세 조회' : isEdit ? '도서 정보 수정' : '새로운 도서 추가'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {showCoverSection && (
            <div
              className="panel-inset"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderRadius: '10px',
                padding: '12px',
              }}
            >
              {showUserCoverImage ? (
                <div className="book-modal-cover-wrap">
                  <div className="book-modal-cover-frame book-modal-cover-frame--hero">
                    <img
                      src={displayCoverUrl}
                      alt={`${title} 표지`}
                      loading="eager"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div className="book-modal-cover-frame book-modal-cover-frame--thumb">
                    {displayCoverUrl ? (
                      <img
                        src={displayCoverUrl}
                        alt={`${title} 표지`}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          if (manualCoverUrl.trim()) setManualCoverUrl('');
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                        {isCoverLoading ? '표지 조회 중...' : '표지 없음'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.98rem' }}>표지 이미지</strong>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {manualCoverUrl.trim()
                        ? '관리자가 지정한 URL을 우선 표시합니다.'
                        : '자동 조회는 하지 않습니다. 아래 버튼으로 AniList·Jikan 검색하거나 URL을 직접 입력하세요.'}
                    </p>
                    {coverFetchMessage && (
                      <p style={{ fontSize: '0.74rem', color: 'var(--warning)', lineHeight: '1.4' }}>{coverFetchMessage}</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>이미지 URL (관리자)</label>
                      <input
                        type="url"
                        className="glass-input"
                        value={manualCoverUrl}
                        onChange={(e) => setManualCoverUrl(e.target.value)}
                        onBlur={() => {
                          if (book?.id && onSaveCoverImage && manualCoverUrl.trim()) {
                            onSaveCoverImage(book.id, manualCoverUrl.trim());
                          }
                        }}
                        placeholder="https://example.com/cover.jpg"
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="glass-button"
                          style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                          onClick={() => setManualCoverUrl('')}
                        >
                          URL 지우기 (자동 조회)
                        </button>
                        {!manualCoverUrl.trim() && (
                          <button
                            type="button"
                            className="glass-button"
                            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                            onClick={() => loadAutoCover(true)}
                            disabled={isCoverLoading}
                          >
                            {isCoverLoading ? '표지 검색 중...' : '표지 자동 검색 (AniList → Jikan)'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>도서명 *</label>
            <input
              type="text"
              className="glass-input"
              required
              disabled={!isAdmin}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 강철의 연금술사"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>분류 (초성/장르)</label>
              <select
                value={category}
                disabled={!isAdmin}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input"
                style={{
                  padding: '10px 12px',
                  cursor: isAdmin ? 'pointer' : 'default',
                  opacity: !isAdmin ? 0.75 : 1,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ background: 'var(--select-bg)', color: 'var(--select-fg)' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>소장 권수 범위</label>
              <input
                type="text"
                className="glass-input"
                disabled={!isAdmin}
                value={volumes}
                onChange={(e) => setVolumes(e.target.value)}
                placeholder="예: 1~27, 외전"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>독서 진행도</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`glass-button ${readStatus === 'unread' ? 'active' : ''}`}
                disabled={!canEditReadStatus}
                onClick={canEditReadStatus ? () => handleReadStatusSelect('unread') : null}
                style={{
                  justifyContent: 'center',
                  opacity: !canEditReadStatus && readStatus !== 'unread' ? 0.4 : 1,
                  cursor: canEditReadStatus ? 'pointer' : 'default'
                }}
              >
                미독
              </button>
              <button
                type="button"
                className={`glass-button ${readStatus === 'reading' ? 'active' : ''}`}
                disabled={!canEditReadStatus}
                onClick={canEditReadStatus ? () => handleReadStatusSelect('reading') : null}
                style={{
                  justifyContent: 'center',
                  opacity: !canEditReadStatus && readStatus !== 'reading' ? 0.4 : 1,
                  cursor: canEditReadStatus ? 'pointer' : 'default'
                }}
              >
                읽는 중
              </button>
              <button
                type="button"
                className={`glass-button ${readStatus === 'read' ? 'active' : ''}`}
                disabled={!canEditReadStatus}
                onClick={canEditReadStatus ? () => handleReadStatusSelect('read') : null}
                style={{
                  justifyContent: 'center',
                  opacity: !canEditReadStatus && readStatus !== 'read' ? 0.4 : 1,
                  cursor: canEditReadStatus ? 'pointer' : 'default'
                }}
              >
                완독
              </button>
            </div>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                비고 / 세부사항 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(관리자 전용)</span>
              </label>
              <textarea
                className="glass-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="특이사항, 부재 권수, 메모 등 (일반 사용자에게는 표시되지 않음)"
                style={{ resize: 'none', fontFamily: 'inherit' }}
              />
            </div>
          )}

          {!canEditReadStatus && (
            <div
              className="panel-inset"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                width: '100%',
                marginTop: '8px',
              }}
            >
              🔒 조회 전용 모드입니다. 정보 수정은 상단에서 로그인을 진행해 주세요.
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              gap: '12px',
              width: '100%'
            }}
          >
            {!canEditReadStatus ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button type="button" className="glass-button active" onClick={onClose} style={{ minWidth: '100px', justifyContent: 'center' }}>
                  닫기
                </button>
              </div>
            ) : (
              <>
                {isAdmin && isEdit ? (
                  deleteConfirm ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} /> 정말 지울까요?
                      </span>
                      <button
                        type="button"
                        className="glass-button"
                        style={{ background: 'var(--danger)', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => onDelete(book.id)}
                      >
                        확인
                      </button>
                      <button
                        type="button"
                        className="glass-button"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setDeleteConfirm(false)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="glass-button"
                      style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 size={16} />
                      <span>도서 삭제</span>
                    </button>
                  )
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="glass-button" onClick={onClose}>
                    취소
                  </button>
                  <button type="submit" className="glass-button active">
                    <Save size={16} />
                    <span>{isAdmin ? '저장' : '독서 상태 저장'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
