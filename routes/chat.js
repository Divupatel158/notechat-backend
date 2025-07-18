const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const fetchuser = require('../middleware/fetchuser');

// Get all users you've chatted with (contacts)
router.get('/chats', fetchuser, async (req, res) => {
  const userId = req.user.id;
  console.log('DEBUG /chats: userId =', userId);

  // Query for sent messages
  const { data: sentMessages, error: sentError } = await supabase
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('sender_id', userId);
  if (sentError) return res.status(500).json({ error: sentError.message });

  // Query for received messages
  const { data: receivedMessages, error: receivedError } = await supabase
    .from('messages')
    .select('sender_id, receiver_id')
    .eq('receiver_id', userId);
  if (receivedError) return res.status(500).json({ error: receivedError.message });

  // Merge and deduplicate messages
  const messages = [...(sentMessages || []), ...(receivedMessages || [])];
  console.log('DEBUG /chats: found messages =', messages);

  // Collect unique user IDs (excluding yourself)
  const contactIds = new Set();
  messages.forEach(msg => {
    if (msg.sender_id !== userId) contactIds.add(msg.sender_id);
    if (msg.receiver_id !== userId) contactIds.add(msg.receiver_id);
  });
  console.log('DEBUG /chats: contactIds =', Array.from(contactIds));
  if (contactIds.size === 0) return res.json({ contacts: [] });
  // Fetch email and uname for each contact
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, uname')
    .in('id', Array.from(contactIds));
  if (userError) return res.status(500).json({ error: userError.message });
  console.log('DEBUG /chats: users =', users);
  res.json({ contacts: users });
});

// Get all messages between you and another user (by email)
router.get('/messages/:email', fetchuser, async (req, res) => {
  const userId = req.user.id;
  const otherEmail = req.params.email;
  // Find the other user's id by email
  const { data: otherUser, error: otherUserError } = await supabase
    .from('users')
    .select('id, email, uname')
    .eq('email', otherEmail)
    .single();
  if (otherUserError || !otherUser) return res.status(404).json({ error: 'User not found' });
  const otherUserId = otherUser.id;
  // Fetch messages between the two users
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  // Optionally, include sender/receiver email and uname in each message
  // Fetch all involved users
  const userIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])));
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, uname')
    .in('id', userIds);
  if (usersError) return res.status(500).json({ error: usersError.message });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const messagesWithUser = messages.map(m => ({
    ...m,
    sender: userMap[m.sender_id],
    receiver: userMap[m.receiver_id],
  }));
  res.json({ messages: messagesWithUser });
});

// Send a message to another user (by email)
router.post('/messages', fetchuser, async (req, res) => {
  const sender_id = req.user.id;
  const { receiver_email, content } = req.body;
  console.log('POST /messages called:', { sender_id, receiver_email, content });
  if (!receiver_email || !content) {
    console.warn('Missing receiver_email or content');
    return res.status(400).json({ error: 'receiver_email and content are required' });
  }
  // Find receiver's id by email
  const { data: receiver, error: receiverError } = await supabase
    .from('users')
    .select('id, email, uname')
    .eq('email', receiver_email)
    .single();
  if (receiverError || !receiver) {
    console.warn('Receiver not found:', receiverError);
    return res.status(404).json({ error: 'Receiver not found', details: receiverError?.message });
  }
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id, receiver_id: receiver.id, content }])
      .select()
      .single();
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message, details: error });
    }
    res.json({ message: data });
    // Emit WebSocket event to both sender and receiver by email
    if (req.io) {
      req.io.to(receiver.email).emit('message:new', data);
      // Also emit to sender (in case sender has multiple tabs)
      const senderUser = req.user;
      if (senderUser && senderUser.email) {
        req.io.to(senderUser.email).emit('message:new', data);
      }
    }
  } catch (err) {
    console.error('Unexpected error in /messages:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Delete all messages between you and another user (by email)
router.delete('/messages/:email', fetchuser, async (req, res) => {
  const userId = req.user.id;
  const otherEmail = req.params.email;
  // Find the other user's id by email
  const { data: otherUser, error: otherUserError } = await supabase
    .from('users')
    .select('id, email, uname')
    .eq('email', otherEmail)
    .single();
  if (otherUserError || !otherUser) return res.status(404).json({ error: 'User not found' });
  const otherUserId = otherUser.id;
  // Delete messages between the two users
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, deletedCount: data ? data.length : 0 });
});

// Mark all messages from a specific sender to the current user as read
router.patch('/messages/read/:email', fetchuser, async (req, res) => {
  const userId = req.user.id; // current user (receiver)
  const senderEmail = req.params.email;
  // Find the sender's id by email
  const { data: sender, error: senderError } = await supabase
    .from('users')
    .select('id, email, uname')
    .eq('email', senderEmail)
    .single();
  if (senderError || !sender) return res.status(404).json({ error: 'Sender not found' });
  // Update all unread messages from sender to this user
  const { data: updated, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', sender.id)
    .eq('receiver_id', userId)
    .is('read_at', null)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  // Emit WebSocket event to sender for each message read
  if (req.io && updated && updated.length > 0) {
    req.io.to(sender.email).emit('message:read', {
      messageIds: updated.map(m => m.id),
      receiverEmail: req.user.email
    });
  }
  res.json({ success: true, updatedCount: updated ? updated.length : 0 });
});

// WebSocket connection handler for joining rooms by email
// This is not an Express route, but a function to be called from index.js if needed
// If you want to handle socket.io connections here, you can export a function
// Example usage in index.js:
//   io.on('connection', require('./routes/chat').socketHandler);

module.exports = router; 