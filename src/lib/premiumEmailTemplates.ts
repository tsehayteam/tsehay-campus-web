/**
 * Tsehay Campus - Ultra-Premium 3D HTML Email Templates
 * Inspired by Terafab / x.ai modern cybernetic aesthetics
 * Features dark obsidian canvas (#0b0f19), golden yellow accents (#f9b03c), 
 * sapphire glow (#3268ba), glassmorphism-styled containers, and high-contrast typography.
 */

export interface MentorshipBooking {
  id?: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  topic: string;
  userId?: string;
  createdAt?: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
}

export interface CourseReminderData {
  name: string;
  email: string;
  courseTitle: string;
  progressPercent?: number;
  lastLessonTitle?: string;
}

export interface AiReminderData {
  name: string;
  email: string;
}

export interface NewCourseAlertData {
  name: string;
  email: string;
  courseTitle: string;
  courseDescription?: string;
  instructor?: string;
  coursePrice?: number;
  courseSlug?: string;
}

const BRAND_LOGO_URL = 'https://tsehaycampus.com/tc-logo.jpg';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsehaycampus.com';

// 🌟 1. WELCOME EMAIL (Onboarding New Student)
export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const displayName = data.name || 'የተከበሩ ተማሪ';
  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>እንኳን ወደ ፀሐይ ካምፓስ በደህና መጡ! - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(249,176,60,0.2);">
      
      <!-- Top Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #131a2c 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.35);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🚀 WELCOME TO TSEHAY CAMPUS
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            እንኳን በደህና <span style="color: #f9b03c;">መጡ!</span>
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">የኢትዮጵያ ቀዳሚ የዲጂታል ክህሎት እና የቢዝነስ ማሰልጠኛ</p>
        </td>
      </tr>

      <!-- Message Body -->
      <tr>
        <td style="padding: 28px 32px 15px;">
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም <strong>${displayName}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
            የፀሐይ ካምፓስ (Tsehay Campus) አካል ስለሆኑ ከልብ ደስ ብሎናል። እዚህ በዘመናዊ ዲጂታል ቴክኖሎጂዎች፣ በዩቲዩብ ሞኒታይዜሽን፣ በቻይና ቀጥታ ንግድ እና በ AI መሳሪያዎች ገቢዎን የሚያሳድጉባቸውን ተግባራዊ ስልጠናዎች ያገኛሉ።
          </p>

          <!-- 3 Steps to Success Grid -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(249, 176, 60, 0.25); border-radius: 20px; padding: 22px; margin-bottom: 24px;">
            <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 900; color: #f9b03c; text-transform: uppercase; letter-spacing: 1px;">
              የመጀመሪያ እርምጃዎችዎ፡
            </p>
            
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top" style="padding-bottom: 12px;">
                  <div style="width: 28px; height: 28px; background: rgba(249, 176, 60, 0.2); color: #f9b03c; border-radius: 8px; font-size: 13px; font-weight: 900; text-align: center; line-height: 28px;">1</div>
                </td>
                <td style="padding-bottom: 12px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                  <strong>ኮርሶችን ይምረጡ፡</strong> የዩቲዩብ ማስተርክላስ ወይም የኢ-ኮሜርስ ስልጠናዎችን ይመልከቱ።
                </td>
              </tr>
              <tr>
                <td width="36" valign="top" style="padding-bottom: 12px;">
                  <div style="width: 28px; height: 28px; background: rgba(50, 104, 186, 0.2); color: #60a5fa; border-radius: 8px; font-size: 13px; font-weight: 900; text-align: center; line-height: 28px;">2</div>
                </td>
                <td style="padding-bottom: 12px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                  <strong>Tsehay AI ን ይጠቀሙ፡</strong> ለቢዝነስዎ አዳዲስ ሀሳቦችን በ 24/7 የ AI ረዳትዎ ያግኙ።
                </td>
              </tr>
              <tr>
                <td width="36" valign="top">
                  <div style="width: 28px; height: 28px; background: rgba(16, 185, 129, 0.2); color: #34d399; border-radius: 8px; font-size: 13px; font-weight: 900; text-align: center; line-height: 28px;">3</div>
                </td>
                <td style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                  <strong>ሰርተፊኬትዎን ይቀበሉ፡</strong> ኮርሶችን አጠናቀው የተረጋገጠ ዓለም አቀፍ ሰርተፊኬት ይውሰዱ።
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding: 0 32px 30px;">
          <a href="${SITE_URL}/courses" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e59b2b 100%); color: #0b0f19; font-weight: 900; font-size: 15px; padding: 16px 30px; text-decoration: none; border-radius: 16px; text-align: center; box-shadow: 0 12px 30px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🔥 ኮርሶችን ይዩ (Explore Courses)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
            ጥያቄ ካለዎት፡ <a href="https://t.me/EyoubSahle" style="color: #f9b03c; text-decoration: none; font-weight: 700;">@EyoubSahle</a>
          </p>
          <p style="margin: 0; font-size: 11px; color: #64748b;">
            © ${new Date().getFullYear()} Tsehay Campus. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

