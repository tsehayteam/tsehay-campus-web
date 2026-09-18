import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Tsehay Campus',
  description: 'Tsehay Campus የግላዊነት ፖሊሲ (Privacy Policy) — How we collect, use, and protect your data including Google OAuth compliance.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#030712] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#0b0f19] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#030509] via-[#0b1528] to-[#1e3a8a] p-8 sm:p-10 text-white border-b border-white/10">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[#f9b03c] hover:underline text-sm mb-4 transition font-bold"
          >
            ← ወደ ዋናው ገጽ (Back to Home)
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-[#f9b03c]/20 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-bold rounded-full uppercase tracking-wider">
              Legal & Compliance
            </span>
            <span className="text-gray-400 text-xs">Last updated: September 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-tight">
            የግላዊነት ፖሊሲ (Privacy Policy)
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mt-2">
            Tsehay Campus — E-Learning & Digital Skills Platform
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed font-body">
          {/* Overview Callout */}
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-950 dark:text-amber-200 text-sm sm:text-base leading-relaxed">
            <p className="font-semibold">
              ይህ የግላዊነት ፖሊሲ በ <strong>Tsehay Campus</strong> (በ Tsehay Digital የሚተዳደር) ተጠቃሚዎች ፕላትፎርማችንን ሲጠቀሙ መረጃዎቻቸው እንዴት እንደሚሰበሰቡ፣ እንደሚጠበቁ እና ጥቅም ላይ እንደሚውሉ ያብራራል። የእርስዎን ግላዊነት መጠበቅ የድርጅታችን ቀዳሚ ዓላማ ነው።
            </p>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              This Privacy Policy describes how Tsehay Campus (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, and safeguards your information when you visit and use our online educational platform at https://www.tsehaycampus.com.
            </p>
          </div>

          {/* Section 1: Information Collected */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">1.</span> የምንሰበስበው መረጃ (Information We Collect)
            </h2>
            <p className="text-sm sm:text-base">
              ፕላትፎርማችንን ሲጠቀሙ የሚከተሉትን መረጃዎች ልንሰበስብ እንችላለን፦
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base pl-2">
              <li>
                <strong>የአካውንት መረጃ (Account Information):</strong> በፈቃደኝነት የሚሰጡን ሙሉ ስም፣ የኢሜይል አድራሻ፣ ስልክ ቁጥር እና የይለፍ ቃል (Password)።
              </li>
              <li>
                <strong>የጉግል መረጃ (Google User Data via Google Sign-In):</strong> በ Google OAuth ተጠቅመው ሲገቡ ወይም ሲመዘገቡ፣ ከ Google መገለጫዎ <em>ስምዎን (Name)፣ የኢሜይል አድራሻዎን (Email)፣ እና የፕሮፋይል ፎቶዎን (Profile Picture)</em> ብቻ እንቀበላለን።
              </li>
              <li>
                <strong>የትምህርት ሂደት (Educational Progress):</strong> የተመዘገቡባቸው ኮርሶች፣ የቪዲዮ እይታ ሂደት፣ የፈተና ውጤቶች እና የተሰጡ ሰርተፊኬቶች።
              </li>
              <li>
                <strong>የክፍያ መረጃ (Transaction Records):</strong> ለኮርሶች የተከፈሉ ክፍያዎች ማረጋገጫ (የደረሰኝ ቁጥር፣ ቀን እና የክፍያ ሁኔታ)። እኛ የክሬዲት ካርድ ወይም የባንክ ሚስጥራዊ ቁጥሮችን አናከማችም።
              </li>
            </ul>
          </section>

          {/* Section 2: Google API Limited Use Disclosure */}
          <section className="space-y-4 p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <h2 className="text-xl font-bold text-blue-950 dark:text-blue-300 flex items-center gap-2">
              <span className="text-[#f9b03c]">2.</span> የ Google API የተጠቃሚ ዳታ ፖሊሲ (Google API User Data Policy Compliance)
            </h2>
            <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed">
              Tsehay Campus strictly complies with the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 pl-2">
              <li>
                <strong>Limited Use:</strong> Tsehay Campus&rsquo;s use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline font-semibold">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </li>
              <li>
                <strong>No Transfer or Sale:</strong> We do not transfer, sell, or rent Google user data to third parties, advertising platforms, or data brokers.
              </li>
              <li>
                <strong>No AI/ML Model Training:</strong> Tsehay Campus does not use Google user data to develop, train, or improve generalized Artificial Intelligence (AI) or Machine Learning (ML) models.
              </li>
              <li>
                <strong>Human Access:</strong> We do not allow humans to read user data unless we have obtained your explicit consent for support purposes, it is necessary for security purposes, or it is required to comply with applicable law.
              </li>
            </ul>
          </section>

          {/* Section 3: How We Use Information */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">3.</span> መረጃውን ለምን እንጠቀምበታለን? (How We Use Your Information)
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base pl-2">
              <li>የተማሪውን አካውንት ደህንነቱ በተጠበቀ መልኩ ለመክፈት እና ለማስተዳደር</li>
              <li>ኮርሶችን ለመመልከት እና የትምህርት ሂደትን (Progress) ለማስቀጠል</li>
              <li>ኮርሱን ሲያጠናቅቁ ይፋዊ ዲጂታል ሰርተፊኬት በስምዎ ለማዘጋጀት</li>
              <li>አስፈላጊ የክፍያ እና የአካውንት ማረጋገጫ መልዕክቶችን በኢሜይል ለመላክ</li>
              <li>የፕላትፎርሙን የቴክኒክ ጥራት እና ደህንነት ለመጠበቅ</li>
            </ul>
          </section>

          {/* Section 4: Data Security and Retention */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">4.</span> የመረጃ ደህንነት እና ማቆየት (Data Security & Retention)
            </h2>
            <p className="text-sm sm:text-base">
              መረጃዎችዎ ዘመናዊ የኢንክሪፕሽን (HTTPS/TLS) ቴክኖሎጂን በመጠቀም የተጠበቁ ናቸው። ዳታቤዛችን የተጠቃሚን ደህንነት በጠበቀ በ Row-Level Security (RLS) የተጠበቀ ሲሆን፣ ያልተፈቀደለት አካል የእርስዎን መረጃ እንዳያይ በጥብቅ የተከለከለ ነው። የእርስዎን መረጃ የምናቆየው አካውንትዎ እስከተከፈተበት እና ትምህርቱን እስከሚከታተሉበት ጊዜ ድረስ ብቻ ነው።
            </p>
          </section>

          {/* Section 5: Data Deletion Request */}
          <section className="space-y-3 p-5 rounded-2xl bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-[#f9b03c]">5.</span> መረጃን የማስሰረዝ መብት (Data Deletion & User Rights)
            </h2>
            <p className="text-sm sm:text-base">
              እያንዳንዱ ተጠቃሚ የራሱን አካውንት እና የተመዘገበ የግል መረጃ በማንኛውም ጊዜ እንዲሰረዝ የመጠየቅ ሙሉ መብት አለው።
            </p>
            <div className="text-sm space-y-1 mt-2">
              <p><strong>አካውንት እና መረጃን ለማሰረዝ (How to Request Account Deletion):</strong></p>
              <p>
                የተመዘገቡበትን የኢሜይል አድራሻ በመጠቀም &ldquo;<strong>Data Deletion Request</strong>&rdquo; የሚል ርዕስ ለ <a href="mailto:tsehayoperation@gmail.com" className="text-blue-600 dark:text-blue-400 font-bold underline">tsehayoperation@gmail.com</a> ወይም <a href="mailto:info@tsehaycampus.com" className="text-blue-600 dark:text-blue-400 font-bold underline">info@tsehaycampus.com</a> ይላኩልን። ጥያቄው በደረሰን በ 14 ቀናት ውስጥ ሁሉም መረጃዎችዎ ከሰርቨሮቻችን ላይ በቋሚነት ይሰረዛሉ።
              </p>
            </div>
          </section>

          {/* Section 6: Contact Information */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">6.</span> አድራሻችን (Contact Us)
            </h2>
            <p className="text-sm sm:text-base">
              ስለዚህ የግላዊነት ፖሊሲ ማንኛውም አስተያየት ወይም ጥያቄ ካለዎት በሚከተሉት አድራሻዎች ያግኙን፦
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">ኢሜይል (Email)</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">tsehayoperation@gmail.com</p>
                <p className="font-semibold text-gray-900 dark:text-white">info@tsehaycampus.com</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">አድራሻ (Location)</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ</p>
                <p className="text-gray-500 text-xs mt-0.5">https://www.tsehaycampus.com</p>
              </div>
            </div>
          </section>

          {/* Section 7: Links to Terms */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-[#f9b03c] font-bold hover:underline">
              → የአጠቃቀም ደንቦች (Terms of Service)
            </Link>
            <Link href="/" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              → ዋና ገጽ (Home)
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
