import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  parseExcelWorkbook,
  extractSheetData,
  importExcelToFirestore,
  ParsedExcelSheet,
} from '../../services/excelService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  onSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  sheetId,
  onSuccess,
}) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [autoDoubleHeader, setAutoDoubleHeader] = useState<boolean>(true);
  const [parsedData, setParsedData] = useState<ParsedExcelSheet | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importing, setImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const parsed = parseExcelWorkbook(buffer);
        setWorkbook(parsed.workbook);
        setSheetNames(parsed.sheetNames);
        if (parsed.sheetNames.length > 0) {
          const first = parsed.sheetNames[0];
          setSelectedSheet(first);
          const data = extractSheetData(parsed.workbook, first, autoDoubleHeader);
          setParsedData(data);
        }
      } catch (err: any) {
        alert('엑셀 파일 파싱 오류: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const data = extractSheetData(workbook, sheetName, autoDoubleHeader);
      setParsedData(data);
    }
  };

  const handleDoubleHeaderToggle = (checked: boolean) => {
    setAutoDoubleHeader(checked);
    if (workbook && selectedSheet) {
      const data = extractSheetData(workbook, selectedSheet, checked);
      setParsedData(data);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !parsedData.headers.length) {
      alert('가져올 데이터가 없습니다.');
      return;
    }

    setImporting(true);
    try {
      await importExcelToFirestore(
        sheetId,
        parsedData.headers,
        parsedData.rows,
        importMode
      );
      alert('엑셀 데이터 가져오기가 완료되었습니다.');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('가져오기 실패: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">upload_file</span>
            <h3 className="font-bold text-sm text-on-surface">엑셀 파일 업로드 (.xlsx / .csv)</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* File input */}
          <div className="border-2 border-dashed border-surface-variant rounded-2xl p-6 text-center hover:border-primary/50 transition-colors bg-surface-container-low/50">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excelFileInput"
            />
            <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
              <span className="text-xs font-bold text-on-surface">
                클릭하여 엑셀(.xlsx, .xls) 또는 CSV 파일을 선택하세요
              </span>
              <span className="text-[11px] text-outline">대입 전형 데이터, 명단, 설문 결과 등 지원</span>
            </label>
          </div>

          {workbook && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                {/* Sheet selection */}
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">워크시트 선택</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl bg-white outline-none focus:border-primary"
                  >
                    {sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Import Mode */}
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">데이터 반영 방식</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl bg-white outline-none focus:border-primary"
                  >
                    <option value="replace">기존 데이터 전체 덮어쓰기 (초기화)</option>
                    <option value="append">기존 데이터 뒤에 행 추가 (이어붙이기)</option>
                  </select>
                </div>
              </div>

              {/* 2-row header option */}
              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoDoubleHeader}
                  onChange={(e) => handleDoubleHeaderToggle(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                대입 양식 이중 헤더(2행 헤더 병합) 자동 감지 및 처리
              </label>

              {/* Preview Table */}
              {parsedData && (
                <div>
                  <div className="text-xs font-bold text-on-surface mb-1.5 flex items-center justify-between">
                    <span>미리보기 ({parsedData.headers.length}개 열, {parsedData.rows.length}개 행)</span>
                    {parsedData.hasDoubleHeader && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        이중 헤더 감지됨
                      </span>
                    )}
                  </div>
                  <div className="border border-surface-variant rounded-xl overflow-x-auto max-h-48 bg-white">
                    <table className="min-w-full text-[11px] divide-y divide-surface-variant">
                      <thead className="bg-surface-container-low font-bold text-on-surface-variant">
                        <tr>
                          {parsedData.headers.map((h, i) => (
                            <th key={i} className="px-2.5 py-1.5 text-left border-r border-surface-variant truncate max-w-[150px]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-variant">
                        {parsedData.rows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-surface-container-low/40">
                            {parsedData.headers.map((_, cIdx) => (
                              <td key={cIdx} className="px-2.5 py-1 text-outline truncate max-w-[150px]">
                                {row[cIdx] != null ? String(row[cIdx]) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-end gap-2 bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!parsedData || importing}
            onClick={handleImport}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {importing && <span className="animate-spin text-sm">⏳</span>}
            {importing ? '가져오는 중...' : '시트에 가져오기'}
          </button>
        </div>
      </div>
    </div>
  );
};

