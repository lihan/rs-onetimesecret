const hash = "SHA-256";
const salt = "SALT";
const password = "PASSWORD";
const iteratrions = 1000;
const keyLength = 48;

async function getDerivation(hash, salt, password, iterations, keyLength) {
  const textEncoder = new TextEncoder("utf-8");
  const passwordBuffer = textEncoder.encode(password);
  const importedKey = await crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveBits"]);

  const saltBuffer = textEncoder.encode(salt);
  const params = {name: "PBKDF2", hash: hash, salt: saltBuffer, iterations: iterations};
  const derivation = await crypto.subtle.deriveBits(params, importedKey, keyLength*8);
  return derivation;
}

async function getKey(derivation) {
  const ivlen = 16;
  const keylen = 32;
  const derivedKey = derivation.slice(0, keylen);
  const iv = derivation.slice(keylen);
  const importedEncryptionKey = await crypto.subtle.importKey('raw', derivedKey, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
  return {
    key: importedEncryptionKey,
    iv: iv
  }
}

async function encrypt(text, keyObject) {
    const textEncoder = new TextEncoder("utf-8");
    const textBuffer = textEncoder.encode(text);
    const encryptedText = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: keyObject.iv }, keyObject.key, textBuffer);
    return encryptedText;
}

async function decrypt(encryptedText, keyObject) {
    const textDecoder = new TextDecoder("utf-8");
    const decryptedText = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: keyObject.iv }, keyObject.key, encryptedText);
    return textDecoder.decode(decryptedText);
}

function buf2hex(buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
}

function arrayBufferToHex(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  let hexString = "";
  for (let i = 0; i < uint8Array.length; i++) {
    const hex = uint8Array[i].toString(16).padStart(2, "0");
    hexString += hex;
  }
  return hexString;
}


function hexToArrayBuffer(hexString) {
  const hexWithoutSpaces = hexString.replace(/\s/g, ""); // Remove any spaces from the input string
  const bytes = new Uint8Array(hexWithoutSpaces.length / 2);
  for (let i = 0; i < hexWithoutSpaces.length; i += 2) {
    const hexByte = hexWithoutSpaces.substr(i, 2);
    bytes[i / 2] = parseInt(hexByte, 16);
  }
  return bytes.buffer;
}


async function encryptData(text) {
	const derivation = await getDerivation(hash, salt, password, iteratrions, keyLength);
	const keyObject = await getKey(derivation);
	var encryptedObject = await encrypt(text, keyObject);
	encryptedObject = arrayBufferToHex(encryptedObject);
  return encryptedObject;
}

async function decryptData(encryptedObject) {
	const derivation = await getDerivation(hash, salt, password, iteratrions, keyLength);
	const keyObject = await getKey(derivation);
  encryptedObject = hexToArrayBuffer(encryptedObject);
	var decryptedObject = await decrypt(encryptedObject, keyObject);
	return decryptedObject;
}

var _export = {
  aesEncrypt: encryptData,
  aesDecrypt: decryptData
};
module.exports = _export;


// const userObject = { "id": "7f85f6db-7894-418d-996c-f3f4ac61bf8e", "sellerScore": 80, "salesCount": 5 }
// const encData = await encryptData(userObject);
// const decryptedData = await decryptData(encData);
// console.log(decryptedData)