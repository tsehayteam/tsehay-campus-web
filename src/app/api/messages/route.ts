export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function getConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1.trim(), uid2.trim()].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

async function getSupabaseData<T>(key: string, defaultVal: T): Promise<T> {
  try {
    const { data: row, error } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (!error && row?.data) {
      return row.data as T;
    }
  } catch (e) {
    console.warn(`Supabase ${key} fetch warning:`, e);
  }
  return defaultVal;
}

async function saveSupabaseData(key: string, data: any) {
  try {
    await supabaseServer
      .from('site_settings')
      .upsert({
        key,
        data,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn(`Supabase ${key} upsert warning:`, e);
  }
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

    // 1. Update Direct Messages in Supabase
    const allMessagesMap = await getSupabaseData<Record<string, any[]>>('direct_messages', {});
    const convMessages = allMessagesMap[conversationId] || [];
    allMessagesMap[conversationId] = [...convMessages.filter(m => m.id !== messageId), msgPayload];
    await saveSupabaseData('direct_messages', allMessagesMap);

    // 2. Update Conversations in Supabase
    const allConversations = await getSupabaseData<any[]>('community_conversations', []);
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

    const updatedConvs = [convData, ...allConversations.filter(c => c.id !== conversationId)];
    await saveSupabaseData('community_conversations', updatedConvs);

    return NextResponse.json({
      success: true,
      message: 'መልዕክቱ በተሳካ ሁኔታ ተልኳል (Message sent successfully)',
      data: msgPayload
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// 2. GET CONVERSATION MESSAGES OR USER CONVERSATIONS
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationIdParam = searchParams.get('conversationId');
    const senderId = searchParams.get('senderId') || searchParams.get('currentUser');
    const receiverId = searchParams.get('receiverId') || searchParams.get('user');
    const userId = searchParams.get('userId');

    // If fetching user conversations list
    if (userId && !conversationIdParam && !receiverId) {
      const allConversations = await getSupabaseData<any[]>('community_conversations', []);
      const userConvs = allConversations.filter(c => Array.isArray(c.participants) && c.participants.includes(userId));
      return NextResponse.json({ success: true, conversations: userConvs }, { headers: NO_CACHE_HEADERS });
    }

    const conversationId = conversationIdParam || (senderId && receiverId ? getConversationId(senderId, receiverId) : null);

    if (!conversationId) {
      return NextResponse.json({ success: true, count: 0, messages: [] }, { headers: NO_CACHE_HEADERS });
    }

    const allMessagesMap = await getSupabaseData<Record<string, any[]>>('direct_messages', {});
    let messages = allMessagesMap[conversationId] || [];

    // Fallback if prefixed
    if (messages.length === 0) {
      const altKey = conversationId.startsWith('conv_') ? conversationId.replace(/^conv_/, '') : `conv_${conversationId}`;
      messages = allMessagesMap[altKey] || [];
    }

    const formattedMessages = messages.map(m => ({
      ...m,
      status: m.status || (m.isRead || m.read ? 'read' : 'delivered'),
      isRead: Boolean(m.isRead || m.read || m.status === 'read'),
    }));

    formattedMessages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    return NextResponse.json({
      success: true,
      count: formattedMessages.length,
      messages: formattedMessages
    }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json({ success: true, count: 0, messages: [] }, { headers: NO_CACHE_HEADERS });
  }
}

// 3. PATCH (MARK AS READ OR EDIT MESSAGE)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, conversationId, readerUid, messageId, content } = body;

    const allMessagesMap = await getSupabaseData<Record<string, any[]>>('direct_messages', {});

    if (action === 'mark_read' && conversationId && readerUid) {
      const nowIso = new Date().toISOString();
      const convMessages = allMessagesMap[conversationId] || [];
      allMessagesMap[conversationId] = convMessages.map(m => {
        if (m.receiverId === readerUid && m.status !== 'read') {
          return { ...m, status: 'read', isRead: true, read: true, readAt: nowIso };
        }
        return m;
      });

      await saveSupabaseData('direct_messages', allMessagesMap);
      return NextResponse.json({ success: true, message: 'Messages marked as read' }, { headers: NO_CACHE_HEADERS });
    }

    if (action === 'edit' && conversationId && messageId && content) {
      const convMessages = allMessagesMap[conversationId] || [];
      const target = convMessages.find(m => m.id === messageId);

      // Enforce WhatsApp rule: if recipient has read it, cannot edit!
      if (target && (target.status === 'read' || target.isRead || target.read)) {
        return NextResponse.json({
          success: false,
          error: 'ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ ማስተካከል አይቻልም። (Message already read by recipient)'
        }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      allMessagesMap[conversationId] = convMessages.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            content: content.trim(),
            isEdited: true,
            updatedAt: new Date().toISOString()
          };
        }
        return m;
      });

      await saveSupabaseData('direct_messages', allMessagesMap);
      return NextResponse.json({ success: true, message: 'Message edited successfully' }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: false, error: 'Invalid PATCH action' }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in PATCH /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// 4. DELETE (SOFT DELETE WITH WHATSAPP RESTRICTION)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { conversationId, messageId, isAdmin } = body;

    if (!conversationId || !messageId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const allMessagesMap = await getSupabaseData<Record<string, any[]>>('direct_messages', {});
    const convMessages = allMessagesMap[conversationId] || [];
    const target = convMessages.find(m => m.id === messageId);

    // Enforce WhatsApp rule: if recipient has read it, sender cannot delete it unless Admin!
    if (!isAdmin && target && (target.status === 'read' || target.isRead || target.read)) {
      return NextResponse.json({
        success: false,
        error: 'ተቀባዩ መልዕክቱን አንብቦታል፤ ስለዚህ መሰረዝ አይቻልም። (Message already read by recipient)'
      }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    allMessagesMap[conversationId] = convMessages.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          content: '🚫 ይህ መልእክት ተሰርዟል (This message was deleted)',
          imageUrl: null,
          isDeleted: true,
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    await saveSupabaseData('direct_messages', allMessagesMap);
    return NextResponse.json({ success: true, message: 'Message deleted successfully' }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Error in DELETE /api/messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
