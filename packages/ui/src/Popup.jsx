'use client'
import React, { useCallback, useEffect, useRef } from 'react'
import { IoCloseCircle } from 'react-icons/io5'

// The modal dialog, shared by all three apps.
//
// IT CUT ITS OWN HEADER OFF, UNREACHABLY.
//
// The overlay was `flex items-center` around a child of unbounded height. When
// the dialog is taller than the viewport, centring overflows it in BOTH
// directions — and the part above the container's start cannot be scrolled to,
// because scroll position cannot go negative. Measured on a 700px viewport with
// a ten-field form:
//
//     dialog height 996   cardTop -148   scrollTop 0 (already at the top)
//
// The title and the first two fields were 148px above the viewport with no way
// to reach them, and the Save button was below the fold at the same time. Every
// long form in the platform had this — the jobs form is simply where it was
// noticed.
//
// The fix is not `items-start`, which would strand short dialogs at the top of
// the screen. It is `my-auto` on the child: the browser centres it while it
// fits and falls back to normal flow — scrollable from the true top — once it
// does not.
//
// The dialog is now a column with its own max height, so the BODY scrolls
// rather than the page. That keeps the title and the Save button visible at all
// times, which is the point: on the old one the primary action of a long form
// was off-screen the moment it opened.
export default function Popup({
  title,
  onClose,
  children,
  submitTitle,
  formName,
  submitting = false,
  onSubmittingTitle = 'Submitting',
  size = 'md',
}) {
  const dialogRef = useRef(null)
  const close = useCallback(() => onClose(false), [onClose])

  // Escape closes. Expected of any dialog, and the only keyboard exit there was
  // — the close control is a `div`, so it could not be reached by Tab either.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  // Lock the page behind the dialog. Without this the page scrolls under the
  // overlay when the dialog itself has nothing left to scroll, which reads as
  // the dialog drifting.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  // Move focus into the dialog so the keyboard follows the eye, and hand it
  // back on close so the page does not jump to the top.
  useEffect(() => {
    const previouslyFocused = document.activeElement
    dialogRef.current?.focus()
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  return (
    // `overflow-y-auto` on the overlay, `p-4` so the dialog never touches the
    // edge of a small screen.
    <div
      className='fixed inset-0 z-[999] flex justify-center overflow-y-auto bg-[#000000aa] p-4'
      // NOT closed by a backdrop click. This dialog is nearly always a form, and
      // a stray click discarding a half-typed record is worse than one extra
      // press of Escape or Cancel.
      role='presentation'
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`${size === 'md' ? 'sm:w-[520px]' : 'sm:w-[820px]'} my-auto flex w-full max-w-full
          max-h-[calc(100dvh-2rem)] flex-col rounded-lg bg-white outline-none`}
      >
        {/* shrink-0 on both bars: without it flexbox compresses them to make
            room for a long body, and the header loses its padding first. */}
        <div className='flex shrink-0 items-center justify-between border-b-2 border-gray-100 px-8 py-4'>
          <h3 className='text-[14px] font-semibold capitalize tracking-[-.15px]'>{title}</h3>
          <button
            type='button'
            onClick={close}
            aria-label='Close'
            className='cursor-pointer rounded-md bg-gray-100 px-2 py-2 transition-all hover:bg-gray-200'
          >
            <IoCloseCircle className='h-5 w-5' />
          </button>
        </div>

        {/* min-h-0 is what actually lets this scroll: a flex child defaults to
            min-height:auto and will not shrink below its content, so the
            max-height above would be ignored and the body would grow the dialog
            off-screen again. */}
        <div className='w-full min-h-0 flex-1 overflow-y-auto px-8 py-6'>
          {children}
        </div>

        <div className='flex shrink-0 justify-end border-t-2 border-gray-50 px-8 py-4'>
          <button type='button' className='btn-md-disabled' onClick={close}>Cancel</button>
          <button
            form={formName}
            type='submit'
            className='ml-4 btn-md disabled:bg-[#d3d3d3] disabled:text-[#a3a3a3]'
            disabled={submitting}
          >
            {submitting ? onSubmittingTitle : submitTitle}
          </button>
        </div>
      </div>
    </div>
  )
}
