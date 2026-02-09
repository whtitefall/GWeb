// Lightweight Editor.js wrapper for node-level rich note editing.
import { useEffect, useRef } from 'react'
import type EditorJS from '@editorjs/editorjs'
import type { OutputData } from '@editorjs/editorjs'
import { generateId } from '../utils/id'
import { parseEditorContent, serializeEditorContent } from '../utils/richText'

type EditorJsFieldProps = {
  value: string
  readOnly?: boolean
  placeholder?: string
  onChange: (value: string) => void
}

export default function EditorJsField({
  value,
  readOnly = false,
  placeholder,
  onChange,
}: EditorJsFieldProps) {
  const holderIdRef = useRef(`editorjs-${generateId()}`)
  const editorRef = useRef<EditorJS | null>(null)
  const currentValueRef = useRef(value)
  const changingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let disposed = false

    const init = async () => {
      const [{ default: EditorJSClass }, { default: Paragraph }, { default: Header }, { default: List }] =
        await Promise.all([
          import('@editorjs/editorjs'),
          import('@editorjs/paragraph'),
          import('@editorjs/header'),
          import('@editorjs/list'),
        ])
      if (disposed) {
        return
      }

      const holderElement = document.getElementById(holderIdRef.current)
      if (holderElement) {
        holderElement.innerHTML = ''
      }

      const initialData = parseEditorContent(currentValueRef.current)
      const editor = new EditorJSClass({
        holder: holderIdRef.current,
        readOnly,
        placeholder,
        autofocus: false,
        minHeight: 120,
        data: initialData,
        tools: {
          paragraph: Paragraph,
          header: Header,
          list: List,
        },
        async onChange(api) {
          if (readOnly || changingRef.current) {
            return
          }
          const saved = await api.saver.save()
          const serialized = serializeEditorContent(saved)
          currentValueRef.current = serialized
          onChangeRef.current(serialized)
        },
      })
      editorRef.current = editor
    }

    void init()

    return () => {
      disposed = true
      if (editorRef.current) {
        void editorRef.current.isReady
          .then(() => editorRef.current?.destroy())
          .catch(() => undefined)
      }
      const holderElement = document.getElementById(holderIdRef.current)
      if (holderElement) {
        holderElement.innerHTML = ''
      }
      editorRef.current = null
    }
  }, [placeholder, readOnly])

  useEffect(() => {
    if (value === currentValueRef.current) {
      return
    }
    currentValueRef.current = value
    const nextData: OutputData = parseEditorContent(value)
    const editor = editorRef.current
    if (!editor) {
      return
    }

    changingRef.current = true
    void editor.isReady
      .then(() => editor.render(nextData))
      .catch(() => undefined)
      .finally(() => {
        changingRef.current = false
      })
  }, [value])

  return (
    <div
      className="editorjs-field"
      id={holderIdRef.current}
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
    />
  )
}
