import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Registration request data:', JSON.stringify({
        ...data,
        password: 'PASSWORD_HIDDEN'
      }, null, 2));
    }
    
    // Validate required fields
    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      const error = {
        error: 'Bad Request',
        details: 'Missing required fields',
        received: {
          email: !!data.email,
          password: !!data.password,
          passwordLength: data.password?.length,
          firstName: !!data.firstName,
          lastName: !!data.lastName
        }
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Registration validation failed:', error);
      }

      return new NextResponse(
        JSON.stringify(error),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate password
    if (typeof data.password !== 'string' || data.password.trim().length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Invalid password:', {
          type: typeof data.password,
          length: data.password?.length,
          isEmpty: data.password?.trim().length === 0
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'Password must be a non-empty string'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Check if user already exists
    const existingUsers = await prisma.$queryRaw<Array<{
      id: string;
      email: string;
      password: string | null;
    }>>`
      SELECT id, email, password
      FROM "User"
      WHERE email = ${data.email}
    `;

    const existingUser = existingUsers[0];

    if (existingUser) {
      if (process.env.NODE_ENV === 'development') {
        console.log('User already exists:', {
          id: existingUser.id,
          email: existingUser.email,
          hasPassword: !!existingUser.password,
          passwordLength: existingUser.password?.length
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Bad Request',
          details: 'User with this email already exists'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Hash password
    if (process.env.NODE_ENV === 'development') {
      console.log('Hashing password for user:', {
        email: data.email,
        passwordLength: data.password.length
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    if (process.env.NODE_ENV === 'development') {
      console.log('Password hashed successfully:', {
        hashedLength: hashedPassword.length,
        hashedPrefix: hashedPassword.substring(0, 10) + '...'
      });
      // Verify the hash immediately
      const verifyHash = await bcrypt.compare(data.password, hashedPassword);
      console.log('Immediate hash verification:', verifyHash);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Creating new user:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        hashedPasswordLength: hashedPassword.length,
        hashedPasswordPrefix: hashedPassword.substring(0, 10) + '...'
      });
    }

    // Create user using raw query to bypass type checking
    const user = await prisma.$queryRaw<Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      password: string;
    }>>`
      INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()},
        ${data.email},
        ${hashedPassword},
        ${data.firstName},
        ${data.lastName},
        'VIEWER',
        true,
        NOW(),
        NOW()
      )
      RETURNING id, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
    `;

    if (process.env.NODE_ENV === 'development') {
      console.log('User created successfully:', {
        id: user[0].id,
        email: user[0].email,
        hasPassword: !!user[0].password,
        passwordLength: user[0].password.length,
        passwordPrefix: user[0].password.substring(0, 10) + '...'
      });
    }

    // Remove password from response and serialize dates
    const userWithoutPassword = {
      ...user[0],
      password: undefined,
      createdAt: user[0].createdAt.toISOString(),
      updatedAt: user[0].updatedAt.toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Registration successful:', JSON.stringify(userWithoutPassword, null, 2));
    }

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'User registered successfully'
    })
  } catch (error) {
    console.error('Error in registration:', error)
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