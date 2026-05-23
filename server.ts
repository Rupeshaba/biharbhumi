import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cron from "node-cron";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";

dotenv.config();

// Load Firebase Config
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8")
);
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json());

const PORT = 3000;
const REQID = "dNC91D4P-EWIB-WEUIWB-34NJDJBS";

// Shared structures
let liveLogs: { id: string; timestamp: string; level: string; message: string }[] = [];
let pendingOtps: { [token: string]: { otp: string; expires: number } } = {};

function addLiveLog(level: "info" | "success" | "warning" | "error", message: string) {
  const log = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    message
  };
  liveLogs.push(log);
  if (liveLogs.length > 200) {
    liveLogs = liveLogs.slice(-100); // auto-trim older logs to keep memory low
  }
  console.log(`[${level.toUpperCase()}] ${message}`);
}

addLiveLog("info", "Server starting up. Connecting to Firestore...");

// AES Encryption helper for Bihar Citizen Portal
function aesEncrypt(plaintext: string, keyB64: string, ivB64: string): string {
  const key = Buffer.from(keyB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// Helper to identify placeholder chat IDs
function isPlaceholderChatId(chatId: string): boolean {
  const clean = (chatId || "").trim().toLowerCase();
  return !clean || clean === "your_telegram_chat_id" || clean === "your_chat_id" || clean.startsWith("your_");
}

// Polling for new Telegram updates (to handle /start command, group bot additions, and commands in groups)
let telegramOffset = 0;
async function pollTelegramUpdates() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const cleanToken = (botToken || "").trim().replace(/^bot/i, "");
  if (!cleanToken || cleanToken === "YOUR_TELEGRAM_BOT_TOKEN") {
    return;
  }
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates?offset=${telegramOffset}&timeout=5`);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        telegramOffset = Math.max(telegramOffset, update.update_id + 1);
        
        let chatId = "";
        let username = "";
        let triggerReceived = false;
        let isStartCommand = false;

        const message = update.message;
        const myChatMember = update.my_chat_member;

        if (message && message.chat && message.chat.id) {
          chatId = String(message.chat.id);
          const text = (message.text || "").trim().toLowerCase();
          const hasNewMembers = message.new_chat_members && Array.isArray(message.new_chat_members);
          const containsStart = text.includes("/start");

          // Trigger registration if a start command is typed OR if there is a new member addition (such as the bot being added)
          if (containsStart || hasNewMembers) {
            triggerReceived = true;
            isStartCommand = containsStart;
            username = message.chat.title || message.chat.username || message.chat.first_name || "Telegram Chat";
          }
        } else if (myChatMember && myChatMember.chat && myChatMember.chat.id) {
          // Trigger when the bot is added directly to a group/channel (even without any messages)
          chatId = String(myChatMember.chat.id);
          triggerReceived = true;
          isStartCommand = false;
          username = myChatMember.chat.title || myChatMember.chat.username || myChatMember.chat.first_name || "Telegram Group/Channel";
        }

        if (!chatId || !triggerReceived) continue;

        const isGroupChat = chatId.startsWith("-");
        const docRef = doc(db, "botUsers", chatId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          addLiveLog("info", `Received launch trigger from unregistered Telegram ${isGroupChat ? "group" : "user"}: ${username} (${chatId})`);
          
          // New subscriber registration flow (Awaiting Admin approval)
          const newUserData = {
            chatId,
            username,
            blocked: false,
            notifyEnabled: true,
            approved: false, // New registration needs admin approval!
            templates: [],
            msgType: isGroupChat ? "new" : "new", // default notify mode
            assignedFields: {}
          };
          await setDoc(docRef, newUserData);
          addLiveLog("success", `New Telegram ${isGroupChat ? "group" : "subscriber"} registered (Awaiting Approval): ${username} (${chatId})`);
          
          // Send bilingual onboarding message informing them they are pending approval
          let welcomeMsg = "";
          if (isGroupChat) {
            welcomeMsg = `👋 *नमस्ते Bihar Land Registry Group/Channel!*\n\nइस ग्रुप की रजिस्ट्रेशन रिक्वेस्ट मिल गई है। आपका ग्रुप अभी *असिस्टेंट एडमिनिस्ट्रेटर* की अप्रूवल के लिए पेंडिंग है (Awaiting Approval).\n\nजैसे ही एडमिनिस्ट्रेटर इसे अप्रूव करेंगे, बिहार लैंड रजिस्ट्री की पल-पल की जानकारियां और दैनिक पीडीएफ बुलेटिन इस ग्रुप में आनी शुरू हो जाएंगी।\n\n_Group Chat ID: \`${chatId}\`_\n_Status: Pending Admin Verification_`;
          } else {
            welcomeMsg = `👋 *Welcome to Bihar Land Registry Bot!*\n\nYour registration request has been received. Your Account is currently *Pending Approval* by the systems administrator.\n\nOnce approved, you will begin receiving real-time Bihar land transaction listings directly here.\n\n_Your Telegram Chat ID: \`${chatId}\`_\n_Status: Pending Admin Verification_`;
          }
          await sendTelegramMessage(botToken, chatId, welcomeMsg);
        } else {
          const userData = docSnap.data();
          if (userData.blocked) {
            // Quietly ignore or reply only if it's an explicit /start command to avoid chatting noise
            if (isStartCommand) {
              await sendTelegramMessage(botToken, chatId, "🚫 *Access Restricted*\n\nYour account has been blocked by the administrator. Direct inquiries to system admin.");
            }
          } else if (userData.approved === false) {
            if (isStartCommand) {
              await sendTelegramMessage(botToken, chatId, isGroupChat
                ? "⏳ *Pending Approval*\n\nयह ग्रुप अभी एडमिनिस्ट्रेटर की तरफ से अप्रूवल के लिए पेंडिंग है। अप्रूव होते ही आपको सूचित कर दिया जाएगा और लाइव अपडेट्स चालू हो जाएंगे!"
                : "⏳ *Pending Approval*\n\nYour subscription is still awaiting verification by the administrator. You will be notified automatically once approved!");
            }
          } else {
            if (isStartCommand) {
              await sendTelegramMessage(botToken, chatId, isGroupChat
                ? "✅ *Group Active*\n\nयह ग्रुप सक्रिय है! बिहार लैंड रजिस्ट्री बुलेटिन और लाइव अपडेट्स इस ग्रुप में भेजे जाएंगे।"
                : "✅ *Subscription Active*\n\nYour subscriber profile is verified and active! You will receive land registration bulletins and instantaneous updates automatically.");
            }
          }
        }
      }
    }
  } catch (err) {
    // Avoid spamming logs
  }
}

