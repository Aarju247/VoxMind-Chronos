class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer      = []
    this._targetRate  = 16000
    this._inputRate   = sampleRate   // AudioWorkletGlobalScope.sampleRate
    this._ratio       = this._inputRate / this._targetRate
    this._chunkSize   = 4096         // send every 4096 target samples (~256ms)
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const samples = input[0]   // Float32Array, mono

    // Downsample via simple decimation
    for (let i = 0; i < samples.length; i += this._ratio) {
      const idx    = Math.floor(i)
      const sample = samples[idx]

      // Clamp and convert float32 → int16
      const clamped = Math.max(-1, Math.min(1, sample))
      const int16   = clamped < 0
        ? Math.ceil(clamped * 32768)
        : Math.floor(clamped * 32767)

      this._buffer.push(int16)
    }

    // Send chunk when buffer is large enough
    if (this._buffer.length >= this._chunkSize) {
      const chunk  = this._buffer.splice(0, this._chunkSize)
      const int16a = new Int16Array(chunk)
      // Transfer the buffer (zero-copy)
      this.port.postMessage(int16a.buffer, [int16a.buffer])
    }

    return true   // keep processor alive
  }
}

registerProcessor("audio-processor", AudioProcessor)