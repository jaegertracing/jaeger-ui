# Design Token Migration Instructions

Here is a comprehensive set of instructions designed to guide the AI in migrating hardcoded colors to your existing (or new) design tokens.

***

## 📚 Design Token Migration Instructions

### 🎯 Core Objective

The primary goal is to replace hardcoded hexadecimal (`#fff`), RGB/A, and HSL color values with the most **semantically appropriate** CSS variable (design token) from the existing theme. **Tokenization must be based on the intended function of the style property, not just the numerical color value.**

### I. Prioritize Semantic Intent over Color Value

The AI must analyze the **CSS property** being set before choosing a token.

| CSS Property | Semantic Category/Token Prefix to Prioritize | Example Tokens |
| :--- | :--- | :--- |
| `background-color`, `background` | **Surface** | `--surface-primary`, `--surface-secondary`, `--surface-component-*` |
| `color` | **Text** | `--text-primary`, `--text-muted`, `--text-link` |
| `border-color`, `border` | **Border** | `--border-default`, `--border-strong` |
| Elements with `:hover`, `:active`, `:focus` states, or interactive controls (e.g., scrollbars, buttons) | **Interactive** | `--interactive-primary`, `--interactive-secondary`, `--control-subtle-*` |
| `box-shadow` | **Shadow** | `--shadow-sm`, `--shadow-md`, `--shadow-component-*` |
| Alerts, status indicators | **Feedback** | `--feedback-error`, `--feedback-success` |

> 🛑 **CRITICAL RULE:** Never map a `background` property to a `--border-*` or `--text-*` token. Never map a `color` property (text) to a `--surface-*` token.

***

### II. Migration Strategy: Token Selection & Creation

Follow these steps in order when migrating a hardcoded color value:

#### Step 1: Check for Direct Semantic Match

1.  **Identify the CSS property** (e.g., `background`).
2.  **Determine the primary semantic category** (e.g., **Surface**).
3.  **Check if an existing token** within that category matches **both** the color value *and* the visual context.
    * *Example:* If `background: #ffffff;` is on a main container, use `--surface-primary`.

#### Step 2: Create a New Semantic Token (If No Match Exists)

If the hardcoded color does not match an existing token within the correct category (e.g., `background: #ccc;` does not match any existing `--surface-*` token), a new token **must be defined and proposed**.

1.  **Define the new token** using the correct category prefix and a descriptive suffix that explains its use (e.g., the component or visual role).
    * *Goal:* Maintain the hardcoded color value in the new token definition to preserve the original design.
    * *Example:* If migrating `background: #ccc;` for a special component, propose:
        `--surface-component-special: #cccccc;`

2.  **Apply the new token** to the style:
    `+ background: var(--surface-component-special);`

#### Step 3: Handle Complex/Unique Values

For unique or highly specific values (like the Minimap Shadow: `box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.3);`):

1.  **Analyze the structure** (offset, blur, color) against existing tokens in the correct category (`--shadow-*`).
2.  If the structure or intensity differs significantly from existing size variants (`sm`, `md`, `lg`), a **specific utility token** must be created.
    * *Example:* `--shadow-component-focus: 0px 0px 5px rgba(0, 0, 0, 0.3);`

***

### III. Special Cases and Contextual Mapping

#### A. Interactive States (Hover, Active, etc.)

When migrating color changes for pseudo-classes (`:hover`, `:active`), a set of related tokens is often required:

* If the default state is tokenized as `--interactive-X`, the hover state should be tokenized as `--interactive-X-hover`.
* If the color uses `rgba()` for transparency (like scrollbars), create separate tokens for each state (e.g., `--control-subtle-default`, `--control-subtle-hover`).

#### B. `rgba()` and Transparency

Tokens should be defined with the exact color value needed. If the original style uses `rgba(R, G, B, A)`, the token should also contain the full `rgba()` value, unless an existing RGB variable is available (e.g., `rgba(var(--interactive-primary-rgb), 0.5)`). **Do not map a transparent `rgba()` value to an opaque hex token.**

***

### IV. Format and Output

For every proposed change, clearly present the following information:

1.  **The Original Style and CSS Selector.**
2.  **A brief justification** for why the existing token is the correct choice, OR why a new token is necessary (citing the semantic mismatch if applicable).
3.  **The Proposed CSS changes** (`-` for original, `+` for new token).
4.  **The Proposed New Token Definition** (if applicable), showing its suggested name and value, and where it should be inserted in the theme file.