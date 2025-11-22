// This serverless function handles form submissions and sends results to Telegram
// It runs on Vercel with Node.js 22

// Import fetch for making HTTP requests to Telegram API
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers to allow requests from your frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Parse the JSON data from the frontend
    const { studentName, answers, score, total } = req.body;

    // Validate required data
    if (!studentName || !answers || score === undefined || !total) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: studentName, answers, score, or total' 
      });
    }

    // Get Telegram credentials from environment variables (set in Vercel dashboard)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log('Environment check:', {
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
      chatId: chatId
    });

    if (!botToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Telegram Bot Token is missing. Please set TELEGRAM_BOT_TOKEN in Vercel environment variables.' 
      });
    }

    if (!chatId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Telegram Chat ID is missing. Please set TELEGRAM_CHAT_ID in Vercel environment variables.' 
      });
    }

    // Build the message for Telegram
    let message = `📘 New Past Continuous Test Result\n`;
    message += `👤 Name: ${studentName}\n`;
    message += `✅ Score: ${score}/${total} (${Math.round((score/total)*100)}%)\n\n`;
    message += `📄 Details:\n`;

    // Add each blank result (limit to first 10 for readability)
    answers.slice(0, 10).forEach((answer) => {
      const status = answer.correct ? '✅' : '❌';
      message += `${status} ${answer.questionLabel}: "${answer.userAnswer}"\n`;
    });

    // If there are more than 10 answers, show a summary
    if (answers.length > 10) {
      message += `\n... and ${answers.length - 10} more answers`;
    }

    // Send message to Telegram using the Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    console.log('Sending to Telegram:', telegramUrl);
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const telegramResult = await response.json();

    console.log('Telegram API response:', telegramResult);

    if (!telegramResult.ok) {
      let errorMessage = 'Failed to send message to Telegram';
      
      if (telegramResult.error_code === 400) {
        errorMessage = 'Invalid Chat ID. Please check TELEGRAM_CHAT_ID.';
      } else if (telegramResult.error_code === 401) {
        errorMessage = 'Invalid Bot Token. Please check TELEGRAM_BOT_TOKEN.';
      } else if (telegramResult.error_code === 403) {
        errorMessage = 'Bot is not a member of the chat. Add bot to your group/channel.';
      } else if (telegramResult.description) {
        errorMessage = `Telegram error: ${telegramResult.description}`;
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }

    // Return success to frontend
    res.status(200).json({ 
      success: true,
      message: 'Results sent successfully to Telegram'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
};
