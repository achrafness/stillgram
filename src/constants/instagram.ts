export const InstagramHomeUrl = 'https://www.instagram.com/';

export const InstagramUserAgent =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

// Instagram puts the aria-label on the SVG icon, not the link — the whole parent link must be
// hidden via :has(), otherwise it stays tappable (and keeps its layout slot) with just the
// icon invisible.
const InstagramHiddenIconsCss = `
  a:has(svg[aria-label="Explore"]),
  a:has(svg[aria-label="Reels"]) {
    display: none !important;
  }
`;

// Applied only on the home page ('/'): the feed and its infinite-loading spinner are hidden
// and vertical scrolling is locked, leaving the stories tray plus the injected lock icon.
// Only the <article> elements themselves are hidden — never a section containing them,
// because Instagram sometimes wraps the stories tray in the same section as the feed.
const InstagramHomeLockCss = `
  main article,
  svg[aria-label="Loading..."] {
    display: none !important;
  }
  html, body, main {
    overflow: hidden !important;
    overscroll-behavior: none !important;
  }
`;

// On a /reel/<code> page the shared reel sits in a swipeable tray of further reels: hide
// everything past the first one and the next/previous controls. Vertical swiping is blocked
// separately in JS — Instagram advances the tray with its own touch handlers, not native
// scrolling, so CSS alone can't stop it.
const InstagramSingleReelCss = `
  main article:not(:first-of-type),
  [aria-label="Next"],
  [aria-label="Previous"] {
    display: none !important;
  }
  html, body {
    overflow: hidden !important;
    overscroll-behavior: none !important;
  }
`;

