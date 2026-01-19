import { init, captureException, formatErrorMessage, formatStackTrace } from './error-capture';

describe('error-capture', () => {
  let originalFetch: typeof window.fetch;
  let originalAddEventListener: typeof window.addEventListener;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    originalFetch = window.fetch;
    originalAddEventListener = window.addEventListener;
    // Mock fetch to avoid network requests
    window.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    window.fetch = originalFetch;
    jest.restoreAllMocks();
    // Ideally we would reset the module state here, but we can't easily do that with ES modules without jest.resetModules() and dynamic imports.
    // However, since we are testing the "singleton" behavior, we might need a way to reset it if we want to test "first init" vs "second init" purely.
    // For now, we will rely on the fact that we can't easily reset the internal boolean, so we have to structure tests accordingly
    // or we might need to export a reset function for testing purposes, but let's try to verify the behavior with what we have.
    // Actually, if the fix works, calling init multiple times is safe.
  });

  describe('init', () => {
    it('wraps window.fetch on first initialization', () => {
      const initialFetch = window.fetch;
      init();
      expect(window.fetch).not.toBe(initialFetch);
    });

    it('does not re-wrap window.fetch on subsequent initialization', () => {
      // First ensure we are in a state where it is initialized (from previous test or fresh)
      // Since jest modules state persists, if previous test ran, it is already initialized.
      // But let's be robust.

      const currentFetch = window.fetch;
      init();
      // If it was already initialized, currentFetch should equal window.fetch (no change).
      // If it was NOT initialized, it should change.
      // Wait, this makes testing hard side-effects.

      // Let's rely on the fact that if we fix the code, repeat calls shouldn't change it.
      // Let's capture the state after one call.
      const afterFirstInitFetch = window.fetch;

      init();
      expect(window.fetch).toBe(afterFirstInitFetch);

      init();
      expect(window.fetch).toBe(afterFirstInitFetch);
    });

    it('adds event listeners only once', () => {
      // Clear previous calls from beforeEach or other tests if any
      addEventListenerSpy.mockClear();

      init();
      // It might add 'error' and 'unhandledrejection'
      // If already initialized, it should add NONE.
      // If not initialized, it adds 2.

      // Because we can't reset the module state easily, we have to assume the previous tests might have run.
      // Instead of checking exact count, let's check that subsequent calls add ZERO.

      addEventListenerSpy.mockClear();
      init();
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('updates config on subsequent calls', () => {
      const mockOnError = jest.fn();
      init({ onError: mockOnError });

      captureException(new Error('test'));
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('formatErrorMessage', () => {
    it('formats error messages correctly', () => {
      expect(formatErrorMessage('Error: something went wrong')).toBe('! something went wrong');
      expect(formatErrorMessage('TypeError: undefined is not a function')).toBe(
        '! Type! undefined is not a function'
      );
    });
  });

  describe('formatStackTrace', () => {
    it('cleans up stack traces', () => {
      const stack = `Error: foo
          at bar (baz.js:10:2)
          at qaz (qux.js:5:6)`;
      const cleaned = formatStackTrace(stack);
      expect(cleaned).toContain('at bar');
      // The current implementation only trims whitespace, it doesn't remove the message line
      expect(cleaned).toContain('Error: foo');
      expect(cleaned).not.toContain('  at bar'); // Should be trimmed
    });
  });
});
