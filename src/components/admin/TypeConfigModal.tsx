import React, { useState, useEffect, useMemo } from 'react';
import { ColumnConfig, ColumnType, ColumnDef, AVAILABLE_TYPES, GoogleIdMatchingConfig } from '../../types/sheet';
import { Task } from '../../types/task';
import {
  subscribeStudentRoster,
  StudentRecord,
  buildStudentLookupMaps,
  normalizeGradeClassNumKey,
  normalizeStudentCodeKey,
} from '../../services/studentMasterService';

interface TypeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  colKey: string;
  colTitle: string;
  config: ColumnConfig;
  allColumns?: ColumnDef[];
  tasks?: Task[];
  onApplyMatchingToSheet?: (updates: { taskId: string; email: string }[]) => Promise<void>;
  onOpenRosterModal?: () => void;
  isVisibleInUserView?: boolean;
  isReadOnlyInUserView?: boolean;
  onToggleUserView?: (visible: boolean, readOnly: boolean) => Promise<void>;
  onSave: (patch: Partial<ColumnConfig>) => Promise<void>;
  onDeleteColumn?: (colKey: string) => Promise<void>;
}

export const TypeConfigModal: React.FC<TypeConfigModalProps> = ({
  isOpen,
  onClose,
  colKey,
  colTitle,
  config,
  allColumns = [],
  tasks = [],
  onApplyMatchingToSheet,
  onOpenRosterModal,
  isVisibleInUserView = true,
  isReadOnlyInUserView = false,
  onToggleUserView,
  onSave,
  onDeleteColumn,
}) => {
  const [type, setType] = useState<ColumnType>(config.type || 'text');
  const [optionsStr, setOptionsStr] = useState((config.options || []).join('\n'));
  const [userVisible, setUserVisible] = useState(isVisibleInUserView);
  const [userReadOnly, setUserReadOnly] = useState(isReadOnlyInUserView);
  const [saving, setSaving] = useState(false);

  // 구글 ID 매칭 설정 상태
  const [matchingConfig, setMatchingConfig] = useState<GoogleIdMatchingConfig>(
    config.googleIdMatching || { mode: 'manual' }
  );

  // 학생 마스터 명렬 구독
  const [roster, setRoster] = useState<StudentRecord[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeStudentRoster((list) => {
      setRoster(list);
    });
    return () => unsub();
  }, [isOpen]);

  // Lookup 맵 구성
  const lookupMaps = useMemo(() => {
    return buildStudentLookupMaps(roster);
  }, [roster]);

  useEffect(() => {
    setType(config.type || 'text');
    setOptionsStr((config.options || []).join('\n'));
    setUserVisible(isVisibleInUserView);
    setUserReadOnly(isReadOnlyInUserView);
    setMatchingConfig(config.googleIdMatching || { mode: 'manual' });
  }, [config, isVisibleInUserView, isReadOnlyInUserView, isOpen]);

  // 자동 열 추론 (매칭 모드 변경 시 열이 비어있으면 자동 선택)
  const otherColumns = useMemo(() => {
    return allColumns.filter((c) => c.key !== colKey);
  }, [allColumns, colKey]);

  useEffect(() => {
    if (type !== 'googleId') return;
    if (matchingConfig.mode === 'gradeClassNum') {
      const gCol = matchingConfig.gradeColKey || otherColumns.find((c) => c.title.includes('학년'))?.key || '';
      const cCol = matchingConfig.classColKey || otherColumns.find((c) => c.title.includes('반'))?.key || '';
      const nCol = matchingConfig.numColKey || otherColumns.find((c) => c.title.includes('번호') || c.title.includes('번'))?.key || '';
      const nameCol = matchingConfig.nameColKey || otherColumns.find((c) => c.title.includes('이름') || c.title.includes('성명'))?.key || '';
      setMatchingConfig((prev) => ({
        ...prev,
        gradeColKey: gCol,
        classColKey: cCol,
        numColKey: nCol,
        nameColKey: nameCol,
      }));
    } else if (matchingConfig.mode === 'studentCode') {
      const scCol = matchingConfig.studentCodeColKey || otherColumns.find((c) => c.title.includes('학번'))?.key || '';
      const nameCol = matchingConfig.nameColKey || otherColumns.find((c) => c.title.includes('이름') || c.title.includes('성명'))?.key || '';
      setMatchingConfig((prev) => ({
        ...prev,
        studentCodeColKey: scCol,
        nameColKey: nameCol,
      }));
    }
  }, [type, matchingConfig.mode, otherColumns]);

  // 실시간 매칭 미리보기 데이터 계산 (최대 5행)
  const previewData = useMemo(() => {
    if (type !== 'googleId' || matchingConfig.mode === 'manual' || tasks.length === 0) {
      return [];
    }

    return tasks.slice(0, 5).map((t, idx) => {
      let matchedEmail: string | null = null;
      let keyLabel = '';

      if (matchingConfig.mode === 'gradeClassNum') {
        const g = t[matchingConfig.gradeColKey || ''];
        const c = t[matchingConfig.classColKey || ''];
        const n = t[matchingConfig.numColKey || ''];
        const nm = t[matchingConfig.nameColKey || ''];
        keyLabel = `${g || '?'}학년 ${c || '?'}반 ${n || '?'}번 ${nm || '?'}`;
        const lookupKey = normalizeGradeClassNumKey(g, c, n, nm);
        matchedEmail = lookupMaps.byGradeClassNum.get(lookupKey) || null;
      } else if (matchingConfig.mode === 'studentCode') {
        const sc = t[matchingConfig.studentCodeColKey || ''];
        const nm = t[matchingConfig.nameColKey || ''];
        keyLabel = `${sc || '?'} ${nm || '?'}`;
        const lookupKey = normalizeStudentCodeKey(sc, nm);
        matchedEmail = lookupMaps.byStudentCode.get(lookupKey) || null;
      }

      return {
        id: t.id,
        rowIdx: idx + 1,
        keyLabel,
        currentVal: t[colKey] || '(비어있음)',
        matchedEmail,
        isSuccess: !!matchedEmail,
      };
    });
  }, [type, matchingConfig, tasks, colKey, lookupMaps]);

  // 전체 행 매칭 결과 수 계산
  const totalMatchableCount = useMemo(() => {
    if (type !== 'googleId' || matchingConfig.mode === 'manual' || tasks.length === 0) {
      return 0;
    }
    let count = 0;
    tasks.forEach((t) => {
      let email: string | null = null;
      if (matchingConfig.mode === 'gradeClassNum') {
        const key = normalizeGradeClassNumKey(
          t[matchingConfig.gradeColKey || ''],
          t[matchingConfig.classColKey || ''],
          t[matchingConfig.numColKey || ''],
          t[matchingConfig.nameColKey || '']
        );
        email = lookupMaps.byGradeClassNum.get(key) || null;
      } else if (matchingConfig.mode === 'studentCode') {
        const key = normalizeStudentCodeKey(
          t[matchingConfig.studentCodeColKey || ''],
          t[matchingConfig.nameColKey || '']
        );
        email = lookupMaps.byStudentCode.get(key) || null;
      }
      if (email) count++;
    });
    return count;
  }, [type, matchingConfig, tasks, lookupMaps]);

  if (!isOpen) return null;

  // 현재 시트 전체 행에 매칭 일괄 적용 핸들러
  const handleApplyMatchingAll = async () => {
    if (!onApplyMatchingToSheet) return;
    const updates: { taskId: string; email: string }[] = [];

    tasks.forEach((t) => {
      let email: string | null = null;
      if (matchingConfig.mode === 'gradeClassNum') {
        const key = normalizeGradeClassNumKey(
          t[matchingConfig.gradeColKey || ''],
          t[matchingConfig.classColKey || ''],
          t[matchingConfig.numColKey || ''],
          t[matchingConfig.nameColKey || '']
        );
        email = lookupMaps.byGradeClassNum.get(key) || null;
      } else if (matchingConfig.mode === 'studentCode') {
        const key = normalizeStudentCodeKey(
          t[matchingConfig.studentCodeColKey || ''],
          t[matchingConfig.nameColKey || '']
        );
        email = lookupMaps.byStudentCode.get(key) || null;
      }

      if (email && t[colKey] !== email) {
        updates.push({ taskId: t.id, email });
      }
    });

    if (updates.length === 0) {
      alert('새롭게 매칭하여 업데이트할 데이터가 없습니다.');
      return;
    }

    if (confirm(`총 ${updates.length}개 행의 [${colTitle}] 열을 학생 구글 계정으로 일괄 업데이트하시겠습니까?`)) {
      setSaving(true);
      try {
        await onApplyMatchingToSheet(updates);
        alert(`${updates.length}개 행의 구글 계정 매칭이 완료되었습니다.`);
      } catch (err: any) {
        alert('매칭 적용 실패: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const options = optionsStr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const patch: Partial<ColumnConfig> = { type };
      if (type === 'select' || type === 'priority') {
        patch.options = options;
      }
      if (type === 'googleId') {
        patch.googleIdMatching = matchingConfig;
        if (matchingConfig.mode === 'manual' && options.length > 0) {
          patch.options = options;
        }
      }

      await onSave(patch);

      if (
        onToggleUserView &&
        (userVisible !== isVisibleInUserView || userReadOnly !== isReadOnlyInUserView)
      ) {
        await onToggleUserView(userVisible, userReadOnly);
      }

      onClose();
    } catch (err: any) {
      alert('설정 저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            <h3 className="font-bold text-sm text-on-surface">[{colTitle}] 데이터 타입 및 옵션 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Type Picker */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">데이터 타입 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    type === t.id
                      ? 'border-primary bg-primary/5 text-primary font-bold shadow-2xs'
                      : 'border-surface-variant hover:border-outline/40 text-on-surface bg-surface-container-lowest'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">{t.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs truncate">{t.label}</div>
                    <div className="text-[10px] text-outline line-clamp-1 font-normal">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Special Section: Google ID Matching Configuration */}
          {type === 'googleId' && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  구글 ID 입력 방식 설정
                </span>

                {onOpenRosterModal && (
                  <button
                    type="button"
                    onClick={onOpenRosterModal}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">school</span>
                    학생 명렬 DB 확인 ({roster.length}명 등록됨)
                  </button>
                )}
              </div>

              {/* Input Mode Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMatchingConfig({ ...matchingConfig, mode: 'manual' })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    matchingConfig.mode === 'manual'
                      ? 'border-primary bg-white text-primary font-bold shadow-2xs ring-1 ring-primary'
                      : 'border-surface-variant bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <div className="text-xs">직접 입력</div>
                  <div className="text-[10px] text-outline font-normal">자유 텍스트</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchingConfig({ ...matchingConfig, mode: 'gradeClassNum' })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    matchingConfig.mode === 'gradeClassNum'
                      ? 'border-primary bg-white text-primary font-bold shadow-2xs ring-1 ring-primary'
                      : 'border-surface-variant bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <div className="text-xs font-bold">학년/반/번호/이름</div>
                  <div className="text-[10px] text-outline font-normal">VLOOKUP 자동 매칭</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchingConfig({ ...matchingConfig, mode: 'studentCode' })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    matchingConfig.mode === 'studentCode'
                      ? 'border-primary bg-white text-primary font-bold shadow-2xs ring-1 ring-primary'
                      : 'border-surface-variant bg-surface-container-low text-outline hover:text-on-surface'
                  }`}
                >
                  <div className="text-xs font-bold">학번 / 이름</div>
                  <div className="text-[10px] text-outline font-normal">4~5자리 학번 매칭</div>
                </button>
              </div>

              {/* Mode: Manual Notice or Options */}
              {matchingConfig.mode === 'manual' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    선택 가능 계정 목록 (줄 단위 구분, 미입력 시 자유 입력)
                  </label>
                  <textarea
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-mono p-2.5 bg-white border border-surface-variant rounded-xl focus:border-primary outline-none resize-none"
                    placeholder="user1@school.go.kr&#10;user2@school.go.kr"
                  />
                </div>
              ) : (
                /* Mode: Auto Matching Options */
                <div className="space-y-3 pt-1">
                  <div className="text-[11px] text-outline bg-white/70 p-2.5 rounded-xl border border-primary/10">
                    현재 시트의 열 중 매칭 기준이 되는 열을 선택하세요.
                    학생 명렬 DB에서 일치하는 학생의 구글 계정을 찾아옵니다.
                  </div>

                  {/* Matching Column Selectors */}
                  {matchingConfig.mode === 'gradeClassNum' ? (
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface mb-1">
                          학년 열
                        </label>
                        <select
                          value={matchingConfig.gradeColKey || ''}
                          onChange={(e) => setMatchingConfig({ ...matchingConfig, gradeColKey: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                        >
                          <option value="">(열 선택)</option>
                          {otherColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              [{c.letter}] {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-on-surface mb-1">
                          반 열
                        </label>
                        <select
                          value={matchingConfig.classColKey || ''}
                          onChange={(e) => setMatchingConfig({ ...matchingConfig, classColKey: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                        >
                          <option value="">(열 선택)</option>
                          {otherColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              [{c.letter}] {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-on-surface mb-1">
                          번호 열
                        </label>
                        <select
                          value={matchingConfig.numColKey || ''}
                          onChange={(e) => setMatchingConfig({ ...matchingConfig, numColKey: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                        >
                          <option value="">(열 선택)</option>
                          {otherColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              [{c.letter}] {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-on-surface mb-1">
                          이름 열
                        </label>
                        <select
                          value={matchingConfig.nameColKey || ''}
                          onChange={(e) => setMatchingConfig({ ...matchingConfig, nameColKey: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg font-bold"
                        >
                          <option value="">(열 선택)</option>
                          {otherColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              [{c.letter}] {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* studentCode mode */
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface mb-1">
                          학번 열 (4~5자리)
                        </label>
                        <select
                          value={matchingConfig.studentCodeColKey || ''}
                          onChange={(e) => setMatchingConfig({ ...matchingConfig, studentCodeColKey: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg"
                        >
                          <option value="">(열 선택)</option>
                          {otherColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              [{c.letter}] {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-on-surface mb-1">
                          이름 열
                        </label>
                        <select
                          value={matchingConfig.nameColKey || ''}
                          onChange={(e) => setMatchingConfig({ ...matchingConfig, nameColKey: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-surface-variant rounded-lg font-bold"
                        >
                          <option value="">(열 선택)</option>
                          {otherColumns.map((c) => (
                            <option key={c.key} value={c.key}>
                              [{c.letter}] {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Real-time Matching Preview Table */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">visibility</span>
                        실시간 매칭 미리보기 (상위 5행)
                      </span>
                      <span className="text-outline">
                        전체 {tasks.length}개 행 중{' '}
                        <strong className="text-emerald-700">{totalMatchableCount}</strong>개 매칭 가능
                      </span>
                    </div>

                    <div className="border border-surface-variant rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="bg-surface-container-low border-b border-surface-variant text-[10px] font-bold text-outline">
                          <tr>
                            <th className="p-1.5 text-center w-8">#</th>
                            <th className="p-1.5">기준 키</th>
                            <th className="p-1.5">현재 값</th>
                            <th className="p-1.5">매칭 결과 (구글 ID)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-variant/40">
                          {previewData.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-3 text-center text-outline">
                                시트에 데이터가 없거나 열이 선택되지 않았습니다.
                              </td>
                            </tr>
                          ) : (
                            previewData.map((p) => (
                              <tr key={p.id} className="hover:bg-surface-container-low/50">
                                <td className="p-1.5 text-center text-outline text-[10px]">{p.rowIdx}</td>
                                <td className="p-1.5 font-medium truncate max-w-[120px]">{p.keyLabel}</td>
                                <td className="p-1.5 font-mono text-outline truncate max-w-[100px]">
                                  {p.currentVal}
                                </td>
                                <td className="p-1.5 font-mono">
                                  {p.isSuccess ? (
                                    <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                      {p.matchedEmail}
                                    </span>
                                  ) : (
                                    <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                                      일치 학생 없음
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Quick Apply Button to Sheet */}
                    {totalMatchableCount > 0 && onApplyMatchingToSheet && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleApplyMatchingAll}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                          현재 시트에 매칭 일괄 채우기 ({totalMatchableCount}건)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Options (for select, priority) */}
          {(type === 'select' || type === 'priority') && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                선택 옵션 목록 (줄 단위로 구분)
              </label>
              <textarea
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                rows={4}
                className="w-full text-xs font-mono p-3 border border-surface-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                placeholder="진행전&#10;진행중&#10;완료&#10;보류"
              />
            </div>
          )}

          {/* User View Visibility Option */}
          {onToggleUserView && (
            <div className="p-3.5 bg-surface-container-low border border-surface-variant rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {!userVisible ? 'visibility_off' : userReadOnly ? 'lock' : 'edit'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-on-surface">모바일 화면 표시 및 권한</div>
                    <div className="text-[10px] text-outline">
                      {!userVisible
                        ? '모바일 카드에서 숨겨집니다.'
                        : userReadOnly
                        ? '모바일 카드에 표시되며 읽기 전용입니다.'
                        : '모바일 카드에 표시되며 직접 수정 가능합니다.'}
                    </div>
                  </div>
                </div>

                {/* 3-Segment Toggle Control + Status Text Badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center rounded-xl border border-surface-variant p-0.5 bg-white shadow-2xs">
                    {/* 1. Hide Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserVisible(false);
                        setUserReadOnly(false);
                      }}
                      className={`flex items-center justify-center w-7 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !userVisible
                          ? 'bg-surface-variant text-outline shadow-xs'
                          : 'text-outline hover:text-on-surface hover:bg-surface-container'
                      }`}
                      title="모바일 숨김"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                    </button>

                    {/* 2. Editable Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserVisible(true);
                        setUserReadOnly(false);
                      }}
                      className={`flex items-center justify-center w-7 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        userVisible && !userReadOnly
                          ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                          : 'text-outline hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title="모바일 표시 및 수정 가능"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>

                    {/* 3. Read-Only Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserVisible(true);
                        setUserReadOnly(true);
                      }}
                      className={`flex items-center justify-center w-7 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        userVisible && userReadOnly
                          ? 'bg-amber-100 text-amber-900 shadow-xs'
                          : 'text-outline hover:text-amber-800 hover:bg-amber-50'
                      }`}
                      title="모바일 표시 및 읽기 전용"
                    >
                      <span className="material-symbols-outlined text-[15px]">lock</span>
                    </button>
                  </div>

                  {/* Status Text Badge (Click to cycle) */}
                  <span
                    onClick={() => {
                      if (!userVisible) {
                        setUserVisible(true);
                        setUserReadOnly(false);
                      } else if (!userReadOnly) {
                        setUserReadOnly(true);
                      } else {
                        setUserVisible(false);
                        setUserReadOnly(false);
                      }
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-bold cursor-pointer select-none transition-colors ${
                      !userVisible
                        ? 'bg-surface-container text-outline'
                        : userReadOnly
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                    title="클릭하여 상태 순환 (숨김 → 수정 → 읽기)"
                  >
                    {!userVisible ? '숨김' : userReadOnly ? '읽기' : '수정'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-between bg-surface-container-low">
          {onDeleteColumn ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`'${colTitle}' 열을 삭제하시겠습니까? 데이터는 유지되지만 시트에서 숨겨집니다.`)) {
                  onDeleteColumn(colKey);
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              열 삭제
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
