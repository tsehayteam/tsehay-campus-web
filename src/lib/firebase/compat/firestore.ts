// Zero-dependency Supabase bridge for legacy Firestore

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

export const getFirestore = (..._args: any[]): any => ({});
export const initializeFirestore = (..._args: any[]): any => ({});

export const doc = (...args: any[]): any => {
  const last = args[args.length - 1];
  return { id: String(last || 'doc_id'), path: args.join('/') };
};

export const collection = (...args: any[]): any => {
  const last = args[args.length - 1];
  return { id: String(last || 'col_id'), path: args.join('/') };
};

export const collectionGroup = (...args: any[]): any => ({ id: args[0] || 'group' });

export const getDoc = async (docRef?: any): Promise<DocumentSnapshot> => ({
  exists: () => false,
  data: () => ({} as Record<string, any>),
  id: docRef?.id || ''
});

export const getDocs = async (_query?: any): Promise<QuerySnapshot> => ({
  empty: true,
  docs: [] as QueryDocumentSnapshot[],
  size: 0,
  forEach: (_cb: any) => {}
});

export const setDoc = async (..._args: any[]): Promise<any> => {};
export const updateDoc = async (..._args: any[]): Promise<any> => {};
export const deleteDoc = async (..._args: any[]): Promise<any> => {};
export const addDoc = async (..._args: any[]): Promise<any> => ({ id: `doc_${Date.now()}` });

export const onSnapshot = (
  _ref: any,
  onNext: (snap: QuerySnapshot) => void,
  _onError?: (err: any) => void
): any => {
  if (typeof onNext === 'function') {
    onNext({
      empty: true,
      docs: [] as QueryDocumentSnapshot[],
      size: 0,
      forEach: (_cb: any) => {},
      exists: () => false,
      data: () => ({} as Record<string, any>)
    });
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
