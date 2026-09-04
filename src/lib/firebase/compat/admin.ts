// Zero-dependency Supabase bridge for legacy Firebase Admin

export interface AdminDocSnapshot {
  id: string;
  exists: boolean;
  data: () => Record<string, any>;
  ref?: any;
  [key: string]: any;
}

export interface AdminQuerySnapshot {
  empty: boolean;
  size: number;
  docs: AdminDocSnapshot[];
  forEach: (callback: (doc: AdminDocSnapshot) => void) => void;
  [key: string]: any;
}

export interface AdminQuery {
  where: (...args: any[]) => AdminQuery;
  orderBy: (...args: any[]) => AdminQuery;
  limit: (...args: any[]) => AdminQuery;
  get: () => Promise<AdminQuerySnapshot>;
  doc: (id?: string) => AdminDocRef;
  collection: (id: string) => AdminQuery;
  collectionGroup: (id: string) => AdminQuery;
  add: (data: any) => Promise<AdminDocRef>;
  [key: string]: any;
}

export interface AdminDocRef {
  id: string;
  get: () => Promise<AdminDocSnapshot>;
  set: (data: any, options?: any) => Promise<any>;
  update: (data: any) => Promise<any>;
  delete: () => Promise<any>;
  collection: (id: string) => AdminQuery;
  [key: string]: any;
}

const mockDocRef = (id = 'mock_id'): AdminDocRef => ({
  id,
  get: async () => ({
    id,
    exists: false,
    data: () => ({} as Record<string, any>)
  }),
  set: async () => ({}),
  update: async () => ({}),
  delete: async () => ({}),
  collection: () => mockQuery
});

const mockQuery: AdminQuery = {
  where: () => mockQuery,
  orderBy: () => mockQuery,
  limit: () => mockQuery,
  get: async () => ({
    empty: true,
    size: 0,
    docs: [] as AdminDocSnapshot[],
    forEach: (_cb: any) => {}
  }),
  doc: (id?: string) => mockDocRef(id),
  collection: () => mockQuery,
  collectionGroup: () => mockQuery,
  add: async () => mockDocRef()
};

export const FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
  arrayUnion: (...items: any[]) => items,
  arrayRemove: (...items: any[]) => items,
  increment: (n = 1) => n
};

export const Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
  fromDate: (date: Date) => ({ toMillis: () => date.getTime(), toDate: () => date, seconds: Math.floor(date.getTime() / 1000) }),
  fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) })
};

export const adminDb: AdminQuery = mockQuery;
export const adminAuth: any = {
  verifyIdToken: async () => ({ uid: 'user', admin: true }),
  updateUser: async () => ({}),
  getUser: async () => ({ uid: 'user' })
};

export const getAdminDb = (): AdminQuery => adminDb;
export const getAdminAuth = () => adminAuth;
export const hasAdminCredentials = false;

export const getAuth = (_app?: any): any => adminAuth;

const defaultAdminExport = {
  initializeApp: () => ({}),
  credential: {
    cert: () => ({})
  },
  firestore: () => adminDb,
  auth: () => adminAuth,
  getAuth,
  FieldValue,
  Timestamp,
  apps: []
};

export default defaultAdminExport;
