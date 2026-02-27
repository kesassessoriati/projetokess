import crypto from "crypto";

const algorithm = "aes-256-cbc";
const secretKey = process.env.JWT_SECRET || "atendzappy-secret-key-32-bytes!!!";

export const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(16);
    // Guarantee the key is exactly 32 bytes
    const key = crypto.scryptSync(secretKey, 'salt', 32) as any;
    const cipher = crypto.createCipheriv(algorithm, key, iv as any);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (hash: string): string => {
    try {
        const [ivHex, encryptedHex] = hash.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const key = crypto.scryptSync(secretKey, 'salt', 32) as any;
        const decipher = crypto.createDecipheriv(algorithm, key, iv as any);

        let decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (err) {
        // If it fails to decrypt (e.g., was stored as plain text before we added this, or key changed), return the original
        return hash;
    }
};
