export type OverlayVisibilityFlags = {
  documentHidden: boolean;
  obsVisible: boolean;
  obsActive: boolean;
};

export function overlayIsVisible(flags: OverlayVisibilityFlags): boolean {
  return !flags.documentHidden && flags.obsVisible && flags.obsActive;
}

export function readObsBooleanDetail(
  detail: unknown,
  key: "visible" | "active",
): boolean | null {
  if (typeof detail === "boolean") return detail;
  if (
    detail &&
    typeof detail === "object" &&
    typeof (detail as Record<string, unknown>)[key] === "boolean"
  ) {
    return (detail as Record<string, boolean>)[key];
  }
  return null;
}

export function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

export function getInitialOverlayVisibility(): boolean {
  return overlayIsVisible({
    documentHidden: isDocumentHidden(),
    obsVisible: true,
    obsActive: true,
  });
}

export function subscribeOverlayVisibility(
  onChange: (visible: boolean) => void,
): () => void {
  const state: OverlayVisibilityFlags = {
    documentHidden: isDocumentHidden(),
    obsVisible: true,
    obsActive: true,
  };
  let last = overlayIsVisible(state);

  const emit = () => {
    const next = overlayIsVisible(state);
    if (next === last) return;
    last = next;
    onChange(next);
  };

  const onDocumentVisibility = () => {
    state.documentHidden = isDocumentHidden();
    emit();
  };

  const onObsVisible = (event: Event) => {
    const flag = readObsBooleanDetail(
      (event as CustomEvent).detail,
      "visible",
    );
    if (flag == null) return;
    state.obsVisible = flag;
    emit();
  };

  const onObsActive = (event: Event) => {
    const flag = readObsBooleanDetail(
      (event as CustomEvent).detail,
      "active",
    );
    if (flag == null) return;
    state.obsActive = flag;
    emit();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onDocumentVisibility);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("obsSourceVisibleChanged", onObsVisible);
    window.addEventListener("obsSourceActiveChanged", onObsActive);
  }

  return () => {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onDocumentVisibility);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("obsSourceVisibleChanged", onObsVisible);
      window.removeEventListener("obsSourceActiveChanged", onObsActive);
    }
  };
}
