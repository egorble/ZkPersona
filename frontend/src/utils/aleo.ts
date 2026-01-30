// Utility functions for Aleo data conversion

export const stringToField = (str: string): string => {
    try {
        if (!str) return "0field";
        const encoder = new TextEncoder();
        const encoded = encoder.encode(str);
        let val = BigInt(0);
        for (let i = 0; i < Math.min(encoded.length, 31); i++) {
            val = (val << BigInt(8)) | BigInt(encoded[i]);
        }
        return val.toString() + "field";
    } catch (e) {
        console.error("Error encoding string to field:", e);
        return "0field";
    }
};

export const fieldToString = (fieldStr: string): string => {
    try {
        let valStr = fieldStr
            .replace(/field/g, "")
            .replace(/u64/g, "")
            .replace(/\.private/g, "")
            .replace(/\.public/g, "");

        valStr = valStr.replace(/\D/g, "");

        if (!valStr) return fieldStr;

        let val = BigInt(valStr);
        const bytes = [];
        while (val > 0n) {
            bytes.unshift(Number(val & 0xffn));
            val >>= 8n;
        }

        if (bytes.length === 0) return "";

        const decoder = new TextDecoder();
        const decoded = decoder.decode(new Uint8Array(bytes));

        if (decoded.length === 0) return valStr;

        // Check if printable
        let isPrintable = true;
        for (let i = 0; i < decoded.length; i++) {
            if (decoded.charCodeAt(i) < 32) {
                isPrintable = false;
                break;
            }
        }

        return isPrintable ? decoded : valStr;
    } catch {
        return fieldStr;
    }
};

export const formatAddress = (address: string, start: number = 6, end: number = 4): string => {
    if (!address) return "";
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const getExplorerUrl = (txId: string, network: string = "testnet"): string => {
    return `https://${network}.aleoscan.io/transaction/${txId}`;
};

export const getProvableUrl = (txId: string, network: string = "testnet"): string => {
    return `https://${network}.explorer.provable.com/transaction/${txId}`;
};

// Hash string for verification
export const hashString = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // Convert hex to field format (simplified - in production use proper field conversion)
    return stringToField(hashHex);
};

// Generate random nonce for passport (client-side)
// Used for nullifier generation - ensures privacy and prevents replay
export const generateRandomNonce = (): string => {
    // Generate random 16-byte value (128 bits) to fit safely in a field element
    // Field is ~253 bits, but we use 128 bits for simplicity and safety
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    
    // Convert to BigInt
    let val = BigInt(0);
    for (let i = 0; i < randomBytes.length; i++) {
        val = (val << BigInt(8)) | BigInt(randomBytes[i]);
    }
    
    // Return as u128 format (or field if needed, but u128 is safer for nonces)
    return val.toString() + "u128";
};

