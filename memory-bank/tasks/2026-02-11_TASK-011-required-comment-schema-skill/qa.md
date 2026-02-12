# QA

## Verification
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass

## Notes
- Required-comment behavior enforced at UI navigation level (`Next/Complete` buttons).
- Legacy questionnaires without `requires_comment` are normalized with default `false`.
