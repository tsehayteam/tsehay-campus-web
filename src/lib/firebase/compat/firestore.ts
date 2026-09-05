// Zero-dependency Supabase & LocalStorage persistent bridge for legacy Firestore
import { supabase } from '@/lib/supabase/client';

export interface QueryDocumentSnapshot {
  id: string;
  data: () => Record<string, any>;
  exists: () => boolean;
  ref?: any;
  [key: string]: any;
}

export interface QuerySnapshot {
  empty: boolean;
  size: number;
  docs: QueryDocumentSnapshot[];
  forEach: (callback: (result: QueryDocumentSnapshot) => void) => void;
  [key: string]: any;
}

export interface DocumentSnapshot {
  id: string;
  data: () => Record<string, any>;
  exists: () => boolean;
  ref?: any;
  [key: string]: any;
}

function cleanPath(args: any[]): string {
  const parts: string[] = [];
  args.forEach(a => {
    if (typeof a === 'string') parts.push(a);
    else if (a && typeof a.path === 'string') parts.push(a.path);
  });
  return parts.join('/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

function getLocalDoc(path: string): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`tc_doc_${path}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setLocalDoc(path: string, data: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`tc_doc_${path}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('tc_doc_change', { detail: { path, data } }));
  } catch (e) {}
}

function removeLocalDoc(path: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`tc_doc_${path}`);
    window.dispatchEvent(new CustomEvent('tc_doc_change', { detail: { path, deleted: true } }));
  } catch (e) {}
}

export const getFirestore = (..._args: any[]): any => ({});
export const initializeFirestore = (..._args: any[]): any => ({});

export const doc = (...args: any[]): any => {
  const path = cleanPath(args);
  const parts = path.split('/');
  const id = parts[parts.length - 1] || `doc_${Date.now()}`;
  return {
    id,
    path,
    parent: {
      id: parts[parts.length - 2] || '',
      path: parts.slice(0, -1).join('/'),
      parent: {
        id: parts[parts.length - 3] || '',
        path: parts.slice(0, -2).join('/')
      }
    }
  };
};

export const collection = (...args: any[]): any => {
  const path = cleanPath(args);
  const parts = path.split('/');
  const id = parts[parts.length - 1] || `col_${Date.now()}`;
  return { id, path };
};

export const collectionGroup = (...args: any[]): any => ({ id: args[0] || 'group', path: args[0] || 'group' });

export const getDoc = async (docRef?: any): Promise<DocumentSnapshot> => {
  if (!docRef || !docRef.path) {
    return { id: '', exists: () => false, data: () => ({}) };
  }
  const localData = getLocalDoc(docRef.path);
  if (localData) {
    return {
      id: docRef.id,
      exists: () => true,
      data: () => localData,
      ref: docRef
    };
  }

  // If user profile
  if (docRef.path.includes('profile')) {
    try {
      const parts = docRef.path.split('/');
      const userIdx = parts.indexOf('users');
      const userId = userIdx >= 0 ? parts[userIdx + 1] : '';
      if (userId) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (prof) {
          return { id: docRef.id, exists: () => true, data: () => prof, ref: docRef };
        }
      }
    } catch (e) {}
  }

  return {
    id: docRef.id,
    exists: () => false,
    data: () => ({} as Record<string, any>),
    ref: docRef
  };
};

