import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { Session } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { getIO } from "@/lib/socket";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req }) as Session & { user: { id: string } };

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // Get messages between current user and another user
    const { contactId } = req.query;

    if (!session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: contactId as string,
          },
          {
            senderId: contactId as string,
            receiverId: session.user.id,
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json(messages);
  }

    if (req.method === "POST") {
      const { content, receiverId } = req.body;
  
      if (!session.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
  
      const message = await prisma.message.create({
        data: {
          content,
          senderId: session.user.id,
          receiverId,
        },
      });

    // Emit the message via Socket.io
    const io = getIO();
    io.to(receiverId).emit("private message", {
      senderId: session.user.id,
      content,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(message);
  }

  return res.status(405).json({ error: "Method not allowed" });
}