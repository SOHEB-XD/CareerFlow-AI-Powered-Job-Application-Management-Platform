/**
 * Safe File Validation Utility
 * Validates file buffer sizes, base64 encoding integrity, and format signatures
 * for supported resume formats: PDF, DOCX, DOC, RTF, and TXT.
 */

const zlib = require('node:zlib');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB (10,485,760 bytes)
const MAX_DOCX_TOTAL_UNCOMPRESSED = 30 * 1024 * 1024; // 30 MiB total uncompressed zip bomb limit
const MAX_DOCX_ENTRY_UNCOMPRESSED = 15 * 1024 * 1024; // 15 MiB single entry limit
const MAX_DOCX_ENTRIES = 250;                         // Maximum entries in docx archive

/**
 * Validates that a buffer is a structurally sound ZIP archive
 * containing an OpenXML Word document (word/document.xml) and
 * satisfies strict bounds against zip bombs and decompression attacks.
 * @param {Buffer} buf
 * @returns {boolean}
 */
const validateDocxArchive = (buf) => {
    if (!Buffer.isBuffer(buf) || buf.length < 30) {
        return false;
    }

    // Must start with PK\x03\x04
    if (buf[0] !== 0x50 || buf[1] !== 0x4B || buf[2] !== 0x03 || buf[3] !== 0x04) {
        return false;
    }

    // Locate End of Central Directory (EOCD) signature PK\x05\x06 from end of buffer
    let eocdOffset = -1;
    const minOffset = Math.max(0, buf.length - 65557);
    for (let i = buf.length - 22; i >= minOffset; i--) {
        if (buf[i] === 0x50 && buf[i + 1] === 0x4B && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
            eocdOffset = i;
            break;
        }
    }

    if (eocdOffset === -1) {
        return false; // Not a valid ZIP archive (missing EOCD)
    }

    const totalEntries = buf.readUInt16LE(eocdOffset + 10);
    const cdSize = buf.readUInt32LE(eocdOffset + 12);
    const cdOffset = buf.readUInt32LE(eocdOffset + 16);

    if (totalEntries === 0 || totalEntries > MAX_DOCX_ENTRIES) {
        return false; // Empty archive or exceeds safe entry count
    }

    if (cdOffset + cdSize > eocdOffset || cdOffset + cdSize > buf.length) {
        return false; // Corrupted Central Directory table
    }

    let cursor = cdOffset;
    let foundWordDocument = false;
    let totalUncompressedSize = 0;

    for (let i = 0; i < totalEntries; i++) {
        if (cursor + 46 > buf.length) {
            return false;
        }

        // Must match Central Directory Header signature PK\x01\x02
        if (buf[cursor] !== 0x50 || buf[cursor + 1] !== 0x4B || buf[cursor + 2] !== 0x01 || buf[cursor + 3] !== 0x02) {
            return false;
        }

        const compressionMethod = buf.readUInt16LE(cursor + 10);
        const compressedSize = buf.readUInt32LE(cursor + 20);
        const uncompressedSize = buf.readUInt32LE(cursor + 24);
        const fnLen = buf.readUInt16LE(cursor + 28);
        const extraLen = buf.readUInt16LE(cursor + 30);
        const commentLen = buf.readUInt16LE(cursor + 32);
        const localHeaderOffset = buf.readUInt32LE(cursor + 42);

        if (uncompressedSize > MAX_DOCX_ENTRY_UNCOMPRESSED) {
            return false;
        }

        totalUncompressedSize += uncompressedSize;
        if (totalUncompressedSize > MAX_DOCX_TOTAL_UNCOMPRESSED) {
            return false; // Zip bomb mitigation
        }

        const entryNameStart = cursor + 46;
        if (entryNameStart + fnLen > buf.length) {
            return false;
        }

        const entryName = buf.toString('utf8', entryNameStart, entryNameStart + fnLen);

        if (entryName === 'word/document.xml') {
            foundWordDocument = true;

            // Validate that the local header for word/document.xml is intact
            if (localHeaderOffset + 30 > buf.length) {
                return false;
            }
            if (buf[localHeaderOffset] !== 0x50 || buf[localHeaderOffset + 1] !== 0x4B ||
                buf[localHeaderOffset + 2] !== 0x03 || buf[localHeaderOffset + 3] !== 0x04) {
                return false;
            }

            const localFnLen = buf.readUInt16LE(localHeaderOffset + 26);
            const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
            const dataStart = localHeaderOffset + 30 + localFnLen + localExtraLen;

            if (dataStart + compressedSize > buf.length) {
                return false;
            }

            // Verify decompressed stream begins with XML
            if (compressionMethod === 8 && compressedSize > 0) { // DEFLATE
                try {
                    const compressedSlice = buf.subarray(dataStart, dataStart + compressedSize);
                    const decompressed = zlib.inflateRawSync(compressedSlice, { maxOutputLength: Math.min(uncompressedSize || 1024 * 1024, 1024 * 1024) });
                    const xmlStart = decompressed.toString('utf8', 0, Math.min(decompressed.length, 100)).trim();
                    if (!xmlStart.startsWith('<')) {
                        return false;
                    }
                } catch {
                    return false; // Malformed deflated stream in word/document.xml
                }
            } else if (compressionMethod === 0 && compressedSize > 0) { // STORED
                const rawSlice = buf.toString('utf8', dataStart, Math.min(dataStart + 100, buf.length)).trim();
                if (!rawSlice.startsWith('<')) {
                    return false;
                }
            }
        }

        cursor += 46 + fnLen + extraLen + commentLen;
    }

    return foundWordDocument;
};

