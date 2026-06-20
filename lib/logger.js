// this is a stub library. Overload/extend these functions with a more
// feature-filled or robust library such as winston, log4js, or npmlog.

export function debug(msg) {
  if (!process.env.DEBUG) return
  console.log(msg)
}

export function info(msg) {
  if (process.env.NODE_ENV === 'test') return // nice quiet tests
  console.log(msg)
}

export function error(msg) {
  if (process.env.NODE_ENV === 'test') return
  console.error(msg)
}
