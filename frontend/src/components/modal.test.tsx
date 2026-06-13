import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./modal";

describe("Modal", () => {
  it("should not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("should render with title", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("should have correct ARIA attributes", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
  });

  it("should call onClose when ESC key is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );

    // Click the backdrop (the div with bg-slate-900/40)
    const backdrop = document.querySelector(".bg-slate-900\\/40");
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      await user.click(backdrop);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    const closeButton = screen.getByLabelText("关闭");
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should lock body scroll when open", () => {
    const { rerender } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    // Initially, body overflow should not be hidden
    const initialOverflow = document.body.style.overflow;

    // Open modal
    rerender(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe("hidden");

    // Close modal
    rerender(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    // Body overflow should be restored
    expect(document.body.style.overflow).toBe(initialOverflow);
  });

  it("should apply correct size classes", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <p>Modal content</p>
      </Modal>
    );

    let modalContent = document.querySelector(".max-w-md");
    expect(modalContent).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="md">
        <p>Modal content</p>
      </Modal>
    );

    modalContent = document.querySelector(".max-w-2xl");
    expect(modalContent).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <p>Modal content</p>
      </Modal>
    );

    modalContent = document.querySelector(".max-w-4xl");
    expect(modalContent).toBeInTheDocument();
  });

  it("should focus modal when opened", async () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      const modalContent = dialog.querySelector("[tabindex='-1']");
      expect(modalContent).toEqual(document.activeElement);
    });
  });

  it("should restore focus to previous element when closed", async () => {
    const triggerButton = document.createElement("button");
    triggerButton.textContent = "Open Modal";
    document.body.appendChild(triggerButton);
    triggerButton.focus();

    const { rerender } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    expect(document.activeElement).toBe(triggerButton);

    // Open modal
    rerender(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(document.activeElement).not.toBe(triggerButton);
    });

    // Close modal
    rerender(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerButton);
    });

    document.body.removeChild(triggerButton);
  });

  it("should have correct size variants", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <p>Small modal</p>
      </Modal>
    );

    expect(document.querySelector(".max-w-md")).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <p>Large modal</p>
      </Modal>
    );

    expect(document.querySelector(".max-w-4xl")).toBeInTheDocument();
  });
});
