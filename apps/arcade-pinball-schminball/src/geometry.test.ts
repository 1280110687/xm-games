import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { tableRails } from '../upstream/geometry';
import type { TableDef } from '../upstream/definitions/game';

/** Reproduce the actual logged corner using Matter bodies, without a browser. */
function runCorner(addLegacyWall: boolean) {
  const engine = Matter.Engine.create();
  engine.positionIterations = 100;
  engine.velocityIterations = 16;
  engine.gravity.y = .85;
  const table = { height: 2441, underworld: 1441 } as TableDef;
  const rails = tableRails(table);
  if (addLegacyWall) rails.push([795, 50, 795, 2411, 10]);
  for (const [x1, y1, x2, y2, width] of rails) {
    Matter.Composite.add(engine.world, Matter.Bodies.rectangle(
      (x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1), width,
      { isStatic: true, angle: Math.atan2(y2 - y1, x2 - x1), friction: 0, restitution: .3 },
    ));
  }
  // The original table-one right wall and the adjacent V-shaped blockers.
  // A rotated 50x10 actor has a 42.426... square bounding box; these centers
  // correspond to its source top-left placements (754,895) and (754,930).
  const offset = Math.SQRT2 * 15;
  Matter.Composite.add(engine.world, [
    Matter.Bodies.rectangle(817, 965, 50, 1930, { isStatic: true, friction: 0 }),
    Matter.Bodies.rectangle(754 + offset, 895 + offset, 50, 10, { isStatic: true, angle: -Math.PI / 4, friction: 0 }),
    Matter.Bodies.rectangle(754 + offset, 930 + offset, 50, 10, { isStatic: true, angle: Math.PI / 4, friction: 0 }),
  ]);
  const ball = Matter.Bodies.circle(796, 876, 20, { friction: .05, frictionAir: .001, frictionStatic: .1, restitution: 0, slop: .001 });
  Matter.Composite.add(engine.world, ball);
  const positions: { x: number; y: number }[] = [];
  for (let frame = 0; frame < 300; frame++) {
    Matter.Engine.update(engine, 1000 / 60);
    if (frame >= 240) positions.push({ ...ball.position });
  }
  Matter.Engine.clear(engine);
  Matter.Composite.clear(engine.world, false);
  return positions;
}

describe('pinball right boundary corner', () => {
  it('reproduces the reported stationary ball with the removed overlapping wall', () => {
    const positions = runCorner(true);
    expect(positions.every(p => Math.hypot(p.x - 796, p.y - 876) < 1)).toBe(true);
    expect(Math.hypot(positions.at(-1)!.x - positions[0].x, positions.at(-1)!.y - positions[0].y)).toBeLessThan(.01);
  });

  it('lets that same ball leave the corner with the final table rails', () => {
    const positions = runCorner(false);
    expect(positions.every(p => Math.hypot(p.x - 796, p.y - 876) > 200)).toBe(true);
    expect(Math.hypot(positions.at(-1)!.x - positions[0].x, positions.at(-1)!.y - positions[0].y)).toBeGreaterThan(100);
  });
});
