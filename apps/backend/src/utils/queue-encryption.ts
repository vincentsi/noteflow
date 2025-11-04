import crypto from 'crypto'
import { env } from '@/config/env'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = env.QUEUE_ENCRYPTION_KEY || env.JWT_SECRET
  return crypto.createHash('sha256').update(key).digest().subarray(0, KEY_LENGTH)
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag.toString('hex'),
  })
}

export function decrypt(encryptedData: string): string {
  const { iv, data, tag } = JSON.parse(encryptedData)
  const key = getEncryptionKey()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))

  decipher.setAuthTag(Buffer.from(tag, 'hex'))

  let decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function encryptIfSensitive(value: unknown): unknown {
  if (typeof value === 'string' && value.length > 100) {
    return encrypt(value)
  }
  return value
}

export function decryptIfEncrypted(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      return decrypt(value)
    } catch {
      return value
    }
  }
  return value
}
