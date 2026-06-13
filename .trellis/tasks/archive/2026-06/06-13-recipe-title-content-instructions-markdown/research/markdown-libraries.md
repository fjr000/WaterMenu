# Research: React Markdown Rendering Libraries

- **Query**: Compare React Markdown rendering libraries for recipe app frontend (react-markdown, marked, markdown-to-jsx, alternatives)
- **Scope**: External research + internal codebase analysis
- **Date**: 2026-06-13

---

## Executive Summary

**Current State**: `react-markdown@10.1.0` is already installed and in use in `inline-variant-panel.tsx`.

**Recommendation**: Continue using `react-markdown` with the existing security configuration (disallowedElements + custom components). It's already integrated, has excellent security defaults, and Tailwind styling is straightforward via the `components` prop.

---

## Current Implementation Analysis

### Files Using Markdown Rendering

| File Path | Usage |
|---|---|
| `frontend/src/components/inline-variant-panel.tsx` | Renders variant description markdown (lines 191-224) |

### Current Security Configuration

```tsx
<ReactMarkdown
  disallowedElements={["script", "iframe", "object", "embed"]}
  unwrapDisallowed={true}
  components={{
    h1: ({ children }) => <h1 className="text-base font-semibold text-red-600">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-semibold text-red-600">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold text-red-600">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
    li: ({ children }) => <li className="text-sm leading-relaxed text-slate-900">{children}</li>,
    p: ({ children }) => <p className="text-sm leading-relaxed text-slate-900">{children}</p>,
    a: ({ children, href }) => (
      <a href={href} className="text-red-500 underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  }}
>
  {variant.description}
</ReactMarkdown>
```

**Security measures already in place**:
- ✅ Blocks dangerous elements: `script`, `iframe`, `object`, `embed`
- ✅ `unwrapDisallowed={true}` strips blocked elements instead of rendering as text
- ✅ Links use `target="_blank"` with `rel="noopener noreferrer"`
- ✅ Custom component overrides prevent arbitrary HTML classes/attributes

---

## Library Comparison

### 1. react-markdown (Current Choice)

**Package**: `react-markdown@10.1.0`

**Bundle Size**:
- Minified: 113.6 KB
- Gzipped: 34.1 KB
- Dependencies: 11 direct, 46 transitive (unified/remark/rehype ecosystem)

**Pros**:
- ✅ **Security by default**: Does NOT use `dangerouslySetInnerHTML`. Renders to React elements via AST transformation.
- ✅ **Tailwind styling**: Easy via `components` prop (already implemented in codebase)
- ✅ **Element filtering**: Built-in `disallowedElements` / `allowedElements` API
- ✅ **Extensible**: Supports remark/rehype plugins if needed (GFM, tables, syntax highlighting)
- ✅ **Active maintenance**: Part of unified.js ecosystem, regularly updated
- ✅ **Already installed**: Zero migration cost

**Cons**:
- ⚠️ **Larger bundle**: 34 KB gzipped (but acceptable for feature richness)
- ⚠️ **Transitive dependencies**: 46 packages (increases dependency tree complexity)

**Setup Complexity**: **Low** (already set up and working)

**Tailwind Styling Approach**:
```tsx
// Custom component overrides (current pattern)
components={{
  p: ({ children }) => <p className="text-sm text-slate-900">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside">{children}</ul>,
  // ... etc
}}
```

**Security**: 
- ⭐ **Excellent** - No dangerouslySetInnerHTML, AST-based rendering
- ⭐ Blocks arbitrary HTML by default (must explicitly allow via `rehype-raw` plugin)
- ⭐ XSS attacks via markdown syntax are prevented by AST transformation

---

### 2. marked + dangerouslySetInnerHTML

**Package**: `marked@15.0.0`

**Bundle Size**:
- Minified: 38.9 KB
- Gzipped: 11.6 KB
- Dependencies: 0 (pure parser, no dependencies)

**Pros**:
- ✅ **Lightweight**: 11.6 KB gzipped (3x smaller than react-markdown)
- ✅ **Fast**: Direct HTML string output
- ✅ **Simple API**: `marked.parse(markdown)` → HTML string
- ✅ **Zero dependencies**: Minimal supply chain risk