// Start polling loop once server boots
function startTelegramUpdatePolling() {
  addLiveLog("info", "Starting Telegram /getUpdates command listener background thread...");
  setInterval(() => {
    pollTelegramUpdates();
  }, 5000); // Poll every 5 seconds for responsive commands
}

// Send OTP / Telegram notifications
async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  const cleanToken = (botToken || "").trim().replace(/^bot/i, "");
  if (!cleanToken || cleanToken === "YOUR_TELEGRAM_BOT_TOKEN") {
    addLiveLog("error", "Telegram send aborted: botToken is not configured or is a placeholder");
    return false;
  }
  const targetId = (chatId || "").trim();
  if (isPlaceholderChatId(targetId)) {
    addLiveLog("warning", `Telegram notification skipped: Chat ID "${targetId}" is a placeholder or empty.`);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        chat_id: targetId,
        text: text,
        parse_mode: "Markdown"
      })
    });
    
    const resText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      addLiveLog("error", `Telegram API returned status ${res.status} with non-JSON response: ${resText.slice(0, 150)}`);
      return false;
    }

    if (!data.ok) {
      if (data.description && data.description.includes("chat not found")) {
        addLiveLog("warning", `Telegram Chat Not Found for ID "${targetId}": Please search for your bot on Telegram and send /start first to open the chat!`);
        return false;
      }
      // Fallback in case of strict Markdown formatting failure
      const resPlain = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          chat_id: targetId,
          text: text
        })
      });
      const resPlainText = await resPlain.text();
      let dataPlain: any = {};
      try {
        dataPlain = JSON.parse(resPlainText);
      } catch {
        addLiveLog("error", `Telegram API fallback returned status ${resPlain.status} with non-JSON response: ${resPlainText.slice(0, 150)}`);
        return false;
      }
      
      if (!dataPlain.ok && dataPlain.description && dataPlain.description.includes("chat not found")) {
        addLiveLog("warning", `Telegram Chat Not Found for ID "${targetId}" (plain): Please search for your bot on Telegram and send /start first to open the chat!`);
      }
      return !!dataPlain.ok;
    }
    return true;
  } catch (err) {
    addLiveLog("error", `Failed sending Telegram message: ${err}`);
    return false;
  }
}

// Sanitize text for PDFKit default Helvetica/standard fonts (strictly ASCII 32-126) to prevent fatal font crashes
function sanitizePDFText(value: any): string {
  if (value === undefined || value === null) return "N/A";
  const str = String(value);
  return str.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) {
      return char;
    }
    return '';
  }).join('').replace(/\s+/g, ' ').trim() || "N/A";
}

// Send daily compile document PDF to subscriber
async function sendTelegramPDF(botToken: string, chatId: string, pdfBuffer: Buffer, filename: string): Promise<boolean> {
  const cleanToken = (botToken || "").trim().replace(/^bot/i, "");
  if (!cleanToken || cleanToken === "YOUR_TELEGRAM_BOT_TOKEN") {
    addLiveLog("error", "Telegram PDF send aborted: botToken is not configured or is a placeholder");
    return false;
  }
  const targetId = (chatId || "").trim();
  if (isPlaceholderChatId(targetId)) {
    addLiveLog("warning", `Telegram PDF bulletin skipped: Chat ID "${targetId}" is a placeholder or empty.`);
    return false;
  }
  const formData = new FormData();
  
  // Create File descriptor utilizing global constructor in modern Node or Blob fallback
  let fileItem: any;
  if (typeof File !== "undefined") {
    fileItem = new File([pdfBuffer], filename, { type: 'application/pdf' });
  } else {
    fileItem = new Blob([pdfBuffer], { type: 'application/pdf' });
  }

  formData.append('chat_id', targetId);
  formData.append('document', fileItem, filename);
  
  try {
    addLiveLog("info", `Sending PDF bulletin (${(pdfBuffer.length / 1024).toFixed(1)} KB) to chatId: ${targetId}...`);
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendDocument`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: formData
    });
    const resText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      addLiveLog("error", `Telegram API sendDocument returned status ${res.status} with non-JSON response: ${resText.slice(0, 150)}`);
      return false;
    }
    if (data.ok) {
      addLiveLog("success", `PDF bulletin sent successfully to chatId: ${targetId}`);
      return true;
    } else {
      if (data.description && data.description.includes("chat not found")) {
        addLiveLog("warning", `Telegram PDF Send Rejected: Chat ID "${targetId}" was not found by your bot. Send /start to your bot from this Telegram account first!`);
      } else {
        addLiveLog("error", `Telegram rejected PDF: ${JSON.stringify(data)}`);
      }
      return false;
    }
  } catch (err) {
    addLiveLog("error", `Failed to send Telegram PDF attachment: ${err}`);
    return false;
  }
}

// Generate PDF Buffer for "all records" subscriber requests
function generatePDFBuffer(records: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => {
        addLiveLog("error", `PDFKit document generation error: ${err}`);
        reject(err);
      });

      // Header
      doc.fillColor("#1a202c").fontSize(20).text('Bihar Registry Records Bulletin', { align: 'center' });
      doc.fontSize(10).fillColor("#718096").text(`Date: ${new Date().toLocaleDateString('en-IN')} | System compiled reports`, { align: 'center' });
      doc.moveDown();
      doc.strokeColor("#e2e8f0").moveTo(40, doc.y).lineTo(570, doc.y).stroke();
      doc.moveDown(1.5);

      records.forEach((rec, idx) => {
        const token = sanitizePDFText(rec.token_no);
        const sro = sanitizePDFText(rec.sro_name);
        const date = sanitizePDFText(rec.reg_date);
        const deed = sanitizePDFText(rec.deed_type);
        const value = sanitizePDFText(rec.chargeable_value);
        const seller = sanitizePDFText(rec.executant);
        const sellerAddr = sanitizePDFText(rec.executant_addr);
        const buyer = sanitizePDFText(rec.claimant);
        const buyerAddr = sanitizePDFText(rec.claimant_addr);
        const khata = sanitizePDFText(rec.khata_no);
        const plot = sanitizePDFText(rec.plot_no);
        const extent = sanitizePDFText(rec.extent_dec);
        const landType = sanitizePDFText(rec.land_type);
        const boundariesStr = rec.b_north ? `N: ${rec.b_north}, S: ${rec.b_south}, E: ${rec.b_east}, W: ${rec.b_west}` : 'N/A';
        const boundaries = sanitizePDFText(boundariesStr);

        doc.fillColor("#2d3748").fontSize(11).text(`#${idx + 1} Record - Token No: ${token}`, { underline: true });
        doc.fontSize(9).fillColor("#4a5568").moveDown(0.2);
        
        const grid = [
          `SRO: ${sro}`,
          `Reg Date: ${date}`,
          `Deed Type: ${deed}`,
          `Value: INR ${value}`,
          `Seller: ${seller}`,
          `Seller Address: ${sellerAddr}`,
          `Buyer: ${buyer}`,
          `Buyer Address: ${buyerAddr}`,
          `Khata No: ${khata} | Plot No: ${plot}`,
          `Area: ${extent} Decimal | Type: ${landType}`,
          `Boundaries: ${boundaries}`
        ];

        grid.forEach(line => {
          doc.text(`   • ${line}`);
        });
        doc.moveDown(1.2);
      });

      doc.end();
    } catch (e) {
      addLiveLog("error", `Failed setting up PDF generation document: ${e}`);
      reject(e);
    }
  });
}

