var CryptoJS = require("crypto-js");

const secretKey = process.env.SECRET_KEY;

function encrypt(text) {
  const encryptedText = CryptoJS.DES.encrypt(text, secretKey).toString();
  return encryptedText;
}

function decrypt(encryptedText) {
  const decryptedText = CryptoJS.DES.decrypt(encryptedText, secretKey).toString(
    CryptoJS.enc.Utf8
  );
  return decryptedText;
}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt
}
