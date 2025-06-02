// types/next-auth.d.ts
import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    email?: string | null
    name?: string | null
    role?: string
    access_token?: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role?: string
    }
    accessToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role?: string
    accessToken?: string
  }
}