
// Security Fix: XSS Prevention
window.escapeHTML = function(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signInWithCustomToken, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function callGemini(prompt, systemInstruction) {
    try {
        let token = "";
        if (window.auth && window.auth.currentUser) {
            token = await window.auth.currentUser.getIdToken();
        }

        const response = await fetch('/api/chat', { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }, 
            body: JSON.stringify({ prompt, systemInstruction }) 
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            let errMsg = typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : data.error;
            return "የ API ስህተት: " + (errMsg || "ያልታወቀ ስህተት አጋጥሟል (Vercel Backend Error)");
        }

        let cleanResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (cleanResponse) return cleanResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        return "ምላሽ የለም";

    } catch (err) { 
        return "የቴክኒክ ችግር (Network Error): እባክዎ ኢንተርኔትዎን ያረጋግጡ።";
    }
}

window.processAiChat = async function(inputId, chatContainerId) {
    const inputElem = document.getElementById(inputId);
    if(!inputElem) return;
    const input = inputElem.value.trim();
    if(!input) return;
    
    const chat = document.getElementById(chatContainerId);
    inputElem.value = '';
    
    if(chat) {
        chat.innerHTML += `<div class="self-end max-w-[85%] bg-primary text-dark font-medium p-3 rounded-2xl rounded-tr-none shadow-sm">${input}</div>`;
        chat.scrollTop = chat.scrollHeight;

        const loadingId = 'loading-' + Date.now();
        chat.innerHTML += `<div id="${loadingId}" class="self-start max-w-[85%] bg-gray-100 dark:bg-darkCard p-3 rounded-2xl border-l-4 border-primary leading-relaxed text-gray-800 dark:text-gray-200 text-sm shadow-sm"><i class="fa-solid fa-spinner fa-spin text-secondary"></i> Tsehay AI በማሰብ ላይ ነው...</div>`;
        chat.scrollTop = chat.scrollHeight;

        const systemInst = `አንተ 'Tsehay AI' የተባልክ የ Tsehay Campus (የኢትዮጵያ ምርጡ የኦንላይን መማሪያ ፕላትፎርም) የደንበኞች አገልጋይ ነህ። ለጎብኚዎች እና አዲስ ተማሪዎች ትህትና በተሞላበት፣ ሳቢ እና አበረታች በሆነ የአማርኛ ቋንቋ ምላሽ ስጥ። ማሳሰቢያ፡ አጭር፣ ግልፅ እና ማራኪ አድርገህ መልስ። አሰልቺ ፅሁፍ አታብዛ። ነጥቦችን ለመዘርዘር የኮከብ (*) ምልክት ፈፅሞ አትጠቀም፤ በምትኩ ኢሞጂ (👉, ✅, 💡) ተጠቀም።
You are Tsehay AI, the official intelligent assistant for Tsehay Campus (tsehaycampus.com). You represent Tsehay Digital, a digital marketing agency founded 2 years ago by Eyoub Sahle (ኢዮብ ሳህሌ). Your tone is professional, practical, and mentor-like. You focus on real-world results and encourage users to gain skills through the platform's hands-on courses.

# Greeting Rules
- Keep greetings brief and professional.
- Avoid repeating "Hello" or "Hi" multiple times in a single session.
- Example: "ሰላም! እኔ Tsehay AI ነኝ። በምን ልርዳህ?"

# Key Platform Information
- Founder: Eyoub Sahle (ኢዮብ ሳህሌ). He is the lead instructor for most courses.
- Course Quality: All courses are practical and based on real industry experience.
- Certificates: Recognized digital certificates are provided upon completion.
- Course Types: Both Free and Paid courses are available.

# Payment Methods
If asked about payments, explain the options:
- Local (Ethiopia): All banks, Chapa (Telebirr, CBEbirr, and other wallets).
- International: PayPal, Credit Cards (Visa, Mastercard).
- Cryptocurrency: Payments via crypto are also accepted.

# Course Recommendations
Suggest courses based on user interest:
- Digital Marketing Agency: Recommend the "Digital Marketing" course.
- Business/Side Hustle: Recommend the "Importing from China to Ethiopia" course.
- General Learning: Suggest starting with free courses to experience the teaching quality.

# Usage Limits & Registration
- You may answer up to 5 questions for a user.
- After 5 questions, inform the user that to continue getting expert advice and access to courses, they must register on tsehaycampus.com.
- Emphasize that registration is completely free, requires no card attachment, and provides immediate access to free training and the full platform experience.

# Language
Primary language: Amharic (using Ethiopic script). Use English terms for technical or marketing concepts where appropriate. Always be polite and helpful.`;
        
        const responseText = await callGemini(input, systemInst);
        const loadEl = document.getElementById(loadingId);
        
        if(loadEl) {
            if(responseText.includes("የ API ስህተት:") || responseText.includes("የቴክኒክ ችግር")) {
                 loadEl.innerHTML = `<span class="text-danger font-bold text-[13px] leading-relaxed"><i class="fa-solid fa-triangle-exclamation"></i> ${responseText}</span>`;
                 loadEl.className = "bg-red-50 dark:bg-red-900/30 p-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] self-start text-danger";
            } else {
                 loadEl.innerHTML = responseText.replace(/\n/g, '<br>');
            }
        }
        chat.scrollTop = chat.scrollHeight;
    }
};

window.askAiLanding = function() { window.processAiChat('ai-landing-input', 'ai-landing-chat'); };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'tsehaycampus-e1a6d';

try {
    const firebaseConfig = {
        apiKey: "AIzaSyDCxlwfYAS_I0D7c-8e-iB-Y-Rh2ZZoHZw",
        authDomain: (typeof window !== 'undefined' && window.location.hostname.includes('tsehaycampus.com')) ? window.location.hostname : "tsehaycampus-e1a6d.firebaseapp.com",
        projectId: "tsehaycampus-e1a6d",
        storageBucket: "tsehaycampus-e1a6d.firebasestorage.app",
        messagingSenderId: "1043616909865",
        appId: "1:1043616909865:web:9ecca7d9a14deef0f5ea38",
        measurementId: "G-6WWL8RFCV2"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const fetchPublicCourses = () => {
        const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'tsehaycampus-e1a6d';
        const coursesCol = collection(db, 'artifacts', currentAppId, 'public', 'data', 'courses');
        
        onSnapshot(coursesCol, (snapshot) => {
            if (window.allFetchedCourses !== undefined) window.allFetchedCourses = [];
            const listUi = document.getElementById('courseList');
            const noCourseMsg = document.getElementById('noCourseMessage');
            if (listUi) listUi.innerHTML = '';
            
            if (snapshot.empty) {
                if(listUi) listUi.innerHTML = '<p class="col-span-full text-center text-gray-400 font-bold">እስካሁን ምንም ኮርስ አልተጨመረም!</p>';
                if(noCourseMsg) noCourseMsg.classList.add('hidden');
                return;
            }
            
            let count = 0;
            snapshot.forEach(docSnap => {
                const c = docSnap.data();
                c.id = docSnap.id;
                
                const cStatus = c.status ? c.status.trim().toLowerCase() : 'active';
                if (cStatus === 'draft') return;
                
                if (window.allFetchedCourses !== undefined) window.allFetchedCourses.push(c);
                
                if (!listUi || count >= 8) return;
                count++;

                let isFree = c.price == 0 || !c.price;
                let priceText = isFree ? 'ነፃ (Free)' : `${Number(c.price).toLocaleString()} ብር`;
                let btnText = isFree ? 'በነፃ ጀምር' : 'ኮርሱን ግዛ';
                let btnClass = isFree ? 'bg-success text-white hover:bg-green-600' : 'bg-primary text-dark hover:bg-yellow-400';
                let shortDesc = c.desc ? c.desc : 'ስለዚህ ኮርስ ተጨማሪ ማብራሪያ ለማግኘት ይመልከቱ...';
                let durationInfo = c.duration || '00:00:00';
                let lessonsCount = c.lessons ? c.lessons.length : 0;
                
                let badgeHTML = isFree 
                    ? `<div class="absolute top-3 right-3 bg-success text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-md z-10 animate-pulse"><i class="fa-solid fa-gift mr-1"></i> ነፃ ኮርስ</div>` 
                    : `<div class="absolute top-3 right-3 bg-primary text-dark text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-md z-10"><i class="fa-solid fa-star mr-1"></i> ፕሪሚየም</div>`;
                    
                let oldPriceHtml = (!isFree && c.oldPrice) ? `<span class="text-xs text-gray-400 line-through font-bold ml-2">${Number(c.oldPrice).toLocaleString()} ብር</span>` : '';
                
                let levelText = c.level || 'ጀማሪ';

                listUi.innerHTML += `
                    <div class="course-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-darkCard" onclick="window.requireAuthAndNavigate('courses.html')">
                        <div class="relative overflow-hidden h-48 bg-gray-100 dark:bg-dark">
                            ${badgeHTML}
                            <img src="${window.getSafeImageUrl ? window.getSafeImageUrl(c.image) : c.image}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='logo.png'">
                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-500"></div>
                        </div>
                        <div class="p-6 flex flex-col flex-1">
                            <h3 class="font-black text-dark dark:text-white text-lg leading-snug mb-1 font-heading line-clamp-2">${window.escapeHTML(c.title)}</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-bold mb-3"><i class="fa-solid fa-user-tie text-secondary dark:text-primary"></i> <span class="notranslate">${window.escapeHTML(c.instructor || 'Tsehay Campus')}</span></p>
                            
                            <p class="text-[14px] text-gray-600 dark:text-gray-300 font-body mb-5 line-clamp-3 leading-relaxed">${window.escapeHTML(shortDesc)}</p>
                            
                            <div class="flex flex-wrap items-center gap-2 mb-5 mt-auto">
                                <span class="bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5"><i class="fa-regular fa-clock text-secondary dark:text-primary"></i> ${durationInfo}</span>
                                <span class="bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5"><i class="fa-solid fa-list-ul text-primary"></i> ${lessonsCount} ክፍሎች</span>
                                <span class="bg-gray-50 dark:bg-dark border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5"><i class="fa-solid fa-signal text-warning"></i> ${levelText}</span>
                            </div>

                            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div class="flex items-center">
                                    <span class="font-black text-xl ${isFree ? 'text-success' : 'text-dark dark:text-white'}">${priceText}</span>
                                    ${oldPriceHtml}
                                </div>
                                <button class="${btnClass} px-5 py-2.5 rounded-xl font-bold text-sm transition duration-300 shadow-sm">${btnText} <i class="fa-solid fa-arrow-right ml-1"></i></button>
                            </div>
                        </div>
                    </div>`;
            });
            
            if(count === 0) {
                if(listUi) listUi.innerHTML = '';
                if(noCourseMsg) {
                    noCourseMsg.classList.remove('hidden');
                } else if(listUi) {
                    listUi.innerHTML = '<p class="col-span-full text-center text-gray-400 font-bold">እስካሁን ምንም ኮርስ አልተጨመረም!</p>';
                }
            } else {
                if(noCourseMsg) noCourseMsg.classList.add('hidden');
            }
        }, (error) => {
            console.error("Courses fetch error:", error);
            const listUi = document.getElementById('courseList');
            if(listUi) listUi.innerHTML = `<p class="col-span-full text-center text-danger font-bold">ኮርሶችን ማምጣት አልተቻለም። ስህተት: ${error.message || 'Unknown error'}</p>`;
        });
    };

    fetchPublicCourses();
    
    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } 
        } catch (err) { console.error("Auth init error:", err); }
    };
    initAuth();

    window.logoutUser = async () => {
        await signOut(auth);
        window.location.reload();
    };

    onAuthStateChanged(auth, (user) => {
        window.currentUser = user;
        const heroBtns = document.getElementById('hero-action-buttons');
        const navAuthBtns = document.getElementById('nav-auth-buttons');
        const heroWelcome = document.getElementById('hero-welcome');
        const isDark = document.documentElement.classList.contains('dark');
        const themeIcon = isDark ? 'fa-sun' : 'fa-moon';
        const themeColor = isDark ? 'text-yellow-400' : 'text-gray-600';

        if (user && !user.isAnonymous) {
            const name = user.displayName || "የካምፓስ ተማሪ";
            const email = user.email || 'No Email';
            const photo = user.photoURL || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(name)}&background=3268BA&color=fff\`;

            if (heroWelcome) heroWelcome.innerHTML = \`ሰላም <span class="notranslate">\${name}</span>! 👋 <br> <span class="text-gradient">ትምህርትዎን ይቀጥሉ።</span>\`;

            if (heroBtns) {
                heroBtns.innerHTML = \`
                    <button onclick="document.getElementById('courses').scrollIntoView({behavior: 'smooth'})" class="bg-primary text-dark px-6 py-3.5 rounded-xl font-extrabold transition btn-glow flex items-center justify-center gap-3 text-base shadow-md">
                        ኮርሶችን ያስሱ <i class="fa-solid fa-arrow-right"></i>
                    </button>
                    <button onclick="document.getElementById('about').scrollIntoView({behavior: 'smooth'})" class="bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 border border-white/30 text-dark dark:text-white backdrop-blur-md px-6 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-3 text-base shadow-sm">
                        <i class="fa-solid fa-circle-play text-lg"></i> ስለ እኛ ይመልከቱ
                    </button>
                \`;
            }
            if (navAuthBtns) {
                navAuthBtns.innerHTML = \`
                    <button onclick="window.toggleLanguage()" id="lang-toggle-btn" class="hidden sm:flex items-center justify-center bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 transition shadow-sm shrink-0 font-bold text-[12px] text-dark dark:text-white px-4 py-1.5 rounded-full notranslate" translate="no">
                        \${localStorage.getItem('siteLang') === 'en' ? 'EN' : 'አማ'}
                    </button>

                    <button onclick="window.toggleTheme()" class="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-darkCard transition shadow-sm \${themeColor}">
                        <i id="theme-icon" class="fa-solid \${themeIcon}"></i>
                    </button>
                    
                    <a href="#ai-feature" onclick="document.getElementById('ai-feature').scrollIntoView({behavior: 'smooth'})" class="text-gray-700 dark:text-gray-300 hover:text-secondary dark:hover:text-primary font-bold transition flex items-center gap-1.5 lg:gap-2 px-1 lg:px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkCard whitespace-nowrap ml-1 notranslate">
                        <i class="fa-solid fa-wand-magic-sparkles text-primary animate-pulse"></i> <span class="hidden lg:inline">Tsehay AI</span>
                    </a>
                    <div class="h-5 w-px bg-gray-300 dark:bg-gray-800 mx-0.5 lg:mx-1"></div>
                    
                    <!-- 💡 Profile Dropdown Container -->
                    <div class="relative group z-50">
                        <button class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-xl transition cursor-pointer">
                            <img src="\${photo}" alt="Profile" class="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm">
                            <span class="text-dark dark:text-white font-bold text-sm hidden sm:block notranslate" translate="no">\${name}</span>
                            <i class="fa-solid fa-chevron-down text-[10px] text-gray-400 hidden sm:block"></i>
                        </button>
                        
                        <!-- Dropdown Menu -->
                        <div class="absolute right-0 mt-2 w-60 bg-white dark:bg-darkCard rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 overflow-hidden">
                            <div class="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-black/30">
                                <p class="text-sm font-black text-dark dark:text-white truncate notranslate" translate="no">\${name}</p>
                                <p class="text-xs text-gray-500 truncate mt-1 font-medium">\${email}</p>
                            </div>
                            <div class="p-2 flex flex-col gap-1">
                            <button onclick="window.goToDashboard()" class="text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-secondary dark:hover:text-primary rounded-xl transition flex items-center gap-3">
                                <i class="fa-solid fa-border-all w-4 text-center"></i> ሁሉም ኮርሶች
                            </button>
                            <button onclick="window.logoutUser()" class="text-left px-4 py-3 text-sm font-bold text-danger hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition flex items-center gap-3">
                                <i class="fa-solid fa-power-off w-4 text-center"></i> ውጣ (Logout)
                            </button>
                        </div>
                    </div>
                </div>
                        </div>
                    </div>
                \`;
            }
        } else {
            if (heroWelcome) heroWelcome.innerHTML = \`ክህሎትዎን ያሳድጉ፣ <br> <span class="text-gradient">ቢዝነስዎን ይጀምሩ።</span>\`;

            if (heroBtns) {
                heroBtns.innerHTML = \`
                    <button onclick="document.getElementById('courses').scrollIntoView({behavior: 'smooth'})" class="bg-primary text-dark px-6 py-3.5 rounded-xl font-extrabold transition btn-glow flex items-center justify-center gap-3 text-base shadow-md">
                        ወደ ሁሉም ኮርሶች <i class="fa-solid fa-arrow-right"></i>
                    </button>
                    <button onclick="document.getElementById('about').scrollIntoView({behavior: 'smooth'})" class="bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 border border-white/30 text-dark dark:text-white backdrop-blur-md px-6 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-3 text-base shadow-sm">
                        <i class="fa-solid fa-circle-play text-lg"></i> ስለ እኛ ይመልከቱ
                    </button>
                \`;
            }
            if (navAuthBtns) {
                navAuthBtns.innerHTML = \`
                    <button onclick="window.toggleLanguage()" id="lang-toggle-btn" class="hidden sm:flex items-center justify-center bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 transition shadow-sm shrink-0 font-bold text-[12px] text-dark dark:text-white px-4 py-1.5 rounded-full notranslate" translate="no">
                        \${localStorage.getItem('siteLang') === 'en' ? 'EN' : 'አማ'}
                    </button>

                    <button onclick="window.toggleTheme()" class="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-darkCard transition shadow-sm \${themeColor}">
                        <i id="theme-icon" class="fa-solid \${themeIcon}"></i>
                    </button>
                    
                    <a href="#ai-feature" onclick="document.getElementById('ai-feature').scrollIntoView({behavior: 'smooth'})" class="text-gray-700 dark:text-gray-300 hover:text-secondary dark:hover:text-primary font-bold transition flex items-center gap-1.5 lg:gap-2 px-1 lg:px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkCard whitespace-nowrap ml-1 notranslate">
                        <i class="fa-solid fa-wand-magic-sparkles text-primary animate-pulse"></i> <span class="hidden lg:inline">Tsehay AI</span>
                    </a>
                    <div class="h-5 w-px bg-gray-300 dark:bg-gray-800 mx-0.5"></div>
                    <button onclick="window.openAuthModal(false)" class="text-dark dark:text-white font-bold hover:text-secondary dark:hover:text-primary transition px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkCard whitespace-nowrap">ግባ (Login)</button>
                    <button onclick="window.openAuthModal(true)" class="bg-dark dark:bg-primary text-white dark:text-dark px-4 py-2 rounded-lg font-bold hover:bg-secondary dark:hover:bg-yellow-400 transition shadow-md btn-glow whitespace-nowrap">አዲስ ይመዝገቡ</button>
                \`;
            }
        }
        
        const savedLang = localStorage.getItem('siteLang') || 'am';
        window.updateLangButtons(savedLang);
    });

    window.loginWithGoogle = async function() {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) errorDiv.classList.add('hidden');
        const provider = new GoogleAuthProvider();
        try { 
            const result = await signInWithPopup(auth, provider);
            const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'tsehaycampus-e1a6d';
            const userRef = doc(db, 'artifacts', currentAppId, 'users', result.user.uid, 'profile', 'info');
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists() && docSnap.data().phone) {
                await setDoc(userRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
                if(window.goToDashboard) window.goToDashboard();
                else window.location.reload();
            } else {
                await signOut(auth);
                if (errorDiv) {
                    errorDiv.innerHTML = "በዚህ አካውንት የተመዘገበ መረጃ የለም! እባክዎ መጀመሪያ መረጃዎን ሞልተው አዲስ ይመዝገቡ (Sign Up)።";
                    errorDiv.classList.remove('hidden');
                    errorDiv.className = "bg-warning/20 text-warning border border-warning text-sm p-3 rounded-lg mb-5 font-bold text-center";
                }
                if(window.openAuthModal) window.openAuthModal(true);
            }
        } 
        catch (error) { 
            if(errorDiv) { 
                errorDiv.innerText = "ስህተት: " + 'የቴክኒክ ችግር አጋጥሟል! እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።'; 
                errorDiv.classList.remove('hidden'); 
                errorDiv.className = "bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 text-sm p-3 rounded-lg mb-5 font-bold text-center";
            } 
        }
    };

    window.resetPassword = async function() {
        const errorDiv = document.getElementById('auth-error');
        let emailInput = document.getElementById('auth-email');
        let email = emailInput ? emailInput.value.trim() : '';
        
        if (!email) {
            email = prompt("እባክዎ የተመዘገቡበትን ኢሜል ያስገቡ (Enter your registered email):");
            if (!email || !email.trim()) return;
            email = email.trim();
            if(emailInput) emailInput.value = email;
        }
        
        try {
            await sendPasswordResetEmail(auth, email);
            if (errorDiv) {
                errorDiv.innerHTML = \`<i class="fa-solid fa-circle-check"></i> የይለፍ ቃል መቀየሪያ ሊንክ ወደ <b>\${email}</b> ተልኳል! እባክዎ ኢሜልዎን ይክፈቱ።\`;
                errorDiv.classList.remove('hidden');
                errorDiv.className = "bg-success/20 text-success border border-success/50 text-sm p-3 rounded-lg mb-5 font-bold text-center";
            }
        } catch (error) {
            if (errorDiv) {
                errorDiv.innerText = "ስህተት: " + (error.code === 'auth/user-not-found' ? "ይህ ኢሜል አልተመዘገበም።" : 'የቴክኒክ ችግር አጋጥሟል! እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።');
                errorDiv.classList.remove('hidden');
                errorDiv.className = "bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 text-sm p-3 rounded-lg mb-5 font-bold text-center";
            }
        }
    };

    window.handleAuthSubmit = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('auth-submit-btn');
        const errorDiv = document.getElementById('auth-error');
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        
        const phone = document.getElementById('auth-phone') ? document.getElementById('auth-phone').value.trim() : '';
        const city = document.getElementById('auth-city') ? document.getElementById('auth-city').value.trim() : '';
        const source = document.getElementById('auth-source') ? document.getElementById('auth-source').value : '';
        const nameElem = document.getElementById('auth-name');
        const name = nameElem ? nameElem.value.trim() : '';

        if (window.isSignupMode) {
            const termsBox = document.getElementById('auth-terms');
            if (termsBox && !termsBox.checked) {
                if(errorDiv) {
                    errorDiv.innerText = "እባክዎ ለመመዝገብ መጀመሪያ 'የአጠቃቀም ህግ' የሚለውን ነክተው በማንበብ ይስማሙ!";
                    errorDiv.classList.remove('hidden');
                    errorDiv.className = "bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 text-sm p-3 rounded-lg mb-5 font-bold text-center";
                }
                return;
            }

            if(!name || !phone || !city || !source) {
                if(errorDiv) {
                    errorDiv.innerText = "እባክዎ ሁሉንም መረጃዎች (ስም፣ ስልክ፣ ከተማ...) በትክክል ይሙሉ!";
                    errorDiv.classList.remove('hidden');
                    errorDiv.className = "bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 text-sm p-3 rounded-lg mb-5 font-bold text-center";
                }
                return;
            }
        }

        if(btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ይጠብቁ...';
        }

        try {
            if (window.isSignupMode) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(cred.user, { displayName: name });

                const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'tsehaycampus-e1a6d';
                await setDoc(doc(db, 'artifacts', currentAppId, 'users', cred.user.uid, 'profile', 'info'), {
                    displayName: name,
                    email: email,
                    phone: phone,
                    city: city,
                    heardFrom: source,
                    registeredAt: new Date().toISOString()
                }, { merge: true });

            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            window.goToDashboard();
        } catch (error) {
            let errorMsg = "ስህተት: " + 'የቴክኒክ ችግር አጋጥሟል! እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።';
            
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMsg = "ኢሜል ወይም የይለፍ ቃል ትክክል አይደለም!";
            } else if (error.code === 'auth/email-already-in-use') {
                errorMsg = "ይህ ኢሜል ከዚህ በፊት ተመዝግቧል።";
            } else if (error.code === 'auth/weak-password') {
                errorMsg = "የይለፍ ቃሉ ቢያንስ 6 ፊደል/ቁጥር መሆን አለበት።";
            }

            if (error.message.includes('identity-toolkit-api') || error.code === 'auth/operation-not-allowed') {
                errorDiv.className = "bg-warning/20 text-warning border border-warning/50 text-sm p-4 rounded-xl mb-6 font-bold text-center";
                errorDiv.innerHTML = 'ማሳሰቢያ፡ የ Canvas የሙከራ ገፅ ላይ ስለሆኑ በቀጥታ እያስገባንዎት ነው...';
                errorDiv.classList.remove('hidden');
                setTimeout(() => { window.goToDashboard(); }, 2000);
                return;
            }
            
            if(errorDiv) {
                errorDiv.innerText = errorMsg;
                errorDiv.classList.remove('hidden');
                errorDiv.className = "bg-red-50 dark:bg-red-900/30 text-danger border border-red-200 dark:border-red-800 text-sm p-3 rounded-lg mb-5 font-bold text-center";
            }
        } finally {
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = window.isSignupMode ? '<span>አዲስ ይመዝገቡ</span> <i class="fa-solid fa-arrow-right"></i>' : '<span>ግባ (Login)</span> <i class="fa-solid fa-arrow-right"></i>';
            }
        }
    };
    
} catch (err) {
    console.error("Firebase module error:", err);
}
