"""Export a real, schema-validated PPO rollout and its local sprite sheets.

Run with the terraria-lite Python environment. The browser replays these states;
it does not ship PyTorch or pretend to perform online policy inference.
"""
import argparse
import ctypes
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--textures', required=True, type=Path)
    parser.add_argument('--checkpoint', required=True, type=Path)
    parser.add_argument('--seed', type=int, default=10004)
    parser.add_argument('--steps', type=int, default=700)
    parser.add_argument('--output', type=Path, default=Path('public/animations/terraria'))
    args = parser.parse_args()
    sys.path.insert(0, str(args.repo / 'python'))
    import numpy as np
    import torch
    from terraria_lite import SPEC, TerrariaLite
    from terraria_lite.ppo_eval import load_agent

    torch.set_num_threads(1)
    torch.manual_seed(12345)
    agent = load_agent(args.checkpoint)
    args.output.mkdir(parents=True, exist_ok=True)
    # Compile a read-only adapter against the source headers, avoiding guesses
    # about ctypes struct offsets or modifications to the other repository.
    bridge_source = '''
    #include <string.h>
    #include "env.h"
    int width(void) { return WORLD_W; }
    int height(void) { return WORLD_H; }
    void snapshot(const Env *e, unsigned char *tiles, int *s) {
      memcpy(tiles,e->tiles,sizeof e->tiles);
      s[0]=e->px; s[1]=e->py; s[2]=e->facing; s[3]=e->jump_left;
      s[4]=e->health; s[5]=e->max_health; s[6]=e->achievements;
      s[7]=e->armor; s[8]=e->weapon;
      for(int i=0;i<MAX_MOBS;i++) {
        s[9+i*5]=e->mobs[i].x; s[10+i*5]=e->mobs[i].y;
        s[11+i*5]=e->mobs[i].kind; s[12+i*5]=e->mobs[i].hp;
        s[13+i*5]=e->mobs[i].phase;
      }
    }
    '''
    with tempfile.TemporaryDirectory() as temp:
        source, library = Path(temp) / 'snapshot.c', Path(temp) / 'snapshot.dylib'
        source.write_text(bridge_source)
        subprocess.run(['cc', '-shared', '-fPIC', '-O2', '-I', str(args.repo / 'include'),
                        str(source), '-o', str(library)], check=True)
        bridge = ctypes.CDLL(str(library))
        bridge.snapshot.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p]
        width, height = bridge.width(), bridge.height()
        tiles = np.zeros(width * height, dtype=np.uint8)
        status = np.zeros(49, dtype=np.int32)
        env = TerrariaLite(max_steps=args.steps)
        try:
            obs, _ = env.reset(seed=args.seed)
            bridge.snapshot(env._h, tiles.ctypes.data, status.ctypes.data)
            initial = tiles.tolist()
            previous = tiles.copy()
            frames = []
            with torch.no_grad():
                for _ in range(args.steps):
                    logits = agent.actor(agent.trunk(torch.as_tensor(obs).unsqueeze(0)))
                    logits = logits.masked_fill(~torch.as_tensor(env.action_mask()).unsqueeze(0), float('-inf'))
                    dist = torch.distributions.Categorical(logits=logits)
                    action = int(dist.sample())
                    top = torch.topk(dist.probs[0], 3)
                    policy = [[int(a), round(float(p), 3)] for a, p in zip(top.indices, top.values)]
                    obs, _, term, trunc, _ = env.step(action)
                    bridge.snapshot(env._h, tiles.ctypes.data, status.ctypes.data)
                    changed = np.flatnonzero(tiles != previous)
                    frames.append({'p': status[:9].tolist(), 'a': action, 'policy': policy,
                                   'd': [[int(i), int(tiles[i])] for i in changed],
                                   'm': [status[9+i*5:14+i*5].tolist() for i in range(8)
                                         if status[11+i*5] and status[12+i*5] > 0]})
                    previous[:] = tiles
                    if term or trunc:
                        break
        finally:
            env.close()
    data = {'version': SPEC.version, 'width': width, 'height': height, 'seed': args.seed,
            'actions': SPEC.action_names, 'reach': SPEC.reach_offsets,
            'mineFirst': SPEC.mine_first, 'placeFirst': SPEC.place_first,
            'tiles': initial, 'frames': frames,
            'checkpoint': args.checkpoint.parent.name + '/' + args.checkpoint.name,
            'checkpointSha256': hashlib.sha256(args.checkpoint.read_bytes()).hexdigest()}
    (args.output / 'rollout.json').write_text(json.dumps(data, separators=(',', ':')))
    sheets = [f'Tiles_{i}' for i in [0, 1, 2, 5, 30, 7, 6, 8, 9, 4, 215, 18, 17, 16, 25, 19, 213, 21, 12, 71]]
    sheets += [f'Player_0_{i}' for i in range(13)]
    sheets += ['Player_Hair_1', 'Tree_Tops_0', 'Tree_Branches_0', 'NPC_1', 'NPC_49', 'Item_1', 'Cloud_0']
    for name in sheets:
        shutil.copyfile(args.textures / f'{name}.png', args.output / f'{name}.png')
    print(f'Exported {len(frames)} PPO steps, {len(sheets)} original texture sheets, seed {args.seed}')


if __name__ == '__main__':
    main()
