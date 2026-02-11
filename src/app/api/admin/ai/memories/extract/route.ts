import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { aiMemories } from '@/db/schema';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `Analyze this conversation and extract key information that should be remembered for future context. Focus on:

1. **Decisions Made** - Technical choices, architectural decisions, feature priorities
2. **User Preferences** - Coding style, tool preferences, workflow preferences
3. **Project Context** - Goals, constraints, deadlines, requirements
4. **Blockers** - Known issues, dependencies, waiting on external factors
5. **Insights** - Key learnings, discoveries, important observations
6. **Action Items** - Things to do, follow-ups needed

For each piece of information, output a JSON array with objects containing:
- "content": A concise, standalone statement (should make sense without the original conversation)
- "category": One of "decision", "preference", "context", "blocker", "insight", "todo"
- "importance": One of "low", "normal", "high", "critical"

Only extract information that is:
- Useful for future conversations
- Not obvious or generic
- Specific to this project/user

If there's nothing worth remembering, return an empty array.

Respond ONLY with a valid JSON array, no other text.`;

const extractSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
});

const memorySchema = z.array(z.object({
  content: z.string(),
  category: z.enum(['decision', 'preference', 'context', 'blocker', 'insight', 'todo']),
  importance: z.enum(['low', 'normal', 'high', 'critical']),
}));

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured',
      }, { status: 500 });
    }

    const body = await request.json();
    const { messages } = extractSchema.parse(body);

    if (messages.length < 2) {
      return NextResponse.json({
        success: true,
        extracted: 0,
        message: 'Not enough conversation to extract memories',
      });
    }

    // Format conversation for extraction
    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Call Claude to extract memories
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n---\n\nCONVERSATION:\n${conversationText}`,
        },
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({
        success: true,
        extracted: 0,
        message: 'No memories extracted',
      });
    }

    // Parse the extracted memories
    let extractedMemories;
    try {
      extractedMemories = memorySchema.parse(JSON.parse(textContent.text));
    } catch {
      console.error('Failed to parse extracted memories:', textContent.text);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse extracted memories',
      }, { status: 500 });
    }

    if (extractedMemories.length === 0) {
      return NextResponse.json({
        success: true,
        extracted: 0,
        message: 'No memories worth remembering in this conversation',
      });
    }

    // Save memories to database
    const savedMemories = await db
      .insert(aiMemories)
      .values(
        extractedMemories.map(m => ({
          content: m.content,
          category: m.category,
          importance: m.importance,
          source: 'extracted',
        }))
      )
      .returning();

    return NextResponse.json({
      success: true,
      extracted: savedMemories.length,
      memories: savedMemories,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Error extracting memories:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract memories',
    }, { status: 500 });
  }
}
