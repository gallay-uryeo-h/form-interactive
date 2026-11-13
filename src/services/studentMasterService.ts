import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, COLLECTION_NAME } from './firebase';

export interface StudentRecord {
  grade?: string;       // 학년 (예: '1', '2', '3')
  classNum?: string;    // 반 (예: '1', '2')
  studentNum?: string;  // 번호 (예: '5', '15')
  studentCode?: string; // 학번 (예: '30215', '10101')
  name: string;         // 이름 (예: '홍길동')
  email: string;        // 구글 계정 (예: 'hong@school.kr')
}

const ROSTER_DOC_ID = 'student_roster_master';

/** 정규화 헬퍼 */
export function normalizeGradeClassNumKey(
  grade: any,
  classNum: any,
  studentNum: any,
  name: any
): string {
  const g = String(grade ?? '').trim().replace(/[^0-9]/g, '');
  const c = String(classNum ?? '').trim().replace(/[^0-9]/g, '');
  const n = String(studentNum ?? '').trim().replace(/[^0-9]/g, '');
  const nm = String(name ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!g || !c || !n || !nm) return '';
  // 1-1-1-홍길동 형태로 통일
  return `${Number(g)}-${Number(c)}-${Number(n)}-${nm}`;
}

export function normalizeStudentCodeKey(studentCode: any, name: any): string {
  const code = String(studentCode ?? '').trim().replace(/[^0-9]/g, '');
  const nm = String(name ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!code || !nm) return '';
  return `${code}-${nm}`;
}

export function subscribeStudentRoster(
  callback: (roster: StudentRecord[]) => void,
  onError?: (err: any) => void
) {
  const rosterDocRef = doc(db, COLLECTION_NAME, ROSTER_DOC_ID);
  return onSnapshot(
    rosterDocRef,
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const data = snap.data();
      const list: StudentRecord[] = Array.isArray(data.students) ? data.students : [];
      callback(list);
    },
    (err) => {
      console.error('[Firestore] subscribeStudentRoster 에러:', err);
      onError?.(err);
    }
  );
}

export async function saveStudentRoster(students: StudentRecord[]): Promise<void> {
  const rosterDocRef = doc(db, COLLECTION_NAME, ROSTER_DOC_ID);
  // undefined 값 제거 및 이메일/이름 정규화
  const sanitized = students.map((s) => ({
    grade: s.grade ? String(s.grade).trim() : '',
    classNum: s.classNum ? String(s.classNum).trim() : '',
    studentNum: s.studentNum ? String(s.studentNum).trim() : '',
    studentCode: s.studentCode ? String(s.studentCode).trim() : '',
    name: String(s.name || '').trim(),
    email: String(s.email || '').trim().toLowerCase(),
  })).filter((s) => s.name && s.email);

  await setDoc(
    rosterDocRef,
    {
      students: sanitized,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * 명렬 목록으로부터 lookup 맵 2개(학년반번호용, 학번용)를 빌드합니다.
 */
export function buildStudentLookupMaps(roster: StudentRecord[]) {
  const byGradeClassNum = new Map<string, string>();
  const byStudentCode = new Map<string, string>();

  roster.forEach((student) => {
    const email = student.email.trim();
    if (!email) return;

    // 1. 학년-반-번호-이름 키
    if (student.grade && student.classNum && student.studentNum && student.name) {
      const key = normalizeGradeClassNumKey(
        student.grade,
        student.classNum,
        student.studentNum,
        student.name
      );
      if (key) byGradeClassNum.set(key, email);
    }

    // 2. 학번-이름 키
    if (student.studentCode && student.name) {
      const key = normalizeStudentCodeKey(student.studentCode, student.name);
      if (key) byStudentCode.set(key, email);
    } else if (student.grade && student.classNum && student.studentNum && student.name) {
      // 학년(1자리) + 반(2자리) + 번호(2자리) 로 학번 합성 추론도 등록
      const g = String(student.grade).trim().replace(/[^0-9]/g, '');
      const c = String(student.classNum).trim().replace(/[^0-9]/g, '').padStart(2, '0');
      const n = String(student.studentNum).trim().replace(/[^0-9]/g, '').padStart(2, '0');
      const syntheticCode = `${g}${c}${n}`;
      const syntheticKey = normalizeStudentCodeKey(syntheticCode, student.name);
      if (syntheticKey && !byStudentCode.has(syntheticKey)) {
        byStudentCode.set(syntheticKey, email);
      }
    }
  });

  return { byGradeClassNum, byStudentCode };
}
