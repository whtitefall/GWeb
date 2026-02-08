// Rich text helpers for Editor.js content parsing and preview text extraction.
import type { OutputData } from '@editorjs/editorjs'

const stripHtml = (value: string): string =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()

const createParagraphData = (value: string): OutputData => ({
  blocks: [
    {
      type: 'paragraph',
      data: {
        text: value,
      },
    },
  ],
})

export const parseEditorContent = (value: string | undefined | null): OutputData => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    return createParagraphData('')
  }

  try {
    const parsed = JSON.parse(normalized) as OutputData
    if (parsed && Array.isArray(parsed.blocks)) {
      return parsed
    }
  } catch {
    // Fallback to plain text paragraph.
  }
  return createParagraphData(normalized)
}

export const editorContentToPlainText = (value: string | undefined | null): string => {
  const data = parseEditorContent(value)
  const lines = data.blocks
    .map((block) => {
      const dataRecord = (block?.data ?? {}) as Record<string, unknown>
      const textValue =
        typeof dataRecord.text === 'string'
          ? dataRecord.text
          : Array.isArray(dataRecord.items)
            ? dataRecord.items
                .map((item) =>
                  typeof item === 'string'
                    ? item
                    : item && typeof item === 'object' && typeof (item as { content?: unknown }).content === 'string'
                      ? ((item as { content: string }).content ?? '')
                      : '',
                )
                .filter((item) => item.length > 0)
                .join(' ')
            : ''
      return stripHtml(textValue)
    })
    .filter((line) => line.length > 0)

  return lines.join(' ').trim()
}

export const serializeEditorContent = (data: OutputData): string => JSON.stringify(data)
