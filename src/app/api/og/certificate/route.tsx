import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || 'TC-CERT-VERIFIED';
    const name = searchParams.get('name') || 'Tsehay Graduate';
    const course = searchParams.get('course') || 'Mastery Masterclass';
    const date = searchParams.get('date') || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#03060f',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 176, 60, 0.15) 0%, rgba(3, 6, 15, 1) 80%)',
            padding: '40px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Certificate Outer Border */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#0a0f1d',
              border: '6px solid #f9b03c',
              borderRadius: '24px',
              padding: '36px 48px',
              position: 'relative',
            }}
          >
            {/* Top Logo & Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(249, 176, 60, 0.15)',
                  border: '1px solid rgba(249, 176, 60, 0.4)',
                  padding: '6px 18px',
                  borderRadius: '999px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ color: '#f9b03c', fontSize: '14px', fontWeight: '900', letterSpacing: '2px' }}>
                  ★ TSEHAY CAMPUS OFFICIAL CREDENTIAL ★
                </span>
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#f9b03c', margin: 0, textTransform: 'uppercase' }}>
                Certificate of Completion & Mastery
              </h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '4px 0 0 0', letterSpacing: '1px' }}>
                ትክክለኛነቱ የተረጋገጠ ይፋዊ የምስክር ወረቀት
              </p>
            </div>

            {/* Recipient Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '16px 0' }}>
              <p style={{ fontSize: '14px', color: '#cbd5e1', fontStyle: 'italic', margin: '0 0 6px 0' }}>
                This is proudly presented to
              </p>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: '900',
                  color: '#ffffff',
                  borderBottom: '2px solid rgba(249, 176, 60, 0.6)',
                  paddingBottom: '6px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                }}
              >
                {name}
              </div>
              <p style={{ fontSize: '16px', color: '#cbd5e1', marginTop: '12px', maxWidth: '750px' }}>
                For successfully mastering all coursework, assignments, and practical exams in <strong style={{ color: '#f9b03c' }}>{course}</strong>.
              </p>
            </div>

            {/* Footer Signatures, Seal & ID */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '16px',
              }}
            >
              {/* Instructor */}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ color: '#f9b03c', fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic' }}>Eyob Sahle</span>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold' }}>ኢዮብ ሳህሌ (መስራች)</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Lead Instructor</span>
              </div>

              {/* Digital Seal */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(249, 176, 60, 0.1)',
                  border: '2px solid #f9b03c',
                  borderRadius: '999px',
                  width: '74px',
                  height: '74px',
                }}
              >
                <span style={{ color: '#f9b03c', fontSize: '18px' }}>✓</span>
                <span style={{ color: '#f9b03c', fontSize: '8px', fontWeight: '900' }}>VERIFIED</span>
              </div>

              {/* Date & ID */}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>{date}</span>
                <span style={{ color: '#f9b03c', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{id}</span>
                <span style={{ color: '#10b981', fontSize: '10px', fontWeight: 'bold' }}>● Authentic Credential</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
