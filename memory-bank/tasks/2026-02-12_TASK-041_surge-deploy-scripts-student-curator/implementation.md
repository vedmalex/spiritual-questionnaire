# Implementation Notes

## package.json scripts
- Updated `package.json` scripts section:
  - `deploy:student:surge`:
    - `npm run build:student && npx surge ./dist/student/client student_qwiz_2nd.surge.sh`
  - `deploy:curator:surge`:
    - `npm run build:curator && npx surge ./dist/curator/client curator_qwiz_2nd.surge.sh`
  - `deploy:surge`:
    - sequential run of both scripts above.

## Why this shape
- Explicit profile-first deploy:
  - each deploy script guarantees fresh build of its profile before publishing.
- Output directories point to static client bundles:
  - `dist/student/client`
  - `dist/curator/client`
- Uses `npx surge` to avoid mandatory global installation.
