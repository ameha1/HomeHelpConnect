"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Notification } from "@/lib/types"
import { markNotificationAsRead } from "@/lib/actions"

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Booking Confirmed",
    message: "Your plumbing service has been confirmed for tomorrow at 10:00 AM.",
    date: "Just now",
    read: false,
  },
  {
    id: "2",
    title: "New Message",
    message: "You have a new message from Mike's Plumbing regarding your upcoming appointment.",
    date: "2 hours ago",
    read: false,
  },
  {
    id: "3",
    title: "Service Completed",
    message: "Your cleaning service has been marked as completed. Please leave a review!",
    date: "Yesterday",
    read: false,
  },
]

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id)
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px]">{unreadCount}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>You have {unreadCount} unread notifications</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-3 ${notification.read ? "bg-background" : "bg-muted"}`}
            >
              <div className="flex justify-between">
                <h4 className="font-medium">{notification.title}</h4>
                <span className="text-xs text-muted-foreground">{notification.date}</span>
              </div>
              <p className="mt-1 text-sm">{notification.message}</p>
              {!notification.read && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 h-auto p-0 text-xs"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  Mark as read
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

