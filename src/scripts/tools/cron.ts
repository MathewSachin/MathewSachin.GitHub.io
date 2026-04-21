export const DOW_NAMES: string[] = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function pad(n: number | string): string { return Number(n) < 10 ? '0' + n : '' + n; }

export function ordinal(n: number): string {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export type CronFreq = 'minute' | 'hour' | 'day' | 'week' | 'month';

export function buildCronExpression(freq: string, min: number | string, hr: number | string, dow: number | string, dom: number | string): { expr: string; desc: string } {
  if (freq === 'minute') {
    return { expr: '* * * * *', desc: 'Every minute' };
  } else if (freq === 'hour') {
    return { expr: `${min} * * * *`, desc: 'Every hour at minute ' + min };
  } else if (freq === 'day') {
    return { expr: `${min} ${hr} * * *`, desc: 'Every day at ' + pad(hr) + ':' + pad(min) + ' UTC' };
  } else if (freq === 'week') {
    const dowNum = Number(dow);
    return { expr: `${min} ${hr} * * ${dow}`, desc: 'Every ' + DOW_NAMES[dowNum] + ' at ' + pad(hr) + ':' + pad(min) + ' UTC' };
  } else { // month
    return { expr: `${min} ${hr} ${dom} * *`, desc: 'On the ' + ordinal(Number(dom)) + ' of every month at ' + pad(hr) + ':' + pad(min) + ' UTC' };
  }
}
