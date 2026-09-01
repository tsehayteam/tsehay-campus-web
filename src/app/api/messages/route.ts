import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function getConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
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
      status: 'sent',
      isRead: false,
      read: false,
      isDeleted: false
    };

    if (adminDb) {
      // 1. Root direct_messages
      try {
        await adminDb.collection('direct_messages').doc(messageId).set(msgPayload, { merge: true });
      } catch (e) {}

      // 2. Subcollection under conversation (root & artifact)
      try {
        await adminDb
          .collection('community_conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(messageId)
          .set(msgPayload, { merge: true });
      } catch (e) {}

      try {
        await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('community_conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(messageId)
          .set(msgPayload, { merge: true });
      } catch (e) {}

      // 3. Update Conversation Metadata in both collections
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

      try {
        await adminDb.collection('community_conversations').doc(conversationId).set(convData, { merge: true });
      } catch (e) {}

      try {
        await adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).set(convData, { merge: true });
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

// 2. GET CONVERSATION MESSAGES
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
        // Try artifact subcollection first
        const snap = await adminDb
          .collection('artifacts')
          .doc('tsehaycampus-e1a6d')
          .collection('community_conversations')
          .doc(conversationId)
          .collection('messages')
          .orderBy('createdAt', 'asc')
          .limit(100)
          .get();

        if (!snap.empty) {
          messages = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => !m.isDeleted);
        } else {
          // Try root subcollection
          const snap2 = await adminDb
            .collection('community_conversations')
            .doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(100)
            .get();
          if (!snap2.empty) {
            messages = snap2.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => !m.isDeleted);
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

// 3. PATCH (MARK AS READ OR EDIT MESSAGE)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, conversationId, messageId, currentUserId, newContent, isSender, isAdmin } = body;

    if (!adminDb || !conversationId) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    // Action: Mark all unread messages as read
    if (action === 'mark_as_read') {
      if (!currentUserId) {
        return NextResponse.json({ success: false, error: 'Missing currentUserId' }, { status: 400 });
      }

      const paths = [
        adminDb.collection('artifacts').doc('tsehaycampus-e1a6d').collection('community_conversations').doc(conversationId).collection('messages'),
        adminDb.collection('community_conversations').doc(conversationId).collection('messages')
      ];

      for (const colRef of paths) {
        try {
          const snap = await colRef.where('receiverId', '==', currentUserId).get();
          const batch = adminDb.batch();
          let count = 0;
          snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status !== 'read' || !data.isRead) {
              batch.update(docSnap.ref, {
                status: 'read',
                isRead: true,
                read: true,
                readAt: new Date().toISOString()
              });
              count++;
            }
          });
          if (count > 0) await batch.commit();
        } catch (e) {}
      }

      return NextResponse.json({ success: true, message: 'Messages marked as read' });
    }

    // Action: Edit Message (Only if NOT read by recipient)
    if (action === 'edit') {
      if (!messageId || !newContent) {
        return NextResponse.json({ success: false, error: 'Missing messageId or newContent' }, { status: 400 });
      }

      // Check message read status first
      const msgRef = adminDb
        .collection('artifacts')
        .doc('tsehaycampus-e1a6d')
        .collection('community_conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId);

      const msgDoc = await msgRef.get();
      if (msgDoc.exists) {
        const msgData = msgDoc.data();
        if ((msgData?.status === 'read' || msgData?.isRead) && !isAdmin) {
          return NextResponse.json({
            success: false,
            error: 'ተነቦ የተጠናቀቀ መልዕክት ማስተካከል አይቻልም (Cannot edit a read message)'
          }, { status: 403 });
        }
      }

      const updatePayload = {
        content: newContent.trim(),
        isEdited: true,
        editedAt: new Date().toISOString()
      };

      try {
        await msgRef.update(updatePayload);
      } catch (e) {}

      try {
        await adminDb
          .collection('community_conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(messageId)
          .update(updatePayload);
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Message edited successfully' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// 4. DELETE MESSAGE (Only if unread, or if Admin)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const messageId = searchParams.get('messageId');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!adminDb || !conversationId || !messageId) {
      return NextResponse.json({ success: false, error: 'Missing conversationId or messageId' }, { status: 400 });
    }

    // Verify read status
    const msgRef = adminDb
      .collection('artifacts')
      .doc('tsehaycampus-e1a6d')
      .collection('community_conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(messageId);

    const msgDoc = await msgRef.get();
    if (msgDoc.exists) {
      const msgData = msgDoc.data();
      if ((msgData?.status === 'read' || msgData?.isRead) && !isAdmin) {
        return NextResponse.json({
          success: false,
          error: 'ተነቦ የተጠናቀቀ መልዕክት መሰረዝ አይቻልም (Cannot delete a read message)'
        }, { status: 403 });
      }
    }

    // Delete or mark deleted
    try {
      await msgRef.delete();
    } catch (e) {}

    try {
      await adminDb
        .collection('community_conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId)
        .delete();
    } catch (e) {}

    try {
      await adminDb.collection('direct_messages').doc(messageId).delete();
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
