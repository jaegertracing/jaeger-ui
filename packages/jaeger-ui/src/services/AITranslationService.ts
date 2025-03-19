export interface JaegerQuery {
  service?: string;
  operation?: string;
  tags?: string;
  lookback?: string;
  limit?: number;
  minDuration?: string;
  maxDuration?: string;
}

export class AITranslationService {
  private static readonly SYSTEM_PROMPT = `
### Instructions:
Your task is to convert a natural language question into a Jaeger trace search query, formatted as a JSON object.
Adhere to these rules:
- **Carefully analyze the question word by word** to determine the appropriate Jaeger query parameters.
- **Respond only with a valid JSON object** containing these possible fields:
  - service: string (service name to filter by)
  - operation: string (operation name to filter by)
  - tags: string (in logfmt format, e.g. "error=true http.status_code=500 http.route=/api/v1/users http.method=GET")
  - lookback: string (time window, e.g. "1h", "24h")
  - limit: number (maximum number of results to return)
  - minDuration: string (e.g. "100ms", "1s")
  - maxDuration: string (e.g. "5s", "1m")
- Do not include any explanations, comments, or additional text beyond the JSON object.

### Input:
Generate a Jaeger query that answers the question \`What are the slowest traces for the payment service in the last 2 hours?\`.

### Response:
{
  "service": "payment",
  "lookback": "2h",
  "minDuration": "1s",
  "limit": 100
}
`;

  private endpoint: string;

  constructor() {
    // Ollama runs locally on port 11434 by default
    this.endpoint = 'http://localhost:11434/api/generate';
  }

  async translateQuery(query: string): Promise<JaegerQuery> {
    console.log('Starting translation for query:', query);
    try {
      // Check if Ollama is available first
      // try {
      //   const healthCheck = await fetch(this.endpoint, { method: 'HEAD' });
      //   if (!healthCheck.ok) {
      //     throw new Error(`Ollama service returned status ${healthCheck.status}`);
      //   }
      // } catch (error) {
      //   throw new Error(
      //     'Ollama service is not available. Please ensure Ollama is installed and running on port 11434. ' +
      //     'Visit https://ollama.ai for installation instructions.'
      //   );
      // }

      const requestBody = {
        model: 'llama3.1',
        prompt: `${AITranslationService.SYSTEM_PROMPT}\n\nInput: "${query}"\nOutput:`,
        stream: false,
      };
      console.log('Request body:', requestBody);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw response data:', data);

      const result = JSON.parse(data.response);
      console.log('Parsed result:', result);

      return this.validateQuery(result);
    } catch (error) {
      console.error('AI translation failed:', error instanceof Error ? error.message : String(error));
      throw error; // Re-throw the error instead of using fallback
    }
  }

  private validateQuery(query: JaegerQuery): JaegerQuery {
    // Ensure all values are of correct type and format
    if (query.limit && typeof query.limit !== 'number') {
      query.limit = parseInt(query.limit as any, 10) || 20;
    }

    // Validate lookback format (e.g., "1h", "24h", "7d")
    if (query.lookback && !/^\d+[hdms]$/.test(query.lookback)) {
      query.lookback = '1h';
    }

    // Validate duration formats
    const durationRegex = /^\d+(\.\d+)?[hdms]$/;
    if (query.minDuration && !durationRegex.test(query.minDuration)) {
      delete query.minDuration;
    }
    if (query.maxDuration && !durationRegex.test(query.maxDuration)) {
      delete query.maxDuration;
    }

    return query;
  }
}

export const aiTranslationService = new AITranslationService(); 