import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude AI client singleton for consistent configuration across the app
 */
class ClaudeClient {
  private static instance: Anthropic | null = null;

  /**
   * Get or create the Claude client instance
   */
  static getInstance(): Anthropic {
    if (!ClaudeClient.instance) {
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY environment variable is not set. Please add it to your .env.local file."
        );
      }

      ClaudeClient.instance = new Anthropic({
        apiKey,
      });
    }

    return ClaudeClient.instance;
  }

  /**
   * Reset the client instance (mainly for testing)
   */
  static resetInstance(): void {
    ClaudeClient.instance = null;
  }
}

/**
 * Get the initialized Claude AI client
 */
export function getClaudeClient(): Anthropic {
  return ClaudeClient.getInstance();
}

/**
 * Test the Claude client connection
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    const client = getClaudeClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 100,
      messages: [{ role: "user", content: "Hello" }],
    });

    return response.content.length > 0;
  } catch (error) {
    console.error("Claude connection test failed:", error);
    return false;
  }
}