// Runs once per document, injected BEFORE Instagram's own scripts so the history patch takes
// effect. Self-sustaining across SPA route changes (patched history + popstate + a
// MutationObserver against Instagram's aggressive re-rendering).
//
// Reel blocking (verified on-device): a reel shared in a DM opens in a fullscreen overlay at
// /direct/t/<id>/ — the URL never changes — so the viewer is detected via the DOM: touches on
// it go through a [role=presentation] layer or the "Video player" group. (The viewer's
// <video> is NOT a descendant of the presentation layer, so containment checks don't work.)
// Instagram drives the tray with JS pointer-event handlers, so vertically-dominant gestures
// must be swallowed for BOTH pointer and touch event families at the document capture phase,
// before Instagram's handlers run. /stories/ paths are exempt so swipe-down-to-close works.
export function buildInjectedScript() {
  return `
    (function() {
      if (window.__stillgramActive) return;
      window.__stillgramActive = true;

      function isSingleReelPath(pathname) {
        return /^\\/reels?\\/[^/]+\\/?$/.test(pathname);
      }

      function isStoriesPath(pathname) {
        return /^\\/stories\\//.test(pathname);
      }

      function isReelContext(target) {
        if (isStoriesPath(window.location.pathname)) return false;
        if (isSingleReelPath(window.location.pathname)) return true;
        if (!(target instanceof Element)) return false;
        return !!(
          target.closest('[aria-label="Video player"]') ||
          target.closest('[role="presentation"]')
        );
      }

      function applyStyles() {
        var path = window.location.pathname;
        var css = ${JSON.stringify(InstagramHiddenIconsCss)};
        if (isSingleReelPath(path)) {
          css += ${JSON.stringify(InstagramSingleReelCss)};
        }
        if (path === '/') {
          css += ${JSON.stringify(InstagramHomeLockCss)};
        }

        var style = document.getElementById('stillgram-style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'stillgram-style';
          (document.head || document.documentElement).appendChild(style);
        }
        if (style.innerHTML !== css) style.innerHTML = css;

        fixBottomBar();
        hideLiteBanner();
        updateLockOverlay();
      }

      // Hiding just the link leaves its wrapper occupying a flex slot, pushing the remaining
      // icons off-center. Hide the wrapper (the nav's direct child containing the icon)
      // instead. SCOPE GUARD: only navs containing a Home link — Instagram also wraps whole
      // content panes (e.g. the DM inbox) in [role=navigation], and climbing wrappers there
      // hides the entire pane.
      // The bottom tab bar on this surface is not a <nav>, so it's located via the visible
      // Home icon in the bottom of the viewport. Hidden entries (Explore/Reels, display:none
      // via CSS) leave their wrapper slots holding flex width, pushing Messages off-center —
      // hide any slot in the row whose icons are all invisible.
      function isVisible(el) {
        return !!el.getClientRects().length;
      }
      function fixBottomBar() {
        var homes = document.querySelectorAll('svg[aria-label="Home"]');
        var home = null;
        for (var i = 0; i < homes.length; i++) {
          var rect = homes[i].getBoundingClientRect();
          if (rect.top > window.innerHeight * 0.7 && rect.height > 0) {
            home = homes[i];
            break;
          }
        }
        if (!home) return;

        var row = home.parentElement;
        while (row && row.children.length < 3 && row.parentElement) {
          row = row.parentElement;
        }
        if (!row) return;

        for (var c = 0; c < row.children.length; c++) {
          var slot = row.children[c];
          if (getComputedStyle(slot).display === 'none') continue;
          var media = slot.querySelectorAll('svg, img');
          if (media.length === 0) continue;
          var anyVisible = false;
          for (var m = 0; m < media.length; m++) {
            if (isVisible(media[m])) {
              anyVisible = true;
              break;
            }
          }
          if (!anyVisible && slot.style.display !== 'none') {
            slot.style.setProperty('display', 'none', 'important');
          }
        }
      }

      // The "Use Instagram Lite" upsell banner: locate its text and hide the banner row.
      // GUARDS: the climb once reached a wrapper containing the entire page (header + stories
      // vanished, only fixed-position elements survived) — so stop climbing at any ancestor
      // holding real content (main, the stories tray, the Home icon), and only hide a
      // candidate that is banner-shaped: full width but short.
      function hideLiteBanner() {
        var result = document.evaluate(
          "//*[text()='Use Instagram Lite']",
          document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        );
        var banner = result.singleNodeValue;
        if (!banner) return;
        var candidate = banner;
        for (var j = 0; j < 6 && candidate.parentElement; j++) {
          candidate = candidate.parentElement;
          if (
            candidate.querySelector('main') ||
            candidate.querySelector('svg[aria-label="Home"]') ||
            candidate.querySelector('img[alt*="profile picture"]')
          ) {
            break;
          }
          var rect = candidate.getBoundingClientRect();
          if (rect.width >= window.innerWidth * 0.9 && rect.height > 0 && rect.height <= 150) {
            if (candidate.style.display !== 'none') {
              candidate.style.setProperty('display', 'none', 'important');
            }
            break;
          }
        }
      }

      // On the home page the hidden feed is replaced by a centered lock icon. pointer-events
      // is off so the stories tray above it stays fully usable.
      function updateLockOverlay() {
        var onHome = window.location.pathname === '/';
        var lock = document.getElementById('stillgram-lock');
        if (onHome && !lock) {
          lock = document.createElement('div');
          lock.id = 'stillgram-lock';
          lock.style.cssText =
            'position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);' +
            'text-align:center;pointer-events:none;z-index:0;color:#8e8e8e;';
          lock.innerHTML =
            '<div style="font-size:64px;line-height:1">\\uD83D\\uDD12</div>' +
            '<div style="font-size:15px;margin-top:12px;font-family:sans-serif">Feed locked</div>';
          document.body.appendChild(lock);
        } else if (!onHome && lock) {
          lock.remove();
        }
      }

      // Swallow vertical swipes in reel contexts before Instagram's handlers run.
      var startX = null;
      var startY = null;
      var blockThisGesture = false;

      function onGestureStart(e, x, y) {
        startX = x;
        startY = y;
        blockThisGesture = isReelContext(e.target);
      }

      function onGestureMove(e, x, y) {
        if (!blockThisGesture || startY === null) return;
        var dx = Math.abs(x - startX);
        var dy = Math.abs(y - startY);
        if (dy > dx) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }

      document.addEventListener('touchstart', function(e) {
        onGestureStart(e, e.touches[0].clientX, e.touches[0].clientY);
      }, { capture: true, passive: true });
      document.addEventListener('touchmove', function(e) {
        onGestureMove(e, e.touches[0].clientX, e.touches[0].clientY);
      }, { capture: true, passive: false });
      document.addEventListener('pointerdown', function(e) {
        onGestureStart(e, e.clientX, e.clientY);
      }, { capture: true, passive: true });
      document.addEventListener('pointermove', function(e) {
        onGestureMove(e, e.clientX, e.clientY);
      }, { capture: true, passive: false });

      // Detect SPA navigations.
      var pushState = history.pushState;
      history.pushState = function() {
        pushState.apply(this, arguments);
        applyStyles();
      };
      var replaceState = history.replaceState;
      history.replaceState = function() {
        replaceState.apply(this, arguments);
        applyStyles();
      };
      window.addEventListener('popstate', applyStyles);

      // Instagram re-renders aggressively; keep styles current as the DOM changes.
      function startObserver() {
        new MutationObserver(applyStyles).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        applyStyles();
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
      } else {
        startObserver();
      }
    })();
    true;
  `;
}
