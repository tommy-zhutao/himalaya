import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'latest'

    const params = new URLSearchParams({
      page,
      limit,
      sort,
    })

    if (category) {
      params.append('category', category)
    }

    const response = await fetch(`http://localhost:4001/api/news?${params.toString()}`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}
