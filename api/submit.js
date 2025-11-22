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

    if (!botToken || !chatId) {
      console.error('Missing Telegram environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Telegram configuration missing' 
      });
    }

    // Build the message for Telegram
    let message = `📚 New Past Continuous Test Result:\n`;
    message += `👤 Name: ${studentName}\n`;
    message += `📊 Score: ${score}/${total}\n`;
    message += `📝 Details:\n`;

    // Add each question result
    answers.forEach((answer, index) => {
      const questionNum = index + 1;
      const status = answer.isCorrect ? '✅ Correct' : '❌ Incorrect';
      message += `Q${questionNum}: "${answer.userAnswer}" → ${status}\n`;
    });

    // Send message to Telegram using the Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
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

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send message to Telegram' 
      });
    }

    // Return success to frontend
    res.status(200).json({ 
      success: true,
      message: 'Results sent successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
};
