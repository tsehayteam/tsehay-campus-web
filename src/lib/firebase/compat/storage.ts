// Zero-dependency Supabase bridge for legacy Firebase Storage
export const getStorage = (..._args: any[]): any => ({});
export const ref = (..._args: any[]): any => ({});
export const uploadBytes = async (..._args: any[]): Promise<any> => ({ ref: {} });
export const getDownloadURL = async (..._args: any[]): Promise<string> => '';
export type FirebaseStorage = any;
