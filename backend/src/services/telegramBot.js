import TelegramBot from 'node-telegram-bot-api';
import { getSession, updateSession } from '../database/index.js';
import { calculateTelegramScore } from '../scoring/telegram.js';
import { generateAleoCommitment } from '../utils/aleoField.js';

let bot = null;

export const initTelegramBot = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.log('[Telegram Bot] ⚠️ TELEGRAM_BOT_TOKEN not set, skipping bot initialization');
    return;
  }

  try {
    // Initialize bot in polling mode
    console.log('[Telegram Bot] Initializing with token:', token.substring(0, 5) + '...');
    // Fix for potential import issue with CommonJS module in ES environment
    const BotClass = TelegramBot.default || TelegramBot;
    bot = new BotClass(token, { polling: true });
    
    console.log('[Telegram Bot] Bot instance created. Methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(bot)));

    // Clear any existing webhook to ensure polling works
    // Use try-catch for deleteWebHook specifically
    try {
        if (typeof bot.deleteWebHook === 'function') {
            await bot.deleteWebHook();
        } else if (typeof bot.deleteWebhook === 'function') {
             await bot.deleteWebhook();
        } else {
            console.warn('[Telegram Bot] Warning: deleteWebHook is not a function');
        }
    } catch (e) {
        console.warn('[Telegram Bot] Failed to delete webhook:', e.message);
    }
    console.log('[Telegram Bot] ✅ Bot initialized in polling mode');

    // Handle /start <sessionId>
    bot.onText(/\/start (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const sessionId = match[1];

      console.log(`[Telegram Bot] Received /start with sessionId: ${sessionId}`);

      try {
        const session = await getSession(sessionId);
        
        if (!session) {
          await bot.sendMessage(chatId, '❌ Session not found or expired. Please start verification from the website again.');
          return;
        }

        if (session.status === 'verified') {
          await bot.sendMessage(chatId, '✅ You are already verified!');
          return;
        }

        // Get user profile photos
        let photoUrl = null;
        try {
          const photos = await bot.getUserProfilePhotos(msg.from.id, { limit: 1 });
          if (photos.total_count > 0) {
            const fileId = photos.photos[0][photos.photos[0].length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            photoUrl = fileLink;
          }
        } catch (err) {
          console.error('[Telegram Bot] Failed to get profile photo:', err.message);
        }

        // Calculate score
        // We assume account age is > 1 year for simplicity or check if we can get date joined (not possible via bot API)
        // We'll use a default or heuristics if available.
        // auth_date is not available in message, only date of message.
        // We can't verify account age accurately via Bot API alone without Telegram Login Widget data.
        // We'll proceed with best effort.
        const accountAgeDays = 365; 

        const scoreResult = calculateTelegramScore({
          id: msg.from.id,
          username: msg.from.username,
          photo_url: photoUrl,
          accountAgeDays
        });

        // Generate commitment
        const platformId = 4; // Telegram
        const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
        const commitment = generateAleoCommitment(platformId, msg.from.id.toString(), secretSalt);

        const result = {
          verified: true,
          provider: 'telegram',
          userId: msg.from.id.toString(),
          username: msg.from.username || msg.from.first_name,
          score: scoreResult.score,
          criteria: scoreResult.criteria,
          maxScore: scoreResult.maxScore,
          commitment
        };

        // Update session
        await updateSession(sessionId, {
          status: 'verified',
          stateData: {
            ...session.stateData,
            telegramUserId: msg.from.id,
            telegramUsername: msg.from.username,
            telegramChatId: chatId,
            result,
            completedAt: new Date()
          }
        });

        // Send success message with link back to frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const callbackUrl = `${frontendUrl}/verify/callback?provider=telegram&session=${sessionId}`;
        
        // Telegram inline buttons don't support localhost URLs.
        // If localhost, just send text.
        const isLocalhost = callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1');

        if (isLocalhost) {
              // Escape underscores for Markdown to prevent parsing errors
              const safeUrl = callbackUrl.replace(/_/g, '\\_');
              await bot.sendMessage(chatId, `🔐 *Verification Successful!*\n\nYou can return to the website now.\n\nLink: ${safeUrl}`, {
                 parse_mode: 'Markdown'
              });
         } else {
            await bot.sendMessage(chatId, '🔐 *Verification Successful!*', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                { text: '✅ Complete Verification', url: callbackUrl }
                ]]
            }
            });
        }

        console.log(`[Telegram Bot] Verified session ${sessionId} for user ${msg.from.username || msg.from.id}`);

      } catch (error) {
        console.error('[Telegram Bot] Error processing /start:', error);
        await bot.sendMessage(chatId, '❌ An error occurred during verification. Please try again.');
      }
    });

    // Handle /start without arguments
    bot.onText(/\/start$/, (msg) => {
      bot.sendMessage(msg.chat.id, '👋 Welcome to ZKPersona!\n\nPlease start verification from the website to get a session ID.');
    });

    // Handle polling errors
    bot.on('polling_error', (error) => {
      console.error('[Telegram Bot] Polling error:', error.code, error.message);
    });

  } catch (error) {
    console.error('[Telegram Bot] Initialization failed:', error);
  }
};
