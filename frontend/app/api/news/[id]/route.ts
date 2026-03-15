import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid news ID' },
        { status: 400 }
      )
    }

    const response = await fetch(`${API_URL}/api/news/${id}`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching news detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news detail' },
      { status: 500 }
    )
  }
}
