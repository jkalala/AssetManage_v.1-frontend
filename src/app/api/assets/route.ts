import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { headers } from 'next/headers'

const prisma = new PrismaClient()

// GET /api/assets - Get all assets
export async function GET() {
  try {
    // Get authorization header
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth header:', authHeader)
    }

    // Validate authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid or missing authorization header')
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Missing or invalid authorization token'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        id: string;
        email: string;
        role: string;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Token verified for user:', {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        })
      }

      // Get assets
      const assets = await prisma.asset.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`Found ${assets.length} assets`)
      }

      return NextResponse.json(assets)
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError)
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Invalid token'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
    }
  } catch (error) {
    console.error('Error in GET /api/assets:', error)
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

// POST /api/assets - Create a new asset
export async function POST(request: Request) {
  try {
    // Get authorization header
    const headersList = await headers()
    const authHeader = headersList.get('authorization')

    // Validate authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Missing or invalid authorization token'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: string;
      email: string;
      role: string;
    }

    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.categoryId || !data.value) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bad Request',
        details: 'Missing required fields: name, categoryId, and value are required'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const asset = await prisma.asset.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status || 'active',
        value: data.value,
        categoryId: data.categoryId,
        createdBy: decoded.id
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error creating asset:', error)
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
} 