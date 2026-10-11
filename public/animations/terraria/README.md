This preview uses original Terraria sprite sheets from the owner's local Steam
installation. Terraria artwork belongs to Re-Logic. Only the 40 sheets needed
by the preview are included.

`rollout.json` records a sampled, trained PPO policy running in terraria-lite v4,
world seed 10004, sampling seed 12345, for 700 steps. It includes action names,
the three most likely actions at each step, character and enemy states, and
changes to the original world. The browser renders and loops that recording;
policy inference and training run in the original Python/C project.

Multi-tile furniture (chests, life crystals, workbenches, anvils, furnaces,
campfires) is drawn at its native Terraria footprint, bottom-left anchored, as
in terraria-lite's v5 object-scale preview (`OBJECT_SCALE_V5.md`). The recording
itself is v4, where each of those objects occupies one simulator cell; every
footprint the replay shows lands on empty cells.

Source checkpoint: learning-v4 selected/model.pt. Its SHA-256 and schema version
are recorded in the JSON. The export script validates the checkpoint schema,
reads native state through a temporary adapter compiled against the environment
headers, and leaves the terraria-lite checkout unchanged.

Regenerate with that project's Python environment:

```sh
python scripts/export-terraria-preview.py \
  --repo /path/to/terraria-lite \
  --textures '/path/to/Terraria/ExtractedTextures' \
  --checkpoint /path/to/selected/model.pt
```
