/**
 * Hacker News code blocks carry no language, so guess one from the text.
 * Guesses are deliberately conservative: quoted prose, logs, and ASCII tables
 * are common in code blocks and must stay plain text.
 */

/** Prism language ids. */
export type CodeLanguage =
  | "bash"
  | "clojure"
  | "cpp"
  | "csharp"
  | "css"
  | "diff"
  | "go"
  | "haskell"
  | "java"
  | "json"
  | "kotlin"
  | "lisp"
  | "markup"
  | "php"
  | "plaintext"
  | "python"
  | "ruby"
  | "rust"
  | "scheme"
  | "sql"
  | "swift"
  | "toml"
  | "tsx"
  | "yaml"
  | "zig";

export interface CodeBlock {
  readonly code: string;
  readonly lang: CodeLanguage;
  /** Wrap instead of scrolling: the block is quoted prose, not code. */
  readonly wrap: boolean;
}

type Rule = readonly [pattern: RegExp, weight: number];

/** A guess needs this much evidence, and must beat every other language. */
const MIN_SCORE = 4;
/** Highlighting cost grows with length; very large blocks stay plain. */
const MAX_HIGHLIGHT_LENGTH = 20_000;

const TOOLS =
  "sudo|apt(?:-get)?|brew|npm|npx|pnpm|yarn|bun|pip3?|uv|cargo|git|docker|kubectl|curl|wget|ssh|systemctl|chmod|mkdir";
const BUILTINS =
  "cd|ls|cat|echo|rm|cp|mv|make|grep|sed|awk|tar|python3?|node|go|nix|source|touch|\\.\\/\\S+";