**Cons**:
- ❌ **Security risk**: Requires `dangerouslySetInnerHTML` to render output
- ❌ **Manual sanitization required**: Must use DOMPurify or similar (adds 10-15 KB)
- ❌ **Tailwind styling harder**: Must use global CSS or Tailwind's @apply (loses component-level control)
- ❌ **No React integration**: Just a parser, not a React component

**Setup Complexity**: **High**

**Example Implementation**:
```tsx
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function MarkdownContent({ content }) {
  const html = DOMPurify.sanitize(marked.parse(content));
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**Tailwind Styling Approach**:
```css
/* Must use global CSS with Tailwind @apply or raw CSS */
.markdown-content p {
  @apply text-sm text-slate-900;
}
.markdown-content ul {
  @apply list-disc list-inside;
}
```

**Security**:
- ⚠️ **Requires manual sanitization** - marked outputs raw HTML
- ⚠️ Must add DOMPurify (~10 KB gzipped) to sanitize output
- ⚠️ Easy to forget sanitization step (footgun)
- **Total bundle**: 11.6 KB (marked) + 10 KB (DOMPurify) = ~21.6 KB gzipped (still smaller than react-markdown)

---

### 3. markdown-to-jsx

**Package**: `markdown-to-jsx@7.6.2`

**Bundle Size**: 
- Unable to fetch from bundlephobia (rate limited)
- Estimated: ~8-12 KB gzipped based on package scope

**Pros**:
- ✅ **Compile-time parsing**: Can be used at build time (not applicable for user-generated content)
- ✅ **React-native rendering**: Outputs React elements (no dangerouslySetInnerHTML)
- ✅ **Component overrides**: Similar API to react-markdown
- ✅ **Lighter than react-markdown**: Fewer dependencies

**Cons**:
- ⚠️ **Less extensible**: No plugin ecosystem like remark/rehype
- ⚠️ **Smaller community**: Less maintained than react-markdown (fewer GH stars, updates)
- ⚠️ **JSX syntax support**: Allows JSX in markdown (can be a security risk if not disabled)

**Setup Complexity**: **Medium**

**Example Implementation**:
```tsx
import Markdown from 'markdown-to-jsx';

<Markdown
  options={{
    disableParsingRawHTML: true, // Important for security
    overrides: {
      p: { component: 'p', props: { className: 'text-sm text-slate-900' } },
      ul: { component: 'ul', props: { className: 'list-disc list-inside' } },
    },
  }}
>
  {content}
