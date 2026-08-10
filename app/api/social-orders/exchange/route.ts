import { NextResponse } from 'next/server';

// RETIRED: Deshio's authoritative operational + accounting system is the Laravel API.
// This Next.js JSON-file endpoint was an early local prototype and created a second,
// non-reconciling source of truth. Keep the route explicit so stale clients fail loudly
// instead of silently writing fake local transactions.
function retired() {
  return NextResponse.json(
    {
      success: false,
      message: 'This legacy local Deshio financial endpoint is retired. Use the Laravel API configured by NEXT_PUBLIC_API_URL.',
      code: 'LEGACY_LOCAL_FINANCE_RETIRED',
    },
    { status: 410 },
  );
}

export async function GET() { return retired(); }
export async function POST() { return retired(); }
export async function PUT() { return retired(); }
export async function PATCH() { return retired(); }
export async function DELETE() { return retired(); }
