import React from "react";

// Footer that stays fixed at the bottom of the viewport.
// It renders a spacer (same height) so page content won't be obscured.
export default function TermsFooter() {
  return (
    <div aria-hidden="false">
      {/* spacer to avoid covering page content; taller on very small screens */}
      <div className="h-28 sm:h-24 md:h-20" />

      <footer
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-md"
        // include safe-area inset for devices like iPhone with notch
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: '0.5rem' }}
      >
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0 text-muted-foreground">
            <div className="text-center md:text-left text-xs sm:text-sm">
              © 2025 Village Grievance Redressal System | Government of India
            </div>

            <div className="mt-1 md:mt-0">
              <a
                href="/TC.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary inline-block px-3 py-2 text-xs sm:text-sm"
                aria-label="Open Terms and Conditions"
              >
                Terms &amp; Conditions
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
