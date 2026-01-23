// Ollama AI Service for store items and appraisals
const http = require('http');

const OLLAMA_HOST = '192.168.0.93';
const OLLAMA_PORT = 11434;
const MODEL = 'deepseek-r1:8b';

// Total request timeout (5 minutes)
const REQUEST_TIMEOUT = 300000;

// Make a request to the Ollama API
async function ollamaRequest(prompt, options = {}) {
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
          // Extract just the response text, removing any <think> tags
          let response = json.response || '';
          // Remove thinking tags that deepseek-r1 uses
          response = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
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
async function appraiseItem(itemName, itemDescription, itemEmoji, originalPrice, category) {
  const prompt = `You are a dramatic, eccentric antiques appraiser with a flair for absurd explanations. A customer brought in:

Item: ${itemEmoji || ''} ${itemName}
Description: ${itemDescription || 'No description'}
Category: ${category}
Original price: $${originalPrice}

IMPORTANT: Your reason MUST directly reference the specific item ("${itemName}") and its characteristics. Be funny and creative! The reason should only make sense for THIS exact item.

The value can range from $1 to $10,000,000. Be unpredictable!

Respond with ONLY this JSON (no other text):
{"value": NUMBER, "reason": "One dramatic sentence about THIS SPECIFIC item"}

GOOD examples (notice how each reason is specific to that item):
- Stuffed Panda: "Pandas are no longer endangered so demand has plummeted!"
- Ancient Coin: "This coin was used to pay Julius Caesar's barber - priceless!"
- Gaming Mouse: "Turns out this mouse was used to win a $2 million esports tournament!"
- Pet Rock: "DNA testing confirms this rock witnessed the dinosaur extinction."
- Banana: "This is THE banana from the $120,000 art exhibit... someone ate the original."
- Crown Title: "The previous owner was dethroned in a coup - now it's bad luck."
- Void Fragment: "The void stared back and liked what it saw - collectors are terrified."

BAD examples (too generic, could apply to anything):
- "This is quite valuable!"
- "Unfortunately it's a fake."
- "Market conditions have changed."`;

  try {
    const response = await ollamaRequest(prompt, { temperature: 1.1, maxTokens: 300 });

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*?"value"[\s\S]*?"reason"[\s\S]*?\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const value = Math.max(1, Math.min(10000000, parseInt(result.value) || originalPrice));
      const reason = result.reason || 'The appraiser mumbled something incomprehensible.';
      return { value, reason };
    }

    // Fallback: generate random value if AI response was malformed
    throw new Error('Could not parse appraisal response');
  } catch (error) {
    console.error('AI appraisal failed:', error.message);
    // Fallback to random appraisal
    return generateFallbackAppraisal(originalPrice, itemName);
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