export const getDocs = async (queryRef?: any): Promise<QuerySnapshot> => {
  const path = queryRef?.path || (typeof queryRef === 'string' ? queryRef : '');
  const docs: QueryDocumentSnapshot[] = [];

  if (typeof window !== 'undefined' && path) {
    const prefix = `tc_doc_${path}/`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const subId = key.substring(prefix.length);
        if (!subId.includes('/')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              docs.push({
                id: subId,
                data: () => parsed,
                exists: () => true
              });
            }
          } catch (e) {}
        }
      }
    }
  }

  // If querying purchased_courses or enrollments, also load from Supabase if empty
  if (path.includes('purchased_courses')) {
    try {
      const parts = path.split('/');
      const userIdx = parts.indexOf('users');
      const userId = userIdx >= 0 ? parts[userIdx + 1] : '';
      if (userId) {
        const { data: enrollments } = await supabase.from('enrollments').select('*').eq('user_id', userId);
        if (enrollments && enrollments.length > 0) {
          enrollments.forEach(enr => {
            if (!docs.some(d => d.id === enr.course_id)) {
              docs.push({
                id: enr.course_id,
                data: () => ({ courseId: enr.course_id, amount: enr.amount, status: enr.status }),
                exists: () => true
              });
            }
          });
        }
      }
    } catch (e) {}
  }

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb: (doc: QueryDocumentSnapshot) => void) => docs.forEach(cb)
  };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }): Promise<void> => {
  if (!docRef || !docRef.path) return;
  const path = docRef.path;
  let finalData = data;
  if (options?.merge) {
    const existing = getLocalDoc(path) || {};
    finalData = { ...existing, ...data };
  }
  setLocalDoc(path, finalData);

  // Background sync to Supabase based on collection
  try {
    if (path.includes('purchased_courses') || path.includes('enrollments')) {
      const courseId = finalData.courseId || docRef.id;
      const parts = path.split('/');
      const userIdx = parts.indexOf('users');
      const userId = userIdx >= 0 ? parts[userIdx + 1] : '';
      if (userId && courseId) {
        try {
          await supabase.from('enrollments').upsert({
            id: `enr_${userId}_${courseId}`,
            user_id: userId,
            course_id: courseId,
            amount: finalData.amount || 0,
            payment_method: finalData.paymentMethod || 'free',
            status: finalData.status || 'completed'
          });
        } catch (e) {}
      }
    } else if (path.includes('site_settings') || path.startsWith('settings/')) {
      const key = docRef.id;
      try {
        await supabase.from('site_settings').upsert({
          key,
          data: finalData,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }
  } catch (e) {}
};

export const updateDoc = async (docRef: any, data: any): Promise<void> => {
  return setDoc(docRef, data, { merge: true });
};

export const deleteDoc = async (docRef: any): Promise<void> => {
  if (!docRef || !docRef.path) return;
  removeLocalDoc(docRef.path);
  if (docRef.path.includes('courses/')) {
    const courseId = docRef.id;
    try {
      await supabase.from('courses').delete().eq('id', courseId);
    } catch (e) {}
  }
};

export const addDoc = async (colRef: any, data: any): Promise<any> => {
  const newId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `${colRef?.path || 'col'}/${newId}`;
  setLocalDoc(path, { ...data, id: newId });
  return { id: newId, path };
};

export const onSnapshot = (
  ref: any,
  onNext: (snap: QuerySnapshot & DocumentSnapshot) => void,
  _onError?: (err: any) => void
): any => {
  if (typeof onNext !== 'function') return () => {};

  const execute = async () => {
    try {
      if (!ref || !ref.path) {
        onNext({
          empty: true,
          size: 0,
          docs: [] as QueryDocumentSnapshot[],
          exists: () => false,
          data: () => ({}),
          id: '',
          forEach: () => {}
        });
        return;
      }
      const parts = ref.path.split('/');
      const isDoc = parts.length % 2 === 0;
      if (isDoc) {
        const snap = await getDoc(ref);
        onNext({
          empty: !snap.exists(),
          size: snap.exists() ? 1 : 0,
          docs: snap.exists() ? [{ id: snap.id, data: snap.data, exists: snap.exists }] : [],
          exists: snap.exists,
          data: snap.data,
          id: snap.id,
          forEach: (cb: any) => { if (snap.exists()) cb({ id: snap.id, data: snap.data, exists: snap.exists }); }
        });
      } else {
        const snap = await getDocs(ref);
        onNext({
          empty: snap.empty,
          size: snap.size,
          docs: snap.docs,
          exists: () => !snap.empty,
          data: () => ({}),
          id: ref.id || '',
          forEach: snap.forEach
        });
      }
    } catch (e) {}
  };

  execute();

  if (typeof window !== 'undefined') {
    const handler = (e: any) => {
      if (!e.detail?.path || ref?.path?.startsWith(e.detail.path) || e.detail.path?.startsWith(ref?.path)) {
        execute();
      }
    };
    window.addEventListener('tc_doc_change', handler);
    window.addEventListener('storage', execute);
    return () => {
      window.removeEventListener('tc_doc_change', handler);
      window.removeEventListener('storage', execute);
    };
  }

  return () => {};
};

export const query = (ref: any, ..._args: any[]): any => ref;
export const where = (...args: any[]): any => ({ type: 'where', args });
export const orderBy = (...args: any[]): any => ({ type: 'orderBy', args });
export const limit = (...args: any[]): any => ({ type: 'limit', args });

export const serverTimestamp = (..._args: any[]): any => new Date().toISOString();
export const arrayUnion = (...elements: any[]) => elements;
export const arrayRemove = (...elements: any[]) => elements;
export const increment = (n: number = 1) => n;

export type Firestore = any;
