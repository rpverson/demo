// Lightweight HTML -> Markdown conversion for MVP persistence.
export function htmlToMarkdown(input: string): string {
  return input
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const html = lines
    .map((line) => {
      if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
      if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
      if (line.startsWith('# ')) return `<h1>${line.replace('# ', '')}</h1>`;
      if (line.startsWith('- ')) return `<p>• ${line.replace('- ', '')}</p>`;
      if (!line.trim()) return '';
      return `<p>${line}</p>`;
    })
    .join('');

  return html || '<p></p>';
}
