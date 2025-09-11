const axios = require('axios');
const { apiKey, apiUrl } = require('../config/gemini');

async function genChat(req, res) {
    try {
        const message = (req.body && (req.body.message || req.body.text)) ? (req.body.message || req.body.text) : '';
        if (!message) return res.status(400).json({ error: 'message is required' });

        const url = `${apiUrl}?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: "Bạn hãy đóng vai trò là AI Phần mềm thuê xe điện tại điểm thuê - EV Station-based Rental System, là 1 nhân viên của hệ thống này, hãy trả lời vấn đề sau: " + message
                        }
                    ]
                }
            ]
        };

        const response = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        });

        const data = response.data;
        let outText = '';

        if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
                outText = candidate.content.parts[0].text || '';
            }
        }

        if (!outText) outText = "⚠ Không tìm thấy nội dung từ AI.";

        return res.json({ reply: outText });
    } catch (err) {
        const status = err.response ? err.response.status : 500;
        const body = err.response ? err.response.data : err.message;
        return res.status(status).json({ error: body });
    }
}

module.exports = { genChat };