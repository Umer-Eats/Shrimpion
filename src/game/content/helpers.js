/**
 * A fact is taught as a sentence (f) that contains its answer (a) verbatim.
 * That lets every test strategy be generated from the same data:
 *  - q:  a question whose answer is `a`
 *  - a:  the short answer (must appear exactly once in `f`)
 *  - d:  three wrong-but-plausible answers
 *  - f:  the full fact you learn
 */
export const F = (q, a, d, f) => ({ q, a, d, f });

/** Topic with six facts, ordered from common knowledge (level 1) to deep niche (level 6). */
export const T = (id, name, facts) => ({ id, name, facts });
