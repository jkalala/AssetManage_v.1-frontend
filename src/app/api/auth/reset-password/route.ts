import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset attempt for email:', data.email);
    }
    
    // Validate required fields
    if (!data.email || !data.newPassword) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Password reset validation failed:', {
          hasEmail: !!data.email,
          hasNewPassword: !!data.newPassword
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'Email and new password are required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('User not found for password reset:', data.email);
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'User not found'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10)

    // Update user's password
    await prisma.$executeRaw`
      UPDATE "User"
      SET password = ${hashedPassword}
      WHERE email = ${data.email}
    `;

    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset successful for user:', data.email);
    }

    return NextResponse.json({
      message: 'Password reset successful'
    })
  } catch (error) {
    console.error('Error in password reset:', error)
    if (process.env.NODE_ENV === 'development') {
      console.error('Password reset error details:', {
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