const FORMAT_CONFIG = {
    '.pdf': {
        contentType: 'application/pdf',
        validate: (buf) => {
            // Must begin with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
            return buf.length >= 5 &&
                buf[0] === 0x25 &&
                buf[1] === 0x50 &&
                buf[2] === 0x44 &&
                buf[3] === 0x46 &&
                buf[4] === 0x2D;
        }
    },
    '.docx': {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        validate: (buf) => validateDocxArchive(buf)
    },
    '.doc': {
        contentType: 'application/msword',
        validate: (buf) => {
            // OLE Compound File Binary format: D0 CF 11 E0 A1 B1 1A E1
            const oleSignature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
            if (buf.length < 8) return false;
            for (let i = 0; i < 8; i++) {
                if (buf[i] !== oleSignature[i]) return false;
            }
            return true;
        }
    },
    '.rtf': {
        contentType: 'application/rtf',
        validate: (buf) => {
            // RTF starts with {\rtf (0x7B, 0x5C, 0x72, 0x74, 0x66)
            return buf.length >= 5 &&
                buf[0] === 0x7B &&
                buf[1] === 0x5C &&
                buf[2] === 0x72 &&
                buf[3] === 0x74 &&
                buf[4] === 0x66;
        }
    },
    '.txt': {
        contentType: 'text/plain; charset=utf-8',
        validate: (buf) => {
            if (buf.length === 0) return false;
            // Plain text should not contain binary null bytes (\0)
            const checkLength = Math.min(buf.length, 8192);
            for (let i = 0; i < checkLength; i++) {
                if (buf[i] === 0x00) return false;
            }
            return true;
        }
    }
};

/**
 * Validate a base64 encoded resume file
 * @param {string} rawBase64 - The raw or data-url base64 string
 * @param {string} fileName - Original file name
 * @returns {{ valid: boolean, error?: string, buffer?: Buffer, contentType?: string, extension?: string }}
 */
const validateResumeFile = (rawBase64, fileName) => {
    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
        return { valid: false, error: 'Original file name is required' };
    }

    if (!rawBase64 || typeof rawBase64 !== 'string') {
        return { valid: false, error: 'File data is missing or empty' };
    }

    // Extract extension safely
    const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (!extMatch) {
        return { valid: false, error: 'File must have a valid extension (.pdf, .docx, .doc, .txt, .rtf)' };
    }
    const ext = '.' + extMatch[1];

    if (!FORMAT_CONFIG[ext]) {
        return {
            valid: false,
            error: `Unsupported file format: ${ext}. Supported formats: ${Object.keys(FORMAT_CONFIG).join(', ')}`
        };
    }

    // Strip DataURL prefix if present
    const base64Content = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
    const cleanBase64 = base64Content.trim().replace(/\s/g, '');

    // Check for valid base64 pattern
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64) || cleanBase64.length === 0) {
        return { valid: false, error: 'Invalid file data: not valid base64 encoding' };
    }

    let buffer;
    try {
        buffer = Buffer.from(cleanBase64, 'base64');
    } catch {
        return { valid: false, error: 'Failed to decode file buffer' };
    }

    if (!buffer || buffer.length === 0) {
        return { valid: false, error: 'Decoded file is empty' };
    }

    // Enforce 10 MiB limit on actual decoded buffer length
    if (buffer.length > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB`
        };
    }

    // Validate signature
    const validator = FORMAT_CONFIG[ext];
    if (!validator.validate(buffer)) {
        return {
            valid: false,
            error: `File content does not match the expected signature for ${ext} format`
        };
    }

    return {
        valid: true,
        buffer,
        contentType: validator.contentType,
        extension: ext
    };
};

module.exports = {
    validateResumeFile,
    validateDocxArchive,
    MAX_FILE_SIZE,
    MAX_DOCX_TOTAL_UNCOMPRESSED,
    MAX_DOCX_ENTRY_UNCOMPRESSED,
    MAX_DOCX_ENTRIES,
    SUPPORTED_EXTENSIONS: Object.keys(FORMAT_CONFIG)
};
