import { NextResponse } from 'next/server';
import { nowStamp } from '../../../_shared';

export const dynamic = 'force-dynamic';

function getApiBase(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  if (!base) return null;
  const trimmed = base.replace(/\/+$/g, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function pickFilenameFromContentDisposition(cd: string | null, fallback: string): string {
  if (!cd) return fallback;
  const m = cd.match(/filename="?([^";]+)"?/i);
  return m?.[1] || fallback;
}

export async function GET(req: Request, { params }: { params: Promise<{ poId: string }> | { poId: string } }) {
  const apiBase = getApiBase();
  if (!apiBase) {
    return new NextResponse(
      'Missing NEXT_PUBLIC_API_URL environment variable (should point to your backend base URL, e.g. https://yourdomain.com/api)',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const resolvedParams = await params;
  const { poId } = resolvedParams;
  if (!poId || !/^\d+$/.test(poId)) {
    return new NextResponse('Invalid Purchase Order ID', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const target = `${apiBase}/purchase-orders/${poId}/barcodes/csv`;

  const auth = req.headers.get('authorization') || '';
  const res = await fetch(target, {
    headers: {
      ...(auth ? { Authorization: auth } : {}),
      Accept: 'text/csv,*/*',
    },
    cache: 'no-store',
  });

  const buf = await res.arrayBuffer();
  const fallbackName = `PO-${poId}-barcodes-${nowStamp()}.csv`;
  const filename = pickFilenameFromContentDisposition(res.headers.get('content-disposition'), fallbackName);

  return new NextResponse(buf, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Report-Source': 'proxy',
    },
  });
}
