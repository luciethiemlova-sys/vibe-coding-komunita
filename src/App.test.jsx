import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App Component', () => {
    it('renders the auth screen or loading block without crashing', () => {
        const { container } = render(<App />)
        expect(container).toBeTruthy()
        expect(container.textContent.length).toBeGreaterThan(0)
    })
})