// Solve Captcha using Gemini 3.5 Flash
async function solveCaptchaWithGemini(b64Data: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    addLiveLog("warning", "Gemini Captcha solver skipped: GEMINI_API_KEY is not defined or is a placeholder");
    return "";
  }
  
  try {
    addLiveLog("info", "Attempting Captcha solving using Gemini AI...");
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Make sure base64 data is clean of prefixes
    let cleanB64 = b64Data;
    if (cleanB64.includes(",")) {
      cleanB64 = cleanB64.split(",")[1];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/png",
            data: cleanB64
          }
        },
        {
          text: "Identify and read the exactly 5-character alphanumeric captcha text from this image. Output only the 5 characters of the captcha, in uppercase, with no extra characters, spaces, punctuation, code blocks, or explanations."
        }
      ]
    });

    const parsed = response.text || "";
    const cleaned = parsed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
    addLiveLog("info", `Gemini clean output: "${cleaned}" (raw was "${parsed.trim()}")`);
    if (cleaned && cleaned.length === 5) {
      addLiveLog("success", `Gemini solved captcha successfully: ${cleaned}`);
      return cleaned;
    } else {
      addLiveLog("warning", `Gemini returned unstable format: "${cleaned}"`);
    }
  } catch (err) {
    addLiveLog("warning", `Gemini CAPTCHA solver failed: ${err}`);
  }
  return "";
}

// CAPTCHA Solver with 3 retries and fallback OCR list
async function solveCaptchaWithApis(b64Data: string, keys: string[]): Promise<string> {
  // First attempt to solve with Gemini since it is highly reliable and bypasses free OCR limits
  const geminiResult = await solveCaptchaWithGemini(b64Data);
  if (geminiResult) {
    return geminiResult;
  }

  const ocrKeys = keys.length > 0 ? keys : [process.env.OCR_API_KEY || "e4a0bc39f388957"];
  
  for (const apiKey of ocrKeys) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      addLiveLog("info", `Attempting OCR parsing (API: ...${apiKey.slice(-5)}, Try: ${attempt}/3)`);
      try {
        const response = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: {
            "apikey": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            base64Image: b64Data,
            language: "eng",
            OCREngine: 2,
            scale: true,
            isTable: false,
            fileType: "png"
          })
        });
        const resText = await response.text();
        let result: any = {};
        try {
          result = JSON.parse(resText);
        } catch {
          addLiveLog("warning", `OCR.space returned non-JSON response: ${resText.slice(0, 150)}`);
          continue;
        }
        if (result.IsErroredOnProcessing) {
          addLiveLog("warning", `OCR.space returned error: ${result.ErrorMessage}`);
          continue;
        }
        const parsed = result.ParsedResults?.[0]?.ParsedText || "";
        const cleaned = parsed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
        if (cleaned && cleaned.length === 5) {
          addLiveLog("success", `OCR solved successfully: ${cleaned}`);
          return cleaned;
        } else {
          addLiveLog("warning", `OCR parsed unstable output: "${cleaned}"`);
        }
      } catch (err) {
        addLiveLog("warning", `OCR.space API request failed: ${err}`);
      }
      // Small pause before retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return "";
}

