# LDMX Visual Console

This is a Vite + React frontend built on top of `phoenix-event-display`.

It replaces the older Angular/Yarn demo app with a smaller LDMX-specific viewer:

- detector geometry bootstraps from `src/assets/fulldetector.gltf`
- sample Phoenix JSON files live in `src/assets/test_data`
- experiment JSON can be produced from `DQM.VisGenerator`

## Requirements

Use a recent LTS Node.js release.

Node 20 or Node 22 is recommended.

## Development

```sh
npm install
npm run dev
```

By default the dev server runs on `http://localhost:4173/`.

## Production build

```sh
npm run build
npm run preview
```

## Notes

- No Angular or Yarn setup is required.
- The viewer includes a custom React control surface instead of Phoenix's Angular UI components.
- PDF export paths from JSRoot are stubbed out during bundling because this app does not expose that workflow.
