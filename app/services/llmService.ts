import { Message } from '../types';
import { DEFAULT_MODEL } from '../constants/models';

/**
 * Send a message to the LLM with conversation history and dataset reference
 * Now calls the secure API route instead of directly using the OpenAI API
 */
export const sendMessageToLLM = async (
  userMessage: string,
  datasetInfo: string,
  conversationHistory: Message[],
  model: string = DEFAULT_MODEL,
  images?: string[],
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> => {
  try {
    // Prepare conversation history for API (convert from Message[] to simple format)
    const historyForAPI = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
      images: msg.images,
    }));

    // Call the secure API route
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        datasetInfo,
        conversationHistory: historyForAPI,
        model,
        images,
      }),
      signal,
    });

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response isn't JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      throw error;
    }
    
    console.error('LLM Service error:', error);
    
    if (error.message?.includes('API key') || error.message?.includes('401')) {
      throw new Error('Invalid OpenAI API key. Please check your server configuration.');
    } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.message?.includes('quota')) {
      throw new Error('OpenAI API quota exceeded. Please check your OpenAI account.');
    } else {
      throw new Error(`Error: ${error.message || 'Failed to get response from AI'}`);
    }
  }
};


