import { NextResponse } from 'next/server';
import Together, { ClientOptions } from 'together-ai';

if (!process.env.TOGETHER_API_KEY) {
  throw new Error('Missing TOGETHER_API_KEY environment variable');
}

// Initialize Together with proper client options
const options: ClientOptions = {
  apiKey: process.env.TOGETHER_API_KEY,
};

const together = new Together(options);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await together.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful weather assistant that provides concise and accurate weather information. When users ask about weather, provide relevant details about temperature, conditions, and recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No response content from AI');
    }

    return NextResponse.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Together AI error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
