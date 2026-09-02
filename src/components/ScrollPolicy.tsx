"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";
import {
  SCROLL_ENTRY_STATE,
  SCROLL_POSITIONS_WINDOW,
  SCROLL_TRAVERSE_ATTR,
} from "~/lib/scroll";

declare global {
  interface Window {
    __superHnScrollPositions?: Map<string, number>;
  }
}

const PAGEHIDE_EVENT = "pagehide";
const PAGESHOW_EVENT = "pageshow";
const SCROLL_EVENT = "scroll";
const MANUAL_SCROLL = "manual";
const TOP_HASH = "top";
const TOP = 0;

const getEntryKey = () => {
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null) return null;

  const entry: unknown = Reflect.get(state, SCROLL_ENTRY_STATE);
  return typeof entry === "string" ? entry : null;
};

const getPositions = () =>
  (window[SCROLL_POSITIONS_WINDOW] ??= new Map<string, number>());

const getHashTarget = () => {
  const fragment = window.location.hash.slice(1);
  if (fragment.length === 0) return null;

  let hash = fragment;
  try {
    hash = decodeURIComponent(fragment);
  } catch {
    // Keep malformed fragments inert instead of breaking navigation.
  }

  if (hash === TOP_HASH) return document.body;

  const selector = CSS.escape(hash);
  return document.querySelector<HTMLElement>(
    `#${selector}, [name="${selector}"]`,
  );
};

const setEntryScroll = () => {
  if (window.location.hash.length > 0) {
    const target = getHashTarget();
    if (target === null || target === undefined) return false;

    target.scrollIntoView();
    return true;
  }

  window.scrollTo(TOP, TOP);
  return true;
};

const useEntryScroll = () => {
  const hashObserver = useRef<MutationObserver | null>(null);

  const applyScroll = useCallback(() => {
    hashObserver.current?.disconnect();
    hashObserver.current = null;
    if (setEntryScroll()) return;

    // Streamed comments can arrive after the browser first resolves the hash.
    const observer = new MutationObserver(() => {
      if (!setEntryScroll()) return;

      observer.disconnect();
      hashObserver.current = null;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    hashObserver.current = observer;
  }, []);

  useLayoutEffect(
    () => () => {
      hashObserver.current?.disconnect();
    },
    [],
  );

  return applyScroll;
};

const useDocEntry = (applyScroll: () => void) => {
  useLayoutEffect(() => {
    let scrollFrame: number | null = null;

    const stopDocumentRestore = () => {
      window.history.scrollRestoration = MANUAL_SCROLL;
    };

    const resetShownPage = () => {
      // Wait until the browser and Next.js finish entering the document.
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = window.requestAnimationFrame(() => {
          applyScroll();
        });
      });
    };

    window.history.scrollRestoration = MANUAL_SCROLL;
    window.addEventListener(PAGEHIDE_EVENT, stopDocumentRestore);
    window.addEventListener(PAGESHOW_EVENT, resetShownPage);

    return () => {
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);

      window.removeEventListener(PAGEHIDE_EVENT, stopDocumentRestore);
      window.removeEventListener(PAGESHOW_EVENT, resetShownPage);
    };
  }, [applyScroll]);
};

const useScrollMemory = () => {
  useLayoutEffect(() => {
    const saveScroll = () => {
      const entry = getEntryKey();
      if (entry === null) return;

      getPositions().set(entry, window.scrollY);
    };

    window.addEventListener(SCROLL_EVENT, saveScroll, { passive: true });

    return () => {
      window.removeEventListener(SCROLL_EVENT, saveScroll);
    };
  }, []);
};

export function ScrollPolicy() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const applyScroll = useEntryScroll();
  const query = searchParams.toString();
  const routeKey = `${pathname}${query.length > 0 ? `?${query}` : ""}`;

  useDocEntry(applyScroll);
  useScrollMemory();

  useLayoutEffect(() => {
    // History entries restore from our entry map; new entries start at the top.
    const entry = getEntryKey();
    const traversed =
      entry !== null &&
      document.documentElement.getAttribute(SCROLL_TRAVERSE_ATTR) === entry;
    document.documentElement.removeAttribute(SCROLL_TRAVERSE_ATTR);
    if (traversed) {
      const scrollY = getPositions().get(entry) ?? TOP;
      window.requestAnimationFrame(() => {
        window.scrollTo(TOP, scrollY);
      });
    } else {
      applyScroll();
    }
  }, [applyScroll, routeKey]);

  return null;
}
