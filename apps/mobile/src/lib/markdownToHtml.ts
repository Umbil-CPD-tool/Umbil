/**
 * Small, dependency-free markdown → HTML converter for building print/PDF
 * documents on-device (headings, bold/italic, lists, links, and GFM-style
 * pipe tables). Not a full CommonMark implementation — just enough to render
 * the AI-generated clinical content (handouts, CPD reflections) cleanly.
 */

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const renderInline = (text: string): string => {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/(?<![a-zA-Z0-9])_(.+?)_(?![a-zA-Z0-9])/g, "<em>$1</em>");
  result = result.replace(/`(.+?)`/g, "<code>$1</code>");
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return result;
};

const isTableSeparatorRow = (line: string): boolean =>
  /^\|?[\s:-]+\|[\s:|-]+\|?$/.test(line.trim());

const splitTableCells = (row: string): string[] =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

export const markdownToHtml = (markdown: string): string => {
  if (!markdown || !markdown.trim()) return "";

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
  let tableBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(`<p>${renderInline(paragraphBuffer.join(" "))}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer) return;
    const items = listBuffer.items.map((item) => `<li>${renderInline(item)}</li>`).join("");
    blocks.push(`<${listBuffer.type}>${items}</${listBuffer.type}>`);
    listBuffer = null;
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.filter((row) => !isTableSeparatorRow(row));
    const [headerRow, ...bodyRows] = rows;
    let table = "<table>";
    if (headerRow) {
      table += `<thead><tr>${splitTableCells(headerRow)
        .map((cell) => `<th>${renderInline(cell)}</th>`)
        .join("")}</tr></thead>`;
    }
    if (bodyRows.length > 0) {
      table += `<tbody>${bodyRows
        .map(
          (row) =>
            `<tr>${splitTableCells(row)
              .map((cell) => `<td>${renderInline(cell)}</td>`)
              .join("")}</tr>`
        )
        .join("")}</tbody>`;
    }
    table += "</table>";
    blocks.push(table);
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushTable();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const nextLine = lines[i + 1]?.trim() ?? "";
    const looksLikeTableRow = trimmed.includes("|") && trimmed.length > 1;
    if (looksLikeTableRow && (tableBuffer.length > 0 || isTableSeparatorRow(nextLine))) {
      flushParagraph();
      flushList();
      tableBuffer.push(trimmed);
      continue;
    }

    const ulMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    const olMatch = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ulMatch || olMatch) {
      flushParagraph();
      flushTable();
      const type: "ul" | "ol" = ulMatch ? "ul" : "ol";
      const content = (ulMatch ?? olMatch)![1];
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      listBuffer.items.push(content);
      continue;
    }

    flushList();
    flushTable();
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushTable();

  return blocks.join("\n");
};
