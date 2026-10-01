import argparse
import json
import time
from pathlib import Path
from typing import Dict

from island_evolution import MultiIslandEvolution
from notion_reporter import format_milestone_notion_payload, save_notion_report_payload


def main():
    parser = argparse.ArgumentParser(description="Run Fly Brain v3 64-PN Strategic Sensory Neuroevolution")
    parser.add_argument("--generations", type=int, default=100, help="Number of generations to evolve")
    parser.add_argument("--workers", type=int, default=10, help="Number of parallel worker processes")
    parser.add_argument("--games", type=int, default=6, help="Games per evaluation")
    parser.add_argument("--checkpoint-interval", type=int, default=25, help="Milestone checkpoint interval")
    parser.add_argument("--save-name", type=str, default="champion_fly_v3_weights.npz", help="Weights save filename")
    args = parser.parse_args()

    print(f"🚀 Starting Fly Brain v3 Deep Neuroevolution:")
    print(f"   - Generations: {args.generations}")
    print(f"   - Parallel Workers: {args.workers}")
    print(f"   - Demes: 4 Strategic QD Demes (Straight Hunter, Upper Saver, Jackpot Predator, Hybrid Synthesizer)")
    print(f"   - Sensory: 64-PN Interoceptive & Topological Architecture")

    engine = MultiIslandEvolution(
        num_workers=args.workers,
        games_per_eval=args.games,
        preset="strategic_qd",
    )

    try:
        champ = engine.run_evolution(
            num_generations=args.generations,
            save_name=args.save_name,
            checkpoint_interval=args.checkpoint_interval,
            verbose=True,
        )
        print(f"✅ Evolution complete! Elite champion fitness: {champ.fitness:.2f}")
    finally:
        engine.close()


if __name__ == "__main__":
    main()
