
"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HomeIcon, Send, Search, MoreVertical, MessageSquare, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSocket } from "../../../context/socket-context"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getUserIdFromToken } from '../../../../lib/util/auth';

interface Message {
  id: string
  sender_id: string
  senderName: string
  senderRole: 'homeowner' | 'serviceprovider'
  senderImage?: string
  content: string
  timestamp: string
  read: boolean
}

interface Contact {
  id: string
  name: string
  email: string
  image?: string
  lastMessage?: string
  lastMessageTime?: string
  unread: boolean
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const userId = getUserIdFromToken() || session?.user?.id
    setCurrentUserId(userId)
  }, [session])

  const contactsRef = useRef<Contact[]>([])
  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true)
      try {
        const response = await api.get("/messages/contacts")
        setContacts(response.data.filter(
          (contact: Contact, index: number, self: Contact[]) =>
            index === self.findIndex((c: Contact) => c.id === contact.id)
        ))
      } catch (error) {
        console.error("Failed to fetch contacts:", error)
      } finally {
        setLoadingContacts(false)
      }
    }
    fetchContacts()
  }, [])

  // Handle contact selection from URL or default
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const contactId = urlParams.get("contact")
    if (!loadingContacts && contactId) {
      const existingContact = contacts.find(c => c.id === contactId)
      if (existingContact) {
        setSelectedContact(existingContact)
      } else {
        initializeConversation(contactId)
      }
    } else if (!loadingContacts && contacts.length > 0) {
      setSelectedContact(contacts[0])
    }
  }, [loadingContacts, contacts])

  // Fetch messages for selected contact
  useEffect(() => {
    if (selectedContact) {
      const fetchMessages = async () => {
        setLoadingMessages(true)
        try {
          const response = await api.get(`/messages/conversation/${selectedContact.id}`)
          setMessages(response.data)
        } catch (error) {
          console.error("Failed to fetch messages:", error)
        } finally {
          setLoadingMessages(false)
        }
      }
      fetchMessages()
      const urlParams = new URLSearchParams(window.location.search)
      urlParams.set("contact", selectedContact.id)
      router.replace(`?${urlParams.toString()}`, { scroll: false })
    }
  }, [selectedContact])

  // Initialize conversation
  const initializeConversation = async (providerId: string) => {
    const existing = contactsRef.current.find(c => c.id === providerId)
    if (existing) {
      setSelectedContact(existing)
      return
    }
    try {
      const response = await api.post("/messages/initiate", { provider_id: providerId })
      const providerData = response.data.provider
      const newContact: Contact = {
        id: providerData.id,
        name: providerData.name,
        email: providerData.email,
        image: providerData.image,
        lastMessage: "Hello! I'd like to discuss your services.",
        lastMessageTime: new Date().toISOString(),
        unread: false,
      }
      setContacts(prev => {
        if (prev.some(c => c.id === providerId)) return prev
        return [newContact, ...prev]
      })
      setSelectedContact(newContact)
    } catch (error) {
      console.error("Failed to initialize conversation:", error)
    }
  }

  // Socket.IO setup
  useEffect(() => {
    if (!socket || !currentUserId) return

    socket.on('connect', () => {
      console.log('Socket connected')
      socket.emit('join', currentUserId)
    })

    socket.on('private_message', (message: Message) => {
      if (message.sender_id === selectedContact?.id) {
        setMessages(prev => [...prev, message])
      }
      setContacts(prev =>
        prev.map(contact =>
          contact.id === message.sender_id
            ? {
                ...contact,
                lastMessage: message.content,
                lastMessageTime: message.timestamp,
                unread: contact.id !== selectedContact?.id
              }
            : contact
        )
      )
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    return () => {
      socket.off('connect')
      socket.off('private_message')
      socket.off('connect_error')
      socket.off('disconnect')
    }
  }, [socket, currentUserId, selectedContact?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!selectedContact || !currentUserId || !newMessage.trim()) {
      setError("No contact selected, user not authenticated, or empty message")
      return
    }
    setSending(true)
    try {
      const response = await api.post("/messages/send", {
        receiverId: selectedContact.id,
        content: newMessage
      })
      setMessages(prev => [...prev, response.data])
      setNewMessage("")
      setContacts(prev =>
        prev.map(contact =>
          contact.id === selectedContact.id
            ? {
                ...contact,
                lastMessage: response.data.content,
                lastMessageTime: response.data.timestamp,
                unread: false
              }
            : contact
        )
      )
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const renderMessages = () => {
    return messages.map((message) => {
      const isCurrentUser = message.sender_id === currentUserId
      return (
        <div
          key={message.id}
          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-lg p-3 relative ${
              isCurrentUser ? 'bg-blue-600 text-white' : 'bg-white border'
            }`}
          >
            {!isCurrentUser && (
              <p className="text-xs font-medium text-gray-500 mb-1">
                {message.senderName}
              </p>
            )}
            <p>{message.content}</p>
            <p className={`text-xs mt-1 ${
              isCurrentUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {format(new Date(message.timestamp), "h:mm a")}
            </p>
          </div>
        </div>
      )
    })
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Contacts sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-r bg-white">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Messages</h1>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/homeowner">
                <HomeIcon className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              placeholder="Search conversations..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="h-[calc(100vh-130px)] overflow-y-auto">
          {loadingContacts ? (
            <div className="space-y-4 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Search className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">No conversations found</p>
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  className="mt-2"
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            filteredContacts.map((contact, index) => (
              <div
                key={`${contact.id}-${index}`}
                className={`flex cursor-pointer items-center gap-3 border-b p-4 hover:bg-gray-50 transition-colors ${
                  selectedContact?.id === contact.id ? "bg-gray-100" : ""
                }`}
                onClick={() => {
                  setSelectedContact(contact)
                  if (contact.unread) {
                    setContacts(prev =>
                      prev.map(c =>
                        c.id === contact.id ? { ...c, unread: false } : c
                      )
                    )
                  }
                }}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.image} alt={contact.name} />
                  <AvatarFallback>
                    {contact.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{contact.name}</h3>
                    <span className="text-xs text-gray-500">
                      {contact.lastMessageTime && format(new Date(contact.lastMessageTime), "h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {contact.lastMessage}
                  </p>
                </div>
                {contact.unread && (
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="border-b p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedContact.image}
                      alt={selectedContact.name}
                    />
                    <AvatarFallback>
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedContact.name}</h3>
                    <p className="text-xs text-gray-500">
                      {isConnected ? (
                        <span className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                          Online
                        </span>
                      ) : (
                        "Offline"
                      )}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>View Service Details</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {loadingMessages ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                    >
                      <Skeleton className="h-16 w-64 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium">No messages yet</h3>
                  <p className="text-gray-500">
                    Start the conversation with {selectedContact.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {renderMessages()}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t p-4 bg-white">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage()
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              Select a conversation to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
