import { NextRequest } from 'next/server'
import { buildInstallBootstrapScript } from '@/lib/install-bootstrap'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const script = buildInstallBootstrapScript(appUrl, token)

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="install.sh"',
    },
  })
}
