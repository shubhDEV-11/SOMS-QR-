const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');
const fs = require('fs');
const express = require('express');

// Load config
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const token = config.bot_token;

// Create bot with polling (Render-friendly)
const bot = new TelegramBot(token, { polling: true });

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('UPI QR Bot is running.');
});

app.listen(port, () => {
    console.log(Server running on port ${port});

const activeQRCodes = {};

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId != config.admin_id) {
        bot.sendMessage(chatId, "🚫 Access Denied.\n\nThis bot is restricted to authorized personnel only.");
        return;
    }

    const introMessage = `👋 Welcome to the *SOMS UPI Payment Management Bot* 🤖

📌 *Purpose*: Generate secure, time-limited UPI QR codes for streamlined payments.

👑 *Owner*: *SOMS*
🛠 *Developer*: *Shubh* 
⚙️ *System*: Fully automated, professionally crafted for efficient payment processing.

Simply send the payment amount to generate a UPI QR Code instantly. After payment, mark it as received with one click.

✨ *Effortless. Secure. Professional.*

Enjoy smooth operations with SOMS.`;

    bot.sendMessage(chatId, introMessage, { parse_mode: 'Markdown' });
});

// Handle messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text.startsWith('/start')) return;

    if (userId != config.admin_id) {
        bot.sendMessage(chatId, "🚫 Access Denied.\n\nThis bot is restricted to authorized personnel only.");
        return;
    }

    if (text === '✅ Mark as Paid') {
        const lastAmount = activeQRCodes[chatId]?.amount;
        if (!lastAmount) {
            bot.sendMessage(chatId, "⚠️ No active payment request found.");
            return;
        }

        clearTimeout(activeQRCodes[chatId].timeout);
        delete activeQRCodes[chatId];

        bot.sendMessage(chatId, ✅ Payment of ₹${lastAmount} has been successfully received and logged.\n\nThank you for your transaction.);
        return;
    }

    const amount = parseFloat(text);

    if (isNaN(amount)) {
        bot.sendMessage(chatId, "💡 Please enter a valid numeric payment amount to generate the UPI QR code.");
        return;
    }

    const upiUrl = upi://pay?pa=${config.upi_id}&pn=Payment&am=${amount}&cu=INR;

    QRCode.toBuffer(upiUrl, { width: 400 }, async (err, buffer) => {
        if (err) {
            bot.sendMessage(chatId, "❌ Unable to generate QR Code at this moment. Please try again later.");
            console.error(err);
            return;
        }

        await bot.sendPhoto(chatId, buffer, {
            caption: 🧾 Payment Request Generated\n\n💰 Amount to be Paid: ₹${amount}\n\n📌 *After successfully completing the payment, kindly share the transaction screenshot for verification and processing.*\n\n⏳ This QR Code is valid for 5 minutes.,
            parse_mode: 'Markdown'
        });

        const keyboard = {
            reply_markup: {
                keyboard: [['✅ Mark as Paid']],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        await bot.sendMessage(chatId, "🔖 Once payment is successfully received, click the button below to mark it as paid.", keyboard);

        if (activeQRCodes[chatId]) clearTimeout(activeQRCodes[chatId].timeout);
        activeQRCodes[chatId] = {
            amount: amount,
            timeout: setTimeout(() => {
                bot.sendMessage(chatId, "⌛️ The QR Code has expired. Please generate a fresh one if required.");
                delete activeQRCodes[chatId];
            }, 5 * 60 * 1000)
        };
    });
});
