import { describe, expect, it } from 'vitest'
import { independentSystemPromptFor, promptFor, validateSettings } from '../src/index.js'
import type { DigitalLifeRecord } from '../src/types.js'

const record: DigitalLifeRecord = {
  id: 'startup-mentor', name: '创业导师', description: '创业战略与现金流', tags: ['创业', '现金流'], category: 'business',
  persona: '关注用户价值和现金流。', enabled: true,
}

describe('digital-life configuration', () => {
  it('accepts a valid record', () => {
    expect(() => { validateSettings({ records: [record] }) }).not.toThrow()
  })

  it('accepts legacy tag records during migration', () => {
    const legacy = { ...record, description: '', tags: [], tag: '企业家' }
    expect(() => { validateSettings({ records: [legacy] }) }).not.toThrow()
  })
  it('accepts legacy custom records without customCategory', () => {
    expect(() => { validateSettings({ records: [{ ...record, category: 'custom', customCategory: undefined }] }) }).not.toThrow()
  })
  it('allows persona omission when an agent file is configured', () => {
    expect(() => { validateSettings({ records: [{ ...record, persona: '', agent: '~/.agent/agents/mentor.md' }] }) }).not.toThrow()
  })

  it('rejects duplicate and malformed ids', () => {
    expect(() => { validateSettings({ records: [record, record] }) }).toThrow(/duplicate id/)
    expect(() => { validateSettings({ records: [{ ...record, id: 'Bad ID' }] }) }).toThrow(/must match/)
  })

  it('rejects empty persona and invalid batch size', () => {
    expect(() => { validateSettings({ records: [{ ...record, persona: ' ' }] }) }).toThrow(/persona is required/)
    expect(() => { validateSettings({ maxBatchSize: 0, records: [] }) }).toThrow(/must be positive/)
  })

  it('builds a focused persona prompt', () => {
    const prompt = promptFor(record, '下一步做什么？')[0]
    expect(prompt).toMatchObject({ type: 'text' })
    expect(prompt.type === 'text' && prompt.text).toContain('创业导师')
    expect(prompt.type === 'text' && prompt.text).toContain('下一步做什么？')
  })

  it('routes mentions of other digital lives through consultation tools', () => {
    const prompt = independentSystemPromptFor(record)

    expect(prompt).toContain('@<数字生命ID>')
    expect(prompt).toContain('必须调用 consult_digital_life')
    expect(prompt).toContain(`@${record.id}`)
    expect(prompt).toContain('调用 consult_digital_life_category')
  })
})

it('accepts an agent file instead of inline persona', () => {
  expect(() => {
    validateSettings({ records: [{ ...record, persona: '', agent: '~/.agent/agents/mentor.md' }] })
  }).not.toThrow()
})
