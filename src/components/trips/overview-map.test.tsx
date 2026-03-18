import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { OverviewMap } from "@/components/trips/overview-map";
import type { PlaceStop } from "@/types/travel";

const resizeSpy = vi.fn();
const observeSpy = vi.fn();
const disconnectSpy = vi.fn();

let resizeObserverCallback: ResizeObserverCallback | null = null;

vi.mock("maplibre-gl", () => {
  class MockMap {
    on(event: string, handler: () => void) {
      if (event === "load") {
        queueMicrotask(handler);
      }
    }

    addControl() {}
    addSource() {}
    addLayer() {}
    getCanvas() {
      return { style: {} };
    }
    fitBounds() {}
    resize() {
      resizeSpy();
    }
    remove() {}
  }

  class MockNavigationControl {
    constructor(_options?: unknown) {}
  }

  class MockPopup {
    setLngLat() {
      return this;
    }

    setHTML() {
      return this;
    }

    addTo() {
      return this;
    }

    remove() {}
  }

  class MockLngLatBounds {
    extend() {}
  }

  return {
    default: {
      Map: MockMap,
      NavigationControl: MockNavigationControl,
      Popup: MockPopup,
      LngLatBounds: MockLngLatBounds
    }
  };
});

const stops: PlaceStop[] = [
  {
    id: "stop-1",
    name: "Miami International Airport",
    lat: 25.7959,
    lng: -80.287,
    orderIndex: 0,
    sourceType: "place",
    originalUrl: "https://maps.google.com"
  },
  {
    id: "stop-2",
    name: "Cortadito Coffee House | Brickell",
    lat: 25.7651,
    lng: -80.1937,
    orderIndex: 1,
    sourceType: "place",
    originalUrl: "https://maps.google.com"
  }
];

describe("OverviewMap", () => {
  beforeEach(() => {
    resizeSpy.mockClear();
    observeSpy.mockClear();
    disconnectSpy.mockClear();
    resizeObserverCallback = null;

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }

      observe(target: Element) {
        observeSpy(target);
      }

      disconnect() {
        disconnectSpy();
      }
    }

    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("resizes the map when the container size changes", async () => {
    render(<OverviewMap center={[-80.243, 25.781]} stops={stops} />);

    await waitFor(() => {
      expect(observeSpy).toHaveBeenCalledTimes(1);
    });

    expect(resizeObserverCallback).not.toBeNull();

    resizeObserverCallback?.([] as ResizeObserverEntry[], {} as ResizeObserver);

    expect(resizeSpy).toHaveBeenCalled();
  });

  test("disconnects the resize observer on unmount", async () => {
    const { unmount } = render(<OverviewMap center={[-80.243, 25.781]} stops={stops} />);

    await waitFor(() => {
      expect(observeSpy).toHaveBeenCalledTimes(1);
    });

    unmount();

    await waitFor(() => {
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