// Portal Scrape Core
async function runScrapeWorker(searchProfile?: any, isInstantSearch = false) {
  addLiveLog("info", `Initiating scraper flow (Instant: ${isInstantSearch})`);
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;
  const username = process.env.LAND_USER_NAME || "ANESH_AR";
  const password = process.env.LAND_PASSWORD || "Anarti@123";

  if (!botToken) {
    addLiveLog("error", "Scraper aborted: TELEGRAM_BOT_TOKEN is missing in environment variables!");
    return { success: false, error: "Missing bot configurations" };
  }

  // Get configuration settings from firestore or fallbacks
  let ocrApis: string[] = [];
  let chatIds: string[] = [];
  try {
    const configSnap = await getDoc(doc(db, "configs", "global"));
    if (configSnap.exists()) {
      ocrApis = configSnap.data().ocrApis || [];
      chatIds = configSnap.data().chatIds || [];
    }
  } catch (err) {
    addLiveLog("warning", `Could not load global options from Firestore: ${err}`);
  }

  const sroId = searchProfile?.sro_id || "2100";
  const districtId = searchProfile?.district_id || "21";
  const circleId = searchProfile?.circle_id || "262";
  const villageId = searchProfile?.village_id || "20751";
  const landType = searchProfile?.land_type_id || "0";

  addLiveLog("info", `Target coordinates SRO ID: ${sroId}, Circle: ${circleId}, Village: ${villageId}`);

  // Fetch Capcha Warmup Session
  try {
    addLiveLog("info", "Warming session connections to Bihar portal...");
    const baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "qp-tc-request-id": REQID,
      "Referer": "https://enibandhan.bihar.gov.in/",
      "Accept": "application/json"
    };

    // Warmup visits
    await fetch("https://enibandhan.bihar.gov.in/", { headers: baseHeaders });
    await fetch("https://enibandhan.bihar.gov.in/citizens/login", { headers: baseHeaders });
    await new Promise(r => setTimeout(r, 1000));

    // Get Captcha response
    addLiveLog("info", "Generating portal verification captcha...");
    const captchaRes = await fetch("https://enibandhan.bihar.gov.in/captcha/v1/public/generate", {
      method: "POST",
      headers: baseHeaders
    });
    const captchaText = await captchaRes.text();
    let captchaBody: any = {};
    try {
      captchaBody = JSON.parse(captchaText);
    } catch {
      throw new Error(`Captcha generator returned non-JSON response: ${captchaText.slice(0, 150)}`);
    }
    if (!captchaBody?.data?.captcha) {
      throw new Error("Portal rejected captcha generation");
    }

    const captchaB64 = captchaBody.data.captcha;
    const serverTimestamp = String(captchaBody.data.timestamp);

    // Solve Captcha
    const captchaSolved = await solveCaptchaWithApis(captchaB64, ocrApis);
    if (!captchaSolved) {
      throw new Error("Unable to parse captcha successfully using any of the OCR API keys");
    }

    // Fetch AES Keys
    addLiveLog("info", "Retrieving AES keys from portal user directory...");
    const aesRes = await fetch("https://enibandhan.bihar.gov.in/user/v2/public/aes/keys", {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ user_name: username })
    });
    const aesText = await aesRes.text();
    let aesBody: any = {};
    try {
      aesBody = JSON.parse(aesText);
    } catch {
      throw new Error(`AES Key endpoint returned non-JSON response: ${aesText.slice(0, 150)}`);
    }
    if (!aesBody?.data?.secretKey) {
      throw new Error("Failed retrieving encryption directory keypads");
    }

    const encPwd = aesEncrypt(password, aesBody.data.secretKey, aesBody.data.iv);

    // Citizen login
    addLiveLog("info", "Logging citizen portal agent session...");
    const loginRes = await fetch("https://enibandhan.bihar.gov.in/user/v2/citizen/public/login", {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: username,
        user_pass: encPwd,
        login_type: "USER_NAME",
        timestamp: serverTimestamp,
        grant_type: "PASSWORD",
        captchaVal: captchaSolved
      })
    });
    const loginText = await loginRes.text();
    let loginBody: any = {};
    try {
      loginBody = JSON.parse(loginText);
    } catch {
      throw new Error(`Portal login endpoint returned non-JSON response: ${loginText.slice(0, 150)}`);
    }
    if (!loginBody?.success || !loginBody?.data?.access_token) {
      throw new Error(`Portal login rejected: ${JSON.stringify(loginBody)}`);
    }

    const accessToken = loginBody.data.access_token;
    addLiveLog("success", "Active scrape token obtained. Quering land records...");

    // Format target searches dates
    const dateToStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY style
    const dateFromStr = searchProfile?.date_from || "01/01/2026";

    // Query advanced records API
    const recordsRes = await fetch("https://enibandhan.bihar.gov.in/certified/v1/cc/fetch-reg-doc-detail-by-adv-search", {
      method: "POST",
      headers: { 
        ...baseHeaders, 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        district_id: districtId,
        sro_id: sroId,
        circle_id: circleId,
        village_id: villageId,
        execution_date_from_to: `${dateFromStr},${dateToStr}`,
        land_type_id: landType,
        search_type: "property",
        pre_comp: "N",
        user_type: "C",
        offset: 1,
        limit: 30
      })
    });

    const recordsText = await recordsRes.text();
    let recordsBody: any = {};
    try {
      recordsBody = JSON.parse(recordsText);
    } catch {
      throw new Error(`Certified records search endpoint returned non-JSON response: ${recordsText.slice(0, 150)}`);
    }
    const recordsRaw = recordsBody?.data || [];
    addLiveLog("success", `Fetched ${recordsRaw.length} raw records from registration services`);

    // Retrieve custom structures
    const templatesSnap = await getDocs(collection(db, "templates"));
    const templatesMap: { [id: string]: string } = {};
    let defaultTemplateContent = `🔔 *नया पंजीकरण – {{reg_date}}*
👤 *बेचने वाला* : {{executant}}  
📍 पता: {{executant_addr}}
🤝 *खरीदने वाला* : {{claimant}}  
📍 पता: {{claimant_addr}}
🏞️ *ज़मीन* :  
खाता {{khata_no}}, खेसरा {{plot_no}}  
रकबा: {{extent_dec}} डेसीमल
प्रकार: {{land_type}}
🧭 *चहारदीवारी* :  
पूरब – {{b_east}}  
पश्चिम – {{b_west}}  
उत्तर – {{b_north}}  
दक्षिण – {{b_south}}
💰 *मूल्य* : ₹{{chargeable_value}}
🆔 *ID* : टोकन {{token_no}}, डॉकेट {{docket_no}}, सीरियल {{serial_no}}
✅ नया रिकॉर्ड CSV/JSON में जोड़ दिया गया।`;

    templatesSnap.forEach(snap => {
      const data = snap.data();
      templatesMap[snap.id] = data.content;
      if (data.isDefault) {
        defaultTemplateContent = data.content;
      }
    });

    // We process each page records
    let newFoundCount = 0;
    const newlyScrapedList: any[] = [];

    for (const item of recordsRaw) {
      if (!item.token_no) continue;
      const flattened = {
        sro_name: item.sro_name || "",
        reg_year: String(item.reg_year || ""),
        reg_date: item.reg_date || "",
        deed_type: item.deed_type || "",
        book_no: item.book_no || "",
        token_no: String(item.token_no || ""),
        docket_no: String(item.docket_no || ""),
        from_page: String(item.from_page_no || ""),
        to_page: String(item.to_page_no || ""),
        chargeable_value: String(item.chargeable_value || ""),
        presenter: item.presenter || "",
        pres_date: item.presentation_date || "",
        serial_no: String(item.serial_no || ""),
        deed_category: item.deed_category_name || "",
        procedure: item.procedure_name || "",
        property_type: item.property?.[0]?.Property_type || "",
        plot_no: item.property?.[0]?.plot_no || "",
        khata_no: item.property?.[0]?.khata_no || "",
        tauji_no: item.property?.[0]?.tauji_no || "",
        extent_dec: item.property?.[0]?.extent_dec || "",
        circle: item.property?.[0]?.circlename || "",
        village: item.property?.[0]?.village_name || "",
        land_type: item.property?.[0]?.land_Type || "",
        b_east: item.property?.[0]?.b_east || "",
        b_west: item.property?.[0]?.b_west || "",
        b_north: item.property?.[0]?.b_north || "",
        b_south: item.property?.[0]?.b_south || "",
        mvr_rate: item.property?.[0]?.MVR_rate || "",
        urban_rural: item.property?.[0]?.urban_rural || "",
        executant: item.party?.[0]?.fp || "",
        executant_addr: item.party?.[0]?.FP_address || "",
        claimant: item.party?.[0]?.sp || "",
        claimant_addr: item.party?.[0]?.SP_address || "",
        scrapedAt: new Date().toISOString()
      };

      // Check if document already stored in database
      const recordRef = doc(db, "records", flattened.token_no);
      const docSnap = await getDoc(recordRef);
      const isNew = !docSnap.exists();

      if (isNew) {
        addLiveLog("success", `New Document detected! Adding: Token No: ${flattened.token_no}`);
        await setDoc(recordRef, flattened);
        newFoundCount++;
      }
      newlyScrapedList.push(flattened);
    }

    // fallback when running an instant search and no records are returned from portal query
    if (isInstantSearch && newlyScrapedList.length === 0) {
      addLiveLog("info", "No records found from live portal query. Fetching standard registered records database as fallback...");
      try {
        const dbSnap = await getDocs(collection(db, "records"));
        const dbRecords: any[] = [];
        dbSnap.forEach(s => dbRecords.push(s.data()));
        const sortedDb = dbRecords.sort((a,b) => new Date(b.scrapedAt || b.reg_date || 0).getTime() - new Date(a.scrapedAt || a.reg_date || 0).getTime());
        newlyScrapedList.push(...sortedDb.slice(0, 15)); // Fetch up to 15 latest database records as fallback
        addLiveLog("info", `Retrieved ${newlyScrapedList.length} historic records from local database.`);
      } catch (dbErr) {
        addLiveLog("warning", `Error loading fallback database records: ${dbErr}`);
      }
    }

    addLiveLog("info", `Completed record sorting. ${newFoundCount} new additions stored.`);

    // Fetch active Telegram list (Bot Users)
    const subscribersSnap = await getDocs(collection(db, "botUsers"));
    const subscribers: any[] = [];
    subscribersSnap.forEach(snap => {
      const data = snap.data();
      if (snap.exists() && !data.blocked && data.approved !== false) {
        subscribers.push(data);
      }
    });

    // Notify logic
    addLiveLog("info", "Compiling subscriber notifications...");

    const formatTodayDate = new Date().toLocaleDateString('en-GB');

    // Send notifications
    for (const sub of subscribers) {
      const templateId = sub.templates?.[0];
      const selectedTemplate = (templateId && templatesMap[templateId]) ? templatesMap[templateId] : defaultTemplateContent;

      if (sub.msgType === "all" || isInstantSearch) {
        // If "all" records, or if it is an INSTANT SEARCH, we generate PDF and send it! (filename today date - 23-05-2026.pdf)
        if (newlyScrapedList.length > 0) {
          addLiveLog("info", `Generating daily PDF bulletin for subscriber ${sub.chatId}...`);
          const pdfBuffer = await generatePDFBuffer(newlyScrapedList);
          const sanitizedDate = formatTodayDate.replace(/\//g, '-');
          const pdfName = `${sanitizedDate}.pdf`;
          
          await sendTelegramPDF(botToken, sub.chatId, pdfBuffer, pdfName);
          
          const bulletinMsg = `🔔 *बिहार रजिस्ट्री दैनिक बुलेटिन – ${formatTodayDate}*\n\n` +
            `आज के खोज चक्र में कुल *${newlyScrapedList.length}* रिकॉर्ड मिले हैं, जिनमें से *${newFoundCount}* नए रिकॉर्ड हैं।\n\n` +
            `🔹 कुल सक्रिय रिकॉर्ड: ${newlyScrapedList.length}\n` +
            `🔸 नए अतिरिक्त रिकॉर्ड: ${newFoundCount}\n\n` +
            `📄 विवरण संलग्न पीडीएफ (${pdfName}) में उपलब्ध कराया गया है।`;
          
          await sendTelegramMessage(botToken, sub.chatId, bulletinMsg);
        } else {
          const emptyBulletinMsg = `⚠️ *बिहार रजिस्ट्री दैनिक सूचना – ${formatTodayDate}*\n\n` +
            `आज के खोज चक्र में कोई सक्रिय निबंधन रिकॉर्ड नहीं मिला। (No new registry found today)`;
          await sendTelegramMessage(botToken, sub.chatId, emptyBulletinMsg);
        }
      } else {
        // "new" message type: only send formatted templates for actually NEW records found
        const parsedNewRecords = newlyScrapedList.slice(0, newFoundCount);

        if (parsedNewRecords.length > 0) {
          for (const rec of parsedNewRecords) {
            const filled = interpolateTemplate(selectedTemplate, rec);
            await sendTelegramMessage(botToken, sub.chatId, filled);
          }
        } else {
          // Send automatic notification even if no new records found, as requested
          const noNewMsg = `⚠️ *बिहार रजिस्ट्री सूचना – ${formatTodayDate}*\n\n` +
            `आज कोई नया निबंधन / रजिस्ट्री रिकॉर्ड नहीं मिला। (No new registry found today)`;
          await sendTelegramMessage(botToken, sub.chatId, noNewMsg);
        }
      }
    }

    // Default chat IDs from configuration
    const configChatIds = chatIds.length > 0 ? chatIds : [defaultChatId];
    if (configChatIds.length > 0) {
      addLiveLog("info", "Notifying general default channel list...");
      for (const rawId of configChatIds) {
        if (!rawId) continue;
        if (newFoundCount > 0) {
          const parsedRecords = newlyScrapedList.slice(0, newFoundCount);
          for (const rec of parsedRecords) {
            const filled = interpolateTemplate(defaultTemplateContent, rec);
            await sendTelegramMessage(botToken, rawId, filled);
          }
          
          const summaryMsg = `✅ *बिहार रजिस्ट्री अपडेट – ${formatTodayDate}*\n\n` +
            `इस खोज चक्र में कुल *${newFoundCount}* नए भूमि रजिस्ट्री रिकॉर्ड पाए गए हैं और उन्हें डेटाबेस में सुरक्षित किया गया है।`;
          await sendTelegramMessage(botToken, rawId, summaryMsg);
        } else {
          // If it is an instant search with 0 new records, we send the top 3 past records format for test confirmation
          if (isInstantSearch && newlyScrapedList.length > 0) {
            const parsedRecords = newlyScrapedList.slice(0, 3);
            for (const rec of parsedRecords) {
              const filled = interpolateTemplate(defaultTemplateContent, rec);
              await sendTelegramMessage(botToken, rawId, filled);
            }
            const instantNoMsg = `ℹ️ *बिहार लाइव सर्च रिजल्ट – ${formatTodayDate}*\n\n` +
              `कोई नया रिकॉर्ड नहीं मिला। परीक्षण के लिए ऊपर ${parsedRecords.length} हालिया रिकॉर्ड प्रारूप के रूप में भेजे गए हैं।`;
            await sendTelegramMessage(botToken, rawId, instantNoMsg);
          } else {
            const noNewSummary = `⚠️ *बिहार रजिस्ट्री अपडेट – ${formatTodayDate}*\n\n` +
              `आज का स्वचालित स्क्रैपिंग पूरा हो गया है। कोई नया रजिस्ट्री रिकॉर्ड नहीं मिला। (No new registry found today.)`;
            await sendTelegramMessage(botToken, rawId, noNewSummary);
          }
        }
      }
    }

    // Update statistics
    const statsUpdate = {
      lastChecked: new Date().toISOString(),
      lastCheckedStatus: "success",
      lastCheckedCount: newFoundCount,
      totalFound: newlyScrapedList.length
    };
    await setDoc(doc(db, "configs", "global"), {
      ocrApis,
      chatIds,
      ...statsUpdate
    }, { merge: true });

    addLiveLog("success", `Scraper run completed successfully with ${newFoundCount} new records notified.`);
    return { success: true, count: newFoundCount, total: newlyScrapedList.length };

  } catch (err: any) {
    addLiveLog("error", `Scraper run crashed: ${err.message || err}`);
    try {
      await setDoc(doc(db, "configs", "global"), {
        lastChecked: new Date().toISOString(),
        lastCheckedStatus: "failed",
        lastCheckedCount: 0
      }, { merge: true });
    } catch (firebaseErr) {
      console.error("Failed to update crashed run state in firestore:", firebaseErr);
    }
    return { success: false, error: err.message || err };
  }
}