</Markdown>
```

**Tailwind Styling Approach**: Similar to react-markdown (component overrides)

**Security**:
- ⚠️ **JSX execution risk**: By default, can execute JSX in markdown (must set `disableParsingRawHTML: true`)
- ✅ **No dangerouslySetInnerHTML**: Renders to React elements
- ⚠️ Less battle-tested than react-markdown for security

---

### 4. Other Modern Alternatives

#### Option A: micromark + custom React renderer
- **Bundle**: 26.5 KB gzipped (just the parser)
- **Complexity**: Very high (must write React renderer yourself)
- **Use case**: Only if you need extreme customization

#### Option B: remark-react (deprecated)
- ❌ **Deprecated** in favor of react-markdown
- Do not use

#### Option C: MDX (@mdx-js/react)
- **Bundle**: 50-60 KB gzipped
- **Use case**: Build-time markdown with React component imports
- ❌ **Not suitable** for runtime user-generated content

---

## Comparison Table

| Library | Bundle Size (gzipped) | Security | Tailwind Styling | Setup | Ecosystem |
|---------|----------------------|----------|------------------|-------|-----------|
| **react-markdown** ✅ | 34.1 KB | ⭐⭐⭐ Excellent | Easy (components) | Already done | Large (remark/rehype) |
| marked + DOMPurify | 21.6 KB | ⚠️ Manual sanitization | Hard (global CSS) | High | Minimal |
| markdown-to-jsx | ~8-12 KB (est.) | ⚠️ JSX risk | Medium (overrides) | Medium | Small |
| micromark + custom | 26.5 KB+ | Depends on implementation | Full control | Very high | Technical |

---

## Recommendation

### For This Project: Stick with react-markdown

**Reasons**:

1. **Already integrated**: Zero migration cost, already working in `inline-variant-panel.tsx`
2. **Security is correct**: Current implementation properly blocks dangerous elements and uses AST-based rendering
3. **Tailwind styling pattern established**: The `components` prop pattern is clean and reusable
4. **Bundle size is acceptable**: 34 KB gzipped for a recipe app is reasonable (not a performance bottleneck)
5. **Extensibility**: If you later need tables, GFM, or syntax highlighting, remark/rehype plugins are available
6. **Maintenance**: Part of unified.js ecosystem (actively maintained, security-conscious)

### When to Consider Alternatives

- **If bundle size becomes critical** (mobile-first, slow networks): Use `marked` + `DOMPurify` with strict sanitization
- **If you need extreme performance**: Pre-render markdown server-side and send HTML
- **If you need compile-time MDX**: Use `@mdx-js/react` (not applicable for user content)

---

## Security Best Practices (Already Implemented)

✅ **Current implementation is secure**:

1. ✅ `disallowedElements={["script", "iframe", "object", "embed"]}` - Blocks XSS vectors
2. ✅ `unwrapDisallowed={true}` - Strips blocked elements (don't render as text)
3. ✅ Custom component overrides - Prevents arbitrary className/style injection
4. ✅ Links use `rel="noopener noreferrer"` - Prevents tabnabbing

### Additional Hardening (Optional)

If you want to be even more restrictive:

```tsx
<ReactMarkdown
  allowedElements={['p', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a']}
  components={{
    a: ({ href, children }) => {
      // Validate href (allow only http/https)
      if (!href || !/^https?:\/\//.test(href)) {
        return <span>{children}</span>;
      }
      return (
        <a href={href} className="..." target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    // ... other components
  }}
/>
```

---

## Related Spec Files

| File Path | Description |
|---|---|
| `.trellis/spec/frontend/frontend/component-guidelines.md` | Component patterns, Tailwind styling conventions, Modal patterns |
| `.trellis/spec/frontend/frontend/type-safety.md` | Type safety guidelines (if applicable to markdown props) |

---

## Caveats / Not Found

- **markdown-to-jsx bundle size**: Unable to fetch exact size from bundlephobia (rate limited)
- **Performance benchmarks**: No runtime performance comparison done (all libraries are fast enough for typical recipe content)
- **Accessibility**: react-markdown output is semantic HTML, which is accessible by default. Custom components maintain this.

---

## Migration Cost Assessment

**If switching FROM react-markdown TO alternatives**:

| Target Library | Effort | Risk | Bundle Savings |
|----------------|--------|------|----------------|
| marked + DOMPurify | High | Medium (manual sanitization) | ~12 KB gzipped |
| markdown-to-jsx | Medium | Low-Medium (JSX risk) | ~22 KB gzipped |
| micromark + custom | Very high | High (DIY rendering) | ~8 KB gzipped |

**Verdict**: Not worth the effort. Current implementation is correct and maintainable.

---

## Code Examples for Reuse

### Pattern: Reusable Markdown Component

If you need markdown rendering in multiple places, extract a shared component:

```tsx
// frontend/src/components/markdown-content.tsx
import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        disallowedElements={["script", "iframe", "object", "embed"]}
        unwrapDisallowed={true}
        components={{
          h1: ({ children }) => <h1 className="text-base font-semibold text-red-600">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold text-red-600">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-red-600">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed text-slate-900">{children}</li>,
          p: ({ children }) => <p className="text-sm leading-relaxed text-slate-900">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-red-500 underline hover:text-red-600" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Usage
<MarkdownContent content={recipe.instructions} />
```

### Pattern: Markdown Field in Forms

For textarea fields that accept markdown:

```tsx
<div>
  <label htmlFor="instructions" className="mb-1 block text-sm font-semibold text-slate-700">
    制作步骤（支持 Markdown）
  </label>
  <textarea
    id="instructions"
    placeholder="例如：&#10;1. 准备食材：...&#10;2. 烹饪步骤：..."
    rows={6}
    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
    {...register("instructions")}
  />
  <p className="mt-1 text-xs text-slate-500">
    支持 **粗体**、*斜体*、标题和列表
  </p>
</div>
```

---

## External References

- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) - Official docs, security guidelines
- [marked GitHub](https://github.com/markedjs/marked) - Lightweight parser docs
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS sanitizer (if using marked)
- [Bundlephobia](https://bundlephobia.com/) - Bundle size analysis tool
- [unified.js ecosystem](https://unifiedjs.com/) - remark/rehype plugin docs
