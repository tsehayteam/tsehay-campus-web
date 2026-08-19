'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
    const { t, lang } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();

    const navigateToSection = (hash: string) => {
        if (pathname === '/') {
            const el = document.getElementById(hash);
            if (el) {
                const offset = 80;
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = el.getBoundingClientRect().top;
                window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
            }
        } else {
            router.push('/#' + hash);
            setTimeout(() => {
                const el = document.getElementById(hash);
                if (el) {
                    const offset = 80;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = el.getBoundingClientRect().top;
                    window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
                }
            }, 350);
        }
    };

    return (
        <footer id="footer" className="bg-[#050810] text-gray-300 font-body relative overflow-hidden mt-auto border-t border-white/10 select-none">
            {/* Top Luxury Gradient Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent opacity-75"></div>
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#f9b03c]/5 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#3268ba]/5 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-10 relative z-10">
                {/* Main 4-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12 sm:mb-14">
                    
                    {/* Column 1: Brand & Socials (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col justify-between">
                        <div>
                            {/* Logo & Name */}
                            <Link 
                                href="/" 
                                onClick={() => { if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                className="inline-flex items-center gap-3 cursor-pointer mb-5 group"
                            >
                                <div className="p-1 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md shadow-lg group-hover:border-[#f9b03c]/50 group-hover:scale-105 transition-all duration-300">
                                    <img 
                                        src="/tc-logo.jpg" 
                                        alt="Tsehay Campus Logo" 
                                        className="h-10 w-10 object-contain rounded-lg" 
                                        onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TC&background=050810&color=f9b03c'; }} 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-heading tracking-tight flex items-center gap-1.5 notranslate" translate="no">
                                        <span className="text-[#f9b03c] font-black text-2xl sm:text-3xl drop-shadow-[0_0_15px_rgba(249,176,60,0.3)]">Tsehay</span>
                                        <span className="text-[#3268ba] font-black text-2xl sm:text-3xl">Campus</span>
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                                        {lang === 'am' ? 'የኦንላይን ትምህርት አካዳሚ' : 'Online Learning Academy'}
                                    </span>
                                </div>
                            </Link>

                            {/* Slogan & Description */}
                            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md">
                                {t('footer_desc') || 'Tsehay Campus በ AI የታገዘ ተግባራዊ የኦንላይን ክህሎት እና የቢዝነስ ስልጠና በመስጠት ተማሪዎችን ወደ ከፍተኛ ገቢ እና ስኬት የሚያደርስ ቀዳሚ ፕላትፎርም ነው።'}
                            </p>
                        </div>

                        {/* Sleek Social Media Icon Row */}
                        <div className="flex items-center gap-3 pt-2">
                            <a 
                                href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="YouTube"
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-500 border border-white/10 hover:border-red-500/40 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                                title="YouTube"
                            >
                                <i className="fa-brands fa-youtube text-base"></i>
                            </a>
                            <a 
                                href="https://t.me/eyoubsahle" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="Telegram"
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#0088cc]/20 text-gray-400 hover:text-[#0088cc] border border-white/10 hover:border-[#0088cc]/40 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                                title="Telegram"
                            >
                                <i className="fa-brands fa-telegram text-base"></i>
                            </a>
                            <a 
                                href="https://tiktok.com/@eyoubsahle" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="TikTok"
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white border border-white/10 hover:border-white/40 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                                title="TikTok"
                            >
                                <i className="fa-brands fa-tiktok text-base"></i>
                            </a>
                            <a 
                                href="https://wa.me/251980209090" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="WhatsApp"
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                                title="WhatsApp"
                            >
                                <i className="fa-brands fa-whatsapp text-base"></i>
                            </a>
                            <a 
                                href="tel:0980209090" 
                                aria-label="Phone"
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#f9b03c]/20 text-gray-400 hover:text-[#f9b03c] border border-white/10 hover:border-[#f9b03c]/40 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                                title="ስልክ ይደውሉ"
                            >
                                <i className="fa-solid fa-phone text-sm"></i>
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Programs & Popular Courses (3 Cols) */}
                    <div className="lg:col-span-3">
                        <h4 className="text-white font-extrabold mb-5 font-heading tracking-wide text-sm sm:text-base flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#f9b03c]"></span>
                            <span>{t('quick_links') || 'ፈጣን ማውጫ'}</span>
                        </h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer">
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_shein') || 'የ Shein ገበያ ንግድ'}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer">
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_digital') || 'ዲጂታል ማርኬቲንግ'}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer">
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_web') || 'ዌብ ዲዛይነሮች'}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer">
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_crypto') || 'የክሪፕቶ ግብይት'}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer">
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('about_us_page') || 'ስለ እኛ'}</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Support & Legal (2 Cols) */}
                    <div className="lg:col-span-2">
                        <h4 className="text-white font-extrabold mb-5 font-heading tracking-wide text-sm sm:text-base flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#3268ba]"></span>
                            <span>{t('contact_us') || 'ድጋፍ እና ህግ'}</span>
                        </h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li>
                                <button 
                                    type="button" 
                                    onClick={() => navigateToSection('faq')} 
                                    className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer text-left"
                                >
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_faq') || 'ተደጋጋሚ ጥያቄዎች (FAQ)'}</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    type="button" 
                                    onClick={() => { window.dispatchEvent(new Event('open-terms-modal')); }} 
                                    className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer text-left"
                                >
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_terms') || 'የአጠቃቀም ህግ (Terms)'}</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    type="button" 
                                    onClick={() => { window.dispatchEvent(new Event('open-terms-modal')); }} 
                                    className="hover:text-[#f9b03c] transition-colors duration-200 flex items-center gap-2 group cursor-pointer text-left"
                                >
                                    <i className="fa-solid fa-chevron-right text-[10px] text-[#f9b03c] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200"></i>
                                    <span className="group-hover:translate-x-1 transition-transform duration-200">{t('link_privacy') || 'የግላዊነት ፖሊሲ (Privacy)'}</span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Contact & Location (2 Cols) */}
                    <div className="lg:col-span-2">
                        <h4 className="text-white font-extrabold mb-5 font-heading tracking-wide text-sm sm:text-base flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>{lang === 'am' ? 'አድራሻ' : 'Contact'}</span>
                        </h4>
                        <ul className="space-y-3.5 text-xs text-gray-400">
                            <li className="flex items-start gap-2.5">
                                <i className="fa-solid fa-location-dot text-[#f9b03c] mt-0.5 shrink-0"></i>
                                <span>አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <i className="fa-solid fa-phone text-[#f9b03c] shrink-0"></i>
                                <a href="tel:0980209090" className="hover:text-white transition">0980209090</a>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <i className="fa-solid fa-envelope text-[#f9b03c] shrink-0"></i>
                                <a href="mailto:info@tsehaycampus.com" className="hover:text-white transition">info@tsehaycampus.com</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar: Copyright & Powered By Tsehay Digital */}
                <div className="border-t border-white/10 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
                    <div className="text-center sm:text-left">
                        <p>&copy; {new Date().getFullYear()} <span className="notranslate text-gray-200 font-bold" translate="no">Tsehay Campus</span>. {t('all_rights_reserved') || 'መብቱ በህግ የተጠበቀ ነው።'}</p>
                    </div>

                    {/* Luxury Powered By Badge */}
                    <div className="flex items-center gap-2.5 font-bold uppercase tracking-widest text-[11px]">
                        <span className="text-gray-400">Powered By</span>
                        <a 
                            href="https://tsehay360.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/15 hover:border-[#f9b03c]/60 hover:bg-white/10 transition-all duration-300 shadow-md hover:shadow-[0_0_20px_rgba(249,176,60,0.3)] hover:scale-105 group cursor-pointer"
                            title="Tsehay Digital"
                        >
                            <img 
                                src="/tsehay-digital-logo.jpg" 
                                alt="Tsehay Digital" 
                                className="h-4.5 w-4.5 object-contain rounded-sm transition-transform duration-300 group-hover:rotate-12" 
                                onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TD&background=050810&color=f9b03c'; }}
                            />
                            <span className="font-black text-[#f9b03c] tracking-wider text-xs">TSEHAY DIGITAL</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
