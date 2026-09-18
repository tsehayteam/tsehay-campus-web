import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service & Privacy Policy | Tsehay Campus',
  description: 'Tsehay Campus የአጠቃቀም ደንቦች እና የግላዊነት ፖሊሲ (Terms of Service & Privacy Policy) — Full compliance with Google OAuth & API Services User Data Policy.',
};

export default function TermsPage() {
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
              Legal & Privacy Compliance
            </span>
            <span className="text-gray-400 text-xs">Last updated: September 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-tight">
            የአጠቃቀም ደንቦች እና የግላዊነት ፖሊሲ (Terms & Privacy Policy)
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mt-2">
            Tsehay Campus — E-Learning & Digital Skills Academy (Tsehay Digital)
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed font-body">
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-950 dark:text-amber-200 text-sm sm:text-base leading-relaxed">
            <p className="font-semibold">
              ወደ <strong>Tsehay Campus</strong> እንኳን በደህና መጡ። ይህ የኢ-ለርኒንግ (E-Learning) ፕላትፎርም በ <strong>Tsehay Digital</strong> የቀረበ ሲሆን፣ ይህንን ፕላትፎርም ከመጠቀምዎ ወይም አካውንት ከመክፈትዎ በፊት እባክዎ ይህንን የአጠቃቀም ደንብ እና የግላዊነት ፖሊሲ በጥንቃቄ ያንብቡ።
            </p>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              This document represents the official Terms of Service and Privacy Policy for Tsehay Campus (operated by Tsehay Digital) at https://www.tsehaycampus.com.
            </p>
          </div>

          {/* Section 1: Acceptance of Terms */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">1.</span> ስምምነትን መቀበል (Acceptance of Terms)
            </h2>
            <p className="text-sm sm:text-base">
              ይህንን ድረ-ገጽ በመጎብኘት፣ አካውንት በመክፈት ወይም በ Tsehay Campus የሚሰጡ የቪዲዮ ትምህርቶችን (Courses) በመግዛት በዚህ ገፅ ላይ የሰፈሩትን ሁሉንም ህጎች፣ ደንቦች እና ፖሊሲዎች ያለምንም ቅድመ ሁኔታ ሙሉ በሙሉ እንደተቀበሉ ይቆጠራል። በእነዚህ ደንቦች ላይ የማይስማሙ ከሆነ ፕላትፎርሙን መጠቀም ማቆም ይኖርብዎታል።
            </p>
          </section>

          {/* Section 2: User Accounts */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">2.</span> የተጠቃሚ አካውንት እና ደህንነት (User Accounts & Security)
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base pl-2">
              <li>በፕላትፎርሙ ላይ አካውንት ሲከፍቱ ትክክለኛ፣ ሙሉ እና ወቅታዊ መረጃ (ስም፣ ስልክ ቁጥር፣ ኢሜል) መስጠት አለብዎት።</li>
              <li>የይለፍ ቃልዎን (Password) በሚስጥር መጠበቅ የእርስዎ ሙሉ ኃላፊነት ነው።</li>
              <li>አንድ አካውንት ለአንድ ሰው (ግለሰብ) ብቻ የተፈቀደ ነው። አካውንትዎን ለሌላ ሰው ማጋራት፣ ማከራየት ወይም መሸጥ በጥብቅ የተከለከለ ነው።</li>
            </ul>
          </section>

          {/* Section 3: Information We Collect & Google User Data */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">3.</span> የምንሰበስበው መረጃ እና የ Google ዳታ (Data Collection & Google User Data)
            </h2>
            <p className="text-sm sm:text-base">
              ፕላትፎርማችንን ሲጠቀሙ የሚከተሉትን መረጃዎች እንሰበስባለን፦
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm sm:text-base pl-2">
              <li>
                <strong>የጉግል መረጃ (Google User Data via Google Sign-In):</strong> በ Google OAuth 2.0 ተጠቅመው ሲገቡ ወይም ሲመዘገቡ፣ ከ Google መገለጫዎ <em>ስምዎን (Full Name)፣ የኢሜይል አድራሻዎን (Email Address)፣ እና የፕሮፋይል ፎቶዎን (Profile Picture)</em> ብቻ እንቀበላለን።
              </li>
              <li>
                <strong>የመረጃው ጥቅም (Purpose of Use):</strong> ይህ መረጃ የተማሪውን መገለጫ (Student Profile) ለማዘጋጀት፣ ኮርስ ሲያጠናቅቁ ይፋዊ ሰርተፊኬት በስምዎ ለማውጣት፣ እና የትምህርት ሂደትን (Course Progress) ለመጠበቅ ብቻ ያገለግላል።
              </li>
              <li>
                <strong>የትምህርት ሂደት (Educational Progress):</strong> የተመዘገቡባቸው ኮርሶች፣ የቪዲዮ እይታ ሂደት፣ የፈተና ውጤቶች እና የተሰጡ ሰርተፊኬቶች።
              </li>
            </ul>
          </section>

          {/* Section 4: Google API Services User Data Policy Compliance (CRITICAL FOR GOOGLE VERIFICATION) */}
          <section className="space-y-4 p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <h2 className="text-xl font-bold text-blue-950 dark:text-blue-300 flex items-center gap-2">
              <span className="text-[#f9b03c]">4.</span> የ Google API የተጠቃሚ ዳታ ፖሊሲ (Google API User Data Policy Compliance)
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

          {/* Section 5: Data Security, Retention & Deletion */}
          <section className="space-y-3 p-5 rounded-2xl bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-[#f9b03c]">5.</span> የመረጃ ደህንነት እና የማስሰረዝ መብት (Data Retention & Account Deletion)
            </h2>
            <p className="text-sm sm:text-base">
              መረጃዎችዎ በዘመናዊ የኢንክሪፕሽን (HTTPS/TLS) ቴክኖሎጂ እና በ Row-Level Security (RLS) የተጠበቁ ናቸው። ማንኛውም ተጠቃሚ አካውንቱ እና የተመዘገበ የግል መረጃው በቋሚነት እንዲሰረዝ የመጠየቅ ሙሉ መብት አለው።
            </p>
            <div className="text-sm space-y-1 mt-2">
              <p><strong>አካውንት እና መረጃን ለማሰረዝ (How to Request Account Deletion):</strong></p>
              <p>
                የተመዘገቡበትን የኢሜይል አድራሻ በመጠቀም &ldquo;<strong>Data Deletion Request</strong>&rdquo; የሚል ርዕስ ለ <a href="mailto:tsehayoperation@gmail.com" className="text-blue-600 dark:text-blue-400 font-bold underline">tsehayoperation@gmail.com</a> ወይም <a href="mailto:info@tsehaycampus.com" className="text-blue-600 dark:text-blue-400 font-bold underline">info@tsehaycampus.com</a> ይላኩልን። ጥያቄው በደረሰን በ 14 ቀናት ውስጥ ሁሉም መረጃዎችዎ ከሰርቨሮቻችን ላይ በቋሚነት ይሰረዛሉ።
              </p>
            </div>
          </section>

          {/* Section 6: Intellectual Property */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">6.</span> የአእምሮአዊ ንብረት መብት (Intellectual Property & Copyright)
            </h2>
            <p className="text-sm sm:text-base">
              በ Tsehay Campus ላይ የሚገኙ ሁሉም የቪዲዮ ትምህርቶች፣ ፅሁፎች፣ ምስሎች፣ የኮድ ፋይሎች እና ሶፍትዌሮች የ Tsehay Digital እና የአሰልጣኞቹ (Instructors) ህጋዊ የቅጂ መብት (Copyright) ያላቸው ንብረቶች ናቸው። ማንኛውንም የቪዲዮ ትምህርት ስክሪን ሪከርድ ማድረግ፣ ማውረድ፣ ለሌላ ሰው ማሰራጨት ወይም በማህበራዊ ሚዲያ ላይ መጫን በህግ ያስቀጣል።
            </p>
          </section>

          {/* Section 7: Payments & Refunds */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">7.</span> ክፍያ እና ተመላሽ (Payments & Refund Policy)
            </h2>
            <p className="text-sm sm:text-base">
              ኮርሶችን ለመግዛት የሚፈጸሙ ክፍያዎች በታመኑ የክፍያ አማራጮች (ቴሌብር፣ የኢትዮጵያ ባንኮች፣ LakiPay ወይም ዓለም አቀፍ አማራጮች) ይከናወናሉ። ተማሪው ትምህርቱን ጀምሮ ከተመለከተ በኋላ የተከፈለ ክፍያ ተመላሽ (Refund) አይደረግም።
            </p>
          </section>

          {/* Section 8: Contact Information */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">8.</span> እኛን ለማግኘት (Contact Information)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">ኢሜይል</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">tsehayoperation@gmail.com</p>
                <p className="font-semibold text-gray-900 dark:text-white">info@tsehaycampus.com</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">አድራሻ / ስልክ</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">ስልክ፡ 0980209090</p>
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-[#f9b03c] font-bold hover:underline">
              → ራሱን የቻለ የግላዊነት ፖሊሲ ገጽ (Dedicated Privacy Policy Page)
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
