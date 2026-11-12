export type ColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'date'
  | 'priority'
  | 'checkbox'
  | 'progress'
  | 'googleId'
  | 'cardHeader'
  | 'locked';

export interface ColumnTypeInfo {
  id: ColumnType;
  label: string;
  icon: string;
  desc: string;
}

export const AVAILABLE_TYPES: ColumnTypeInfo[] = [
  { id: 'text', label: '텍스트', icon: 'short_text', desc: '자유 텍스트 입력' },
  { id: 'number', label: '숫자', icon: 'numbers', desc: '정수, 소수, 점수 등 수치 데이터' },
  { id: 'cardHeader', label: '카드 제목', icon: 'badge', desc: '모바일 카드 최상단 대표 제목' },
  { id: 'googleId', label: '구글 ID', icon: 'account_circle', desc: '사용자 이메일 기반 필터링 및 권한 제어' },
  { id: 'select', label: '드롭다운', icon: 'arrow_drop_down_circle', desc: '선택형 단일 옵션' },
  { id: 'date', label: '날짜', icon: 'calendar_today', desc: '연-월-일 선택기' },
  { id: 'priority', label: '우선순위', icon: 'flag', desc: '긴급 / 높음 / 보통 / 낮음' },
  { id: 'checkbox', label: '체크박스', icon: 'check_box', desc: '참 / 거짓 토글' },
  { id: 'progress', label: '진척도', icon: 'trending_up', desc: '0% ~ 100% 진행률 바' },
  { id: 'locked', label: '잠금 (읽기전용)', icon: 'lock', desc: '수정 불가 읽기전용 셀' },
];

export interface ColumnConfig {
  label?: string;
  type: ColumnType;
  options?: string[];
  width?: number;
  locked?: boolean;
}

export interface ColumnDef {
  key: string;
  letter: string;
  title: string;
  width?: number;
}

export interface Sheet {
  id: string;
  name: string;
  createdAt?: string;
  owner?: string;
  isClosed?: boolean;
  deadline?: string;
}

export interface SheetMetadata {
  sheets: Sheet[];
  [key: string]: any;
}

