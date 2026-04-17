export var DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function pad(n) { return n < 10 ? '0' + n : '' + n; }

export function ordinal(n) {
  var s = ['th','st','nd','rd'];
  var v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Build a CRON expression and human-readable description.
 *
 * @param {string}        freq - 'minute'|'hour'|'day'|'week'|'month'
 * @param {number|string} min  - minute field value (0-59)
 * @param {number|string} hr   - hour field value (0-23)
 * @param {number|string} dow  - day-of-week (0=Sunday … 6=Saturday)
 * @param {number|string} dom  - day-of-month (1-31)
 * @returns {{ expr: string, desc: string }}
 */
export function buildCronExpression(freq, min, hr, dow, dom) {
  if (freq === 'minute') {
    return { expr: '* * * * *', desc: 'Every minute' };
  } else if (freq === 'hour') {
    return { expr: min + ' * * * *', desc: 'Every hour at minute ' + min };
  } else if (freq === 'day') {
    return { expr: min + ' ' + hr + ' * * *', desc: 'Every day at ' + pad(hr) + ':' + pad(min) + ' UTC' };
  } else if (freq === 'week') {
    return { expr: min + ' ' + hr + ' * * ' + dow, desc: 'Every ' + DOW_NAMES[dow] + ' at ' + pad(hr) + ':' + pad(min) + ' UTC' };
  } else { // month
    return { expr: min + ' ' + hr + ' ' + dom + ' * *', desc: 'On the ' + ordinal(+dom) + ' of every month at ' + pad(hr) + ':' + pad(min) + ' UTC' };
  }
}
