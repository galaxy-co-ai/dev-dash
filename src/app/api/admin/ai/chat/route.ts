import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { db } from '@/db';
import { devTasks, aiMemories } from '@/db/schema';
import { desc, isNull, or, gt } from 'drizzle-orm';
import { ai } from '@/admin.config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt from config
const SYSTEM_PROMPT = `${ai.projectContext}

IMPORTANT: You have access to "memories" - key facts and decisions from past conversations. Use these to maintain context and avoid asking questions that have already been answered.

Current project context and memories will be provided with each message.`;

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured. Add it to your .env.local file.',
      }, { status: 500 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({
        success: false,
        error: 'Messages array is required',
      }, { status: 400 });
    }

    // Fetch current project context
    const tasks = await db
      .select()
      .from(devTasks)
      .orderBy(desc(devTasks.createdAt))
      .limit(50);

    // Fetch active memories (not expired)
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

    const tasksByStatus = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    };

    const activeTasks = tasks
      .filter(t => t.status === 'in_progress')
      .slice(0, 5)
      .map(t => `- ${t.title} (${t.priority})`);

    const blockedTasks = tasks
      .filter(t => t.status === 'backlog' && t.priority === 'high')
      .slice(0, 3)
      .map(t => `- ${t.title}`);

    // Format memories by category
    const memoriesByCategory = memories.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    }, {} as Record<string, typeof memories>);

    const formatMemorySection = (category: string, label: string) => {
      const mems = memoriesByCategory[category];
      if (!mems || mems.length === 0) return '';
      return `### ${label}\n${mems.map(m => `- ${m.content}`).join('\n')}`;
    };

    const memoriesContext = memories.length > 0 ? `
## Persistent Memories (from past conversations)
${formatMemorySection('decision', 'Decisions')}
${formatMemorySection('preference', 'Preferences')}
${formatMemorySection('context', 'Project Context')}
${formatMemorySection('blocker', 'Known Blockers')}
${formatMemorySection('insight', 'Insights')}
${formatMemorySection('todo', 'Pending Items')}
`.trim() : '';

    const projectContext = `
## Current Project Status
- Total tasks: ${tasks.length}
- Backlog: ${tasksByStatus.backlog}, Todo: ${tasksByStatus.todo}, In Progress: ${tasksByStatus.in_progress}, Review: ${tasksByStatus.review}, Done: ${tasksByStatus.done}

## Active Tasks
${activeTasks.length > 0 ? activeTasks.join('\n') : '- None currently'}

## High Priority Backlog Items
${blockedTasks.length > 0 ? blockedTasks.join('\n') : '- None'}

${memoriesContext}
`;

    // Prepend project context to the first user message
    const messagesWithContext: MessageParam[] = messages.map((msg: { role: 'user' | 'assistant'; content: string }, idx: number) => {
      if (idx === 0 && msg.role === 'user') {
        return {
          role: msg.role,
          content: `${projectContext}\n\n---\n\nUser question: ${msg.content}`,
        };
      }
      return { role: msg.role, content: msg.content };
    });

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: ai.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messagesWithContext,
    });

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    const assistantMessage = textContent ? textContent.text : 'No response generated.';

    return NextResponse.json({
      success: true,
      message: assistantMessage,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }, { status: 500 });
  }
}
