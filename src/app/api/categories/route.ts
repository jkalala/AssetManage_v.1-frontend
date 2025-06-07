import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { headers } from 'next/headers'

const prisma = new PrismaClient()

// GET /api/categories - Get all categories
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

      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc'
        },
        include: {
          _count: {
            select: { assets: true }
          }
        }
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`Found ${categories.length} categories`)
      }

      return NextResponse.json(categories)
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
    console.error('Error in GET /api/categories:', error)
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

// POST /api/categories - Create a new category
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
    if (!data.name) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bad Request',
        details: 'Category name is required'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: decoded.id
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
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

// PUT /api/categories/:id - Update a category
export async function PUT(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bad Request',
        details: 'Category ID is required'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const data = await request.json()
    
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        updatedBy: decoded.id
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
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

// DELETE /api/categories/:id - Delete a category
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bad Request',
        details: 'Category ID is required'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check if category has any assets
    const categoryWithAssets = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true }
        }
      }
    })

    if (!categoryWithAssets || (categoryWithAssets._count?.assets ?? 0) > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete category',
        details: 'Category has associated assets'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    await prisma.category.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting category:', error)
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