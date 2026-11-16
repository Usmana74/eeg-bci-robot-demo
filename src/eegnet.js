// EEGNet forward pass in plain JavaScript (no libraries). Mirrors forward_np from the export notebook.
export function decodeInt16(b64, scale) {
  const bin = atob(b64);
  const n = bin.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    if (v & 0x8000) v -= 0x10000;
    out[i] = Math.fround(v * scale);
  }
  return out;
}
const elu = (x) => (x > 0 ? x : Math.exp(x) - 1);

export function forward(x, cfg, P) { // x: Float32Array length C*T (channel-major)
  const { F1, D, K, C, T } = cfg;
  const pad = K >> 1, FD = F1 * D;
  // temporal conv: y1[f][c][t]
  const y1 = new Float64Array(F1 * C * T);
  for (let f = 0; f < F1; f++) for (let c = 0; c < C; c++) for (let t = 0; t < T; t++) {
    let s = P.b1[f];
    for (let k = 0; k < K; k++) {
      const i = t + k - pad;
      if (i >= 0 && i < T) s += P.w1[f][k] * x[c * T + i];
    }
    y1[(f * C + c) * T + t] = s;
  }
  // depthwise spatial conv + ELU + avgpool 4
  const T2 = Math.floor(T / 4);
  const y2 = new Float64Array(FD * T2);
  for (let o = 0; o < FD; o++) {
    const f = Math.floor(o / D);
    for (let p = 0; p < T2; p++) {
      let acc = 0;
      for (let q = 0; q < 4; q++) {
        const t = p * 4 + q;
        let s = P.b2[o];
        for (let c = 0; c < C; c++) s += P.w2[o][c] * y1[(f * C + c) * T + t];
        acc += elu(s);
      }
      y2[o * T2 + p] = acc / 4;
    }
  }
  // depthwise temporal conv (kernel 16, pad 8), pointwise, ELU, avgpool 8
  const L3 = T2 + 1;
  const y3 = new Float64Array(FD * L3);
  for (let o = 0; o < FD; o++) for (let t = 0; t < L3; t++) {
    let s = 0;
    for (let k = 0; k < 16; k++) {
      const i = t + k - 8;
      if (i >= 0 && i < T2) s += P.wd[o][k] * y2[o * T2 + i];
    }
    y3[o * L3 + t] = s;
  }
  const F2 = P.wp.length, T3 = Math.floor(L3 / 8);
  const feat = new Float64Array(F2 * T3);
  for (let p = 0; p < F2; p++) for (let u = 0; u < T3; u++) {
    let acc = 0;
    for (let q = 0; q < 8; q++) {
      const t = u * 8 + q;
      let s = P.bp[p];
      for (let o = 0; o < FD; o++) s += P.wp[p][o] * y3[o * L3 + t];
      acc += elu(s);
    }
    feat[p * T3 + u] = acc / 8;
  }
  const logits = P.wl.map((row, j) => { let s = P.bl[j]; for (let i = 0; i < feat.length; i++) s += row[i] * feat[i]; return s; });
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
}
