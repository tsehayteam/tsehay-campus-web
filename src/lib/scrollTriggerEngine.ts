/**
 * 🚀 Silicon Valley UX & WebGL ScrollTrigger Engine
 * Ensures 100% continuous, unbreakable, bidirectional scrollytelling
 * with instant refresh-recovery, resize adaptation, and zero freezing.
 */

type TriggerCallback = (isVisible: boolean, element: HTMLElement) => void;

interface ScrollTriggerOptions {
  threshold?: number;
  rootMargin?: string;
  onAiActiveChange?: (isActive: boolean) => void;
}

class ScrollTriggerEngine {
  private observer: IntersectionObserver | null = null;
  private elements: Set<HTMLElement> = new Set();
  private isRafScheduled = false;
  private onAiActiveChange?: (isActive: boolean) => void;

  public init(options: ScrollTriggerOptions = {}) {
    this.onAiActiveChange = options.onAiActiveChange;
    this.cleanup();

    if (typeof window === 'undefined') return;

    // 1. Dual-Layer Layer 1: Intersection Observer with Bidirectional Toggle
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          target.classList.add('is-visible');

          if (target.id === 'ai-feature' && this.onAiActiveChange) {
            this.onAiActiveChange(true);
          }
        } else {
          // Check if scrolled completely out of viewport bounds
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight;
          if (rect.top > vh + 40 || rect.bottom < -40) {
            target.classList.remove('is-visible');

            if (target.id === 'ai-feature' && this.onAiActiveChange) {
              this.onAiActiveChange(false);
            }
          }
        }
      });
    };

    this.observer = new IntersectionObserver(observerCallback, {
      threshold: options.threshold ?? 0.06,
      rootMargin: options.rootMargin ?? '0px 0px -20px 0px',
    });

    this.registerAllElements();

    // 2. Dual-Layer Layer 2: Fast RAF scroll & resize fallback for mid-page refreshes
    window.addEventListener('scroll', this.handleScrollOrResize, { passive: true });
    window.addEventListener('resize', this.handleScrollOrResize, { passive: true });
    window.addEventListener('orientationchange', this.handleScrollOrResize, { passive: true });

    // Execute instant refresh on initialization
    this.refresh();

    // Secondary refresh passes after DOM/images settle
    setTimeout(() => this.refresh(), 250);
    setTimeout(() => this.refresh(), 800);
  }

  public registerAllElements() {
    if (typeof document === 'undefined') return;

    const selectors = [
      '.scrolly-reveal',
      '.scrolly-card',
      '.terafab-ai-box',
      '.footer-cascade-active',
      '#ai-feature',
    ];

    const found = document.querySelectorAll<HTMLElement>(selectors.join(', '));
    found.forEach((el) => {
      if (!this.elements.has(el)) {
        this.elements.add(el);
        this.observer?.observe(el);
      }
    });
  }

  private handleScrollOrResize = () => {
    if (this.isRafScheduled) return;
    this.isRafScheduled = true;

    requestAnimationFrame(() => {
      this.evaluateAllVisibility();
      this.isRafScheduled = false;
    });
  };

  /**
   * 🔄 ScrollTrigger.refresh()
   * Recalculates every element's geometry and sets visibility immediately.
   * Survives page reloads, dynamic content injection, and screen rotations.
   */
  public refresh() {
    this.registerAllElements();
    this.evaluateAllVisibility();
  }

  private evaluateAllVisibility() {
    if (typeof window === 'undefined') return;

    const vh = window.innerHeight;
    let aiVisible = false;

    this.elements.forEach((el) => {
      if (!el || !el.isConnected) {
        this.elements.delete(el);
        return;
      }

      const rect = el.getBoundingClientRect();
      const isInViewport = rect.top < vh - 20 && rect.bottom > 20;

      if (isInViewport) {
        el.classList.add('is-visible');
        if (el.id === 'ai-feature') {
          aiVisible = true;
        }
      } else {
        if (rect.top > vh + 40 || rect.bottom < -40) {
          el.classList.remove('is-visible');
        }
      }
    });

    const aiEl = document.getElementById('ai-feature');
    if (aiEl) {
      const rect = aiEl.getBoundingClientRect();
      const inView = rect.top < vh - 50 && rect.bottom > 50;
      if (this.onAiActiveChange) {
        this.onAiActiveChange(inView);
      }
    }
  }

  public cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.elements.clear();

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScrollOrResize);
      window.removeEventListener('resize', this.handleScrollOrResize);
      window.removeEventListener('orientationchange', this.handleScrollOrResize);
    }
  }
}

export const scrollTriggerEngine = new ScrollTriggerEngine();
