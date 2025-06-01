import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { prisma } from '../../../../lib/prisma'
import { headers } from 'next/headers'

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('No valid session found in API route')
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized - No valid session',
        details: 'Session validation failed'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
    }

    try {
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
      return NextResponse.json(categories)
    } catch (dbError) {
      console.error('Database error:', dbError)
      return new NextResponse(JSON.stringify({ 
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized - No valid session',
        details: 'Session validation failed'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
    }

    const data = await request.json()
    
    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: session.user.id
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized - No valid session',
        details: 'Session validation failed'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
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
        updatedBy: session.user.id
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized - No valid session',
        details: 'Session validation failed'
      }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        },
      })
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