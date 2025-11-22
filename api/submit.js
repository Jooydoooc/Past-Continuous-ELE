// This serverless function handles form submissions and sends results to Telegram
// It runs on Vercel with Node.js 22

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers for mobile compatibility
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
        error: 'Missing required fields' 
      });
    }

    // Get Telegram credentials from environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Telegram configuration missing. Please check environment variables.' 
      });
    }

    // Build the message for Telegram
    let message = `📘 New Past Continuous Test Result\n`;
    message += `👤 Student: ${studentName}\n`;
    message += `✅ Score: ${score}/${total} (${Math.round((score/total)*100)}%)\n\n`;
    message += `📝 Answer Summary:\n`;

    // Group answers by question for better readability
    const questionMap = {};
    answers.forEach(answer => {
      const questionNum = answer.questionLabel.split(' ')[0]; // Get "Q1", "Q2", etc.
      if (!questionMap[questionNum]) {
        questionMap[questionNum] = [];
      }
      questionMap[questionNum].push(answer);
    });

    // Add each question result
    Object.keys(questionMap).forEach(questionNum => {
      const questionAnswers = questionMap[questionNum];
      const allCorrect = questionAnswers.every(a => a.correct);
      const status = allCorrect ? '✅' : '❌';
      
      message += `${status} ${questionNum}: `;
      questionAnswers.forEach((answer, index) => {
        message += `"${answer.userAnswer}"`;
        if (index < questionAnswers.length - 1) message += ' | ';
      });
      message += '\n';
    });

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    const telegramResult = await response.json();

    if (!telegramResult.ok) {
      let errorMessage = 'Failed to send to Telegram';
      if (telegramResult.description) {
        errorMessage += `: ${telegramResult.description}`;
      }
      return res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }

    // Return success to frontend
    res.status(200).json({ 
      success: true,
      message: 'Results sent to Telegram successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
};
