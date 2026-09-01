/**
 * 🚀 Silicon Valley UX & WebGL ScrollTrigger Engine
 * Powered by GSAP ScrollTrigger + Dual-Layer Fallback
 * Ensures 100% continuous, unbreakable, bidirectional scrollytelling
 * with instant refresh-recovery, resize adaptation, and zero freezing.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
  private gsapTriggers: ScrollTrigger[] = [];

  public init(options: ScrollTriggerOptions = {}) {
    this.onAiActiveChange = options.onAiActiveChange;
    this.cleanup();

    if (typeof window === 'undefined') return;

    // Register GSAP ScrollTrigger
    try {
      gsap.registerPlugin(ScrollTrigger);
      this.initGsapTriggers();
    } catch (err) {
      console.warn('GSAP ScrollTrigger registration:', err);
    }

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

  private initGsapTriggers() {
    if (typeof document === 'undefined') return;

    // 1. AI Feature Scrollytelling Section Trigger
    const aiEl = document.getElementById('ai-feature');
    if (aiEl) {
      const trigger = ScrollTrigger.create({
        trigger: aiEl,
        start: 'top 85%',
        end: 'bottom 15%',
        toggleActions: 'play reverse play reverse',
        onEnter: () => {
          aiEl.classList.add('is-visible');
          if (this.onAiActiveChange) this.onAiActiveChange(true);
        },
        onLeave: () => {
          if (this.onAiActiveChange) this.onAiActiveChange(false);
        },
        onEnterBack: () => {
          aiEl.classList.add('is-visible');
          if (this.onAiActiveChange) this.onAiActiveChange(true);
        },
        onLeaveBack: () => {
          aiEl.classList.remove('is-visible');
          if (this.onAiActiveChange) this.onAiActiveChange(false);
        },
      });
      this.gsapTriggers.push(trigger);
    }

    // 2. Footer Cascading Trigger
    const footerEl = document.getElementById('footer');
    if (footerEl) {
      const trigger = ScrollTrigger.create({
        trigger: footerEl,
        start: 'top 92%',
        end: 'bottom bottom',
        toggleActions: 'play reverse play reverse',
        onEnter: () => {
          footerEl.classList.add('footer-cascade-active');
        },
        onLeaveBack: () => {
          footerEl.classList.remove('footer-cascade-active');
        },
      });
      this.gsapTriggers.push(trigger);
    }

    // 3. Universal Reveal ("Shoooo" Effect) on headers and cards
    const revealEls = document.querySelectorAll<HTMLElement>('.scrolly-reveal, .scrolly-card');
    revealEls.forEach((el) => {
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        end: 'bottom 12%',
        toggleActions: 'play reverse play reverse',
        onEnter: () => el.classList.add('is-visible'),
        onEnterBack: () => el.classList.add('is-visible'),
        onLeaveBack: () => {
          const rect = el.getBoundingClientRect();
          if (rect.top > window.innerHeight) el.classList.remove('is-visible');
        },
      });
      this.gsapTriggers.push(trigger);
    });

    // 4. Horizontal Scroll Pinning for Popular Courses (Apple / Cello.so style)
    const coursesPinContainer = document.getElementById('courses-pin-container') || document.getElementById('courses');
    const coursesTrack = document.getElementById('courses-horizontal-track');
    if (coursesPinContainer && coursesTrack) {
      const getScrollDist = () => {
        const trackW = coursesTrack.scrollWidth;
        const viewW = window.innerWidth;
        return Math.max(0, trackW - viewW + 180);
      };

      const hPinTrigger = ScrollTrigger.create({
        trigger: coursesPinContainer,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        start: 'top top',
        end: () => `+=${Math.max(getScrollDist(), 800)}`,
        scrub: 1,
        invalidateOnRefresh: true,
        animation: gsap.to(coursesTrack, {
          x: () => -getScrollDist(),
          ease: 'none',
        }),
      });
      this.gsapTriggers.push(hPinTrigger);
    }

    // 5. 3D Inward Fly-In Animation for Upcoming Events Section (scale: 1.1 -> 1)
    const eventsSection = document.getElementById('events');
    const eventCards = document.querySelectorAll<HTMLElement>('.event-fly-in-card');
    if (eventsSection && eventCards.length > 0) {
      const eventsTrigger = ScrollTrigger.create({
        trigger: eventsSection,
        start: 'top 82%',
        end: 'bottom 20%',
        toggleActions: 'play reverse play reverse',
        onEnter: () => {
          gsap.fromTo(
            eventCards,
            {
              scale: 1.1,
              opacity: 0,
              y: 40,
              transformOrigin: '50% 50%',
            },
            {
              scale: 1,
              opacity: 1,
              y: 0,
              duration: 1.2,
              stagger: 0.15,
              ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
              overwrite: 'auto',
            }
          );
        },
        onEnterBack: () => {
          gsap.to(eventCards, {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
            overwrite: 'auto',
          });
        },
        onLeaveBack: () => {
          gsap.to(eventCards, {
            scale: 1.1,
            opacity: 0,
            y: 40,
            duration: 0.5,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        },
      });
      this.gsapTriggers.push(eventsTrigger);
    }

    // 6. Staggered Pop-Up Entrance for Popular Course Cards (scale: 0.9 -> 1, opacity: 0 -> 1)
    const coursesSection = document.getElementById('courses');
    const courseCards = document.querySelectorAll<HTMLElement>('.course-popup-card, #courses-horizontal-track > div');
    if (coursesSection && courseCards.length > 0) {
      const coursePopupTrigger = ScrollTrigger.create({
        trigger: coursesSection,
        start: 'top 85%',
        end: 'bottom 15%',
        toggleActions: 'play reverse play reverse',
        onEnter: () => {
          gsap.fromTo(
            courseCards,
            {
              scale: 0.9,
              opacity: 0,
              y: 25,
              transformOrigin: '50% 50%',
            },
            {
              scale: 1,
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.1,
              ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              overwrite: 'auto',
            }
          );
        },
        onEnterBack: () => {
          gsap.to(courseCards, {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            overwrite: 'auto',
          });
        },
        onLeaveBack: () => {
          gsap.to(courseCards, {
            scale: 0.9,
            opacity: 0,
            y: 25,
            duration: 0.4,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        },
      });
      this.gsapTriggers.push(coursePopupTrigger);
    }
  }

  public registerAllElements() {
    if (typeof document === 'undefined') return;

    const selectors = [
      '.scrolly-reveal',
      '.scrolly-card',
      '.terafab-ai-box',
      '.footer-cascade-active',
      '#ai-feature',
      '#courses-pin-container',
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

  public refresh() {
    this.registerAllElements();
    this.evaluateAllVisibility();
    try {
      ScrollTrigger.refresh();
    } catch {}
  }

  private evaluateAllVisibility() {
    if (typeof window === 'undefined') return;

    const vh = window.innerHeight;

    this.elements.forEach((el) => {
      if (!el || !el.isConnected) {
        this.elements.delete(el);
        return;
      }

      const rect = el.getBoundingClientRect();
      const isInViewport = rect.top < vh - 20 && rect.bottom > 20;

      if (isInViewport) {
        el.classList.add('is-visible');
        if (el.id === 'ai-feature' && this.onAiActiveChange) {
          this.onAiActiveChange(true);
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

    this.gsapTriggers.forEach((t) => t.kill());
    this.gsapTriggers = [];

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScrollOrResize);
      window.removeEventListener('resize', this.handleScrollOrResize);
      window.removeEventListener('orientationchange', this.handleScrollOrResize);
    }
  }
}

export const scrollTriggerEngine = new ScrollTriggerEngine();
