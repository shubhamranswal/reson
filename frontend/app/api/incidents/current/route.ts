import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      `${process.env.RESON_API_URL}/api/incidents/current`,
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch incident state' },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Incident API error:', error);

    return NextResponse.json(
      { error: 'Unable to reach Reson backend' },
      { status: 502 },
    );
  }
}