/**
 * Utilitários para validação e formatação de CPF brasileiro
 */

/**
 * Remove todos os caracteres não numéricos do CPF
 */
export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Valida se o CPF é válido segundo o algoritmo brasileiro
 */
export function validateCpf(cpf: string): boolean {
  const cleanCpf = normalizeCpf(cpf);
  
  // Verificar se tem 11 dígitos
  if (cleanCpf.length !== 11) {
    return false;
  }
  
  // Verificar se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCpf)) {
    return false;
  }
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) {
    firstDigit = 0;
  }
  
  // Verificar primeiro dígito
  if (firstDigit !== parseInt(cleanCpf.charAt(9))) {
    return false;
  }
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) {
    secondDigit = 0;
  }
  
  // Verificar segundo dígito
  return secondDigit === parseInt(cleanCpf.charAt(10));
}

/**
 * Formata CPF para exibição (000.000.000-00)
 */
export function formatCpf(cpf: string): string {
  const cleanCpf = normalizeCpf(cpf);
  
  if (cleanCpf.length !== 11) {
    return cpf;
  }
  
  return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Máscara CPF para validação de input
 */
export function maskCpf(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length <= 3) {
    return cleanValue;
  } else if (cleanValue.length <= 6) {
    return cleanValue.replace(/(\d{3})(\d+)/, '$1.$2');
  } else if (cleanValue.length <= 9) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  } else {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
  }
}
