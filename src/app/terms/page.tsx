import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Tsehay Campus',
  description: 'Tsehay Campus የአጠቃቀም ደንቦች (Terms of Service) — Platform rules, user accounts, intellectual property, and guidelines.',
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
              Legal Terms
            </span>
            <span className="text-gray-400 text-xs">Last updated: September 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-tight">
            የአጠቃቀም ደንቦች (Terms of Service)
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mt-2">
            Tsehay Campus — E-Learning & Digital Skills Academy
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed font-body">
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-950 dark:text-amber-200 text-sm sm:text-base leading-relaxed">
            <p className="font-semibold">
              ወደ <strong>Tsehay Campus</strong> እንኳን በደህና መጡ። ይህ የኢ-ለርኒንግ (E-Learning) ፕላትፎርም በ <strong>Tsehay Digital</strong> የቀረበ ሲሆን፣ ይህንን ፕላትፎርም ከመጠቀምዎ ወይም አካውንት ከመክፈትዎ በፊት እባክዎ ይህንን የአጠቃቀም ደንብ በጥንቃቄ ያንብቡ።
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">1.</span> ስምምነትን መቀበል (Acceptance of Terms)
            </h2>
            <p className="text-sm sm:text-base">
              ይህንን ድረ-ገጽ በመጎብኘት፣ አካውንት በመክፈት ወይም በ Tsehay Campus የሚሰጡ የቪዲዮ ትምህርቶችን (Courses) በመግዛት በዚህ ገፅ ላይ የሰፈሩትን ሁሉንም ህጎች፣ ደንቦች እና ፖሊሲዎች ያለምንም ቅድመ ሁኔታ ሙሉ በሙሉ እንደተቀበሉ ይቆጠራል። በእነዚህ ደንቦች ላይ የማይስማሙ ከሆነ ፕላትፎርሙን መጠቀም ማቆም ይኖርብዎታል።
            </p>
          </section>

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

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">3.</span> የአእምሮአዊ ንብረት መብት (Intellectual Property & Copyright)
            </h2>
            <p className="text-sm sm:text-base">
              በ Tsehay Campus ላይ የሚገኙ ሁሉም የቪዲዮ ትምህርቶች፣ ፅሁፎች፣ ምስሎች፣ የኮድ ፋይሎች እና ሶፍትዌሮች የ Tsehay Digital እና የአሰልጣኞቹ (Instructors) ህጋዊ የቅጂ መብት (Copyright) ያላቸው ንብረቶች ናቸው። ማንኛውንም የቪዲዮ ትምህርት ስክሪን ሪከርድ ማድረግ፣ ማውረድ፣ ለሌላ ሰው ማሰራጨት ወይም በማህበራዊ ሚዲያ ላይ መጫን በህግ ያስቀጣል።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">4.</span> ክፍያ እና ተመላሽ (Payments & Refund Policy)
            </h2>
            <p className="text-sm sm:text-base">
              ኮርሶችን ለመግዛት የሚፈጸሙ ክፍያዎች በታመኑ የክፍያ አማራጮች (ቴሌብር፣ የኢትዮጵያ ባንኮች፣ LakiPay ወይም ዓለም አቀፍ አማራጮች) ይከናወናሉ። ተማሪው ትምህርቱን ጀምሮ ከተመለከተ በኋላ የተከፈለ ክፍያ ተመላሽ (Refund) አይደረግም።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">5.</span> የግላዊነት ጥበቃ (Privacy Policy Reference)
            </h2>
            <p className="text-sm sm:text-base">
              የተጠቃሚዎችን መረጃ እንዴት እንደምንጠብቅ፣ እንደምንጠቀም እና የ Google OAuth ዳታን በተመለከተ ያለንን ጥብቅ አሰራር ለመረዳት እባክዎ ይፋዊውን <Link href="/privacy" className="text-[#f9b03c] font-bold underline">የግላዊነት ፖሊሲ (Privacy Policy)</Link> ይመልከቱ።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <span className="text-[#f9b03c]">6.</span> እኛን ለማግኘት (Contact Information)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">ኢሜይል</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">tsehayoperation@gmail.com</p>
                <p className="font-semibold text-gray-900 dark:text-white">info@tsehaycampus.com</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">ስልክ / ቴሌግራም</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">0980209090</p>
                <p className="text-gray-500 text-xs mt-0.5">@TsehayTeam</p>
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-[#f9b03c] font-bold hover:underline">
              → የግላዊነት ፖሊሲ (Privacy Policy)
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
