import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'
    const category = searchParams.get('category')

    if (!q) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const params = new URLSearchParams({
      q,
      page,
      limit,
    })

    if (category) {
      params.append('category', category)
    }

    const response = await fetch(`http://localhost:4001/api/news/search?${params.toString()}`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching news:', error)
    return NextResponse.json(
      { error: 'Failed to search news' },
      { status: 500 }
    )
  }
}
