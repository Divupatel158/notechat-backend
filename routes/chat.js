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
    .order('timestamp', { ascending: true });
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
  if (!receiver_email || !content) {
    return res.status(400).json({ error: 'receiver_email and content are required' });
  }
  // Find receiver's id by email
  const { data: receiver, error: receiverError } = await supabase
    .from('users')
    .select('id, email, uname')
    .eq('email', receiver_email)
    .single();
  if (receiverError || !receiver) return res.status(404).json({ error: 'Receiver not found' });
  const { data, error } = await supabase
    .from('messages')
    .insert([{ sender_id, receiver_id: receiver.id, content }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: data });
});

module.exports = router; 