import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service & Privacy Policy | Tsehay Campus',
  description: 'Tsehay Campus የአጠቃቀም ደንቦች እና የግላዊነት ፖሊሲ (Terms of Service & Privacy Policy).',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-darkCard rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary to-primary p-8 text-white">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition"
          >
            ← ወደ ዋናው ገጽ (Back to Home)
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black font-heading">
            የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Terms of Service & Privacy Policy — Tsehay Campus
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed font-body">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-900 dark:text-amber-200 text-sm sm:text-base leading-relaxed">
            <p className="font-bold">
              ወደ <span className="text-primary font-black">Tsehay Campus</span> እንኳን በደህና መጡ። ይህ የኢ-ለርኒንግ (E-Learning) ፕላትፎርም በ Tsehay Digital የቀረበ ሲሆን፣ ይህንን ፕላትፎርም ከመጠቀምዎ ወይም አካውንት ከመክፈትዎ በፊት እባክዎ ይህንን የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ በጥንቃቄ ያንብቡ።
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              1. ስምምነትን መቀበል (Acceptance of Terms)
            </h2>
            <p className="text-sm sm:text-base">
              ይህንን ዌብሳይት በመጎብኘት፣ አካውንት በመክፈት ወይም በ Tsehay Campus የሚሰጡ ትምህርቶችን በመከታተል በዚህ ገፅ ላይ የሰፈሩትን ህጎች፣ ደንቦች እና ፖሊሲዎች ሙሉ በሙሉ እንደተቀበሉ ይቆጠራል። በእነዚህ ደንቦች ካልተስማሙ ፕላትፎርሙን መጠቀም ማቆም ይኖርብዎታል።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              2. የተጠቃሚ አካውንት እና ደህንነት (User Accounts & Security)
            </h2>
            <p className="text-sm sm:text-base">
              በፕላትፎርሙ ላይ አካውንት ሲከፍቱ ትክክለኛ እና ወቅታዊ መረጃ (ስም፣ ስልክ፣ ኢሜል) መስጠት አለብዎት። የይለፍ ቃልዎን በሚስጥር መጠበቅ የእርስዎ ኃላፊነት ነው። አንድ አካውንት ለአንድ ሰው ብቻ የተፈቀደ ሲሆን፣ አካውንት ማጋራት ወይም መሸጥ በጥብቅ የተከለከለ ነው።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              3. የግላዊነት ጥበቃ እና የመረጃ አጠቃቀም (Privacy & Data Protection)
            </h2>
            <p className="text-sm sm:text-base">
              Tsehay Campus የተጠቃሚዎችን የግል መረጃ (ስም፣ ኢሜል፣ ስልክ ቁጥር እና የትምህርት እንቅስቃሴ) በአስተማማኝ ሁኔታ ይጠብቃል። 
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base pl-2">
              <li><strong>የምንሰበስበው መረጃ:</strong> ስም፣ የኢሜይል አድራሻ፣ ስልክ ቁጥር እና የትምህርት ሂደት (Course Progress)።</li>
              <li><strong>የመረጃው ጥቅም:</strong> የአካውንት ደህንነት ለማረጋገጥ፣ የክፍያ ማረጋገጫ ለመስጠት እና የተማሪውን የትምህርት ውጤት ለመከታተል ብቻ ያገለግላል።</li>
              <li><strong>Google OAuth መረጃ:</strong> በ Google በኩል ሲገቡ መሰረታዊ የፕሮፋይል መረጃ (ስም፣ ኢሜል እና ፕሮፋይል ፎቶ) ብቻ የምንጠቀም ሲሆን፣ ይህንን መረጃ ለሶስተኛ ወገን በፍጹም አናጋራም ወይም አንሸጥም።</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              4. የአእምሮአዊ ንብረት መብት (Intellectual Property & Copyright)
            </h2>
            <p className="text-sm sm:text-base">
              በ Tsehay Campus ላይ የሚገኙ ሁሉም የቪዲዮ ትምህርቶች፣ ፅሁፎች፣ ምስሎች እና የኮድ ፋይሎች የ Tsehay Digital ህጋዊ ንብረቶች ናቸው። ማንኛውንም የቪዲዮ ትምህርት ስክሪን ሪከርድ ማድረግ፣ ማውረድ ወይም በሌሎች ማህበራዊ ሚዲያዎች ማሰራጨት በጥብቅ የተከለከለ ሲሆን በህግ ያስቀጣል።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              5. ክፍያ እና ተመላሽ (Payment & Refund Policy)
            </h2>
            <p className="text-sm sm:text-base">
              የኮርስ ክፍያዎች በቴሌብር፣ በባንክ ወይም በኦንላይን የክፍያ አማራጮች የሚፈጸሙ ሲሆን፣ ተማሪው ትምህርቱን ከጀመረ በኋላ የተከፈለ ክፍያ ተመላሽ (Refund) አይደረግም።
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              6. እኛን ለማግኘት (Contact Us)
            </h2>
            <p className="text-sm sm:text-base">
              ስለዚህ የአጠቃቀም ህግ ወይም ግላዊነት ፖሊሲ ማንኛውም ጥያቄ ካለዎት በሚከተለው አድራሻ ሊያገኙን ይችላሉ፦
            </p>
            <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-sm space-y-1">
              <p>📧 Email: <a href="mailto:tsehayoperation@gmail.com" className="text-primary font-bold">tsehayoperation@gmail.com</a></p>
              <p>🌐 Website: <a href="https://www.tsehaycampus.com" className="text-primary font-bold">https://www.tsehaycampus.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
