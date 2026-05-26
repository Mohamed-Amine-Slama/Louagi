/**
 * Mock End-to-End Encryption utility.
 * In a real application, this would use the Signal Protocol or WebCrypto API
 * with public/private key pairs to encrypt the payload before sending it over the network.
 * For this mock, we use a simple base64 encoding to demonstrate the concept that
 * the server only sees encrypted data.
 */

export function encryptMessage(text) {
  if (!text) return '';
  // Mock E2E encryption using simple URI encoding to ensure cross-platform safety
  // without relying on btoa or Buffer which might not be polyfilled in this RN setup.
  return 'E2EE::' + encodeURIComponent(text);
}

export function decryptMessage(cipher) {
  if (!cipher || !cipher.startsWith('E2EE::')) return cipher;
  const data = cipher.replace('E2EE::', '');
  try {
    return decodeURIComponent(data);
  } catch (e) {
    return '[Encrypted Message]';
  }
}
