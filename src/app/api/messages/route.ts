import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function getConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1.trim(), uid2.trim()].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

// 1. SEND DIRECT MESSAGE
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const {
      messageId: passedMsgId,
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
      imageUrl,
      status = 'sent'
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
    const messageId = passedMsgId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
      updatedAt: nowIso,
      timestamp: Date.now(),
      isRead: false,
      read: false,
      status: status || 'sent',
      readAt: null,
      isEdited: false,
      isDeleted: false
    };

    if (adminDb) {
      const writes: Promise<any>[] = [
        // 1. Root direct_messages
        adminDb.collection('direct_messages').doc(messageId).set(msgPayload, { merge: true }),
        // 2. Root conversation messages subcollection
        adminDb.collection('community_conversations').doc(conversationId).collection('messages').doc(messageId).set(msgPayload, { merge: true }),
        // 3. Artifact conversation messages subcollection
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).collection('messages').doc(messageId).set(msgPayload, { merge: true }),
        // 4. Legacy artifact direct_messages
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('public').doc('data').collection('direct_messages').doc(messageId).set(msgPayload, { merge: true })
      ];

      // Conversation metadata
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
        lastMessage: messageContent || (finalImage ? '📷 ምስል ተልኳል' : ''),
        lastMessageSenderId: senderId,
        lastMessageTime: nowIso,
        updatedAt: nowIso
      };

      writes.push(
        adminDb.collection('community_conversations').doc(conversationId).set(convData, { merge: true }),
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).set(convData, { merge: true })
      );

      await Promise.allSettled(writes);
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

// 2. GET CONVERSATION MESSAGES
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationIdParam = searchParams.get('conversationId');
    const senderId = searchParams.get('senderId') || searchParams.get('currentUser');
    const receiverId = searchParams.get('receiverId') || searchParams.get('user');

    const conversationId = conversationIdParam || (senderId && receiverId ? getConversationId(senderId, receiverId) : null);

    const messageMap = new Map<string, any>();

    if (adminDb && conversationId) {
      const convVariants = [conversationId];
      if (!conversationId.startsWith('conv_')) convVariants.push(`conv_${conversationId}`);
      else convVariants.push(conversationId.replace(/^conv_/, ''));

      for (const cId of convVariants) {
        try {
          // 1. Root conversation messages
          const snap1 = await adminDb
            .collection('community_conversations')
            .doc(cId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(150)
            .get();
          snap1.docs.forEach(d => messageMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (e) {}

        try {
          // 2. Artifact conversation messages
          const snap2 = await adminDb
            .collection('artifacts')
            .doc('tsehaycampus-e1a6d')
            .collection('community_conversations')
            .doc(cId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(150)
            .get();
          snap2.docs.forEach(d => messageMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (e) {}
      }

      // 3. Fallback direct_messages
      if (messageMap.size === 0) {
        try {
          const snap3 = await adminDb
            .collection('direct_messages')
            .where('conversationId', '==', conversationId)
            .limit(150)
            .get();
          snap3.docs.forEach(d => messageMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (e) {}
      }
    }

    const messages = Array.from(messageMap.values()).map(m => ({
      ...m,
      status: m.status || (m.isRead || m.read ? 'read' : 'delivered'),
      isRead: Boolean(m.isRead || m.read || m.status === 'read'),
    }));

    messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

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

// 3. PATCH (MARK AS READ OR EDIT MESSAGE)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, conversationId, readerUid, messageId, content } = body;

    if (!adminDb) {
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_read' && conversationId && readerUid) {
      const nowIso = new Date().toISOString();
      const updates: Promise<any>[] = [];

      const collections = [
        adminDb.collection('community_conversations').doc(conversationId).collection('messages'),
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).collection('messages'),
      ];

      for (const col of collections) {
        try {
          const snap = await col.where('receiverId', '==', readerUid).get();
          snap.docs.forEach(d => {
            if (d.data()?.status !== 'read') {
              updates.push(d.ref.update({
                status: 'read',
                isRead: true,
                read: true,
                readAt: nowIso
              }));
            }
          });
        } catch (e) {}
      }

      await Promise.allSettled(updates);
      return NextResponse.json({ success: true, message: 'Messages marked as read' });
    }

    if (action === 'edit' && conversationId && messageId && content) {
      const docRef1 = adminDb.collection('community_conversations').doc(conversationId).collection('messages').doc(messageId);
      const docRef2 = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).collection('messages').doc(messageId);

      const existingSnap = await docRef1.get();
      const existingData = existingSnap.exists ? existingSnap.data() : (await docRef2.get()).data();

      // Enforce WhatsApp rule: if recipient has read it, cannot edit!
      if (existingData && (existingData.status === 'read' || existingData.isRead || existingData.read)) {
        return NextResponse.json({
          success: false,
          error: 'ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ ማስተካከል አይቻልም። (Message already read by recipient)'
        }, { status: 403 });
      }

      const updateData = {
        content: content.trim(),
        isEdited: true,
        updatedAt: new Date().toISOString()
      };

      await Promise.allSettled([
        docRef1.update(updateData).catch(() => {}),
        docRef2.update(updateData).catch(() => {}),
        adminDb.collection('direct_messages').doc(messageId).update(updateData).catch(() => {})
      ]);

      return NextResponse.json({ success: true, message: 'Message edited successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid PATCH action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. DELETE (SOFT DELETE WITH WHATSAPP RESTRICTION)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { conversationId, messageId, isAdmin } = body;

    if (!adminDb || !conversationId || !messageId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const docRef1 = adminDb.collection('community_conversations').doc(conversationId).collection('messages').doc(messageId);
    const docRef2 = adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).collection('messages').doc(messageId);

    const existingSnap = await docRef1.get();
    const existingData = existingSnap.exists ? existingSnap.data() : (await docRef2.get()).data();

    // Enforce WhatsApp rule: if recipient has read it, sender cannot delete it unless Admin!
    if (!isAdmin && existingData && (existingData.status === 'read' || existingData.isRead || existingData.read)) {
      return NextResponse.json({
        success: false,
        error: 'ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ መሰረዝ አይቻልም። (Message already read by recipient)'
      }, { status: 403 });
    }

    const softDeleteData = {
      content: '🚫 ይህ መልእክት ተሰርዟል (This message was deleted)',
      imageUrl: null,
      isDeleted: true,
      updatedAt: new Date().toISOString()
    };

    await Promise.allSettled([
      docRef1.update(softDeleteData).catch(() => {}),
      docRef2.update(softDeleteData).catch(() => {}),
      adminDb.collection('direct_messages').doc(messageId).update(softDeleteData).catch(() => {})
    ]);

    return NextResponse.json({ success: true, message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
