import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

type UserWithPassword = {
  id: string;
  email: string;
  password: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt for email:', data.email);
    }
    
    // Validate required fields
    if (!data.email || !data.password) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Login validation failed:', {
          hasEmail: !!data.email,
          hasPassword: !!data.password,
          passwordLength: data.password?.length
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'Email and password are required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Find user using raw query
    const users = await prisma.$queryRaw<Array<UserWithPassword>>`
      SELECT id, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
      FROM "User"
      WHERE email = ${data.email}
    `;

    const user = users[0];

    if (process.env.NODE_ENV === 'development') {
      console.log('User lookup result:', user ? {
        id: user.id,
        email: user.email,
        hasPassword: !!user.password,
        passwordLength: user.password?.length,
        passwordPrefix: user.password ? user.password.substring(0, 10) + '...' : null,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      } : 'User not found');
    }

    if (!user || !user.password) {
      if (process.env.NODE_ENV === 'development') {
        console.log('User not found or has no password:', {
          userFound: !!user,
          hasPassword: !!user?.password
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'Invalid email or password'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Verify password
    if (process.env.NODE_ENV === 'development') {
      console.log('Attempting password verification:', {
        inputPasswordLength: data.password.length,
        storedPasswordLength: user.password.length,
        storedPasswordPrefix: user.password.substring(0, 10) + '...'
      });
    }

    const isCorrectPassword = await bcrypt.compare(data.password, user.password)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Password verification result:', {
        isCorrect: isCorrectPassword,
        inputPasswordLength: data.password.length,
        storedPasswordLength: user.password.length
      });

      if (!isCorrectPassword) {
        // Try hashing the input password to see if it matches
        const hashedInput = await bcrypt.hash(data.password, 10);
        console.log('Debug password comparison:', {
          hashedInputLength: hashedInput.length,
          storedPasswordLength: user.password.length,
          hashedInputPrefix: hashedInput.substring(0, 10) + '...',
          storedPasswordPrefix: user.password.substring(0, 10) + '...',
          directComparison: hashedInput === user.password
        });
      }
    }

    if (!isCorrectPassword) {
      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'Invalid email or password'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    // Prepare user data without password
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Login successful:', {
        user: userWithoutPassword,
        tokenGenerated: !!token
      });
    }

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Error in login:', error)
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error details:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
    }
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
} 