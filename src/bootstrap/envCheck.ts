// src/bootstrap/envCheck.ts
import * as fs from 'fs';
import * as path from 'path';

type RequiredKey =
  | 'PORT'
  | 'DB_HOST'
  | 'DB_USER'
  | 'DB_PASS'
  | 'DB_NAME'
  | 'IFOOD_CLIENT_ID'
  | 'IFOOD_CLIENT_SECRET'
  | 'IFOOD_MERCHANT_ID'
  | 'IFOOD_SIGNATURE_SECRET';

const REQUIRED_KEYS: RequiredKey[] = [
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_PASS',
  'DB_NAME',
  'IFOOD_CLIENT_ID',
  'IFOOD_CLIENT_SECRET',
  'IFOOD_MERCHANT_ID',
  'IFOOD_SIGNATURE_SECRET',
];

function mask(value?: string | null) {
  if (!value) return '<empty>';
  if (value.length <= 6) return '*'.repeat(value.length);
  return value.slice(0, 3) + '...' + value.slice(-3);
}

function isUUIDLike(v?: string | null) {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];
  const values: Record<string, string | undefined> = {};

  for (const k of REQUIRED_KEYS) {
    const v = process.env[k];
    values[k] = v;
    if (!v) missing.push(k);
  }

  // avisos leves
  const port = process.env.PORT;
  if (port && !/^\d+$/.test(port)) warnings.push('PORT deve ser numérico.');

  if (process.env.IFOOD_CLIENT_ID && !isUUIDLike(process.env.IFOOD_CLIENT_ID)) {
    warnings.push('IFOOD_CLIENT_ID não parece um UUID.');
  }
  if (process.env.IFOOD_MERCHANT_ID && !isUUIDLike(process.env.IFOOD_MERCHANT_ID)) {
    warnings.push('IFOOD_MERCHANT_ID não parece um UUID.');
  }

  return { missing, warnings, values };
}

function ensureDotenvPath(): string {
  // procura um .env na raiz do projeto (subindo algumas pastas a partir deste arquivo compilado)
  const candidates = [
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    return p; // prioridade ao cwd atual
  }
  return path.resolve(process.cwd(), '.env');
}

function upsertEnvFile(updates: Record<string, string>) {
  const envPath = ensureDotenvPath();
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const lines = content.split(/\r?\n/);
  const map = new Map<string, string>();
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq > -1) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1);
      map.set(k, v);
    }
  }
  for (const [k, v] of Object.entries(updates)) {
    map.set(k, v);
  }
  const rebuilt = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(envPath, rebuilt, 'utf8');
  return envPath;
}

async function ask(question: string): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

export async function ensureEnvReady() {
  const { missing, warnings, values } = validateEnv();

  console.log('🔎 Verificando variáveis de ambiente necessárias...');
  for (const k of Object.keys(values)) {
    console.log(`  - ${k} = ${mask(values[k as keyof typeof values] || '')}`);
  }

  if (warnings.length) {
    console.warn('\n⚠️ Atenção (avisos):');
    for (const w of warnings) console.warn('  - ' + w);
  }

  if (missing.length === 0) {
    console.log('\n✅ .env OK — todas as variáveis obrigatórias estão presentes.\n');
    return;
  }

  console.error('\n❌ Faltam variáveis obrigatórias no .env:');
  for (const m of missing) console.error('  - ' + m);

  if (!process.stdout.isTTY) {
    throw new Error('Variáveis obrigatórias ausentes e terminal não-interativo. Aborte ou defina o .env.');
  }

  console.log('\nVamos preencher agora. Pressione ENTER para manter vazio (não recomendado).\n');

  const collected: Record<string, string> = {};
  for (const key of missing) {
    const answer = await ask(`${key}: `);
    if (answer) {
      collected[key] = answer;
      process.env[key] = answer; // torna disponível na sessão atual
    }
  }

  // pergunta se deseja salvar no .env
  const save = await ask('\nDeseja salvar essas informações no arquivo .env? (s/N): ');
  if (save.toLowerCase() === 's' || save.toLowerCase() === 'sim' || save.toLowerCase() === 'y') {
    const envPath = upsertEnvFile(collected);
    console.log(`\n💾 .env atualizado em: ${envPath}\n`);
  } else {
    console.log('\n(⚠️ Alterações NÃO foram persistidas no .env; só valem para esta execução)\n');
  }

  // valida novamente após coleta
  const after = validateEnv();
  if (after.missing.length) {
    throw new Error('Ainda faltam variáveis obrigatórias mesmo após o preenchimento.');
  }
  console.log('✅ .env verificado e pronto.\n');
}