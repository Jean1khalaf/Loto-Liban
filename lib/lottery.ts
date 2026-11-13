import fs from 'node:fs';
import path from 'node:path';

export type Strategy = 'equilibree' | 'frequence' | 'affinites' | 'aleatoire';
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

function pairKey(a: number, b: number) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

function stats(draws: Draw[]) {
  const freq = Array(43).fill(0);
  const recent = Array(43).fill(0);
  const pairs = new Map<string, number>();
  const recentPairs = new Map<string, number>();
  const last = draws.slice(0, Math.min(100, draws.length));
  draws.forEach(d => {
    d.numbers.forEach(n => freq[n]++);
    for (let i=0;i<d.numbers.length;i++) for (let j=i+1;j<d.numbers.length;j++) {
      const key=pairKey(d.numbers[i],d.numbers[j]); pairs.set(key,(pairs.get(key)??0)+1);
    }
  });
  last.forEach((d, i) => {
    const w=(last.length-i)/last.length;
    d.numbers.forEach(n => recent[n]+=w);
    for (let a=0;a<d.numbers.length;a++) for (let b=a+1;b<d.numbers.length;b++) {
      const key=pairKey(d.numbers[a],d.numbers[b]); recentPairs.set(key,(recentPairs.get(key)??0)+w);
    }
  });
  return {freq,recent,pairs,recentPairs,maxFreq:Math.max(...freq),maxRecent:Math.max(...recent),maxPair:Math.max(...pairs.values()),maxRecentPair:Math.max(...recentPairs.values())};
}

function weightedPick(items:number[],weight:(n:number)=>number){
  const weights=items.map(n=>Math.max(.0001,weight(n))); let r=Math.random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i]} return items[items.length-1];
}

function quality(nums:number[]){
  const odd=nums.filter(n=>n%2).length,low=nums.filter(n=>n<=21).length,sum=nums.reduce((a,b)=>a+b,0);
  const consecutive=nums.slice(1).filter((n,i)=>n-nums[i]===1).length;
  return Math.max(0,Math.min(100,100-Math.abs(odd-3)*9-Math.abs(low-3)*9-Math.abs(sum-129)*.35-Math.max(0,consecutive-1)*10));
}

function affinity(nums:number[],s:ReturnType<typeof stats>){
  let global=0,recent=0,count=0;
  for(let i=0;i<nums.length;i++)for(let j=i+1;j<nums.length;j++){
    const key=pairKey(nums[i],nums[j]); global+=(s.pairs.get(key)??0)/s.maxPair; recent+=(s.recentPairs.get(key)??0)/s.maxRecentPair; count++;
  }
  return count ? (global/count*.75+recent/count*.25)*100 : 0;
}

export function generate(strategy:Strategy){
  const draws=loadDraws(),s=stats(draws); let best:number[]=[],bestScore=-1;
  for(let attempt=0;attempt<(strategy==='affinites'?2500:700);attempt++){
    const pool=Array.from({length:42},(_,i)=>i+1),nums:number[]=[];
    while(nums.length<6){
      const picked=weightedPick(pool,n=>{
        if(strategy==='aleatoire')return 1;
        const historical=s.freq[n]/s.maxFreq,momentum=s.recent[n]/s.maxRecent;
        if(strategy==='affinites'&&nums.length){
          const links=nums.map(x=>(s.pairs.get(pairKey(n,x))??0)/s.maxPair).reduce((a,b)=>a+b,0)/nums.length;
          const recentLinks=nums.map(x=>(s.recentPairs.get(pairKey(n,x))??0)/s.maxRecentPair).reduce((a,b)=>a+b,0)/nums.length;
          return .05+links*.60+recentLinks*.20+historical*.15;
        }
        return strategy==='frequence' ? .15+historical*.65+momentum*.20 : .45+historical*.25+momentum*.10+Math.random()*.20;
      });
      nums.push(picked); pool.splice(pool.indexOf(picked),1);
    }
    nums.sort((a,b)=>a-b);
    const a=affinity(nums,s),q=quality(nums);
    const score=strategy==='affinites'?a*.60+q*.20+(nums.map(n=>s.freq[n]/s.maxFreq).reduce((x,y)=>x+y,0)/6*100)*.20:strategy==='aleatoire'?q*.3+Math.random()*70:q;
    if(score>bestScore){best=nums;bestScore=score}
  }
  const pairInsights:{pair:[number,number],count:number}[]=[];
  for(let i=0;i<best.length;i++)for(let j=i+1;j<best.length;j++)pairInsights.push({pair:[best[i],best[j]],count:s.pairs.get(pairKey(best[i],best[j]))??0});
  pairInsights.sort((a,b)=>b.count-a.count);
  return {numbers:best,score:Number(quality(best).toFixed(1)),affinityScore:Number(affinity(best,s).toFixed(1)),strategy,draws:draws.length,pairInsights:pairInsights.slice(0,3),frequencies:best.map(n=>({number:n,count:s.freq[n],rate:Number((s.freq[n]/draws.length*100).toFixed(2))})),generatedAt:new Date().toISOString()};
}

export function summary(){const draws=loadDraws(),s=stats(draws),ranking=Array.from({length:42},(_,i)=>i+1).sort((a,b)=>s.freq[b]-s.freq[a]);return{draws:draws.length,newest:draws[0]?.date,oldest:draws.at(-1)?.date,hot:ranking.slice(0,6),cold:ranking.slice(-6).reverse()}}
