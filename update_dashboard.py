import re

with open('src/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add currentView state and useAuth
code = code.replace(
    'export default function StudentDashboard() {',
    '''import { useAuth } from '@/context/AuthContext';\n\nexport default function StudentDashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('classroom');'''
)

# 2. Update fetching to use user.uid
code = code.replace(
    'const q = query(collection(db, \'courses\'), orderBy(\'createdAt\', \'desc\'));',
    '''if (!user) { setLoading(false); return; }
        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));'''
)

# 3. Update the profile section to use user data
profile_regex = r'<div className=\"flex items-center justify-center lg:justify-start gap-3 p-2 mb-2\">.*?</div>\s*</div>'
profile_replacement = '''<div className="flex items-center justify-center lg:justify-start gap-3 p-2 mb-2">
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=Nehmiya&background=7b61ff&color=fff"} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="Profile" />
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user?.displayName || 'Nehmiya'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{courses.length > 0 ? 'Pro Member' : 'Normal Student'}</p>
            </div>
          </div>'''
code = re.sub(profile_regex, profile_replacement, code, flags=re.DOTALL)

# 4. Wrap <main> with the header and a flex-1 col div
main_start_idx = code.find('{/* Main Content Area */}')
if main_start_idx != -1:
    header_html = '''{/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Header */}
        <header className="h-[72px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0">
            <div className="flex items-center gap-4">
                <nav className="hidden md:flex text-sm font-semibold text-gray-500 dark:text-gray-400 items-center gap-2 font-body">
                    <span onClick={() => setCurrentView('courses')} className="hover:text-secondary dark:hover:text-primary transition cursor-pointer">ኮርሶች</span>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span onClick={() => setCurrentView('courses')} className="hover:text-secondary dark:hover:text-primary transition cursor-pointer">የኔ ኮርሶች</span>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span className="text-dark dark:text-white font-bold truncate max-w-[200px]">{activeCourse ? activeCourse.title : 'በመጫን ላይ...'}</span>
                </nav>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                <a href="/courses" className="hidden md:flex text-sm font-bold text-secondary dark:text-primary bg-blue-50 dark:bg-slate-800 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-slate-700 transition items-center gap-2">
                    <i className="fa-solid fa-cart-shopping"></i> ተጨማሪ ኮርሶች
                </a>
                <button onClick={() => document.documentElement.classList.toggle('dark')} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition shadow-sm shrink-0">
                    <i className="fa-solid fa-moon text-slate-600 dark:text-yellow-400 text-sm"></i>
                </button>
                <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-500/10 dark:to-yellow-500/10 border border-primary/30 px-3 py-1.5 rounded-full shadow-sm cursor-help hover:scale-105 transition">
                    <div className="bg-primary/20 p-1 rounded-full"><i className="fa-solid fa-bolt text-primary text-xs"></i></div>
                    <span className="font-black text-dark dark:text-white text-sm font-heading">100</span>
                </div>
                <button className="relative text-gray-400 dark:text-gray-300 hover:text-dark dark:hover:text-white transition text-xl shrink-0">
                    <i className="fa-regular fa-bell"></i>
                </button>
            </div>
        </header>
        
        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#111111] p-4 lg:p-8 relative">
          
          {currentView === 'classroom' && (
            <>'''
    
    code = code[:main_start_idx] + header_html + code[main_start_idx + len('{/* Main Content Area */}\n      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#111111] p-4 lg:p-8">'):]
    
    # Close the new wrappers
    code = code.replace('</main>\n      <FloatingAIButton />', '''</>
          )}

          {currentView === 'courses' && (
             <div className="max-w-7xl mx-auto py-10">
               <h2 className="text-2xl font-bold mb-6">የእኔ ኮርሶች (My Courses)</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {courses.map(course => (
                    <div key={course.id} className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <img src={course.thumbnail} className="w-full h-48 object-cover rounded-2xl mb-4" />
                      <h3 className="font-bold text-lg mb-2">{course.title}</h3>
                      <button onClick={() => { setActiveCourse(course); setCurrentView('classroom'); }} className="w-full py-2 bg-primary text-dark font-bold rounded-xl hover:bg-yellow-400">ወደ ትምህርቱ</button>
                    </div>
                 ))}
               </div>
             </div>
          )}

          {currentView === 'messages' && (
             <div className="text-center py-20"><h2 className="text-2xl font-bold text-slate-500">Messages (Coming Soon)</h2></div>
          )}

          {currentView === 'certificates' && (
             <div className="text-center py-20"><h2 className="text-2xl font-bold text-slate-500">Certificates (Coming Soon)</h2></div>
          )}

          {currentView === 'settings' && (
             <div className="max-w-2xl mx-auto py-10 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
               <h2 className="text-2xl font-bold mb-6">ማስተካከያ (Settings)</h2>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold mb-1">ስም (Name)</label>
                   <input type="text" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" defaultValue={user?.displayName || 'Nehmiya'} />
                 </div>
                 <div>
                   <label className="block text-sm font-bold mb-1">ኢሜይል (Email)</label>
                   <input type="email" readOnly className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500" value={user?.email || ''} />
                 </div>
                 <button className="px-6 py-3 bg-primary text-dark font-bold rounded-xl hover:bg-yellow-400 w-full mt-4">አዘምን (Save Changes)</button>
               </div>
             </div>
          )}

        </main>
      </div>
      <FloatingAIButton />''')

    # Update sidebar buttons to switch views instead of alert or doing nothing
    code = code.replace(
        '<button className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary font-bold transition flex-shrink-0 group w-full text-left">',
        '<button onClick={() => setCurrentView(\'classroom\')} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition flex-shrink-0 group w-full text-left ${currentView === \'classroom\' ? \'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary\' : \'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white\'}`}>'
    )
    code = code.replace(
        '<a href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white font-bold transition flex-shrink-0 group w-full text-left">',
        '<button onClick={() => setCurrentView(\'courses\')} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition flex-shrink-0 group w-full text-left ${currentView === \'courses\' ? \'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary\' : \'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white\'}`}>'
    )
    code = code.replace(
        '<a href="#" className="flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white font-bold transition flex-shrink-0 group w-full text-left">\n            <i className="fa-solid fa-comments',
        '<button onClick={() => setCurrentView(\'messages\')} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition flex-shrink-0 group w-full text-left ${currentView === \'messages\' ? \'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary\' : \'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white\'}`}>\n            <i className="fa-solid fa-comments'
    )
    code = code.replace(
        '<a href="#" className="flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white font-bold transition flex-shrink-0 group w-full text-left">\n            <i className="fa-solid fa-certificate',
        '<button onClick={() => setCurrentView(\'certificates\')} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition flex-shrink-0 group w-full text-left ${currentView === \'certificates\' ? \'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary\' : \'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white\'}`}>\n            <i className="fa-solid fa-certificate'
    )
    code = code.replace(
        '<a href="#" className="flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white font-bold transition flex-shrink-0 group w-full text-left">\n            <i className="fa-solid fa-gear',
        '<button onClick={() => setCurrentView(\'settings\')} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition flex-shrink-0 group w-full text-left ${currentView === \'settings\' ? \'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary\' : \'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white\'}`}>\n            <i className="fa-solid fa-gear'
    )

with open('src/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated dashboard page')
