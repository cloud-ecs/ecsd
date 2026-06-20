import net from 'node:net'

let connectTimeout = 3
if (process.env.NODE_ENV === 'test') connectTimeout = 1

export function findTcp(connOpts) {
  if (!connOpts.port) throw new Error('missing "port" argument')

  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn, arg) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(arg)
    }

    const timer = setTimeout(
      () => settle(reject, new Error('timed out')),
      connectTimeout * 1000,
    )

    net
      .connect(connOpts)
      .on('connect', () => settle(resolve, true))
      .on('error', (err) => settle(reject, err))
  })
}
