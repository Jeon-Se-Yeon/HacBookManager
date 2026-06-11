import React, { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Check, AlertTriangle, Lock } from 'lucide-react';
import Papa from 'papaparse';

export default function ImportExport({ books, onImportData, onResetData, isAdmin }) {
  const fileInputRef = useRef(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const csvColumns = ['id', 'title', 'category', 'volumes', 'notes', 'readStatus', 'coverImageUrl'];

  // Export current state as a CSV file
  const handleExport = () => {
    try {
      const csv = Papa.unparse(
        books.map((book) => ({
          id: book.id || '',
          title: book.title || '',
          category: book.category || '',
          volumes: book.volumes || '',
          notes: book.notes || '',
          readStatus: book.readStatus || 'unread',
          coverImageUrl: book.coverImageUrl || ''
        })),
        { columns: csvColumns }
      );
      const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

      const exportFileDefaultName = `HAC_Book_Inventory_Backup_${new Date().toISOString().slice(0, 10)}.csv`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      triggerSuccess('성공적으로 백업 CSV 파일이 다운로드되었습니다.');
    } catch (e) {
      alert('백업 생성 중 문제가 발생했습니다: ' + e.message);
    }
  };

  // Import CSV backup
  const handleImport = (e) => {
    if (!isAdmin) return; // Guard clause
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = (results.data || [])
          .filter((row) => row.title?.trim())
          .map((row, idx) => ({
            id: row.id?.trim() || `book-import-${Date.now()}-${idx}`,
            title: row.title?.trim() || '',
            category: row.category?.trim() || '기타',
            volumes: row.volumes?.trim() || '',
            notes: row.notes?.trim() || '',
            readStatus: ['unread', 'reading', 'read'].includes(row.readStatus?.trim())
              ? row.readStatus.trim()
              : 'unread',
            coverImageUrl: row.coverImageUrl?.trim() || ''
          }));

        if (imported.length > 0) {
          onImportData(imported);
          triggerSuccess(`백업 데이터 (${imported.length}개 서적)가 성공적으로 복구되었습니다!`);
        } else {
          alert('올바른 CSV 데이터가 없습니다. title 컬럼을 포함한 파일인지 확인해주세요.');
        }
      },
      error: () => {
        alert('백업 파일을 파싱하는 데 실패했습니다. 올바른 CSV 파일인지 확인해주세요.');
      }
    });
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const handleReset = () => {
    if (!isAdmin) return; // Guard clause
    onResetData();
    setShowResetConfirm(false);
    triggerSuccess('도서 데이터가 엑셀의 초기 값(614개 서적)으로 리셋되었습니다.');
  };

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.3px' }}>데이터 관리 및 백업 센터</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>서적 데이터를 브라우저 밖으로 백업하거나, 저장된 백업에서 리스트를 다시 불러올 수 있습니다.</p>
      </div>

      {/* Guest warning banner */}
      {!isAdmin && (
        <div className="glass-panel" style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(99, 102, 241, 0.04)', borderColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center' }}>
          <Lock size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            🔒 <strong>조회 전용 모드 안내:</strong> 내보내기(CSV 백업)는 누구나 사용 가능하지만, 파일 불러오기(CSV 복원) 및 시스템 초기화(Factory Reset) 권한은 관리자 로그인 후에 활성화됩니다.
          </span>
        </div>
      )}

      {/* Success notification */}
      {successMsg && (
        <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--success)', animation: 'fadeIn 0.2s ease' }}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Backup Column */}
        <div className="glass-panel panel-inset" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>내보내기 (CSV 백업)</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            현재까지 브라우저 내에서 수정한 소장 권수 범위, 독서 여부(완독/읽는중/미독), 비고/메모 등을 포함한 전체 <strong>{books.length}개</strong>의 서적 정보를 로컬 컴퓨터로 다운로드합니다.
          </p>
          <button className="glass-button active" style={{ marginTop: 'auto' }} onClick={handleExport}>
            <Download size={16} />
            <span>백업 다운로드 (.csv)</span>
          </button>
        </div>

        {/* Restore Column */}
        <div className="glass-panel panel-inset" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', opacity: !isAdmin ? 0.8 : 1 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>불러오기 (CSV 복원)</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            이전에 내보내기 기능으로 생성해 둔 백업 CSV 파일을 가져와 현재 상태를 완전히 덮어씁니다. (주의: 현재 변경사항 중 저장되지 않은 데이터는 유실됩니다.)
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            onChange={handleImport}
            disabled={!isAdmin}
            style={{ display: 'none' }}
          />
          <button 
            className="glass-button" 
            style={{ 
              marginTop: 'auto', 
              opacity: !isAdmin ? 0.6 : 1, 
              cursor: isAdmin ? 'pointer' : 'not-allowed' 
            }} 
            onClick={isAdmin ? () => fileInputRef.current.click() : null}
            disabled={!isAdmin}
          >
            <Upload size={16} />
            <span>{isAdmin ? '백업 파일 선택 (.csv)' : '🔒 인증 후 파일 복원 가능'}</span>
          </button>
        </div>

      </div>

      {/* Reset Section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
        {showResetConfirm && isAdmin ? (
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> 정말 공장 초기화를 진행할까요?
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                초기화를 진행하면 브라우저에 저장되어 있는 모든 수정 사항(완독 상태, 메모 등)이 지워지고 엑셀 파일에서 읽어온 초기 값(614개 도서)으로 재설정됩니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="glass-button" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleReset}>
                초기화 확인
              </button>
              <button className="glass-button" onClick={() => setShowResetConfirm(false)}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>데이터 초기화 (Factory Reset)</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>브라우저의 소장 내역 및 변경을 모두 폐기하고 엑셀 초기본 값으로 복구합니다.</p>
            </div>
            <button 
              className="glass-button" 
              style={{ 
                color: 'var(--danger)', 
                borderColor: 'rgba(239, 68, 68, 0.2)',
                opacity: !isAdmin ? 0.5 : 1,
                cursor: isAdmin ? 'pointer' : 'not-allowed'
              }} 
              onClick={isAdmin ? () => setShowResetConfirm(true) : null}
              disabled={!isAdmin}
            >
              <RotateCcw size={16} />
              <span>{isAdmin ? '원본으로 리셋' : '🔒 인증 후 초기화 가능'}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
