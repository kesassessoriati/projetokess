#!/usr/bin/env node
// Applies companion sync LID fix to whaileys decode-wa-message.js
// Needed because whaileys is installed from GitHub (not npm), so patch-package
// cannot generate a compatible patch file against the npm base version.
'use strict';
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'node_modules', 'whaileys', 'lib', 'Utils', 'decode-wa-message.js');

if (!fs.existsSync(TARGET)) {
  console.log('[fix-whaileys-lid] File not found, skipping:', TARGET);
  process.exit(0);
}

let content = fs.readFileSync(TARGET, 'utf8');

if (content.includes('isMeRecipient')) {
  console.log('[fix-whaileys-lid] Already patched, skipping.');
  process.exit(0);
}

const OLD = '        if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {\n            if (!isMe(from) && !isMeLid(from)) {';
const NEW = '        if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {\n            // Companion sync: peer_recipient_pn + isLidUser(from) = phone sent msg to contact\n            const isMeRecipient = !!(stanza.attrs.peer_recipient_pn) && (0, WABinary_1.isLidUser)(from);\n            if (!isMe(from) && !isMeLid(from) && !isMeRecipient) {';

if (!content.includes(OLD.split('\n')[1])) {
  console.error('[fix-whaileys-lid] Pattern not found in file. File may have changed. Skipping.');
  process.exit(0);
}

content = content.replace(OLD, NEW);
fs.writeFileSync(TARGET, content, 'utf8');
console.log('[fix-whaileys-lid] Patch applied successfully to whaileys decode-wa-message.js');
