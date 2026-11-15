'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Conversation {
  id: string
  participant: {
    id: string
    display_name: string
    avatar_url?: string
    role?: string
  }
  lastMessage?: {
    content: string
    created_at: string
    sender_id: string
  }
  unreadCount: number
}

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchUsers, setSearchUsers] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [creatingConversation, setCreatingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markAsRead(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

    try {
      // Get user's conversations
      const { data: participantsData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      if (!participantsData || participantsData.length === 0) {
        setLoading(false)
        return
      }

      const conversationIds = participantsData.map(p => p.conversation_id)

      // Get other participants
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id)

      const userIds = [...new Set(otherParticipants?.map(p => p.user_id) || [])]

      // Get user details
      let usersMap = new Map()
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name, avatar_url, role')
          .in('id', userIds)

        if (usersData) {
          usersMap = new Map(usersData.map(u => [u.id, u]))
        }
      }

      // Get last message for each conversation
      const { data: messagesData } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      const lastMessageMap = new Map<string, any>()
      messagesData?.forEach(m => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, m)
        }
      })

      // Count unread messages
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id, id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id)

      const unreadMap = new Map<string, number>()
      unreadData?.forEach(m => {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1)
      })

      // Build conversations
      const convs: Conversation[] = conversationIds.map(convId => {
        const otherParticipant = otherParticipants?.find(p => p.conversation_id === convId)
        const userData = usersMap.get(otherParticipant?.user_id)
        const lastMsg = lastMessageMap.get(convId)

        return {
          id: convId,
          participant: {
            id: userData?.id || '',
            display_name: userData?.display_name || 'Utilisateur',
            avatar_url: userData?.avatar_url,
            role: userData?.role
          },
          lastMessage: lastMsg ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id
          } : undefined,
          unreadCount: unreadMap.get(convId) || 0
        }
      }).filter(c => c.participant.id)
        .sort((a, b) => {
          const dateA = a.lastMessage?.created_at || ''
          const dateB = b.lastMessage?.created_at || ''
          return new Date(dateB).getTime() - new Date(dateA).getTime()
        })

      setConversations(convs)

      // Auto-select first conversation if none selected
      if (convs.length > 0 && !selectedConversation) {
        setSelectedConversation(convs[0])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }

    setLoading(false)
  }

  const fetchMessages = async (conversationId: string) => {
    const supabase = createClient()

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const markAsRead = async (conversationId: string) => {
    if (!currentUserId) return

    const supabase = createClient()

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)

    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ))
  }

  const sendMessage = async () => {
  if (!newMessage.trim() || !selectedConversation || !currentUserId) return

  setSending(true)
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: selectedConversation.id,
      sender_id: currentUserId,
      content: newMessage.trim()
    })
    .select()
    .single()

  if (!error && data) {
    setMessages(prev => [...prev, data])
    setNewMessage('')

    // Update conversation in list
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? { ...c, lastMessage: { content: data.content, created_at: data.created_at, sender_id: data.sender_id } }
        : c
    ).sort((a, b) => {
      const dateA = a.lastMessage?.created_at || ''
      const dateB = b.lastMessage?.created_at || ''
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    }))

    // Create notification for recipient
    console.log('Creating notification for:', selectedConversation.participant.id)
    
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: selectedConversation.participant.id,
        type: 'new_message',
        title: 'Nouveau message',
        message: `Vous avez reçu un nouveau message`,
        link: '/messages',
        is_read: false
      })
      .select()

    if (notifError) {
      console.error('Notification error:', notifError)
    } else {
      console.log('Notification created:', notifData)
    }
  } else {
    console.error('Send message error:', error)
  }

  setSending(false)
}
  const searchAvailableUsers = async (query: string) => {
    if (query.length < 2) {
      setAvailableUsers([])
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, role, avatar_url')
      .ilike('display_name', `%${query}%`)
      .neq('id', currentUserId)
      .limit(10)

    if (error) {
      console.error('Search error:', error)
      return
    }

    setAvailableUsers(data || [])
  }

  const startNewConversation = async (userId: string) => {
    if (!currentUserId || creatingConversation) return

    setCreatingConversation(true)
    const supabase = createClient()

    try {
      // Check if conversation already exists between these two users
      const { data: myConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      if (myConversations && myConversations.length > 0) {
        const conversationIds = myConversations.map(c => c.conversation_id)

        // Check if the other user is in any of these conversations
        const { data: existingConv } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId)
          .in('conversation_id', conversationIds)
          .limit(1)

        if (existingConv && existingConv.length > 0) {
          // Conversation already exists, select it
          const existingConvId = existingConv[0].conversation_id
          const existing = conversations.find(c => c.id === existingConvId)

          if (existing) {
            setSelectedConversation(existing)
          } else {
            await fetchConversations()
          }

          setShowNewChat(false)
          setSearchUsers('')
          setAvailableUsers([])
          setCreatingConversation(false)
          return
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ created_at: new Date().toISOString() })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        alert('Erreur lors de la création de la conversation: ' + convError.message)
        setCreatingConversation(false)
        return
      }

      if (!newConv) {
        console.error('No conversation returned')
        alert('Erreur: aucune conversation créée')
        setCreatingConversation(false)
        return
      }

      // Add both participants
      const { error: participant1Error } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: currentUserId })

      if (participant1Error) {
        console.error('Error adding participant 1:', participant1Error)
      }

      const { error: participant2Error } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: userId })

      if (participant2Error) {
        console.error('Error adding participant 2:', participant2Error)
      }

      // Get the other user's info
      const { data: otherUser } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, role')
        .eq('id', userId)
        .single()

      // Add to conversations list and select
      const newConversation: Conversation = {
        id: newConv.id,
        participant: {
          id: otherUser?.id || userId,
          display_name: otherUser?.display_name || 'Utilisateur',
          avatar_url: otherUser?.avatar_url,
          role: otherUser?.role
        },
        unreadCount: 0
      }

      setConversations(prev => [newConversation, ...prev])
      setSelectedConversation(newConversation)
      setMessages([])
      setShowNewChat(false)
      setSearchUsers('')
      setAvailableUsers([])

    } catch (error) {
      console.error('Error:', error)
      alert('Une erreur est survenue')
    }

    setCreatingConversation(false)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
      {/* Conversations List */}
      <div style={{ width: '340px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>Messages</h1>
            <button
              onClick={() => setShowNewChat(true)}
              style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#2b8cee', color: 'white', border: 'none', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              +
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher..."
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <p style={{ color: '#617589', marginBottom: '16px' }}>Aucune conversation</p>
              <button
                onClick={() => setShowNewChat(true)}
                style={{ padding: '10px 20px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Démarrer une conversation
              </button>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  backgroundColor: selectedConversation?.id === conv.id ? '#f3f4f6' : 'transparent',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                    {getInitials(conv.participant.display_name)}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#dc2626', color: 'white', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <p style={{ fontWeight: conv.unreadCount > 0 ? '700' : '600', color: '#111418', fontSize: '14px' }}>{conv.participant.display_name}</p>
                    {conv.lastMessage && (
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatTime(conv.lastMessage.created_at)}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: conv.participant.role === 'teacher' ? '#dbeafe' : '#d1fae5', color: conv.participant.role === 'teacher' ? '#2563eb' : '#16a34a', borderRadius: '4px', fontWeight: '500' }}>
                      {conv.participant.role === 'teacher' ? 'Prof' : 'Élève'}
                    </span>
                    {conv.lastMessage && (
                      <p style={{ fontSize: '13px', color: conv.unreadCount > 0 ? '#111418' : '#617589', fontWeight: conv.unreadCount > 0 ? '500' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {conv.lastMessage.sender_id === currentUserId ? 'Vous: ' : ''}{conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {getInitials(selectedConversation.participant.display_name)}
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#111418' }}>{selectedConversation.participant.display_name}</p>
                <p style={{ fontSize: '13px', color: '#617589' }}>
                  {selectedConversation.participant.role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Élève'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
                  <p style={{ color: '#9ca3af' }}>Démarrez la conversation !</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUserId
                  const showDate = index === 0 ||
                    new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '10px' }}>
                            {new Date(msg.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          backgroundColor: isMe ? '#2b8cee' : '#f3f4f6',
                          color: isMe ? 'white' : '#111418'
                        }}>
                          <p style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                          <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7, textAlign: 'right' }}>
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Écrivez votre message..."
                    rows={1}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: newMessage.trim() ? '#2b8cee' : '#e5e7eb',
                    color: newMessage.trim() ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: newMessage.trim() && !sending ? 'pointer' : 'not-allowed'
                  }}
                >
                  {sending ? '...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
            <p style={{ color: '#617589', marginBottom: '16px' }}>Sélectionnez une conversation</p>
            <button
              onClick={() => setShowNewChat(true)}
              style={{ padding: '12px 24px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
            >
              Nouvelle conversation
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewChat(false)
              setSearchUsers('')
              setAvailableUsers([])
            }
          }}
        >
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '450px', maxHeight: '500px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>Nouvelle conversation</h2>
              <button
                onClick={() => { setShowNewChat(false); setSearchUsers(''); setAvailableUsers([]) }}
                style={{ background: 'none', border: 'none', fontSize: '28px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchUsers}
                onChange={(e) => {
                  setSearchUsers(e.target.value)
                  searchAvailableUsers(e.target.value)
                }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px' }}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '0 24px 24px' }}>
              {availableUsers.length > 0 ? (
                availableUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => startNewConversation(user.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      cursor: creatingConversation ? 'wait' : 'pointer',
                      marginBottom: '8px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!creatingConversation) {
                        e.currentTarget.style.backgroundColor = '#e5e7eb'
                        e.currentTarget.style.borderColor = '#2b8cee'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                      e.currentTarget.style.borderColor = 'transparent'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: user.role === 'teacher' ? '#2563eb' : '#16a34a',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {getInitials(user.display_name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{user.display_name}</p>
                      <p style={{ fontSize: '13px', color: '#617589' }}>
                        {user.role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Élève'}
                      </p>
                    </div>
                    <div style={{ color: '#2b8cee', fontSize: '24px' }}>→</div>
                  </div>
                ))
              ) : searchUsers.length >= 2 ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                  <p style={{ color: '#9ca3af' }}>Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>👆</div>
                  <p style={{ color: '#9ca3af' }}>Tapez au moins 2 caractères pour rechercher</p>
                </div>
              )}

              {creatingConversation && (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <p style={{ color: '#2b8cee', fontWeight: '500' }}>Création de la conversation...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}