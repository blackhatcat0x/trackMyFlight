// app/api/aircraft-photo/route.ts

import { aircraftPhotoService } from '@/lib/aircraftPhotoService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const registration = searchParams.get('registration');

  if (!registration) {
    return NextResponse.json(
      { error: 'Missing registration parameter' },
      { status: 400 }
    );
  }

  try {
    const photo = await aircraftPhotoService.getAircraftPhoto(registration);

    if (!photo) {
      return NextResponse.json(
        { error: 'No photo found for this aircraft' },
        { status: 404 }
      );
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error('Error fetching aircraft photo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aircraft photo' },
      { status: 500 }
    );
  }
}