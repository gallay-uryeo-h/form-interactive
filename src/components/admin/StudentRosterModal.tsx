import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  StudentRecord,
  subscribeStudentRoster,
  saveStudentRoster,
} from '../../services/studentMasterService';

interface StudentRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentRosterModal: React.FC<StudentRosterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [roster, setRoster] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 엑셀 업로드 시 열 매핑 상태
  const [importPreview, setImportPreview] = useState<{
    headers: string[];
    rows: any[][];
  } | null>(null);

  const [mapping, setMapping] = useState({
    gradeCol: '',
    classCol: '',
    numCol: '',
    studentCodeCol: '',
    nameCol: '',
    emailCol: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeStudentRoster((list) => {
      setRoster(list);
      setLoading(false);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  // 엑셀 파일 로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        if (data.length === 0) {
          alert('비어 있는 엑셀 파일입니다.');
          return;
        }

        const headers = (data[0] || []).map((h) => String(h || '').trim());
        const rows = data.slice(1).filter((r) => r.some((c) => c != null && c !== ''));

        setImportPreview({ headers, rows });

        // 자동 열 추론
        const autoMap = {
          gradeCol: headers.find((h) => h.includes('학년')) || '',
          classCol: headers.find((h) => h.includes('반')) || '',
          numCol: headers.find((h) => h.includes('번호') || h.includes('번')) || '',
          studentCodeCol: headers.find((h) => h.includes('학번')) || '',
          nameCol: headers.find((h) => h.includes('이름') || h.includes('성명')) || '',
          emailCol: headers.find((h) => h.includes('이메일') || h.includes('구글') || h.includes('계정') || h.includes('id') || h.includes('mail')) || '',
        };
        setMapping(autoMap);
      } catch (err: any) {
        alert('엑셀 읽기 실패: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 파싱된 엑셀 데이터를 명렬에 반영
  const handleApplyImport = async () => {
    if (!importPreview) return;
    if (!mapping.nameCol || !mapping.emailCol) {
      alert('최소한 [이름]과 [구글 계정(이메일)] 열은 필수로 지정해야 합니다.');
      return;
    }

    const { headers, rows } = importPreview;
    const nameIdx = headers.indexOf(mapping.nameCol);
    const emailIdx = headers.indexOf(mapping.emailCol);
    const gradeIdx = mapping.gradeCol ? headers.indexOf(mapping.gradeCol) : -1;
    const classIdx = mapping.classCol ? headers.indexOf(mapping.classCol) : -1;
    const numIdx = mapping.numCol ? headers.indexOf(mapping.numCol) : -1;
    const codeIdx = mapping.studentCodeCol ? headers.indexOf(mapping.studentCodeCol) : -1;

    const parsed: StudentRecord[] = [];

    rows.forEach((row) => {
      const name = String(row[nameIdx] || '').trim();
      const email = String(row[emailIdx] || '').trim();
      if (!name || !email) return;

      const grade = gradeIdx >= 0 ? String(row[gradeIdx] || '').trim() : '';
      const classNum = classIdx >= 0 ? String(row[classIdx] || '').trim() : '';
      const studentNum = numIdx >= 0 ? String(row[numIdx] || '').trim() : '';
      const studentCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';

      parsed.push({
        grade,
        classNum,
        studentNum,
        studentCode,
        name,
        email,
      });
    });

    if (parsed.length === 0) {
      alert('유효한 학생 데이터(이름 및 이메일)를 찾을 수 없습니다.');
      return;
    }

    if (confirm(`총 ${parsed.length}명의 학생 계정을 명렬에 저장하시겠습니까? (기존 명렬 대체)`)) {
      setSaving(true);
      try {
        await saveStudentRoster(parsed);
        setImportPreview(null);
        alert(`${parsed.length}명의 학생 명렬이 저장되었습니다.`);
      } catch (err: any) {
        alert('저장 실패: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('등록된 전체 학생 명렬을 삭제하시겠습니까?')) {
      setSaving(true);
      try {
        await saveStudentRoster([]);
      } catch (err: any) {
        alert('삭제 실패: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const filteredRoster = roster.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.studentCode && s.studentCode.includes(q)) ||
      (s.grade && `${s.grade}학년`.includes(q)) ||
      (s.classNum && `${s.classNum}반`.includes(q))
    );
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[24px]">
              badge
            </span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">학교 학생 명렬 관리 (마스터 계정 DB)</h3>
              <p className="text-[11px] text-outline">
                학교 구글 계정 목록을 등록해두면, 시트의 구글 ID 열에서 VLOOKUP처럼 자동 매칭할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Top Actions: Upload Excel & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-container-low rounded-xl border border-surface-variant/60">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                명렬 엑셀 파일 업로드
              </button>
              <span className="text-[11px] text-outline">
                (학년, 반, 번호, 학번, 이름, 구글이메일 포함 엑셀)
              </span>
            </div>

            {roster.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer"
              >
                명렬 전체 삭제
              </button>
            )}
          </div>

          {/* Excel Import Column Mapping Preview Panel */}
          {importPreview && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">rule</span>
                  엑셀 열 매핑 확인 (총 {importPreview.rows.length}개 행 감지)
                </span>
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="text-xs text-outline hover:text-on-surface"
                >
                  취소
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    학년 열
                  </label>
                  <select
                    value={mapping.gradeCol}
                    onChange={(e) => setMapping({ ...mapping, gradeCol: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                  >
                    <option value="">(선택 안함)</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    반 열
                  </label>
                  <select
                    value={mapping.classCol}
                    onChange={(e) => setMapping({ ...mapping, classCol: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                  >
                    <option value="">(선택 안함)</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    번호 열
                  </label>
                  <select
                    value={mapping.numCol}
                    onChange={(e) => setMapping({ ...mapping, numCol: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                  >
                    <option value="">(선택 안함)</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    학번 열 (4~5자리)
                  </label>
                  <select
                    value={mapping.studentCodeCol}
                    onChange={(e) => setMapping({ ...mapping, studentCodeCol: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                  >
                    <option value="">(선택 안함)</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                    * 이름 열 (필수)
                  </label>
                  <select
                    value={mapping.nameCol}
                    onChange={(e) => setMapping({ ...mapping, nameCol: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-emerald-400 rounded-lg font-bold"
                  >
                    <option value="">(열 선택)</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                    * 구글 계정 열 (필수)
                  </label>
                  <select
                    value={mapping.emailCol}
                    onChange={(e) => setMapping({ ...mapping, emailCol: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-emerald-400 rounded-lg font-bold"
                  >
                    <option value="">(열 선택)</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApplyImport}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving ? '저장 중...' : '매핑 완료 및 명렬 등록'}
                </button>
              </div>
            </div>
          )}

          {/* Search & List of current roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface">
                등록된 학생 명렬 (총 <strong className="text-primary">{roster.length}</strong>명)
              </span>

              {roster.length > 0 && (
                <div className="relative w-56">
                  <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-outline">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="이름, 학번, 이메일 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs bg-surface-container-low border border-surface-variant rounded-lg outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-outline">
                명렬을 불러오는 중입니다...
              </div>
            ) : roster.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-surface-variant rounded-2xl bg-surface-container-lowest space-y-2">
                <span className="material-symbols-outlined text-4xl text-outline">school</span>
                <p className="text-xs font-bold text-on-surface">등록된 학생 명렬이 없습니다.</p>
                <p className="text-[11px] text-outline">
                  상단의 [명렬 엑셀 파일 업로드] 버튼을 눌러 학생 구글 계정 목록을 등록해주세요.
                </p>
              </div>
            ) : (
              <div className="border border-surface-variant rounded-xl max-h-72 overflow-y-auto bg-surface-container-lowest">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-surface-container-low border-b border-surface-variant text-[11px] font-bold text-outline">
                    <tr>
                      <th className="p-2 text-center w-12">#</th>
                      <th className="p-2">학년/반/번호</th>
                      <th className="p-2">학번</th>
                      <th className="p-2">이름</th>
                      <th className="p-2">구글 계정 (이메일)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant/40">
                    {filteredRoster.map((s, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/50">
                        <td className="p-2 text-center text-outline text-[10px]">{idx + 1}</td>
                        <td className="p-2 font-medium">
                          {s.grade && s.classNum && s.studentNum
                            ? `${s.grade}학년 ${s.classNum}반 ${s.studentNum}번`
                            : '-'}
                        </td>
                        <td className="p-2 font-mono text-outline">{s.studentCode || '-'}</td>
                        <td className="p-2 font-bold text-on-surface">{s.name}</td>
                        <td className="p-2 font-mono text-primary truncate max-w-xs">{s.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-end bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
