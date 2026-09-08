import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RemoteControlLink } from "@/components/RemoteControlLink";
import type { LeadsunLampStatus, LeadsunProduct, LeadsunProject } from "@/lib/types";

const product: LeadsunProduct = {
  ProductId: 12548,
  ProductName: "12081-1102",
  ControllerCode: "UPP40LA323110001",
  ProvidedProductId: "AEXSAP4323111877",
  PoleNumber: "AEXSAP4323111877-A",
};

const leadsunProject: LeadsunProject = {
  ProjectId: "482",
  ProjectName: "Chaparral",
  totalGateways: 2,
  totalPoles: 5,
  groups: [
    {
      GroupId: 1149,
      GroupName: "Chaparral Ph3",
      GatewayCode: "GT18L94A25082883",
      totalPoles: 3,
      products: [
        {
          ProductId: 1,
          ProductName: "12009-1001",
          ControllerCode: "CTRL-1",
          ProvidedProductId: "PROV-1",
          PoleNumber: "PROV-1-A",
        },
        {
          ProductId: 2,
          ProductName: "12009-1002",
          ControllerCode: "CTRL-2",
          ProvidedProductId: "PROV-2",
          PoleNumber: "PROV-2-A",
        },
      ],
    },
    {
      GroupId: 1150,
      GroupName: "Chaparral Ph4",
      GatewayCode: "GT18L94A25082884",
      totalPoles: 2,
      products: [
        {
          ProductId: 3,
          ProductName: "12009-2001",
          ControllerCode: "CTRL-3",
          ProvidedProductId: "PROV-3",
          PoleNumber: "PROV-3-A",
        },
      ],
    },
  ],
};

function makeLamp(overrides: Partial<LeadsunLampStatus> = {}): LeadsunLampStatus {
  return {
    productId: "1",
    productName: "12009-1001",
    lampPower1: 0,
    lampPower2: 0,
    isOnline: true,
    lastUpload: "2026-09-03T14:39:41.520+00:00",
    ...overrides,
  };
}

function mockFetchOnce(lamps: LeadsunLampStatus[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(lamps),
    }),
  );
}

function mockFetchFailure() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));
}

