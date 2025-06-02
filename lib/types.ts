export interface Notification {
  id: string
  title: string
  message: string
  date: string
  read: boolean
}

export interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  read: boolean
}

export interface BasicBooking {
  id: string
  title: string
  provider: string
  date: string
  status: string
  image: string
  rating?: number
}

export interface Service {
  id: string
  title: string
  description: string
  provider: string
  price: string | number
  rating?: number
  reviewCount?: number
  image?: string
  location: string
  duration: number
  nextAvailable?: string
  isPopular?: boolean
  providerId?: number | string
}

export interface Provider {
  id: string
  name: string
  type: string
  experience: string
  date: string
  image: string
}

export interface Report {
  id: string
  reporter: string
  reported: string
  reason: string
  date: string
  status: string
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface Booking {
  id: string;
  scheduled_date: string;
  time: string;
  status: string;
  service?: {
    title: string;
    price: number;
  };
  provider?: {
    id: string;
    name: string;
  };
  address?: string;
}

import { NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};