const RULES: Readonly<Partial<Record<CodeLanguage, readonly Rule[]>>> = {
  clojure: [
    [/^ *\((defn-?|ns|defmacro|defprotocol|defrecord)\s/mu, 5],
    [/^ *\(def\s+\S+/mu, 3],
    [/\(:require\s|\(->>?\s|\(fn\s+\[/u, 3],
  ],
  lisp: [
    [/^ *\((defun|defvar|defparameter|defgeneric|defmethod|defclass)\s/mu, 5],
    [/^ *\((setq|setf|defmacro|let\*)\s/mu, 3],
    [/\((lambda|progn|funcall|mapcar)\s/u, 2],
  ],
  cpp: [
    [/^ *#\s*include\s*[<"]/mu, 5],
    [/^ *#\s*(define|ifdef|ifndef|endif|pragma)\b/mu, 3],
    [/\bint\s+main\s*\(/u, 3],
    [/\bstd::\w+/u, 3],
    [/\b(cout|cerr|endl)\b|\bstd::(vector|unique_ptr|shared_ptr|optional|move)\b|\bauto&?\s+\w+\s*[=:]/u, 2],
    [/\btemplate\s*<|\b(nullptr|constexpr|noexcept)\b/u, 3],
    [/\b(printf|fprintf|malloc|free|sizeof|memcpy|strlen)\s*\(/u, 2],
    [/\b(void|char|int|float|double|size_t|u?int\d+_t|unsigned|long)\s+\**\w+\s*[(=;[]/u, 2],
    [/^ *(static|inline|extern|typedef)\s+\w+/mu, 2],
    [/\bfor\s*\(\s*(int|unsigned|size_t)\s+\w+\s*=/u, 2],
    [/\b(struct|const char)\s+\w*\s*\*|\w->\w|\bNULL\b/u, 1],
  ],
  csharp: [
    [/^ *using\s+System\b/mu, 5],
    [/\bConsole\.Write(Line)?\(/u, 4],
    [/\{\s*get;\s*(?:(?:private\s+)?set;|init;)?\s*\}/u, 4],
    [/\b(public|private|internal)\s+(static\s+)?(async\s+)?(void|Task|string|bool|class)\b/u, 2],
    [/\bnamespace\s+[\w.]+|\bvar\s+\w+\s*=\s*new\b/u, 2],
  ],
  css: [
    [/^ *@(media|import|font-face|keyframes|supports)\b/mu, 3],
    [/^ *[.#]?[\w-]+(?: *[,>+~] *[.#]?[\w-]+| +[.#]?[\w-]+)* *\{ *$/mu, 2],
    [/^ *[\w-]+ *: *[^;{}\n]+; *$/mu, 2],
    [/!important|:(hover|root|focus|before|after)\b|\d(px|rem|em|vh|vw)\b/u, 2],
  ],
  diff: [
    [/^diff --git /mu, 6],
    [/^@@\s+-\d+(,\d+)?\s+\+\d+(,\d+)?\s+@@/mu, 6],
    [/^(---|\+\+\+)\s+[ab]\//mu, 4],
  ],
  go: [
    [/^package\s+\w+$/mu, 3],
    [/^func\s+(\(\w+\s+\*?\w+\)\s*)?\w+\(/mu, 3],
    [/\bif\s+err\s*!=\s*nil\b/u, 4],
    [/\bfmt\.(Print|Sprint|Fprint|Errorf)/u, 3],
    [/\btype\s+\w+\s+(struct|interface)\b/u, 3],
    [/\w\s*:=\s/u, 2],
    [/\b(go\s+func|defer\s+\w|chan\s+\w)/u, 2],
    [/^import\s+[("]/mu, 2],
  ],
  haskell: [
    [/^\w+\s*::\s*.*(->|=>)/mu, 4],
    [/^(data|newtype|instance|module)\s+[A-Z]/mu, 2],
    [/^import\s+(qualified\s+)?[A-Z][\w.]*/mu, 2],
    [/\bwhere$|\s<-\s|\s<\$>\s|\s>>=\s/mu, 1],
  ],
  markup: [
    [/<!doctype html/iu, 5],
    [/<\/(div|span|p|a|html|body|head|script|style|ul|li|table|button|form|h[1-6])>/u, 3],
    [/<\w+(\s+[\w-]+(="[^"]*")?)+\s*\/?>/u, 2],
  ],
  java: [
    [/^ *import\s+javax?\./mu, 5],
    [/\bSystem\.(out|err)\.print/u, 4],
    [/@Override\b|String\[\]\s+args/u, 3],
    [/\bpublic\s+(static\s+)?(final\s+)?(class|interface|void|int|String)\b/u, 3],
    [/\b(private|protected)\s+(static\s+)?(final\s+)?[\w<>[\]]+\s+\w+\s*[=;(]/u, 2],
    [/\bthrows\s+\w+|\bnew\s+\w+(<[^>]*>)?\(/u, 1],
  ],
  kotlin: [
    [/\b(data|sealed)\s+class\b|\bsuspend\s+fun\b/u, 4],
    [/\bfun\s+(<[^>]+>\s*)?[\w.]+\(/u, 3],
    [/\bval\s+\w+(\s*:\s*[\w<>?]+)?\s*=/u, 2],
    [/\bwhen\s*(\(.*\))?\s*\{|\bprintln\(/u, 1],
  ],
  php: [
    [/<\?php/u, 6],
    [/\$this->/u, 4],
    [/\bfunction\s+\w*\([^)]*\$\w/u, 2],
    [/\$\w+\s*=[^=]/u, 1],
  ],
  python: [
    [/^ *def\s+\w+\s*\(.*\)\s*(->.*)?:/mu, 3],
    [/^ *class\s+\w+(\(.*\))?:$/mu, 3],
    [/\bif\s+__name__\s*==/u, 4],
    [/^ *(from\s+[\w.]+\s+)?import\s+[\w.*]+(\s+as\s+\w+)?$/mu, 2],
    [/^ *(if|elif|else|for|while|try|except|with)\b.*:$/mu, 2],
    [/^ *elif\s|\blambda\s+\w*\s*:|\bf["']/mu, 2],
    [/\bself\.\w+|\bprint\(|\b(None|True|False)\b/u, 1],
  ],
  ruby: [
    [/\b(attr_accessor|attr_reader|require_relative)\b/u, 3],
    [/\bdo\s*\|[\w,\s]+\|/u, 3],
    [/^ *def\s+[\w.]+[?!]?(\s*\(.*\))?$/mu, 2],
    [/^ *end$/mu, 2],
    [/^ *(class|module)\s+[A-Z][\w:]*(\s*<\s*[\w:]+)?$/mu, 2],
    [/\bputs\s|\.each\b/u, 1],
  ],
  rust: [
    // A line that opens with `fn name(` is code, and most often Rust.
    [/^ *(pub(\([\w:]+\))?\s+)?(const\s+|async\s+|unsafe\s+)*fn\s+\w+\s*[(<]/mu, 4],
    [/\blet\s+mut\b/u, 4],
    [/&(mut\s+)?self\b|^ *#!?\[\w+/mu, 3],
    [/\b(println|eprintln|format|vec|panic|assert_eq|todo)!\s*[([]/u, 3],
    [/^ *(pub\s+)?use\s+[\w:]+(::|;)/mu, 2],
    [/\bimpl(<[^>]*>)?\s+\w/u, 2],
    [/\b(Option|Result|Vec|Box|Rc|Arc)<|&mut\s|\b(as\s+)?\*(const|mut)\s+\w|\bunsafe\s*\{/u, 2],
    [/\b(pub\s+)?(struct|enum|trait|mod)\s+\w+|\bmatch\s.{1,200}\{$|::<|\w::\w+::|::new\(/mu, 1],
    [/\b[iu](8|16|32|64|128|size)\b|\)\s*->\s*[\w(&[]|\b\w+!\(/u, 1],
  ],
  scheme: [
    [/^ *\(define(-syntax|-record-type)?\s/mu, 5],
    [/\((call\/cc|let-values|set!)\s|\(lambda\s+\(/u, 2],
  ],
  bash: [
    [/^#!.*\b(ba|z|k|da)?sh\b/u, 6],
    [/^ *\$\s+[a-z./~]/mu, 4],
    [new RegExp(`^ *(${TOOLS})\\s+[-\\w./~"'$]`, "mu"), 3],
    // Every line is a command: a recipe, not a sentence that starts with "git".
    [new RegExp(`^(?:\\s*(?:\\$\\s+)?(?:${TOOLS}|${BUILTINS})\\b[^\\n]*(?:\\n|$))+$`, "u"), 2],
    [/^ *export\s+\w+=/mu, 4],
    [/2>&1|>\s*\/dev\/null|\$\(\w/u, 3],
    [/\|\s*(grep|sed|awk|sort|uniq|head|tail|wc|xargs|tr|cut|jq|tee|less)\b/u, 3],
    [/\\$/mu, 2],
    [/^ *(if\s+\[|then|fi|done|esac)\b/mu, 2],
    [/\s--?[a-z][\w-]*/u, 1],
    [/\s(\||&&)\s|\$\{?[A-Za-z_]\w*\}?/u, 1],
  ],
  sql: [
    [/^ *(SELECT|select)\s[\s\S]{1,1000}?\b(FROM|from)\s+\w/mu, 4],
    [/^ *(CREATE|ALTER|DROP)\s+(TABLE|INDEX|VIEW)\b/imu, 4],
    [/^ *(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/imu, 4],
    [/\b(WHERE|GROUP BY|ORDER BY|LEFT JOIN|INNER JOIN)\b/u, 2],
  ],
  swift: [
    [/^ *import\s+(SwiftUI|Foundation|UIKit|Combine)\b/mu, 5],
    [/\bguard\s+(let|var)\b|\bif\s+let\s+\w+\s*=/u, 3],
    [/@(State|Published|MainActor|objc|escaping)\b/u, 3],
    [/\bfunc\s+\w+(<[^>]+>)?\(.{0,300}\)\s*((async\s+)?(throws\s+)?->\s*[\w<>[\]?.]+\s*)?\{/u, 2],
    [/\b(let|var)\s+\w+\s*:\s*\[?[A-Z]\w*/u, 2],
  ],
  toml: [
    [/^ *\[\[?[\w.-]+\]\]?$/mu, 2],
    [/^ *[\w.-]+\s*=\s*("|'|\d|\[|\{|true\b|false\b)/mu, 2],
  ],
  tsx: [
    [/^ *import\s[\w{}*,\s]{1,300}?\sfrom\s+["']/mu, 4],
    [/^ *export\s+(default|const|function|class|interface|type)\b/mu, 3],
    [/\bconsole\.(log|error|warn|info)\(/u, 4],
    [/^ *(export\s+)?(interface|type)\s+\w+(<.*>)?\s*[={]/mu, 3],
    [/===|!==|\btypeof\s+\w/u, 2],
    [/\b(const|let|var)\s[\w${}[\],\s]{1,80}?(:\s*[\w<>[\]|]{1,40}\s*)?=/u, 2],
    [/\bfunction\s*\*?\s*\w*\s*\(|\basync\s+function\b|\bnew Promise\b/u, 2],
    [/\b(document|window|module|process)\.\w+|\brequire\(["']/u, 2],
    [/:\s*(string|number|boolean|unknown|void|never)\b/u, 2],
    [/=>\s*[{(\w]|\bawait\s+\w/u, 1],
  ],
  zig: [
    [/@import\("/u, 5],
    [/\b(comptime|anytype|errdefer)\b|@(as|intCast|ptrCast|sizeOf)\(/u, 3],
    [/\)\s*!?(void|u8|usize|\[\]const u8)\s*\{/u, 3],
    [/\bpub\s+fn\b|\b(const|var)\s+\w+\s*:\s*[\w[\]*?]+\s*=/u, 2],
  ],
};

const isJson = (code: string) => {
  const text = code.trim();
  if (!/^[{[][\s\S]*[}\]]$/u.test(text)) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    // Truncated or commented JSON: accept only clearly keyed objects.
    return (text.match(/^ *"[^"\n]+"\s*:\s/gmu)?.length ?? 0) >= 2;
  }
};

const YAML_LINE = /^ *(#.*|---|(- )?[\w."'-]+:(\s+\S.*)?|- \S.*)$/u;

/** YAML has few keywords: require every line to fit, plus real nesting. */
const isYaml = (lines: readonly string[]) =>
  lines.length >= 3 &&
  lines.every((line) => YAML_LINE.test(line)) &&
  lines.some((line) => /^ *(- )?[\w."'-]+:\s*$/u.test(line)) &&
  lines.some((line) => /^\s+\S/u.test(line));

/**
 * Indented quotes are common on Hacker News. Flowing sentences read better
 * wrapped than behind a horizontal scrollbar.
 */
const isProse = (lines: readonly string[]) => {
  // Lines short enough for a phone gain nothing from wrapping.
  if (!lines.some((line) => line.length > 40)) return false;
  // Indentation or column alignment means structure, not sentences.
  if (lines.some((line) => /^\s{2}|\S {3,}\S/u.test(line))) return false;
  const text = lines.join("");
  const wordy = text.match(/[\p{L}\s]/gu)?.length ?? 0;
  return wordy / text.length >= 0.85;
};

function detectLanguage(code: string, lines: readonly string[]): CodeLanguage {
  if (code.length > MAX_HIGHLIGHT_LENGTH) return "plaintext";
  if (isJson(code)) return "json";

  let best: CodeLanguage = "plaintext";
  let bestScore = 0;
  let runnerUp = 0;
  for (const [lang, rules] of Object.entries(RULES) as [CodeLanguage, readonly Rule[]][]) {
    let score = 0;
    for (const [pattern, weight] of rules) {
      if (pattern.test(code)) score += weight;
    }
    if (score > bestScore) {
      runnerUp = bestScore;
      bestScore = score;
      best = lang;
    } else if (score > runnerUp) {
      runnerUp = score;
    }
  }
  if (bestScore >= MIN_SCORE && bestScore > runnerUp) return best;
  return isYaml(lines) ? "yaml" : "plaintext";
}

/** Remove the indentation Hacker News requires to mark a code block. */
function dedent(code: string) {
  const lines = code.replaceAll("\t", "    ").split("\n");
  while (lines.length > 0 && lines[0]?.trim() === "") lines.shift();
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop();

  let indent = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    if (line.trim() !== "") indent = Math.min(indent, line.search(/\S/u));
  }
  return lines.map((line) => line.slice(indent).trimEnd());
}

export function describeCode(source: string): CodeBlock {
  const lines = dedent(source);
  const code = lines.join("\n");
  const filled = lines.filter((line) => line !== "");
  const lang = detectLanguage(code, filled);

  return { code, lang, wrap: lang === "plaintext" && isProse(filled) };
}
