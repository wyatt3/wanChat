// Ollama AI Service for store items and appraisals
const http = require('http');

const OLLAMA_HOST = '192.168.0.93';
const OLLAMA_PORT = 11434;
const MODEL = 'deepseek-r1:8b';

// Total request timeout (5 minutes)
const REQUEST_TIMEOUT = 300000;

// Make a request to the Ollama API
async function ollamaRequest(prompt, options = {}, debug = null) {
  const log = (msg) => {
    console.log(`[OLLAMA] ${msg}`);
    if (debug) debug(msg);
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.8,
        num_predict: options.maxTokens || 500
      }
    });

    let timeoutId = null;
    let completed = false;

    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (completed) return;
        completed = true;
        clearTimeout(timeoutId);
        try {
          const json = JSON.parse(body);
          let fullResponse = json.response || '';

          // Debug: log raw response length
          log(`Raw response length: ${fullResponse.length}`);
          if (fullResponse.length > 0 && fullResponse.length < 500) {
            log(`Raw: ${fullResponse}`);
          } else if (fullResponse.length > 0) {
            log(`Raw (first 300): ${fullResponse.substring(0, 300)}`);
          }

          // Try to extract content outside of think tags first
          let response = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

          // If response is empty or doesn't contain valid JSON, search more aggressively
          if (!response || response.length === 0 || !response.includes('"value"')) {
            log(`Looking for JSON in full response...`);

            // Try to find ANY JSON with value and reason anywhere in the full response
            const jsonAnywhere = fullResponse.match(/\{[^{}]*"value"\s*:\s*\d+[^{}]*"reason"\s*:\s*"[^"]+"/);
            if (jsonAnywhere) {
              log(`Found JSON pattern in response!`);
              // Complete the JSON object
              response = jsonAnywhere[0] + '"}';
            } else {
              // Try to extract value and reason separately
              const valueMatch = fullResponse.match(/"value"\s*:\s*(\d+)/);
              const reasonMatch = fullResponse.match(/"reason"\s*:\s*"([^"]+)"/);

              if (valueMatch && reasonMatch) {
                log(`Extracted value=${valueMatch[1]}, reason="${reasonMatch[1]}"`);
                response = `{"value": ${valueMatch[1]}, "reason": "${reasonMatch[1]}"}`;
              } else if (valueMatch) {
                log(`Found only value=${valueMatch[1]}, no reason`);
                response = `{"value": ${valueMatch[1]}, "reason": "The appraiser was speechless."}`;
              } else {
                log(`Could not extract JSON from response`);
              }
            }
          }

          resolve(response);
        } catch (e) {
          reject(new Error('Failed to parse Ollama response: ' + e.message));
        }
      });
    });

    // Set a hard total timeout (5 minutes)
    timeoutId = setTimeout(() => {
      if (completed) return;
      completed = true;
      req.destroy();
      reject(new Error('Ollama request timed out after 5 minutes'));
    }, REQUEST_TIMEOUT);

    req.on('error', (err) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeoutId);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Generate store items using AI
async function generateStoreItems(count = 10) {
  const prompt = `Generate ${count} unique items for a chat room virtual store. Mix of titles (chat name prefixes like [Gamer], [Legend]), and collectibles (fun objects with emojis).

For each item output EXACTLY this JSON format, one item per line:
{"id":"unique_id","name":"Item Name","description":"Short funny description","price":NUMBER,"category":"title or collectible","rarity":"common/uncommon/rare/legendary/mythic/ultra","emoji":"single emoji or null for titles","prefix":"[Title] or null for collectibles"}

Price guidelines:
- common: $1-50
- uncommon: $25-100
- rare: $100-1000
- legendary: $1000-10000
- mythic: $10000-100000
- ultra: $100000-1000000

Be creative and funny! Mix absurd, mundane, and epic items. Output ONLY the JSON lines, nothing else.`;

  try {
    const response = await ollamaRequest(prompt, { temperature: 0.9, maxTokens: 2000 });
    const items = [];
    const lines = response.split('\n').filter(line => line.trim().startsWith('{'));

    for (const line of lines) {
      try {
        const item = JSON.parse(line.trim());
        // Validate required fields
        if (item.id && item.name && item.price && item.category) {
          // Ensure price is a number
          item.price = parseInt(item.price) || 100;
          // Normalize category
          item.category = item.category === 'title' ? 'title' : 'collectible';
          // Clean up emoji field for titles
          if (item.category === 'title') {
            item.emoji = undefined;
          }
          items.push(item);
        }
      } catch (e) {
        // Skip malformed JSON lines
      }
    }

    return items;
  } catch (error) {
    console.error('Failed to generate store items:', error.message);
    return null;
  }
}

