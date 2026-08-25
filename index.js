const fs = require('fs');
const path = require('path');
const express = require('express');
const ngrok = require('@ngrok/ngrok'); // HTTPS Tunneling
const TelegramBot = require('node-telegram-bot-api');

// ----------------- ১. CONFIGURATION & SECRETS -----------------
const MAIN_BOT_TOKEN = process.env.BOT_TOKEN;
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN; // Optional but recommended

if (!MAIN_BOT_TOKEN) {
    console.error("❌ ERROR: BOT_TOKEN পাওয়া যায়নি!");
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const MAX_LIMIT = 199;
const DB_FILE = path.join(__dirname, 'database.json');

let globalPublicUrl = '';

// ----------------- ২. DATABASE MANAGEMENT -----------------
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

// ----------------- ৩. EXPRESS WEB SERVER -----------------
const app = express();
app.use(express.json());

app.get('/app/:userId', (req, res) => {
    const userId = req.params.userId;
    db = loadData();
    const token = db.userTokens[userId];

    if (!token) {
        return res.status(404).send(`
            <h2 style="color:red; font-family:sans-serif; text-align:center; margin-top:50px;">
                ❌ লিঙ্কটি অ্যাক্টিভ নেই অথবা প্রজেক্টটি রিমুভ করা হয়েছে!
            </h2>
        `);
    }

    const generatedHTML = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTTPS Web App Target</title>
        <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 50px; }
            .card { background: #1e293b; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; }
            code { background: #334155; padding: 8px 12px; border-radius: 4px; color: #a7f3d0; font-size: 16px; word-break: break-all; }
            .badge { background: #22c55e; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🔒 HTTPS Secure Portal</h1>
            <p><span class="badge">SSL ACTIVE</span></p>
            <p>আপনার সক্রিয় টোকেন:</p>
            <code>${token}</code>
        </div>
        <script>
            localStorage.setItem("user_injected_token", "${token}");
        </script>
    </body>
    </html>
    `;

    res.send(generatedHTML);
});

// ----------------- ৪. HTTPS PORT FORWARDING (NGROK) -----------------
async function startPortForwarding() {
    try {
        const listener = await ngrok.forward({
            addr: PORT,
            authtoken: NGROK_AUTHTOKEN || undefined
        });

        globalPublicUrl = listener.url(); // Automatically generates https:// URL

        console.log("\n==================================================");
        console.log("🌐 HTTPS Port Forwarding Active: " + globalPublicUrl);
        console.log("==================================================\n");

    } catch (err) {
        console.error('⚠️ Port Forwarding Error:', err);
        setTimeout(startPortForwarding, 5000);
    }
}

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
    startPortForwarding();
});

// ----------------- ৫. TELEGRAM BOT LOGIC & REMOVE SYSTEM -----------------
const bot = new TelegramBot(MAIN_BOT_TOKEN, { polling: true });

// Start Command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        '👋 **স্বাগতম!**\n\n' +
        '• প্রজেক্ট যোগ করতে: আপনার টোকেনটি সরাসরি মেসেজ করুন।\n' +
        '• প্রজেক্ট ডিলিট করতে: /remove লিখে পাঠাতুন।\n' +
        '• স্ট্যাটাস দেখতে: /myproject লিখে পাঠান।',
        { parse_mode: 'Markdown' }
    );
});

// Remove Command
bot.onText(/\/remove/, (msg) => {
    const userId = msg.from.id;
    db = loadData();

    if (!db.userTokens[userId]) {
        return bot.sendMessage(msg.chat.id, '❌ আপনার কোনো সক্রিয় প্রজেক্ট বা লিঙ্ক খুঁজে পাওয়া যায়নি!');
    }

    bot.sendMessage(msg.chat.id, '⚠️ আপনি কি নিশ্চিতভাবে আপনার বর্তমান প্রজেক্টটি মুছে ফেলতে চান?', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🗑️ হ্যাঁ, রিমুভ করুন', callback_data: 'confirm_remove' },
                    { text: '❌ বাতিল', callback_data: 'cancel_remove' }
                ]
            ]
        }
    });
});

// My Project Command
bot.onText(/\/myproject/, (msg) => {
    const userId = msg.from.id;
    db = loadData();

    if (!db.userTokens[userId]) {
        return bot.sendMessage(msg.chat.id, 'ℹ️ আপনার কোনো প্রজেক্ট যোগ করা নেই। টোকেন পাঠিয়ে নতুন প্রজেক্ট তৈরি করুন।');
    }

    const projectUrl = globalPublicUrl + "/app/" + userId;
    bot.sendMessage(
        msg.chat.id,
        `📌 **আপনার বর্তমান প্রজেক্ট:**\n\n` +
        `🌐 **HTTPS Link:**\n${projectUrl}\n\n` +
        `🔑 **Token:** \`${db.userTokens[userId]}\``,
        { parse_mode: 'Markdown' }
    );
});

// Inline Keyboard Response Handling
bot.on('callback_query', (query) => {
    const userId = query.from.id;
    const chatId = query.message.chat.id;

    if (query.data === 'confirm_remove') {
        db = loadData();
        delete db.userTokens[userId];
        saveData(db);

        bot.answerCallbackQuery(query.id, { text: 'প্রজেক্ট মুছে ফেলা হয়েছে!' });
        bot.sendMessage(chatId, '✅ **আপনার প্রজেক্ট এবং লিঙ্কটি সফলভাবে রিমুভ করা হয়েছে।**');
    } else if (query.data === 'cancel_remove') {
        bot.answerCallbackQuery(query.id, { text: 'বাতিল করা হয়েছে' });
        bot.sendMessage(chatId, '👍 প্রজেক্ট রিমুভ করার প্রক্রিয়া বাতিল করা হলো।');
    }
});

// Token Input Handling
bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const inputToken = msg.text.trim();

    db = loadData();
    const currentUsage = db.usageCount[userId] || 0;

    if (currentUsage >= MAX_LIMIT) {
        return bot.sendMessage(chatId, '❌ **দুঃখিত!** আপনার ব্যবহারের লিমিট শেষ হয়ে গেছে।', { parse_mode: 'Markdown' });
    }

    if (!globalPublicUrl) {
        return bot.sendMessage(chatId, '⚠️ HTTPS tunnel প্রস্তুত হচ্ছে, অনুগ্রহ করে ৫ সেকেন্ড পর চেষ্টা করুন।');
    }

    db.userTokens[userId] = inputToken;
    db.usageCount[userId] = currentUsage + 1;
    saveData(db);

    const finalUrl = globalPublicUrl + "/app/" + userId;

    const responseMsg = 
        "✅ **নতুন প্রজেক্ট তৈরি হয়েছে! (HTTPS Secure)**\n\n" +
        "🌐 **এক্সেস লিঙ্ক:**\n" + finalUrl + "\n\n" +
        "⚙️ **ম্যানেজমেন্ট:**\n" +
        "• প্রজেক্ট রিমুভ করতে /remove লিখে পাঠান।";

    bot.sendMessage(chatId, responseMsg, { parse_mode: 'Markdown' });
});