describe("RemoteControlLink", () => {
  beforeEach(() => {
    mockFetchOnce([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a 'Remote Control' trigger, with no modal open yet", () => {
    render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
    expect(screen.getByRole("button", { name: "Remote Control" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses the accent color (not accent-ink) for the default trigger styling", () => {
    render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
    const trigger = screen.getByRole("button", { name: "Remote Control" });
    expect(trigger.className).toContain("text-[var(--accent)]");
    expect(trigger.className).not.toContain("--accent-ink");
  });

  it("looks like a button (bordered/padded) and explicitly shows a pointer cursor on hover — Tailwind's preflight otherwise resets <button> to cursor: default", () => {
    render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
    const trigger = screen.getByRole("button", { name: "Remote Control" });
    expect(trigger.className).toContain("cursor-pointer");
    expect(trigger.className).toContain("border");
    expect(trigger.className).toContain("rounded-md");
  });

  it("closes the modal via the Close button", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal when clicking the backdrop", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));

    const backdrop = screen.getByRole("dialog").parentElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close the modal when clicking inside the dialog panel itself", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));

    await user.click(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("accepts a custom className for the trigger", () => {
    render(
      <RemoteControlLink
        leadsunProject={leadsunProject}
        product={product}
        className="custom-trigger-class"
      />,
    );
    expect(screen.getByRole("button", { name: "Remote Control" }).className).toBe(
      "custom-trigger-class",
    );
  });

  describe("live status fetch", () => {
    it("fetches from /api/leadsunlampstatus with projectId and productId, in pole mode", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(fetch).toHaveBeenCalledWith(
        "/api/leadsunlampstatus?projectId=482&productId=AEXSAP4323111877",
        { cache: "no-store" },
      );
    });

    it("fetches from /api/leadsunlampstatus with just projectId, in project mode (no productId)", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(fetch).toHaveBeenCalledWith("/api/leadsunlampstatus?projectId=482", {
        cache: "no-store",
      });
    });

    it("shows a loading indicator before the fetch resolves", async () => {
      let resolveFetch: (value: unknown) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
        ),
      );
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(screen.getByText("…")).toBeInTheDocument();
      resolveFetch({ ok: true, json: () => Promise.resolve([]) });
      await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
    });

    it("shows ON (with the lit-bulb color/glow) when lampPower1+lampPower2 > 0", async () => {
      mockFetchOnce([makeLamp({ productId: "AEXSAP4323111877", lampPower1: 45, lampPower2: 0 })]);
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const onLabel = await screen.findByText("ON");
      expect(onLabel.className).toContain("bg-[#fef3c7]");
      const dot = onLabel.firstElementChild as HTMLElement;
      expect(dot.className).toContain("bg-[#f59e0b]");
      expect(dot.className).toContain("shadow-");
    });

    it("shows OFF when lampPower1+lampPower2 === 0", async () => {
      mockFetchOnce([makeLamp({ productId: "AEXSAP4323111877", lampPower1: 0, lampPower2: 0 })]);
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(await screen.findByText("OFF")).toBeInTheDocument();
      expect(screen.queryByText("ON")).not.toBeInTheDocument();
    });

    it("shows ON when only one of the two lamp channels is drawing power", async () => {
      mockFetchOnce([makeLamp({ productId: "AEXSAP4323111877", lampPower1: 0, lampPower2: 12 })]);
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(await screen.findByText("ON")).toBeInTheDocument();
    });

    it("shows an unknown ('—') indicator when the fetch succeeds but has no entry for this product", async () => {
      mockFetchOnce([]);
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
    });

    it("shows an error note (including the failure reason) and unknown indicators when the fetch fails", async () => {
      mockFetchFailure();
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(
        await screen.findByText(/Couldn.t load live ON\/OFF status\./),
      ).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("surfaces the server's own 'detail' message in the error note, when the route provides one", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              error: "Couldn't load live lamp status. Please try again.",
              detail: "LEADSUN_CLIENT_CERT_PEM is not configured",
            }),
        }),
      );
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(
        await screen.findByText(/LEADSUN_CLIENT_CERT_PEM is not configured/),
      ).toBeInTheDocument();
    });

    it("falls back to a status-code message when the failed response has no JSON body at all", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error("not json")),
        }),
      );
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(await screen.findByText(/request failed \(500\)/)).toBeInTheDocument();
    });

    it("re-fetches with fresh status each time the modal is reopened", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Close" }));
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Control Action form (Brightness/Time/GO!)", () => {
    it("defaults Brightness to 50 and Time to 30", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Control" }));

      expect(screen.getByText("Brightness (50)")).toBeInTheDocument();
      const timeInput = screen.getByLabelText(/Time/) as HTMLInputElement;
      expect(timeInput.value).toBe("30");
    });

    it("shows GO! as the button label by default", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Control" }));

      expect(screen.getByRole("button", { name: "GO!" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "TURN OFF" })).not.toBeInTheDocument();
    });

    it("changes the button label to TURN OFF when Brightness is set to 0", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Control" }));

      const brightnessInput = screen.getByLabelText(/Brightness/) as HTMLInputElement;
      fireEvent.change(brightnessInput, { target: { value: "0" } });

      expect(screen.getByRole("button", { name: "TURN OFF" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "GO!" })).not.toBeInTheDocument();
    });

    it("switches back to GO! once Brightness is raised above 0 again", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Control" }));

      const brightnessInput = screen.getByLabelText(/Brightness/) as HTMLInputElement;
      fireEvent.change(brightnessInput, { target: { value: "0" } });
      expect(screen.getByRole("button", { name: "TURN OFF" })).toBeInTheDocument();

      fireEvent.change(brightnessInput, { target: { value: "75" } });
      expect(screen.getByRole("button", { name: "GO!" })).toBeInTheDocument();
    });

    it("has independent form state per Control Action instance", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      const [firstPoleControl, secondPoleControl] = screen.getAllByRole("button", {
        name: "Control",
      });

      await user.click(firstPoleControl);
      const firstBrightness = screen.getByLabelText(/Brightness/) as HTMLInputElement;
      fireEvent.change(firstBrightness, { target: { value: "0" } });
      expect(screen.getByRole("button", { name: "TURN OFF" })).toBeInTheDocument();

      // Close just the first pole's Control Action modal (scoped by its own
      // dialog, since both it and the outer Remote Control modal have a
      // Close button while both are open), then open the second — its own
      // Brightness should still be at the default, unaffected by the first.
      const firstControlDialog = screen
        .getByRole("heading", { name: "Light Remote Control" })
        .closest('[role="dialog"]') as HTMLElement;
      await user.click(within(firstControlDialog).getByRole("button", { name: "Close" }));
      await user.click(secondPoleControl);
      expect(screen.getByRole("button", { name: "GO!" })).toBeInTheDocument();
    });
  });

  describe("pole mode (product given)", () => {
    it("shows the product's ProductName and ProvidedProductId, and nothing else", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("12081-1102")).toBeInTheDocument();
      expect(within(dialog).getByText("AEXSAP4323111877")).toBeInTheDocument();
      expect(within(dialog).queryByText(/Gateway/)).not.toBeInTheDocument();
      expect(within(dialog).queryByText("Chaparral")).not.toBeInTheDocument();
    });

    it("uses a narrow modal width", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      expect(screen.getByRole("dialog").className).toContain("max-w-[420px]");
    });

    it("shows the indicator right alongside the ProductName heading", async () => {
      mockFetchOnce([makeLamp({ productId: "AEXSAP4323111877", lampPower1: 10, lampPower2: 0 })]);
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const heading = screen.getByRole("heading", { name: "12081-1102" });
      const onLabel = await screen.findByText("ON");
      expect(heading.parentElement).toContainElement(onLabel);
    });

    it("shows a 'Control' stub link inline right after the dot/ON-OFF indicator, not below it", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const controlButton = screen.getByRole("button", { name: "Control" });
      expect(controlButton).toBeInTheDocument();
      // Sibling of the indicator, in the same wrapper — not a separate row underneath.
      const indicator = await waitFor(() => screen.getByText("—"));
      expect(indicator.parentElement).toBe(controlButton.parentElement);
    });

    it("opens a 'Light Remote Control' modal with a Brightness/Time form when the 'Control' link is clicked, on top of the Remote Control modal", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Control" }));

      const dialogs = screen.getAllByRole("dialog");
      expect(dialogs).toHaveLength(2);
      expect(screen.getByRole("heading", { name: "Light Remote Control" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "GO!" })).toBeInTheDocument();
    });

    it("closing the 'Control Action' modal leaves the Remote Control modal open", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} product={product} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Control" }));

      const controlActionDialog = screen.getByRole("heading", { name: "Light Remote Control" })
        .closest('[role="dialog"]') as HTMLElement;
      await user.click(within(controlActionDialog).getByRole("button", { name: "Close" }));

      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(screen.getByRole("heading", { name: product.ProductName })).toBeInTheDocument();
    });
  });

  describe("project mode (no product given)", () => {
    it("shows the header: ProjectName, total gateways, and total lights", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Chaparral")).toBeInTheDocument();
      expect(within(dialog).getByText(/2 Gateways/)).toBeInTheDocument();
      expect(within(dialog).getByText(/5 Lights/)).toBeInTheDocument();
    });

    it("shows a card per gateway (group) with its name, code, and light count", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Chaparral Ph3")).toBeInTheDocument();
      expect(within(dialog).getByText("GT18L94A25082883")).toBeInTheDocument();
      expect(within(dialog).getByText("3 Lights")).toBeInTheDocument();
      expect(within(dialog).getByText("Chaparral Ph4")).toBeInTheDocument();
      expect(within(dialog).getByText("GT18L94A25082884")).toBeInTheDocument();
      expect(within(dialog).getByText("2 Lights")).toBeInTheDocument();
    });

    it("lists each gateway's own poles with ProductName and ProvidedProductId", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const dialog = screen.getByRole("dialog");
      // Chaparral Ph3's poles.
      expect(within(dialog).getByText("12009-1001")).toBeInTheDocument();
      expect(within(dialog).getByText("PROV-1")).toBeInTheDocument();
      expect(within(dialog).getByText("12009-1002")).toBeInTheDocument();
      expect(within(dialog).getByText("PROV-2")).toBeInTheDocument();
      // Chaparral Ph4's pole.
      expect(within(dialog).getByText("12009-2001")).toBeInTheDocument();
      expect(within(dialog).getByText("PROV-3")).toBeInTheDocument();
    });

    it("keeps each gateway's poles within that gateway's own card, not mixed together", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const ph3Card = screen.getByText("Chaparral Ph3").closest("div") as HTMLElement;
      expect(within(ph3Card).getByText("12009-1001")).toBeInTheDocument();
      expect(within(ph3Card).getByText("12009-1002")).toBeInTheDocument();
      expect(within(ph3Card).queryByText("12009-2001")).not.toBeInTheDocument();
    });

    it("lays out gateway cards in a 4-column grid, so a 5th card wraps to a new row", async () => {
      const fiveGatewayProject: LeadsunProject = {
        ...leadsunProject,
        totalGateways: 5,
        groups: [
          ...leadsunProject.groups,
          { GroupId: 1151, GroupName: "Gateway 3", GatewayCode: "GW3", totalPoles: 0, products: [] },
          { GroupId: 1152, GroupName: "Gateway 4", GatewayCode: "GW4", totalPoles: 0, products: [] },
          { GroupId: 1153, GroupName: "Gateway 5", GatewayCode: "GW5", totalPoles: 0, products: [] },
        ],
      };
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={fiveGatewayProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const grid = screen.getByText("Chaparral Ph3").closest("div")?.parentElement;
      expect(grid?.className).toContain("grid-cols-4");
      expect(grid?.children).toHaveLength(5);
    });

    it("uses a wide, scrollable modal to fit the gateway grid", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const dialog = screen.getByRole("dialog");
      expect(dialog.className).toContain("max-w-4xl");
      expect(dialog.className).toContain("overflow-y-auto");
    });

    it("uses singular 'Gateway'/'Light' wording for a count of exactly 1", async () => {
      const oneOfEachProject: LeadsunProject = {
        ProjectId: "1",
        ProjectName: "Solo Project",
        totalGateways: 1,
        totalPoles: 1,
        groups: [
          {
            GroupId: 1,
            GroupName: "Only Gateway",
            GatewayCode: "GW1",
            totalPoles: 1,
            products: [product],
          },
        ],
      };
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={oneOfEachProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("1 Gateway · 1 Light")).toBeInTheDocument();
    });

    it("shows each pole's own indicator, matched by ProvidedProductId, independently of the others", async () => {
      mockFetchOnce([
        makeLamp({ productId: "PROV-1", lampPower1: 50, lampPower2: 0 }), // on
        makeLamp({ productId: "PROV-2", lampPower1: 0, lampPower2: 0 }), // off
        // PROV-3 intentionally omitted — unknown/no data.
      ]);
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      await waitFor(() => {
        expect(screen.getByText("ON")).toBeInTheDocument();
        expect(screen.getByText("OFF")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
      });
    });

    it("shows a 'Project Control' link inline right after the Gateways/Lights count, not right-aligned", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const countLine = screen.getByText(/2 Gateways/).closest("div") as HTMLElement;
      const controlButton = within(countLine).getByRole("button", { name: "Project Control" });
      expect(controlButton).toBeInTheDocument();
      // Genuinely the same inline flow, not a separate flex item pushed to
      // the far right via justify-between.
      expect(countLine.className).not.toContain("justify-between");
      expect(countLine.textContent).toMatch(/2 Gateways.*5 Lights.*Project Control/);
    });

    it("opens a 'Project Remote Control' modal listing every pole across all gateways when 'Project Control' is clicked", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      await user.click(screen.getByRole("button", { name: "Project Control" }));

      expect(screen.getAllByRole("dialog")).toHaveLength(2);
      expect(
        screen.getByRole("heading", { name: "Project Remote Control" }),
      ).toBeInTheDocument();
      expect(screen.getByText("3 poles affected")).toBeInTheDocument();
      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders.map((h) => h.textContent)).toEqual(["Gateway Name", "Pole Number"]);
      // All 3 poles, across both gateways, each with the right gateway name
      // — plus the underlying Remote Control modal's own gateway card
      // titles, which stay in the DOM (just visually layered behind).
      expect(screen.getAllByText("Chaparral Ph3")).toHaveLength(3);
      expect(screen.getAllByText("Chaparral Ph4")).toHaveLength(2);
      expect(screen.getByText("PROV-1-A")).toBeInTheDocument();
      expect(screen.getByText("PROV-2-A")).toBeInTheDocument();
      expect(screen.getByText("PROV-3-A")).toBeInTheDocument();
    });

    it("shows a 'Gateway Control' link inline right after each gateway's own light count, not right-aligned", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const ph3Card = screen.getByText("Chaparral Ph3").closest("div") as HTMLElement;
      const ph4Card = screen.getByText("Chaparral Ph4").closest("div") as HTMLElement;
      expect(within(ph3Card).getByRole("button", { name: "Gateway Control" })).toBeInTheDocument();
      expect(within(ph4Card).getByRole("button", { name: "Gateway Control" })).toBeInTheDocument();

      const ph3CountLine = screen.getByText("3 Lights").closest("div") as HTMLElement;
      expect(within(ph3CountLine).getByRole("button", { name: "Gateway Control" })).toBeInTheDocument();
      expect(ph3CountLine.className).not.toContain("justify-between");
      expect(ph3CountLine.textContent).toBe("3 LightsGateway Control");
    });

    it("opens a 'Gateway Remote Control' modal listing just that gateway's own poles when a 'Gateway Control' link is clicked", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      const [firstGatewayControl] = screen.getAllByRole("button", { name: "Gateway Control" });
      await user.click(firstGatewayControl);

      expect(screen.getAllByRole("dialog")).toHaveLength(2);
      expect(
        screen.getByRole("heading", { name: "Gateway Remote Control" }),
      ).toBeInTheDocument();
      // Ph3 (the first gateway) has 2 poles — not Ph4's 1 pole.
      expect(screen.getByText("2 poles affected")).toBeInTheDocument();
      expect(screen.getByText("PROV-1-A")).toBeInTheDocument();
      expect(screen.getByText("PROV-2-A")).toBeInTheDocument();
      expect(screen.queryByText("PROV-3-A")).not.toBeInTheDocument();
    });

    it("shows a 'Control' link inline right after the dot/ON-OFF indicator on each pole row, not below it", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));

      const controlButtons = screen.getAllByRole("button", { name: "Control" });
      expect(controlButtons).toHaveLength(3);
      // Each is a sibling of its own row's indicator, in the same wrapper.
      const firstIndicator = await waitFor(() => screen.getAllByText("—")[0]);
      expect(firstIndicator.parentElement).toBe(controlButtons[0].parentElement);
    });

    it("opens a 'Light Remote Control' modal listing just that one pole, per pole row", async () => {
      const user = userEvent.setup();
      render(<RemoteControlLink leadsunProject={leadsunProject} />);
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      const [firstPoleControl] = screen.getAllByRole("button", { name: "Control" });
      await user.click(firstPoleControl);

      expect(screen.getAllByRole("dialog")).toHaveLength(2);
      expect(screen.getByRole("heading", { name: "Light Remote Control" })).toBeInTheDocument();
      expect(screen.getByText("1 pole affected")).toBeInTheDocument();
      expect(screen.getByText("PROV-1-A")).toBeInTheDocument();
      expect(screen.queryByText("PROV-2-A")).not.toBeInTheDocument();
    });
  });
});
