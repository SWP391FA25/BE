module.exports = {
    apiKey: process.env.GEMINI_API_KEY || '',
    apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
};