// Check helper
function isNewRecordLocal(record: any, rawList: any[]): boolean {
  return true; // Simple stub
}

// Template Placeholder Interpolation
function interpolateTemplate(template: string, record: any): string {
  let result = template;
  const fields = [
    'reg_date', 'executant', 'executant_addr', 'claimant', 'claimant_addr',
    'khata_no', 'plot_no', 'extent_dec', 'land_type', 'b_east', 'b_west',
    'b_north', 'b_south', 'chargeable_value', 'token_no', 'docket_no', 'serial_no', 'sro_name'
  ];
  fields.forEach(field => {
    const val = record[field] || 'N/A';
    result = result.replace(new RegExp(`{{${field}}}`, 'g'), val);
    result = result.replace(new RegExp(`{${field}}`, 'g'), val);
  });
  return result;
}

// Active background schedule tasks references
let runningCronSchedules: any[] = [];

// Setup dynamic scheduler according to config stored in Firestore configs/global
async function setupDynamicSchedules() {
  addLiveLog("info", "Re-evaluating dynamic background scheduler configuration...");
  
  // 1. Clear existing active cron schedules
  runningCronSchedules.forEach(task => {
    try {
      task.stop();
    } catch (err) {
      // ignore
    }
  });
  runningCronSchedules = [];

  // 2. Fetch config from Firestore
  let config: any = {};
  try {
    const configSnap = await getDoc(doc(db, "configs", "global"));
    if (configSnap.exists()) {
      config = configSnap.data();
    }
  } catch (err) {
    addLiveLog("warning", `Failed to load global config for schedule setup: ${err}`);
  }

  // Fallback defaults if config isn't populated or field not defined
  const schedulerEnabled = config.schedulerEnabled !== false; // enabled by default
  const schedulerType = config.schedulerType || "presets"; // "presets" or "custom"
  const schedulerTimes = config.schedulerTimes || ["10:00", "18:00"]; // morning 10 AM, evening 6 PM IST default
  const customCronExpression = config.customCronExpression || "30 4 * * *"; // standard default

  if (!schedulerEnabled) {
    addLiveLog("warning", "Background scheduler is currently DISABLED in configuration settings.");
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    addLiveLog("warning", "Bot token is missing. Scheduler armed but notifications might fail.");
  }

  if (schedulerType === "custom") {
    // Validate cron expression
    if (!cron.validate(customCronExpression)) {
      addLiveLog("error", `Invalid custom cron expression: "${customCronExpression}". Falling back to default twice-daily schedule.`);
      setupDefaultSchedules();
      return;
    }
    
    addLiveLog("success", `Registering custom background cron task: "${customCronExpression}"`);
    const task = cron.schedule(customCronExpression, async () => {
      addLiveLog("info", `Background trigger fired via Custom Cron schedule: "${customCronExpression}"`);
      await runScrapeWorker();
    });
    runningCronSchedules.push(task);
  } else {
    // We are using preset scheduler times (Asia/Kolkata timezone support!)
    addLiveLog("info", `Registering interactive cron schedules for India time presets: ${JSON.stringify(schedulerTimes)}`);
    for (const timeStr of schedulerTimes) {
      if (!timeStr || !timeStr.includes(":")) continue;
      const [hourStr, minStr] = timeStr.split(":");
      const hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);
      
      if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
        addLiveLog("warning", `Skipping invalid scheduler time specification: "${timeStr}"`);
        continue;
      }

      const cronExpr = `${min} ${hour} * * *`;
      try {
        addLiveLog("success", `Armed scraper schedule at ${timeStr} (IST) -> "${cronExpr}"`);
        const task = cron.schedule(cronExpr, async () => {
          addLiveLog("info", `Background trigger fired for scheduled time: ${timeStr} IST`);
          await runScrapeWorker();
        }, {
          timezone: "Asia/Kolkata"
        });
        runningCronSchedules.push(task);
      } catch (scheduleErr) {
        addLiveLog("error", `Failed to schedule cron for "${cronExpr}" with Asia/Kolkata: ${scheduleErr}`);
      }
    }
  }
}

