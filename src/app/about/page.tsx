// @ts-nocheck
'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';

export default function About() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  return (
    <>
    <main>
    <section id="about" className="py-24 relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-dark dark:to-darkCard border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
                <h2 className="font-heading font-black text-4xl sm:text-5xl text-dark dark:text-white mb-4">{t('about_us_page')}</h2>
                <div className="w-20 h-1.5 bg-primary mx-auto rounded-full"></div>
            </div>

            
            <div className="max-w-4xl mx-auto mb-16">
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video flex items-center justify-center group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <iframe id="about-youtube-player" className="w-full h-full relative z-10 rounded-[2rem]" src="https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1&showinfo=0&autoPlay=1&mute=1&vq=hd1080" title="Tsehay Campus Introduction" frameBorder="0" allow="accelerometer; autoPlay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
            </div>

            
            <div className="max-w-4xl mx-auto mb-24">
                <h3 className="text-2xl font-bold font-heading text-primary mb-4">{t('our_story_title')}</h3>
                <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-base mb-4">
                    {t('our_story_p1')}
                </p>
                <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-base mb-8">
                    {t('our_story_p2')}
                </p>
                <div className="flex flex-wrap gap-8">
                    <div>
                        <h4 className="text-3xl font-black text-dark dark:text-white">500+</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 border-l-2 border-primary pl-2">{t('stat_students')}</p>
                    </div>
                    <div>
                        <h4 className="text-3xl font-black text-dark dark:text-white">100%</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 border-l-2 border-secondary pl-2">{t('stat_practical')}</p>
                    </div>
                    <div>
                        <h4 className="text-3xl font-black text-dark dark:text-white">24/7</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 border-l-2 border-success pl-2">{t('stat_ai')}</p>
                    </div>
                </div>
            </div>

            
            <div className="max-w-3xl mx-auto mb-24 text-center">
                <h3 className="text-2xl font-bold font-heading text-primary mb-4">{t('mission_title')}</h3>
                <p className="text-xl sm:text-2xl font-bold text-dark dark:text-white leading-relaxed">
                    {t('mission_desc')}
                </p>
            </div>

            
            <div className="mb-24">
                <h3 className="text-2xl font-bold font-heading text-dark dark:text-white mb-8 text-center">{t('what_we_do_title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer">
                        <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-900/20 text-secondary dark:text-blue-400 rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fa-solid fa-laptop-code"></i></div>
                        <h4 className="font-bold text-dark dark:text-white text-lg mb-2">{t('wwd_1_title')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wwd_1_desc')}</p>
                    </div>
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer">
                        <div className="w-16 h-16 mx-auto bg-orange-50 dark:bg-orange-900/20 text-primary rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fa-solid fa-users-rays"></i></div>
                        <h4 className="font-bold text-dark dark:text-white text-lg mb-2">{t('wwd_2_title')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wwd_2_desc')}</p>
                    </div>
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer">
                        <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/20 text-success rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fa-solid fa-robot"></i></div>
                        <h4 className="font-bold text-dark dark:text-white text-lg mb-2">{t('wwd_3_title')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wwd_3_desc')}</p>
                    </div>
                </div>
            </div>

            
            <div className="mb-24">
                <h3 className="text-2xl font-bold font-heading text-dark dark:text-white mb-8 text-center">{t('our_team_title')}</h3>
                <div className="flex flex-wrap justify-center gap-6">
                    
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer w-full sm:w-64">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                            <img src="/assets/eyob_new2.png" alt="Eyob Sahle" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Eyob+Sahle&background=000000&color=fff&size=128' }} />
                        </div>
                        <h4 className="font-bold text-dark dark:text-white text-lg notranslate">ኢዮብ ሳህሌ</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Founder & Lead Instructor</p>
                    </div>
                    
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer w-full sm:w-64">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800 text-3xl flex items-center justify-center text-white font-bold" >
                            H
                        </div>
                        <h4 className="font-bold text-dark dark:text-white text-lg notranslate">ሀብታሙ ዓለሙ</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">General Manager</p>
                    </div>
                </div>
            </div>

            
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="rounded-3xl overflow-hidden shadow-xl group aspect-[9/16] bg-black relative">
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 group-hover:opacity-0 bg-black/40">
                            <i className="fa-solid fa-hand-pointer text-primary text-4xl mb-3 animate-bounce"></i>
                            <span className="text-white font-bold text-lg drop-shadow-md">Tap To Unmute</span>
                        </div>
                        <video loop muted playsInline className="w-full h-full object-cover group-hover:scale-105 transition duration-700 relative z-10" onMouseOver={(e) => { e.currentTarget.play(); e.currentTarget.muted=false; }} onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.muted=true; }}>
                            <source src="/assets/videos/Tsehay.mp4" type="video/mp4" />
                        </video>
                    </div>
                    <div className="rounded-3xl overflow-hidden shadow-xl group aspect-[9/16] bg-black relative">
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 group-hover:opacity-0 bg-black/40">
                            <i className="fa-solid fa-hand-pointer text-primary text-4xl mb-3 animate-bounce"></i>
                            <span className="text-white font-bold text-lg drop-shadow-md">Tap To Unmute</span>
                        </div>
                        <video loop muted playsInline className="w-full h-full object-cover group-hover:scale-105 transition duration-700 relative z-10" onMouseOver={(e) => { e.currentTarget.play(); e.currentTarget.muted=false; }} onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.muted=true; }}>
                            <source src="/assets/videos/Marketing%20and%20psyco.mp4" type="video/mp4" />
                        </video>
                    </div>
                </div>
                <div className="rounded-3xl overflow-hidden shadow-xl group w-full h-64 md:h-96 bg-black relative">
                    <img src="https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="Team" onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop' }} />
                </div>
            </div>
        </div>
    </section>
    </main>
    </>
  );
}
