# Repository guardrails

- Never push to `trunk` in `LDMX-Software/ldmx-sw` (normally `upstream/trunk`).
  This applies regardless of remote name, direct URL, refspec, or tool.
- If the user explicitly asks for such a push, stop and ask whether they are
  sure. After receiving an explicit confirmation, ask a second, separate time
  whether they are sure. Both questions must name `LDMX-Software/ldmx-sw` and
  its `trunk` branch.
- Only proceed after two explicit confirmations for that specific push. The
  original request, prior confirmations for other pushes, silence, or a general
  instruction to proceed do not count. Never bypass this requirement with a
  different remote, tool, or API.
- Normal pushes belong on the user's fork, `EinarElen/ldmx-sw` (`origin`).