// Fallback dynamic defaults helper
function setupDefaultSchedules() {
  const task1 = cron.schedule("0 10 * * *", async () => {
    addLiveLog("info", "Fallback scheduled scraper active (10:00 AM IST)...");
    await runScrapeWorker();
  }, { timezone: "Asia/Kolkata" });
  
  const task2 = cron.schedule("0 18 * * *", async () => {
    addLiveLog("info", "Fallback scheduled scraper active (06:00 PM IST)...");
    await runScrapeWorker();
  }, { timezone: "Asia/Kolkata" });

  runningCronSchedules.push(task1, task2);
}

addLiveLog("success", "Background dynamic schedule engine initialized.");

// API ROUTES

// AUTH - Send OTP code via telegram bot to general user chat
app.post("/api/auth/send-otp", async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !defaultChatId) {
    addLiveLog("error", "Cannot send OTP: TELEGRAM variables are not configured in system environment variables (.env)");
    return res.status(500).json({ success: false, error: "System enviroment variable credentials not set." });
  }

  // Generate 6 digit pin
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(24).toString("hex");

  addLiveLog("info", `Created OTP validation ticket. Sending code to config Chat ID ${defaultChatId}`);
  
  const textMsg = `🔑 *Bihar Registry Dashboard Security Code*\n\nYour security OTP is: *${otp}*\n\nThis verification credential is valid for 10 minutes.`;
  const notified = await sendTelegramMessage(botToken, defaultChatId, textMsg);

  if (notified) {
    pendingOtps[token] = {
      otp,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes session
    };
    return res.json({ success: true, token });
  } else {
    return res.status(500).json({ success: false, error: "Failed to dispatch verification telegram message." });
  }
});

