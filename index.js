const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ----------------- ১. প্রয়োজনীয় প্যাকেজ অটো-ইনস্টলেশন -----------------
console.log("Installing required dependencies...");
try {
    execSync('npm install node-telegram-bot-api express localtunnel', { stdio: 'inherit' });
    console.log("All dependencies installed successfully!\n");
} catch (error) {
    console.error("Failed to install packages:", error);
    process.exit(1);
}

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const localtunnel = require('localtunnel');

// ----------------- ২. GITHUB SECRETS ও কনফিগারেশন -----------------
// GitHub Secrets-এ সেট করা 'BOT_TOKEN' এখান থেকে অটোমেটিক রিড হবে
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

// ----------------- ৩. ফাইল ডেটাবেস সিস্টেম (Zero Data Loss) -----------------
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

// ----------------- ৪. EXPRESS WEB SERVER SETUP -----------------
const app = express();
app.use(express.json());

app.get('/app/:userId', (req, res) => {
    const userId = req.params.userId;
    db = loadData(); // সর্বশেষ আপডেট হওয়া ডাটা পড়া
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
        <title>Token Web App</title>
        <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 50px; }
            .card { background: #1e293b; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; }
            code { background: #334155; padding: 8px 12px; border-radius: 4px; color: #a7f3d0; font-size: 16px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🎉 ওয়েবসাইট সফলতা নিশ্চিত হয়েছে!</h1>
            <p>আপনার ইনজেক্ট করা টোকেন:</p>
            <code>${token}</code>
        </div>
        <script>
            // ব্রাউজারের LocalStorage-এও সেভ করে রাখা হচ্ছে
            localStorage.setItem("user_injected_token", "${token}");
            console.log("Token stored in LocalStorage:", "${token}");
        </script>
    </body>
    </html>
    `;

    res.send(generatedHTML);
});

// ----------------- ৫. AUTO-FIX LOCALTUNNEL SYSTEM -----------------
async function startTunnel() {
    try {
        tunnelInstance = await localtunnel({ port: PORT });
        globalPublicUrl = tunnelInstance.url;

        console.log(`\n==================================================`);
        console.log(`🌐 LocalTunnel Active: ${globalPublicUrl}`);
        console.log(`==================================================\n`);

        // লিঙ্ক কেটে গেলে অটোমেটিক ৩ সেকেন্ডে রিকানেক্ট হবে
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

// ----------------- ৬. TELEGRAM BOT LOGIC -----------------
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

    // ১৯৯ বারের লিমিট চেক
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

    // ফাইল ডেটাবেসে আপডেট
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
