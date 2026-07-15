'use client';
import { useState, useEffect } from 'react';

export default function TermsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-terms-modal', handleOpen);
    // Backward compatibility for existing hardcoded calls
    (window as any).openTermsModal = handleOpen;
    return () => window.removeEventListener('open-terms-modal', handleOpen);
  }, []);

  if (!isOpen) return null;
  return (
    <div id="terms-modal" className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-sm p-4" onClick={(e) => { if(e.target === e.currentTarget) setIsOpen(false) }}>
        <div className="bg-white dark:bg-darkCard w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh] modal-animate border border-gray-100 dark:border-gray-800">
            <div className="bg-secondary dark:bg-dark p-5 md:p-6 text-white flex justify-between items-center shrink-0 border-b border-gray-800">
                <h2 className="font-black text-lg md:text-xl font-heading">የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms & Privacy)</h2>
                <button type="button" onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 text-2xl transition z-50 p-2"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed space-y-6 font-body">
                <p className="font-bold text-dark dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4">ወደ <span className="notranslate">Tsehay Campus</span> እንኳን በደህና መጡ። ይህ የኢ-ለርኒንግ (E-Learning) ፕላትፎርም በ <span className="notranslate">Tsehay Digital</span> የቀረበ ሲሆን፣ ይህንን ፕላትፎርም ከመጠቀምዎ፣ አካውንት ከመክፈትዎ ወይም ማንኛውንም አይነት ግብይት ከመፈጸምዎ በፊት እባክዎ ይህንን የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ (Terms of Service and Privacy Policy) በጥንቃቄ ያንብቡ። ይህ ሰነድ በእርስዎ እና በፕላትፎርሙ መሃል ያለውን ህጋዊ ስምምነት ይወክላል።</p>
                
                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-file-contract text-primary mr-2"></i> 1. ስምምነትን መቀበል (Acceptance of Terms)</h3>
                    <div className="space-y-2 text-justify">
                        <p>1.1. ይህንን ዌብሳይት በመጎብኘት፣ አካውንት በመክፈት፣ ወይም በ <span className="notranslate">Tsehay Campus</span> የሚሰጡ ትምህርቶችን (Courses) በመግዛት በዚህ ገፅ ላይ የሰፈሩትን ሁሉንም ህጎች፣ ደንቦች እና ፖሊሲዎች ያለምንም ቅድመ ሁኔታ ሙሉ በሙሉ እንደተቀበሉ ይቆጠራል።</p>
                        <p>1.2. በዚህ ስምምነት ውስጥ በተካተቱት ማናቸውም አንቀፆች ላይ የማይስማሙ ከሆነ፣ ፕላትፎርሙን መጠቀም ማቆም እና አካውንት ከመክፈት መቆጠብ ይኖርብዎታል።</p>
                        <p>1.3. ድርጅታችን (Tsehay Digital) እነዚህን ህጎች በማንኛውም ጊዜ የማሻሻል፣ የመቀየር ወይም አዳዲስ ህጎችን የመጨመር ሙሉ መብት አለው። ህጎቹ ሲቀየሩ ፕላትፎርሙ ላይ ማስታወቂያ የምናወጣ ሲሆን፣ ከተቀየሩ በኋላ ፕላትፎርሙን መጠቀሙን ከቀጠሉ ለውጦቹን እንደተቀበሉ ይቆጠራል።</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-user-shield text-secondary mr-2"></i> 2. የተጠቃሚ አካውንት እና ደህንነት (User Accounts & Security)</h3>
                    <div className="space-y-2 text-justify">
                        <p>2.1. በፕላትፎርሙ ላይ አካውንት ሲከፍቱ ትክክለኛ፣ ሙሉ እና ወቅታዊ የሆነ መረጃዎን (ስም፣ ስልክ ቁጥር፣ ኢሜል) መስጠት አለብዎት። ሀሰተኛ መረጃ መስጠት አካውንትዎ ያለምንም ማስጠንቀቂያ እንዲዘጋ ሊያደርግ ይችላል።</p>
                        <p>2.2. የይለፍ ቃልዎን (Password) በሚስጥር መጠበቅ የእርስዎ ሙሉ ሀላፊነት ነው። በእርስዎ አካውንት ለሚሰራ ማንኛውም ድርጊት ሀላፊነቱን የሚወስዱት እርስዎ ነዎት።</p>
                        <p>2.3. አንድ አካውንት መጠቀም የሚችለው አንድ ሰው (ግለሰብ) ብቻ ነው። አካውንትዎን ለሌላ ሶስተኛ ወገን ማጋራት፣ ማከራየት ወይም መሸጥ በጥብቅ የተከለከለ ሲሆን፣ ይህ ድርጊት ሲፈፀም ከተገኘ አካውንትዎ በዘላቂነት ይታገዳል።</p>
                        <p>2.4. አካውንትዎ ያለእርስዎ ፍቃድ በሌላ ሰው እየተሰራበት እንደሆነ ከተጠራጠሩ፣ ወዲያውኑ ለድጋፍ ሰጪ ቡድናችን ማሳወቅ ይኖርብዎታል።</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-video text-success mr-2"></i> 3. የትምህርት አጠቃቀም እና የአእምሮአዊ ንብረት መብት (Intellectual Property)</h3>
                    <div className="space-y-2 text-justify">
                        <p>3.1. በ <span className="notranslate">Tsehay Campus</span> ላይ የሚገኙ ሁሉም የቪዲዮ ትምህርቶች፣ ፅሁፎች፣ ምስሎች፣ የኮድ ፋይሎች፣ እና ሶፍትዌሮች የ <span className="notranslate">Tsehay Digital</span> እና የአሰልጣኞቹ (Instructors) ህጋዊ እና የአእምሮአዊ ንብረቶች ናቸው።</p>
                        <p>3.2. ማንኛውንም የቪዲዮ ትምህርት ዳውንሎድ (Download) ማድረግ፣ ስክሪን ሪከርድ (Screen Record) ማድረግ፣ ለሌላ ሰው ማሰራጨት፣ በዩቲዩብ (YouTube)፣ በቴሌግራም ወይም በሌሎች ማህበራዊ ሚዲያዎች ላይ መልሶ መጫን በጥብቅ የተከለከለ ሲሆን የቅጂ መብት ጥሰት (Copyright Infringement) ህጋዊ እርምጃ ያስወስዳል።</p>
                        <p>3.3. ተማሪዎች ኮርሶችን መግዛት ማለት ትምህርቱን የመከታተል ፍቃድ (License) ማግኘት ማለት እንጂ የትምህርቱ ባለቤት መሆን ማለት አይደለም። ኮርሱ የግል ዕውቀትን ለማዳበር ብቻ የሚያገለግል ነው።</p>
                        <p>3.4. ትምህርቶቹን ለመከታተል የራስዎ የሆነ እና በቂ ፍጥነት ያለው የኢንተርኔት ግንኙነት (Internet Connection) ያስፈልግዎታል። በኢንተርኔት ፍጥነት ማነስ ለሚፈጠር የቪዲዮ መቆራረጥ ፕላትፎርሙ ሀላፊነት አይወስድም።</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-credit-card text-warning mr-2"></i> 4. ክፍያ፣ ዋጋ እና ተመላሽ ገንዘብ (Payments & Refund Policy)</h3>
                    <div className="space-y-2 text-justify">
                        <p>4.1. ሁሉም በፕላትፎርሙ ላይ ያሉ የኮርስ ዋጋዎች ግልፅ በሆነ መንገድ የተቀመጡ ናቸው። ክፍያዎች በኢትዮጵያ ብር (ETB) ወይም በዶላር (USD) ሊፈጸሙ ይችላሉ።</p>
                        <p>4.2. **ምንም ዓይነት ገንዘብ ተመላሽ አይደረግም (Strict No Refund Policy)**፡ አንድን ኮርስ ከገዙ እና ክፍያው ከተረጋገጠ በኋላ በምንም ዓይነት ምክንያት የተከፈለው ገንዘብ ተመላሽ አይደረግም። እባክዎ ከመግዛትዎ በፊት የኮርሱን ማብራሪያ፣ ይዘት እና ነፃ የሙከራ ትምህርቶችን (Preview) በሚገባ ይመልከቱ።</p>
                        <p>4.3. ኮርሱን አንዴ ከገዙ በኋላ፣ የኮርሱ ቪዲዮች እና ማቴሪያሎች እስከ ህይወት ዘመንዎ (Lifetime Access) ድረስ ክፍት ሆነው ይቆያሉ። ሆኖም ዌብሳይቱ በሚዘጋበት ወይም በአስገዳጅ አጋጣሚዎች (Force Majeure) ጊዜ መቋረጥ ሊያጋጥም ይችላል።</p>
                        <p>4.4. ክፍያዎ በቴክኒክ ችግር ምክንያት ተቀናንሶ ነገር ግን ኮርሱ ካልተከፈተልዎ፣ የክፍያ ማረጋገጫ (Receipt/Transaction ID) በመያዝ በተቀመጡት የስልክ እና የቴሌግራም አድራሻዎች የድጋፍ ቡድናችንን ማግኘት ይችላሉ።</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-lock text-purple-500 mr-2"></i> 5. የግላዊነት ፖሊሲ እና የዳታ ጥበቃ (Privacy Policy & Data Protection)</h3>
                    <div className="space-y-2 text-justify">
                        <p>5.1. **መረጃ አሰባሰብ**፡ አካውንት ሲከፍቱ፣ ኮርስ ሲገዙ ወይም ከ <span className="notranslate">Tsehay AI</span> ጋር ሲነጋገሩ የእርስዎን ስም፣ ስልክ፣ ኢሜል እና የትምህርት መረጃዎችን (Progress) እንሰበስባለን።</p>
                        <p>5.2. **የመረጃ አጠቃቀም**፡ የምንሰበስበው መረጃ አገልግሎታችንን ለማሻሻል፣ ለቴክኒክ ድጋፍ፣ እና አስፈላጊ ማሳወቂያዎችን (እንደ አዲስ ኮርስ፣ ወይም የይለፍ ቃል መቀየሪያ) ለእርስዎ ለመላክ ብቻ ይጠቅማል።</p>
                        <p>5.3. **መረጃን ለሶስተኛ ወገን ስለመስጠት**፡ የእርስዎን ግላዊ መረጃ ለማንኛውም ሶስተኛ ወገን አሳልፈን አንሸጥም ወይም አናጋራም። ነገር ግን በህግ አስከባሪ አካላት ትዕዛዝ ሲጠየቅ ብቻ ህግን መሰረት አድርገን መረጃ ልንሰጥ እንችላለን።</p>
                        <p>5.4. **የክፍያ መረጃ ደህንነት**፡ የክፍያ ሂደቶች በታወቁ የክፍያ ስርዓቶች (እንደ Chapa፣ Telebirr፣ CBA) የሚከናወኑ በመሆናቸው የእርስዎን የባንክ ካርድ ወይም የሚስጥር ቁጥር እኛ ፕላትፎርም ላይ አናስቀምጥም።</p>
                        <p>5.5. **የኩኪ አጠቃቀም (Cookies)**፡ የተጠቃሚን ልምድ (User Experience) ለማሳደግ ዌብሳይቱ ኩኪዎችን ሊጠቀም ይችላል። እነዚህ ኩኪዎች ቋንቋዎን እና ዳርክ/ላይት ሞድ ምርጫዎን ለማስታወስ ያገለግላሉ።</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-ban text-danger mr-2"></i> 6. የአካውንት መታገድ እና ማቋረጥ (Account Termination)</h3>
                    <div className="space-y-2 text-justify">
                        <p>6.1. ከላይ የተጠቀሱትን ህጎች የጣሰ ማንኛውም ተጠቃሚ ያለ ምንም ማስጠንቀቂያ አካውንቱ ሊታገድ (Suspend) ወይም ሊጠፋ (Terminate) ይችላል።</p>
                        <p>6.2. ኮርሶችን አውርዶ መሸጥ፣ የሌሎችን ተማሪዎች መረጃ ለመስረቅ መሞከር፣ ፕላትፎርሙ ላይ የሳይበር ጥቃት (Hacking) ሙከራ ማድረግ፣ ወይም አስነዋሪ ቃላትን በኮሜንት ላይ መፃፍ ወደ ዘላቂ እገዳ እና ህጋዊ ክስ ይመራል።</p>
                        <p>6.3. አካውንትዎ ከታገደ፣ የገዙዋቸው ኮርሶች እንዳይሰሩ ይደረጋል እንዲሁም ምንም አይነት የገንዘብ ካሳ አይከፈልዎትም።</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-black text-dark dark:text-white text-base border-b border-gray-100 dark:border-gray-800 pb-2 mb-3"><i className="fa-solid fa-scale-balanced text-gray-500 mr-2"></i> 7. የሀላፊነት ገደብ እና ህጋዊነት (Limitation of Liability & Governing Law)</h3>
                    <div className="space-y-2 text-justify">
                        <p>7.1. በኮርሶቹ ውስጥ የሚሰጡት ትምህርቶች ለዕውቀት ማዳበሪያ ብቻ የተዘጋጁ ናቸው። የተሰጡትን ትምህርቶች በመጠቀም ለሚመጣ ማንኛውም አይነት የንግድ ኪሳራ፣ የዳታ መጥፋት ወይም ሌላ ጉዳት <span className="notranslate">Tsehay Campus</span> ምንም አይነት ህጋዊም ሆነ የገንዘብ ሀላፊነት አይወስድም።</p>
                        <p>7.2. ፕላትፎርሙ አልፎ አልፎ ለጥገና (Maintenance) ከጥቅም ውጪ ሊሆን ይችላል። በእንደዚህ አይነት ጊዜያት ለሚኖረው መቋረጥ ፕላትፎርሙ ሀላፊነት አይወስድም።</p>
                        <p>7.3. ይህ የአጠቃቀም ህግ ስምምነት በኢትዮጵያ ፌደራላዊ ዲሞክራሲያዊ ሪፐብሊክ ህጎች መሰረት የሚመራ እና የሚተረጎም ይሆናል። ማንኛውም አለመግባባት ቢፈጠር በኢትዮጵያ ፍርድ ቤቶች የሚታይ ይሆናል።</p>
                        <p className="mt-4 font-bold text-center">ይህ ሰነድ ለመጨረሻ ጊዜ የተሻሻለው፡ ሐምሌ 2018 ዓ.ም (July 2026) ነው።</p>
                    </div>
                </div>
            </div>
            <div className="p-5 md:p-6 bg-gray-50 dark:bg-dark border-t border-gray-100 dark:border-gray-800 shrink-0 flex justify-end">
                <button type="button" onClick={() => setIsOpen(false)} className="bg-primary text-dark px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition shadow-sm">ተስማምቻለሁ (I Agree)</button>
            </div>
        </div>
    </div>
  );
}
