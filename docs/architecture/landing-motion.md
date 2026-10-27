# Landing interaction and motion

The landing uses the installed `framer-motion` package and shadcn/Radix tabs.
No copied Aceternity source or additional animation dependency is required.

## Research (2026-10-27)

Available cloud/executor skills were checked: only runtime and onboarding were
available, no UI/motion skill. The `ui.aceternity.com` and `motion.dev` sites
returned proxy HTTP 403. GitHub was accessible; research used these sources:

- [Aceternity author's public example](https://github.com/manuarora700/ui.aceternity/blob/main/src/uiAceternity/Tooltip.tsx)
  demonstrates motion values, transforms, spring-followed pointer values and
  keyed presence. It is a limited example, not the current component registry.
- [Motion README](https://github.com/motiondivision/motion/blob/main/packages/framer-motion/README.md)
  explains the Framer Motion → Motion name and `motion/react` entry point.
  Existing compatible `framer-motion` imports are retained in this app.
- [Spring API](https://github.com/motiondivision/motion/blob/main/packages/framer-motion/src/value/use-spring.ts)
  documents spring-backed motion values.
- [Presence API](https://github.com/motiondivision/motion/blob/main/packages/framer-motion/src/components/AnimatePresence/index.tsx)
  documents keyed children, exit and mount/removal sequencing.
- [Reduced motion API](https://github.com/motiondivision/motion/blob/main/packages/framer-motion/src/utils/reduced-motion/use-reduced-motion.ts)
  describes replacing or disabling spatial motion.

## Behaviour

- Hero: bounded ±3.5° spring tilt and pointer light for a mouse, static on touch.
  Ambient motion runs only while visible. The pause control stops ambient motion
  and pointer response. Reduced motion disables these effects and omits the toggle.
- Content: once-only viewport arrivals. Reading columns do not lift on hover.
  Collection cards lift on hover and compress on press, with equivalent focus
  and border feedback for keyboard users.
- Agent: Radix retains tab keyboard behaviour. A shared layout indicator follows
  selection. One persistent presence boundary sequences keyed examples, with
  immediate changes under reduced motion. Examples remain editorial.
- Pointer coordinates use motion values, avoiding React renders per frame.
  No scroll hijacking, autoplay conversation or movement gates access to content.

Browser checks cover pause, static reduced-motion state, tab/keyboard activation,
real search links and layouts from 320px to 2560px.

## Aceternity registry and Codex MCP

`apps/web/components.json` registers `@aceternity` at
`https://ui.aceternity.com/registry/{name}.json`. The shadcn CLI is installed as
a web development dependency. `shadcn mcp init --client codex` was run; it
installs the CLI and prints Codex configuration instructions rather than
creating a project configuration automatically.

The project-local `.codex/config.toml` starts the installed CLI with Node and
sets `--cwd apps/web`, so registry discovery uses the web project's configuration
when Codex is opened from the repository root. Start a new Codex session and
trust the project configuration to expose the server's tools to the assistant.
No global Codex configuration was overwritten.

The local stdio MCP handshake, tool discovery and `get_project_registries`
were verified. Both `@shadcn` and `@aceternity` were returned. A real
`search_items_in_registries` call for spotlight returned a cancelled request to
`https://ui.aceternity.com/registry/registry.json?q=spotlight&limit=5`.
An actual `view_items_in_registries` call for `@aceternity/spotlight` and
`@aceternity/3d-card` also failed at `registry/spotlight.json` with a cancelled
request. Direct HTTP access to the domain returned proxy 403.
MCP runs locally and still fetches registry content over the network; it does
not itself grant access to a blocked registry domain. No Aceternity component
has been claimed as downloaded or installed.
