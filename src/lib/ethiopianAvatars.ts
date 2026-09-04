/**
 * Curated Collection of Ethiopian Student, Creator & Tech Avatars
 * Diverse male and female Habesha portraits, 3D cyber avatars, and modern digital entrepreneurs.
 */

export interface EthiopianAvatar {
  id: string;
  name: string;
  nameEn: string;
  gender: 'male' | 'female' | '3d';
  category: string;
  url: string;
  badge: string;
}

export const ETHIOPIAN_AVATARS: EthiopianAvatar[] = [
  // 👨 Male Ethiopian Creators & Students
  {
    id: 'eth-m-1',
    name: 'ኢዮብ (Eyoub)',
    nameEn: 'Eyoub - Lead Mentor',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: '/assets/eyob_white.jpg',
    badge: '👑 Mentor'
  },
  {
    id: 'eth-m-2',
    name: 'ዳዊት (Dawit)',
    nameEn: 'Dawit - Tech Developer',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    badge: '💻 Tech Pro'
  },
  {
    id: 'eth-m-3',
    name: 'ዮሴፍ (Yosef)',
    nameEn: 'Yosef - E-Commerce Master',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    badge: '🛍️ E-Commerce'
  },
  {
    id: 'eth-m-4',
    name: 'አማኑኤል (Amanuel)',
    nameEn: 'Amanuel - Digital Marketer',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1522556189639-b150ed9c4330?w=300&auto=format&fit=crop&q=80',
    badge: '🎯 Marketer'
  },
  {
    id: 'eth-m-5',
    name: 'ሳሙኤል (Samuel)',
    nameEn: 'Samuel - Crypto Trader',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    badge: '📈 Trader'
  },
  {
    id: 'eth-m-6',
    name: 'ናሆም (Nahom)',
    nameEn: 'Nahom - YouTube Creator',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    badge: '🎬 YouTuber'
  },
  {
    id: 'eth-m-7',
    name: 'ቴዎድሮስ (Tewodros)',
    nameEn: 'Tewodros - Habesha Leader',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    badge: '🌟 Leader'
  },
  {
    id: 'eth-m-8',
    name: 'ኤርሚያስ (Ermias)',
    nameEn: 'Ermias - Creative Designer',
    gender: 'male',
    category: '👨 ወንድ (Male)',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    badge: '🎨 Designer'
  },

  // 👩 Female Ethiopian Creators & Students
  {
    id: 'eth-f-1',
    name: 'ሰላም (Selam)',
    nameEn: 'Selam - YouTube Creator',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    badge: '🎬 YouTuber'
  },
  {
    id: 'eth-f-2',
    name: 'ቤተልሄም (Bethlehem)',
    nameEn: 'Bethlehem - Shein Business Pro',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    badge: '🛍️ Shein VIP'
  },
  {
    id: 'eth-f-3',
    name: 'ህሊና (Hilina)',
    nameEn: 'Hilina - Digital Strategist',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
    badge: '🎯 Strategist'
  },
  {
    id: 'eth-f-4',
    name: 'ሩት (Ruth)',
    nameEn: 'Ruth - UI/UX Designer',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    badge: '✨ UI/UX Pro'
  },
  {
    id: 'eth-f-5',
    name: 'ማህሌት (Mahlet)',
    nameEn: 'Mahlet - Fashion & E-Com',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
    badge: '👗 Fashion'
  },
  {
    id: 'eth-f-6',
    name: 'ሄለን (Helen)',
    nameEn: 'Helen - Online Business',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
    badge: '💼 Business'
  },
  {
    id: 'eth-f-7',
    name: 'ሃና (Hanna)',
    nameEn: 'Hanna - Habesha Shuruba Style',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    badge: '🇪🇹 Habesha'
  },
  {
    id: 'eth-f-8',
    name: 'ሊዲያ (Lydia)',
    nameEn: 'Lydia - Content Creator',
    gender: 'female',
    category: '👩 ሴት (Female)',
    url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&auto=format&fit=crop&q=80',
    badge: '📱 Creator'
  },

  // 🤖 3D Cyber & Tech Habesha Avatars
  {
    id: 'eth-3d-1',
    name: '3D ሮቦት ሐበሻ (Tech Guy)',
    nameEn: '3D Tech Habesha Guy',
    gender: '3d',
    category: '🤖 3D & AI',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=EyoubHabesha&backgroundColor=f9b03c',
    badge: '⚡ Cyber'
  },
  {
    id: 'eth-3d-2',
    name: '3D ሮቦት ሐበሻዊት (Tech Girl)',
    nameEn: '3D Tech Habesha Girl',
    gender: '3d',
    category: '🤖 3D & AI',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SelamHabesha&backgroundColor=3268ba',
    badge: '⚡ AI Pro'
  },
  {
    id: 'eth-3d-3',
    name: '3D አቫታር ፈጣሪ (Habesha Male)',
    nameEn: '3D Avataaar Habesha Male',
    gender: '3d',
    category: '🤖 3D & AI',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abebe&skinColor=darkBrown&top=shortCurly&facialHair=beardLight&backgroundColor=f9b03c',
    badge: '✨ 3D Model'
  },
  {
    id: 'eth-3d-4',
    name: '3D አቫታር ፈጣሪ (Habesha Female)',
    nameEn: '3D Avataaar Habesha Female',
    gender: '3d',
    category: '🤖 3D & AI',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aster&skinColor=darkBrown&top=longCurly&backgroundColor=c0aede',
    badge: '✨ 3D Model'
  }
];
