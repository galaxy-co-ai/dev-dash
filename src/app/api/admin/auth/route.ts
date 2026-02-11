import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { createRateLimiter, getRequestIdentifier, rateLimitHeaders } from '@/lib/api/rate-limit';

// Strict rate limiter for admin auth: 5 attempts per 15 minutes
const adminAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5
});

/**
 * POST /api/admin/auth
 * Authenticate admin with password
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const identifier = getRequestIdentifier(request);
  const rateLimitResult = adminAuthLimiter.check(identifier);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const body = await request.json();

    const schema = z.object({
      password: z.string().min(1),
    });

    const validated = schema.parse(body);

    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      );
    }

    if (validated.password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate a cryptographically secure session token
    const sessionToken = process.env.ADMIN_SESSION_TOKEN ||
      randomBytes(32).toString('hex');

    // Set secure cookie (secure only in production)
    const cookieStore = await cookies();
    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 4, // 4 hours
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth
 * Logout admin
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
