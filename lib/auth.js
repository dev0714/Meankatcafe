import crypto from "node:crypto";

const PASSWORD_PREFIX = "scrypt";
const SCRYPT_PARAMS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
};

export const SESSION_COOKIE_NAME = "meankat_session";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function timingSafeEqualStrings(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = crypto.scryptSync(
    password,
    salt,
    SCRYPT_PARAMS.keyLength,
    {
      cost: SCRYPT_PARAMS.cost,
      blockSize: SCRYPT_PARAMS.blockSize,
      parallelization: SCRYPT_PARAMS.parallelization,
    }
  ).toString("base64url");

  return [
    PASSWORD_PREFIX,
    SCRYPT_PARAMS.cost,
    SCRYPT_PARAMS.blockSize,
    SCRYPT_PARAMS.parallelization,
    salt,
    derived,
  ].join("$");
}

export function verifyPasswordHash(password, storedHash) {
  const [prefix, cost, blockSize, parallelization, salt, derived] = storedHash.split("$");

  if (
    prefix !== PASSWORD_PREFIX ||
    !salt ||
    !derived ||
    !cost ||
    !blockSize ||
    !parallelization
  ) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, Buffer.from(derived, "base64url").length, {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  }).toString("base64url");

  return timingSafeEqualStrings(candidate, derived);
}

function signPayload(payload, secret) {
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifySignature(token, secret) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (!timingSafeEqualStrings(signature, expectedSignature)) {
    return null;
  }

  return encodedPayload;
}

export function createSessionToken(payload, secret, expiresInSeconds) {
  const sessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  return signPayload(sessionPayload, secret);
}

export function verifySessionToken(token, secret) {
  const encodedPayload = verifySignature(token, secret);
  if (!encodedPayload) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64url(encodedPayload));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== "number") {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
