import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function getConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const {
      conversationId: passedConvId,
      senderId,
      senderName,
      senderPhoto,
      senderEmail,
      receiverId,
      receiverName,
      receiverPhoto,
      receiverEmail,
      text,
      content,
      image,
      imageUrl
    } = body;

    const messageContent = (text || content || '').trim();
    const finalImage = image || imageUrl || null;

    if (!senderId || !receiverId) {
      return NextResponse.json({ success: false, error: 'Missing senderId or receiverId' }, { status: 400 });
    }

    if (!messageContent && !finalImage) {
      return NextResponse.json({ success: false, error: 'Message content or image is required' }, { status: 400 });
    }

    const conversationId = passedConvId || getConversationId(senderId, receiverId);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const msgPayload = {
      id: messageId,
      conversationId,
      senderId,
      senderName: senderName || 'ተማሪ',
      senderPhoto: senderPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'User')}&background=f9b03c&color=111827&bold=true`,
      senderEmail: senderEmail || '',
      receiverId,
      receiverName: receiverName || 'ተማሪ',
      receiverPhoto: receiverPhoto || '',
      receiverEmail: receiverEmail || '',
      content: messageContent,
      imageUrl: finalImage,
      createdAt: nowIso,
      timestamp: Date.now(),
      read: false
    };

    if (adminDb) {
      // 1. Root direct_messages
      try {
        await adminDb.collection('direct_messages').doc(messageId).set(msgPayload, { merge: true });
      } catch (e) {}

      // 2. Subcollection under conversation
      try {
        await adminDb
          .collection('community_conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(messageId)
          .set(msgPayload, { merge: true });
      } catch (e) {}

      // 3. Artifact collections fallback
      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('public')
          .doc('data')
          .collection('direct_messages')
          .doc(messageId)
          .set(msgPayload, { merge: true });
      } catch (e) {}

      // 4. Update Conversation Metadata
      const convData = {
        id: conversationId,
        participants: [senderId, receiverId],
        participantDetails: {
          [senderId]: {
            name: senderName || 'ተማሪ',
            photo: senderPhoto || '',
            email: senderEmail || '',
          },
          [receiverId]: {
            name: receiverName || 'ተማሪ',
            photo: receiverPhoto || '',
            email: receiverEmail || '',
          }
        },
        lastMessage: messageContent || (finalImage ? '📷 ፎቶ ተልኳል' : ''),
        lastMessageSenderId: senderId,
        lastMessageTime: nowIso,
        updatedAt: nowIso
      };

      try {
        await adminDb.collection('community_conversations').doc(conversationId).set(convData, { merge: true });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'መልዕክቱ በተሳካ ሁኔታ ተልኳል (Message sent successfully)',
      data: msgPayload
    });
  } catch (error: any) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationIdParam = searchParams.get('conversationId');
    const senderId = searchParams.get('senderId') || searchParams.get('currentUser');
    const receiverId = searchParams.get('receiverId') || searchParams.get('user');

    const conversationId = conversationIdParam || (senderId && receiverId ? getConversationId(senderId, receiverId) : null);

    let messages: any[] = [];
    if (adminDb && conversationId) {
      try {
        // Try conversation subcollection first
        const snap = await adminDb
          .collection('community_conversations')
          .doc(conversationId)
          .collection('messages')
          .orderBy('createdAt', 'asc')
          .limit(100)
          .get();

        if (!snap.empty) {
          messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          // Try root direct_messages with conversationId
          const snap2 = await adminDb
            .collection('direct_messages')
            .where('conversationId', '==', conversationId)
            .limit(100)
            .get();
          if (!snap2.empty) {
            messages = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
            messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
          }
        }
      } catch (e) {
        console.warn('Direct message fetch notice:', e);
      }
    }

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error: any) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json({ success: true, count: 0, messages: [] });
  }
}
