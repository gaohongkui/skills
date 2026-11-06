/**
 * Minimal YAML-subset parser for SKILL.md frontmatter.
 *
 * Supports exactly what the Agent Skills spec needs and nothing more:
 * scalars, quoted scalars, booleans, folded (>) / literal (|) block scalars,
 * inline arrays ([a, b]), block arrays (- a), and one level of nested maps.
 *
 * Deliberately dependency-free: this repo ships no node_modules.
 */

export function splitFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { raw: null, body: text, error: 'file does not start with a --- frontmatter block' };
  }
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (close === -1) {
    return { raw: null, body: text, error: 'frontmatter block is never closed with ---' };
  }
  return {
    raw: lines.slice(1, close).join('\n'),
    body: lines.slice(close + 1).join('\n'),
    bodyLine: close + 2, // 1-based line number where the body starts
  };
}

const indentOf = (line) => line.match(/^[ ]*/)[0].length;

function nextContentLine(lines, from) {
  for (let i = from; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (/^[ ]*#/.test(line)) continue;
    return i;
  }
  return -1;
}

function parseScalar(value) {
  const s = value.trim();
  if (s === '') return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((part) => parseScalar(part));
  }
  // Strip an unquoted trailing comment ("value  # note").
  const hash = s.search(/\s#/);
  return hash === -1 ? s : s.slice(0, hash).trim();
}

function parseBlockScalar(lines, start, parentIndent, marker) {
  const collected = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() !== '' && indentOf(line) <= parentIndent) break;
    collected.push(line);
    i += 1;
  }
  while (collected.length && collected[collected.length - 1].trim() === '') collected.pop();

  const nonBlank = collected.filter((line) => line.trim() !== '');
  const baseIndent = nonBlank.length ? Math.min(...nonBlank.map(indentOf)) : parentIndent + 2;
  const stripped = collected.map((line) => line.slice(Math.min(baseIndent, indentOf(line))));

  let value;
  if (marker.startsWith('|')) {
    value = stripped.join('\n');
  } else {
    // Folded: single newlines become spaces, blank lines become paragraph breaks.
    const paragraphs = [];
    let current = [];
    for (const line of stripped) {
      if (line.trim() === '') {
        if (current.length) paragraphs.push(current.join(' '));
        current = [];
      } else {
        current.push(line.trim());
      }
    }
    if (current.length) paragraphs.push(current.join(' '));
    value = paragraphs.join('\n');
  }
  return { value, next: i };
}

function parseBlock(lines, start, indent) {
  const out = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || /^[ ]*#/.test(line)) {
      i += 1;
      continue;
    }
    const cur = indentOf(line);
    if (cur < indent) break;
    if (cur > indent) {
      i += 1;
      continue;
    }
    const match = line.slice(cur).match(/^([^:]+):(.*)$/);
    if (!match) {
      i += 1;
      continue;
    }
    const key = match[1].trim();
    const rest = match[2].trim();

    if (rest === '') {
      const nextIdx = nextContentLine(lines, i + 1);
      if (nextIdx !== -1) {
        const nextIndent = indentOf(lines[nextIdx]);
        if (nextIndent > cur) {
          if (lines[nextIdx].trim().startsWith('- ')) {
            const arr = [];
            let j = nextIdx;
            while (j < lines.length) {
              const item = lines[j];
              if (item.trim() === '') {
                j += 1;
                continue;
              }
              if (indentOf(item) < nextIndent) break;
              if (item.trim().startsWith('- ')) arr.push(parseScalar(item.trim().slice(2)));
              j += 1;
            }
            out[key] = arr;
            i = j;
            continue;
          }
          const nested = parseBlock(lines, nextIdx, nextIndent);
          out[key] = nested.value;
          i = nested.next;
          continue;
        }
      }
      out[key] = '';
      i += 1;
      continue;
    }

    if (rest === '>' || rest === '>-' || rest === '|' || rest === '|-') {
      const block = parseBlockScalar(lines, i + 1, cur, rest);
      out[key] = block.value;
      i = block.next;
      continue;
    }

    out[key] = parseScalar(rest);
    i += 1;
  }
  return { value: out, next: i };
}

export function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  const first = nextContentLine(lines, 0);
  if (first === -1) return {};
  return parseBlock(lines, first, indentOf(lines[first])).value;
}

export function readSkill(filePath, fs) {
  const text = fs.readFileSync(filePath, 'utf8');
  const split = splitFrontmatter(text);
  if (split.error) return { error: split.error, text, body: '', data: {} };
  return {
    text,
    body: split.body,
    bodyLine: split.bodyLine,
    data: parseFrontmatter(split.raw),
  };
}

export const fold = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