// AUTH- Verify OTP code
app.post("/api/auth/verify-otp", async (req, res) => {
  const { code, token } = req.body;
  const entry = pendingOtps[token];

  if (!entry) {
    return res.status(400).json({ success: false, error: "OTP transaction expired or invalid token root key." });
  }

  if (Date.now() > entry.expires) {
    delete pendingOtps[token];
    return res.status(400).json({ success: false, error: "Security OTP code has expired." });
  }

  if (entry.otp !== code) {
    return res.status(400).json({ success: false, error: "Incorrect verification passcode entered." });
  }

  // Generate secure admin panel token
  const sessionToken = crypto.randomUUID();
  delete pendingOtps[token];

  // Update active session root in firestore to lock down other tabs/devices instantly
  try {
    await setDoc(doc(db, "sessions", "admin"), {
      activeToken: sessionToken,
      updatedAt: new Date().toISOString()
    });
    addLiveLog("success", `User authenticated. Registered session token ...${sessionToken.slice(-6)}`);
    return res.json({ success: true, sessionToken });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `Session locking failed: ${err.message}` });
  }
});

// Check if current device is still authenticated active session user
app.post("/api/auth/check-session", async (req, res) => {
  const { sessionToken } = req.body;
  if (!sessionToken) {
    return res.status(401).json({ authorized: false });
  }

  try {
    const sessionSnap = await getDoc(doc(db, "sessions", "admin"));
    if (sessionSnap.exists()) {
      const active = sessionSnap.data().activeToken;
      return res.json({ authorized: active === sessionToken });
    }
    return res.json({ authorized: false });
  } catch (err) {
    return res.status(500).json({ authorized: false });
  }
});

