'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
    const { t, lang } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const [isFooterVisible, setIsFooterVisible] = React.useState(false);
    const footerRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        const el = footerRef.current;
        if (!el) return;

        const checkVisibility = () => {
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            if (rect.top < vh - 20 && rect.bottom > 20) {
                setIsFooterVisible(true);
            } else if (rect.top > vh + 50 || rect.bottom < -50) {
                setIsFooterVisible(false);
            }
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setIsFooterVisible(true);
                } else {
                    const rect = entry.boundingClientRect;
                    if (rect.top > window.innerHeight + 50 || rect.bottom < -50) {
                        setIsFooterVisible(false);
                    }
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px -20px 0px'
        });

        observer.observe(el);
        checkVisibility();

        window.addEventListener('scroll', checkVisibility, { passive: true });
        window.addEventListener('resize', checkVisibility, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', checkVisibility);
            window.removeEventListener('resize', checkVisibility);
        };
    }, []);

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
        <footer 
            ref={footerRef}
            id="footer" 
            className={`bg-[#030509] text-gray-300 font-body relative overflow-hidden mt-auto border-t border-[#f9b03c]/15 select-none ${isFooterVisible ? 'footer-cascade-active' : ''}`}
        >
            {/* Top Subtle Luxury Line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#f9b03c]/40 to-transparent"></div>
            
            {/* Subtle Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#f9b03c]/5 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#3268ba]/5 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-10 relative z-10">
                {/* Main 4-Column Grid with Sequential Cascading / Ripple Entrance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12 sm:mb-14">
                    
                    {/* Column 1: Brand & Socials (5 Cols) - Cascade 1 */}
                    <div className="footer-cascade-col footer-delay-1 lg:col-span-5 flex flex-col justify-between">
                        <div>
                            {/* Logo & Name with 360 Rotation on Hover */}
                            <Link 
                                href="/" 
                                onClick={() => { if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                className="inline-flex items-center gap-3 cursor-pointer mb-5 group"
                            >
                                <div className="p-1 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg group-hover:border-[#f9b03c]/50 group-hover:scale-105 transition-all duration-300">
                                    <img 
                                        src="/tc-logo.jpg" 
                                        alt="Tsehay Campus Logo" 
                                        className="h-10 w-10 object-contain rounded-lg footer-logo-rotate" 
                                        onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TC&background=030509&color=f9b03c'; }} 
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

                            {/* Subtext */}
                            <p className="text-[#a0aec0] text-sm leading-relaxed mb-6 max-w-md">
                                በ AI የታገዘ የኦንላይን እና የፊት ለፊት ተግባራዊ የክህሎት ስልጠናዎችን በመስጠት ቀዳሚ የኢ-ለርኒንግ መድረክ።
                            </p>
                        </div>

                        {/* Minimalist Social Media Icons (Magnetic Hover Pull & Golden Glow) */}
                        <div className="flex items-center gap-3 pt-2">
                            <a 
                                href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="YouTube"
                                className="footer-social-magnetic w-9 h-9 rounded-full bg-white/[0.04] hover:bg-[#f9b03c]/10 text-gray-400 hover:text-[#f9b03c] border border-white/[0.08] flex items-center justify-center shadow-sm"
                                title="YouTube"
                            >
                                <i className="fa-brands fa-youtube text-sm"></i>
                            </a>
                            <a 
                                href="https://t.me/TsehayTeam" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="Telegram"
                                className="footer-social-magnetic w-9 h-9 rounded-full bg-white/[0.04] hover:bg-[#f9b03c]/10 text-gray-400 hover:text-[#f9b03c] border border-white/[0.08] flex items-center justify-center shadow-sm"
                                title="Telegram"
                            >
                                <i className="fa-brands fa-telegram text-sm"></i>
                            </a>
                            <a 
                                href="https://tiktok.com/@eyoubsahle" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="TikTok"
                                className="footer-social-magnetic w-9 h-9 rounded-full bg-white/[0.04] hover:bg-[#f9b03c]/10 text-gray-400 hover:text-[#f9b03c] border border-white/[0.08] flex items-center justify-center shadow-sm"
                                title="TikTok"
                            >
                                <i className="fa-brands fa-tiktok text-sm"></i>
                            </a>
                            <a 
                                href="https://wa.me/251980209090" 
                                target="_blank" 
                                rel="noreferrer" 
                                aria-label="WhatsApp"
                                className="footer-social-magnetic w-9 h-9 rounded-full bg-white/[0.04] hover:bg-[#f9b03c]/10 text-gray-400 hover:text-[#f9b03c] border border-white/[0.08] flex items-center justify-center shadow-sm"
                                title="WhatsApp"
                            >
                                <i className="fa-brands fa-whatsapp text-sm"></i>
                            </a>
                            <a 
                                href="tel:0980209090" 
                                aria-label="Phone"
                                className="footer-social-magnetic w-9 h-9 rounded-full bg-white/[0.04] hover:bg-[#f9b03c]/10 text-gray-400 hover:text-[#f9b03c] border border-white/[0.08] flex items-center justify-center shadow-sm"
                                title="ስልክ ይደውሉ"
                            >
                                <i className="fa-solid fa-phone text-xs"></i>
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Quick Links - ፈጣን ማውጫ (3 Cols) - Cascade 2 */}
                    <div className="footer-cascade-col footer-delay-2 lg:col-span-3">
                        <h4 className="text-white font-semibold font-heading text-base mb-5 relative inline-block after:content-[''] after:block after:w-8 after:h-[2px] after:bg-[#f9b03c] after:mt-1.5">
                            {lang === 'am' ? 'ፈጣን ማውጫ' : 'Quick Links'}
                        </h4>
                        <ul className="space-y-3 text-sm text-[#a0aec0]">
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer">
                                    <span>የ Shein ገቢ ንግድ</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer">
                                    <span>ዲጂታል ማርኬቲንግ</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer">
                                    <span>ዌብ ዴቨሎፕመንት</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer">
                                    <span>የክሪፕቶ ግብይት</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer">
                                    <span>ስለ እኛ</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Support & Legal - ድጋፍ እና ህግ (2 Cols) - Cascade 3 */}
                    <div className="footer-cascade-col footer-delay-3 lg:col-span-2">
                        <h4 className="text-white font-semibold font-heading text-base mb-5 relative inline-block after:content-[''] after:block after:w-8 after:h-[2px] after:bg-[#f9b03c] after:mt-1.5">
                            {lang === 'am' ? 'ድጋፍ እና ህግ' : 'Support & Legal'}
                        </h4>
                        <ul className="space-y-3 text-sm text-[#a0aec0]">
                            <li>
                                <button 
                                    type="button" 
                                    onClick={() => navigateToSection('faq')} 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer text-left"
                                >
                                    <span>ተደጋጋሚ ጥያቄዎች (FAQ)</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    type="button" 
                                    onClick={() => { window.dispatchEvent(new Event('open-terms-modal')); }} 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer text-left"
                                >
                                    <span>የአጠቃቀም ህግ (Terms)</span>
                                </button>
                            </li>
                            <li>
                                <button 
                                    type="button" 
                                    onClick={() => { window.dispatchEvent(new Event('open-terms-modal')); }} 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2 group cursor-pointer text-left"
                                >
                                    <span>የግላዊነት ፖሊሲ (Privacy)</span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Contact & Address - አድራሻ እና ግንኙነት (2 Cols) - Cascade 4 */}
                    <div className="footer-cascade-col footer-delay-4 lg:col-span-2">
                        <h4 className="text-white font-semibold font-heading text-base mb-5 relative inline-block after:content-[''] after:block after:w-8 after:h-[2px] after:bg-[#f9b03c] after:mt-1.5">
                            {lang === 'am' ? 'አድራሻ እና ግንኙነት' : 'Contact & Address'}
                        </h4>
                        <ul className="space-y-3 text-xs text-[#a0aec0]">
                            <li>
                                <a 
                                    href="https://maps.app.goo.gl/SJxFzEx3gAWNJRy68" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-start gap-2"
                                >
                                    <span>📍</span>
                                    <span>ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="tel:0980209090" 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2"
                                >
                                    <span>📞</span>
                                    <span>0980209090</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="https://t.me/TsehayTeam" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2"
                                >
                                    <span>💬</span>
                                    <span>@TsehayTeam</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="mailto:info@tsehaycampus.com" 
                                    className="hover:text-[#f9b03c] hover:translate-x-1 transition-all duration-200 flex items-center gap-2"
                                >
                                    <span>✉️</span>
                                    <span>info@tsehaycampus.com</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar: Copyright & Powered By Tsehay Digital - Cascade 5 */}
                <div className="footer-cascade-col footer-delay-5 border-t border-white/[0.08] pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
                    <div className="text-center sm:text-left">
                        <p>© 2026 <span className="notranslate text-gray-200 font-bold" translate="no">Tsehay Campus</span>. መብቱ በህግ የተጠበቀ ነው።</p>
                    </div>

                    {/* Luxury Powered By Badge */}
                    <div className="flex items-center gap-2.5 font-bold uppercase tracking-widest text-[11px]">
                        <a 
                            href="https://tsehay360.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#f9b03c]/50 hover:bg-white/[0.06] transition-all duration-300 shadow-md hover:shadow-[0_0_20px_rgba(249,176,60,0.2)] hover:scale-105 group cursor-pointer"
                            title="Tsehay Digital"
                        >
                            <img 
                                src="/tsehay-digital-logo.jpg" 
                                alt="Tsehay Digital" 
                                loading="eager"
                                fetchPriority="high"
                                className="h-4.5 w-auto object-contain rounded-sm transition-transform duration-300 group-hover:rotate-12" 
                                onError={(e) => { e.currentTarget.src='/tc-logo.jpg'; }}
                            />
                            <span className="font-black text-[#f9b03c] tracking-wider text-xs">POWERED BY TSEHAY DIGITAL</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

