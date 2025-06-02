import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }
      },
      async authorize(credentials) {
        try {
          const formData = new URLSearchParams()
          formData.append("email", credentials?.email || "")
          formData.append("password", credentials?.password || "")
          formData.append("role", credentials?.role || "homeowners")

          const res = await fetch("http://localhost:8000/signin/", {
            method: "POST",
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
          })

          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.detail || "Login failed")
          }

          const user = await res.json()

          if (!user) {
            return null
          }

          return {
            id: user.id || user.email,
            email: user.email,
            name: user.name || user.email,
            access_token: user.access_token,
            role: credentials?.role === "provider" ? "serviceproviders" : "homeowners",
            ...user
          }
        } catch (error: any) {
          console.error("Login failed:", error)
          throw new Error(error.message || "Login failed")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.accessToken = user.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.accessToken = token.accessToken as string
      }
      return session
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  debug: process.env.NODE_ENV === "development"
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }