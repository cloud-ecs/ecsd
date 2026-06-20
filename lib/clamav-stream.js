import { Transform } from 'node:stream'

// Frames a file for clamd's INSTREAM command: each chunk is prefixed with its
// length as a big-endian uint32, and a zero-length chunk marks the end.
class ClamStream extends Transform {
  _transform(chunk, encoding, done) {
    const size = Buffer.alloc(4)
    size.writeInt32BE(chunk.length, 0)
    this.push(size)
    this.push(chunk)
    done()
  }

  _flush(done) {
    const size = Buffer.alloc(4)
    size.writeInt32BE(0, 0)
    this.push(size)
    done()
  }
}

export default ClamStream
