import { describe, expect, it } from 'vitest'
import { appendMemorySection, renderTemplate } from '../src/utils/prompt-utils'

describe('prompt utils', () => {
    it('renders template placeholders', () => {
        const result = renderTemplate('Hello {{name}}, {{action}}!', {
            name: 'bot',
            action: 'welcome',
        })
        expect(result).toBe('Hello bot, welcome!')
    })

    it('appends memory block to profile cleanly', () => {
        const result = appendMemorySection('# 角色', '## 自动记忆区\n- 记忆内容')
        expect(result).toBe('# 角色\n\n## 自动记忆区\n- 记忆内容')
    })
})
