# LegacyCam Lovelace Card

LegacyCam Card is a HACS frontend card for the LegacyCam Home Assistant integration. It is configured with entities only; raw backend URLs stay behind Home Assistant so HTTPS, proxies, Nabu Casa, and remote access keep working.

## Architecture Proposal

- `legacycam-card`: renders the camera preview, fullscreen stream, rotation transform, and flash button.
- `legacycam-card-editor`: uses Home Assistant selectors for camera, switch, and rotation fields.
- Home Assistant camera proxy endpoints are used for preview and fullscreen stream.
- Flash control goes through the configured switch entity.

## Folder Structure Proposal

```text
dist/
  legacycam-card.js
  legacycam-card.css
hacs.json
README.md
```

## Card Configuration

```yaml
type: custom:legacycam-card
camera_entity: camera.legacycam
flash_entity: switch.legacycam_flash
rotation: 0
```

Allowed rotation values are `0`, `90`, `180`, and `270`.

## Refactor Plan

1. Keep dashboard mode simple: preview plus flash button.
2. Open fullscreen on preview click.
3. Use Home Assistant camera proxy paths instead of raw backend stream or snapshot URLs.
4. Use selectors in the editor instead of manual forms.
5. Avoid repeated event registration and unnecessary image reloads.

## Breaking Changes

- `stream` and `snapshot` card config fields were removed.
- `camera_entity` is now required.
- Rotation remains presentation-only and lives only in the card config.

## Migration Steps

Replace old URL-based config:

```yaml
type: custom:legacycam-card
stream: http://DEVICE_IP:8080/stream
snapshot: http://DEVICE_IP:8080/snapshot.jpg
```

with entity-based config:

```yaml
type: custom:legacycam-card
camera_entity: camera.legacycam
flash_entity: switch.legacycam_flash
rotation: 0
```
