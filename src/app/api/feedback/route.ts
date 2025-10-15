import { readFile, writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'feedback.json')
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error reading feedback data:', error)
    return NextResponse.json(
      { error: 'Failed to read feedback data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, message, name, email } = body

    // Validate required fields
    if (!type || (type === 'note' && !message)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Read existing data
    const filePath = path.join(process.cwd(), 'data', 'feedback.json')
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    // Create new feedback entry
    const newFeedback = {
      id: Date.now().toString(),
      type, // 'thanks' or 'note'
      message: message || '',
      name: name || 'Anonymous',
      email: email || '',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || '',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }

    // Add to feedback array
    data.feedback.unshift(newFeedback) // Add to beginning
    data.stats.totalThanks += 1
    data.stats.lastUpdated = new Date().toISOString()

    // Write back to file
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: newFeedback.id
    })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
