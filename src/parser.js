export function parseQuestionsFromText(text) {
  const lines = text.replace(/\r/g,'').split('\n');
  const joined = lines.join('\n');

  const qBlocks = joined.split(/\n(?=\s*\d{1,3}[\).\s])/g).filter(Boolean);

  const questions = [];
  for (let block of qBlocks) {
    const m = block.match(/^\s*(\d{1,3})[\).\s]+([\s\S]*)/);
    if (!m) continue;
    const qnum = parseInt(m[1],10);
    let rest = m[2].trim();

    const optRegex = /(?:^\s*|\n)\(?([1-4])\)?[)\.\-:\s]+([\s\S]*?)(?=(?:\n\(?[1-4]\)?[)\.\-:\s])|\n*$)/g;
    let opts = [];
    let stem = rest;
    let match;
    let takenRanges = [];
    while ((match = optRegex.exec(rest)) && opts.length < 4) {
      const idx = parseInt(match[1],10) - 1;
      const val = match[2].trim();
      opts[idx] = val;
      takenRanges.push([match.index, match.index + match[0].length]);
    }
    if (takenRanges.length) {
      stem = rest.slice(0, takenRanges[0][0]).trim();
    }
    for (let i=0;i<4;i++) if (!opts[i]) opts[i] = '';

    questions.push({
      number: qnum,
      stem: stem || `Question ${qnum}`,
      options: opts
    });
  }
  return questions;
}

export function parseAnswerKeyFromText(text) {
  const map = {};
  const lines = text.replace(/\r/g,'').split('\n').map(s => s.trim()).filter(Boolean);
  for (let ln of lines) {
    const m = ln.match(/^(\d{1,3})\s*(?:[\)\-:>])?\s*([1-4])\s*$/);
    if (m) {
      const q = parseInt(m[1],10);
      const ans = parseInt(m[2],10);
      map[q] = ans;
    }
  }
  return map;
}

export function subjectOf(qnum){
  if (qnum>=1 && qnum<=45) return 'Physics';
  if (qnum>=46 && qnum<=90) return 'Chemistry';
  if (qnum>=91 && qnum<=135) return 'Botany';
  if (qnum>=136 && qnum<=180) return 'Zoology';
  return 'General';
}
