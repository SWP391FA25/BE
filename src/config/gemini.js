module.exports = {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyBny_5rk8aKOYT4Ld-_sgT9FD0v-Eggb54',
    apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
};