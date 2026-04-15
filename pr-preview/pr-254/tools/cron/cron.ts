export const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function pad(n: number | string): string {
  const value = Number(n)
  return value < 10 ? `0${value}` : `${value}`
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export type CronFrequency = 'minute' | 'hour' | 'day' | 'week' | 'month'

export function buildCronExpression(
  freq: CronFrequency,
  min: number | string,
  hr: number | string,
  dow: number | string,
  dom: number | string
): { expr: string; desc: string } {
  if (freq === 'minute') {
    return { expr: '* * * * *', desc: 'Every minute' }
  }
  if (freq === 'hour') {
    return { expr: `${min} * * * *`, desc: `Every hour at minute ${min}` }
  }
  if (freq === 'day') {
    return { expr: `${min} ${hr} * * *`, desc: `Every day at ${pad(hr)}:${pad(min)} UTC` }
  }
  if (freq === 'week') {
    return {
      expr: `${min} ${hr} * * ${dow}`,
      desc: `Every ${DOW_NAMES[Number(dow)]} at ${pad(hr)}:${pad(min)} UTC`,
    }
  }
  return {
    expr: `${min} ${hr} ${dom} * *`,
    desc: `On the ${ordinal(Number(dom))} of every month at ${pad(hr)}:${pad(min)} UTC`,
  }
}
