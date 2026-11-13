import fs from 'node:fs';
import path from 'node:path';

export type Strategy = 'equilibree' | 'frequence' | 'aleatoire';
type Draw = { numbers: number[]; date: string };
let cached: Draw[] | null = null;

export function loadDraws(): Draw[] {
  if (cached) return cached;
  const raw = fs.readFileSync(path.join(process.cwd(), 'data.csv'), 'utf8');
  cached = raw.trim().split(/\r?\n/).slice(1).map((line) => {
    const p = line.trim().split(';');
    return { date: p[0], numbers: p.slice(2, 8).map(Number) };
  }).filter(d => d.numbers.length === 6 && d.numbers.every(n => n >= 1 && n <= 42));
  return cached;
}

function stats(draws: Draw[]) {
  const freq = Array(43).fill(0);
  const recent = Array(43).fill(0);
  const last = draws.slice(0, Math.min(100, draws.length));
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));
  last.forEach((d, i) => d.numbers.forEach(n => recent[n] += (last.length - i) / last.length));
  const maxFreq = Math.max(...freq);
  const maxRecent = Math.max(...recent);
  return { freq, recent, maxFreq, maxRecent };
}

function weightedPick(items: number[], weight: (n:number)=>number) {
  const weights = items.map(n => Math.max(0.0001, weight(n)));
  let r = Math.random() * weights.reduce((a,b)=>a+b,0);
  for (let i=0;i<items.length;i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length-1];
}

function quality(nums: number[]) {
  const odd = nums.filter(n => n % 2).length;
  const low = nums.filter(n => n <= 21).length;
  const sum = nums.reduce((a,b)=>a+b,0);
  const consecutive = nums.slice(1).filter((n,i)=>n-nums[i]===1).length;
  let score = 100 - Math.abs(odd-3)*9 - Math.abs(low-3)*9 - Math.abs(sum-129)*0.35 - Math.max(0,consecutive-1)*10;
  return Math.max(0, Math.min(100, score));
}

export function generate(strategy: Strategy) {
  const draws = loadDraws();
  const s = stats(draws);
  let best: number[] = [];
  let bestScore = -1;
  for (let attempt=0; attempt<700; attempt++) {
    const pool = Array.from({length:42},(_,i)=>i+1);
    const nums: number[] = [];
    while (nums.length < 6) {
      const picked = weightedPick(pool, n => {
        if (strategy === 'aleatoire') return 1;
        const historical = s.freq[n] / s.maxFreq;
        const momentum = s.recent[n] / s.maxRecent;
        return strategy === 'frequence' ? 0.15 + historical*0.65 + momentum*0.20 : 0.45 + historical*0.25 + momentum*0.10 + Math.random()*0.20;
      });
      nums.push(picked);
      pool.splice(pool.indexOf(picked),1);
    }
    nums.sort((a,b)=>a-b);
    const q = quality(nums);
    const score = strategy === 'aleatoire' ? q * 0.3 + Math.random()*70 : q;
    if (score > bestScore) { best = nums; bestScore = score; }
  }
  const frequencies = best.map(n => ({number:n, count:s.freq[n], rate:Number((s.freq[n]/draws.length*100).toFixed(2))}));
  return { numbers: best, score: Number(quality(best).toFixed(1)), strategy, draws: draws.length, frequencies, generatedAt: new Date().toISOString() };
}

export function summary() {
  const draws=loadDraws(); const s=stats(draws);
  const ranking=Array.from({length:42},(_,i)=>i+1).sort((a,b)=>s.freq[b]-s.freq[a]);
  return {draws:draws.length, newest:draws[0]?.date, oldest:draws.at(-1)?.date, hot:ranking.slice(0,6), cold:ranking.slice(-6).reverse()};
}
