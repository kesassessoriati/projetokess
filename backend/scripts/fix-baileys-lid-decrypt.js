#!/usr/bin/env node
// Adds isLidCompanionSync to the directChatDecryptionTarget computation in
// @whiskeysockets/baileys (InfiniteAPI). Without this, pkmsg companion sync
// messages from the phone's LID are decrypted using the contact's phone number
// as the Signal session key, causing decryption failure and messages not
// being stored in the CRM.
'use strict';
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'Utils', 'decode-wa-message.js');

if (!fs.existsSync(TARGET)) {
  console.log('[fix-baileys-lid-decrypt] File not found, skipping:', TARGET);
  process.exit(0);
}

let content = fs.readFileSync(TARGET, 'utf8');

if (content.includes('isLidCompanionSync')) {
  console.log('[fix-baileys-lid-decrypt] Already patched, skipping.');
  process.exit(0);
}

// Pattern to find: the directChatDecryptionTarget block (20-space indent, 24-space continuation)
const OLD_TARGET = `                    const directChatDecryptionTarget = (isOwnCompanionDeviceSync ||
                        isDirectFromMeCompanionSync ||
                        isIncomingCompanionDirectMessage)
                        ? normalizedAuthor`;

const NEW_TARGET = `                    const isLidCompanionSync = !isJidGroup(fullMessage.key.remoteJid) &&
                        recipientIsMe &&
                        isLidUser(author) &&
                        fullMessage.key.fromMe;
                    const directChatDecryptionTarget = (isOwnCompanionDeviceSync ||
                        isDirectFromMeCompanionSync ||
                        isIncomingCompanionDirectMessage ||
                        isLidCompanionSync)
                        ? normalizedAuthor`;

if (content.includes(OLD_TARGET)) {
  content = content.replace(OLD_TARGET, NEW_TARGET);
  fs.writeFileSync(TARGET, content, 'utf8');
  console.log('[fix-baileys-lid-decrypt] Patch applied: isLidCompanionSync added to directChatDecryptionTarget.');
  process.exit(0);
}

// Fallback: regex-based match for different indentation
const PATTERN = /( +)const directChatDecryptionTarget = \(isOwnCompanionDeviceSync \|\|\n\s+isDirectFromMeCompanionSync \|\|\n\s+isIncomingCompanionDirectMessage\)\n\s+\? normalizedAuthor/;
const match = PATTERN.exec(content);
if (match) {
  const indent = match[1];
  const inner = indent + '    ';
  const oldStr = match[0];
  const newStr = `${indent}const isLidCompanionSync = !isJidGroup(fullMessage.key.remoteJid) &&\n${inner}recipientIsMe &&\n${inner}isLidUser(author) &&\n${inner}fullMessage.key.fromMe;\n${indent}const directChatDecryptionTarget = (isOwnCompanionDeviceSync ||\n${inner}isDirectFromMeCompanionSync ||\n${inner}isIncomingCompanionDirectMessage ||\n${inner}isLidCompanionSync)\n${inner}? normalizedAuthor`;
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(TARGET, content, 'utf8');
  console.log('[fix-baileys-lid-decrypt] Patch applied (regex fallback): isLidCompanionSync added.');
  process.exit(0);
}

console.error('[fix-baileys-lid-decrypt] Pattern not found — file structure may have changed. Skipping.');
process.exit(0);
