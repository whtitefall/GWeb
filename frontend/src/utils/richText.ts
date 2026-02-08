// Rich text helpers for Editor.js content parsing and serialization.
import type { OutputData } from '@editorjs/editorjs'

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
    // Fallback to plain text paragraph content.
  }

  return createParagraphData(normalized)
}

export const serializeEditorContent = (data: OutputData): string => JSON.stringify(data)