// Fetch Stats & Portals Overview
app.get("/api/stats", async (req, res) => {
  try {
    const configSnap = await getDoc(doc(db, "configs", "global"));
    const recordsSnap = await getDocs(collection(db, "records"));
    const botUserSnap = await getDocs(collection(db, "botUsers"));

    let globalConfig: any = {};
    if (configSnap.exists()) {
      globalConfig = configSnap.data();
    }

    return res.json({
      lastChecked: globalConfig.lastChecked || "Never",
      lastCheckedStatus: globalConfig.lastCheckedStatus || "N/A",
      lastCheckedCount: globalConfig.lastCheckedCount || 0,
      totalRecords: recordsSnap.size,
      totalSubscribers: botUserSnap.size,
      uptime: process.uptime()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Logs Endpoint
app.get("/api/logs", (req, res) => {
  res.json({ logs: liveLogs });
});

// Clear Live-Logs
app.post("/api/logs/clear", (req, res) => {
  liveLogs = [];
  addLiveLog("info", "In-memory live activity logs cleared by administrator");
  res.json({ success: true });
});

// Scraper Triggers (Manual triggers / Instant searches)
app.post("/api/scraper/trigger", async (req, res) => {
  const { searchProfile, isInstantSearch } = req.body;
  const result = await runScrapeWorker(searchProfile, !!isInstantSearch);
  return res.json(result);
});

// RECORDS API - Instant query list
app.get("/api/records", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "records"));
    const list: any[] = [];
    snapshot.forEach(snap => list.push(snap.data()));
    // Sort descendly latest on top
    const sorted = list.sort((a,b) => new Date(b.scrapedAt || 0).getTime() - new Date(a.scrapedAt || 0).getTime());
    return res.json({ records: sorted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// BOT USERS (BOT SUBCRIBERS) APIs
app.get("/api/bot-users", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "botUsers"));
    const list: any[] = [];
    snapshot.forEach(snap => list.push(snap.data()));
    return res.json({ subscribers: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/bot-users", async (req, res) => {
  const { chatId, username, blocked, notifyEnabled, approved, templates, msgType, assignedFields } = req.body;
  if (!chatId) return res.status(400).json({ error: "Missing Target Telegram ChatId" });

  try {
    const subRef = doc(db, "botUsers", chatId);
    const existingSnap = await getDoc(subRef);
    let wasApproved = false;
    if (existingSnap.exists()) {
      wasApproved = existingSnap.data().approved !== false;
    }

    const isNowApproved = approved !== undefined ? !!approved : true;

    const subscriberData = {
      chatId,
      username: username || "User",
      blocked: !!blocked,
      notifyEnabled: !!notifyEnabled,
      approved: isNowApproved,
      templates: templates || [],
      msgType: msgType || "new",
      assignedFields: assignedFields || {}
    };

    await setDoc(subRef, subscriberData);

    // Send instant approval notification over Telegram if approved now!
    if (isNowApproved && !wasApproved && existingSnap.exists()) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const approvalNotice = `🎉 *Account Approved!*\n\nYour subscriber account has been successfully verified and approved by the Administrator.\n\nYou are now ready to receive real-time Bihar registry updates directly here!`;
        await sendTelegramMessage(botToken, chatId, approvalNotice);
      }
    }

    addLiveLog("success", `Bot subscriber settings updated for: ${chatId}`);
    return res.json({ success: true, subscriber: subscriberData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Send custom message broadcast / unblock / edit subscribers
app.post("/api/bot-users/broadcast", async (req, res) => {
  const { targetChatIds, messageText } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN missing" });
  }
  if (!targetChatIds || !messageText) {
    return res.status(400).json({ error: "Missing message body or targets" });
  }

  let sentCount = 0;
  addLiveLog("info", `Broadcasting news update to ${targetChatIds.length} users`);
  for (const tid of targetChatIds) {
    const sent = await sendTelegramMessage(botToken, tid, messageText);
    if (sent) sentCount++;
  }

  return res.json({ success: true, dispatched: sentCount });
});

// MESSAGE TEMPLATES
app.get("/api/templates", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "templates"));
    const list: any[] = [];
    snap.forEach(s => list.push(s.data()));
    return res.json({ templates: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/templates", async (req, res) => {
  const { id, name, content, isDefault } = req.body;
  if (!id || !name || !content) return res.status(400).json({ error: "Missing template specifications" });

  try {
    const templateRef = doc(db, "templates", id);
    
    // If setting custom template as default, we must reset previous default templates
    if (isDefault) {
      const snap = await getDocs(collection(db, "templates"));
      for (const s of snap.docs) {
        if (s.data().isDefault && s.id !== id) {
          await updateDoc(doc(db, "templates", s.id), { isDefault: false });
        }
      }
    }

    const templateData = { id, name, content, isDefault: !!isDefault };
    await setDoc(templateRef, templateData);
    addLiveLog("success", `Registered template script config: ${name}`);
    return res.json({ success: true, template: templateData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// SEARCH FIELD PARAMETERS / PROFILE TEMPLATES
app.get("/api/search-profiles", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "searchProfiles"));
    const list: any[] = [];
    snap.forEach(s => list.push(s.data()));
    return res.json({ profiles: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/search-profiles", async (req, res) => {
  const { id, name, district_id, sro_id, circle_id, village_id, date_from } = req.body;
  if (!id || !name) return res.status(400).json({ error: "Missing Profile Identifiers" });

  try {
    const ref = doc(db, "searchProfiles", id);
    const data = { id, name, district_id, sro_id, circle_id, village_id, date_from };
    await setDoc(ref, data);
    addLiveLog("success", `Search Profile template saved: ${name}`);
    return res.json({ success: true, profile: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GLOBAL PRESET CONGIGS (APIs, ChatIDs, and Scheduler)
app.get("/api/config", async (req, res) => {
  try {
    const configSnap = await getDoc(doc(db, "configs", "global"));
    if (configSnap.exists()) {
      return res.json(configSnap.data());
    }
    return res.json({ ocrApis: [], chatIds: [], schedulerEnabled: true, schedulerType: "presets", schedulerTimes: ["10:00", "18:00"], customCronExpression: "30 4 * * *" });
  } catch (err: any) {
    return res.json({ ocrApis: [], chatIds: [], schedulerEnabled: true, schedulerType: "presets", schedulerTimes: ["10:00", "18:00"], customCronExpression: "30 4 * * *" });
  }
});

app.post("/api/config", async (req, res) => {
  const { ocrApis, chatIds, schedulerEnabled, schedulerType, schedulerTimes, customCronExpression } = req.body;
  try {
    const freshConfig = {
      ocrApis: ocrApis || [],
      chatIds: chatIds || [],
      schedulerEnabled: schedulerEnabled !== undefined ? !!schedulerEnabled : true,
      schedulerType: schedulerType || "presets",
      schedulerTimes: schedulerTimes || ["10:00", "18:00"],
      customCronExpression: customCronExpression || "30 4 * * *"
    };

    await setDoc(doc(db, "configs", "global"), freshConfig, { merge: true });
    
    // Dynamically re-arm scheduler
    await setupDynamicSchedules();
    
    addLiveLog("success", "Global configuration presets and Scheduler properties updated successfully");
    return res.json({ success: true, config: freshConfig });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// VITE INTEROP DEV OR BUILD PROD
async function runMainServer() {
  if (process.env.NODE_ENV !== "production") {
    addLiveLog("info", "Starting application in Local Development environment...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    addLiveLog("info", "Starting application in Production container services...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Load scheduler configurations from database on start
  try {
    await setupDynamicSchedules();
  } catch (shErr) {
    addLiveLog("error", `Failed initial schedule arming setup: ${shErr}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    addLiveLog("success", `System fully Operational on port ${PORT}! View app at http://localhost:${PORT}`);
    startTelegramUpdatePolling();
  });
}

runMainServer();
