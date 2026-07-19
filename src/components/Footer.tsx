'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
    const { t } = useLanguage();

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
                        <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                            <span className="notranslate" translate="no">Tsehay Campus</span> {t('footer_desc')}
                        </p>
                        <div className="mt-4">
                            <a href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-primary text-white hover:text-dark font-bold rounded-full shadow-lg transition-all transform hover:-translate-y-1">
                                {t('footer_secret_btn')}
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
                            <img src="/tsehay-digital-logo.jpg" alt="Tsehay Digital Logo" className="h-6 w-auto shadow-sm" />
                            <span className="text-primary notranslate" translate="no">Tsehay Digital</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