// 🌟 2. COURSE RESUME REMINDER EMAIL
export function getCourseReminderEmailHtml(data: CourseReminderData): string {
  const displayName = data.name || 'የተከበሩ ተማሪ';
  const courseTitle = data.courseTitle || 'የጀመሩት ኮርስ';
  const progress = data.progressPercent || 25;

  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ኮርስዎን አልጨረሱም! ዛሬ ገብተው ይቀጥሉ - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #3268ba; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(50,104,186,0.25);">
      
      <!-- Top Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #121e36 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(50, 104, 186, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px;">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(50, 104, 186, 0.2); border: 1px solid #3268ba; color: #60a5fa; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            ⚡ CONTINUE YOUR LEARNING
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            ኮርስዎን <span style="color: #f9b03c;">ይቀጥሉ!</span>
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">ስኬትዎ የእለት ተእለት ጥረት ውጤት ነው</p>
        </td>
      </tr>

      <!-- Message Body -->
      <tr>
        <td style="padding: 28px 32px 15px;">
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም <strong>${displayName}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
            የጀመሩትን <strong>"${courseTitle}"</strong> ስልጠና ጥቂት ትምህርቶች ብቻ ይቀሩዎታል። በየቀኑ 15 ደቂቃ በመማር ሰርተፊኬትዎን ያግኙ እና ህልምዎን እውን ያድርጉ!
          </p>

          <!-- Course Progress Card -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(50, 104, 186, 0.35); border-radius: 20px; padding: 22px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 800; color: #ffffff;">${courseTitle}</span>
              <span style="font-size: 13px; font-weight: 900; color: #f9b03c;">${progress}% ተጠናቋል</span>
            </div>

            <!-- Progress Bar -->
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 100px; height: 10px; overflow: hidden; margin-bottom: 12px;">
              <div style="background: linear-gradient(90deg, #3268ba 0%, #f9b03c 100%); height: 10px; border-radius: 100px; width: ${progress}%;"></div>
            </div>

            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              💡 <em>ምክር፡ ዛሬ ቢያንስ አንድ አጭር ቪዲዮ በመመልከት ትምህርትዎን ያሳድጉ።</em>
            </p>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding: 0 32px 30px;">
          <a href="${SITE_URL}/dashboard" target="_blank" style="display: block; background: linear-gradient(135deg, #3268ba 0%, #254f8e 100%); color: #ffffff; font-weight: 900; font-size: 15px; padding: 16px 30px; text-decoration: none; border-radius: 16px; text-align: center; box-shadow: 0 12px 30px rgba(50, 104, 186, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🚀 ትምህርቱን ይቀጥሉ (Resume Course)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b;">
          <p style="margin: 0;">Tsehay Campus Learning Management System</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

// 🌟 3. AI FEATURE REMINDER EMAIL
export function getAiReminderEmailHtml(data: AiReminderData): string {
  const displayName = data.name || 'የተከበሩ ተማሪ';

  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>የ Tsehay AI ረዳትዎን ሞክረውታል? - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(249,176,60,0.25);">
      
      <!-- Top Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #1f1a10 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px;">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.2); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🤖 24/7 INTELLIGENT TUTOR
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            የ Tsehay AI ረዳትዎን <span style="color: #f9b03c;">ሞክረውታል?</span>
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">ለማንኛውም የቢዝነስ እና የትምህርት ጥያቄዎ ፈጣን ምላሽ</p>
        </td>
      </tr>

      <!-- Message Body -->
      <tr>
        <td style="padding: 28px 32px 15px;">
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም <strong>${displayName}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
            በፀሐይ ካምፓስ ውስጥ የተካተተውን ብልህ የ <strong>Tsehay AI</strong> አጋዥ ሞክረውታል? የትምህርት ጥያቄዎችዎን ከመመለስ ባለፈ ለቢዝነስዎ አዳዲስ የገበያ ሀሳቦችን እና የቪዲዮ ስክሪፕቶችን በሰከንዶች ያዘጋጅልዎታል።
          </p>

          <!-- What AI can do list -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(249, 176, 60, 0.3); border-radius: 20px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: #f9b03c; text-transform: uppercase;">
              በ AI ምን መስራት ይችላሉ?
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
              <li>የዩቲዩብ ቪዲዮ ርዕሶችን እና አሳታፊ ስክሪፕቶችን ማመንጨት</li>
              <li>ከቻይና የሚመጡ ትርፋማ እቃዎችን ስትራቴጂ መጠየቅ</li>
              <li>የፌስቡክ እና የቲክቶክ ማስታወቂያ ፅሁፎችን ማዘጋጀት</li>
              <li>በኮርሶች ውስጥ ያልገቡዎትን ክፍሎች በአማርኛ ማብራራት</li>
            </ul>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding: 0 32px 30px;">
          <a href="${SITE_URL}/dashboard" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e59b2b 100%); color: #0b0f19; font-weight: 900; font-size: 15px; padding: 16px 30px; text-decoration: none; border-radius: 16px; text-align: center; box-shadow: 0 12px 30px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🤖 Tsehay AI ን አሁኑኑ ይሞክሩ (Try AI Now)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Tsehay Campus AI Engine</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

// 🌟 4. NEW COURSE LAUNCH ALERT EMAIL
export function getNewCourseAlertEmailHtml(data: NewCourseAlertData): string {
  const displayName = data.name || 'የተከበሩ ተማሪ';
  const courseTitle = data.courseTitle || 'አዲስ የክህሎት ስልጠና';
  const description = data.courseDescription || 'የቅርብ ጊዜውን የገበያ ተፈላጊ ክህሎት በአጭር ጊዜ ውስጥ ተምረው ተግባራዊ የሚያደርጉበት አዲስ ኮርስ ተዘጋጅቷል።';
  const instructor = data.instructor || 'ኢዮብ ሳህሌ (Eyoub Sahle)';
  const price = data.coursePrice ? `${data.coursePrice.toLocaleString()} ብር` : 'ቅናሽ ተደርጎበታል';
  const slug = data.courseSlug ? `/courses/${data.courseSlug}` : '/courses';

  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>አዲስ ኮርስ ተለቋል፡ ${courseTitle} - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(249,176,60,0.25);">
      
      <!-- Top Brand Header -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #1a160c 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.4);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px;">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🔥 NEW COURSE RELEASE
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            አዲስ ኮርስ <span style="color: #f9b03c;">ተለቋል!</span>
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">እውቀትዎን ያሳድጉ፤ ገቢዎን ይጨምሩ</p>
        </td>
      </tr>

      <!-- Message Body -->
      <tr>
        <td style="padding: 28px 32px 15px;">
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም <strong>${displayName}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
            ብዙዎች ሲጠብቁት የነበረው አዲሱ የ <strong>"${courseTitle}"</strong> ተግባራዊ ስልጠና አሁን በፀሐይ ካምፓስ ላይ በቀጥታ ተለቋል!
          </p>

          <!-- Course Feature Box -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(249, 176, 60, 0.35); border-radius: 20px; padding: 22px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 18px; font-weight: 900;">${courseTitle}</h3>
            <p style="margin: 0 0 14px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">${description}</p>
            
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
              <tr>
                <td style="color: #94a3b8; font-size: 12px; font-weight: 700;">አሰልጣኝ፡</td>
                <td align="right" style="color: #ffffff; font-size: 13px; font-weight: 900;">${instructor}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; font-size: 12px; font-weight: 700;">የትምህርት ዋጋ፡</td>
                <td align="right" style="color: #f9b03c; font-size: 14px; font-weight: 900;">${price}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding: 0 32px 30px;">
          <a href="${SITE_URL}${slug}" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e59b2b 100%); color: #0b0f19; font-weight: 900; font-size: 15px; padding: 16px 30px; text-decoration: none; border-radius: 16px; text-align: center; box-shadow: 0 12px 30px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🎓 ስለ ኮርሱ ይመልከቱ (View Course)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Tsehay Campus Educational Ecosystem</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

// 🌟 5. MENTORSHIP CONFIRMATION EMAIL (For Student / User)
export function getMentorshipUserEmailHtml(booking: MentorshipBooking): string {
  return `
  <!DOCTYPE html>
  <html lang="am">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>የማማከር ቀጠሮዎ ተረጋግጧል! - Tsehay Campus</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #f9b03c; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(249,176,60,0.2);">
      
      <!-- Top Brand Header with Ambient Glow -->
      <tr>
        <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, #131a2c 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(249, 176, 60, 0.35);">
          <div style="display: inline-block; background: #ffffff; padding: 8px 18px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <img src="${BRAND_LOGO_URL}" alt="Tsehay Campus Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
          </div>
          <br>
          <div style="display: inline-block; background: rgba(249, 176, 60, 0.15); border: 1px solid #f9b03c; color: #f9b03c; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🌟 1-ON-1 VIP MENTORSHIP
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 6px; line-height: 1.3;">
            የማማከር ቀጠሮዎ <span style="color: #f9b03c;">ተረጋግጧል!</span>
          </h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">ከኢዮብ ሳህሌ (Eyoub Sahle) ጋር የተያዘ የቀጥታ ማማከር</p>
        </td>
      </tr>

      <!-- Greeting & Overview -->
      <tr>
        <td style="padding: 28px 32px 15px;">
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.7; margin: 0 0 15px 0;">
            ሰላም <strong>${booking.name}</strong>፣
          </p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.7; margin: 0 0 20px 0;">
            የ 1-ለ-1 ማማከር ቀጠሮ ጥያቄዎ በተሳካ ሁኔታ ተመዝግቧል። አሰልጣኝ ኢዮብ ሳህሌ መረጃዎን ተመልክቶ በስልክዎ (<strong>${booking.phone}</strong>) ወይም በቴሌግራም በቅርቡ የሚያገኝዎት ይሆናል።
          </p>

          <!-- Booking Summary Card -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(249, 176, 60, 0.3); border-radius: 20px; padding: 22px; margin-bottom: 20px; box-shadow: inset 0 0 20px rgba(249,176,60,0.05);">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">ቀን (Selected Date):</td>
                <td align="right" style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 900;">${booking.date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">ሰዓት (Time):</td>
                <td align="right" style="padding: 6px 0; color: #f9b03c; font-size: 13px; font-weight: 900;">${booking.time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">የመገናኛ ዘዴ (Format):</td>
                <td align="right" style="padding: 6px 0; color: #38bdf8; font-size: 13px; font-weight: 900;">Google Meet / Phone Call</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase;">የማማከሪያ ርዕስ (Topic):</td>
                <td align="right" style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 700; max-width: 250px;">${booking.topic}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding: 0 32px 25px;">
          <a href="${SITE_URL}/dashboard" target="_blank" style="display: block; background: linear-gradient(135deg, #f9b03c 0%, #e59b2b 100%); color: #0b0f19; font-weight: 900; font-size: 15px; padding: 16px 30px; text-decoration: none; border-radius: 16px; text-align: center; box-shadow: 0 12px 30px rgba(249, 176, 60, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🎓 ወደ ተማሪ ዳሽቦርድ ይግቡ (Open Dashboard)
          </a>
        </td>
      </tr>

      <!-- Footer Note -->
      <tr>
        <td style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
            ጥያቄ ወይም እርዳታ ካስፈለገዎት፡ <a href="https://t.me/EyoubSahle" style="color: #f9b03c; text-decoration: none; font-weight: 700;">@EyoubSahle</a>
          </p>
          <p style="margin: 0; font-size: 11px; color: #64748b;">
            © ${new Date().getFullYear()} Tsehay Campus. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}

// 🌟 6. MENTORSHIP ADMIN ALERT EMAIL
export function getMentorshipAdminEmailHtml(booking: MentorshipBooking): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Mentorship Booking: ${booking.name}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; margin: 0; padding: 35px 15px; color: #ffffff;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #0b0f19; border: 2px solid #3268ba; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.9), 0 0 50px rgba(50,104,186,0.25);">
      
      <!-- Top Admin Header -->
      <tr>
        <td align="center" style="padding: 30px 25px 20px; background: linear-gradient(180deg, #121e36 0%, #0b0f19 100%); border-bottom: 1px dashed rgba(50, 104, 186, 0.4);">
          <div style="display: inline-block; background: rgba(50, 104, 186, 0.2); border: 1px solid #3268ba; color: #60a5fa; font-size: 11px; font-weight: 900; padding: 5px 16px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
            🔔 NEW MENTORSHIP REQUEST
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 6px 0; line-height: 1.3;">
            አዲስ የማማከር ቀጠሮ ጥያቄ ቀርቧል
          </h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">ከ ${booking.name}</p>
        </td>
      </tr>

      <!-- Student Details Table -->
      <tr>
        <td style="padding: 25px 30px 15px;">
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 22px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">የተማሪው ሙሉ ስም:</td>
                <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 900;">${booking.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">ስልክ ቁጥር:</td>
                <td align="right" style="padding: 8px 0; color: #f9b03c; font-size: 14px; font-weight: 900;">
                  <a href="tel:${booking.phone}" style="color: #f9b03c; text-decoration: none;">${booking.phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">ኢሜይል:</td>
                <td align="right" style="padding: 8px 0; color: #38bdf8; font-size: 13px; font-weight: 700;">
                  <a href="mailto:${booking.email}" style="color: #38bdf8; text-decoration: none;">${booking.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">የተመረጠው ቀን:</td>
                <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px; font-weight: 900;">${booking.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 700;">የተመረጠው ሰዓት:</td>
                <td align="right" style="padding: 8px 0; color: #f9b03c; font-size: 13px; font-weight: 900;">${booking.time}</td>
              </tr>
            </table>

            <!-- Topic Discussion Box -->
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 6px;">ማማከር የሚፈልጉት ርዕስ (Topic):</span>
              <p style="background: #06090e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; font-size: 13px; color: #e2e8f0; line-height: 1.6; margin: 0;">
                ${booking.topic}
              </p>
            </div>
          </div>
        </td>
      </tr>

      <!-- Action Button -->
      <tr>
        <td align="center" style="padding: 10px 30px 25px;">
          <a href="${SITE_URL}/admin" target="_blank" style="display: block; background: linear-gradient(135deg, #3268ba 0%, #254f8e 100%); color: #ffffff; font-weight: 900; font-size: 14px; padding: 15px 28px; text-decoration: none; border-radius: 14px; text-align: center; box-shadow: 0 10px 25px rgba(50, 104, 186, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            🔒 ወደ አድሚን ዳሽቦርድ ይግቡ (Open Admin Panel)
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 16px 30px; background-color: #070a12; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: #64748b;">
          <p style="margin: 0;">Tsehay Campus Automated Booking Engine</p>
        </td>
      </tr>

    </table>
  </body>
  </html>
  `;
}
