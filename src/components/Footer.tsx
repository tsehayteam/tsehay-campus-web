'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
    const { t, lang } = useLanguage();

    return (
        <footer id="footer" className="bg-dark text-gray-300 pt-8 pb-8 font-body border-t-[6px] border-primary mt-auto z-10 relative">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    <div className="lg:col-span-2 pr-4">
                        <Link href="/" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-3 cursor-pointer mb-6 group">
                            <div className="bg-white p-1 rounded-md">
                                <img src="/tc-logo.jpg" alt="Logo" className="h-10 w-auto object-contain rounded-sm" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TC&background=fff&color=0f172a' }} />
                            </div>
                            <span className="font-heading tracking-tight notranslate flex gap-1.5" translate="no">
                                <span className="text-primary font-black text-3xl">Tsehay</span>
                                <span className="text-secondary font-black text-3xl">Campus</span>
                            </span>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4 max-w-sm">
                            <span className="notranslate" translate="no">Tsehay Campus</span> {t('footer_desc')}
                        </p>
                        <div className="mt-4">
                            <a 
                                href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="relative group inline-flex items-center gap-3.5 px-5 py-3.5 bg-gradient-to-r from-red-600 via-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl border border-red-400/40 shadow-lg shadow-red-600/35 hover:shadow-red-600/60 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.03] active:scale-95 cursor-pointer overflow-hidden"
                            >
                                {/* Shimmer glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                                
                                {/* YouTube Icon Box */}
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-white transition-all duration-300 shrink-0">
                                    <i className="fa-brands fa-youtube text-2xl text-white group-hover:text-red-600 transition-colors"></i>
                                </div>

                                <div className="flex flex-col text-left">
                                    <span className="text-[11px] font-bold text-red-100/90 tracking-wide uppercase flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm"></span>
                                        {lang === 'am' ? 'ነፃ ቪዲዮዎች & ሚስጥሮች' : 'Free Lessons & Insights'}
                                    </span>
                                    <span className="text-sm md:text-base font-black text-white tracking-wide font-heading drop-shadow-sm">
                                        {lang === 'am' ? 'የቢዝነስ ሚስጥሮች (YouTube)' : 'Business Secrets (YouTube)'}
                                    </span>
                                </div>

                                <div className="ml-1 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/30 group-hover:translate-x-0.5 transition-all shrink-0">
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-white"></i>
                                </div>
                            </a>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                        <h4 className="text-white font-black mb-5 font-heading tracking-wide text-base border-b-2 border-primary pb-2 inline-block">{t('quick_links')}</h4>
                        <ul className="space-y-3 text-sm">
                            <li><button onClick={() => { document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_shein')}</button></li>
                            <li><button onClick={() => { document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_digital')}</button></li>
                            <li><button onClick={() => { document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_web')}</button></li>
                            <li><button onClick={() => { document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_crypto')}</button></li>
                        </ul>
                    </div>

                    <div className="flex flex-col items-end text-right">
                        <h4 className="text-white font-black mb-5 font-heading tracking-wide text-base border-b-2 border-primary pb-2 inline-block">{t('contact_us')}</h4>
                        <ul className="space-y-3 text-sm text-gray-200">
                            <li><a href="javascript:void(0)" onClick={() => { document.getElementById('faq')?.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-primary transition flex items-center gap-2">{t('link_faq')}</a></li>
                            <li><a href="javascript:void(0)" onClick={() => { window.dispatchEvent(new Event('open-terms-modal')) }} className="hover:text-primary transition flex items-center gap-2">{t('link_terms')}</a></li>
                            <li><a href="javascript:void(0)" onClick={() => { window.dispatchEvent(new Event('open-terms-modal')) }} className="hover:text-primary transition flex items-center gap-2">{t('link_privacy')}</a></li>
                        </ul>
                    </div>
                </div>
                
                <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                    <div className="text-center md:text-left">
                        <p>&copy; 2026 <span className="notranslate" translate="no">Tsehay Campus</span>. {t('all_rights_reserved')}</p>
                        <div className="mt-2.5 flex items-center justify-center md:justify-start gap-2 text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                            <span>Powered By</span>
                            <a 
                                href="https://tsehay360.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 hover:border-primary/50 hover:bg-white/15 transition-all duration-300 shadow-md hover:shadow-primary/20 hover:scale-105 group cursor-pointer"
                                title="Tsehay Digital"
                            >
                                <img 
                                    src="/tsehay-digital-logo.jpg" 
                                    alt="Tsehay Digital" 
                                    className="h-5 w-5 object-contain rounded-sm transition-transform duration-300 group-hover:scale-110" 
                                />
                                <span className="font-black text-amber-400 group-hover:text-primary transition-colors tracking-wider text-xs">TSEHAY DIGITAL</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
