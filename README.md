# VOXEL CITY DRIVER 🚕

**v0.2 beta — A playable, client-side voxel driving game for GitHub Pages.**

A fictional voxel city with arcade driving, 5 camera angles, icon-based mobile controls, responsive NPC traffic, GPS-style passenger routes, airport missions, a garage, free paint customization and local saved progress.

## v0.2 beta — driving feel, wayfinding and city character (2026-10-30)

This is an incremental v0.2 preview, **not a finished visual-quality release**.
The current GitHub Pages build now includes:

- Noticeably stronger acceleration and higher maximum speed for every vehicle class.
- **One icon-only brake/reverse pedal:** press to brake, continue holding at low forward speed to reverse. W/Up accelerates; S/Down/Space controls brake/reverse.
- Live street-grid route finding to the nearest available passenger and, after pickup, to Skyport airport.
- An on-screen direction arrow, next waypoint/distance, dashed minimap route, gold road guide and glowing destination beacon.
- Toofan-inspired baked voxel pedestrians, market stalls, planters, benches and awnings; more diverse NPC traffic vehicles.
- Existing collision, camera switching, menus, garage, settings and local saves are preserved.

**Still planned:** Per-wheel suspension physics, deeper vehicle materials/animations, terrain variety, authored neighbourhood landmarks, better NPC pedestrian movement, traffic improvements and extensive device-specific tuning. Automated Chromium smoke tests ensure the game boots and menus work but do not substitute for visual/device playtesting.

---

## Play on GitHub Pages

No backend, database, API key or local server is needed for players.

1. Use the already-created public repository [`achallakiran/Gogogo`](https://github.com/achallakiran/Gogogo).
2. Upload all files **including** the hidden `.github/workflows/deploy.yml` folder. The easiest way is to extract this ZIP and push with Git:
   ```bash
   git init
   git add .
   git commit -m "Initial playable Voxel City Driver"
   git branch -M main
   git remote add origin https://github.com/achallakiran/Gogogo.git
   git push -u origin main
   ```
   If the repo already has a README, pull and reconcile before pushing. For this existing repository, use the `Gogogo` remote shown above. If a README already exists, pull and reconcile before pushing.
3. In the repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. In **Actions**, check that *Publish Voxel City Driver* completes successfully. It automatically installs dependencies, runs unit tests, builds the game, and publishes it.
5. Open `https://achallakiran.github.io/Gogogo/`. The game starts at a title screen.

**Important:** The project uses Vite and needs to be built by GitHub Actions. Do **not** upload only the `src` directory, and do not expect the local `index.html` to run with `file://`.

If your repository is specifically named `YOUR-USERNAME.github.io`, change `BASE_PATH` in the workflow to `/` because that type of Pages repository is served from the root.

## Develop locally (optional)

Requires Node.js 20.19+ or 22.12+ and npm. You only need these to *build*, not to play the published game.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. For a production build:

```bash
npm run check
npm run build
npm run preview
```

The workflow configures the GitHub Pages subpath `/Gogogo/` automatically. `dist/` is the static site output. GitHub Actions publishes it automatically.

## Game controls

| Action | Desktop | Mobile |
|---|---|---|
| Accelerate | W / ↑ | Green acceleration icon |
| Brake/reverse | S / ↓ / Space | Red brake icon — hold to reverse after stopping |
| Steer | A/D or ←/→ | Left/right controls |
| Change camera | C | ◉ camera button |
| Pick up or drop off | E near marker at low speed | PICK UP / DROP OFF button |
| Recover overturned car | R | Pause → resume; keyboard R on desktop (mobile recovery to be added) |
| Pause | Escape | Ⅱ button |
| Fullscreen | F | ⛶ button, when browser supported |
| Orbit camera | Drag left or right | Swipe the 3D scene |

Follow the compass arrow, minimap route and golden road guides to available passengers. After boarding, follow the airport objective to the turquoise drop-off zone. Completed journeys pay fares. Purchase additional cars in the garage and repaint them freely. Car upgrades are intentionally **not** sold.

## Version 0.1 scope

- Animated title menu over a rendered 3D scene
- New Game, Continue, Garage, Settings, How to Play and Pause screens
- Multiple camera modes: chase, close chase, hood, cockpit, orbit
- Responsive mobile controls and browser fullscreen attempt with graceful viewport fallback
- Procedural fictional voxel-style districts, city roads, scenery, parks and airport
- Rapier rigid-body car with grip, braking, visual suspension and collision response
- 22 reactive NPC cars with basic routes, intersection checks and obstacle braking
- Passenger pickup and airport drop-off loop with visible characters and markers
- Local earnings, saved vehicles and free color customization
- No runtime service or backend

**Scope limits:** v0.1 is an initial playable slice, not the entire v1.0 city. Traffic isn't a full real-world traffic simulator. Vehicle suspension is a visual approximation over rigid wheel/chassis colliders; a full per-wheel spring-damper model is planned for v0.2. Cockpit camera is simplified. No cloud sync: saves are specific to each browser/device. On iOS Safari, native fullscreen APIs may be unavailable; the game uses the available viewport instead. Device performance will vary.

## Architecture

- `src/main.js`: orchestration, game state and render loop
- `src/world/World.js`: terrain, roads, buildings, props and airport
- `src/vehicles/Vehicle.js`: driveable Rapier vehicle and voxel model
- `src/traffic/Traffic.js`: NPC route-following and obstacle reactions
- `src/missions/Missions.js`: passengers, pickup/drop-off, markers
- `src/render/CameraManager.js`: camera modes and obstacle handling
- `src/ui/UI.js`, `src/style.css`: menus, HUD, touch controls
- `src/core/`: configuration, save model and input
- `.github/workflows/deploy.yml`: automated Pages publishing

The game simulation, vehicle physics and render state are kept separate. Static assets can be added under `public/` later, while shipped 3D models should be optimized GLB/glTF.

## Practical limitations

This project was authored in a tool environment without outbound npm-registry connectivity. Source syntax and pure logic unit tests were checked locally, but the full Vite dependency installation, browser WebGL playtest and final production build could not be executed there. **The GitHub Actions workflow is designed to perform its own install, test and build**. Please inspect the first workflow run and its logs; don't treat the project as production-validated until an actual browser playtest succeeds.

## License

Game project code is supplied for your use. Third-party libraries (Three.js, Rapier and Vite) have their own licenses.
