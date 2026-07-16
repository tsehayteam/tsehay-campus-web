'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';

export default function AssessmentModal({ onClose, onRecommend }: { onClose: () => void, onRecommend: (courseId: string) => void }) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setStep(3);
    try {
      // Fetch all courses
      const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
      const snap = await getDocs(q);
      const courses = snap.docs.map(doc => ({ id: doc.id, title: doc.data().title, description: doc.data().description, category: doc.data().category }));

      const prompt = `
      A student wants to learn: ${goal}.
      Their current skill level is: ${level}.
      
      Here are the available courses in our catalog:
      ${JSON.stringify(courses)}
      
      Based on this, which course is the absolute best fit for the student?
      If none match perfectly, recommend the closest beginner course.
      
      Return ONLY a raw JSON object (no markdown formatting, no code blocks) with the following keys:
      {
         "recommendedCourseId": "string (the id of the course)",
         "message": "string (a very short encouraging message in Amharic explaining why this course is a good fit)"
      }
      `;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt,
          systemInstruction: "You are a Tsehay AI Learning Advisor. Always return valid JSON only. Do NOT format as markdown." 
        })
      });

      const data = await response.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      // Parse the JSON (clean up any markdown if gemini stubbornly returns it)
      const cleanJsonStr = aiReply.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJsonStr);
      
      setRecommendation({
         courseId: result.recommendedCourseId,
         message: result.message
      });
      setIsAnalyzing(false);
      setStep(4);
    } catch (e) {
      console.error(e);
      setRecommendation({
         message: "ይቅርታ፣ አሁን ላይ ትክክለኛውን ኮርስ መምረጥ አልቻልኩም። እባክዎ ኮርሶቹን ራስዎ ይጎብኙ።"
      });
      setIsAnalyzing(false);
      setStep(4);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="bg-white dark:bg-darkCard w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-[modalPop_0.3s_ease-out_forwards] border border-gray-100 dark:border-gray-800">
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-dark">
                <h3 className="font-black text-xl font-heading dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-robot text-primary"></i> Tsehay AI - የትምህርት መሪ
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-danger transition text-xl">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div className="p-8">
                {step === 1 && (
                    <div>
                        <h4 className="text-lg font-bold text-dark dark:text-white mb-4">ምን መማር ይፈልጋሉ? (What is your goal?)</h4>
                        <div className="space-y-3">
                            {['Web Development', 'Mobile App Development', 'Digital Marketing', 'Graphic Design', 'Video Editing'].map(opt => (
                                <button key={opt} onClick={() => { setGoal(opt); setStep(2); }} className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-blue-50 dark:hover:bg-primary/10 transition font-bold text-gray-700 dark:text-gray-300">
                                    {opt}
                                </button>
                            ))}
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-xs text-gray-500 mb-2">ሌላ ፍላጎት ካለዎት ይፃፉ፦</p>
                                <input type="text" placeholder="የእርስዎን ፍላጎት ያስገቡ..." className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-primary" onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setGoal(e.currentTarget.value);
                                        setStep(2);
                                    }
                                }}/>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h4 className="text-lg font-bold text-dark dark:text-white mb-4">በዚህ ዘርፍ ያለዎት እውቀት ምን ያህል ነው?</h4>
                        <div className="space-y-3">
                            <button onClick={() => { setLevel('Beginner (ጀማሪ)'); handleAnalyze(); }} className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-blue-50 dark:hover:bg-primary/10 transition">
                                <p className="font-bold text-gray-700 dark:text-gray-300">ጀማሪ (Beginner)</p>
                                <p className="text-xs text-gray-500">ምንም የቀድሞ እውቀት የለኝም</p>
                            </button>
                            <button onClick={() => { setLevel('Intermediate (መካከለኛ)'); handleAnalyze(); }} className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-blue-50 dark:hover:bg-primary/10 transition">
                                <p className="font-bold text-gray-700 dark:text-gray-300">መካከለኛ (Intermediate)</p>
                                <p className="text-xs text-gray-500">መሰረታዊ ነገሮችን አውቃለሁ</p>
                            </button>
                            <button onClick={() => { setLevel('Advanced (የላቀ)'); handleAnalyze(); }} className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-blue-50 dark:hover:bg-primary/10 transition">
                                <p className="font-bold text-gray-700 dark:text-gray-300">የላቀ (Advanced)</p>
                                <p className="text-xs text-gray-500">በደንብ አውቃለሁ፤ ክህሎቴን ማሳደግ እፈልጋለሁ</p>
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center py-10">
                        <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h4 className="text-lg font-bold text-dark dark:text-white mb-2">Tsehay AI እያሰበ ነው...</h4>
                        <p className="text-gray-500 text-sm">የእርስዎን መረጃ እና የኮርስ ካታሎግ እያገናዘበ ነው</p>
                    </div>
                )}

                {step === 4 && (
                    <div className="text-center py-6">
                        <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-success text-4xl">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h4 className="text-xl font-black text-dark dark:text-white mb-4">ትክክለኛውን ኮርስ አግኝተናል!</h4>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl italic border border-gray-100 dark:border-slate-700">
                            "{recommendation?.message}"
                        </p>
                        
                        <div className="flex gap-4 justify-center">
                            {recommendation?.courseId && (
                                <button onClick={() => onRecommend(recommendation.courseId)} className="bg-primary text-dark font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition shadow-lg">
                                    ኮርሱን ይመልከቱ
                                </button>
                            )}
                            <button onClick={onClose} className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition">
                                ዝጋ (Close)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
