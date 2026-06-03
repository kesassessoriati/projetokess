#!/usr/bin/env node
// Applies companion sync LID fix to whaileys decode-wa-message.js
// Needed because whaileys is installed from GitHub (not npm), so patch-package
// cannot generate a compatible patch file against the npm base version.
// Works with whaileys 6.4.10 (4-space indent) and 6.4.14+ (2-space indent).
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

// Regex: matches the throw block regardless of indentation (2-space or 4-space)
// Captures the indentation prefix so we can preserve it in the replacement
const PATTERN = /^([ \t]+)if\s*\(recipient\s*&&\s*[^)]+isJidMetaAI[^)]+\)\s*\)\s*\{(\r?\n)\1([ \t]+)if\s*\(!isMe\(from\)\s*&&\s*!isMeLid\(from\)\)\s*\{/m;

const match = PATTERN.exec(content);
if (!match) {
  // Fallback: try simpler string match for known variants
  const SIMPLE_V1 = '        if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {\n            if (!isMe(from) && !isMeLid(from)) {';
  const SIMPLE_V2 = '    if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {\n      if (!isMe(from) && !isMeLid(from)) {';

  if (content.includes(SIMPLE_V1)) {
    content = content.replace(
      SIMPLE_V1,
      '        if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {\n' +
      '            // Companion sync: peer_recipient_pn + isLidUser(from) = phone sent msg, CRM receives copy\n' +
      '            const isMeRecipient = !!(stanza.attrs.peer_recipient_pn) && (0, WABinary_1.isLidUser)(from);\n' +
      '            if (!isMe(from) && !isMeLid(from) && !isMeRecipient) {'
    );
    fs.writeFileSync(TARGET, content, 'utf8');
    console.log('[fix-whaileys-lid] Patch applied (v6.4.10 style, 4-space indent).');
    process.exit(0);
  }

  if (content.includes(SIMPLE_V2)) {
    content = content.replace(
      SIMPLE_V2,
      '    if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {\n' +
      '      // Companion sync: peer_recipient_pn + isLidUser(from) = phone sent msg, CRM receives copy\n' +
      '      const isMeRecipient = !!(stanza.attrs.peer_recipient_pn) && (0, WABinary_1.isLidUser)(from);\n' +
      '      if (!isMe(from) && !isMeLid(from) && !isMeRecipient) {'
    );
    fs.writeFileSync(TARGET, content, 'utf8');
    console.log('[fix-whaileys-lid] Patch applied (v6.4.14 style, 2-space indent).');
    process.exit(0);
  }

  console.error('[fix-whaileys-lid] Pattern not found — file structure may have changed. Skipping.');
  process.exit(0);
}

// Regex match succeeded — use captured indentation
const outerIndent = match[1];
const innerIndent = match[3];
const nl = match[2];
const outerBlock = `${outerIndent}if (recipient && !(0, WABinary_1.isJidMetaAI)(recipient)) {`;
const innerThrow = `${innerIndent}if (!isMe(from) && !isMeLid(from)) {`;
const replacement =
  `${outerBlock}${nl}` +
  `${innerIndent}// Companion sync: peer_recipient_pn + isLidUser(from) = phone sent msg, CRM receives copy${nl}` +
  `${innerIndent}const isMeRecipient = !!(stanza.attrs.peer_recipient_pn) && (0, WABinary_1.isLidUser)(from);${nl}` +
  `${innerIndent}if (!isMe(from) && !isMeLid(from) && !isMeRecipient) {`;

content = content.replace(outerBlock + nl + innerThrow, replacement);
fs.writeFileSync(TARGET, content, 'utf8');
console.log('[fix-whaileys-lid] Patch applied (auto-detected indentation).');