// Appraise an item using AI
async function appraiseItem(itemName, itemDescription, itemEmoji, originalPrice, category, debug = null) {
  const log = (msg) => {
    console.log(`[APPRAISAL] ${msg}`);
    if (debug) debug(msg);
  };

  log(`Starting AI appraisal for: ${itemName}`);

  const prompt = `Appraise this item. Output ONLY a JSON object, nothing else. Do not think out loud. Do not use <think> tags. Just output the JSON directly.

Item: ${itemEmoji || ''} ${itemName}
Description: ${itemDescription || 'No description'}
Original price: $${originalPrice}

Pick a random value between $1 and $10,000,000. Write a funny one-sentence reason specific to "${itemName}".

Output format (ONLY this, no other text):
{"value": NUMBER, "reason": "funny sentence about ${itemName}"}`;

  try {
    log(`Sending request to Ollama at ${OLLAMA_HOST}:${OLLAMA_PORT}...`);
    const response = await ollamaRequest(prompt, { temperature: 1.1, maxTokens: 300 }, debug);
    log(`Processed response (${response.length} chars)`);

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*?"value"[\s\S]*?"reason"[\s\S]*?\}/);
    if (jsonMatch) {
      log(`Matched JSON: ${jsonMatch[0].substring(0, 150)}...`);
      const result = JSON.parse(jsonMatch[0]);
      const value = Math.max(1, Math.min(10000000, parseInt(result.value) || originalPrice));
      const reason = result.reason || 'The appraiser mumbled something incomprehensible.';
      log(`AI Success! Value: $${value}`);
      return { value, reason, usedAI: true };
    }

    // Fallback: generate random value if AI response was malformed
    log(`No JSON match found in response, using fallback`);
    const fallback = generateFallbackAppraisal(originalPrice, itemName);
    return { ...fallback, usedAI: false };
  } catch (error) {
    log(`AI failed: ${error.message}`);
    // Fallback to random appraisal
    const fallback = generateFallbackAppraisal(originalPrice, itemName);
    return { ...fallback, usedAI: false };
  }
}

// Fallback appraisal if AI fails
function generateFallbackAppraisal(originalPrice, itemName) {
  const roll = Math.random();
  let value, reason;

  if (roll < 0.05) {
    // Jackpot
    value = originalPrice * (10 + Math.random() * 90);
    reason = `Turns out this ${itemName} is incredibly rare!`;
  } else if (roll < 0.2) {
    // Good increase
    value = originalPrice * (2 + Math.random() * 5);
    reason = `This ${itemName} is in better condition than expected.`;
  } else if (roll < 0.5) {
    // Slight change
    value = originalPrice * (0.8 + Math.random() * 0.4);
    reason = `Fair market value for a ${itemName}.`;
  } else if (roll < 0.8) {
    // Loss
    value = originalPrice * (0.2 + Math.random() * 0.3);
    reason = `This ${itemName} has seen better days.`;
  } else {
    // Big loss
    value = Math.max(1, originalPrice * 0.01 + Math.random() * 10);
    reason = `I'm sorry to say this ${itemName} is basically worthless.`;
  }

  return { value: Math.floor(value), reason };
}

// Test connection to Ollama
async function testConnection() {
  try {
    const response = await ollamaRequest('Say "connected" and nothing else.', { maxTokens: 10 });
    return response.toLowerCase().includes('connect');
  } catch (error) {
    console.error('Ollama connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  generateStoreItems,
  appraiseItem,
  testConnection,
  ollamaRequest
};
