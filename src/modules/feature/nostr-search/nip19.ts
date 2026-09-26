/**
 * The slice of NIP-19 this feature needs: encoding a hex key or event id into the bech32 form
 * users actually recognise (`npub1…`, `note1…`).
 *
 * Encoding only. Decoding is not needed here, and pulling in a Nostr library for sixty lines of
 * well-specified checksum maths would add a dependency to the whole client.
 */

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const HEX_64 = /^[0-9a-f]{64}$/i;

const polymod = (values: number[]): number => {
	let checksum = 1;

	for (const value of values) {
		const top = checksum >> 25;
		checksum = ((checksum & 0x1ffffff) << 5) ^ value;

		for (let bit = 0; bit < 5; bit++) {
			if ((top >> bit) & 1) {
				checksum ^= GENERATOR[bit];
			}
		}
	}

	return checksum;
};

const expandPrefix = (prefix: string): number[] => {
	const codes = [...prefix].map((character) => character.charCodeAt(0));

	return [...codes.map((code) => code >> 5), 0, ...codes.map((code) => code & 31)];
};

const createChecksum = (prefix: string, data: number[]): number[] => {
	const remainder = polymod([...expandPrefix(prefix), ...data, 0, 0, 0, 0, 0, 0]) ^ 1;

	return [0, 1, 2, 3, 4, 5].map((position) => (remainder >> (5 * (5 - position))) & 31);
};

/** Regroups 8-bit bytes into the 5-bit groups bech32 is built from. */
const toFiveBitGroups = (bytes: number[]): number[] => {
	let accumulator = 0;
	let bits = 0;
	const result: number[] = [];

	for (const byte of bytes) {
		accumulator = (accumulator << 8) | byte;
		bits += 8;

		while (bits >= 5) {
			bits -= 5;
			result.push((accumulator >> bits) & 31);
		}
	}

	if (bits > 0) {
		result.push((accumulator << (5 - bits)) & 31);
	}

	return result;
};

export const hexToBytes = (hex: string): number[] | undefined => {
	if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return undefined;

	const bytes: number[] = [];
	for (let index = 0; index < hex.length; index += 2) {
		bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
	}

	return bytes;
};

export const encodeBech32 = (prefix: string, bytes: number[]): string => {
	const data = toFiveBitGroups(bytes);
	const payload = [...data, ...createChecksum(prefix, data)].map((value) => CHARSET[value]).join("");

	return `${prefix}1${payload}`;
};

const encodeHex = (prefix: string, hex: string): string | undefined => {
	if (!HEX_64.test(hex)) return undefined;
	const bytes = hexToBytes(hex);

	return bytes ? encodeBech32(prefix, bytes) : undefined;
};

/** `npub1…` for a public key. Returns undefined for anything that is not a 32-byte hex key. */
export const encodePublicKey = (pubkeyHex: string): string | undefined => encodeHex("npub", pubkeyHex);

/** `note1…` for an event id. */
export const encodeNoteId = (eventIdHex: string): string | undefined => encodeHex("note", eventIdHex);

/** `npub1abcd…wxyz` — enough to recognise a key, short enough for a chip. */
export const shortenBech32 = (value: string, visible = 8): string => {
	const separator = value.indexOf("1");
	const prefix = separator > 0 ? value.slice(0, separator + 1) : "";
	const body = value.slice(prefix.length);

	if (body.length <= visible * 2) return value;

	return `${prefix}${body.slice(0, visible)}…${body.slice(-visible)}`;
};
