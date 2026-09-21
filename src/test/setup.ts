import '@testing-library/jest-dom/vitest'

// jsdom não implementa scrollIntoView, usado para manter a nota atual visível.
Element.prototype.scrollIntoView = () => {}
