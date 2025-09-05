import * as crypto from 'crypto';
import * as seedrandom from 'seedrandom';

/**
 * Gerador de números aleatórios com seed para auditoria
 */
export class SeededRandom {
  private rng: seedrandom.PRNG;
  
  constructor(private seed: string) {
    this.rng = seedrandom(seed);
  }

  /**
   * Gera um número inteiro aleatório entre min e max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  /**
   * Embaralha um array usando Fisher-Yates
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Gera uma sequência de números únicos aleatórios
   */
  generateUniqueNumbers(count: number, min: number, max: number): number[] {
    if (count > (max - min + 1)) {
      throw new Error('Não é possível gerar mais números únicos do que o range permite');
    }

    const numbers: number[] = [];
    for (let i = min; i <= max; i++) {
      numbers.push(i);
    }

    return this.shuffle(numbers).slice(0, count);
  }
}

/**
 * Sistema commit-reveal para auditoria de sorteios
 */
export class CommitReveal {
  /**
   * Gera uma seed aleatória
   */
  static generateSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cria um hash da seed (para commit)
   */
  static createCommit(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Verifica se uma seed corresponde ao hash
   */
  static verifyReveal(seed: string, commitHash: string): boolean {
    const calculatedHash = this.createCommit(seed);
    return calculatedHash === commitHash;
  }

  /**
   * Gera múltiplas seeds para uma partida
   */
  static generateMatchSeeds(count: number = 100): {
    seeds: string[];
    commitHash: string;
  } {
    const seeds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      seeds.push(this.generateSeed());
    }
    
    // Hash de todas as seeds concatenadas
    const allSeeds = seeds.join('');
    const commitHash = crypto.createHash('sha256').update(allSeeds).digest('hex');
    
    return { seeds, commitHash };
  }

  /**
   * Verifica todas as seeds de uma partida
   */
  static verifyMatchSeeds(seeds: string[], commitHash: string): boolean {
    const allSeeds = seeds.join('');
    const calculatedHash = crypto.createHash('sha256').update(allSeeds).digest('hex');
    return calculatedHash === commitHash;
  }
}

/**
 * Gerador de cartelas de bingo
 */
export class BingoCardGenerator {
  /**
   * Gera números para uma cartela de bingo
   */
  static generateCard(
    userId: string,
    matchId: string,
    cardIndex: number,
    numbersPerCard: number,
    numMin: number,
    numMax: number,
    baseSeed: string,
  ): number[] {
    // Criar seed única para esta cartela
    const cardSeed = crypto
      .createHash('sha256')
      .update(`${baseSeed}-${matchId}-${userId}-${cardIndex}`)
      .digest('hex');

    const rng = new SeededRandom(cardSeed);
    return rng.generateUniqueNumbers(numbersPerCard, numMin, numMax).sort((a, b) => a - b);
  }

  /**
   * Verifica se uma cartela é válida
   */
  static validateCard(
    numbers: number[],
    expectedCount: number,
    numMin: number,
    numMax: number,
  ): boolean {
    // Verificar quantidade
    if (numbers.length !== expectedCount) {
      return false;
    }

    // Verificar range
    if (numbers.some(n => n < numMin || n > numMax)) {
      return false;
    }

    // Verificar duplicatas
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      return false;
    }

    return true;
  }
}

/**
 * Sistema de sorteio de números
 */
export class NumberDrawer {
  private availableNumbers: number[];
  private rng: SeededRandom;

  constructor(
    numMin: number,
    numMax: number,
    seed: string,
  ) {
    this.availableNumbers = [];
    for (let i = numMin; i <= numMax; i++) {
      this.availableNumbers.push(i);
    }
    
    this.rng = new SeededRandom(seed);
    // Embaralhar os números disponíveis
    this.availableNumbers = this.rng.shuffle(this.availableNumbers);
  }

  /**
   * Sorteia o próximo número
   */
  drawNext(): number | null {
    if (this.availableNumbers.length === 0) {
      return null;
    }

    return this.availableNumbers.shift() || null;
  }

  /**
   * Retorna quantos números ainda podem ser sorteados
   */
  getRemainingCount(): number {
    return this.availableNumbers.length;
  }

  /**
   * Retorna todos os números que ainda podem ser sorteados
   */
  getRemainingNumbers(): number[] {
    return [...this.availableNumbers];
  }
}

/**
 * Gerador de assinatura para draws
 */
export class DrawSigner {
  /**
   * Assina um draw com timestamp e dados
   */
  static signDraw(
    matchId: string,
    drawIndex: number,
    number: number,
    timestamp: Date,
    serverSecret: string,
  ): string {
    const data = `${matchId}-${drawIndex}-${number}-${timestamp.toISOString()}`;
    return crypto
      .createHmac('sha256', serverSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verifica a assinatura de um draw
   */
  static verifySignature(
    matchId: string,
    drawIndex: number,
    number: number,
    timestamp: Date,
    signature: string,
    serverSecret: string,
  ): boolean {
    const expectedSignature = this.signDraw(
      matchId,
      drawIndex,
      number,
      timestamp,
      serverSecret,
    );
    
    return signature === expectedSignature;
  }
}
