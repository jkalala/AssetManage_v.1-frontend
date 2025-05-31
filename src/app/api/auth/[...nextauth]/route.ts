import NextAuth, { type NextAuthOptions, type Session, type User, type DefaultSession } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { JWT } from "next-auth/jwt"

// Extend the built-in User type
declare module "next-auth" {
  interface User {
    firstName?: string
    lastName?: string
    role?: string
  }
}

// Extend the built-in Session type
declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      role?: string
      firstName?: string
      lastName?: string
    } & DefaultSession["user"]
  }
}

const prisma = new PrismaClient()

type CreateUserData = {
  name?: string | null
  email?: string | null
  image?: string | null
  emailVerified?: Date | null
}

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (data: CreateUserData) => {
      // Split the name into firstName and lastName
      const nameParts = data.name?.split(' ') || ['', '']
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      return prisma.user.create({
        data: {
          email: data.email!,
          firstName,
          lastName,
          image: data.image,
          emailVerified: data.emailVerified,
          role: "VIEWER", // Default role
          isActive: true, // Changed from active to isActive
        },
      })
    },
  },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          firstName: profile.name?.split(' ')[0] || profile.login,
          lastName: profile.name?.split(' ').slice(1).join(' ') || '',
        }
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user?.password) {
          throw new Error("Invalid credentials")
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials")
        }

        return user
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/dashboard", // Redirect new users to dashboard
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: any }) {
      if (account && user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`.trim(),
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
          jti: crypto.randomUUID(),
        };
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          name: token.name,
          firstName: token.firstName,
          lastName: token.lastName,
        }
      }
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 