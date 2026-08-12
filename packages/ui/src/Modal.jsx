'use client'
import React, { useCallback, useEffect, useRef } from 'react'

// The overlay + card for ad-hoc dialogs — confirmations, reject prompts, image
// lightboxes, anything that brings its own inner header and buttons.
//
// `Popup` is the other one: it OWNS the title bar and the Cancel/Save footer and
// is what a form should use. This exists because ten call sites hand-rolled the
// same overlay instead, and all ten carried the same bug.
//
// THE BUG. `fixed inset-0 flex items-center justify-center` around a child of
// unbounded height overflows it in BOTH directions once it is taller than the
// viewport — and the part above the container's start can never be scrolled to,
// because scroll position cannot go negative. Measured on a 700px viewport with
// a ten-field form: the card's top sat at -148px with scrollTop already 0. The
// title and first fields were unreachable.
//
// `items-start` is not the fix (short dialogs would stick to the top of the
// screen). `my-auto` is: the browser centres the child while it fits and falls
// back to normal flow, scrollable from the true top, once it does not.
//
// The card scrolls internally rather than the page, so a lightbox or a long
// confirmation stays inside its own box.
const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
}

export default function Modal({
  onClose,
  children,
  size = 'md',
  label,
  // Opt-in, and off by default. Most of these wrap a form or a decision with a
  // mandatory reason, where a stray click on the backdrop throwing the work
  // away is worse than one more press of Escape. Lightboxes pass true — there
  // is nothing to lose and click-anywhere-to-dismiss is what people expect.
  dismissOnBackdrop = false,
  className = '',
}) {
  const ref = useRef(null)
  const close = useCallback(() => onClose && onClose(), [onClose])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  // Stop the page behind scrolling when the dialog has nothing left to scroll,
  // which otherwise reads as the dialog drifting.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    ref.current?.focus()
    return () => { if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus() }
  }, [])

  return (
    <div
      className='fixed inset-0 z-[999] flex justify-center overflow-y-auto bg-black/60 p-4'
      onClick={dismissOnBackdrop ? close : undefined}
      role='presentation'
    >
      <div
        ref={ref}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`my-auto w-full ${SIZES[size] || SIZES.md} max-h-[calc(100dvh-2rem)]
          overflow-y-auto rounded-lg bg-white outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
