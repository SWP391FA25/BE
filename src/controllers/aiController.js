const axios = require('axios');
const { apiKey, apiUrl } = require('../config/gemini');
const { buildContext, formatContextForPrompt } = require('../utils/aiContext');

/**
 * AI Chat handler với context-aware responses
 * Chatbot có thể đọc dữ liệu từ DB và trả lời dựa trên knowledge base
 */
async function genChat(req, res) {
    try {
        const message = (req.body && (req.body.message || req.body.text)) ? (req.body.message || req.body.text) : '';
        if (!message) return res.status(400).json({ error: 'message is required' });

        console.log('[AI Chat] 💬 User message:', message);

        // Build context từ DB và knowledge base
        const context = await buildContext(message);
        const contextPrompt = formatContextForPrompt(context);

        console.log('[AI Chat] 📚 Context built successfully');

        // Tạo system prompt với context đầy đủ
        const systemPrompt = `Bạn là AI Assistant của hệ thống **EV Station-based Rental System** - Dịch vụ cho thuê xe điện tại điểm thuê.

# VAI TRÒ CỦA BẠN:
- Bạn là nhân viên tư vấn chuyên nghiệp, thân thiện và nhiệt tình
- Nhiệm vụ: Trả lời mọi câu hỏi về dịch vụ thuê xe, quy định, giá cả, hợp đồng, pháp lý
- Phong cách: Lịch sự, rõ ràng, chính xác, dễ hiểu

# NGUỒN THÔNG TIN:
Dưới đây là toàn bộ thông tin về hệ thống (quy định, giá cả, xe có sẵn, trạm thuê):

${contextPrompt}

# HƯỚNG DẪN TRẢ LỜI:
1. **Dựa vào thông tin trên** để trả lời chính xác
2. **Nếu hỏi về giá**: Trích dẫn giá cụ thể từ danh sách xe hoặc bảng giá
3. **Nếu hỏi về quy định**: Trích dẫn chính xác từ phần quy định
4. **Nếu hỏi về hợp đồng/pháp lý**: Giải thích rõ ràng điều khoản và cơ sở pháp lý
5. **Nếu không có thông tin**: Thành thật nói "Tôi cần kiểm tra thêm" và gợi ý liên hệ hotline
6. **Định dạng**: Sử dụng markdown (**, -, \n\n) để câu trả lời dễ đọc
7. **Số liệu**: Luôn format số tiền theo chuẩn VN (VD: 5.000.000 VNĐ)

# LƯU Ý QUAN TRỌNG:
- KHÔNG bịa đặt thông tin không có trong dữ liệu
- KHÔNG đưa ra cam kết vượt quá quy định
- Nếu khách hàng vi phạm, giải thích rõ hậu quả và cách khắc phục
- Nếu khách hàng có yêu cầu đặc biệt, gợi ý liên hệ hotline để thương lượng

Bây giờ hãy trả lời câu hỏi sau:`;

        const url = `${apiUrl}?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: systemPrompt + "\n\n**Câu hỏi:** " + message
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        console.log('[AI Chat] 🚀 Sending request to Gemini API...');

        // Retry logic cho rate limit (429 error)
        let response;
        let retries = 3;
        let delay = 1000; // 1s delay

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                response = await axios.post(url, requestBody, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                });
                break; // Success, thoát loop
            } catch (error) {
                if (error.response?.status === 429 && attempt < retries) {
                    console.log(`[AI Chat] ⏳ Rate limit hit, retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff: 1s, 2s, 4s
                } else {
                    throw error; // Throw nếu không phải 429 hoặc hết retry
                }
            }
        }

        const data = response.data;
        let outText = '';

        if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
                outText = candidate.content.parts[0].text || '';
            }
        }

        if (!outText) {
            outText = "⚠ Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng liên hệ hotline 1900-xxxx để được hỗ trợ trực tiếp.";
        }

        console.log('[AI Chat] ✅ Response generated successfully');

        return res.json({ reply: outText });
    } catch (err) {
        console.error('[AI Chat]Error:', err.message);

        const status = err.response ? err.response.status : 500;
        const errorMessage = err.response ? err.response.data : err.message;

        // Custom error message cho rate limit
        let userMessage = 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.';
        if (status === 429) {
            userMessage = 'Hệ thống AI đang quá tải. Vui lòng thử lại sau 1 phút. Hoặc liên hệ hotline để được hỗ trợ trực tiếp.';
            console.error('[AI Chat]Rate limit exceeded - API key cần được thay thế hoặc đợi quota reset');
        }

        return res.status(status).json({
            error: userMessage,
            details: errorMessage
        });
    }
}

module.exports = { genChat };
