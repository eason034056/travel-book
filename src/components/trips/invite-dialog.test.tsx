import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { InviteDialog } from "@/components/trips/invite-dialog";

test("shows a copyable invite link after creating an invite", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    json: async () => ({
      message: "Invite link ready",
      inviteUrl: "https://travel.example.com/invite/token-123",
      expiresAt: "2026-03-24T12:00:00.000Z"
    })
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<InviteDialog tripId="kyoto-2026" />);

  fireEvent.change(screen.getByPlaceholderText(/co-editor@email.com/i), {
    target: {
      value: "editor@example.com"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: /Send invite/i }));

  await waitFor(() => {
    expect(screen.getByText(/https:\/\/travel\.example\.com\/invite\/token-123/i)).toBeInTheDocument();
  });

  expect(screen.getByRole("button", { name: /Copy link/i })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/trips/kyoto-2026/invite", expect.anything());
});
