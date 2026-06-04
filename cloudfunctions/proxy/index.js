/**
 * CloudBase proxy 云函数
 * 
 * 路由：
 *   /proxy              — 默认转发，保持向后兼容
 *   /proxy/tts          — Azure TTS 语音合成（将文本转为 MP3 音频流）
 * 
 * 环境变量（需在 CloudBase 控制台配置）：
 *   AZURE_TTS_KEY       — 微软 Azure 语音服务密钥
 *   AZURE_TTS_REGION    — 微软 Azure 区域（如 eastasia）
 */

const https = require('https');

// ==================== Azure TTS 配置 ====================

/**
 * 调用 Azure Text-to-Speech REST API，将文本合成为 MP3 音频
 * @param {string} text - 待合成的文本
 * @returns {Promise<Buffer>} 音频数据（MP3）
 */
function synthesizeSpeech(text) {
    const key = process.env.AZURE_TTS_KEY;
    const region = process.env.AZURE_TTS_REGION || 'eastasia';

    if (!key) {
        return Promise.reject(new Error('AZURE_TTS_KEY 未配置'));
    }

    // SSML 请求体：使用 zh-CN-XiaoxiaoNeural 晓晓女声，温和自然的朗读风格
    const ssml = `
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
            <voice name='zh-CN-XiaoxiaoNeural'>
                <prosody rate='0.9' pitch='+5%'>
                    ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')}
                </prosody>
            </voice>
        </speak>`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: `${region}.tts.speech.microsoft.com`,
            path: '/cognitiveservices/v1',
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                'User-Agent': 'HerShield-TTS',
                'Content-Length': Buffer.byteLength(ssml, 'utf-8')
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const body = Buffer.concat(chunks);

                if (res.statusCode === 200) {
                    resolve(body);
                } else {
                    const errMsg = `Azure TTS 返回 ${res.statusCode}: ${body.toString('utf-8').substring(0, 200)}`;
                    reject(new Error(errMsg));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Azure TTS 网络请求失败: ${e.message}`));
        });

        req.write(ssml);
        req.end();
    });
}

// ==================== CloudBase 云函数入口 ====================

exports.main = async (event, context) => {
    const { httpMethod, path, queryStringParameters } = event;

    // 路由：/proxy/tts
    if (path && path.endsWith('/tts')) {
        const text = (queryStringParameters && queryStringParameters.text) || '';

        if (!text || text.trim().length === 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: '缺少 text 参数' })
            };
        }

        try {
            const audioBuffer = await synthesizeSpeech(text.trim());

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.length,
                    'Cache-Control': 'public, max-age=86400'
                },
                body: audioBuffer.toString('base64'),
                isBase64Encoded: true
            };
        } catch (err) {
            console.error('TTS 合成失败:', err.message);
            // 返回 503，前端收到后将降级到浏览器 SpeechSynthesis
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'TTS 服务不可用', detail: err.message })
            };
        }
    }

    // 默认路由：原 proxy 转发逻辑（如有）
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'HerShield Proxy OK' })
    };
};
