"use client";

import { useSyncExternalStore } from "react";
import { PaperAirplaneIcon } from "./icons/PaperAirplaneIcon";

const iconClass =
  "eink-interactive inline-flex size-9 shrink-0 items-center justify-center rounded leading-none transition-colors focus-visible:outline-2 motion-reduce:transition-none";
const subscribe = () => () => undefined;
const getShareSupport = () => typeof navigator.share === "function";
const getServerShareSupport = () => false;

const sharePage = async () => {
  if (!getShareSupport()) return;

  try {
    await navigator.share({
      title: document.title,
      url: window.location.href,
    });
  } catch {
    // Sharing can be unavailable or dismissed after capability detection.
  }
};

export function ShareButton() {
  const canShare = useSyncExternalStore(
    subscribe,
    getShareSupport,
    getServerShareSupport,
  );

  if (!canShare) return null;

  return (
    <button
      aria-label="Share page"
      className={iconClass}
      onClick={() => void sharePage()}
      title="Share page"
    >
      <PaperAirplaneIcon className="size-6 shrink-0" />
    </button>
  );
}
