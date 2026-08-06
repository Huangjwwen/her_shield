/**
 * CloudBase proxy 云函数
 *
 * 路由：
 *   /proxy              — 转发到腾讯元器智能体
 *   /proxy/tts          — Azure TTS 语音合成（将文本转为 MP3 音频流）
 *
 * 环境变量（需在 CloudBase 控制台配置）：
 *   KEY_CONSULTATION    — 元器 consultation 智能体 appkey
 *   KEY_RADAR           — 元器 radar 智能体 appkey
 *   KEY_SELFCHECK       — 元器 selfcheck 智能体 appkey
 *   KEY_EVIDENCE        — 元器 evidence 智能体 appkey
 *   KEY_GUIDE           — 元器 guide 智能体 appkey
 *   KEY_HARBOR          — 元器 harbor 智能体 appkey
 *   AZURE_TTS_KEY       — 微软 Azure 语音服务密钥
 *   AZURE_TTS_REGION    — 微软 Azure 区域（如 eastasia）
 */

const https = require('https');
const crypto = require('crypto');

const YUANQI_HOST = 'yuanqi.tencent.com';
const YUANQI_PATH = '/openapi/v1/agent/chat/completions';
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_SIZE = 1000;
const responseCache = new Map();

const APPID_MAP = {
    consultation: '2037893130997763264',
    radar: '2037893130997763264',
    selfcheck: '2041405236168255296',
    evidence: '2041711833478227776',
    guide: '2041721348920706112',
    harbor: '2043227755042047040'
};

function keyMap() {
    return {
        consultation: process.env.KEY_CONSULTATION,
        radar: process.env.KEY_RADAR,
        selfcheck: process.env.KEY_SELFCHECK,
        evidence: process.env.KEY_EVIDENCE,
        guide: process.env.KEY_GUIDE,
        harbor: process.env.KEY_HARBOR
    };
}

function jsonResponse(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify(payload)
    };
}

function parseBody(event) {
    if (!event || event.body == null) return {};
    if (typeof event.body === 'object') return event.body;
    const text = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : String(event.body);
    return text ? JSON.parse(text) : {};
}

function computeCacheKey(agentType, messages, extras) {
    const stable = JSON.stringify({ agentType, messages, extras });
    return crypto.createHash('sha256').update(stable).digest('hex');
}

function getCached(cacheKey) {
    const hit = responseCache.get(cacheKey);
    if (!hit) return null;
    if (Date.now() > hit.expiry) {
        responseCache.delete(cacheKey);
        return null;
    }
    return hit.value;
}

function setCached(cacheKey, value) {
    if (responseCache.size >= CACHE_MAX_SIZE) {
        const oldest = responseCache.keys().next().value;
        responseCache.delete(oldest);
    }
    responseCache.set(cacheKey, {
        expiry: Date.now() + CACHE_TTL_MS,
        value
    });
}

function shouldCache(result) {
    const data = result && result.data ? result.data : result;
    if (!data || data.error) return false;
    const choice = data.choices && data.choices[0];
    if (choice && ['length', 'content_filter'].includes(choice.finish_reason)) return false;
    return Boolean(data.choices || data.content || data.response || data.answer || data.text);
}

function postJsonToYuanqi(appkey, body) {
    const payload = JSON.stringify(body);
    const options = {
        hostname: YUANQI_HOST,
        path: YUANQI_PATH,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appkey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 65000
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    reject(new Error(`元器响应非 JSON: ${text.slice(0, 200)}`));
                    return;
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`元器 HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
                    return;
                }
                resolve(data);
            });
        });

        req.on('timeout', () => {
            req.destroy(new Error('元器请求超时'));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function handleYuanqiProxy(event) {
    const body = parseBody(event);
    const { agentType, messages, nocache, user_id, stream, ...extras } = body;
    const appid = APPID_MAP[agentType];
    const appkey = keyMap()[agentType];

    if (!appid || !appkey) {
        return jsonResponse(400, {
            success: false,
            error: '未知 agentType 或对应 KEY 未配置',
            agentType
        });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
        return jsonResponse(400, { success: false, error: 'messages 不能为空' });
    }

    const requestBody = {
        assistant_id: appid,
        user_id: user_id || `cloudbase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        stream: Boolean(stream),
        messages,
        ...extras
    };

    const cacheKey = computeCacheKey(agentType, messages, extras);
    if (!nocache && !requestBody.stream) {
        const cached = getCached(cacheKey);
        if (cached) return jsonResponse(200, { ...cached, fromCache: true });
    }

    const data = await postJsonToYuanqi(appkey, requestBody);
    const result = { success: true, data };

    if (!nocache && !requestBody.stream && shouldCache(result)) {
        setCached(cacheKey, result);
    }

    return jsonResponse(200, result);
}

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

    if (httpMethod === 'OPTIONS') {
        return jsonResponse(204, {});
    }

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

    try {
        return await handleYuanqiProxy(event);
    } catch (err) {
        console.error('proxy 转发失败:', err);
        return jsonResponse(502, { success: false, error: err.message || 'proxy 转发失败' });
    }
};
