import * as argon2 from 'argon2';

/**
 * Configurações do Argon2id para hashing de senhas
 */
const argon2Config = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Valida se a senha atende aos critérios de segurança
 */
export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('A senha deve ter ao menos 6 caracteres');
  }
  
  if (password.length > 128) {
    errors.push('A senha não pode ter mais de 128 caracteres');
  }
  
  // Verificar padrões muito comuns
  const commonPatterns = [
    /^123456$/,
    /^password$/i,
    /^admin$/i,
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('A senha é muito comum');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gera hash da senha usando Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argon2Config);
}

/**
 * Verifica se a senha corresponde ao hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

/**
 * Gera uma senha aleatória segura
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Garantir que tenha pelo menos um de cada tipo
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Preencher o resto
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Embaralhar
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
