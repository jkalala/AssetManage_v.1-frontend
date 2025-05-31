import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/assets - Get all assets
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const assets = await prisma.asset.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/assets - Create a new asset
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const data = await request.json()
    
    const asset = await prisma.asset.create({
      data: {
        name: data.name,
        category: data.category,
        status: data.status,
        assignedTo: data.assignedTo,
        purchaseDate: new Date(data.purchaseDate),
        value: data.value,
        description: data.description,
        serialNumber: data.serialNumber,
        location: data.location,
        createdBy: session.user.id,
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error creating asset:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 