import { expect, test } from 'vitest'
import { field } from './field.js'

test('creates short and paragraph field nodes', () => {
  expect(field.short('Subject', { required: true, maxLength: 100 })).toEqual({
    style: 'short',
    label: 'Subject',
    required: true,
    maxLength: 100,
  })
  expect(field.paragraph('Details', { minLength: 10, placeholder: 'Write details' })).toEqual({
    style: 'paragraph',
    label: 'Details',
    required: false,
    minLength: 10,
    placeholder: 'Write details',
  })
})
