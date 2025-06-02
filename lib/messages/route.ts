// import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '../../app/context/auth-context'
// import { PrismaClient } from "@prisma/client";
// // Removed unused import for User

// const prisma = new PrismaClient();

// // Get all conversations for current user
// export async function GET(req: NextRequest) {
//   const session = await getServerSession(authOptions)
//   if (!session?.user?.id) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   try {
//     // Get all unique contacts the user has messaged with
//     const conversations = await prisma.message.findMany({
//       where: {
//         OR: [
//           { senderId: session.user.id },
//           { receiverId: session.user.id }
//         ]
//       },
//       select: {
//         id: true,
//         content: true,
//         createdAt: true,
//         read: true,
//         sender: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             image: true
//           }
//         },
//         receiver: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             image: true
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       }
//     })

//     // Group by contact and get last message
//     const contactsMap = new Map<string, any>()
//     interface Contact {
//       id: string;
//       name: string;
//       email: string;
//       image: string | null;
//       lastMessage: string;
//       lastMessageTime: Date;
//       unread: boolean;
//     }

//     interface User {
//       id: string;
//       name: string | null;
//       email: string;
//       image: string | null;
//     }

//     interface MessageWithContact {
//       sender: User;
//       receiver: User;
//       content: string; // Ensure the content property is explicitly defined
//       createdAt: Date; // Add the createdAt property explicitly
//       read: boolean; // Add the read property explicitly
//     }

//     conversations.forEach((msg: MessageWithContact) => {
//       const contactId: string = msg.sender.id === session.user.id ? msg.receiver.id : msg.sender.id;
//       const contact: User = msg.sender.id === session.user.id ? msg.receiver : msg.sender;

//       if (!contactsMap.has(contactId)) {
//         contactsMap.set(contactId, {
//           id: contactId,
//           name: contact.name || contact.email.split('@')[0],
//           email: contact.email,
//           image: contact.image,
//           lastMessage: msg.content,
//           lastMessageTime: msg.createdAt,
//           unread: !msg.read && msg.receiver.id === session.user.id
//         } as Contact);
//       }
//     });

//     return NextResponse.json(Array.from(contactsMap.values()))
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to fetch conversations' },
//       { status: 500 }
//     )
//   }
// }

// // Create a new message
// export async function POST(req: NextRequest) {
//   const session = await getServerSession(authOptions)
//   if (!session?.user?.id) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   const { receiverId, content } = await req.json()

//   try {
//     const newMessage = await prisma.message.create({
//       data: {
//         content,
//         senderId: session.user.id,
//         receiverId,
//         read: false
//       },
//       include: {
//         sender: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             image: true
//           }
//         },
//         receiver: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             image: true
//           }
//         }
//       }
//     })

//     return NextResponse.json(newMessage)
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to send message' },
//       { status: 500 }
//     )
//   }
// }