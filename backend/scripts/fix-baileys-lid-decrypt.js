#!/usr/bin/env node
// Applies the companion sync routing fix to @whiskeysockets/baileys (InfiniteAPI).
//
// Problem: When the phone sends a message to a contact, WhatsApp syncs a copy to
// the CRM as a companion device. The sync stanza has:
//   from='<phone_lid>@lid'  recipient='<crm_lid>@lid'  peer_recipient_pn='<contact>@s.whatsapp.net'
//
// The original code throws:
//   Boom('receipient present, but msg not from me')
// because `from` is the phone's LID (not isMe/isMeLid of the CRM).
//
// Fix: detect the companion sync via peer_recipient_pn + recipient-is-me, then:
//   - set fromMe = true
//   - set chatId = peer_recipient_pn  (so the message appears under the correct contact)
//
// Note: decryption JID is already set correctly to `author` (the phone's LID) in InfiniteAPI
// at commit e89a3df4, so no separate decryption fix is needed.
'use strict';
const fs = require('fs');
const path = require('path');

const TARGET = path.join(
  __dirname, '..', 'node_modules', '@whiskeysockets', 'baileys',
  'lib', 'Utils', 'decode-wa-message.js'
);

if (!fs.existsSync(TARGET)) {
  console.error('[fix-baileys-lid-decrypt] File not found:', TARGET);
  process.exit(1);
}

let content = fs.readFileSync(TARGET, 'utf8');

function validatePatched(nextContent) {
  const hasCompanionGuard =
    nextContent.includes('isMeRecipient') &&
    nextContent.includes('&& !isMeRecipient') &&
    nextContent.includes('chatId = stanza.attrs.peer_recipient_pn');

  if (!hasCompanionGuard) {
    console.error('[fix-baileys-lid-decrypt] Patch validation failed: companion sync guard not found.');
    process.exit(1);
  }
}

if (content.includes('isMeRecipient')) {
  validatePatched(content);
  console.log('[fix-baileys-lid-decrypt] Routing fix already present, skipping.');
  process.exit(0);
}

// Pattern: the block that throws when from is not the CRM itself.
// Supports older compiled output without semicolons and newer output with semicolons.
const PATTERN = /( +)if \(!isMe\(from\) && !isMeLid\(from\)\) \{\r?\n\s+throw new Boom\('(receipient|recipient) present, but msg not from me'[^)]*\);?\r?\n\s+\}\r?\n(\s+)if \(isMe\(from\) \|\| isMeLid\(from\)\) \{\r?\n\s+fromMe = true;?\r?\n\s+\}\r?\n\s+chatId = recipient;?/;

const match = PATTERN.exec(content);
if (match) {
  const indent = match[1];    // leading spaces of the outer if
  const inner  = match[3];    // spaces for inner block

  const OLD = match[0];
  const NEW = `${indent}// Companion sync: phone sent to contact, CRM receives a copy.
${indent}// peer_recipient_pn is present only in these sync stanzas.
${indent}const normalizeJid = (jid) => jid?.replace(/:\\d+@/, '@');
${indent}const isMeRecipient = !!(stanza.attrs.peer_recipient_pn) && (
${inner}  areJidsSameUser(recipient, meId) ||
${inner}  areJidsSameUser(recipient, meLid || '') ||
${inner}  areJidsSameUser(normalizeJid(recipient), meId) ||
${inner}  areJidsSameUser(normalizeJid(recipient), meLid || '') ||
${inner}  isLidUser(from)
${indent});
${indent}if (!isMe(from) && !isMeLid(from) && !isMeRecipient) {
${inner}  throw new Boom('receipient present, but msg not from me', { data: stanza })
${indent}}
${indent}fromMe = true;
${indent}if (!isMe(from) && !isMeLid(from) && isMeRecipient) {
${inner}  // Phone→contact sync copy: chatId must be the contact, not the CRM's LID.
${inner}  chatId = stanza.attrs.peer_recipient_pn;
${indent}} else {
${inner}  chatId = recipient;
${indent}}`;

  content = content.replace(OLD, NEW);
  validatePatched(content);
  fs.writeFileSync(TARGET, content, 'utf8');
  console.log('[fix-baileys-lid-decrypt] Routing fix applied: isMeRecipient companion sync handler.');
  process.exit(0);
}

console.error('[fix-baileys-lid-decrypt] Pattern not found — code structure may have changed. Manual review needed.');
process.exit(1);
