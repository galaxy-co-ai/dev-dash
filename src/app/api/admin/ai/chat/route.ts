import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { db, eq, or, isNull } from '@/db';
import { projects, aiMemories } from '@/db/schema';
import { desc, gt } from 'drizzle-orm';
import { ai } from '@/admin.config';
import { aiTools } from '@/lib/ai/tools';
import { executeTool } from '@/lib/ai/tool-executor';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_TOOL_ITERATIONS = 10;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY not configured. Add it to your .env.local file.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages, projectId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Fetch project record
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch active memories (small, always relevant — included in system prompt)
    const memories = await db
      .select()
      .from(aiMemories)
      .where(
        or(
          isNull(aiMemories.expiresAt),
          gt(aiMemories.expiresAt, new Date())
        )
      )
      .orderBy(desc(aiMemories.createdAt))
      .limit(50);

    const systemPrompt = buildSystemPrompt(
      project,
      memories.map((m) => ({ content: m.content, category: m.category }))
    );

    // Build messages — no more injected context, Claude fetches via tools
    const apiMessages: MessageParam[] = messages.map(
      (msg: { role: 'user' | 'assistant'; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })
    );

    // ── Tool Use Loop ──────────────────────────────────────
    let currentMessages = apiMessages;
    let finalText = '';

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: ai.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: aiTools,
        messages: currentMessages,
      });

      // Collect any text from this response
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      // If Claude is done (no more tool use), break
      if (response.stop_reason !== 'tool_use') {
        break;
      }

      // Process tool calls
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) break;

      // Build tool results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        try {
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            projectId
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : 'Tool execution failed',
            }),
            is_error: true,
          });
        }
      }

      // Append assistant response + tool results for next iteration
      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ];
    }

    return NextResponse.json({
      success: true,
      message: finalText || 'No response generated.',
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
