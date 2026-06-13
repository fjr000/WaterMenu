/**
 * Modal Component Usage Examples
 *
 * This file demonstrates how to use the Modal component.
 * Import and use in your components as shown below.
 */

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./ui";

/**
 * Basic Modal Example
 */
export function BasicModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开 Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="基础 Modal"
      >
        <p>这是 Modal 的内容。</p>
        <p className="mt-2">
          点击遮罩层、按 ESC 键或点击右上角关闭按钮都可以关闭 Modal。
        </p>
      </Modal>
    </>
  );
}

/**
 * Modal with Form Example
 */
export function FormModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开表单 Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="填写表单"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              名称
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-5 py-3 text-sm font-semibold text-slate-700"
            >
              取消
            </button>
            <Button type="submit">提交</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * Small Size Modal Example
 */
export function SmallModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开小尺寸 Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="确认操作"
        size="sm"
      >
        <p className="text-sm text-slate-600">
          确定要执行此操作吗？此操作不可撤销。
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-semibold text-slate-700"
          >
            取消
          </button>
          <Button onClick={() => setIsOpen(false)}>确定</Button>
        </div>
      </Modal>
    </>
  );
}

/**
 * Large Size Modal with Scrollable Content
 */
export function LargeModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开大尺寸 Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="详细信息"
        size="lg"
      >
        <div className="space-y-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <p key={i} className="text-sm text-slate-600">
              这是第 {i + 1} 段内容。当内容超出视口高度时，Modal 内部会出现滚动条。
              背景页面的滚动会被锁定，防止滚动穿透。
            </p>
          ))}
        </div>
      </Modal>
    </>
  );
}
